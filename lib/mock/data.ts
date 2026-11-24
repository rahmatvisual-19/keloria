import {
  CustomerType,
  EmploymentType,
  ExpenseCategory,
  InvoiceType,
  OrderChannel,
  OrderStatus,
  PaymentScheme,
  PaymentStatus,
  PayrollType,
  PayScheme,
  PoStatus,
  RoleName,
  UserStatus,
} from "@/lib/types/domain";

/**
 * Data mock realistis yang selaras 100% dengan spesifikasi Seed Kelo-ERP
 * (4 akun, 3 supplier, 8 materials, 5 produk + BOM, 5 pelanggan, order di berbagai status,
 * invoice, biaya, dan payroll) untuk pratinjau UI interaktif sebelum koneksi database.
 */

export interface MockUser {
  user_id: number;
  full_name: string;
  username: string;
  phone: string;
  role_name: RoleName;
  employment_type: EmploymentType;
  pay_scheme: PayScheme;
  base_salary: string;
  start_date: string;
  end_date: string | null;
  status: UserStatus;
  last_login: string;
}

export type ActivityModule = "AUTH" | "USERS" | "SALES" | "SCM" | "FINANCE" | "HR";
export type ActivityAction =
  | "LOGIN"
  | "LOGOUT"
  | "CREATE"
  | "UPDATE"
  | "VERIFY"
  | "STATUS_CHANGE"
  | "CANCEL"
  | "DEACTIVATE";

export interface MockActivityLog {
  log_id: number;
  timestamp: string;
  actor_name: string;
  actor_role: RoleName;
  module_code: ActivityModule;
  action: ActivityAction;
  entity_ref: string;
  description: string;
}

export interface MockSessionLog {
  session_id: string;
  username: string;
  full_name: string;
  role_name: RoleName;
  login_at: string;
  logout_at: string | null;
  status: "Aktif" | "Logout";
}

export interface MockMaterial {
  material_id: number;
  material_name: string;
  unit: string;
  default_cost: string;
}

export interface MockBomItem {
  material_id: number;
  material_name: string;
  unit: string;
  qty_per_unit: number;
}

export interface MockProduct {
  product_id: number;
  sku_code: string;
  product_name: string;
  variant_size: string;
  category: string;
  unit: string;
  unit_price: string;
  stock_online: number;
  min_stock_threshold: number;
  is_active: boolean;
  bom: MockBomItem[];
}

export interface MockCustomer {
  customer_id: number;
  customer_name: string;
  customer_type: CustomerType;
  default_phone: string;
  default_address: string;
  total_orders: number;
}

export interface MockSupplier {
  supplier_id: number;
  supplier_name: string;
  contact_person: string;
  phone: string;
  address: string;
}

export interface MockOrderItem {
  product_id: number;
  product_name: string;
  sku_code: string;
  qty: number;
  unit_price_snapshot: string;
  subtotal: string;
}

export interface MockOrderLog {
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  changed_by: string;
  changed_at: string;
  note: string;
}

export interface MockOrder {
  order_id: number;
  order_number: string;
  customer_id: number;
  customer_name: string;
  customer_type: CustomerType;
  order_date: string;
  order_channel: OrderChannel;
  payment_scheme: PaymentScheme;
  recipient_name: string;
  recipient_phone: string;
  shipping_address: string;
  shipping_cost: string;
  total_amount: string;
  tracking_number: string | null;
  quarantine_doc_number: string | null;
  order_status: OrderStatus;
  settlement_paid: boolean;
  items: MockOrderItem[];
  logs: MockOrderLog[];
}

export interface MockPurchaseOrder {
  po_id: number;
  po_number: string;
  order_number: string;
  supplier_id: number;
  supplier_name: string;
  po_date: string;
  total_cost: string;
  po_status: PoStatus;
  items: {
    material_name: string;
    qty_ordered: number;
    unit: string;
    package_cost: string;
    subtotal_cost: string;
  }[];
}

export interface MockInvoice {
  invoice_id: number;
  invoice_number: string;
  order_number: string;
  customer_name: string;
  invoice_type: InvoiceType;
  issued_date: string;
  total_billed: string;
  shipping_cost_billed: string;
  amount_paid: string;
  payment_status: PaymentStatus;
  proof_note: string | null;
}

