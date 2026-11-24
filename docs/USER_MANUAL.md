# Panduan Pengguna (User Manual) — Kelo-ERP UMKM Keloria

Panduan singkat pengoperasian **Kelo-ERP** untuk seluruh tim UMKM Keloria (**Owner**, **Manager/SDM**, **Pegawai**, dan **Anak PKL**).

---

## 1. Masuk ke Sistem & Akun Awal

1. Buka aplikasi Kelo-ERP di peramban laptop/desktop (Chrome, Edge, atau Firefox terbaru).
2. Masukkan **Username** dan **Kata Sandi** pada halaman Login (`/login`).
3. Akun contoh hasil *seed* awal (password bawaan `Kelo#12345` — **wajib segera diganti**):
   - `owner` — **Owner** (Ibu Syahrani Devi): akses penuh semua modul, manajemen user, payroll, dasbor penjualan, dan laporan keuangan.
   - `manager` — **Manager/SDM**: akses operasional (Sales, SCM, Finance) + lihat/edit data pekerja non-sensitif (tanpa gaji pokok & payroll).
   - `pegawai` — **Pegawai**: akses operasional (Sales, SCM, Finance); tanpa akses HR.
   - `pkl` — **Anak PKL**: input Sales & SCM, **lihat saja** pada Finance (tidak bisa verifikasi pembayaran), tanpa akses HR.

---

## 2. Cara Input PO B2B Pertama Anda (5 Langkah)

1. Buka menu **Sales & Marketing → Pesanan & Pelacakan**, klik **+ Buat Pesanan Baru**.
2. Pilih kanal **PO Besar (B2B — DP 50%)** lalu pilih pelanggan mitra (alamat & telepon otomatis terisi).
3. Tambahkan item produk dan jumlahnya. Periksa **Pratinjau Tagihan Invoice DP 50%** yang otomatis dihitung sistem.
4. Klik **Simpan Pesanan**. Sistem otomatis menerbitkan nomor order (`ORD-YYYYMM-XXXX`) dan **Invoice DP 50%** (`INV-YYYYMM-XXXX`) di modul Finance.
5. Setelah mitra mentransfer DP, staf berwenang (Owner/Manager/Pegawai) membuka **Finance & Accounting → Invoice & Verifikasi**, klik **Verifikasi**, unggah bukti transfer (`.jpg/.jpeg/.png/.pdf`, maks 2 MB), lalu simpan. Status order otomatis berubah ke **DP Lunas**.

---

## 3. Alur Produksi, BOM & Pengiriman (B2B)

1. **Kalkulator BOM & PO Supplier (`/scm` → Kalkulator BOM & PO Supplier):**
   - Pilih order berstatus **DP Lunas**. Sistem otomatis menghitung total kebutuhan bahan baku (`Σ qty × qty_per_unit`).
   - Pilih supplier dan klik **Buat PO ke Supplier** (`PO-YYYYMM-XXXX`). Anda dapat mencetak/mengunduh PDF PO supplier.
   - Saat bahan datang, ubah status PO menjadi **Diterima** — biaya *Pembelian Supplier* otomatis tercatat di Finance tanpa input ulang.
2. **Papan Produksi & Logistik (`/scm` → Papan Produksi & Logistik):**
   - Klik **Tahap Berikutnya** secara berurutan: `DP Lunas → Produksi → Packing → Karantina → Siap Kirim → Dikirim → Selesai`.
   - Di tahap **Karantina**, masukkan nomor dokumen karantina bila ada.
   - Di tahap **Siap Kirim**, masukkan **ongkos kirim** — sistem otomatis menerbitkan **Invoice Pelunasan** (`(total - DP) + ongkir`).
   - Sistem **memblokir** status `Dikirim` apabila Invoice Pelunasan belum berstatus **Lunas**. Setelah pelunasan diverifikasi di Finance, masukkan nomor resi dan lanjutkan ke **Dikirim** lalu **Selesai**.

---

## 4. Alur Pesanan Ritel Online (B2C)

1. Di **Sales & Marketing**, klik **+ Buat Pesanan Baru** dan pilih kanal **Online (B2C — Bayar Penuh)**.
2. Sistem mengecek ketersediaan `stock_online` secara atomik. Jika stok cukup, stok langsung berkurang otomatis dan terbit 1 **Invoice FULL**.
3. Jika pesanan B2C dibatalkan sebelum dikirim, stok online otomatis dikembalikan.
4. Apabila stok produk ≤ batas minimum, **Alert Stock** otomatis muncul di badge sidebar SCM, banner Dasbor Utama, dan daftar stok SCM. Gunakan form **Persiapan Produk** di SCM untuk menambah stok online.

---

## 5. Fitur Khusus Owner

- **Dasbor Penjualan (`/sales` → Dasbor Penjualan):** perbandingan omzet dan jumlah transaksi B2B vs B2C per bulan.
- **Laporan Keuangan Bulanan (`/finance` → Laporan Bulanan):** rekap kas masuk, kas keluar (biaya + payroll), piutang, laba/rugi bersih, serta tombol **Unduh PDF** dan **Unduh Excel (.xlsx)**.
- **Payroll & Riwayat (`/hr` → Payroll & Riwayat):** catat Gaji Bulanan, Upah Mingguan, atau Kasbon dengan kalkulasi `net_amount = bruto - potongan kasbon` otomatis.
- **Pengguna & Hak Akses (`/users`):** tambah/nonaktifkan akun (soft-delete), reset password, dan atur matriks izin `role_permissions` tanpa mengubah kode.
