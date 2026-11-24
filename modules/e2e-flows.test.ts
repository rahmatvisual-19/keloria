import { describe, expect, it } from "vitest";
import { BadRequestError, ForbiddenError } from "@/lib/errors";
import { calculateSettlement } from "@/lib/money";
import { assertAccess } from "@/lib/rbac";
import { ROLE_PERMISSION_DEFAULTS } from "@/lib/types/domain";
import { calculateMonthlyFinancialSummary, evaluatePaymentVerification } from "@/modules/finance/rules";
import { computePayrollNet, sanitizeEmployeeForRole } from "@/modules/hr/rules";
import {
  assertOrderCancellable,
  computeOrderTotals,
  shouldRestoreOnlineStockOnCancel,
} from "@/modules/sales/rules";
import {
  assertShipmentPaymentGuard,
  assertValidOrderTransition,
  assertValidPoTransition,
  calculateBomRequirements,
} from "@/modules/scm/rules";

describe("Uji Alur Integrasi End-to-End Kelo-ERP (B2B, B2C, RBAC 4 Role)", () => {
  it("melalui alur B2B Make-to-Order penuh dari PO hingga Laporan Keuangan Bulanan", () => {
    // 1. Input PO B2B -> Invoice DP 50% terbit otomatis
    const orderTotals = computeOrderTotals(
      [{ product_id: 4, qty: 20, unit_price: "165000.00" }],
      "0.00",
      "PO_Besar",
    );
    expect(orderTotals.total_amount).toBe("3300000.00");
    expect(orderTotals.initial_invoice_type).toBe("DP_50");
    expect(orderTotals.initial_invoice_billed).toBe("1650000.00");

    // 2. Anak PKL mencoba verifikasi DP -> ditolak 403
    expect(() =>
      assertAccess(
        { role_name: "Anak PKL", status: "Aktif", permissions: ROLE_PERMISSION_DEFAULTS["Anak PKL"] },
        { permission: ["FINANCE", "edit"] },
      ),
    ).toThrow(ForbiddenError);

    // 3. Pegawai memverifikasi DP 50% -> DP_Terbayar -> order pindah ke DP_Lunas
    expect(() =>
      assertAccess(
        { role_name: "Pegawai", status: "Aktif", permissions: ROLE_PERMISSION_DEFAULTS.Pegawai },
        { permission: ["FINANCE", "edit"] },
      ),
    ).not.toThrow();

    const dpVerif = evaluatePaymentVerification({
      invoiceType: "DP_50",
      totalBilled: orderTotals.initial_invoice_billed,
      alreadyPaid: "0.00",
      incomingAmount: "1650000.00",
    });
    expect(dpVerif.nextPaymentStatus).toBe("DP_Terbayar");

    // 4. Kalkulator BOM & PO Supplier (Dipesan -> Diterima -> Selesai)
    const bom = calculateBomRequirements([
      {
        qty: 20,
        bom: [
          {
            material_id: 1,
            material_name: "Bahan Baku Utama A",
            unit: "kg",
            default_cost: "45000.00",
            qty_per_unit: 0.8,
          },
        ],
      },
    ]);
    expect(bom[0]?.total_qty).toBe(16);
    expect(bom[0]?.estimated_subtotal).toBe("720000.00");

    expect(() => assertValidPoTransition("Dipesan", "Diterima")).not.toThrow();
    expect(() => assertValidPoTransition("Diterima", "Selesai")).not.toThrow();

    // 5. Pelacakan produksi berurutan (DP_Lunas -> Produksi -> Packing -> Karantina -> Siap_Kirim)
    expect(() => assertValidOrderTransition("PO_Besar", "DP_Lunas", "Produksi")).not.toThrow();
    expect(() => assertValidOrderTransition("PO_Besar", "Produksi", "Packing")).not.toThrow();
    expect(() => assertValidOrderTransition("PO_Besar", "Packing", "Karantina")).not.toThrow();
    expect(() => assertValidOrderTransition("PO_Besar", "Karantina", "Siap_Kirim")).not.toThrow();
    // Lompat tahap ditolak
    expect(() => assertValidOrderTransition("PO_Besar", "Produksi", "Karantina")).toThrow(
      BadRequestError,
    );

    // 6. Invoice Pelunasan terbit saat Siap_Kirim dengan ongkir Rp 150.000
    const settlementBilled = calculateSettlement(
      orderTotals.total_amount,
      orderTotals.initial_invoice_billed,
      "150000.00",
    );
    expect(settlementBilled).toBe("1800000.00");

    // 7. Guard pengiriman: Dikirim ditolak sebelum pelunasan Lunas
    expect(() => assertShipmentPaymentGuard("Dikirim", false)).toThrow(
      "Pelunasan belum terverifikasi",
    );

    // 8. Verifikasi Pelunasan -> Lunas -> Dikirim -> Selesai
    const settleVerif = evaluatePaymentVerification({
      invoiceType: "PELUNASAN",
      totalBilled: settlementBilled,
      alreadyPaid: "0.00",
      incomingAmount: "1800000.00",
    });
    expect(settleVerif.nextPaymentStatus).toBe("Lunas");
    expect(() => assertShipmentPaymentGuard("Dikirim", true)).not.toThrow();
    expect(() => assertValidOrderTransition("PO_Besar", "Siap_Kirim", "Dikirim")).not.toThrow();
    expect(() => assertValidOrderTransition("PO_Besar", "Dikirim", "Selesai")).not.toThrow();

    // 9. Payroll + Laporan Keuangan Bulanan (Owner-only)
    const payroll = computePayrollNet("800000.00", "150000.00");
    expect(payroll.net_amount).toBe("650000.00");

    const report = calculateMonthlyFinancialSummary({
      paymentAmounts: ["1650000.00", "1800000.00"],
      expenseAmounts: ["720000.00", "150000.00"],
      payrollNetAmounts: [payroll.net_amount],
      unpaidInvoices: [],
    });
    expect(report.kas_masuk).toBe("3450000.00");
    expect(report.kas_keluar).toBe("1520000.00");
    expect(report.piutang).toBe("0.00");
    expect(report.laba_rugi_bersih).toBe("1930000.00");
  });

  it("melalui alur B2C Ritel Online, pembatalan kembalikan stok, dan masking HR Manager/SDM", () => {
    const b2cTotals = computeOrderTotals(
      [{ product_id: 1, qty: 3, unit_price: "48000.00" }],
      "20000.00",
      "Online",
    );
    expect(b2cTotals.initial_invoice_type).toBe("FULL");
    expect(b2cTotals.initial_invoice_billed).toBe("164000.00");

    // Pembatalan B2C sebelum dikirim mengembalikan stok
    expect(() => assertOrderCancellable("Packing")).not.toThrow();
    expect(shouldRestoreOnlineStockOnCancel("Online", "Packing")).toBe(true);

    // Manager/SDM tidak melihat base_salary pada data pekerja HR
    const sanitized = sanitizeEmployeeForRole(
      { user_id: 3, full_name: "Budi Santoso", base_salary: "3200000.00" },
      "Manager/SDM",
    );
    expect("base_salary" in sanitized).toBe(false);
  });
});
