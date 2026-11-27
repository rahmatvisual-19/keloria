"use client";

import React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Factory,
  Package,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppLayout } from "@/components/layouts/AppLayout";
import { useAppStore } from "@/components/providers/AppStoreProvider";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate, formatRupiah } from "@/lib/client/format";
import { MONTHLY_SALES_COMPARISON } from "@/lib/mock/data";

export default function DashboardPage() {
  const {
    currentUser,
    isOwner,
    isManagerOrOwner,
    can,
    orders,
    invoices,
    expenses,
    payrolls,
    products,
    users,
    lowStockProducts,
  } = useAppStore();

  const roleName = currentUser?.role_name ?? "Anak PKL";
  const isPkl = roleName === "Anak PKL";
  const hideMoney = isPkl && !can("FINANCE", "view");

  const totalOrderValue = orders.reduce((acc, o) => acc + Number(o.total_amount), 0);
  const activeOrderCount = orders.filter(
    (o) => o.order_status !== "Selesai" && o.order_status !== "Dibatalkan",
  ).length;
  const activeProductionCount = orders.filter((o) =>
    ["DP_Lunas", "Produksi", "Packing", "Karantina", "Siap_Kirim"].includes(o.order_status),
  ).length;
  const shippingCount = orders.filter((o) =>
    ["Siap_Kirim", "Dikirim"].includes(o.order_status),
  ).length;
  const unpaidInvoices = invoices.filter((i) => i.payment_status !== "Lunas");
  const totalReceivables = unpaidInvoices.reduce(
    (acc, i) => acc + Math.max(0, Number(i.total_billed) - Number(i.amount_paid)),
    0,
  );
  const kasMasuk = invoices.reduce((acc, i) => acc + Number(i.amount_paid), 0);
  const kasKeluar =
    expenses.reduce((acc, e) => acc + Number(e.amount), 0) +
    payrolls.reduce((acc, p) => acc + Number(p.net_amount), 0);
  const labaBersih = kasMasuk - kasKeluar;
  const activeEmployeeCount = users.filter((u) => u.status === "Aktif").length;

  const dashboardDescription = isOwner
    ? "Dasbor Eksekutif UMKM Keloria — performa penjualan Online vs PO Besar, arus kas, piutang, dan laba bersih."
    : isManagerOrOwner
      ? "Ringkasan operasional, keuangan, dan SDM — pesanan aktif, progres produksi, piutang, dan tim aktif."
      : hideMoney
        ? "Ringkasan operasional harian — pesanan aktif, progres produksi & pengiriman, serta stok produk."
        : "Ringkasan operasional harian & tagihan berjalan — pesanan, produksi, stok online, dan verifikasi invoice.";

  return (
    <AppLayout>
      <PageHeader
        title={`Selamat datang, ${currentUser?.full_name ?? "Pengguna"}`}
        description={dashboardDescription}
        actions={
          <Link
            href="/sales"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            + Buat Pesanan Baru
          </Link>
        }
      />

      {/* Banner Alert Stock jika ada produk <= batas minimum */}
      {lowStockProducts.length > 0 && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="text-sm font-semibold text-amber-950">
                Peringatan Stok Online ({lowStockProducts.length} produk mencapai/di bawah batas
                minimum)
              </p>
              <p className="mt-0.5 text-xs text-amber-800">
                {lowStockProducts
                  .map(
                    (p) =>
                      `${p.product_name} ${p.variant_size} (stok: ${p.stock_online}, min: ${p.min_stock_threshold})`,
                  )
                  .join(" • ")}
              </p>
            </div>
          </div>
          <Link
            href="/scm"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-800"
          >
            Kelola Stok SCM
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Kartu KPI Utama (disesuaikan per Role) */}
      {hideMoney ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Pesanan Aktif</span>
              <ShoppingBag className="h-4 w-4 text-emerald-700" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
              {activeOrderCount} Order
            </p>
            <p className="mt-1 text-xs text-slate-500">{orders.length} total pesanan tercatat</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Antrean Produksi &amp; Kirim</span>
              <Factory className="h-4 w-4 text-sky-700" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
              {activeProductionCount} Order
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {shippingCount} siap kirim / sedang dikirim
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Alert Stok Online</span>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
              {lowStockProducts.length} SKU
            </p>
            <p className="mt-1 text-xs text-slate-500">Perlu persiapan stok produk jadi</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Katalog Produk Aktif</span>
              <Package className="h-4 w-4 text-emerald-700" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
              {products.length} Produk
            </p>
            <p className="mt-1 text-xs text-slate-500">Tersedia untuk input PO &amp; Online</p>
          </div>
        </div>
      ) : isOwner ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Nilai Pesanan</span>
              <ShoppingBag className="h-4 w-4 text-emerald-700" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
              {formatRupiah(totalOrderValue)}
            </p>
            <p className="mt-1 text-xs text-slate-500">{orders.length} pesanan tercatat bulan ini</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Laba Bersih (Arus Kas)</span>
              <TrendingUp className="h-4 w-4 text-emerald-700" />
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-900 tabular-nums">
              {formatRupiah(labaBersih)}
            </p>
            <p className="mt-1 text-xs text-slate-500">Kas masuk {formatRupiah(kasMasuk)}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Piutang Belum Lunas</span>
              <Wallet className="h-4 w-4 text-amber-700" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
              {formatRupiah(totalReceivables)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {unpaidInvoices.length} invoice menunggu verifikasi
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Alert Stok Online</span>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
              {lowStockProducts.length} SKU
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {activeProductionCount} order sedang di jalur SCM
            </p>
          </div>
        </div>
      ) : isManagerOrOwner ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Nilai Pesanan</span>
              <ShoppingBag className="h-4 w-4 text-emerald-700" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
              {formatRupiah(totalOrderValue)}
            </p>
            <p className="mt-1 text-xs text-slate-500">{orders.length} pesanan tercatat bulan ini</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Antrean Produksi &amp; Kirim</span>
              <Factory className="h-4 w-4 text-sky-700" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
              {activeProductionCount} Order
            </p>
            <p className="mt-1 text-xs text-slate-500">Sedang diproses di jalur SCM</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Piutang Belum Lunas</span>
              <Wallet className="h-4 w-4 text-amber-700" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
              {formatRupiah(totalReceivables)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {unpaidInvoices.length} invoice menunggu verifikasi
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Tim &amp; SDM Aktif</span>
              <Users className="h-4 w-4 text-emerald-700" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
              {activeEmployeeCount} Orang
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {users.filter((u) => u.employment_type === "PKL").length} Anak PKL •{" "}
              {lowStockProducts.length} alert stok
            </p>
          </div>
        </div>
      ) : (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Pesanan Aktif</span>
              <ShoppingBag className="h-4 w-4 text-emerald-700" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
              {activeOrderCount} Order
            </p>
            <p className="mt-1 text-xs text-slate-500">{orders.length} total pesanan bulan ini</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Antrean Produksi &amp; Kirim</span>
              <Factory className="h-4 w-4 text-sky-700" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
              {activeProductionCount} Order
            </p>
            <p className="mt-1 text-xs text-slate-500">Sedang diproses di jalur SCM</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Tagihan Berjalan</span>
              <Wallet className="h-4 w-4 text-amber-700" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
              {formatRupiah(totalReceivables)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {unpaidInvoices.length} invoice menunggu verifikasi
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Alert Stok Online</span>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
              {lowStockProducts.length} SKU
            </p>
            <p className="mt-1 text-xs text-slate-500">Perlu persiapan stok produk jadi</p>
          </div>
        </div>
      )}

      {/* Grafik B2B vs B2C (Owner-only) + Pesanan Terbaru */}
      <div className="grid gap-6 lg:grid-cols-3">
        {isOwner ? (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
                  <TrendingUp className="h-4 w-4 text-emerald-700" />
                  Perbandingan Omzet B2B vs B2C (6 Bulan Terakhir)
                </h2>
                <p className="text-xs text-slate-500">Khusus Owner — satuan dalam Rupiah</p>
              </div>
              <Link
                href="/sales"
                className="text-xs font-semibold text-emerald-800 hover:underline"
              >
                Lihat Dasbor Penjualan →
              </Link>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MONTHLY_SALES_COMPARISON}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${Math.round(Number(v) / 1_000_000)}jt`}
                  />
                  <Tooltip
                    formatter={(value) => formatRupiah(Number(value))}
                    contentStyle={{
                      borderRadius: "10px",
                      borderColor: "#e2e8f0",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="b2b_omzet" name="Omzet B2B (PO Besar)" fill="#14532d" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="b2c_omzet" name="Omzet B2C (Online)" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-2">
            <h2 className="text-base font-bold text-slate-900">
              Pintasan Operasional — {roleName}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              {hideMoney
                ? "Fokus operasional harian Sales & SCM. Data keuangan dan penggajian disembunyikan untuk role Anak PKL."
                : isManagerOrOwner
                  ? "Anda memiliki akses penuh operasional Sales, SCM, Finance (termasuk Laporan Bulanan), serta HR & Payroll."
                  : "Grafik eksekutif omzet & laba bersih hanya tersedia untuk Owner. Gunakan pintasan di bawah untuk pekerjaan harian Anda."}
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/sales"
                className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-emerald-700 hover:bg-emerald-50/40"
              >
                <p className="text-sm font-semibold text-slate-900">Catat Pesanan</p>
                <p className="mt-1 text-xs text-slate-500">Input PO B2B atau pesanan ritel B2C</p>
              </Link>
              <Link
                href="/scm"
                className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-emerald-700 hover:bg-emerald-50/40"
              >
                <p className="text-sm font-semibold text-slate-900">Papan Produksi</p>
                <p className="mt-1 text-xs text-slate-500">Perbarui status produksi &amp; resi kirim</p>
              </Link>
              {can("FINANCE", "view") && (
                <Link
                  href="/finance"
                  className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-emerald-700 hover:bg-emerald-50/40"
                >
                  <p className="text-sm font-semibold text-slate-900">Invoice &amp; Biaya</p>
                  <p className="mt-1 text-xs text-slate-500">Verifikasi pembayaran &amp; catat pengeluaran</p>
                </Link>
              )}
              {can("HR", "view") && (
                <Link
                  href="/hr"
                  className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-emerald-700 hover:bg-emerald-50/40"
                >
                  <p className="text-sm font-semibold text-slate-900">HR &amp; Penggajian</p>
                  <p className="mt-1 text-xs text-slate-500">Kelola data pegawai, PKL, gaji &amp; kasbon</p>
                </Link>
              )}
              <Link
                href="/panduan"
                className="rounded-xl border border-slate-200 p-4 transition-colors hover:border-emerald-700 hover:bg-emerald-50/40"
              >
                <p className="text-sm font-semibold text-slate-900">Panduan 5 Langkah</p>
                <p className="mt-1 text-xs text-slate-500">Cara input PO pertama untuk staf baru</p>
              </Link>
            </div>
          </div>
        )}

        {/* Daftar Pesanan Terbaru */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Pesanan Terbaru</h2>
            <Link href="/sales" className="text-xs font-semibold text-emerald-800 hover:underline">
              Semua →
            </Link>
          </div>
          <div className="space-y-3">
            {orders.slice(0, 5).map((order) => (
              <div
                key={order.order_id}
                className="rounded-lg border border-slate-100 bg-slate-50/70 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900">{order.order_number}</span>
                  <StatusBadge status={order.order_status} />
                </div>
                <p className="mt-1 truncate text-xs font-medium text-slate-700">
                  {order.customer_name}
                </p>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                  <span>{formatDate(order.order_date)}</span>
                  {hideMoney ? (
                    <span className="font-semibold text-slate-700">
                      {order.order_channel} • {order.items.reduce((s, it) => s + it.qty, 0)} unit
                    </span>
                  ) : (
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {formatRupiah(order.total_amount)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
