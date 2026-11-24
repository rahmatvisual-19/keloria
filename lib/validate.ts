import { z } from "zod";
import { BadRequestError } from "./errors";

/**
 * Mem-parse dan memvalidasi JSON body dari Request menggunakan skema Zod.
 */
export async function parseBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new BadRequestError("Body permintaan harus berupa JSON yang valid.");
  }
  return schema.parse(raw);
}

/**
 * Mem-parse dan memvalidasi URL searchParams menggunakan skema Zod.
 */
export function parseQuery<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): z.infer<T> {
  const { searchParams } = new URL(request.url);
  const obj: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    obj[key] = value;
  });
  return schema.parse(obj);
}

/**
 * Memvalidasi dynamic route params (sudah di-await dari ctx.params) dengan Zod.
 */
export function parseParams<T extends z.ZodTypeAny>(
  params: Record<string, string | string[] | undefined>,
  schema: T,
): z.infer<T> {
  return schema.parse(params);
}

/**
 * Skema paginasi umum yang dapat digunakan ulang di seluruh endpoint daftar.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  sort_by: z.string().trim().optional(),
  sort_order: z.enum(["asc", "desc"]).default("desc"),
});
