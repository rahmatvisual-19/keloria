# Dokumentasi REST API — Kelo-ERP (`/api/v1`)

Seluruh endpoint berada di bawah prefix `/api/v1`.

## Konvensi Umum

- **Format respons seragam:**
  ```json
  {
    "success": true,
    "data": {},
    "message": "Berhasil",
    "errors": { "field": ["Pesan validasi"] }
  }
  ```
- **Autentikasi:** JWT HS256 disimpan di cookie `httpOnly` (`kelo_session`). Frontend wajib mengirim `credentials: "include"`.
- **Proteksi CSRF:** Semua method mutasi (`POST`, `PUT`, `PATCH`, `DELETE`) memverifikasi header `Origin` terhadap `CLIENT_ORIGIN`.
- **Nilai uang:** Dikirim sebagai string desimal 2 angka belakang koma (contoh: `"1250000.00"`).
- **Kode Status HTTP:** `200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `422 Validation Error`, `429 Too Many Requests`, `500 Internal Server Error`.

---

## 1. Kesehatan Sistem & Autentikasi

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| `GET` | `/api/v1/health` | Publik | Status layanan, versi, timestamp UTC & WIB |
| `POST` | `/api/v1/auth/login` | Publik (rate-limit 5/menit/IP) | Login `{ username, password }`, set cookie JWT, catat `session_logs` |
| `POST` | `/api/v1/auth/logout` | Publik/Auth | Tutup sesi aktif di `session_logs` & hapus cookie |
| `GET` | `/api/v1/auth/me` | Login Aktif | Profil user (tanpa `password_hash`) + matriks izin RBAC |

## 2. Manajemen Pengguna & Hak Akses *(Owner-only)*

| Method | Endpoint | Akses | Keterangan |
|---|---|---|---|
| `GET` | `/api/v1/users` | `Owner` | Daftar user (paginasi, filter `role_id`, `status`, `search`) |
| `POST` | `/api/v1/users` | `Owner` | Tambah user baru (validasi `Anak PKL → employment_type = PKL`) |
| `GET` | `/api/v1/users/:id` | `Owner` | Detail user |
| `PATCH` | `/api/v1/users/:id` | `Owner` | Ubah data user / aktif-nonaktifkan (soft-delete memutus sesi aktif) |
| `POST` | `/api/v1/users/:id/reset-password` | `Owner` | Reset password (bcrypt cost 10) & paksa login ulang |
| `GET` | `/api/v1/roles/permissions` | `Owner` | Ambil matriks `role_permissions` (4 role × 4 modul) |
| `PATCH` | `/api/v1/roles/permissions` | `Owner` | Ubah izin role non-Owner & invalidasi cache RBAC |

## 3. Sales & Marketing

| Method | Endpoint | Izin / Guard | Keterangan |
|---|---|---|---|
| `GET` | `/api/v1/sales/products` | `SALES.view` | Daftar produk + BOM (filter `category`, `is_active`, `low_stock_only`) |
| `POST` | `/api/v1/sales/products` | `SALES.create` | Tambah produk beserta komposisi BOM |
| `GET` | `/api/v1/sales/products/:id` | `SALES.view` | Detail produk + BOM |
| `PATCH` | `/api/v1/sales/products/:id` | `SALES.edit` | Perbarui produk & sinkronisasi BOM |
| `DELETE` | `/api/v1/sales/products/:id` | `SALES.delete` | Nonaktifkan produk (soft-delete) |
| `GET` | `/api/v1/sales/customers` | `SALES.view` | Daftar pelanggan B2B/B2C |
| `POST` | `/api/v1/sales/customers` | `SALES.create` | Tambah pelanggan baru |
| `GET` | `/api/v1/sales/customers/:id` | `SALES.view` | Detail pelanggan + riwayat order |
| `PATCH` | `/api/v1/sales/customers/:id` | `SALES.edit` | Perbarui pelanggan |
| `DELETE` | `/api/v1/sales/customers/:id` | `SALES.delete` | Nonaktifkan pelanggan (soft-delete) |
| `GET` | `/api/v1/sales/orders` | `SALES.view` | Daftar order (filter kanal, status, tanggal, pelanggan, cari) |
| `POST` | `/api/v1/sales/orders` | `SALES.create` | Buat order B2B (otomatis Invoice DP 50%) atau B2C (potong stok atomik + Invoice FULL) |
| `GET` | `/api/v1/sales/orders/:id` | `SALES.view` | Detail order + items + `order_status_logs` + invoices + PO supplier |
| `POST` | `/api/v1/sales/orders/:id/cancel` | `SALES.edit` | Batalkan order (hanya sebelum `Dikirim`; kembalikan stok jika B2C) |
| `GET` | `/api/v1/sales/dashboard` | `Owner` | Perbandingan omzet & transaksi B2B vs B2C per bulan (`?months=6`) |

## 4. Supply Chain Management (SCM)

| Method | Endpoint | Izin / Guard | Keterangan |
|---|---|---|---|
| `GET` / `POST` | `/api/v1/scm/materials` | `SCM.view` / `SCM.create` | Daftar & tambah bahan baku |
| `PATCH` / `DELETE` | `/api/v1/scm/materials/:id` | `SCM.edit` / `SCM.delete` | Edit & nonaktifkan bahan baku |
| `GET` / `POST` | `/api/v1/scm/suppliers` | `SCM.view` / `SCM.create` | Daftar & tambah supplier |
| `PATCH` / `DELETE` | `/api/v1/scm/suppliers/:id` | `SCM.edit` / `SCM.delete` | Edit & nonaktifkan supplier |
| `GET` | `/api/v1/scm/orders/:id/bom` | `SCM.view` | Kalkulator kebutuhan bahan baku per order (khusus B2B DP terverifikasi) |
| `PATCH` | `/api/v1/scm/orders/:id/status` | `SCM.edit` | Transisi status berurutan (input karantina/ongkir/resi, otomatis terbit Invoice Pelunasan di `Siap_Kirim`, blokir `Dikirim` bila belum Lunas) |
| `GET` / `POST` | `/api/v1/scm/purchase-orders` | `SCM.view` / `SCM.create` | Daftar & buat PO supplier (`PO-YYYYMM-XXXX`) |
| `PATCH` | `/api/v1/scm/purchase-orders/:id/status` | `SCM.edit` | Majukan status `Dipesan → Diterima → Selesai` (`Diterima` otomatis catat biaya supplier idempoten) |
| `GET` | `/api/v1/scm/purchase-orders/:id/pdf` | `SCM.view` | Cetak/unduh PDF PO Supplier |
| `GET` | `/api/v1/scm/stock-alerts` | `SCM.view` | Daftar produk dengan `stock_online <= min_stock_threshold` |
| `POST` | `/api/v1/scm/stock-preparation` | `SCM.edit` | Tambah `stock_online` hasil persiapan produk |

## 5. Finance & Accounting + Laporan

| Method | Endpoint | Izin / Guard | Keterangan |
|---|---|---|---|
| `GET` | `/api/v1/finance/invoices` | `FINANCE.view` | Daftar invoice beserta status & sisa tagihan |
| `GET` | `/api/v1/finance/invoices/:id/pdf` | `FINANCE.view` | Unduh PDF Invoice resmi UMKM Keloria |
| `POST` | `/api/v1/finance/invoices/:id/verify` | `FINANCE.edit` | Verifikasi pembayaran (`multipart/form-data` untuk `proof_file` ≤ 2 MB `.jpg/.jpeg/.png/.pdf`, atau JSON). Anak PKL mendapat **403**. |
| `GET` | `/api/v1/finance/payments/:id/proof` | `FINANCE.view` | Unduh bukti bayar terautentikasi |
| `GET` / `POST` | `/api/v1/finance/expenses` | `FINANCE.view` / `FINANCE.create` | Daftar & catat biaya operasional |
| `PATCH` / `DELETE` | `/api/v1/finance/expenses/:id` | `FINANCE.edit` / `FINANCE.delete` | Ubah & hapus biaya |
| `GET` | `/api/v1/finance/cashflow` | `FINANCE.view` | Ringkasan arus kas & daftar piutang beserta umur tagihan (hari) |
| `GET` | `/api/v1/reports/financial` | `Owner` | Laporan keuangan bulanan (`?month=YYYY-MM&format=json\|pdf\|excel`) |

## 6. Human Resources (HR)

| Method | Endpoint | Izin / Guard | Keterangan |
|---|---|---|---|
| `GET` | `/api/v1/hr/employees` | `HR.view` | Data pekerja (`base_salary` disembunyikan otomatis bagi non-Owner; Pegawai & Anak PKL **403**) |
| `PATCH` | `/api/v1/hr/employees/:id` | `HR.edit` | Edit field non-sensitif (`full_name`, `phone`, `employment_type`, `pay_scheme`) |
| `GET` / `POST` | `/api/v1/hr/payrolls` | `Owner` | Riwayat & input payroll (`net_amount = gross_amount - kasbon_deduction`) |
| `DELETE` | `/api/v1/hr/payrolls/:id` | `Owner` | Hapus catatan payroll |
