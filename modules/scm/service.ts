import { PoStatus, Prisma } from "@prisma/client";
import { generateDocumentNumber } from "@/lib/doc-number";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { addMoney, calculateSettlement, multiplyMoney, toDecimalString } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import {
  assertShipmentPaymentGuard,
  assertValidOrderTransition,
  assertValidPoTransition,
  calculateBomRequirements,
} from "./rules";
import {
  AdvanceOrderStatusInput,
  CreateMaterialInput,
  CreatePurchaseOrderInput,
  CreateSupplierInput,
  ListPoQuery,
  StockPreparationInput,
  UpdateMaterialInput,
  UpdatePoStatusInput,
  UpdateSupplierInput,
} from "./schema";

// ============================================================================
// 1. BAHAN BAKU (MATERIALS)
// ============================================================================

export async function listMaterialsService() {
  const rows = await prisma.material.findMany({
    where: { is_active: true },
    orderBy: { material_id: "asc" },
  });
  return rows.map((m) => ({
    ...m,
    default_cost: toDecimalString(m.default_cost.toString()),
  }));
}

export async function createMaterialService(input: CreateMaterialInput) {
  const saved = await prisma.material.create({
    data: {
      material_name: input.material_name,
      unit: input.unit,
      default_cost: toDecimalString(input.default_cost),
    },
  });
  return { ...saved, default_cost: toDecimalString(saved.default_cost.toString()) };
}

export async function updateMaterialService(materialId: number, input: UpdateMaterialInput) {
  const existing = await prisma.material.findUnique({ where: { material_id: materialId } });
  if (!existing) throw new NotFoundError("Bahan baku tidak ditemukan.");

  const saved = await prisma.material.update({
    where: { material_id: materialId },
    data: {
      ...(input.material_name !== undefined ? { material_name: input.material_name } : {}),
      ...(input.unit !== undefined ? { unit: input.unit } : {}),
      ...(input.default_cost !== undefined
        ? { default_cost: toDecimalString(input.default_cost) }
        : {}),
      ...(input.is_active !== undefined ? { is_active: input.is_active } : {}),
    },
  });
  return { ...saved, default_cost: toDecimalString(saved.default_cost.toString()) };
}

export async function deactivateMaterialService(materialId: number) {
  const existing = await prisma.material.findUnique({ where: { material_id: materialId } });
  if (!existing) throw new NotFoundError("Bahan baku tidak ditemukan.");

  const saved = await prisma.material.update({
    where: { material_id: materialId },
    data: { is_active: false },
  });
  return { material_id: saved.material_id, is_active: saved.is_active };
}

// ============================================================================
// 2. SUPPLIER
// ============================================================================

export async function listSuppliersService() {
  return prisma.supplier.findMany({
    where: { is_active: true },
    orderBy: { supplier_id: "asc" },
  });
}

export async function createSupplierService(input: CreateSupplierInput) {
  return prisma.supplier.create({
    data: {
      supplier_name: input.supplier_name,
      contact_person: input.contact_person ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
    },
  });
}

export async function updateSupplierService(supplierId: number, input: UpdateSupplierInput) {
  const existing = await prisma.supplier.findUnique({ where: { supplier_id: supplierId } });
  if (!existing) throw new NotFoundError("Supplier tidak ditemukan.");

  return prisma.supplier.update({
    where: { supplier_id: supplierId },
    data: input,
  });
}

export async function deactivateSupplierService(supplierId: number) {
  const existing = await prisma.supplier.findUnique({ where: { supplier_id: supplierId } });
  if (!existing) throw new NotFoundError("Supplier tidak ditemukan.");

  const saved = await prisma.supplier.update({
    where: { supplier_id: supplierId },
    data: { is_active: false },
  });
  return { supplier_id: saved.supplier_id, is_active: saved.is_active };
}

// ============================================================================
// 3. KALKULATOR KEBUTUHAN BAHAN (BOM) PER ORDER
// ============================================================================

