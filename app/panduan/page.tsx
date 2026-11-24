"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { AppLayout } from "@/components/layouts/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";

const STEPS = [
  {
    step: 1,
    title: "Buka menu Sales & Marketing → Pesanan",
    detail:
      'Klik tombol "+ Buat Pesanan Baru" lalu pilih kanal "PO Besar (B2B, DP 50%)" untuk pesanan mitra, atau "Online (B2C, Bayar Penuh)" untuk pesanan ritel.',
  },
  {
    step: 2,
    title: "Pilih atau tambah pelanggan & isi alamat penerima",
    detail:
      "Pilih pelanggan yang sudah terdaftar agar nomor telepon dan alamat otomatis terisi, atau tambahkan pelanggan baru langsung tanpa pindah halaman.",
  },
  {
    step: 3,
    title: "Tambahkan produk & periksa pratinjau nilai DP 50%",
    detail:
      "Pilih produk dan jumlah pesanan. Sistem otomatis mengunci harga saat itu (snapshot), menghitung subtotal, total pesanan, dan pratinjau tagihan DP 50%.",
  },
  {
    step: 4,
    title: "Simpan pesanan — Invoice DP 50% terbit otomatis",
    detail:
      "Begitu pesanan B2B disimpan, nomor order (ORD-YYYYMM-XXXX) dan Invoice DP 50% langsung dibuat otomatis di modul Finance tanpa pencatatan ulang.",
  },
  {
    step: 5,
    title: "Verifikasi DP → Lanjut Kalkulator BOM & Produksi",
    detail:
      "Setelah pelanggan mentransfer DP dan bukti diverifikasi di Finance (oleh Owner/Manager/Pegawai), status berubah ke DP Lunas dan pesanan siap dihitung bahan bakunya di SCM.",
  },
];

export default function PanduanPage() {
  return (
    <AppLayout>
      <PageHeader
        title="Cara Input PO Pertama Anda"
        description="Panduan ringkas 5 langkah agar staf baru dan peserta PKL dapat mencatat pesanan secara mandiri tanpa kesalahan."
        actions={
          <Link
            href="/sales"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            Mulai Input Pesanan
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {STEPS.map((item) => (
            <div
              key={item.step}
              className="flex gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-900 text-sm font-bold text-white">
                {item.step}
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">{item.title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-emerald-950">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              Aturan Penting yang Dijaga Sistem
            </h3>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-emerald-900">
              <li>• Pesanan B2B tidak bisa masuk produksi sebelum DP 50% diverifikasi.</li>
              <li>• Tahapan produksi berjalan berurutan (tidak bisa melompat tahap).</li>
              <li>• Status Dikirim otomatis diblokir bila Invoice Pelunasan belum Lunas.</li>
              <li>• Pesanan B2C otomatis memotong stok online secara aman (anti stok minus).</li>
              <li>• Anak PKL dapat melihat tagihan, namun verifikasi pembayaran khusus Pegawai/Manager/Owner.</li>
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
