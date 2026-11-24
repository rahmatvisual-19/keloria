# Kelo-ERP — Custom Micro-ERP untuk UMKM Keloria

Prototipe fungsional sistem ERP berbasis web untuk **UMKM Keloria** (pemilik: Ibu Syahrani Devi) yang melayani pesanan **B2B Make-to-Order (DP 50%)** dan **B2C Ritel Online (stok tipis)**.

## Hasil Audit Proyek & Adaptasi Arsitektur (Fase 0)

Berdasarkan audit direktori workspace `keloria`:
- Tidak ditemukan sub-folder `/client` maupun `/server`; root proyek merupakan satu proyek **Next.js 16.4.6** (`App Router`, tanpa `src/`) dengan **React 19.3.0**, **TypeScript 5**, dan **Tailwind CSS 4.3.3**.
- **Adaptasi:** Proyek dipertahankan utuh di root (tanpa menimpa konfigurasi `next.config.ts`, `tsconfig.json`, maupun `eslint.config.mjs`) dengan pemisahan lapisan yang tegas:
  - **Backend API murni:** Route Handlers di `app/api/v1/**/route.ts`, service & repository di `modules/{auth,users,sales,scm,finance,hr,reports}/`, utilitas bersama di `lib/`, dan Prisma di `prisma/`.
  - **Proxy (Next.js 16 pengganti `middleware.ts`):** `proxy.ts` di root menangani CORS (`CLIENT_ORIGIN`), preflight `OPTIONS`, verifikasi header `Origin` (CSRF), serta pengecekan optimistik JWT via `jose`.
  - **Frontend React:** Halaman di `app/(auth)/` & `app/(dashboard)/`, HTTP client wrapper (`lib/client/http.ts`) dengan `credentials: "include"` + interceptor 401/403, serta komponen reusable di `components/`, `layouts/`, dan `features/`.
- Server dapat dijalankan di port bawaan `3000` (`npm run dev`) atau port `4000` (`npm run dev:4000`). Karena CORS sudah dikonfigurasi penuh di `proxy.ts`, API `/api/v1/**` juga siap dikonsumsi bila suatu saat frontend dipisah ke origin berbeda.

## Prasyarat

- **Node.js** v20+ (teraudit: `v22.22.2`) & **npm** 10+
- **PostgreSQL 16** (lokal via Docker Compose `docker-compose.yml` atau layanan cloud gratis seperti Neon/Supabase)

## Cara Menjalankan Lokal

1. Salin file contoh konfigurasi lingkungan:
   ```bash
   cp .env.example .env.local
   cp .env.example .env
   ```
   Sesuaikan `DATABASE_URL` dan `JWT_SECRET` (minimal 32 karakter).

2. Jalankan PostgreSQL lokal (bila Docker terpasang):
   ```bash
   docker compose up -d
   ```

3. Pasang dependency (bila belum):
   ```bash
   npm install
   ```

4. Jalankan server pengembangan:
   ```bash
   npm run dev
   # atau pada port 4000:
   npm run dev:4000
   ```

5. Uji endpoint health check:
   ```bash
   curl http://localhost:3000/api/v1/health
   ```

## Perintah Penting

| Perintah | Keterangan |
|---|---|
| `npm run dev` | Jalankan Next.js di port 3000 |
| `npm run dev:4000` | Jalankan Next.js di port 4000 |
| `npm run typecheck` | Pemeriksaan tipe TypeScript (`tsc --noEmit`) |
| `npm run lint` | Pemeriksaan ESLint |
| `npm run test` | Jalankan seluruh unit/integration test (Vitest) |
| `npm run format` | Format kode menggunakan Prettier |
| `npm run db:generate` | Generate Prisma Client (mulai Fase 1) |
| `npm run db:migrate` | Jalankan migrasi Prisma (mulai Fase 1) |
| `npm run db:seed` | Jalankan seed data awal idempoten (mulai Fase 1) |

## Catatan Keamanan & Operasional

- **Password akun seed (Fase 1):** Akun contoh (`owner`, `manager`, `pegawai`, `pkl`) akan memakai password awal `Kelo#12345` — **WAJIB segera diganti** sebelum pemakaian nyata.
- **Rate-limit login:** Menggunakan penyimpanan in-memory (5 percobaan/menit/IP). Catatan keterbatasan: pada deployment multi-instance/serverless, counter in-memory tidak terbagi antar instance dan dapat di-reset saat cold start; untuk skala produksi penuh disarankan memakai Redis/Upstash.
- **Penyimpanan bukti bayar:** Driver bawaan menyimpan file di luar folder `public` (`UPLOAD_DIR`) dengan nama file acak dan diunduh lewat endpoint terautentikasi. Bila deploy ke platform serverless (misalnya Vercel) yang sistem berkasnya tidak persisten, ubah driver ke penyimpanan objek cloud (Supabase Storage atau Vercel Blob).
- **Backup basis data:** Gunakan `scripts/backup-db.sh` (Linux/macOS, dapat dijadwalkan dengan `cron`) atau `scripts/backup-db.ps1` (Windows PowerShell) berbasis `pg_dump`.

## Daftar Dependency Tambahan & Alasan

- `zod`: Validasi skema request API (body, query, params) dan form frontend.
- `jose`: Pembuatan & verifikasi JWT yang kompatibel dengan Next.js 16 Proxy & Node.js runtime.
- `bcryptjs`: Hashing password dengan cost >= 10.
- `pino`: Logging terstruktur dengan redaksi otomatis field sensitif.
- `@prisma/client` & `prisma` (v6): ORM bertipe aman untuk PostgreSQL (portable ke MySQL).
- `@tanstack/react-query`: Manajemen server state, caching, dan mutasi di frontend.
- `react-hook-form` & `@hookform/resolvers`: Manajemen form tervalidasi Zod.
- `lucide-react` & `recharts`: Ikon UI dan grafik dasbor B2B vs B2C.
- `pdfkit` & `exceljs`: Pembuatan dokumen PDF (invoice, PO, laporan) dan ekspor Excel.
- `vitest`, `vite`, `tsx`, `prettier`: Pengujian otomatis, eksekusi skrip TS/seed, dan konsistensi format kode.

## Dokumentasi Lengkap

- [Entity Relationship Diagram (ERD)](./docs/ERD.md)
- [Dokumentasi REST API (`API.md`)](./API.md)
- [Panduan Pengguna (User Manual)](./docs/USER_MANUAL.md)
- [Skenario User Acceptance Testing (UAT)](./docs/UAT_SCENARIOS.md)
- [Panduan Deploy Free / Student Tier](./docs/DEPLOY_FREE_TIER.md)
