"use client";

import React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Factory,
  ShoppingBag,
  TrendingUp,
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
  const { currentUser, isOwner, orders, invoices, lowStockProducts } = useAppStore();

  const totalOrderValue = orders.reduce((acc, o) => acc + Number(o.total_amount), 0);
  const activeProductionCount = orders.filter((o) =>
    ["DP_Lunas", "Produksi", "Packing", "Karantina", "Siap_Kirim"].includes(o.order_status),
  ).length;
  const totalReceivables = invoices
    .filter((i) => i.payment_status !== "Lunas")
    .reduce((acc, i) => acc + Math.max(0, Number(i.total_billed) - Number(i.amount_paid)), 0);

  return (
    <AppLayout>
      <PageHeader
        title={`Selamat datang, ${currentUser?.full_name ?? "Pengguna"}`}
        description="Ringkasan operasional harian UMKM Keloria — pesanan B2B & B2C, produksi, stok online, dan tagihan."
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

      {/* Kartu KPI Utama */}
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
            <span className="text-xs font-semibold text-slate-500">Antrean Produksi & Kirim</span>
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
            {invoices.filter((i) => i.payment_status !== "Lunas").length} invoice menunggu verifikasi
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
            <h2 className="text-base font-bold text-slate-900">Ringkasan Operasional Anda</h2>
            <p className="mt-1 text-xs text-slate-500">
              Grafik komparasi omzet B2B vs B2C hanya tersedia untuk role Owner. Gunakan pintasan di
              bawah untuk pekerjaan harian Anda.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
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
                <p className="mt-1 text-xs text-slate-500">Perbarui status produksi & stok online</p>
              </Link>
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
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {formatRupiah(order.total_amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
