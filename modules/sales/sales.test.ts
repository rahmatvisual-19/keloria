import { describe, expect, it } from "vitest";
import { BadRequestError } from "@/lib/errors";
import {
  assertOrderCancellable,
  computeOrderTotals,
  normalizeOrderChannel,
  resolvePaymentScheme,
  shouldRestoreOnlineStockOnCancel,
} from "./rules";

describe("Aturan Bisnis Modul Sales (modules/sales/rules.ts)", () => {
  it("menghitung subtotal snapshot, total order, dan Invoice DP 50% otomatis untuk PO Besar (B2B)", () => {
    const result = computeOrderTotals(
      [
        { product_id: 1, qty: 10, unit_price: "165000.00" },
        { product_id: 2, qty: 5, unit_price: "48000.00" },
      ],
      "0.00",
      "PO_Besar",
    );

    expect(result.total_amount).toBe("1890000.00");
    expect(result.initial_invoice_type).toBe("DP_50");
    expect(result.initial_invoice_billed).toBe("945000.00");
    expect(result.items[0]?.unit_price_snapshot).toBe("165000.00");
    expect(result.items[0]?.subtotal).toBe("1650000.00");
  });

  it("menghitung Invoice FULL (total + ongkir) untuk pesanan Online (B2C)", () => {
    const result = computeOrderTotals(
      [{ product_id: 1, qty: 2, unit_price: "48000.00" }],
      "24000.00",
      "Online",
    );

    expect(result.total_amount).toBe("96000.00");
    expect(result.initial_invoice_type).toBe("FULL");
    expect(result.initial_invoice_billed).toBe("120000.00");
  });

  it("menormalkan kanal dan menentukan skema pembayaran dengan benar", () => {
    expect(normalizeOrderChannel("PO Besar")).toBe("PO_Besar");
    expect(normalizeOrderChannel("Online")).toBe("Online");
    expect(resolvePaymentScheme("PO_Besar")).toBe("DP_50");
    expect(resolvePaymentScheme("Online")).toBe("FULL");
  });

  it("mengizinkan pembatalan hanya sebelum status Dikirim dan mengembalikan stok khusus B2C", () => {
    expect(() => assertOrderCancellable("Menunggu_Pembayaran")).not.toThrow();
    expect(() => assertOrderCancellable("Siap_Kirim")).not.toThrow();
    expect(() => assertOrderCancellable("Dikirim")).toThrow(BadRequestError);
    expect(() => assertOrderCancellable("Selesai")).toThrow(BadRequestError);
    expect(() => assertOrderCancellable("Dibatalkan")).toThrow(BadRequestError);

    expect(shouldRestoreOnlineStockOnCancel("Online", "Packing")).toBe(true);
    expect(shouldRestoreOnlineStockOnCancel("PO_Besar", "Produksi")).toBe(false);
    expect(shouldRestoreOnlineStockOnCancel("Online", "Dikirim")).toBe(false);
  });
});
