import { OrderChannel, OrderStatus, Prisma } from "@prisma/client";
import { generateDocumentNumber } from "@/lib/doc-number";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import { toDecimalString } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import {
  assertOrderCancellable,
  computeOrderTotals,
  normalizeOrderChannel,
  resolvePaymentScheme,
  shouldRestoreOnlineStockOnCancel,
} from "./rules";
import {
  CancelOrderInput,
  CreateCustomerInput,
  CreateOrderInput,
  CreateProductInput,
  ListCustomersQuery,
  ListOrdersQuery,
  ListProductsQuery,
  SalesDashboardQuery,
  UpdateCustomerInput,
  UpdateProductInput,
} from "./schema";

// ============================================================================
// 1. KATALOG PRODUK & BOM
// ============================================================================

export async function listProductsService(query: ListProductsQuery) {
  const where: Prisma.ProductWhereInput = {
    ...(query.category ? { category: query.category } : {}),
    ...(query.is_active !== undefined ? { is_active: query.is_active } : {}),
    ...(query.search
      ? {
          OR: [
            { sku_code: { contains: query.search, mode: "insensitive" } },
            { product_name: { contains: query.search, mode: "insensitive" } },
            { category: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const skip = (query.page - 1) * query.limit;
  const [rows, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      include: {
        bom_items: {
          include: { material: true },
        },
      },
      orderBy: { product_id: "asc" },
      skip,
      take: query.limit,
    }),
    prisma.product.count({ where }),
  ]);

  const serialized = rows
    .filter((p) => (!query.low_stock_only ? true : p.stock_online <= p.min_stock_threshold))
    .map((p) => ({
      ...p,
      unit_price: toDecimalString(p.unit_price.toString()),
      is_low_stock: p.stock_online <= p.min_stock_threshold,
      bom_items: p.bom_items.map((b) => ({
        bom_id: b.bom_id,
        material_id: b.material_id,
        material_name: b.material.material_name,
        unit: b.material.unit,
        qty_per_unit: Number(b.qty_per_unit),
      })),
    }));

  return {
    items: serialized,
    total: query.low_stock_only ? serialized.length : total,
    page: query.page,
    limit: query.limit,
  };
}

export async function getProductDetailService(productId: number) {
  const product = await prisma.product.findUnique({
    where: { product_id: productId },
    include: { bom_items: { include: { material: true } } },
  });
  if (!product) throw new NotFoundError("Produk tidak ditemukan.");

  return {
    ...product,
    unit_price: toDecimalString(product.unit_price.toString()),
    is_low_stock: product.stock_online <= product.min_stock_threshold,
    bom_items: product.bom_items.map((b) => ({
      bom_id: b.bom_id,
      material_id: b.material_id,
      material_name: b.material.material_name,
      unit: b.material.unit,
      qty_per_unit: Number(b.qty_per_unit),
    })),
  };
}

export async function createProductService(input: CreateProductInput) {
  const created = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        sku_code: input.sku_code,
        product_name: input.product_name,
        variant_size: input.variant_size ?? null,
        category: input.category,
        unit: input.unit,
        unit_price: toDecimalString(input.unit_price),
        stock_online: input.stock_online,
        min_stock_threshold: input.min_stock_threshold,
        is_active: input.is_active,
        ...(input.bom_items && input.bom_items.length > 0
          ? {
              bom_items: {
                create: input.bom_items.map((b) => ({
                  material_id: b.material_id,
                  qty_per_unit: b.qty_per_unit.toFixed(4),
                })),
              },
            }
          : {}),
      },
      include: { bom_items: { include: { material: true } } },
    });

    return product;
  });

  return {
    ...created,
    unit_price: toDecimalString(created.unit_price.toString()),
  };
}