export interface MockExpense {
  expense_id: number;
  po_number: string | null;
  expense_date: string;
  category: ExpenseCategory;
  description: string;
  amount: string;
  recorded_by: string;
}

export interface MockPayroll {
  payroll_id: number;
  user_id: number;
  employee_name: string;
  payment_date: string;
  payment_type: PayrollType;
  gross_amount: string;
  kasbon_deduction: string;
  net_amount: string;
  period_label: string;
  notes: string;
}

export const INITIAL_USERS: MockUser[] = [
  {
    user_id: 1,
    full_name: "Ibu Syahrani Devi",
    username: "owner",
    phone: "0812-3400-1001",
    role_name: "Owner",
    employment_type: "Tetap",
    pay_scheme: "Bulanan",
    base_salary: "8500000.00",
    start_date: "2023-01-10",
    end_date: null,
    status: "Aktif",
    last_login: "2026-11-24T08:15:00+07:00",
  },
  {
    user_id: 2,
    full_name: "Rina Wulandari",
    username: "manager",
    phone: "0812-3400-1002",
    role_name: "Manager/SDM",
    employment_type: "Tetap",
    pay_scheme: "Bulanan",
    base_salary: "4800000.00",
    start_date: "2024-03-01",
    end_date: null,
    status: "Aktif",
    last_login: "2026-11-24T08:30:00+07:00",
  },
  {
    user_id: 3,
    full_name: "Budi Santoso",
    username: "pegawai",
    phone: "0813-5500-2003",
    role_name: "Pegawai",
    employment_type: "Tetap",
    pay_scheme: "Mingguan",
    base_salary: "3200000.00",
    start_date: "2025-02-15",
    end_date: null,
    status: "Aktif",
    last_login: "2026-11-24T09:05:00+07:00",
  },
  {
    user_id: 4,
    full_name: "Dina Kartika",
    username: "pkl",
    phone: "0857-9900-3004",
    role_name: "Anak PKL",
    employment_type: "PKL",
    pay_scheme: "Mingguan",
    base_salary: "900000.00",
    start_date: "2026-09-01",
    end_date: "2026-12-31",
    status: "Aktif",
    last_login: "2026-11-24T09:12:00+07:00",
  },
];

export const INITIAL_ACTIVITY_LOGS: MockActivityLog[] = [
  {
    log_id: 1,
    timestamp: "2026-11-24T08:15:00+07:00",
    actor_name: "Ibu Syahrani Devi",
    actor_role: "Owner",
    module_code: "AUTH",
    action: "LOGIN",
    entity_ref: "owner",
    description: "Berhasil masuk ke sistem Kelo-ERP.",
  },
  {
    log_id: 2,
    timestamp: "2026-11-23T09:00:00+07:00",
    actor_name: "Budi Santoso",
    actor_role: "Pegawai",
    module_code: "FINANCE",
    action: "VERIFY",
    entity_ref: "INV-202611-0006",
    description: "Memverifikasi pembayaran penuh QRIS Rp 250.000 untuk ORD-202611-0004.",
  },
  {
    log_id: 3,
    timestamp: "2026-11-21T16:00:00+07:00",
    actor_name: "Budi Santoso",
    actor_role: "Pegawai",
    module_code: "SCM",
    action: "STATUS_CHANGE",
    entity_ref: "ORD-202611-0002",
    description: "Memindahkan order dari Karantina ke Siap Kirim (Ongkir Rp 180.000, Invoice Pelunasan terbit).",
  },
  {
    log_id: 4,
    timestamp: "2026-11-20T09:40:00+07:00",
    actor_name: "Ibu Syahrani Devi",
    actor_role: "Owner",
    module_code: "FINANCE",
    action: "VERIFY",
    entity_ref: "INV-202611-0005",
    description: "Memverifikasi DP 50% Rp 1.550.000 untuk ORD-202611-0003.",
  },
  {
    log_id: 5,
    timestamp: "2026-11-15T14:10:00+07:00",
    actor_name: "Rina Wulandari",
    actor_role: "Manager/SDM",
    module_code: "SCM",
    action: "STATUS_CHANGE",
    entity_ref: "PO-202611-0002",
    description: "Menandai PO Supplier Diterima; biaya Pembelian Supplier Rp 1.248.000 tercatat otomatis.",
  },
];

