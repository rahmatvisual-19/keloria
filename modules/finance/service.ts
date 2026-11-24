import { ExpenseCategory, InvoiceType, PaymentStatus, Prisma } from "@prisma/client";
import { NotFoundError } from "@/lib/errors";
import { addMoney, compareMoney, subtractMoney, toDecimalString } from "@/lib/money";
import { MonthlyFinancialReportData } from "@/lib/pdf/financial-report";
import { prisma } from "@/lib/prisma";
import { readProofFile, saveProofFile } from "@/lib/storage";
import {
  calculateMonthlyFinancialSummary,
  evaluatePaymentVerification,
  normalizeExpenseCategory,
} from "./rules";
import {
  CreateExpenseInput,
  FinancialReportQuery,
  ListExpensesQuery,
  ListInvoicesQuery,
  UpdateExpenseInput,
  VerifyPaymentInput,
} from "./schema";

// ============================================================================
// 1. INVOICE & VERIFIKASI PEMBAYARAN
// ============================================================================

export async function listInvoicesService(query: ListInvoicesQuery) {
  const where: Prisma.InvoiceWhereInput = {
    ...(query.payment_status ? { payment_status: query.payment_status as PaymentStatus } : {}),
    ...(query.invoice_type ? { invoice_type: query.invoice_type as InvoiceType } : {}),
    ...(query.order_id ? { order_id: query.order_id } : {}),
    ...(query.search
      ? {
          OR: [
            { invoice_number: { contains: query.search, mode: "insensitive" } },
            { order: { order_number: { contains: query.search, mode: "insensitive" } } },
            {
              order: {
                customer: { customer_name: { contains: query.search, mode: "insensitive" } },
              },
            },
          ],
        }
      : {}),
  };

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await prisma.$transaction([
    prisma.invoice.findMany({
      where,
      include: {
        order: {
          select: {
            order_id: true,
            order_number: true,
            order_status: true,
            customer: { select: { customer_id: true, customer_name: true, customer_type: true } },
          },
        },
        payments: {
          select: {
            payment_id: true,
            payment_date: true,
            amount_paid: true,
            payment_method: true,
            proof_file_path: true,
            proof_note: true,
          },
        },
      },
      orderBy: { issued_date: "desc" },
      skip,
      take: query.limit,
    }),
    prisma.invoice.count({ where }),
  ]);

  return {
    items: items.map((inv) => {
      const paid = inv.payments.reduce(
        (sum, p) => addMoney(sum, p.amount_paid.toString()),
        "0.00",
      );
      return {
        ...inv,
        total_billed: toDecimalString(inv.total_billed.toString()),
        shipping_cost_billed: toDecimalString(inv.shipping_cost_billed.toString()),
        amount_paid: paid,
        remaining_amount: subtractMoney(inv.total_billed.toString(), paid),
        payments: inv.payments.map((p) => ({
          ...p,
          amount_paid: toDecimalString(p.amount_paid.toString()),
        })),
      };
    }),
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function getInvoiceForPdfService(invoiceId: number) {
  const invoice = await prisma.invoice.findUnique({
    where: { invoice_id: invoiceId },
    include: {
      order: {
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      },
      payments: true,
    },
  });
  if (!invoice) throw new NotFoundError("Invoice tidak ditemukan.");
  return invoice;
}

/**
 * Verifikasi pembayaran invoice (wajib izin `FINANCE.edit`):
 * - Validasi & simpan bukti bayar (jika ada) via `lib/storage.ts`.
 * - Validasi nominal tidak melebihi sisa tagihan.
 * - Jika DP_50 terpenuhi -> status invoice `DP_Terbayar` dan order pindah ke `DP_Lunas`.
 * - Jika PELUNASAN/FULL terpenuhi -> status invoice `Lunas` (dan B2C lanjut ke `Packing`).
 */
export async function verifyInvoicePaymentService(
  invoiceId: number,
  input: VerifyPaymentInput,
  actorUserId: number,
  proofFile?: File | null,
) {
  let storedProofPath: string | null = null;
  if (proofFile && proofFile.size > 0) {
    storedProofPath = await saveProofFile(proofFile);
  }

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findUnique({
      where: { invoice_id: invoiceId },
      include: {
        order: true,
        payments: true,
      },
    });
    if (!invoice) throw new NotFoundError("Invoice tidak ditemukan.");

    const alreadyPaid = invoice.payments.reduce(
      (sum, p) => addMoney(sum, p.amount_paid.toString()),
      "0.00",
    );

    const evaluation = evaluatePaymentVerification({
      invoiceType: invoice.invoice_type,
      totalBilled: invoice.total_billed.toString(),
      alreadyPaid,
      incomingAmount: toDecimalString(input.amount_paid),
    });

    const payment = await tx.invoicePayment.create({
      data: {
        invoice_id: invoice.invoice_id,
        verified_by: actorUserId,
        payment_date: input.payment_date ? new Date(input.payment_date) : new Date(),
        term_type: evaluation.termType,
        amount_paid: toDecimalString(input.amount_paid),
        payment_method: input.payment_method,
        proof_file_path: storedProofPath,
        proof_note: input.proof_note ?? null,
      },
    });

    const updatedInvoice = await tx.invoice.update({
      where: { invoice_id: invoice.invoice_id },
      data: { payment_status: evaluation.nextPaymentStatus },
    });

    let updatedOrderStatus = invoice.order.order_status;

    if (
      invoice.invoice_type === "DP_50" &&
      evaluation.nextPaymentStatus === "DP_Terbayar" &&
      invoice.order.order_status === "Menunggu_Pembayaran"
    ) {
      await tx.order.update({
        where: { order_id: invoice.order_id },
        data: {
          order_status: "DP_Lunas",
          status_logs: {
            create: {
              from_status: "Menunggu_Pembayaran",
              to_status: "DP_Lunas",
              changed_by: actorUserId,
              note: `DP 50% pada ${invoice.invoice_number} terverifikasi; BOM & produksi dibuka.`,
            },
          },
        },
      });
      updatedOrderStatus = "DP_Lunas";
    } else if (
      invoice.invoice_type === "FULL" &&
      evaluation.nextPaymentStatus === "Lunas" &&
      invoice.order.order_channel === "Online" &&
      invoice.order.order_status === "Menunggu_Pembayaran"
    ) {
      await tx.order.update({
        where: { order_id: invoice.order_id },
        data: {
          order_status: "Packing",
          status_logs: {
            create: {
              from_status: "Menunggu_Pembayaran",
              to_status: "Packing",
              changed_by: actorUserId,
              note: `Pembayaran penuh ${invoice.invoice_number} terverifikasi; pesanan masuk antrean Packing.`,
            },
          },
        },
      });
      updatedOrderStatus = "Packing";
    }

    return {
      payment: {
        ...payment,
        amount_paid: toDecimalString(payment.amount_paid.toString()),
      },
      invoice_status: updatedInvoice.payment_status,
      order_status: updatedOrderStatus,
      remaining_after: evaluation.remainingAfter,
    };
  });
}

