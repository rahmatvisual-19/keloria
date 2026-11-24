import { BadRequestError } from "@/lib/errors";
import { multiplyMoney, toDecimalString } from "@/lib/money";
import { B2B_STATUS_FLOW, B2C_STATUS_FLOW, OrderStatus, PoStatus } from "@/lib/types/domain";

export interface BomOrderItemInput {
  qty: number;
  bom: {
    material_id: number;
    material_name: string;
    unit: string;
    default_cost: string;
    qty_per_unit: number;
  }[];
}

export interface BomRequirementRow {
  material_id: number;
  material_name: string;
  unit: string;
  total_qty: number;
  default_cost: string;
  estimated_subtotal: string;
}

/**
 * Menghitung kebutuhan bahan baku per order: `Σ(qty_item × qty_per_unit)` per material.
 */
export function calculateBomRequirements(items: BomOrderItemInput[]): BomRequirementRow[] {
  const agg = new Map<number, Omit<BomRequirementRow, "estimated_subtotal">>();

  for (const item of items) {
    for (const b of item.bom) {
      const add = item.qty * b.qty_per_unit;
      const prev = agg.get(b.material_id);
      if (prev) {
        prev.total_qty = Number((prev.total_qty + add).toFixed(4));
      } else {
        agg.set(b.material_id, {
          material_id: b.material_id,
          material_name: b.material_name,
          unit: b.unit,
          total_qty: Number(add.toFixed(4)),
          default_cost: toDecimalString(b.default_cost),
        });
      }
    }
  }

  return Array.from(agg.values()).map((row) => ({
    ...row,
    estimated_subtotal: multiplyMoney(row.default_cost, row.total_qty),
  }));
}

/**
 * Memastikan transisi status order berjalan ketat satu tahap ke depan (tidak boleh lompat atau mundur).
 */
export function assertValidOrderTransition(
  channel: "Online" | "PO_Besar",
  fromStatus: OrderStatus,
  toStatus: OrderStatus,
): void {
  const flow = channel === "PO_Besar" ? B2B_STATUS_FLOW : B2C_STATUS_FLOW;
  const fromIdx = flow.indexOf(fromStatus);
  const toIdx = flow.indexOf(toStatus);

  if (fromIdx === -1) {
    throw new BadRequestError(
      channel === "PO_Besar" && fromStatus === "Menunggu_Pembayaran"
        ? "DP 50% belum diverifikasi. Produksi belum dapat dimulai."
        : `Order dengan status '${fromStatus.replaceAll("_", " ")}' tidak dapat diproses pada alur ini.`,
    );
  }

  if (toIdx !== fromIdx + 1) {
    const expectedNext = flow[fromIdx + 1];
    throw new BadRequestError(
      expectedNext
        ? `Transisi status tidak valid. Dari '${fromStatus.replaceAll("_", " ")}' hanya boleh lanjut ke '${expectedNext.replaceAll("_", " ")}'.`
        : `Order dengan status '${fromStatus.replaceAll("_", " ")}' sudah mencapai tahap akhir.`,
    );
  }
}

/**
 * Guard pengiriman: status `Dikirim` ditolak bila pelunasan (B2B) atau tagihan FULL (B2C) belum `Lunas`.
 */
export function assertShipmentPaymentGuard(
  toStatus: OrderStatus,
  isFinalInvoicePaid: boolean,
): void {
  if (toStatus === "Dikirim" && !isFinalInvoicePaid) {
    throw new BadRequestError("Pelunasan belum terverifikasi. Pesanan tidak dapat dikirim.");
  }
}

/**
 * Memastikan transisi status PO supplier hanya maju berurutan: `Dipesan → Diterima → Selesai`.
 */
export function assertValidPoTransition(fromStatus: PoStatus, toStatus: PoStatus): void {
  const allowedNext: Record<PoStatus, PoStatus | null> = {
    Dipesan: "Diterima",
    Diterima: "Selesai",
    Selesai: null,
  };

  if (allowedNext[fromStatus] !== toStatus) {
    throw new BadRequestError(
      `Transisi status PO tidak valid: dari '${fromStatus}' tidak boleh langsung ke '${toStatus}'.`,
    );
  }
}
