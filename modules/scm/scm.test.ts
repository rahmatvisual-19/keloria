import { describe, expect, it } from "vitest";
import { BadRequestError } from "@/lib/errors";
import {
  assertShipmentPaymentGuard,
  assertValidOrderTransition,
  assertValidPoTransition,
  calculateBomRequirements,
} from "./rules";

describe("Aturan Bisnis Modul SCM (modules/scm/rules.ts)", () => {
  it("menghitung agregasi kebutuhan bahan baku (BOM) dari beberapa item produk", () => {
    const result = calculateBomRequirements([
      {
        qty: 20,
        bom: [
          {
            material_id: 1,
            material_name: "Bahan Baku Utama A",
            unit: "kg",
            default_cost: "45000.00",
            qty_per_unit: 0.5,
          },
          {
            material_id: 5,
            material_name: "Pouch 250g",
            unit: "pcs",
            default_cost: "2200.00",
            qty_per_unit: 1,
          },
        ],
      },
      {
        qty: 10,
        bom: [
          {
            material_id: 1,
            material_name: "Bahan Baku Utama A",
            unit: "kg",
            default_cost: "45000.00",
            qty_per_unit: 0.25,
          },
        ],
      },
    ]);

    const matA = result.find((r) => r.material_id === 1);
    const pouch = result.find((r) => r.material_id === 5);

    expect(matA?.total_qty).toBe(12.5); // 20*0.5 + 10*0.25
    expect(matA?.estimated_subtotal).toBe("562500.00");
    expect(pouch?.total_qty).toBe(20);
    expect(pouch?.estimated_subtotal).toBe("44000.00");
  });

  it("menolak lompat tahap atau mundur pada alur produksi B2B dan B2C", () => {
    // B2B valid berurutan
    expect(() => assertValidOrderTransition("PO_Besar", "DP_Lunas", "Produksi")).not.toThrow();
    expect(() => assertValidOrderTransition("PO_Besar", "Karantina", "Siap_Kirim")).not.toThrow();

    // B2B belum DP -> ditolak
    expect(() =>
      assertValidOrderTransition("PO_Besar", "Menunggu_Pembayaran", "Produksi"),
    ).toThrow(BadRequestError);

    // B2B lompat tahap -> ditolak
    expect(() => assertValidOrderTransition("PO_Besar", "DP_Lunas", "Packing")).toThrow(
      BadRequestError,
    );

    // B2B mundur tahap -> ditolak
    expect(() => assertValidOrderTransition("PO_Besar", "Packing", "Produksi")).toThrow(
      BadRequestError,
    );

    // B2C valid (tanpa Produksi/Karantina)
    expect(() =>
      assertValidOrderTransition("Online", "Menunggu_Pembayaran", "Packing"),
    ).not.toThrow();
    expect(() => assertValidOrderTransition("Online", "Packing", "Siap_Kirim")).not.toThrow();
    expect(() => assertValidOrderTransition("Online", "Packing", "Karantina")).toThrow(
      BadRequestError,
    );
  });

  it("memblokir status Dikirim bila pelunasan belum Lunas", () => {
    expect(() => assertShipmentPaymentGuard("Dikirim", false)).toThrow(
      "Pelunasan belum terverifikasi",
    );
    expect(() => assertShipmentPaymentGuard("Dikirim", true)).not.toThrow();
    expect(() => assertShipmentPaymentGuard("Siap_Kirim", false)).not.toThrow();
  });

  it("memastikan transisi status PO supplier hanya Dipesan -> Diterima -> Selesai", () => {
    expect(() => assertValidPoTransition("Dipesan", "Diterima")).not.toThrow();
    expect(() => assertValidPoTransition("Diterima", "Selesai")).not.toThrow();
    expect(() => assertValidPoTransition("Dipesan", "Selesai")).toThrow(BadRequestError);
    expect(() => assertValidPoTransition("Selesai", "Diterima")).toThrow(BadRequestError);
  });
});