export async function updateProductService(productId: number, input: UpdateProductInput) {
  const existing = await prisma.product.findUnique({ where: { product_id: productId } });
  if (!existing) throw new NotFoundError("Produk tidak ditemukan.");

  const updated = await prisma.$transaction(async (tx) => {
    if (input.bom_items !== undefined) {
      await tx.productBom.deleteMany({ where: { product_id: productId } });
      if (input.bom_items.length > 0) {
        await tx.productBom.createMany({
          data: input.bom_items.map((b) => ({
            product_id: productId,
            material_id: b.material_id,
            qty_per_unit: b.qty_per_unit.toFixed(4),
          })),
        });
      }
    }

    return tx.product.update({
      where: { product_id: productId },
      data: {
        ...(input.sku_code !== undefined ? { sku_code: input.sku_code } : {}),
        ...(input.product_name !== undefined ? { product_name: input.product_name } : {}),
        ...(input.variant_size !== undefined ? { variant_size: input.variant_size } : {}),
        ...(input.category !== undefined ? { category: input.category } : {}),
        ...(input.unit !== undefined ? { unit: input.unit } : {}),
        ...(input.unit_price !== undefined
          ? { unit_price: toDecimalString(input.unit_price) }
          : {}),
        ...(input.stock_online !== undefined ? { stock_online: input.stock_online } : {}),
        ...(input.min_stock_threshold !== undefined
          ? { min_stock_threshold: input.min_stock_threshold }
          : {}),
        ...(input.is_active !== undefined ? { is_active: input.is_active } : {}),
      },
      include: { bom_items: { include: { material: true } } },
    });
  });

  return {
    ...updated,
    unit_price: toDecimalString(updated.unit_price.toString()),
  };
}

export async function deactivateProductService(productId: number) {
  const existing = await prisma.product.findUnique({ where: { product_id: productId } });
  if (!existing) throw new NotFoundError("Produk tidak ditemukan.");

  const updated = await prisma.product.update({
    where: { product_id: productId },
    data: { is_active: false },
  });
  return { product_id: updated.product_id, is_active: updated.is_active };
}

// ============================================================================
// 2. PELANGGAN
// ============================================================================

