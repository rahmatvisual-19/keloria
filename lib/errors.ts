import { ZodError } from "zod";

export type FieldErrorMap = Record<string, string[]>;

/**
 * Kelas dasar error domain/aplikasi agar pemetaan ke HTTP status code seragam.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly errors?: FieldErrorMap;

  constructor(
    message: string,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    errors?: FieldErrorMap,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Permintaan tidak valid.", errors?: FieldErrorMap) {
    super(message, 400, "BAD_REQUEST", errors);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Data yang dimasukkan tidak valid.", errors?: FieldErrorMap) {
    super(message, 422, "VALIDATION_ERROR", errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Sesi tidak valid atau Anda belum login.") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Anda tidak memiliki hak akses untuk tindakan ini.") {
    super(message, 403, "FORBIDDEN");
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Data yang dicari tidak ditemukan.") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ConflictError extends AppError {
  constructor(message = "Terjadi konflik data atau data sudah ada.") {
    super(message, 409, "CONFLICT");
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = "Terlalu banyak percobaan. Silakan coba lagi beberapa saat.") {
    super(message, 429, "TOO_MANY_REQUESTS");
  }
}

/**
 * Mengubah ZodError menjadi peta error per-field yang mudah dibaca frontend.
 */
export function formatZodError(error: ZodError): FieldErrorMap {
  const fieldErrors: FieldErrorMap = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? issue.path.join(".") : "_root";
    if (!fieldErrors[key]) {
      fieldErrors[key] = [];
    }
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

interface PrismaLikeError {
  code?: string;
  meta?: {
    target?: string[] | string;
    field_name?: string;
  };
}

/**
 * Memetakan sembarang error (AppError, ZodError, Prisma error, dll.) menjadi AppError.
 */
export function normalizeError(err: unknown): AppError {
  if (err instanceof AppError) {
    return err;
  }

  if (err instanceof ZodError) {
    return new ValidationError("Validasi input gagal.", formatZodError(err));
  }

  if (err && typeof err === "object" && "code" in err) {
    const prismaErr = err as PrismaLikeError;
    if (prismaErr.code === "P2002") {
      const target = Array.isArray(prismaErr.meta?.target)
        ? prismaErr.meta.target.join(", ")
        : prismaErr.meta?.target;
      return new ConflictError(
        target ? `Data dengan nilai unik (${target}) sudah terdaftar.` : "Data unik sudah terdaftar.",
      );
    }
    if (prismaErr.code === "P2003") {
      return new BadRequestError("Relasi data tidak valid atau masih digunakan oleh transaksi lain.");
    }
    if (prismaErr.code === "P2025") {
      return new NotFoundError("Data tidak ditemukan atau sudah dihapus.");
    }
  }

  if (err instanceof SyntaxError && err.message.toLowerCase().includes("json")) {
    return new BadRequestError("Format JSON pada body permintaan tidak valid.");
  }

  return new AppError("Terjadi kesalahan internal pada server.", 500, "INTERNAL_ERROR");
}
