import { BadRequestError } from "@/lib/errors";
import { addMoney, compareMoney, subtractMoney, toDecimalString } from "@/lib/money";
import { InvoiceType, PaymentStatus } from "@/lib/types/domain";

/**
 * Validasi nominal verifikasi pembayaran dan penentuan status baru invoice:
 * - Nominal tidak boleh <= 0 dan tidak boleh melebihi sisa tagihan.
 * - Jika terpenuhi: DP_50 -> `DP_Terbayar`, PELUNASAN/FULL -> `Lunas`.
 */
export function evaluatePaymentVerification(params: {
  invoiceType: InvoiceType;
  totalBilled: string;
  alreadyPaid: string;
  incomingAmount: string;
}): {
  newTotalPaid: string;
  remainingAfter: string;
  nextPaymentStatus: PaymentStatus;
  termType: "DP_50" | "Pelunasan" | "Bayar_Penuh";
} {
  const incoming = toDecimalString(params.incomingAmount);
  if (compareMoney(incoming, "0.00") <= 0) {
    throw new BadRequestError("Nominal pembayaran harus lebih dari 0.");
  }

  const remainingBefore = subtractMoney(params.totalBilled, params.alreadyPaid);
  if (compareMoney(remainingBefore, "0.00") <= 0) {
    throw new BadRequestError("Tagihan pada invoice ini sudah terpenuhi.");
  }

  if (compareMoney(incoming, remainingBefore) > 0) {
    throw new BadRequestError(
      `Nominal pembayaran (${incoming}) melebihi sisa tagihan (${remainingBefore}).`,
    );
  }

  const newTotalPaid = addMoney(params.alreadyPaid, incoming);
  const remainingAfter = subtractMoney(params.totalBilled, newTotalPaid);
  const isSettled = compareMoney(remainingAfter, "0.00") === 0;

  let nextPaymentStatus: PaymentStatus = "Belum_Bayar";
  if (isSettled) {
    nextPaymentStatus = params.invoiceType === "DP_50" ? "DP_Terbayar" : "Lunas";
  }

  const termType =
    params.invoiceType === "DP_50"
      ? "DP_50"
      : params.invoiceType === "PELUNASAN"
        ? "Pelunasan"
        : "Bayar_Penuh";

  return {
    newTotalPaid,
    remainingAfter,
    nextPaymentStatus,
    termType,
  };
}

/**
 * Kalkulasi ringkasan laporan keuangan bulanan sesuai rumus bisnis:
 * - kas_masuk = Σ invoice_payments.amount_paid
 * - kas_keluar = Σ expenses.amount + Σ payrolls.net_amount
 * - piutang = Σ(total_billed - pembayaran terverifikasi) untuk invoice belum lunas
 * - laba_rugi_bersih = kas_masuk - kas_keluar
 */
export function calculateMonthlyFinancialSummary(params: {
  paymentAmounts: string[];
  expenseAmounts: string[];
  payrollNetAmounts: string[];
  unpaidInvoices: { total_billed: string; paid: string }[];
}) {
  const kasMasuk = params.paymentAmounts.reduce((acc, v) => addMoney(acc, v), "0.00");
  const totalExpenses = params.expenseAmounts.reduce((acc, v) => addMoney(acc, v), "0.00");
  const totalPayrolls = params.payrollNetAmounts.reduce((acc, v) => addMoney(acc, v), "0.00");
  const kasKeluar = addMoney(totalExpenses, totalPayrolls);

  const piutang = params.unpaidInvoices.reduce((acc, inv) => {
    const sisa = subtractMoney(inv.total_billed, inv.paid);
    return compareMoney(sisa, "0.00") > 0 ? addMoney(acc, sisa) : acc;
  }, "0.00");

  const labaRugiBersih = subtractMoney(kasMasuk, kasKeluar);

  return {
    kas_masuk: kasMasuk,
    total_expenses: totalExpenses,
    total_payrolls: totalPayrolls,
    kas_keluar: kasKeluar,
    piutang,
    laba_rugi_bersih: labaRugiBersih,
  };
}

export function normalizeExpenseCategory(
  category: string,
): "Pembelian_Supplier" | "Ongkir" | "Kemasan" | "Operasional" | "Lain" {
  if (category === "Pembelian Supplier" || category === "Pembelian_Supplier") {
    return "Pembelian_Supplier";
  }
  if (category === "Ongkir" || category === "Kemasan" || category === "Operasional") {
    return category;
  }
  return "Lain";
}
