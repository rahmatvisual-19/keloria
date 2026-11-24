"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  BookOpen,
  Clock,
  Factory,
  LayoutDashboard,
  Leaf,
  LogOut,
  ShieldCheck,
  ShoppingBag,
  Users,
  Wallet,
} from "lucide-react";
import { useAppStore } from "@/components/providers/AppStoreProvider";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ModuleCode, RoleName } from "@/lib/types/domain";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  moduleCode?: ModuleCode;
  ownerOnly?: boolean;
  badgeCount?: number;
}

const ALL_ROLES: RoleName[] = ["Owner", "Manager/SDM", "Pegawai", "Anak PKL"];

function RealtimeClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const initTimer = window.setTimeout(() => setNow(new Date()), 0);
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => {
      window.clearTimeout(initTimer);
      window.clearInterval(interval);
    };
  }, []);

  if (!now) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Clock className="h-4 w-4" />
        <span className="tabular-nums">--:--:-- WIB</span>
      </div>
    );
  }

  const timeText = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(now)
    .replaceAll(".", ":");

  const dateText = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(now);

  return (
    <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
      <Clock className="h-4 w-4 text-emerald-800" />
      <span className="font-semibold text-slate-900 tabular-nums">{timeText} WIB</span>
      <span className="text-slate-300">|</span>
      <span className="text-slate-500">{dateText}</span>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isOwner, can, loginAsRole, logout, lowStockProducts } = useAppStore();

  useEffect(() => {
    if (!currentUser) {
      router.replace("/login");
    }
  }, [currentUser, router]);

  if (!currentUser) {
    return null;
  }

  const navItems: NavItem[] = [
    { href: "/", label: "Dasbor Utama", icon: LayoutDashboard },
    { href: "/sales", label: "Sales & Marketing", icon: ShoppingBag, moduleCode: "SALES" },
    {
      href: "/scm",
      label: "Supply Chain (SCM)",
      icon: Factory,
      moduleCode: "SCM",
      badgeCount: lowStockProducts.length,
    },
    { href: "/finance", label: "Finance & Accounting", icon: Wallet, moduleCode: "FINANCE" },
    { href: "/hr", label: "Human Resources", icon: Users, moduleCode: "HR" },
    {
      href: "/users",
      label: "Pengguna & Hak Akses",
      icon: ShieldCheck,
      ownerOnly: true,
    },
    { href: "/panduan", label: "Panduan Input PO", icon: BookOpen },
  ];

  const visibleNav = navItems.filter((item) => {
    if (item.ownerOnly) return isOwner;
    if (item.moduleCode) return can(item.moduleCode, "view");
    return true;
  });

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-[#f6f8f7] text-slate-900">
      {/* Sidebar Kiri */}
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-900 text-white">
            <Leaf className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <span className="block text-base font-bold tracking-tight text-slate-900">
              Kelo-ERP
            </span>
            <span className="block text-[11px] font-medium text-slate-500">UMKM Keloria</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-emerald-900 text-white"
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon
                    className={`h-4 w-4 ${active ? "text-emerald-200" : "text-slate-500"}`}
                  />
                  {item.label}
                </span>
                {item.badgeCount !== undefined && item.badgeCount > 0 && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      active
                        ? "bg-amber-400 text-slate-950"
                        : "bg-amber-100 text-amber-800"
                    }`}
                    title={`${item.badgeCount} produk mendekati/di bawah stok minimum`}
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {item.badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Pratinjau cepat pergantian role untuk evaluasi UI RBAC */}
        <div className="border-t border-slate-200 bg-slate-50/80 p-3">
          <p className="mb-1.5 text-[11px] font-semibold text-slate-500">
            Simulasi Role (Pratinjau UI)
          </p>
          <select
            aria-label="Pilih simulasi role"
            value={currentUser.role_name}
            onChange={(e) => loginAsRole(e.target.value as RoleName)}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-emerald-800 focus:outline-none"
          >
            {ALL_ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      </aside>

      {/* Area Utama */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-6 backdrop-blur-xs">
          <RealtimeClock />

          <div className="flex items-center gap-3">
            <div className="text-right leading-tight">
              <p className="text-sm font-semibold text-slate-900">{currentUser.full_name}</p>
              <p className="text-xs text-slate-500">@{currentUser.username}</p>
            </div>
            <StatusBadge status={currentUser.role_name} />
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="h-3.5 w-3.5" />
              Keluar
            </button>
          </div>
        </header>

        {/* Konten Halaman */}
        <main className="mx-auto w-full max-w-[1440px] flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
