# Panduan Deploy Free / Student Tier — Kelo-ERP

Kelo-ERP dirancang ringan agar dapat dijalankan gratis pada tier pelajar/UMKM menggunakan **Vercel / Render / Railway** untuk aplikasi Next.js dan **Neon / Supabase** untuk PostgreSQL.

---

## 1. Menyiapkan Database PostgreSQL Gratis (Neon atau Supabase)

1. Buat proyek baru di [Neon](https://neon.tech) atau [Supabase](https://supabase.com) (pilih region terdekat: **Singapore `ap-southeast-1`**).
2. Salin connection string PostgreSQL (format `postgresql://user:pass@host:5432/dbname?sslmode=require`).
3. Dari komputer lokal (dengan `.env` mengarah ke `DATABASE_URL` produksi), terapkan migrasi & seed awal:
   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```
4. **Segera login sebagai `owner` dan ganti password awal `Kelo#12345`!**

---

## 2. Deploy Aplikasi Next.js (Vercel / Render / Railway)

### Opsi A: Satu Domain (Direkomendasikan — Vercel / Render)
Setel variabel lingkungan berikut di dashboard platform:

| Variabel | Nilai Produksi |
|---|---|
| `DATABASE_URL` | Connection string PostgreSQL (Neon/Supabase) |
| `JWT_SECRET` | String acak kriptografis minimal 32 karakter (`openssl rand -hex 32`) |
| `JWT_EXPIRES_IN` | `8h` |
| `COOKIE_NAME` | `kelo_session` |
| `COOKIE_SAME_SITE` | `lax` *(karena frontend & API berada di satu domain)* |
| `CLIENT_ORIGIN` | `https://kelo-erp.domainanda.com` *(tanpa trailing slash)* |
| `NEXT_PUBLIC_API_BASE_URL` | *(kosongkan agar request memakai origin yang sama)* |
| `NODE_ENV` | `production` |

### Opsi B: Frontend & API di Domain Berbeda (Lintas Domain)
Jika Anda memisahkan deployment frontend (`https://app.keloria.id`) dan API (`https://api.keloria.id`):
- Setel `COOKIE_SAME_SITE="none"` (cookie otomatis diberi flag `Secure` di HTTPS).
- Setel `CLIENT_ORIGIN="https://app.keloria.id"` pada server API agar header CORS (`Access-Control-Allow-Origin` + `Allow-Credentials: true`) dan pemeriksaan CSRF header `Origin` di `proxy.ts` cocok.
- Setel `NEXT_PUBLIC_API_BASE_URL="https://api.keloria.id"` pada frontend.

---

## 3. Catatan Penting Penyimpanan Bukti Bayar di Serverless

- Secara default, `lib/storage.ts` menyimpan bukti bayar di disk lokal (`UPLOAD_DIR="./storage/uploads"`, di luar folder `public`).
- Pada deployment **VPS / Render Persistent Disk / Railway Volume**, disk bersifat persisten sehingga driver lokal langsung berfungsi.
- Pada deployment **serverless (Vercel)**, sistem berkas lokal bersifat sementara (*ephemeral*) dan hilang setelah instance tidur. Untuk produksi di Vercel, ganti implementasi `saveProofFile()` dan `readProofFile()` di `lib/storage.ts` agar menggunakan **Supabase Storage (private bucket)** atau **Vercel Blob** — kontrak fungsi tidak perlu berubah.

---

## 4. Keterbatasan Rate-Limit & Backup Database

- **Rate-limit login (`lib/rate-limit.ts`):** Memakai `Map` in-memory (5 percobaan/menit/IP). Pada serverless/multi-instance, counter tidak terbagi antar instance dan ter-reset saat cold start. Untuk perlindungan produksi skala besar, migrasikan ke **Upstash Redis**.
- **Backup otomatis PostgreSQL:**
  - Neon/Supabase menyediakan snapshot harian otomatis.
  - Untuk backup tambahan mandiri, jadwalkan `scripts/backup-db.sh` dengan `cron`:
    ```cron
    0 2 * * * DATABASE_URL="postgresql://..." /path/to/keloria/scripts/backup-db.sh >> /var/log/kelo-backup.log 2>&1
    ```