export async function listCustomersService(query: ListCustomersQuery) {
  const where: Prisma.CustomerWhereInput = {
    ...(query.customer_type ? { customer_type: query.customer_type } : {}),
    ...(query.is_active !== undefined ? { is_active: query.is_active } : {}),
    ...(query.search
      ? {
          OR: [
            { customer_name: { contains: query.search, mode: "insensitive" } },
            { default_phone: { contains: query.search, mode: "insensitive" } },
            { default_address: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await prisma.$transaction([
    prisma.customer.findMany({
      where,
      include: { _count: { select: { orders: true } } },
      orderBy: { customer_id: "desc" },
      skip,
      take: query.limit,
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    items: items.map((c) => ({
      ...c,
      total_orders: c._count.orders,
    })),
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function getCustomerDetailService(customerId: number) {
  const customer = await prisma.customer.findUnique({
    where: { customer_id: customerId },
    include: {
      orders: {
        orderBy: { order_date: "desc" },
        take: 20,
      },
    },
  });
  if (!customer) throw new NotFoundError("Pelanggan tidak ditemukan.");

  return {
    ...customer,
    orders: customer.orders.map((o) => ({
      ...o,
      total_amount: toDecimalString(o.total_amount.toString()),
      shipping_cost: toDecimalString(o.shipping_cost.toString()),
    })),
  };
}

export async function createCustomerService(input: CreateCustomerInput) {
  return prisma.customer.create({
    data: {
      customer_name: input.customer_name,
      customer_type: input.customer_type,
      default_phone: input.default_phone ?? null,
      default_address: input.default_address ?? null,
    },
  });
}

export async function updateCustomerService(customerId: number, input: UpdateCustomerInput) {
  const existing = await prisma.customer.findUnique({ where: { customer_id: customerId } });
  if (!existing) throw new NotFoundError("Pelanggan tidak ditemukan.");

  return prisma.customer.update({
    where: { customer_id: customerId },
    data: input,
  });
}

export async function deactivateCustomerService(customerId: number) {
  const existing = await prisma.customer.findUnique({ where: { customer_id: customerId } });
  if (!existing) throw new NotFoundError("Pelanggan tidak ditemukan.");

  const updated = await prisma.customer.update({
    where: { customer_id: customerId },
    data: { is_active: false },
  });
  return { customer_id: updated.customer_id, is_active: updated.is_active };
}

// ============================================================================
// 3. PESANAN (ORDERS B2B & B2C)
// ============================================================================

export async function listOrdersService(query: ListOrdersQuery) {
  const channel = query.order_channel
    ? normalizeOrderChannel(query.order_channel)
    : undefined;

  const where: Prisma.OrderWhereInput = {
    ...(channel ? { order_channel: channel as OrderChannel } : {}),
    ...(query.order_status ? { order_status: query.order_status as OrderStatus } : {}),
    ...(query.customer_id ? { customer_id: query.customer_id } : {}),
    ...(query.date_from || query.date_to
      ? {
          order_date: {
            ...(query.date_from ? { gte: new Date(query.date_from) } : {}),
            ...(query.date_to ? { lte: new Date(query.date_to) } : {}),
          },
        }
      : {}),
    ...(query.search
      ? {
          OR: [
            { order_number: { contains: query.search, mode: "insensitive" } },
            { recipient_name: { contains: query.search, mode: "insensitive" } },
            { customer: { customer_name: { contains: query.search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: {
        customer: { select: { customer_id: true, customer_name: true, customer_type: true } },
        creator: { select: { user_id: true, full_name: true } },
        invoices: {
          select: {
            invoice_id: true,
            invoice_number: true,
            invoice_type: true,
            total_billed: true,
            payment_status: true,
          },
        },
        _count: { select: { items: true } },
      },
      orderBy: { order_date: "desc" },
      skip,
      take: query.limit,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    items: items.map((o) => ({
      ...o,
      shipping_cost: toDecimalString(o.shipping_cost.toString()),
      total_amount: toDecimalString(o.total_amount.toString()),
      invoices: o.invoices.map((i) => ({
        ...i,
        total_billed: toDecimalString(i.total_billed.toString()),
      })),
    })),
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function getOrderDetailService(orderId: number) {
  const order = await prisma.order.findUnique({
    where: { order_id: orderId },
    include: {
      customer: true,
      creator: { select: { user_id: true, full_name: true, username: true } },
      items: {
        include: {
          product: {
            select: { product_id: true, sku_code: true, product_name: true, variant_size: true },
          },
        },
      },
      status_logs: {
        include: { actor: { select: { user_id: true, full_name: true } } },
        orderBy: { changed_at: "asc" },
      },
      invoices: {
        include: { payments: true },
        orderBy: { issued_date: "asc" },
      },
      purchase_orders: {
        include: { supplier: { select: { supplier_id: true, supplier_name: true } } },
        orderBy: { po_date: "asc" },
      },
    },
  });

  if (!order) throw new NotFoundError("Pesanan tidak ditemukan.");

  return {
    ...order,
    shipping_cost: toDecimalString(order.shipping_cost.toString()),
    total_amount: toDecimalString(order.total_amount.toString()),
    items: order.items.map((it) => ({
      ...it,
      unit_price_snapshot: toDecimalString(it.unit_price_snapshot.toString()),
      subtotal: toDecimalString(it.subtotal.toString()),
    })),
    invoices: order.invoices.map((inv) => ({
      ...inv,
      total_billed: toDecimalString(inv.total_billed.toString()),
      shipping_cost_billed: toDecimalString(inv.shipping_cost_billed.toString()),
      payments: inv.payments.map((pay) => ({
        ...pay,
        amount_paid: toDecimalString(pay.amount_paid.toString()),
      })),
    })),
    purchase_orders: order.purchase_orders.map((po) => ({
      ...po,
      total_cost: toDecimalString(po.total_cost.toString()),
    })),
  };
}

/**
 * Membuat pesanan baru (B2B PO Besar atau B2C Online) dalam satu transaksi atomik:
 * - Mengunci harga snapshot produk.
 * - Jika B2C (Online): validasi & kurangi `stock_online` secara atomik (anti stok negatif).
 * - Menerbitkan nomor order & nomor invoice otomatis via `document_sequences`.
 * - Menerbitkan Invoice DP 50% (B2B) atau Invoice FULL (B2C) otomatis.
 * - Mencatat riwayat awal di `order_status_logs`.
 */
export async function createOrderService(input: CreateOrderInput, actorUserId: number) {
  const channel = normalizeOrderChannel(input.order_channel);
  const paymentScheme = resolvePaymentScheme(channel);

  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({
      where: { customer_id: input.customer_id },
    });
    if (!customer || !customer.is_active) {
      throw new BadRequestError("Pelanggan tidak ditemukan atau berstatus nonaktif.");
    }

    // Gabungkan item produk duplikat jika ada dalam satu permintaan
    const qtyByProduct = new Map<number, number>();
    for (const item of input.items) {
      qtyByProduct.set(item.product_id, (qtyByProduct.get(item.product_id) ?? 0) + item.qty);
    }

    const productIds = Array.from(qtyByProduct.keys());
    const dbProducts = await tx.product.findMany({
      where: { product_id: { in: productIds }, is_active: true },
    });

    if (dbProducts.length !== productIds.length) {
      throw new BadRequestError("Sebagian produk tidak ditemukan atau berstatus nonaktif.");
    }

    // Jika B2C (Online): kurangi stok online secara atomik dengan syarat stock_online >= qty
    if (channel === "Online") {
      for (const prod of dbProducts) {
        const requestedQty = qtyByProduct.get(prod.product_id)!;
        const result = await tx.product.updateMany({
          where: {
            product_id: prod.product_id,
            is_active: true,
            stock_online: { gte: requestedQty },
          },
          data: {
            stock_online: { decrement: requestedQty },
          },
        });

        if (result.count === 0) {
          throw new ConflictError(
            `Stok online produk '${prod.product_name}' tidak mencukupi (tersedia: ${prod.stock_online}, diminta: ${requestedQty}).`,
          );
        }
      }
    }

    const totals = computeOrderTotals(
      dbProducts.map((p) => ({
        product_id: p.product_id,
        qty: qtyByProduct.get(p.product_id)!,
        unit_price: p.unit_price.toString(),
      })),
      toDecimalString(input.shipping_cost),
      channel,
    );

    const orderNumber = await generateDocumentNumber(tx, "ORD");
    const invoiceNumber = await generateDocumentNumber(tx, "INV");

    const order = await tx.order.create({
      data: {
        order_number: orderNumber,
        customer_id: input.customer_id,
        created_by: actorUserId,
        order_channel: channel,
        payment_scheme: paymentScheme,
        recipient_name: input.recipient_name,
        recipient_phone: input.recipient_phone,
        shipping_address: input.shipping_address,
        shipping_cost: totals.shipping_cost,
        total_amount: totals.total_amount,
        order_status: "Menunggu_Pembayaran",
        items: {
          create: totals.items,
        },
        status_logs: {
          create: {
            from_status: null,
            to_status: "Menunggu_Pembayaran",
            changed_by: actorUserId,
            note:
              input.note ??
              (channel === "PO_Besar"
                ? `PO B2B dibuat; Invoice DP 50% (${invoiceNumber}) terbit otomatis.`
                : `Order B2C dibuat; stok online dikurangi & Invoice FULL (${invoiceNumber}) terbit otomatis.`),
          },
        },
      },
      include: { items: true },
    });

    const invoice = await tx.invoice.create({
      data: {
        invoice_number: invoiceNumber,
        order_id: order.order_id,
        invoice_type: totals.initial_invoice_type,
        total_billed: totals.initial_invoice_billed,
        shipping_cost_billed: channel === "Online" ? totals.shipping_cost : "0.00",
        payment_status: "Belum_Bayar",
      },
    });

    return {
      order: {
        ...order,
        shipping_cost: toDecimalString(order.shipping_cost.toString()),
        total_amount: toDecimalString(order.total_amount.toString()),
      },
      invoice: {
        ...invoice,
        total_billed: toDecimalString(invoice.total_billed.toString()),
        shipping_cost_billed: toDecimalString(invoice.shipping_cost_billed.toString()),
      },
    };
  });
}

/**
 * Membatalkan pesanan (hanya sebelum status `Dikirim`).
 * Untuk pesanan B2C (`Online`), stok online dikembalikan secara atomik.
 */
export async function cancelOrderService(
  orderId: number,
  input: CancelOrderInput,
  actorUserId: number,
) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { order_id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundError("Pesanan tidak ditemukan.");

    assertOrderCancellable(order.order_status);

    if (shouldRestoreOnlineStockOnCancel(order.order_channel, order.order_status)) {
      for (const item of order.items) {
        await tx.product.update({
          where: { product_id: item.product_id },
          data: { stock_online: { increment: item.qty } },
        });
      }
    }

    const updated = await tx.order.update({
      where: { order_id: orderId },
      data: {
        order_status: "Dibatalkan",
        status_logs: {
          create: {
            from_status: order.order_status,
            to_status: "Dibatalkan",
            changed_by: actorUserId,
            note: `Pesanan dibatalkan: ${input.reason}`,
          },
        },
      },
    });

    return {
      order_id: updated.order_id,
      order_number: updated.order_number,
      order_status: updated.order_status,
      stock_restored: order.order_channel === "Online",
    };
  });
}

// ============================================================================
// 4. DASBOR PENJUALAN B2B vs B2C (OWNER-ONLY)
// ============================================================================

export async function getSalesDashboardService(query: SalesDashboardQuery) {
  const now = new Date();
  const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (query.months - 1), 1));

  const orders = await prisma.order.findMany({
    where: {
      order_status: { not: "Dibatalkan" },
      order_date: { gte: startDate },
    },
    select: {
      order_date: true,
      order_channel: true,
      total_amount: true,
    },
    orderBy: { order_date: "asc" },
  });

  const buckets = new Map<
    string,
    { month: string; b2b_omzet: number; b2c_omzet: number; b2b_trx: number; b2c_trx: number }
  >();

  for (const o of orders) {
    const ym = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
    }).format(o.order_date);

    if (!buckets.has(ym)) {
      buckets.set(ym, { month: ym, b2b_omzet: 0, b2c_omzet: 0, b2b_trx: 0, b2c_trx: 0 });
    }
    const b = buckets.get(ym)!;
    const amt = Number(o.total_amount);
    if (o.order_channel === "PO_Besar") {
      b.b2b_omzet += amt;
      b.b2b_trx += 1;
    } else {
      b.b2c_omzet += amt;
      b.b2c_trx += 1;
    }
  }

  const series = Array.from(buckets.values()).map((b) => ({
    month: b.month,
    b2b_omzet: toDecimalString(b.b2b_omzet),
    b2c_omzet: toDecimalString(b.b2c_omzet),
    b2b_trx: b.b2b_trx,
    b2c_trx: b.b2c_trx,
  }));

  const totalB2B = Array.from(buckets.values()).reduce((acc, b) => acc + b.b2b_omzet, 0);
  const totalB2C = Array.from(buckets.values()).reduce((acc, b) => acc + b.b2c_omzet, 0);
  const totalB2BTrx = Array.from(buckets.values()).reduce((acc, b) => acc + b.b2b_trx, 0);
  const totalB2CTrx = Array.from(buckets.values()).reduce((acc, b) => acc + b.b2c_trx, 0);
  const grandTotal = totalB2B + totalB2C;

  return {
    period_months: query.months,
    summary: {
      b2b_omzet: toDecimalString(totalB2B),
      b2c_omzet: toDecimalString(totalB2C),
      b2b_transactions: totalB2BTrx,
      b2c_transactions: totalB2CTrx,
      b2c_revenue_ratio_percent:
        grandTotal > 0 ? Number(((totalB2C / grandTotal) * 100).toFixed(2)) : 0,
    },
    monthly_series: series,
  };
}
