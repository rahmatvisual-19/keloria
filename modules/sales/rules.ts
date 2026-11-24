import { BadRequestError } from "@/lib/errors";
import { addMoney, calculateDp50, multiplyMoney, toDecimalString } from "@/lib/money";
import { OrderStatus } from "@/lib/types/domain";

const NON_CANCELLABLE_STATUSES = new Set<OrderStatus>(["Dikirim", "Selesai", "Dibatalkan"]);

/**
 * Menormalkan input kanal ("PO Besar" | "PO_Besar" | "Online") ke enum Prisma.
 */
export function normalizeOrderChannel(channel: string): "Online" | "PO_Besar" {
  return channel === "Online" ? "Online" : "PO_Besar";
}

/**
 * Menentukan skema pembayaran otomatis berdasarkan kanal pesanan:
 * - PO Besar (B2B) -> DP_50
 * - Online (B2C) -> FULL
 */
export function resolvePaymentScheme(channel: "Online" | "PO_Besar"): "DP_50" | "FULL" {
  return channel === "PO_Besar" ? "DP_50" : "FULL";
}

/**
 * Menghitung subtotal per item (dengan harga snapshot) dan total pesanan.
 */
export function computeOrderTotals(
  items: { product_id: number; qty: number; unit_price: string }[],
  shippingCost: string,
  channel: "Online" | "PO_Besar",
) {
  let totalAmount = "0.00";
  const computedItems = items.map((item) => {
    const unitSnapshot = toDecimalString(item.unit_price);
    const subtotal = multiplyMoney(unitSnapshot, item.qty);
    totalAmount = addMoney(totalAmount, subtotal);
    return {
      product_id: item.product_id,
      qty: item.qty,
      unit_price_snapshot: unitSnapshot,
      subtotal,
    };
  });

  const normalizedShipping = toDecimalString(shippingCost);
  const initialInvoiceType: "DP_50" | "FULL" = channel === "PO_Besar" ? "DP_50" : "FULL";
  const initialInvoiceBilled =
    channel === "PO_Besar"
      ? calculateDp50(totalAmount)
      : addMoney(totalAmount, normalizedShipping);

  return {
    items: computedItems,
    total_amount: totalAmount,
    shipping_cost: normalizedShipping,
    initial_invoice_type: initialInvoiceType,
    initial_invoice_billed: initialInvoiceBilled,
  };
}

/**
 * Validasi aturan bisnis pembatalan pesanan:
 * Hanya boleh dibatalkan dari status sebelum `Dikirim`.
 */
export function assertOrderCancellable(currentStatus: OrderStatus): void {
  if (NON_CANCELLABLE_STATUSES.has(currentStatus)) {
    throw new BadRequestError(
      `Pesanan dengan status '${currentStatus.replaceAll("_", " ")}' tidak dapat dibatalkan.`,
    );
  }
}

/**
 * Menentukan apakah pembatalan harus mengembalikan stok online (khusus order B2C / Online).
 */
export function shouldRestoreOnlineStockOnCancel(
  channel: "Online" | "PO_Besar",
  currentStatus: OrderStatus,
): boolean {
  return channel === "Online" && !NON_CANCELLABLE_STATUSES.has(currentStatus);
}
