import { z } from "zod";
import { paginationQuerySchema } from "@/lib/validate";

export const hrIdParamSchema = z.object({
  id: z.coerce.number().int().positive("ID tidak valid."),
});

const nonNegativeMoney = z.union([
  z.number().min(0, "Nominal tidak boleh negatif."),
  z.string().regex(/^\d+(\.\d{1,2})?$/, "Format nominal desimal tidak valid."),
]);

const positiveMoney = nonNegativeMoney.refine((v) => Number(v) > 0, "Nominal harus lebih dari 0.");

export const listEmployeesQuerySchema = paginationQuerySchema.extend({
  employment_type: z.enum(["Tetap", "PKL"]).optional(),
  status: z.enum(["Aktif", "Nonaktif"]).optional(),
});

/**
 * Skema edit pekerja non-sensitif (dapat dipakai oleh Manager/SDM maupun Owner di modul HR).
 * Sengaja TIDAK menyertakan role_id, username, password, status, maupun base_salary.
 */
export const updateEmployeeNonSensitiveSchema = z.object({
  full_name: z.string().trim().min(2, "Nama lengkap minimal 2 karakter.").max(120).optional(),
  phone: z.string().trim().max(30).optional().nullable(),
  employment_type: z.enum(["Tetap", "PKL"]).optional(),
  pay_scheme: z.enum(["Bulanan", "Mingguan"]).optional(),
});

/**
 * Skema tambah pegawai baru dari modul HR (Owner penuh, Manager/SDM delegasi terbatas Pegawai & Anak PKL).
 */
export const createEmployeeSchema = z.object({
  role_name: z.enum(["Owner", "Manager/SDM", "Pegawai", "Anak PKL"]),
  full_name: z.string().trim().min(2, "Nama lengkap minimal 2 karakter.").max(120),
  phone: z.string().trim().max(30).optional().nullable(),
  employment_type: z.enum(["Tetap", "PKL"]),
  pay_scheme: z.enum(["Bulanan", "Mingguan"]),
  username: z
    .string()
    .trim()
    .min(3, "Username minimal 3 karakter.")
    .max(60)
    .regex(/^[a-zA-Z0-9._-]+$/, "Username hanya boleh huruf, angka, titik, garis bawah, atau strip."),
  password: z.string().min(8, "Kata sandi minimal 8 karakter.").max(128),
  base_salary: nonNegativeMoney.optional(),
});

export const listPayrollsQuerySchema = paginationQuerySchema.extend({
  user_id: z.coerce.number().int().positive().optional(),
  period_label: z.string().trim().optional(),
  payment_type: z
    .enum(["Gaji_Bulanan", "Gaji Bulanan", "Upah_Mingguan", "Upah Mingguan", "Kasbon"])
    .optional(),
  date_from: z.string().trim().optional(),
  date_to: z.string().trim().optional(),
});

export const createPayrollSchema = z.object({
  user_id: z.coerce.number().int().positive("Pekerja wajib dipilih."),
  payment_date: z.string().trim().optional(),
  payment_type: z.enum([
    "Gaji_Bulanan",
    "Gaji Bulanan",
    "Upah_Mingguan",
    "Upah Mingguan",
    "Kasbon",
  ]),
  gross_amount: positiveMoney,
  kasbon_deduction: nonNegativeMoney.default(0),
  period_label: z.string().trim().max(60).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type ListEmployeesQuery = z.infer<typeof listEmployeesQuerySchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeNonSensitiveInput = z.infer<typeof updateEmployeeNonSensitiveSchema>;
export type ListPayrollsQuery = z.infer<typeof listPayrollsQuerySchema>;
export type CreatePayrollInput = z.infer<typeof createPayrollSchema>;
