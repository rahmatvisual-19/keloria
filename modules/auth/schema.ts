import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username wajib diisi.").max(60),
  password: z.string().min(1, "Kata sandi wajib diisi.").max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;