export async function calculateOrderBomService(orderId: number) {
  const order = await prisma.order.findUnique({
    where: { order_id: orderId },
    include: {
      customer: { select: { customer_name: true } },
      items: {
        include: {
          product: {
            include: {
              bom_items: {
                include: { material: true },
              },
            },
          },
        },
      },
    },
  });

  if (!order) throw new NotFoundError("Pesanan tidak ditemukan.");
  if (order.order_channel !== "PO_Besar") {
    throw new BadRequestError("Kalkulator BOM hanya berlaku untuk pesanan B2B (PO Besar).");
  }
  if (order.order_status === "Menunggu_Pembayaran" || order.order_status === "Dibatalkan") {
    throw new BadRequestError(
      "Kalkulator BOM hanya terbuka untuk order B2B yang DP 50%-nya sudah terverifikasi.",
    );
  }

  const requirements = calculateBomRequirements(
    order.items.map((item) => ({
      qty: item.qty,
      bom: item.product.bom_items.map((b) => ({
        material_id: b.material_id,
        material_name: b.material.material_name,
        unit: b.material.unit,
        default_cost: b.material.default_cost.toString(),
        qty_per_unit: Number(b.qty_per_unit),
      })),
    })),
  );

  const estimatedTotal = requirements.reduce(
    (sum, r) => addMoney(sum, r.estimated_subtotal),
    "0.00",
  );

  return {
    order_id: order.order_id,
    order_number: order.order_number,
    customer_name: order.customer.customer_name,
    order_status: order.order_status,
    requirements,
    estimated_total_cost: estimatedTotal,
  };
}

// ============================================================================
// 4. PURCHASE ORDERS (PO SUPPLIER)
// ============================================================================