export const INITIAL_SESSION_LOGS: MockSessionLog[] = [
  {
    session_id: "SES-20261124-001",
    username: "owner",
    full_name: "Ibu Syahrani Devi",
    role_name: "Owner",
    login_at: "2026-11-24T08:15:00+07:00",
    logout_at: null,
    status: "Aktif",
  },
  {
    session_id: "SES-20261124-002",
    username: "manager",
    full_name: "Rina Wulandari",
    role_name: "Manager/SDM",
    login_at: "2026-11-24T08:30:00+07:00",
    logout_at: null,
    status: "Aktif",
  },
  {
    session_id: "SES-20261123-009",
    username: "pegawai",
    full_name: "Budi Santoso",
    role_name: "Pegawai",
    login_at: "2026-11-23T08:45:00+07:00",
    logout_at: "2026-11-23T17:10:00+07:00",
    status: "Logout",
  },
  {
    session_id: "SES-20261123-010",
    username: "pkl",
    full_name: "Dina Kartika",
    role_name: "Anak PKL",
    login_at: "2026-11-23T09:00:00+07:00",
    logout_at: "2026-11-23T16:30:00+07:00",
    status: "Logout",
  },
];

export const INITIAL_MATERIALS: MockMaterial[] = [
  { material_id: 1, material_name: "Bahan Baku Utama A", unit: "kg", default_cost: "45000.00" },
  { material_id: 2, material_name: "Bahan Baku Utama B", unit: "kg", default_cost: "62000.00" },
  { material_id: 3, material_name: "Bahan Pendukung Organik", unit: "kg", default_cost: "38000.00" },
  { material_id: 4, material_name: "Pemanis / Campuran Alami", unit: "kg", default_cost: "28000.00" },
  { material_id: 5, material_name: "Pouch Standing 250g", unit: "pcs", default_cost: "2200.00" },
  { material_id: 6, material_name: "Pouch Standing 500g", unit: "pcs", default_cost: "3100.00" },
  { material_id: 7, material_name: "Label Stiker Keloria", unit: "pcs", default_cost: "850.00" },
  { material_id: 8, material_name: "Kardus Pengiriman B2B", unit: "pcs", default_cost: "6500.00" },
];

export const INITIAL_SUPPLIERS: MockSupplier[] = [
  {
    supplier_id: 1,
    supplier_name: "CV Sumber Bahan Nusantara",
    contact_person: "Hendra Wijaya",
    phone: "0811-2233-4455",
    address: "Jl. Raya Industri No. 18, Sidoarjo",
  },
  {
    supplier_id: 2,
    supplier_name: "UD Kemasan Prima Mandiri",
    contact_person: "Siti Aminah",
    phone: "0812-8877-6655",
    address: "Jl. Kalirungkut No. 42, Surabaya",
  },
  {
    supplier_id: 3,
    supplier_name: "PT Agro Mitra Sejahtera",
    contact_person: "Agus Pratama",
    phone: "0813-9988-7766",
    address: "Jl. Raya Malang-Pandaan KM 12, Pasuruan",
  },
];

