import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { getEnv } from "./env";
import { BadRequestError, NotFoundError } from "./errors";

export const MAX_PROOF_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

const ALLOWED_MIME_TO_EXT: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "application/pdf": [".pdf"],
};

const EXT_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".pdf": "application/pdf",
};

export interface ProofFileValidationInput {
  name: string;
  type: string;
  size: number;
}

/**
 * Validasi ketat bukti bayar: ekstensi, MIME type, dan ukuran maks 2 MB.
 */
export function validateProofFileMeta(file: ProofFileValidationInput): string {
  if (file.size <= 0) {
    throw new BadRequestError("Berkas bukti pembayaran kosong.");
  }
  if (file.size > MAX_PROOF_FILE_BYTES) {
    throw new BadRequestError("Ukuran berkas bukti pembayaran maksimal 2 MB.");
  }

  const ext = path.extname(file.name || "").toLowerCase();
  const allowedExts = ALLOWED_MIME_TO_EXT[file.type];

  if (!allowedExts || !allowedExts.includes(ext)) {
    throw new BadRequestError(
      "Format bukti pembayaran tidak didukung. Hanya file .jpg, .jpeg, .png, atau .pdf yang diizinkan.",
    );
  }

  return ext;
}

function resolveSafeUploadPath(storedKey: string): string {
  const { uploadDir } = getEnv();
  const baseDir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), uploadDir);
  const safeName = path.basename(storedKey);
  const fullPath = path.resolve(/*turbopackIgnore: true*/ baseDir, safeName);

  if (!fullPath.startsWith(baseDir)) {
    throw new BadRequestError("Path berkas tidak valid.");
  }
  return fullPath;
}

/**
 * Menyimpan bukti pembayaran ke disk lokal di luar folder `public` dengan nama acak.
 * Catatan deployment: bila deploy ke serverless (Vercel/Lambda), ganti driver ini ke
 * Supabase Storage atau Vercel Blob karena disk lokal tidak persisten.
 */
export async function saveProofFile(file: File): Promise<string> {
  const ext = validateProofFileMeta({
    name: file.name,
    type: file.type,
    size: file.size,
  });

  const { uploadDir } = getEnv();
  const baseDir = path.resolve(/*turbopackIgnore: true*/ process.cwd(), uploadDir);
  await fs.mkdir(baseDir, { recursive: true });

  const randomName = `${crypto.randomUUID()}${ext}`;
  const fullPath = path.resolve(/*turbopackIgnore: true*/ baseDir, randomName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(fullPath, buffer);

  return randomName;
}

/**
 * Membaca berkas bukti pembayaran untuk endpoint unduh terautentikasi.
 */
export async function readProofFile(storedKey: string): Promise<{
  buffer: Buffer;
  contentType: string;
  filename: string;
}> {
  const fullPath = resolveSafeUploadPath(storedKey);
  try {
    const buffer = await fs.readFile(fullPath);
    const filename = path.basename(fullPath);
    const ext = path.extname(filename).toLowerCase();
    const contentType = EXT_TO_MIME[ext] ?? "application/octet-stream";
    return { buffer, contentType, filename };
  } catch {
    throw new NotFoundError("Berkas bukti pembayaran tidak ditemukan di penyimpanan.");
  }
}
