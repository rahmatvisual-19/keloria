import { Prisma } from "@prisma/client";

export type DocumentPrefix = "ORD" | "INV" | "PO";

/**
 * Menghasilkan kunci periode YYYYMM dalam zona waktu Asia/Jakarta (WIB).
 */
export function getJakartaYearMonth(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);

  const year = parts.find((p) => p.type === "year")?.value ?? "2026";
  const month = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${year}${month}`;
}

/**
 * Menghasilkan nomor dokumen otomatis (`ORD-YYYYMM-0001`, `INV-YYYYMM-0001`, `PO-YYYYMM-0001`)
 * menggunakan tabel `document_sequences` secara atomik di dalam transaksi DB (`tx`)
 * agar aman dari race condition saat beberapa transaksi terjadi bersamaan.
 */
export async function generateDocumentNumber(
  tx: Prisma.TransactionClient,
  prefix: DocumentPrefix,
  date: Date = new Date(),
): Promise<string> {
  const ym = getJakartaYearMonth(date);
  const seqKey = `${prefix}-${ym}`;

  const sequence = await tx.documentSequence.upsert({
    where: { seq_key: seqKey },
    create: { seq_key: seqKey, last_number: 1 },
    update: { last_number: { increment: 1 } },
  });

  const running = String(sequence.last_number).padStart(4, "0");
  return `${seqKey}-${running}`;
}
