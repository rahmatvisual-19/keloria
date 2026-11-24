import bcrypt from "bcryptjs";
import {
  CustomerType,
  EmploymentType,
  ExpenseCategory,
  InvoiceType,
  OrderChannel,
  OrderStatus,
  PaymentScheme,
  PaymentStatus,
  PaymentTermType,
  PayrollPaymentType,
  PayScheme,
  PoStatus,
  PrismaClient,
  UserStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed data awal Kelo-ERP yang bersifat idempoten (aman dijalankan ulang).
 * Password akun contoh: "Kelo#12345" — WAJIB diganti sebelum penggunaan produksi.
 */
async function main() {
  console.log("Memulai seed basis data Kelo-ERP...");

  // 1. Seed 4 Role
  const roleNames = ["Owner", "Manager/SDM", "Pegawai", "Anak PKL"] as const;
  const roleMap = new Map<string, number>();

  for (const roleName of roleNames) {
    const role = await prisma.role.upsert({
      where: { role_name: roleName },
      update: {},
      create: { role_name: roleName },
    });
    roleMap.set(roleName, role.role_id);
  }

  // 2. Seed 4 Modul
  const moduleDefs = [
    { code: "SALES", name: "Sales & Marketing" },
    { code: "SCM", name: "Supply Chain Management" },
    { code: "FINANCE", name: "Finance & Accounting" },
    { code: "HR", name: "Human Resources" },
  ] as const;
  const moduleMap = new Map<string, number>();

  for (const mod of moduleDefs) {
    const m = await prisma.module.upsert({
      where: { module_code: mod.code },
      update: { module_name: mod.name },
      create: { module_code: mod.code, module_name: mod.name },
    });
    moduleMap.set(mod.code, m.module_id);
  }

  // 3. Seed 16 baris matriks role_permissions sesuai spesifikasi RBAC
  const permissionSeeds: {
    role: (typeof roleNames)[number];
    module: (typeof moduleDefs)[number]["code"];
    v: boolean;
    c: boolean;
    e: boolean;
    d: boolean;
  }[] = [
    // Owner: penuh semua modul
    { role: "Owner", module: "SALES", v: true, c: true, e: true, d: true },
    { role: "Owner", module: "SCM", v: true, c: true, e: true, d: true },
    { role: "Owner", module: "FINANCE", v: true, c: true, e: true, d: true },
    { role: "Owner", module: "HR", v: true, c: true, e: true, d: true },
    // Manager/SDM: V C E di SALES/SCM/FINANCE; V E di HR (non-sensitif)
    { role: "Manager/SDM", module: "SALES", v: true, c: true, e: true, d: false },
    { role: "Manager/SDM", module: "SCM", v: true, c: true, e: true, d: false },
    { role: "Manager/SDM", module: "FINANCE", v: true, c: true, e: true, d: false },
    { role: "Manager/SDM", module: "HR", v: true, c: false, e: true, d: false },
    // Pegawai: V C E di SALES/SCM/FINANCE; tidak ada akses HR
    { role: "Pegawai", module: "SALES", v: true, c: true, e: true, d: false },
    { role: "Pegawai", module: "SCM", v: true, c: true, e: true, d: false },
    { role: "Pegawai", module: "FINANCE", v: true, c: true, e: true, d: false },
    { role: "Pegawai", module: "HR", v: false, c: false, e: false, d: false },
    // Anak PKL: V C E di SALES/SCM; hanya V di FINANCE; tidak ada akses HR
    { role: "Anak PKL", module: "SALES", v: true, c: true, e: true, d: false },
    { role: "Anak PKL", module: "SCM", v: true, c: true, e: true, d: false },
    { role: "Anak PKL", module: "FINANCE", v: true, c: false, e: false, d: false },
    { role: "Anak PKL", module: "HR", v: false, c: false, e: false, d: false },
  ];

  for (const p of permissionSeeds) {
    const role_id = roleMap.get(p.role)!;
    const module_id = moduleMap.get(p.module)!;
    await prisma.rolePermission.upsert({
      where: { role_id_module_id: { role_id, module_id } },
      update: {
        can_view: p.v,
        can_create: p.c,
        can_edit: p.e,
        can_delete: p.d,
      },
      create: {
        role_id,
        module_id,
        can_view: p.v,
        can_create: p.c,
        can_edit: p.e,
        can_delete: p.d,
      },
    });
  }

  // 4. Seed 4 akun contoh (password default: Kelo#12345, cost 10)
  const defaultPasswordHash = await bcrypt.hash("Kelo#12345", 10);

  const userDefs = [
    {
      username: "owner",
      full_name: "Ibu Syahrani Devi",
      phone: "0812-3400-1001",
      role: "Owner",
      employment_type: EmploymentType.Tetap,
      pay_scheme: PayScheme.Bulanan,
      base_salary: "8500000.00",
    },
    {
      username: "manager",
      full_name: "Rina Wulandari",
      phone: "0812-3400-1002",
      role: "Manager/SDM",
      employment_type: EmploymentType.Tetap,
      pay_scheme: PayScheme.Bulanan,
      base_salary: "4800000.00",
    },
    {
      username: "pegawai",
      full_name: "Budi Santoso",
      phone: "0813-5500-2003",
      role: "Pegawai",
      employment_type: EmploymentType.Tetap,
      pay_scheme: PayScheme.Mingguan,
      base_salary: "3200000.00",
    },
    {
      username: "pkl",
      full_name: "Dina Kartika",
      phone: "0857-9900-3004",
      role: "Anak PKL",
      employment_type: EmploymentType.PKL,
      pay_scheme: PayScheme.Mingguan,
      base_salary: "900000.00",
    },
  ];

  const userMap = new Map<string, number>();
  for (const u of userDefs) {
    const saved = await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        username: u.username,
        full_name: u.full_name,
        phone: u.phone,
        role_id: roleMap.get(u.role)!,
        employment_type: u.employment_type,
        pay_scheme: u.pay_scheme,
        base_salary: u.base_salary,
        password_hash: defaultPasswordHash,
        status: UserStatus.Aktif,
      },
    });
    userMap.set(u.username, saved.user_id);
  }

  // 5. Seed 3 Supplier
  const supplierDefs = [
    {
      supplier_name: "CV Sumber Bahan Nusantara",
      contact_person: "Hendra Wijaya",
      phone: "0811-2233-4455",
      address: "Jl. Raya Industri No. 18, Sidoarjo",
    },
    {
      supplier_name: "UD Kemasan Prima Mandiri",
      contact_person: "Siti Aminah",
      phone: "0812-8877-6655",
      address: "Jl. Kalirungkut No. 42, Surabaya",
    },
    {
      supplier_name: "PT Agro Mitra Sejahtera",
      contact_person: "Agus Pratama",
      phone: "0813-9988-7766",
      address: "Jl. Raya Malang-Pandaan KM 12, Pasuruan",
    },
  ];

  const supplierMap = new Map<string, number>();
  for (const s of supplierDefs) {
    const saved = await prisma.supplier.upsert({
      where: { supplier_name: s.supplier_name },
      update: {},
      create: s,
    });
    supplierMap.set(s.supplier_name, saved.supplier_id);
  }

  // 6. Seed 8 Materials
  const materialDefs = [
    { material_name: "Bahan Baku Utama A", unit: "kg", default_cost: "45000.00" },
    { material_name: "Bahan Baku Utama B", unit: "kg", default_cost: "62000.00" },
    { material_name: "Bahan Pendukung Organik", unit: "kg", default_cost: "38000.00" },
    { material_name: "Pemanis / Campuran Alami", unit: "kg", default_cost: "28000.00" },
    { material_name: "Pouch Standing 250g", unit: "pcs", default_cost: "2200.00" },
    { material_name: "Pouch Standing 500g", unit: "pcs", default_cost: "3100.00" },
    { material_name: "Label Stiker Keloria", unit: "pcs", default_cost: "850.00" },
    { material_name: "Kardus Pengiriman B2B", unit: "pcs", default_cost: "6500.00" },
  ];

  const materialMap = new Map<string, number>();
  for (const m of materialDefs) {
    const saved = await prisma.material.upsert({
      where: { material_name: m.material_name },
      update: {},
      create: m,
    });
    materialMap.set(m.material_name, saved.material_id);
  }

  // 7. Seed 5 Produk Generik + BOM (KLR-001 sengaja di bawah batas minimum untuk Alert Stock)
  const productDefs = [
    {
      sku_code: "KLR-001",
      product_name: "Produk Olahan Keloria Original",
      variant_size: "250g",
      category: "Seri Original",
      unit: "pcs",
      unit_price: "48000.00",
      stock_online: 4,
      min_stock_threshold: 10,
      bom: [
        { material: "Bahan Baku Utama A", qty: "0.2500" },
        { material: "Pouch Standing 250g", qty: "1.0000" },
        { material: "Label Stiker Keloria", qty: "1.0000" },
      ],
    },
    {
      sku_code: "KLR-002",
      product_name: "Produk Olahan Keloria Original",
      variant_size: "500g",
      category: "Seri Original",
      unit: "pcs",
      unit_price: "89000.00",
      stock_online: 18,
      min_stock_threshold: 8,
      bom: [
        { material: "Bahan Baku Utama A", qty: "0.5000" },
        { material: "Pouch Standing 500g", qty: "1.0000" },
        { material: "Label Stiker Keloria", qty: "1.0000" },
      ],
    },
    {
      sku_code: "KLR-003",
      product_name: "Produk Olahan Keloria Premium",
      variant_size: "250g",
      category: "Seri Premium",
      unit: "pcs",
      unit_price: "65000.00",
      stock_online: 6,
      min_stock_threshold: 6,
      bom: [
        { material: "Bahan Baku Utama B", qty: "0.2200" },
        { material: "Bahan Pendukung Organik", qty: "0.0500" },
        { material: "Pouch Standing 250g", qty: "1.0000" },
        { material: "Label Stiker Keloria", qty: "1.0000" },
      ],
    },
    {
      sku_code: "KLR-004",
      product_name: "Produk Olahan Keloria Paket Curah B2B",
      variant_size: "1 kg",
      category: "Seri B2B",
      unit: "pack",
      unit_price: "165000.00",
      stock_online: 12,
      min_stock_threshold: 5,
      bom: [
        { material: "Bahan Baku Utama A", qty: "0.8000" },
        { material: "Pemanis / Campuran Alami", qty: "0.2000" },
        { material: "Kardus Pengiriman B2B", qty: "0.2000" },
      ],
    },
    {
      sku_code: "KLR-005",
      product_name: "Produk Olahan Keloria Gift Box",
      variant_size: "3 x 250g",
      category: "Bundling",
      unit: "box",
      unit_price: "155000.00",
      stock_online: 14,
      min_stock_threshold: 5,
      bom: [
        { material: "Bahan Baku Utama A", qty: "0.5000" },
        { material: "Bahan Baku Utama B", qty: "0.2500" },
        { material: "Pouch Standing 250g", qty: "3.0000" },
        { material: "Kardus Pengiriman B2B", qty: "1.0000" },
      ],
    },
  ];

  const productMap = new Map<string, number>();
  for (const p of productDefs) {
    const saved = await prisma.product.upsert({
      where: { sku_code: p.sku_code },
      update: {},
      create: {
        sku_code: p.sku_code,
        product_name: p.product_name,
        variant_size: p.variant_size,
        category: p.category,
        unit: p.unit,
        unit_price: p.unit_price,
        stock_online: p.stock_online,
        min_stock_threshold: p.min_stock_threshold,
        is_active: true,
      },
    });
    productMap.set(p.sku_code, saved.product_id);

    for (const bom of p.bom) {
      const material_id = materialMap.get(bom.material)!;
      await prisma.productBom.upsert({
        where: {
          product_id_material_id: {
            product_id: saved.product_id,
            material_id,
          },
        },
        update: { qty_per_unit: bom.qty },
        create: {
          product_id: saved.product_id,
          material_id,
          qty_per_unit: bom.qty,
        },
      });
    }
  }

  // 8. Seed 5 Pelanggan (3 B2B & 2 B2C)
  const customerDefs = [
    {
      customer_name: "PT Mitra Kuliner Nusantara",
      customer_type: CustomerType.B2B,
      default_phone: "021-5501-9920",
      default_address: "Kawasan Pergudangan Cikarang Blok B4, Bekasi",
    },
    {
      customer_name: "CV Sehat Alami Distribusi",
      customer_type: CustomerType.B2B,
      default_phone: "031-8421-3310",
      default_address: "Jl. Rungkut Industri III No. 11, Surabaya",
    },
    {
      customer_name: "Koperasi Karyawan Harmoni",
      customer_type: CustomerType.B2B,
      default_phone: "022-7301-4402",
      default_address: "Jl. Soekarno-Hatta No. 210, Bandung",
    },
    {
      customer_name: "Nadia Putri Rahma",
      customer_type: CustomerType.B2C,
      default_phone: "0812-7741-8890",
      default_address: "Perum Graha Indah Blok C2/14, Yogyakarta",
    },
    {
      customer_name: "Fajar Nugroho",
      customer_type: CustomerType.B2C,
      default_phone: "0856-4120-5531",
      default_address: "Jl. Diponegoro No. 55, Semarang",
    },
  ];

  const customerMap = new Map<string, number>();
  for (const c of customerDefs) {
    const existing = await prisma.customer.findFirst({
      where: { customer_name: c.customer_name },
    });
    const saved = existing ?? (await prisma.customer.create({ data: c }));
    customerMap.set(c.customer_name, saved.customer_id);
  }

  // 9. Seed Transaksi Contoh (hanya jika belum ada order agar idempoten)
  const existingOrderCount = await prisma.order.count();
  if (existingOrderCount === 0) {
    const ownerId = userMap.get("owner")!;
    const managerId = userMap.get("manager")!;
    const pegawaiId = userMap.get("pegawai")!;
    const pklId = userMap.get("pkl")!;
    const sup1Id = supplierMap.get("CV Sumber Bahan Nusantara")!;

    // Order 1: B2B Dikirim (DP + Pelunasan Lunas + PO Supplier Selesai + Biaya tercatat)
    const ord1 = await prisma.order.create({
      data: {
        order_number: "ORD-202611-0001",
        customer_id: customerMap.get("PT Mitra Kuliner Nusantara")!,
        created_by: pegawaiId,
        order_date: new Date("2026-11-04T09:10:00+07:00"),
        order_channel: OrderChannel.PO_Besar,
        payment_scheme: PaymentScheme.DP_50,
        recipient_name: "Gudang Penerimaan PT Mitra",
        recipient_phone: "021-5501-9920",
        shipping_address: "Kawasan Pergudangan Cikarang Blok B4, Bekasi",
        shipping_cost: "250000.00",
        total_amount: "8250000.00",
        quarantine_doc_number: "KRN-2026-11-009",
        tracking_number: "JNE-CARGO-882910",
        order_status: OrderStatus.Dikirim,
        items: {
          create: [
            {
              product_id: productMap.get("KLR-004")!,
              qty: 50,
              unit_price_snapshot: "165000.00",
              subtotal: "8250000.00",
            },
          ],
        },
        status_logs: {
          create: [
            {
              from_status: null,
              to_status: OrderStatus.Menunggu_Pembayaran,
              changed_by: pegawaiId,
              note: "PO B2B dibuat; Invoice DP 50% terbit otomatis.",
            },
            {
              from_status: OrderStatus.Menunggu_Pembayaran,
              to_status: OrderStatus.DP_Lunas,
              changed_by: managerId,
              note: "DP 50% diverifikasi via transfer BCA.",
            },
            {
              from_status: OrderStatus.Siap_Kirim,
              to_status: OrderStatus.Dikirim,
              changed_by: pegawaiId,
              note: "Pelunasan lunas, resi JNE-CARGO-882910 diinput.",
            },
          ],
        },
      },
    });

    const po1 = await prisma.purchaseOrder.create({
      data: {
        po_number: "PO-202611-0001",
        order_id: ord1.order_id,
        supplier_id: sup1Id,
        created_by: managerId,
        po_date: new Date("2026-11-05T11:00:00+07:00"),
        total_cost: "2080000.00",
        po_status: PoStatus.Selesai,
        items: {
          create: [
            {
              material_id: materialMap.get("Bahan Baku Utama A")!,
              qty_ordered: "40.0000",
              unit: "kg",
              package_cost: "45000.00",
              subtotal_cost: "1800000.00",
            },
            {
              material_id: materialMap.get("Pemanis / Campuran Alami")!,
              qty_ordered: "10.0000",
              unit: "kg",
              package_cost: "28000.00",
              subtotal_cost: "280000.00",
            },
          ],
        },
      },
    });

    await prisma.invoice.create({
      data: {
        invoice_number: "INV-202611-0001",
        order_id: ord1.order_id,
        invoice_type: InvoiceType.DP_50,
        issued_date: new Date("2026-11-04T09:10:00+07:00"),
        total_billed: "4125000.00",
        shipping_cost_billed: "0.00",
        payment_status: PaymentStatus.DP_Terbayar,
        payments: {
          create: {
            verified_by: managerId,
            payment_date: new Date("2026-11-05T10:30:00+07:00"),
            term_type: PaymentTermType.DP_50,
            amount_paid: "4125000.00",
            payment_method: "Transfer BCA",
            proof_note: "Transfer BCA a/n PT Mitra Kuliner",
          },
        },
      },
    });

    await prisma.invoice.create({
      data: {
        invoice_number: "INV-202611-0002",
        order_id: ord1.order_id,
        invoice_type: InvoiceType.PELUNASAN,
        issued_date: new Date("2026-11-15T10:00:00+07:00"),
        total_billed: "4375000.00",
        shipping_cost_billed: "250000.00",
        payment_status: PaymentStatus.Lunas,
        payments: {
          create: {
            verified_by: ownerId,
            payment_date: new Date("2026-11-16T10:00:00+07:00"),
            term_type: PaymentTermType.Pelunasan,
            amount_paid: "4375000.00",
            payment_method: "Transfer BCA",
            proof_note: "Pelunasan + ongkir kargo",
          },
        },
      },
    });

    // Order 2: B2B Siap_Kirim (menunggu pelunasan untuk uji guard pengiriman)
    const ord2 = await prisma.order.create({
      data: {
        order_number: "ORD-202611-0002",
        customer_id: customerMap.get("CV Sehat Alami Distribusi")!,
        created_by: pklId,
        order_date: new Date("2026-11-12T11:00:00+07:00"),
        order_channel: OrderChannel.PO_Besar,
        payment_scheme: PaymentScheme.DP_50,
        recipient_name: "Divisi Logistik CV Sehat",
        recipient_phone: "031-8421-3310",
        shipping_address: "Jl. Rungkut Industri III No. 11, Surabaya",
        shipping_cost: "180000.00",
        total_amount: "4950000.00",
        quarantine_doc_number: "KRN-2026-11-014",
        order_status: OrderStatus.Siap_Kirim,
        items: {
          create: [
            {
              product_id: productMap.get("KLR-004")!,
              qty: 30,
              unit_price_snapshot: "165000.00",
              subtotal: "4950000.00",
            },
          ],
        },
        status_logs: {
          create: [
            {
              from_status: null,
              to_status: OrderStatus.Menunggu_Pembayaran,
              changed_by: pklId,
              note: "PO B2B masuk dari CV Sehat Alami.",
            },
            {
              from_status: OrderStatus.Karantina,
              to_status: OrderStatus.Siap_Kirim,
              changed_by: pegawaiId,
              note: "Karantina lulus, ongkir Rp 180.000 diinput.",
            },
          ],
        },
      },
    });

    await prisma.invoice.createMany({
      data: [
        {
          invoice_number: "INV-202611-0003",
          order_id: ord2.order_id,
          invoice_type: InvoiceType.DP_50,
          issued_date: new Date("2026-11-12T11:00:00+07:00"),
          total_billed: "2475000.00",
          shipping_cost_billed: "0.00",
          payment_status: PaymentStatus.DP_Terbayar,
        },
        {
          invoice_number: "INV-202611-0004",
          order_id: ord2.order_id,
          invoice_type: InvoiceType.PELUNASAN,
          issued_date: new Date("2026-11-21T16:00:00+07:00"),
          total_billed: "2655000.00",
          shipping_cost_billed: "180000.00",
          payment_status: PaymentStatus.Belum_Bayar,
        },
      ],
    });

    // Order 3: B2C Online (Packing, bayar penuh Lunas)
    const ord3 = await prisma.order.create({
      data: {
        order_number: "ORD-202611-0003",
        customer_id: customerMap.get("Nadia Putri Rahma")!,
        created_by: pklId,
        order_date: new Date("2026-11-22T15:05:00+07:00"),
        order_channel: OrderChannel.Online,
        payment_scheme: PaymentScheme.FULL,
        recipient_name: "Nadia Putri Rahma",
        recipient_phone: "0812-7741-8890",
        shipping_address: "Perum Graha Indah Blok C2/14, Yogyakarta",
        shipping_cost: "24000.00",
        total_amount: "226000.00",
        order_status: OrderStatus.Packing,
        items: {
          create: [
            {
              product_id: productMap.get("KLR-001")!,
              qty: 2,
              unit_price_snapshot: "48000.00",
              subtotal: "96000.00",
            },
            {
              product_id: productMap.get("KLR-003")!,
              qty: 2,
              unit_price_snapshot: "65000.00",
              subtotal: "130000.00",
            },
          ],
        },
      },
    });

    await prisma.invoice.create({
      data: {
        invoice_number: "INV-202611-0005",
        order_id: ord3.order_id,
        invoice_type: InvoiceType.FULL,
        issued_date: new Date("2026-11-22T15:05:00+07:00"),
        total_billed: "250000.00",
        shipping_cost_billed: "24000.00",
        payment_status: PaymentStatus.Lunas,
        payments: {
          create: {
            verified_by: pegawaiId,
            payment_date: new Date("2026-11-23T09:00:00+07:00"),
            term_type: PaymentTermType.Bayar_Penuh,
            amount_paid: "250000.00",
            payment_method: "QRIS",
            proof_note: "QRIS Keloria Store",
          },
        },
      },
    });

    // Seed Expenses
    await prisma.expense.createMany({
      data: [
        {
          po_id: po1.po_id,
          recorded_by: managerId,
          expense_date: new Date("2026-11-07T14:00:00+07:00"),
          category: ExpenseCategory.Pembelian_Supplier,
          description: "Penerimaan bahan baku PO-202611-0001 (CV Sumber Bahan Nusantara)",
          amount: "2080000.00",
        },
        {
          recorded_by: pegawaiId,
          expense_date: new Date("2026-11-16T15:00:00+07:00"),
          category: ExpenseCategory.Ongkir,
          description: "Pengiriman kargo ORD-202611-0001 ke Bekasi",
          amount: "250000.00",
        },
        {
          recorded_by: ownerId,
          expense_date: new Date("2026-11-20T10:00:00+07:00"),
          category: ExpenseCategory.Operasional,
          description: "Listrik & gas rumah produksi bulan November",
          amount: "640000.00",
        },
      ],
    });

    // Seed Payrolls
    await prisma.payroll.createMany({
      data: [
        {
          user_id: managerId,
          recorded_by: ownerId,
          payment_date: new Date("2026-11-01T09:00:00+07:00"),
          payment_type: PayrollPaymentType.Gaji_Bulanan,
          gross_amount: "4800000.00",
          kasbon_deduction: "0.00",
          net_amount: "4800000.00",
          period_label: "Okt 2026",
          notes: "Gaji bulanan reguler",
        },
        {
          user_id: pegawaiId,
          recorded_by: ownerId,
          payment_date: new Date("2026-11-14T16:00:00+07:00"),
          payment_type: PayrollPaymentType.Upah_Mingguan,
          gross_amount: "800000.00",
          kasbon_deduction: "150000.00",
          net_amount: "650000.00",
          period_label: "Minggu 2 Nov 2026",
          notes: "Potong kasbon awal bulan",
        },
        {
          user_id: pklId,
          recorded_by: ownerId,
          payment_date: new Date("2026-11-14T16:05:00+07:00"),
          payment_type: PayrollPaymentType.Upah_Mingguan,
          gross_amount: "225000.00",
          kasbon_deduction: "0.00",
          net_amount: "225000.00",
          period_label: "Minggu 2 Nov 2026",
          notes: "Uang saku & transport PKL",
        },
      ],
    });

    // Sinkronkan document_sequences agar nomor berikutnya tidak bentrok
    await prisma.documentSequence.upsert({
      where: { seq_key: "ORD-202611" },
      update: { last_number: 3 },
      create: { seq_key: "ORD-202611", last_number: 3 },
    });
    await prisma.documentSequence.upsert({
      where: { seq_key: "INV-202611" },
      update: { last_number: 5 },
      create: { seq_key: "INV-202611", last_number: 5 },
    });
    await prisma.documentSequence.upsert({
      where: { seq_key: "PO-202611" },
      update: { last_number: 1 },
      create: { seq_key: "PO-202611", last_number: 1 },
    });
  }

  console.log("Seed Kelo-ERP selesai.");
}

main()
  .catch((err) => {
    console.error("Gagal menjalankan seed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