export async function downloadPaymentProofService(paymentId: number) {
  const payment = await prisma.invoicePayment.findUnique({
    where: { payment_id: paymentId },
    select: { payment_id: true, proof_file_path: true },
  });
  if (!payment || !payment.proof_file_path) {
    throw new NotFoundError("Bukti pembayaran tidak ditemukan.");
  }
  return readProofFile(payment.proof_file_path);
}

// ============================================================================
// 2. BIAYA (EXPENSES)
// ============================================================================

export async function listExpensesService(query: ListExpensesQuery) {
  const where: Prisma.ExpenseWhereInput = {
    ...(query.category
      ? { category: normalizeExpenseCategory(query.category) as ExpenseCategory }
      : {}),
    ...(query.date_from || query.date_to
      ? {
          expense_date: {
            ...(query.date_from ? { gte: new Date(query.date_from) } : {}),
            ...(query.date_to ? { lte: new Date(query.date_to) } : {}),
          },
        }
      : {}),
    ...(query.search
      ? { description: { contains: query.search, mode: "insensitive" } }
      : {}),
  };

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await prisma.$transaction([
    prisma.expense.findMany({
      where,
      include: {
        recorder: { select: { user_id: true, full_name: true } },
        purchase_order: { select: { po_id: true, po_number: true } },
      },
      orderBy: { expense_date: "desc" },
      skip,
      take: query.limit,
    }),
    prisma.expense.count({ where }),
  ]);

  return {
    items: items.map((e) => ({
      ...e,
      amount: toDecimalString(e.amount.toString()),
    })),
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function createExpenseService(input: CreateExpenseInput, actorUserId: number) {
  const saved = await prisma.expense.create({
    data: {
      po_id: input.po_id ?? null,
      recorded_by: actorUserId,
      expense_date: input.expense_date ? new Date(input.expense_date) : new Date(),
      category: normalizeExpenseCategory(input.category),
      description: input.description,
      amount: toDecimalString(input.amount),
    },
  });
  return { ...saved, amount: toDecimalString(saved.amount.toString()) };
}

export async function updateExpenseService(expenseId: number, input: UpdateExpenseInput) {
  const existing = await prisma.expense.findUnique({ where: { expense_id: expenseId } });
  if (!existing) throw new NotFoundError("Data biaya tidak ditemukan.");

  const saved = await prisma.expense.update({
    where: { expense_id: expenseId },
    data: {
      ...(input.expense_date !== undefined ? { expense_date: new Date(input.expense_date) } : {}),
      ...(input.category !== undefined
        ? { category: normalizeExpenseCategory(input.category) }
        : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.amount !== undefined ? { amount: toDecimalString(input.amount) } : {}),
    },
  });
  return { ...saved, amount: toDecimalString(saved.amount.toString()) };
}

export async function deleteExpenseService(expenseId: number) {
  const existing = await prisma.expense.findUnique({ where: { expense_id: expenseId } });
  if (!existing) throw new NotFoundError("Data biaya tidak ditemukan.");

  await prisma.expense.delete({ where: { expense_id: expenseId } });
  return { expense_id: expenseId, deleted: true };
}

// ============================================================================
// 3. ARUS KAS & PIUTANG
// ============================================================================

export async function getCashflowAndReceivablesService() {
  const [payments, expenses, payrolls, unpaidInvoices] = await Promise.all([
    prisma.invoicePayment.findMany({ select: { amount_paid: true } }),
    prisma.expense.findMany({ select: { amount: true } }),
    prisma.payroll.findMany({ select: { net_amount: true } }),
    prisma.invoice.findMany({
      where: { payment_status: { not: "Lunas" } },
      include: {
        order: {
          select: {
            order_number: true,
            customer: { select: { customer_name: true, customer_type: true } },
          },
        },
        payments: { select: { amount_paid: true } },
      },
      orderBy: { issued_date: "asc" },
    }),
  ]);

  const nowMs = Date.now();
  const receivables = unpaidInvoices
    .map((inv) => {
      const paid = inv.payments.reduce(
        (sum, p) => addMoney(sum, p.amount_paid.toString()),
        "0.00",
      );
      const remaining = subtractMoney(inv.total_billed.toString(), paid);
      const ageDays = Math.max(
        0,
        Math.floor((nowMs - inv.issued_date.getTime()) / (1000 * 60 * 60 * 24)),
      );
      return {
        invoice_id: inv.invoice_id,
        invoice_number: inv.invoice_number,
        order_number: inv.order.order_number,
        customer_name: inv.order.customer.customer_name,
        invoice_type: inv.invoice_type,
        issued_date: inv.issued_date.toISOString(),
        total_billed: toDecimalString(inv.total_billed.toString()),
        amount_paid: paid,
        remaining_amount: remaining,
        aging_days: ageDays,
        payment_status: inv.payment_status,
      };
    })
    .filter((r) => compareMoney(r.remaining_amount, "0.00") > 0);

  const summary = calculateMonthlyFinancialSummary({
    paymentAmounts: payments.map((p) => p.amount_paid.toString()),
    expenseAmounts: expenses.map((e) => e.amount.toString()),
    payrollNetAmounts: payrolls.map((p) => p.net_amount.toString()),
    unpaidInvoices: receivables.map((r) => ({
      total_billed: r.total_billed,
      paid: r.amount_paid,
    })),
  });

  return { summary, receivables };
}

// ============================================================================
// 4. LAPORAN KEUANGAN BULANAN (OWNER-ONLY)
// ============================================================================

export async function getMonthlyFinancialReportService(
  query: FinancialReportQuery,
): Promise<MonthlyFinancialReportData> {
  const now = new Date();
  const period =
    query.month ??
    `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  const [yearStr, monthStr] = period.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  // Rentang bulan dalam zona waktu WIB (+07:00)
  const start = new Date(`${yearStr}-${monthStr}-01T00:00:00+07:00`);
  const nextMonthYear = month === 12 ? year + 1 : year;
  const nextMonthStr = String(month === 12 ? 1 : month + 1).padStart(2, "0");
  const end = new Date(`${nextMonthYear}-${nextMonthStr}-01T00:00:00+07:00`);

  const [payments, expenses, payrolls, unpaidInvoices] = await Promise.all([
    prisma.invoicePayment.findMany({
      where: { payment_date: { gte: start, lt: end } },
      include: { invoice: { select: { invoice_number: true } } },
      orderBy: { payment_date: "asc" },
    }),
    prisma.expense.findMany({
      where: { expense_date: { gte: start, lt: end } },
      orderBy: { expense_date: "asc" },
    }),
    prisma.payroll.findMany({
      where: { payment_date: { gte: start, lt: end } },
      include: { employee: { select: { full_name: true } } },
      orderBy: { payment_date: "asc" },
    }),
    prisma.invoice.findMany({
      where: { payment_status: { not: "Lunas" } },
      include: { payments: { select: { amount_paid: true } } },
    }),
  ]);

  const summary = calculateMonthlyFinancialSummary({
    paymentAmounts: payments.map((p) => p.amount_paid.toString()),
    expenseAmounts: expenses.map((e) => e.amount.toString()),
    payrollNetAmounts: payrolls.map((p) => p.net_amount.toString()),
    unpaidInvoices: unpaidInvoices.map((inv) => ({
      total_billed: inv.total_billed.toString(),
      paid: inv.payments.reduce((acc, p) => addMoney(acc, p.amount_paid.toString()), "0.00"),
    })),
  });

  return {
    period,
    summary,
    payments: payments.map((p) => ({
      date: p.payment_date.toISOString(),
      invoice_number: p.invoice.invoice_number,
      term_type: p.term_type,
      amount_paid: toDecimalString(p.amount_paid.toString()),
    })),
    expenses: expenses.map((e) => ({
      date: e.expense_date.toISOString(),
      category: e.category,
      description: e.description,
      amount: toDecimalString(e.amount.toString()),
    })),
    payrolls: payrolls.map((pr) => ({
      date: pr.payment_date.toISOString(),
      employee_name: pr.employee.full_name,
      payment_type: pr.payment_type,
      net_amount: toDecimalString(pr.net_amount.toString()),
    })),
  };
}
