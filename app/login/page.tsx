"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Leaf, Lock, User } from "lucide-react";
import { useAppStore } from "@/components/providers/AppStoreProvider";
import { FormField } from "@/components/ui/FormField";
import { useToast } from "@/components/ui/Toast";
import { RoleName } from "@/lib/types/domain";

const DEMO_ACCOUNTS: { label: string; username: string; role: RoleName }[] = [
  { label: "Owner (Ibu Syahrani)", username: "owner", role: "Owner" },
  { label: "Manager / SDM", username: "manager", role: "Manager/SDM" },
  { label: "Pegawai Operasional", username: "pegawai", role: "Pegawai" },
  { label: "Anak PKL", username: "pkl", role: "Anak PKL" },
];

export default function LoginPage() {
  const router = useRouter();
  const { loginWithCredentials, loginAsRole } = useAppStore();
  const { showToast } = useToast();

  const [username, setUsername] = useState("owner");
  const [password, setPassword] = useState("Kelo#12345");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError("Username dan kata sandi wajib diisi.");
      return;
    }

    setSubmitting(true);
    const result = loginWithCredentials(username, password);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.message ?? "Login gagal.");
      return;
    }

    showToast("Berhasil masuk ke Kelo-ERP");
    router.push("/");
  };

  const quickLogin = (role: RoleName) => {
    loginAsRole(role);
    showToast(`Masuk sebagai ${role}`);
    router.push("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f6f8f7] p-6">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:grid-cols-2">
        {/* Panel Brand Kiri */}
        <div className="flex flex-col justify-between bg-emerald-950 p-8 text-white">
          <div>
            <div className="inline-flex items-center gap-2.5 rounded-xl bg-white/10 px-3 py-2">
              <Leaf className="h-5 w-5 text-emerald-300" />
              <span className="text-sm font-bold tracking-tight">Kelo-ERP</span>
            </div>
            <h1 className="mt-6 text-2xl font-bold leading-snug">
              Sistem Terpadu Operasional UMKM Keloria
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-emerald-100/80">
              Kelola PO B2B Make-to-Order (DP 50%), pesanan ritel B2C, kebutuhan bahan baku BOM,
              arus kas, hingga penggajian dalam satu basis data terpusat.
            </p>
          </div>

          <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-emerald-100/80">
            <p className="font-semibold text-white">Akun Contoh (Pratinjau UI):</p>
            <p className="mt-1">
              Username: <code className="text-emerald-300">owner</code> /{" "}
              <code className="text-emerald-300">manager</code> /{" "}
              <code className="text-emerald-300">pegawai</code> /{" "}
              <code className="text-emerald-300">pkl</code>
            </p>
            <p className="mt-0.5">
              Kata sandi: <code className="text-emerald-300">Kelo#12345</code>
            </p>
          </div>
        </div>

        {/* Panel Form Login Kanan */}
        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-900">Masuk ke Akun Anda</h2>
          <p className="mt-1 text-sm text-slate-600">
            Masukkan kredensial yang diberikan oleh Owner Keloria.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <FormField label="Username" htmlFor="username" required>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: owner"
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm text-slate-900 focus:border-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-800/15"
                />
              </div>
            </FormField>

            <FormField label="Kata Sandi" htmlFor="password" required>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-10 text-sm text-slate-900 focus:border-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-800/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </FormField>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-emerald-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-50"
            >
              {submitting ? "Memeriksa..." : "Masuk"}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <p className="mb-2.5 text-xs font-medium text-slate-500">
              Atau masuk cepat untuk uji tampilan per role:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => quickLogin(acc.role)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-medium text-slate-700 transition-colors hover:border-emerald-700 hover:bg-emerald-50/50 hover:text-emerald-900"
                >
                  {acc.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
