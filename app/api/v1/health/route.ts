import { ok } from "@/lib/response";

/**
 * GET /api/v1/health
 * Endpoint pengecekan kesehatan layanan API Kelo-ERP.
 */
export async function GET() {
  const now = new Date();
  const wibFormatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "long",
  });

  return ok(
    {
      service: "kelo-erp-api",
      status: "ok",
      version: "0.1.0",
      timestamp_utc: now.toISOString(),
      timestamp_wib: wibFormatter.format(now),
      environment: process.env.NODE_ENV ?? "development",
    },
    "Layanan Kelo-ERP API berjalan normal.",
  );
}