export const INITIAL_PRODUCTS: MockProduct[] = [
  {
    product_id: 1,
    sku_code: "KLR-001",
    product_name: "Produk Olahan Keloria Original",
    variant_size: "250g",
    category: "Seri Original",
    unit: "pcs",
    unit_price: "48000.00",
    stock_online: 4, // Di bawah batas minimum (Alert Stock!)
    min_stock_threshold: 10,
    is_active: true,
    bom: [
      { material_id: 1, material_name: "Bahan Baku Utama A", unit: "kg", qty_per_unit: 0.25 },
      { material_id: 5, material_name: "Pouch Standing 250g", unit: "pcs", qty_per_unit: 1 },
      { material_id: 7, material_name: "Label Stiker Keloria", unit: "pcs", qty_per_unit: 1 },
    ],
  },
  {
    product_id: 2,
    sku_code: "KLR-002",
    product_name: "Produk Olahan Keloria Original",
    variant_size: "500g",
    category: "Seri Original",
    unit: "pcs",
    unit_price: "89000.00",
    stock_online: 18,
    min_stock_threshold: 8,
    is_active: true,
    bom: [
      { material_id: 1, material_name: "Bahan Baku Utama A", unit: "kg", qty_per_unit: 0.5 },
      { material_id: 6, material_name: "Pouch Standing 500g", unit: "pcs", qty_per_unit: 1 },
      { material_id: 7, material_name: "Label Stiker Keloria", unit: "pcs", qty_per_unit: 1 },
    ],
  },
  {
    product_id: 3,
    sku_code: "KLR-003",
    product_name: "Produk Olahan Keloria Premium",
    variant_size: "250g",
    category: "Seri Premium",
    unit: "pcs",
    unit_price: "65000.00",
    stock_online: 6, // Sama dengan batas minimum (Alert Stock!)
    min_stock_threshold: 6,
    is_active: true,
    bom: [
      { material_id: 2, material_name: "Bahan Baku Utama B", unit: "kg", qty_per_unit: 0.22 },
      { material_id: 3, material_name: "Bahan Pendukung Organik", unit: "kg", qty_per_unit: 0.05 },
      { material_id: 5, material_name: "Pouch Standing 250g", unit: "pcs", qty_per_unit: 1 },
      { material_id: 7, material_name: "Label Stiker Keloria", unit: "pcs", qty_per_unit: 1 },
    ],
  },
  {
    product_id: 4,
    sku_code: "KLR-004",
    product_name: "Produk Olahan Keloria Paket Curah B2B",
    variant_size: "1 kg",
    category: "Seri B2B",
    unit: "pack",
    unit_price: "165000.00",
    stock_online: 12,
    min_stock_threshold: 5,
    is_active: true,
    bom: [
      { material_id: 1, material_name: "Bahan Baku Utama A", unit: "kg", qty_per_unit: 0.8 },
      { material_id: 4, material_name: "Pemanis / Campuran Alami", unit: "kg", qty_per_unit: 0.2 },
      { material_id: 8, material_name: "Kardus Pengiriman B2B", unit: "pcs", qty_per_unit: 0.2 },
    ],
  },
  {
    product_id: 5,
    sku_code: "KLR-005",
    product_name: "Produk Olahan Keloria Gift Box",
    variant_size: "3 x 250g",
    category: "Bundling",
    unit: "box",
    unit_price: "155000.00",
    stock_online: 14,
    min_stock_threshold: 5,
    is_active: true,
    bom: [
      { material_id: 1, material_name: "Bahan Baku Utama A", unit: "kg", qty_per_unit: 0.5 },
      { material_id: 2, material_name: "Bahan Baku Utama B", unit: "kg", qty_per_unit: 0.25 },
      { material_id: 5, material_name: "Pouch Standing 250g", unit: "pcs", qty_per_unit: 3 },
      { material_id: 8, material_name: "Kardus Pengiriman B2B", unit: "pcs", qty_per_unit: 1 },
    ],
  },
];

export const INITIAL_CUSTOMERS: MockCustomer[] = [
  {
    customer_id: 1,
    customer_name: "PT Mitra Kuliner Nusantara",
    customer_type: "B2B",
    default_phone: "021-5501-9920",
    default_address: "Kawasan Pergudangan Cikarang Blok B4, Bekasi",
    total_orders: 4,
  },
  {
    customer_id: 2,
    customer_name: "CV Sehat Alami Distribusi",
    customer_type: "B2B",
    default_phone: "031-8421-3310",
    default_address: "Jl. Rungkut Industri III No. 11, Surabaya",
    total_orders: 3,
  },
  {
    customer_id: 3,
    customer_name: "Koperasi Karyawan Harmoni",
    customer_type: "B2B",
    default_phone: "022-7301-4402",
    default_address: "Jl. Soekarno-Hatta No. 210, Bandung",
    total_orders: 2,
  },
  {
    customer_id: 4,
    customer_name: "Nadia Putri Rahma",
    customer_type: "B2C",
    default_phone: "0812-7741-8890",
    default_address: "Perum Graha Indah Blok C2/14, Yogyakarta",
    total_orders: 2,
  },
  {
    customer_id: 5,
    customer_name: "Fajar Nugroho",
    customer_type: "B2C",
    default_phone: "0856-4120-5531",
    default_address: "Jl. Diponegoro No. 55, Semarang",
    total_orders: 1,
  },
];

