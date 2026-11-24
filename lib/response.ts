import { NextResponse } from "next/server";
import { FieldErrorMap, normalizeError } from "./errors";
import { logger } from "./logger";

export interface ApiResponseBody<T> {
  success: boolean;
  data: T | null;
  message: string;
  errors?: FieldErrorMap;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PaginatedPayload<T> {
  items: T[];
  meta: PaginationMeta;
}

/**
 * Respons sukses standar (HTTP 200 atau status custom).
 */
export function ok<T>(data: T, message = "Berhasil", status = 200) {
  const body: ApiResponseBody<T> = {
    success: true,
    data,
    message,
  };
  return NextResponse.json(body, { status });
}

/**
 * Respons pembuatan resource baru (HTTP 201).
 */
export function created<T>(data: T, message = "Data berhasil dibuat") {
  return ok(data, message, 201);
}

/**
 * Respons paginasi server-side standar.
 */
export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
  message = "Berhasil mengambil daftar data",
) {
  const total_pages = Math.max(1, Math.ceil(total / Math.max(1, limit)));
  const payload: PaginatedPayload<T> = {
    items,
    meta: {
      page,
      limit,
      total,
      total_pages,
    },
  };
  return ok(payload, message, 200);
}

/**
 * Penanganan error terpusat untuk semua Route Handler.
 */
export function handleApiError(err: unknown) {
  const normalized = normalizeError(err);

  if (normalized.statusCode >= 500) {
    logger.error({ err }, normalized.message);
  } else {
    logger.warn({ code: normalized.code, statusCode: normalized.statusCode }, normalized.message);
  }

  const body: ApiResponseBody<null> = {
    success: false,
    data: null,
    message: normalized.message,
    ...(normalized.errors ? { errors: normalized.errors } : {}),
  };

  return NextResponse.json(body, { status: normalized.statusCode });
}
