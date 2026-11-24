import { z } from "zod";
import { paginationQuerySchema } from "@/lib/validate";

export const financeIdParamSchema = z.object({
  id: z.coerce.number().int().positive("ID tidak valid."),
});

const positiveMoneyField = z
  .union([
    z.number().positive("Nominal harus lebih dari 0."),
    z.string().regex(/^\d+(\.\d{1,2})?$/, "Format nominal desimal tidak valid."),
  ])
  .refine((v) => Number(v) > 0, "Nominal harus lebih dari 0.");

export const listInvoicesQuerySchema = paginationQuerySchema.extend({
  payment_status: z.enum(["Belum_Bayar", "DP_Terbayar", "Lunas"]).optional(),
  invoice_type: z.enum(["DP_50", "PELUNASAN", "FULL"]).optional(),
  order_id: z.coerce.number().int().positive().optional(),
});

export const verifyPaymentSchema = z.object({
  amount_paid: positiveMoneyField,
  payment_date: z.string().trim().optional(),
  payment_method: z.string().trim().min(2, "Metode pembayaran wajib diisi.").max(60),
  proof_note: z.string().trim().max(500).optional().nullable(),
});

export const listExpensesQuerySchema = paginationQuerySchema.extend({
  category: z
    .enum([
      "Pembelian_Supplier",
      "Pembelian Supplier",
      "Ongkir",
      "Kemasan",
      "Operasional",
      "Lain",
    ])
    .optional(),
  date_from: z.string().trim().optional(),
  date_to: z.string().trim().optional(),
});

export const createExpenseSchema = z.object({
  po_id: z.coerce.number().int().positive().optional().nullable(),
  expense_date: z.string().trim().optional(),
  category: z.enum([
    "Pembelian_Supplier",
    "Pembelian Supplier",
    "Ongkir",
    "Kemasan",
    "Operasional",
    "Lain",
  ]),
  description: z.string().trim().min(3, "Deskripsi biaya minimal 3 karakter.").max(500),
  amount: positiveMoneyField,
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const financialReportQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Format bulan wajib YYYY-MM (contoh: 2026-11).")
    .optional(),
  format: z.enum(["json", "pdf", "excel"]).default("json"),
});

export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type FinancialReportQuery = z.infer<typeof financialReportQuerySchema>;