export const INITIAL_ORDERS: MockOrder[] = [
  {
    order_id: 1,
    order_number: "ORD-202611-0001",
    customer_id: 1,
    customer_name: "PT Mitra Kuliner Nusantara",
    customer_type: "B2B",
    order_date: "2026-11-04",
    order_channel: "PO Besar",
    payment_scheme: "DP_50",
    recipient_name: "Gudang Penerimaan PT Mitra",
    recipient_phone: "021-5501-9920",
    shipping_address: "Kawasan Pergudangan Cikarang Blok B4, Bekasi",
    shipping_cost: "250000.00",
    total_amount: "8250000.00",
    tracking_number: "JNE-CARGO-882910",
    quarantine_doc_number: "KRN-2026-11-009",
    order_status: "Dikirim",
    settlement_paid: true,
    items: [
      {
        product_id: 4,
        product_name: "Produk Olahan Keloria Paket Curah B2B",
        sku_code: "KLR-004",
        qty: 50,
        unit_price_snapshot: "165000.00",
        subtotal: "8250000.00",
      },
    ],
    logs: [
      {
        from_status: null,
        to_status: "Menunggu_Pembayaran",
        changed_by: "Budi Santoso",
        changed_at: "2026-11-04T09:10:00+07:00",
        note: "PO B2B dibuat; Invoice DP 50% terbit otomatis.",
      },
      {
        from_status: "Menunggu_Pembayaran",
        to_status: "DP_Lunas",
        changed_by: "Rina Wulandari",
        changed_at: "2026-11-05T10:30:00+07:00",
        note: "DP 50% diverifikasi via transfer BCA.",
      },
      {
        from_status: "Siap_Kirim",
        to_status: "Dikirim",
        changed_by: "Budi Santoso",
        changed_at: "2026-11-16T14:20:00+07:00",
        note: "Pelunasan lunas, resi JNE-CARGO-882910 diinput.",
      },
    ],
  },
  {
    order_id: 2,
    order_number: "ORD-202611-0002",
    customer_id: 2,
    customer_name: "CV Sehat Alami Distribusi",
    customer_type: "B2B",
    order_date: "2026-11-12",
    order_channel: "PO Besar",
    payment_scheme: "DP_50",
    recipient_name: "Divisi Logistik CV Sehat",
    recipient_phone: "031-8421-3310",
    shipping_address: "Jl. Rungkut Industri III No. 11, Surabaya",
    shipping_cost: "180000.00",
    total_amount: "4950000.00",
    tracking_number: null,
    quarantine_doc_number: "KRN-2026-11-014",
    order_status: "Siap_Kirim",
    settlement_paid: false, // Uji guard: belum bisa pindah ke Dikirim!
    items: [
      {
        product_id: 4,
        product_name: "Produk Olahan Keloria Paket Curah B2B",
        sku_code: "KLR-004",
        qty: 30,
        unit_price_snapshot: "165000.00",
        subtotal: "4950000.00",
      },
    ],
    logs: [
      {
        from_status: null,
        to_status: "Menunggu_Pembayaran",
        changed_by: "Dina Kartika",
        changed_at: "2026-11-12T11:00:00+07:00",
        note: "PO B2B masuk dari CV Sehat Alami.",
      },
      {
        from_status: "Karantina",
        to_status: "Siap_Kirim",
        changed_by: "Budi Santoso",
        changed_at: "2026-11-21T16:00:00+07:00",
        note: "Karantina lulus (KRN-2026-11-014), ongkir Rp 180.000 diinput.",
      },
    ],
  },
  {
    order_id: 3,
    order_number: "ORD-202611-0003",
    customer_id: 3,
    customer_name: "Koperasi Karyawan Harmoni",
    customer_type: "B2B",
    order_date: "2026-11-19",
    order_channel: "PO Besar",
    payment_scheme: "DP_50",
    recipient_name: "Pengurus Koperasi Harmoni",
    recipient_phone: "022-7301-4402",
    shipping_address: "Jl. Soekarno-Hatta No. 210, Bandung",
    shipping_cost: "0.00",
    total_amount: "3100000.00",
    tracking_number: null,
    quarantine_doc_number: null,
    order_status: "DP_Lunas",
    settlement_paid: false,
    items: [
      {
        product_id: 5,
        product_name: "Produk Olahan Keloria Gift Box",
        sku_code: "KLR-005",
        qty: 20,
        unit_price_snapshot: "155000.00",
        subtotal: "3100000.00",
      },
    ],
    logs: [
      {
        from_status: null,
        to_status: "Menunggu_Pembayaran",
        changed_by: "Budi Santoso",
        changed_at: "2026-11-19T13:15:00+07:00",
        note: "PO Gift Box untuk acara koperasi.",
      },
      {
        from_status: "Menunggu_Pembayaran",
        to_status: "DP_Lunas",
        changed_by: "Ibu Syahrani Devi",
        changed_at: "2026-11-20T09:40:00+07:00",
        note: "DP 50% terverifikasi; siap hitung BOM & produksi.",
      },
    ],
  },
  {
    order_id: 4,
    order_number: "ORD-202611-0004",
    customer_id: 4,
    customer_name: "Nadia Putri Rahma",
    customer_type: "B2C",
    order_date: "2026-11-22",
    order_channel: "Online",
    payment_scheme: "FULL",
    recipient_name: "Nadia Putri Rahma",
    recipient_phone: "0812-7741-8890",
    shipping_address: "Perum Graha Indah Blok C2/14, Yogyakarta",
    shipping_cost: "24000.00",
    total_amount: "226000.00",
    tracking_number: null,
    quarantine_doc_number: null,
    order_status: "Packing",
    settlement_paid: true,
    items: [
      {
        product_id: 1,
        product_name: "Produk Olahan Keloria Original",
        sku_code: "KLR-001",
        qty: 2,
        unit_price_snapshot: "48000.00",
        subtotal: "96000.00",
      },
      {
        product_id: 3,
        product_name: "Produk Olahan Keloria Premium",
        sku_code: "KLR-003",
        qty: 2,
        unit_price_snapshot: "65000.00",
        subtotal: "130000.00",
      },
    ],
    logs: [
      {
        from_status: null,
        to_status: "Menunggu_Pembayaran",
        changed_by: "Dina Kartika",
        changed_at: "2026-11-22T15:05:00+07:00",
        note: "Order B2C masuk, stok online otomatis berkurang.",
      },
      {
        from_status: "Menunggu_Pembayaran",
        to_status: "Packing",
        changed_by: "Budi Santoso",
        changed_at: "2026-11-23T09:00:00+07:00",
        note: "Pembayaran penuh diverifikasi, masuk antrean packing.",
      },
    ],
  },
  {
    order_id: 5,
    order_number: "ORD-202611-0005",
    customer_id: 5,
    customer_name: "Fajar Nugroho",
    customer_type: "B2C",
    order_date: "2026-11-23",
    order_channel: "Online",
    payment_scheme: "FULL",
    recipient_name: "Fajar Nugroho",
    recipient_phone: "0856-4120-5531",
    shipping_address: "Jl. Diponegoro No. 55, Semarang",
    shipping_cost: "18000.00",
    total_amount: "178000.00",
    tracking_number: null,
    quarantine_doc_number: null,
    order_status: "Menunggu_Pembayaran",
    settlement_paid: false,
    items: [
      {
        product_id: 2,
        product_name: "Produk Olahan Keloria Original",
        sku_code: "KLR-002",
        qty: 2,
        unit_price_snapshot: "89000.00",
        subtotal: "178000.00",
      },
    ],
    logs: [
      {
        from_status: null,
        to_status: "Menunggu_Pembayaran",
        changed_by: "Dina Kartika",
        changed_at: "2026-11-23T18:20:00+07:00",
        note: "Menunggu bukti transfer dari pelanggan online.",
      },
    ],
  },
];

