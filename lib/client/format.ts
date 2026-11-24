/**
 * Utilitas pemformatan tampilan UI standar Kelo-ERP:
 * - Mata uang: Rp 1.250.000
 * - Tanggal: DD MMM YYYY (zona waktu WIB / Asia/Jakarta)
 */

const WIB_TIMEZONE = "Asia/Jakarta";

/**
 * Memformat string desimal atau angka menjadi format Rupiah: "Rp 1.250.000".
 */
export function formatRupiah(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") {
    return "Rp 0";
  }
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) {
    return "Rp 0";
  }
  const isNegative = num < 0;
  const formatted = new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(Math.abs(num)));

  return `${isNegative ? "-Rp " : "Rp "}${formatted}`;
}

/**
 * Memformat tanggal ke "DD MMM YYYY" dalam zona waktu Asia/Jakarta (WIB).
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: WIB_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Memformat tanggal & jam ke "DD MMM YYYY, HH:mm WIB".
 */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const formatted = new Intl.DateTimeFormat("id-ID", {
    timeZone: WIB_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  return `${formatted} WIB`;
}
