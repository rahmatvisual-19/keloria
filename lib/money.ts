/**
 * Utilitas perhitungan uang presisi 2 desimal (berbasis sen / integer cents)
 * untuk mencegah kesalahan floating-point JavaScript.
 * Semua nilai uang dikirim ke API sebagai string desimal ("1250000.00").
 */

export type DecimalInput = string | number | { toString(): string };

/**
 * Mengubah nilai desimal menjadi satuan sen (integer) secara aman.
 */
export function toCents(value: DecimalInput): number {
  const str = typeof value === "number" ? value.toFixed(2) : String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(str)) {
    throw new Error(`Nilai nominal tidak valid: "${str}"`);
  }
  const negative = str.startsWith("-");
  const clean = negative ? str.slice(1) : str;
  const [intPart, fracPart = ""] = clean.split(".");
  const paddedFrac = (fracPart + "00").slice(0, 2);
  const roundDigit = fracPart.length > 2 ? Number(fracPart[2]) : 0;
  let cents = Number(intPart) * 100 + Number(paddedFrac);
  if (roundDigit >= 5) {
    cents += 1;
  }
  return negative ? -cents : cents;
}

/**
 * Mengubah satuan sen (integer) kembali ke string desimal 2 angka belakang koma.
 */
export function fromCents(cents: number): string {
  const rounded = Math.round(cents);
  const negative = rounded < 0;
  const abs = Math.abs(rounded);
  const intPart = Math.floor(abs / 100);
  const fracPart = String(abs % 100).padStart(2, "0");
  return `${negative ? "-" : ""}${intPart}.${fracPart}`;
}

/**
 * Normalisasi input desimal ke format string 2 desimal ("0.00").
 */
export function toDecimalString(value: DecimalInput): string {
  return fromCents(toCents(value));
}

export function addMoney(a: DecimalInput, b: DecimalInput): string {
  return fromCents(toCents(a) + toCents(b));
}

export function subtractMoney(a: DecimalInput, b: DecimalInput): string {
  return fromCents(toCents(a) - toCents(b));
}

export function multiplyMoney(unitPrice: DecimalInput, qty: number): string {
  return fromCents(Math.round(toCents(unitPrice) * qty));
}

/**
 * Menghitung DP 50% sesuai aturan bisnis: ROUND(0.5 × total_amount) ke rupiah penuh (atau sen).
 * Pembulatan ke rupiah terdekat (kelipatan 100 sen) agar nominal tagihan bersih.
 */
export function calculateDp50(totalAmount: DecimalInput): string {
  const totalCents = toCents(totalAmount);
  const halfRupiah = Math.round(totalCents / 200);
  return fromCents(halfRupiah * 100);
}

/**
 * Menghitung total tagihan pelunasan B2B: (total_amount - dp_amount) + shipping_cost.
 */
export function calculateSettlement(
  totalAmount: DecimalInput,
  dpAmount: DecimalInput,
  shippingCost: DecimalInput,
): string {
  const remaining = toCents(totalAmount) - toCents(dpAmount);
  return fromCents(remaining + toCents(shippingCost));
}

export function compareMoney(a: DecimalInput, b: DecimalInput): -1 | 0 | 1 {
  const diff = toCents(a) - toCents(b);
  if (diff < 0) return -1;
  if (diff > 0) return 1;
  return 0;
}
