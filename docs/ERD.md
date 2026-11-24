# Entity Relationship Diagram (ERD) — Kelo-ERP

Diagram berikut merangkum 20 tabel dalam `prisma/schema.prisma` untuk UMKM Keloria.

```mermaid
erDiagram
    roles ||--o{ users : "memiliki"
    roles ||--o{ role_permissions : "mengatur"
    modules ||--o{ role_permissions : "dicakup"
    users ||--o{ session_logs : "login"
    users ||--o{ payrolls : "menerima / mencatat"

    customers ||--o{ orders : "memesan"
    users ||--o{ orders : "membuat"
    orders ||--o{ order_items : "berisi"
    products ||--o{ order_items : "dipesan"
    orders ||--o{ order_status_logs : "riwayat status"
    users ||--o{ order_status_logs : "mengubah"

    products ||--o{ product_bom : "komposisi"
    materials ||--o{ product_bom : "dibutuhkan"

    orders ||--o{ purchase_orders : "memicu PO bahan"
    suppliers ||--o{ purchase_orders : "memasok"
    users ||--o{ purchase_orders : "membuat"
    purchase_orders ||--o{ purchase_order_items : "rincian bahan"
    materials ||--o{ purchase_order_items : "dipesan"

    orders ||--o{ invoices : "tagihan DP/Pelunasan/Full"
    invoices ||--o{ invoice_payments : "pembayaran"
    users ||--o{ invoice_payments : "memverifikasi"

    purchase_orders ||--o| expenses : "biaya otomatis saat Diterima"
    users ||--o{ expenses : "mencatat"

    document_sequences {
        string seq_key PK
        int last_number
    }
```

## Ringkasan Keputusan Skema
- Semua nominal uang menggunakan `Decimal(12, 2)` (tidak pernah `Float`).
- Relasi transaksi memakai `onDelete: Restrict` untuk mencegah kehilangan histori keuangan/pesanan.
- `users` (`status: Nonaktif`), `products` (`is_active: false`), `customers` (`is_active: false`), `materials`, dan `suppliers` menggunakan **soft-delete**.
- `expenses.po_id` bertipe `unique` (nullable) untuk menjamin pembuatan biaya otomatis `Pembelian Supplier` saat PO `Diterima` bersifat **idempoten** (tidak pernah dobel).
- `document_sequences` menjamin penomoran dokumen (`ORD-YYYYMM-0001`, `INV-YYYYMM-0001`, `PO-YYYYMM-0001`) aman dari race condition di dalam `prisma.$transaction`.
