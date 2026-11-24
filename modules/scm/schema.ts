import { z } from "zod";
import { paginationQuerySchema } from "@/lib/validate";

export const scmIdParamSchema = z.object({
  id: z.coerce.number().int().positive("ID tidak valid."),
});

const moneyField = z.union([
  z.number().min(0, "Nominal tidak boleh negatif."),
  z.string().regex(/^\d+(\.\d{1,2})?$/, "Format nominal desimal tidak valid."),
]);

// --- MATERIALS ---

export const createMaterialSchema = z.object({
  material_name: z.string().trim().min(2, "Nama bahan baku minimal 2 karakter.").max(150),
  unit: z.string().trim().min(1, "Satuan wajib diisi.").max(30),
  default_cost: moneyField.default(0),
});

export const updateMaterialSchema = createMaterialSchema.partial().extend({
  is_active: z.boolean().optional(),
});

// --- SUPPLIERS ---

export const createSupplierSchema = z.object({
  supplier_name: z.string().trim().min(2, "Nama supplier minimal 2 karakter.").max(150),
  contact_person: z.string().trim().max(120).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
});

export const updateSupplierSchema = createSupplierSchema.partial().extend({
  is_active: z.boolean().optional(),
});

// --- PURCHASE ORDERS (SUPPLIER) ---

export const listPoQuerySchema = paginationQuerySchema.extend({
  po_status: z.enum(["Dipesan", "Diterima", "Selesai"]).optional(),
  supplier_id: z.coerce.number().int().positive().optional(),
  order_id: z.coerce.number().int().positive().optional(),
});

export const createPurchaseOrderSchema = z.object({
  order_id: z.coerce.number().int().positive("Order wajib dipilih."),
  supplier_id: z.coerce.number().int().positive("Supplier wajib dipilih."),
  items: z
    .array(
      z.object({
        material_id: z.coerce.number().int().positive("Material wajib dipilih."),
        qty_ordered: z.coerce.number().positive("Jumlah pesanan bahan harus lebih dari 0."),
        unit: z.string().trim().min(1).max(30),
        package_cost: moneyField,
      }),
    )
    .min(1, "Minimal 1 item bahan baku pada PO supplier."),
});

export const updatePoStatusSchema = z.object({
  po_status: z.enum(["Diterima", "Selesai"]),
});

// --- TRANSISI STATUS PRODUKSI / LOGISTIK ---

export const advanceOrderStatusSchema = z.object({
  to_status: z.enum([
    "Produksi",
    "Packing",
    "Karantina",
    "Siap_Kirim",
    "Dikirim",
    "Selesai",
  ]),
  quarantine_doc_number: z.string().trim().max(100).optional().nullable(),
  shipping_cost: moneyField.optional(),
  tracking_number: z.string().trim().max(100).optional().nullable(),
  note: z.string().trim().max(500).optional(),
});

// --- PERSIAPAN STOK ONLINE ---

export const stockPreparationSchema = z.object({
  product_id: z.coerce.number().int().positive("Produk wajib dipilih."),
  qty_added: z.coerce.number().int().positive("Jumlah produksi harus lebih dari 0."),
  production_date: z.string().trim().optional(),
  note: z.string().trim().max(300).optional(),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;
export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type ListPoQuery = z.infer<typeof listPoQuerySchema>;
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type UpdatePoStatusInput = z.infer<typeof updatePoStatusSchema>;
export type AdvanceOrderStatusInput = z.infer<typeof advanceOrderStatusSchema>;
export type StockPreparationInput = z.infer<typeof stockPreparationSchema>;
