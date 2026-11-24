/**
 * Tipe domain & konstanta bersama untuk antarmuka Kelo-ERP.
 * Nama field & enum diselaraskan 100% dengan skema ERD dan aturan bisnis.
 */

export type RoleName = "Owner" | "Manager/SDM" | "Pegawai" | "Anak PKL";
export type ModuleCode = "SALES" | "SCM" | "FINANCE" | "HR";
export type PermissionAction = "view" | "create" | "edit" | "delete";

export type OrderStatus =
  | "Menunggu_Pembayaran"
  | "DP_Lunas"
  | "Produksi"
  | "Packing"
  | "Karantina"
  | "Siap_Kirim"
  | "Dikirim"
  | "Selesai"
  | "Dibatalkan";

export type OrderChannel = "Online" | "PO Besar";
export type PaymentScheme = "DP_50" | "FULL";
export type CustomerType = "B2C" | "B2B";
export type InvoiceType = "DP_50" | "PELUNASAN" | "FULL";
export type PaymentStatus = "Belum_Bayar" | "DP_Terbayar" | "Lunas";
export type PoStatus = "Dipesan" | "Diterima" | "Selesai";
export type EmploymentType = "Tetap" | "PKL";
export type PayScheme = "Bulanan" | "Mingguan";
export type UserStatus = "Aktif" | "Nonaktif";
export type PayrollType = "Gaji Bulanan" | "Upah Mingguan" | "Kasbon";
export type ExpenseCategory =
  | "Pembelian Supplier"
  | "Ongkir"
  | "Kemasan"
  | "Operasional"
  | "Lain";

export type PermissionMatrix = Record<
  ModuleCode,
  Record<PermissionAction, boolean>
>;

export interface SessionUser {
  user_id: number;
  full_name: string;
  username: string;
  role_name: RoleName;
  employment_type: EmploymentType;
  pay_scheme: PayScheme;
  status: UserStatus;
  permissions: PermissionMatrix;
}

export const ROLE_PERMISSION_DEFAULTS: Record<RoleName, PermissionMatrix> = {
  Owner: {
    SALES: { view: true, create: true, edit: true, delete: true },
    SCM: { view: true, create: true, edit: true, delete: true },
    FINANCE: { view: true, create: true, edit: true, delete: true },
    HR: { view: true, create: true, edit: true, delete: true },
  },
  "Manager/SDM": {
    SALES: { view: true, create: true, edit: true, delete: false },
    SCM: { view: true, create: true, edit: true, delete: false },
    FINANCE: { view: true, create: true, edit: true, delete: false },
    HR: { view: true, create: false, edit: true, delete: false },
  },
  Pegawai: {
    SALES: { view: true, create: true, edit: true, delete: false },
    SCM: { view: true, create: true, edit: true, delete: false },
    FINANCE: { view: true, create: true, edit: true, delete: false },
    HR: { view: false, create: false, edit: false, delete: false },
  },
  "Anak PKL": {
    SALES: { view: true, create: true, edit: true, delete: false },
    SCM: { view: true, create: true, edit: true, delete: false },
    FINANCE: { view: true, create: false, edit: false, delete: false },
    HR: { view: false, create: false, edit: false, delete: false },
  },
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  Menunggu_Pembayaran: "Menunggu Pembayaran",
  DP_Lunas: "DP Lunas",
  Produksi: "Produksi",
  Packing: "Packing",
  Karantina: "Karantina",
  Siap_Kirim: "Siap Kirim",
  Dikirim: "Dikirim",
  Selesai: "Selesai",
  Dibatalkan: "Dibatalkan",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  Belum_Bayar: "Belum Bayar",
  DP_Terbayar: "DP Terbayar",
  Lunas: "Lunas",
};

export const B2B_STATUS_FLOW: OrderStatus[] = [
  "DP_Lunas",
  "Produksi",
  "Packing",
  "Karantina",
  "Siap_Kirim",
  "Dikirim",
  "Selesai",
];

export const B2C_STATUS_FLOW: OrderStatus[] = [
  "Menunggu_Pembayaran",
  "Packing",
  "Siap_Kirim",
  "Dikirim",
  "Selesai",
];