export const INITIAL_POS: MockPurchaseOrder[] = [
  {
    po_id: 1,
    po_number: "PO-202611-0001",
    order_number: "ORD-202611-0001",
    supplier_id: 1,
    supplier_name: "CV Sumber Bahan Nusantara",
    po_date: "2026-11-05",
    total_cost: "2080000.00",
    po_status: "Selesai",
    items: [
      {
        material_name: "Bahan Baku Utama A",
        qty_ordered: 40,
        unit: "kg",
        package_cost: "45000.00",
        subtotal_cost: "1800000.00",
      },
      {
        material_name: "Pemanis / Campuran Alami",
        qty_ordered: 10,
        unit: "kg",
        package_cost: "28000.00",
        subtotal_cost: "280000.00",
      },
    ],
  },
  {
    po_id: 2,
    po_number: "PO-202611-0002",
    order_number: "ORD-202611-0002",
    supplier_id: 1,
    supplier_name: "CV Sumber Bahan Nusantara",
    po_date: "2026-11-13",
    total_cost: "1248000.00",
    po_status: "Diterima",
    items: [
      {
        material_name: "Bahan Baku Utama A",
        qty_ordered: 24,
        unit: "kg",
        package_cost: "45000.00",
        subtotal_cost: "1080000.00",
      },
      {
        material_name: "Pemanis / Campuran Alami",
        qty_ordered: 6,
        unit: "kg",
        package_cost: "28000.00",
        subtotal_cost: "168000.00",
      },
    ],
  },
];