export async function listPurchaseOrdersService(query: ListPoQuery) {
  const where: Prisma.PurchaseOrderWhereInput = {
    ...(query.po_status ? { po_status: query.po_status as PoStatus } : {}),
    ...(query.supplier_id ? { supplier_id: query.supplier_id } : {}),
    ...(query.order_id ? { order_id: query.order_id } : {}),
    ...(query.search
      ? {
          OR: [
            { po_number: { contains: query.search, mode: "insensitive" } },
            { order: { order_number: { contains: query.search, mode: "insensitive" } } },
            { supplier: { supplier_name: { contains: query.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await prisma.$transaction([
    prisma.purchaseOrder.findMany({
      where,
      include: {
        order: { select: { order_id: true, order_number: true } },
        supplier: { select: { supplier_id: true, supplier_name: true } },
        items: { include: { material: { select: { material_name: true } } } },
      },
      orderBy: { po_date: "desc" },
      skip,
      take: query.limit,
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return {
    items: items.map((po) => ({
      ...po,
      total_cost: toDecimalString(po.total_cost.toString()),
      items: po.items.map((it) => ({
        ...it,
        qty_ordered: Number(it.qty_ordered),
        package_cost: toDecimalString(it.package_cost.toString()),
        subtotal_cost: toDecimalString(it.subtotal_cost.toString()),
      })),
    })),
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function createPurchaseOrderService(
  input: CreatePurchaseOrderInput,
  actorUserId: number,
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { order_id: input.order_id } });
    if (!order) throw new NotFoundError("Pesanan tidak ditemukan.");
    if (order.order_status === "Menunggu_Pembayaran" || order.order_status === "Dibatalkan") {
      throw new BadRequestError(
        "PO supplier hanya dapat dibuat untuk order dengan DP 50% terverifikasi.",
      );
    }

    const supplier = await tx.supplier.findUnique({ where: { supplier_id: input.supplier_id } });
    if (!supplier || !supplier.is_active) {
      throw new BadRequestError("Supplier tidak ditemukan atau berstatus nonaktif.");
    }

    let totalCost = "0.00";
    const builtItems = input.items.map((it) => {
      const pkg = toDecimalString(it.package_cost);
      const subtotal = multiplyMoney(pkg, it.qty_ordered);
      totalCost = addMoney(totalCost, subtotal);
      return {
        material_id: it.material_id,
        qty_ordered: it.qty_ordered.toFixed(4),
        unit: it.unit,
        package_cost: pkg,
        subtotal_cost: subtotal,
      };
    });

    const poNumber = await generateDocumentNumber(tx, "PO");

    const po = await tx.purchaseOrder.create({
      data: {
        po_number: poNumber,
        order_id: input.order_id,
        supplier_id: input.supplier_id,
        created_by: actorUserId,
        total_cost: totalCost,
        po_status: "Dipesan",
        items: { create: builtItems },
      },
      include: {
        supplier: true,
        items: { include: { material: true } },
      },
    });

    return {
      ...po,
      total_cost: toDecimalString(po.total_cost.toString()),
    };
  });
}

/**
 * Memajukan status PO supplier (`Dipesan → Diterima → Selesai`).
 * Saat `Diterima`, otomatis membuat 1 record `expenses` kategori `Pembelian_Supplier`
 * secara idempoten (berdasarkan unique `po_id`).
 */
export async function updatePoStatusService(
  poId: number,
  input: UpdatePoStatusInput,
  actorUserId: number,
) {
  return prisma.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({
      where: { po_id: poId },
      include: { supplier: true },
    });
    if (!po) throw new NotFoundError("PO supplier tidak ditemukan.");

    assertValidPoTransition(po.po_status, input.po_status);

    const updated = await tx.purchaseOrder.update({
      where: { po_id: poId },
      data: { po_status: input.po_status },
    });

    let expenseCreated = false;
    if (input.po_status === "Diterima") {
      const existingExpense = await tx.expense.findUnique({ where: { po_id: poId } });
      if (!existingExpense) {
        await tx.expense.create({
          data: {
            po_id: poId,
            recorded_by: actorUserId,
            category: "Pembelian_Supplier",
            description: `Penerimaan bahan baku ${po.po_number} (${po.supplier.supplier_name})`,
            amount: po.total_cost,
          },
        });
        expenseCreated = true;
      }
    }

    return {
      po_id: updated.po_id,
      po_number: updated.po_number,
      po_status: updated.po_status,
      expense_auto_created: expenseCreated,
    };
  });
}

export async function getPurchaseOrderForPdfService(poId: number) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { po_id: poId },
    include: {
      order: { select: { order_number: true } },
      supplier: true,
      creator: { select: { full_name: true } },
      items: { include: { material: true } },
    },
  });
  if (!po) throw new NotFoundError("PO supplier tidak ditemukan.");
  return po;
}

// ============================================================================
// 5. PELACAKAN PRODUKSI & LOGISTIK (TRANSISI STATUS ORDER)
// ============================================================================

export async function advanceOrderStatusService(
  orderId: number,
  input: AdvanceOrderStatusInput,
  actorUserId: number,
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { order_id: orderId },
      include: { invoices: true },
    });
    if (!order) throw new NotFoundError("Pesanan tidak ditemukan.");

    assertValidOrderTransition(order.order_channel, order.order_status, input.to_status);

    // Guard pengiriman: cek apakah invoice pelunasan (B2B) atau invoice FULL (B2C) sudah Lunas
    const finalInvoice = order.invoices.find((inv) =>
      order.order_channel === "PO_Besar"
        ? inv.invoice_type === "PELUNASAN"
        : inv.invoice_type === "FULL",
    );
    assertShipmentPaymentGuard(input.to_status, finalInvoice?.payment_status === "Lunas");

    const nextShippingCost =
      input.shipping_cost !== undefined
        ? toDecimalString(input.shipping_cost)
        : toDecimalString(order.shipping_cost.toString());

    const updatedOrder = await tx.order.update({
      where: { order_id: orderId },
      data: {
        order_status: input.to_status,
        ...(input.to_status === "Karantina" && input.quarantine_doc_number !== undefined
          ? { quarantine_doc_number: input.quarantine_doc_number }
          : {}),
        ...(input.to_status === "Siap_Kirim" && input.shipping_cost !== undefined
          ? { shipping_cost: nextShippingCost }
          : {}),
        ...(input.to_status === "Dikirim" && input.tracking_number !== undefined
          ? { tracking_number: input.tracking_number }
          : {}),
        status_logs: {
          create: {
            from_status: order.order_status,
            to_status: input.to_status,
            changed_by: actorUserId,
            note:
              input.note ??
              `Status diperbarui dari ${order.order_status.replaceAll("_", " ")} ke ${input.to_status.replaceAll("_", " ")}.`,
          },
        },
      },
    });

    // Aturan bisnis #7: saat order B2B masuk Siap_Kirim, terbitkan Invoice Pelunasan otomatis
    let settlementInvoice = null;
    if (order.order_channel === "PO_Besar" && input.to_status === "Siap_Kirim") {
      const existingSettlement = order.invoices.find((i) => i.invoice_type === "PELUNASAN");
      if (!existingSettlement) {
        const dpInvoice = order.invoices.find((i) => i.invoice_type === "DP_50");
        const dpAmount = dpInvoice ? dpInvoice.total_billed.toString() : "0.00";
        const settlementTotal = calculateSettlement(
          order.total_amount.toString(),
          dpAmount,
          nextShippingCost,
        );
        const invNumber = await generateDocumentNumber(tx, "INV");

        settlementInvoice = await tx.invoice.create({
          data: {
            invoice_number: invNumber,
            order_id: order.order_id,
            invoice_type: "PELUNASAN",
            total_billed: settlementTotal,
            shipping_cost_billed: nextShippingCost,
            payment_status: "Belum_Bayar",
          },
        });
      }
    }

    return {
      order_id: updatedOrder.order_id,
      order_number: updatedOrder.order_number,
      order_status: updatedOrder.order_status,
      shipping_cost: toDecimalString(updatedOrder.shipping_cost.toString()),
      quarantine_doc_number: updatedOrder.quarantine_doc_number,
      tracking_number: updatedOrder.tracking_number,
      settlement_invoice: settlementInvoice
        ? {
            invoice_id: settlementInvoice.invoice_id,
            invoice_number: settlementInvoice.invoice_number,
            total_billed: toDecimalString(settlementInvoice.total_billed.toString()),
          }
        : null,
    };
  });
}

