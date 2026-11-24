import React from "react";
import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f8f7] p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-xs">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-600">
          <FileQuestion className="h-7 w-7" />
        </div>
        <p className="mt-4 text-xs font-bold tracking-wider text-slate-500">ERROR 404</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Halaman Tidak Ditemukan</h1>
        <p className="mt-2 text-sm text-slate-600">
          Tautan yang Anda buka tidak tersedia di Kelo-ERP. Periksa kembali alamat atau kembali ke
          dasbor utama.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-emerald-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Ke Dasbor Utama
        </Link>
      </div>
    </div>
  );
}