export const INITIAL_INVOICES: MockInvoice[] = [
  {
    invoice_id: 1,
    invoice_number: "INV-202611-0001",
    order_number: "ORD-202611-0001",
    customer_name: "PT Mitra Kuliner Nusantara",
    invoice_type: "DP_50",
    issued_date: "2026-11-04",
    total_billed: "4125000.00",
    shipping_cost_billed: "0.00",
    amount_paid: "4125000.00",
    payment_status: "DP_Terbayar",
    proof_note: "Transfer BCA a/n PT Mitra Kuliner",
  },
  {
    invoice_id: 2,
    invoice_number: "INV-202611-0002",
    order_number: "ORD-202611-0001",
    customer_name: "PT Mitra Kuliner Nusantara",
    invoice_type: "PELUNASAN",
    issued_date: "2026-11-15",
    total_billed: "4375000.00",
    shipping_cost_billed: "250000.00",
    amount_paid: "4375000.00",
    payment_status: "Lunas",
    proof_note: "Pelunasan + ongkir kargo BCA",
  },
  {
    invoice_id: 3,
    invoice_number: "INV-202611-0003",
    order_number: "ORD-202611-0002",
    customer_name: "CV Sehat Alami Distribusi",
    invoice_type: "DP_50",
    issued_date: "2026-11-12",
    total_billed: "2475000.00",
    shipping_cost_billed: "0.00",
    amount_paid: "2475000.00",
    payment_status: "DP_Terbayar",
    proof_note: "Transfer Mandiri DP 50%",
  },
  {
    invoice_id: 4,
    invoice_number: "INV-202611-0004",
    order_number: "ORD-202611-0002",
    customer_name: "CV Sehat Alami Distribusi",
    invoice_type: "PELUNASAN",
    issued_date: "2026-11-21",
    total_billed: "2655000.00",
    shipping_cost_billed: "180000.00",
    amount_paid: "0.00",
    payment_status: "Belum_Bayar",
    proof_note: null,
  },
  {
    invoice_id: 5,
    invoice_number: "INV-202611-0005",
    order_number: "ORD-202611-0003",
    customer_name: "Koperasi Karyawan Harmoni",
    invoice_type: "DP_50",
    issued_date: "2026-11-19",
    total_billed: "1550000.00",
    shipping_cost_billed: "0.00",
    amount_paid: "1550000.00",
    payment_status: "DP_Terbayar",
    proof_note: "Transfer BNI Koperasi",
  },
  {
    invoice_id: 6,
    invoice_number: "INV-202611-0006",
    order_number: "ORD-202611-0004",
    customer_name: "Nadia Putri Rahma",
    invoice_type: "FULL",
    issued_date: "2026-11-22",
    total_billed: "250000.00",
    shipping_cost_billed: "24000.00",
    amount_paid: "250000.00",
    payment_status: "Lunas",
    proof_note: "QRIS Keloria Store",
  },
  {
    invoice_id: 7,
    invoice_number: "INV-202611-0007",
    order_number: "ORD-202611-0005",
    customer_name: "Fajar Nugroho",
    invoice_type: "FULL",
    issued_date: "2026-11-23",
    total_billed: "196000.00",
    shipping_cost_billed: "18000.00",
    amount_paid: "0.00",
    payment_status: "Belum_Bayar",
    proof_note: null,
  },
];