// ============================================================================
// 6. ALERT STOCK & PERSIAPAN PRODUK (STOK ONLINE)
// ============================================================================

export async function getStockAlertsService() {
  const activeProducts = await prisma.product.findMany({
    where: { is_active: true },
    orderBy: { stock_online: "asc" },
  });

  const alerts = activeProducts
    .filter((p) => p.stock_online <= p.min_stock_threshold)
    .map((p) => ({
      product_id: p.product_id,
      sku_code: p.sku_code,
      product_name: p.product_name,
      variant_size: p.variant_size,
      unit: p.unit,
      stock_online: p.stock_online,
      min_stock_threshold: p.min_stock_threshold,
      deficit: Math.max(0, p.min_stock_threshold - p.stock_online),
    }));

  return {
    count: alerts.length,
    items: alerts,
  };
}

export async function recordStockPreparationService(input: StockPreparationInput) {
  const existing = await prisma.product.findUnique({ where: { product_id: input.product_id } });
  if (!existing || !existing.is_active) {
    throw new NotFoundError("Produk tidak ditemukan atau nonaktif.");
  }

  const updated = await prisma.product.update({
    where: { product_id: input.product_id },
    data: { stock_online: { increment: input.qty_added } },
  });

  return {
    product_id: updated.product_id,
    sku_code: updated.sku_code,
    product_name: updated.product_name,
    previous_stock: existing.stock_online,
    qty_added: input.qty_added,
    current_stock: updated.stock_online,
    production_date: input.production_date ?? new Date().toISOString().slice(0, 10),
    note: input.note ?? null,
  };
}
