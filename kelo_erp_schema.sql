-- ============================================================================
-- DATABASE SCHEMA: KELO-ERP (PT KELORIA MORINGA JAYA)
-- Arsitektur: Hybrid RBAC + Custom User Permission Override (17 Tabel)
-- ============================================================================

CREATE DATABASE IF NOT EXISTS kelo_erp
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE kelo_erp;

-- ============================================================================
-- 1. MODUL MANAJEMEN AKSES & SDM (HR & PAYROLL)
-- ============================================================================

CREATE TABLE employees (
    employee_id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NULL,
    employment_type ENUM('Tetap', 'PKL') NOT NULL,
    pay_scheme ENUM('Bulanan', 'Mingguan') NOT NULL,
    base_salary DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status ENUM('Aktif', 'Nonaktif') NOT NULL DEFAULT 'Aktif',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE roles (
    role_id INT PRIMARY KEY AUTO_INCREMENT,
    role_name VARCHAR(50) UNIQUE NOT NULL, -- Owner, Manager/SDM, Pegawai, Anak PKL
    description VARCHAR(255) NULL
) ENGINE=InnoDB;

CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT UNIQUE NOT NULL,
    role_id INT NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE modules (
    module_id INT PRIMARY KEY AUTO_INCREMENT,
    module_code VARCHAR(20) UNIQUE NOT NULL, -- SALES, SCM, FINANCE, HR
    module_name VARCHAR(100) NOT NULL
) ENGINE=InnoDB;

-- Hak akses default berdasarkan jabatan/role
CREATE TABLE role_permissions (
    role_permission_id INT PRIMARY KEY AUTO_INCREMENT,
    role_id INT NOT NULL,
    module_id INT NOT NULL,
    can_view BOOLEAN NOT NULL DEFAULT FALSE,
    can_create BOOLEAN NOT NULL DEFAULT FALSE,
    can_edit BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE KEY uq_role_module (role_id, module_id),
    CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(role_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_rp_module FOREIGN KEY (module_id) REFERENCES modules(module_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- Hak akses khusus per individu (Grant/Revoke override di luar role default)
CREATE TABLE user_permissions (
    permission_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    module_id INT NOT NULL,
    can_view BOOLEAN NOT NULL DEFAULT FALSE,
    can_create BOOLEAN NOT NULL DEFAULT FALSE,
    can_edit BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE KEY uq_user_module (user_id, module_id),
    CONSTRAINT fk_up_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_up_module FOREIGN KEY (module_id) REFERENCES modules(module_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE payrolls (
    payroll_id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    recorded_by INT NOT NULL,
    payment_date DATE NOT NULL,
    payment_type ENUM('Gaji Bulanan', 'Upah Mingguan', 'Kasbon') NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_payrolls_employee FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_payrolls_recorded_by FOREIGN KEY (recorded_by) REFERENCES users(user_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 2. MODUL PEMASARAN & PENJUALAN (SALES & ORDER)
-- ============================================================================

CREATE TABLE customers (
    customer_id INT PRIMARY KEY AUTO_INCREMENT,
    customer_name VARCHAR(100) NOT NULL,
    customer_type ENUM('Retail', 'Mitra/B2B') NOT NULL DEFAULT 'Retail',
    default_phone VARCHAR(20) NULL,
    default_address TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE products (
    product_id INT PRIMARY KEY AUTO_INCREMENT,
    sku_code VARCHAR(30) UNIQUE NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    variant_size VARCHAR(50) NULL, -- Contoh: 200g, 35g, 100ml, 10ml
    unit_price DECIMAL(12,2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE orders (
    order_id INT PRIMARY KEY AUTO_INCREMENT,
    order_number VARCHAR(30) UNIQUE NOT NULL,
    customer_id INT NOT NULL,
    created_by INT NOT NULL,
    order_date DATETIME NOT NULL,
    order_channel ENUM('Online', 'PO Besar') NOT NULL,
    payment_scheme ENUM('DP_50', 'FULL') NOT NULL,
    recipient_name VARCHAR(100) NOT NULL,
    recipient_phone VARCHAR(20) NOT NULL,
    shipping_address TEXT NOT NULL,
    shipping_cost DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL,
    tracking_number VARCHAR(50) NULL,
    order_status ENUM(
        'Menunggu Pembayaran',
        'Order Supplier',
        'Produksi & Kemas',
        'Dikirim',
        'Selesai'
    ) NOT NULL DEFAULT 'Menunggu Pembayaran',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(customer_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_orders_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE order_items (
    order_item_id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    product_id INT NOT NULL,
    qty INT NOT NULL,
    unit_price_snapshot DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    CONSTRAINT fk_oi_order FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_oi_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 3. MODUL RANTAI PASOK (SCM / PROCUREMENT)
-- ============================================================================

CREATE TABLE suppliers (
    supplier_id INT PRIMARY KEY AUTO_INCREMENT,
    supplier_name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100) NULL,
    phone VARCHAR(20) NULL,
    address TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE purchase_orders (
    po_id INT PRIMARY KEY AUTO_INCREMENT,
    po_number VARCHAR(30) UNIQUE NOT NULL,
    order_id INT NOT NULL,
    supplier_id INT NOT NULL,
    created_by INT NOT NULL,
    po_date DATE NOT NULL,
    total_cost DECIMAL(12,2) NOT NULL,
    po_status ENUM('Dipesan', 'Diterima') NOT NULL DEFAULT 'Dipesan',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_po_order FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_po_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_po_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE purchase_order_items (
    po_item_id INT PRIMARY KEY AUTO_INCREMENT,
    po_id INT NOT NULL,
    product_id INT NOT NULL,
    qty_ordered INT NOT NULL,
    package_cost DECIMAL(12,2) NOT NULL,
    subtotal_cost DECIMAL(12,2) NOT NULL,
    CONSTRAINT fk_poi_po FOREIGN KEY (po_id) REFERENCES purchase_orders(po_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_poi_product FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 4. MODUL KEUANGAN & AKUNTANSI (FINANCE & INVOICING)
-- ============================================================================

CREATE TABLE invoices (
    invoice_id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_number VARCHAR(30) UNIQUE NOT NULL,
    order_id INT UNIQUE NOT NULL,
    issued_date DATE NOT NULL,
    total_billed DECIMAL(12,2) NOT NULL,
    payment_status ENUM('Belum Bayar', 'DP Lunas', 'Lunas') NOT NULL DEFAULT 'Belum Bayar',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_invoices_order FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE invoice_payments (
    payment_id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_id INT NOT NULL,
    verified_by INT NOT NULL,
    payment_date DATETIME NOT NULL,
    term_type ENUM('DP 50%', 'Pelunasan', 'Bayar Penuh') NOT NULL,
    amount_paid DECIMAL(12,2) NOT NULL,
    payment_method VARCHAR(50) NULL,
    proof_note VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ip_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_ip_verified_by FOREIGN KEY (verified_by) REFERENCES users(user_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE expenses (
    expense_id INT PRIMARY KEY AUTO_INCREMENT,
    po_id INT NULL,
    recorded_by INT NOT NULL,
    expense_date DATE NOT NULL,
    category ENUM('Pembelian Supplier', 'Ongkir', 'Kemasan', 'Operasional Lain') NOT NULL,
    description VARCHAR(255) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_expenses_po FOREIGN KEY (po_id) REFERENCES purchase_orders(po_id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_expenses_recorded_by FOREIGN KEY (recorded_by) REFERENCES users(user_id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

-- ============================================================================
-- 5. SEEDER DATA AWAL (ROLES, MODULES, DEFAULT ROLE PERMISSIONS & KATALOG)
-- ============================================================================

INSERT INTO roles (role_id, role_name, description) VALUES
(1, 'Owner', 'Pemilik usaha dengan akses penuh seluruh sistem dan laporan'),
(2, 'Manager/SDM', 'Pengelola SDM, penggajian, serta pemantau operasional & keuangan'),
(3, 'Pegawai', 'Staf operasional lintas fungsi (Sales, SCM, input Finance)'),
(4, 'Anak PKL', 'Peserta magang operasional harian (Sales & SCM)');

INSERT INTO modules (module_id, module_code, module_name) VALUES
(1, 'SALES', 'Pemasaran & Penjualan'),
(2, 'SCM', 'Manajemen Rantai Pasok'),
(3, 'FINANCE', 'Keuangan & Akuntansi'),
(4, 'HR', 'Manajemen SDM & Penggajian');

-- Default Role Permissions
INSERT INTO role_permissions (role_id, module_id, can_view, can_create, can_edit, can_delete) VALUES
-- Owner: Full Access
(1, 1, 1, 1, 1, 1),
(1, 2, 1, 1, 1, 1),
(1, 3, 1, 1, 1, 1),
(1, 4, 1, 1, 1, 1),
-- Manager/SDM: Full HR, View/Create/Edit Sales, SCM, Finance
(2, 1, 1, 1, 1, 0),
(2, 2, 1, 1, 1, 0),
(2, 3, 1, 1, 1, 0),
(2, 4, 1, 1, 1, 1),
-- Pegawai: Sales & SCM penuh (tanpa delete), Finance input/view
(3, 1, 1, 1, 1, 0),
(3, 2, 1, 1, 1, 0),
(3, 3, 1, 1, 0, 0),
(3, 4, 0, 0, 0, 0),
-- Anak PKL: Sales & SCM operasional harian
(4, 1, 1, 1, 1, 0),
(4, 2, 1, 1, 1, 0),
(4, 3, 0, 0, 0, 0),
(4, 4, 0, 0, 0, 0);

-- Katalog Produk Awal PT Keloria Moringa Jaya
INSERT INTO products (sku_code, product_name, variant_size, unit_price, is_active) VALUES
('KLR-MF-200', 'MoriFlour (Tepung Daun Kelor)', '200g', 160000.00, 1),
('KLR-MF-035', 'MoriFlour (Tepung Daun Kelor)', '35g', 40000.00, 1),
('KLR-MC-500', 'MoriCaps (Kapsul Daun Kelor)', '500g', 100000.00, 1),
('KLR-MT-020', 'MoriTabs (Tablet Daun Kelor)', '20g', 50000.00, 1),
('KLR-MTE-020', 'MoriTea (Teh Daun Kelor)', '20g', 40000.00, 1),
('KLR-CK-GF', 'MoriFoodiy Cookies Gluten Free', '100g', 25000.00, 1),
('KLR-CK-REG', 'MoriFoodiy Cookies Regular', '100g', 20000.00, 1),
('KLR-CHC-100', 'MoriFoodiy Moringa Chocolate', '100g', 30000.00, 1),
('KLR-BTP-024', 'Batak Pepper Minuman Rempah', '24g', 30000.00, 1),
('KLR-COF-BOX', 'Andaliman Coffee Box', '100g', 90000.00, 1),
('KLR-COF-CUP', 'Andaliman Coffee Cup', '20g', 20000.00, 1),
('KLR-AMD-200', 'Amodent Gargle Cairan Kumur', '200ml', 55000.00, 1),
('KLR-AMD-100', 'Amodent Gargle Kemasan', '100g', 25000.00, 1),
('KLR-MSO-010', 'Moringa Seed Oil', '10ml', 100000.00, 1),
('KLR-MSO-020', 'Moringa Seed Oil', '20ml', 180000.00, 1),
('KLR-MSO-1KG', 'Moringa Seed Oil', '1000g', 2000000.00, 1);