export const INITIAL_EXPENSES: MockExpense[] = [
  {
    expense_id: 1,
    po_number: "PO-202611-0001",
    expense_date: "2026-11-07",
    category: "Pembelian Supplier",
    description: "Penerimaan bahan baku PO-202611-0001 (CV Sumber Bahan Nusantara)",
    amount: "2080000.00",
    recorded_by: "Rina Wulandari",
  },
  {
    expense_id: 2,
    po_number: "PO-202611-0002",
    expense_date: "2026-11-15",
    category: "Pembelian Supplier",
    description: "Penerimaan bahan baku PO-202611-0002 (CV Sumber Bahan Nusantara)",
    amount: "1248000.00",
    recorded_by: "Rina Wulandari",
  },
  {
    expense_id: 3,
    po_number: null,
    expense_date: "2026-11-16",
    category: "Ongkir",
    description: "Pengiriman kargo ORD-202611-0001 ke Bekasi",
    amount: "250000.00",
    recorded_by: "Budi Santoso",
  },
  {
    expense_id: 4,
    po_number: null,
    expense_date: "2026-11-18",
    category: "Kemasan",
    description: "Pembelian bubble wrap & lakban packing online",
    amount: "185000.00",
    recorded_by: "Budi Santoso",
  },
  {
    expense_id: 5,
    po_number: null,
    expense_date: "2026-11-20",
    category: "Operasional",
    description: "Listrik & gas rumah produksi bulan November",
    amount: "640000.00",
    recorded_by: "Ibu Syahrani Devi",
  },
];

export const INITIAL_PAYROLLS: MockPayroll[] = [
  {
    payroll_id: 1,
    user_id: 2,
    employee_name: "Rina Wulandari",
    payment_date: "2026-11-01",
    payment_type: "Gaji Bulanan",
    gross_amount: "4800000.00",
    kasbon_deduction: "0.00",
    net_amount: "4800000.00",
    period_label: "Okt 2026",
    notes: "Gaji bulanan reguler",
  },
  {
    payroll_id: 2,
    user_id: 3,
    employee_name: "Budi Santoso",
    payment_date: "2026-11-14",
    payment_type: "Upah Mingguan",
    gross_amount: "800000.00",
    kasbon_deduction: "150000.00",
    net_amount: "650000.00",
    period_label: "Minggu 2 Nov 2026",
    notes: "Potong kasbon awal bulan",
  },
  {
    payroll_id: 3,
    user_id: 4,
    employee_name: "Dina Kartika",
    payment_date: "2026-11-14",
    payment_type: "Upah Mingguan",
    gross_amount: "225000.00",
    kasbon_deduction: "0.00",
    net_amount: "225000.00",
    period_label: "Minggu 2 Nov 2026",
    notes: "Uang saku & transport PKL",
  },
];

export const MONTHLY_SALES_COMPARISON = [
  { month: "Jun", b2b_omzet: 11200000, b2c_omzet: 2450000, b2b_trx: 2, b2c_trx: 14 },
  { month: "Jul", b2b_omzet: 13800000, b2c_omzet: 3120000, b2b_trx: 3, b2c_trx: 19 },
  { month: "Agu", b2b_omzet: 10500000, b2c_omzet: 3650000, b2b_trx: 2, b2c_trx: 22 },
  { month: "Sep", b2b_omzet: 15400000, b2c_omzet: 4100000, b2b_trx: 3, b2c_trx: 25 },
  { month: "Okt", b2b_omzet: 17900000, b2c_omzet: 4850000, b2b_trx: 4, b2c_trx: 29 },
  { month: "Nov", b2b_omzet: 16300000, b2c_omzet: 4040000, b2b_trx: 3, b2c_trx: 24 },
];
