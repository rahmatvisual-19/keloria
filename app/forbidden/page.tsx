"use client";

import React from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { AppLayout } from "@/components/layouts/AppLayout";

export default function ForbiddenPage() {
  return (
    <AppLayout>
      <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-slate-200 bg-white px-8 py-14 text-center shadow-xs">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <p className="mt-4 text-xs font-bold tracking-wider text-red-600">ERROR 403</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Tidak Punya Akses</h1>
        <p className="mt-2 text-sm text-slate-600">
          Role akun Anda tidak memiliki izin untuk membuka halaman atau menjalankan tindakan ini.
          Hubungi Owner Keloria bila Anda memerlukan penyesuaian hak akses.
        </p>
        <Link
          href="/"
          className="mt-6 rounded-lg bg-emerald-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-800"
        >
          Kembali ke Dasbor Utama
        </Link>
      </div>
    </AppLayout>
  );
}
