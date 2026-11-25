import bcrypt from "bcryptjs";
import {
  EmploymentType,
  PayScheme,
  PrismaClient,
  UserStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Seed master data awal Kelo-ERP (idempoten, aman dijalankan ulang).
 * Mencakup: Roles, Modules, RolePermissions (RBAC), 4 Akun, dan 16 Produk Keloria.
 */
async function main() {
  console.log("Memulai seed master data Kelo-ERP...");

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

  // 4. Seed 4 Akun Pengguna
  const userDefs = [
    {
      username: "owner",
      full_name: "Ibu Syahrani Devi",
      phone: "0812-3400-1001",
      role: "Owner",
      employment_type: EmploymentType.Tetap,
      pay_scheme: PayScheme.Bulanan,
      base_salary: "0.00",
      passwordPlain: "owner123",
    },
    {
      username: "manager",
      full_name: "Kaesang Pangarep",
      phone: "0812-3400-1002",
      role: "Manager/SDM",
      employment_type: EmploymentType.Tetap,
      pay_scheme: PayScheme.Bulanan,
      base_salary: "4800000.00",
      passwordPlain: "manager123",
    },
    {
      username: "pegawai",
      full_name: "Mayadi Alamsyah",
      phone: "0813-5500-2003",
      role: "Pegawai",
      employment_type: EmploymentType.Tetap,
      pay_scheme: PayScheme.Mingguan,
      base_salary: "3200000.00",
      passwordPlain: "pegawai123",
    },
    {
      username: "pkl",
      full_name: "Ferdyan Darwis",
      phone: "0857-9900-3004",
      role: "Anak PKL",
      employment_type: EmploymentType.PKL,
      pay_scheme: PayScheme.Mingguan,
      base_salary: "0.00",
      passwordPlain: "magangpkl123",
    },
  ];

  for (const u of userDefs) {
    const password_hash = await bcrypt.hash(u.passwordPlain, 10);
    await prisma.user.upsert({
      where: { username: u.username },
      update: {
        full_name: u.full_name,
        phone: u.phone,
        role_id: roleMap.get(u.role)!,
        employment_type: u.employment_type,
        pay_scheme: u.pay_scheme,
        base_salary: u.base_salary,
        password_hash,
        status: UserStatus.Aktif,
      },
      create: {
        username: u.username,
        full_name: u.full_name,
        phone: u.phone,
        role_id: roleMap.get(u.role)!,
        employment_type: u.employment_type,
        pay_scheme: u.pay_scheme,
        base_salary: u.base_salary,
        password_hash,
        status: UserStatus.Aktif,
      },
    });
  }

  // 5. Seed 16 Produk Asli PT Keloria Moringa Jaya (sesuai Katalog PDF 2025)
  const productDefs = [
    {
      sku_code: "KLR-MF-200",
      product_name: "MoriFlour (Tepung Daun Kelor)",
      variant_size: "200g",
      category: "Tepung & Suplemen",
      unit: "pcs",
      unit_price: "160000.00",
    },
    {
      sku_code: "KLR-MF-035",
      product_name: "MoriFlour (Tepung Daun Kelor)",
      variant_size: "35g",
      category: "Tepung & Suplemen",
      unit: "pcs",
      unit_price: "40000.00",
    },
    {
      sku_code: "KLR-MC-500",
      product_name: "MoriCaps (Kapsul Daun Kelor)",
      variant_size: "500g",
      category: "Tepung & Suplemen",
      unit: "pcs",
      unit_price: "100000.00",
    },
    {
      sku_code: "KLR-MT-020",
      product_name: "MoriTabs (Tablet Daun Kelor)",
      variant_size: "20g",
      category: "Tepung & Suplemen",
      unit: "pcs",
      unit_price: "50000.00",
    },
    {
      sku_code: "KLR-MTE-020",
      product_name: "MoriTea (Teh Daun Kelor)",
      variant_size: "20g",
      category: "Minuman Herbal",
      unit: "box",
      unit_price: "40000.00",
    },
    {
      sku_code: "KLR-CK-GF",
      product_name: "MoriFoodiy Cookies Gluten Free",
      variant_size: "100g",
      category: "Makanan & Camilan",
      unit: "box",
      unit_price: "25000.00",
    },
    {
      sku_code: "KLR-CK-REG",
      product_name: "MoriFoodiy Cookies Regular",
      variant_size: "100g",
      category: "Makanan & Camilan",
      unit: "box",
      unit_price: "20000.00",
    },
    {
      sku_code: "KLR-CHC-100",
      product_name: "Moringa Chocolate",
      variant_size: "100g",
      category: "Makanan & Camilan",
      unit: "pcs",
      unit_price: "30000.00",
    },
    {
      sku_code: "KLR-BTP-024",
      product_name: "Batak Pepper Minuman Rempah",
      variant_size: "24g",
      category: "Minuman Herbal",
      unit: "box",
      unit_price: "30000.00",
    },
    {
      sku_code: "KLR-COF-BOX",
      product_name: "Andaliman Coffee Box",
      variant_size: "20g",
      category: "Minuman Herbal",
      unit: "box",
      unit_price: "90000.00",
    },
    {
      sku_code: "KLR-COF-CUP",
      product_name: "Andaliman Coffee Cup",
      variant_size: "20g",
      category: "Minuman Herbal",
      unit: "cup",
      unit_price: "20000.00",
    },
    {
      sku_code: "KLR-AMD-200",
      product_name: "Amodent Gargle Cairan Kumur",
      variant_size: "200ml",
      category: "Perawatan & Minyak",
      unit: "botol",
      unit_price: "55000.00",
    },
    {
      sku_code: "KLR-AMD-100",
      product_name: "Amodent Gargle Kemasan",
      variant_size: "100g",
      category: "Perawatan & Minyak",
      unit: "botol",
      unit_price: "25000.00",
    },
    {
      sku_code: "KLR-MSO-010",
      product_name: "Moringa Seed Oil",
      variant_size: "10ml",
      category: "Perawatan & Minyak",
      unit: "botol",
      unit_price: "100000.00",
    },
    {
      sku_code: "KLR-MSO-020",
      product_name: "Moringa Seed Oil",
      variant_size: "20ml",
      category: "Perawatan & Minyak",
      unit: "botol",
      unit_price: "180000.00",
    },
    {
      sku_code: "KLR-MSO-1KG",
      product_name: "Moringa Seed Oil",
      variant_size: "1000g",
      category: "Perawatan & Minyak",
      unit: "botol",
      unit_price: "2000000.00",
    },
  ];

  for (const p of productDefs) {
    await prisma.product.upsert({
      where: { sku_code: p.sku_code },
      update: {
        product_name: p.product_name,
        variant_size: p.variant_size,
        category: p.category,
        unit: p.unit,
        unit_price: p.unit_price,
        is_active: true,
      },
      create: {
        sku_code: p.sku_code,
        product_name: p.product_name,
        variant_size: p.variant_size,
        category: p.category,
        unit: p.unit,
        unit_price: p.unit_price,
        stock_online: 0,
        min_stock_threshold: 5,
        is_active: true,
      },
    });
  }

  console.log("Seed master data Kelo-ERP selesai.");
}

main()
  .catch((err) => {
    console.error("Gagal menjalankan seed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
