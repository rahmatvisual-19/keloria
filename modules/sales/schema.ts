import { z } from "zod";
import { paginationQuerySchema } from "@/lib/validate";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive("ID tidak valid."),
});

const moneyField = z.union([
  z.number().min(0, "Nominal tidak boleh negatif."),
  z.string().regex(/^\d+(\.\d{1,2})?$/, "Format nominal desimal tidak valid."),
]);

// --- PRODUK & BOM ---

export const bomItemInputSchema = z.object({
  material_id: z.coerce.number().int().positive("Material wajib dipilih."),
  qty_per_unit: z.coerce.number().positive("Kebutuhan bahan per unit harus lebih dari 0."),
});

export const listProductsQuerySchema = paginationQuerySchema.extend({
  category: z.string().trim().optional(),
  is_active: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  low_stock_only: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

export const createProductSchema = z.object({
  sku_code: z.string().trim().min(2, "SKU minimal 2 karakter.").max(50),
  product_name: z.string().trim().min(2, "Nama produk minimal 2 karakter.").max(150),
  variant_size: z.string().trim().max(60).optional().nullable(),
  category: z.string().trim().min(2, "Kategori wajib diisi.").max(80),
  unit: z.string().trim().min(1, "Satuan wajib diisi.").max(30),
  unit_price: moneyField,
  stock_online: z.coerce.number().int().min(0).default(0),
  min_stock_threshold: z.coerce.number().int().min(0).default(0),
  is_active: z.boolean().default(true),
  bom_items: z.array(bomItemInputSchema).optional(),
});

export const updateProductSchema = createProductSchema.partial();

// --- PELANGGAN ---

export const listCustomersQuerySchema = paginationQuerySchema.extend({
  customer_type: z.enum(["B2C", "B2B"]).optional(),
  is_active: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
});

export const createCustomerSchema = z.object({
  customer_name: z.string().trim().min(2, "Nama pelanggan minimal 2 karakter.").max(150),
  customer_type: z.enum(["B2C", "B2B"]).default("B2C"),
  default_phone: z.string().trim().max(30).optional().nullable(),
  default_address: z.string().trim().max(500).optional().nullable(),
});

export const updateCustomerSchema = createCustomerSchema.partial().extend({
  is_active: z.boolean().optional(),
});

// --- PESANAN (ORDERS) ---

export const listOrdersQuerySchema = paginationQuerySchema.extend({
  order_channel: z.enum(["Online", "PO_Besar", "PO Besar"]).optional(),
  order_status: z
    .enum([
      "Menunggu_Pembayaran",
      "DP_Lunas",
      "Produksi",
      "Packing",
      "Karantina",
      "Siap_Kirim",
      "Dikirim",
      "Selesai",
      "Dibatalkan",
    ])
    .optional(),
  customer_id: z.coerce.number().int().positive().optional(),
  date_from: z.string().trim().optional(),
  date_to: z.string().trim().optional(),
});

export const createOrderSchema = z.object({
  customer_id: z.coerce.number().int().positive("Pelanggan wajib dipilih."),
  order_channel: z.enum(["Online", "PO_Besar", "PO Besar"]),
  recipient_name: z.string().trim().min(2, "Nama penerima wajib diisi.").max(150),
  recipient_phone: z.string().trim().min(6, "Nomor telepon penerima wajib diisi.").max(30),
  shipping_address: z.string().trim().min(5, "Alamat pengiriman wajib diisi.").max(500),
  shipping_cost: moneyField.default(0),
  items: z
    .array(
      z.object({
        product_id: z.coerce.number().int().positive("Produk wajib dipilih."),
        qty: z.coerce.number().int().positive("Jumlah item minimal 1."),
      }),
    )
    .min(1, "Minimal 1 produk harus dipesan."),
  note: z.string().trim().max(500).optional(),
});

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(3, "Alasan pembatalan wajib diisi minimal 3 karakter.").max(500),
});

export const salesDashboardQuerySchema = z.object({
  months: z.coerce.number().int().min(1).max(24).default(6),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type SalesDashboardQuery = z.infer<typeof salesDashboardQuerySchema>;
