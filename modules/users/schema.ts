import { z } from "zod";
import { paginationQuerySchema } from "@/lib/validate";

export const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive("ID pengguna tidak valid."),
});

export const listUsersQuerySchema = paginationQuerySchema.extend({
  role_id: z.coerce.number().int().positive().optional(),
  status: z.enum(["Aktif", "Nonaktif"]).optional(),
});

export const createUserSchema = z.object({
  role_id: z.coerce.number().int().positive("Role wajib dipilih."),
  full_name: z.string().trim().min(2, "Nama lengkap minimal 2 karakter.").max(120),
  phone: z.string().trim().max(30).optional().nullable(),
  employment_type: z.enum(["Tetap", "PKL"]),
  pay_scheme: z.enum(["Bulanan", "Mingguan"]),
  base_salary: z.union([z.number().min(0), z.string().regex(/^\d+(\.\d{1,2})?$/)]).default(0),
  username: z
    .string()
    .trim()
    .min(3, "Username minimal 3 karakter.")
    .max(60)
    .regex(/^[a-zA-Z0-9._-]+$/, "Username hanya boleh huruf, angka, titik, garis bawah, atau strip."),
  password: z.string().min(8, "Kata sandi minimal 8 karakter.").max(128),
  status: z.enum(["Aktif", "Nonaktif"]).default("Aktif"),
});

export const updateUserSchema = z.object({
  role_id: z.coerce.number().int().positive().optional(),
  full_name: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().max(30).optional().nullable(),
  employment_type: z.enum(["Tetap", "PKL"]).optional(),
  pay_scheme: z.enum(["Bulanan", "Mingguan"]).optional(),
  base_salary: z.union([z.number().min(0), z.string().regex(/^\d+(\.\d{1,2})?$/)]).optional(),
  status: z.enum(["Aktif", "Nonaktif"]).optional(),
});

export const resetPasswordSchema = z.object({
  new_password: z.string().min(8, "Kata sandi baru minimal 8 karakter.").max(128),
});

export const updateRolePermissionSchema = z.object({
  role_id: z.coerce.number().int().positive(),
  module_id: z.coerce.number().int().positive(),
  can_view: z.boolean(),
  can_create: z.boolean(),
  can_edit: z.boolean(),
  can_delete: z.boolean(),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateRolePermissionInput = z.infer<typeof updateRolePermissionSchema>;
