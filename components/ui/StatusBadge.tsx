"use client";

import React from "react";
import {
  ORDER_STATUS_LABEL,
  OrderStatus,
  PAYMENT_STATUS_LABEL,
  PaymentStatus,
} from "@/lib/types/domain";

const COLOR_MAP: Record<string, string> = {
  // Status Pesanan
  Menunggu_Pembayaran: "bg-amber-50 text-amber-800 border-amber-200",
  DP_Lunas: "bg-sky-50 text-sky-800 border-sky-200",
  Produksi: "bg-indigo-50 text-indigo-800 border-indigo-200",
  Packing: "bg-cyan-50 text-cyan-800 border-cyan-200",
  Karantina: "bg-orange-50 text-orange-800 border-orange-200",
  Siap_Kirim: "bg-teal-50 text-teal-800 border-teal-200",
  Dikirim: "bg-blue-50 text-blue-800 border-blue-200",
  Selesai: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Dibatalkan: "bg-red-50 text-red-700 border-red-200",

  // Status Pembayaran
  Belum_Bayar: "bg-amber-50 text-amber-800 border-amber-200",
  DP_Terbayar: "bg-sky-50 text-sky-800 border-sky-200",
  Lunas: "bg-emerald-50 text-emerald-800 border-emerald-200",

  // Status PO Supplier
  Dipesan: "bg-amber-50 text-amber-800 border-amber-200",
  Diterima: "bg-sky-50 text-sky-800 border-sky-200",

  // Status Akun / Produk
  Aktif: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Nonaktif: "bg-slate-100 text-slate-600 border-slate-200",

  // Tipe Pelanggan / Role
  B2B: "bg-emerald-900/10 text-emerald-900 border-emerald-900/20",
  B2C: "bg-slate-100 text-slate-700 border-slate-200",
  Owner: "bg-emerald-900 text-white border-emerald-900",
  "Manager/SDM": "bg-sky-50 text-sky-800 border-sky-200",
  Pegawai: "bg-slate-100 text-slate-800 border-slate-200",
  "Anak PKL": "bg-amber-50 text-amber-800 border-amber-200",
};

interface StatusBadgeProps {
  status: string;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const display =
    label ??
    ORDER_STATUS_LABEL[status as OrderStatus] ??
    PAYMENT_STATUS_LABEL[status as PaymentStatus] ??
    (status === "B2B" ? "Mitra B2B" : status === "B2C" ? "Retail" : status);

  const classes = COLOR_MAP[status] ?? "bg-slate-100 text-slate-700 border-slate-200";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${classes}`}
    >
      {display}
    </span>
  );
}
