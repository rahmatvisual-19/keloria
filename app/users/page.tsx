"use client";

import React, { useMemo, useState } from "react";
import {
  Activity,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  UserCog,
  X,
} from "lucide-react";
import { AppLayout } from "@/components/layouts/AppLayout";
import { useAppStore } from "@/components/providers/AppStoreProvider";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ColumnDef, DataTable } from "@/components/ui/DataTable";
import { EmployeeFormModal, EmployeeFormValues } from "@/components/ui/EmployeeFormModal";
import { FormField } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { formatDateTime } from "@/lib/client/format";
import { toDecimalString } from "@/lib/money";
import {
  ActivityAction,
  ActivityModule,
  MockActivityLog,
  MockSessionLog,
  MockUser,
} from "@/lib/mock/data";
import { ModuleCode, PermissionAction, RoleName } from "@/lib/types/domain";

const ROLES: RoleName[] = ["Owner", "Manager/SDM", "Pegawai", "Anak PKL"];
const MODULES: ModuleCode[] = ["SALES", "SCM", "FINANCE", "HR"];
const ACTIONS: { key: PermissionAction; short: string }[] = [
  { key: "view", short: "V" },
  { key: "create", short: "C" },
  { key: "edit", short: "E" },
  { key: "delete", short: "D" },
];

const ACTION_BADGE_STYLE: Record<ActivityAction, string> = {
  LOGIN: "bg-sky-50 text-sky-800 border-sky-200",
  LOGOUT: "bg-slate-100 text-slate-600 border-slate-200",
  CREATE: "bg-emerald-50 text-emerald-800 border-emerald-200",
  UPDATE: "bg-indigo-50 text-indigo-800 border-indigo-200",
  VERIFY: "bg-teal-50 text-teal-800 border-teal-200",
  STATUS_CHANGE: "bg-amber-50 text-amber-800 border-amber-200",
  CANCEL: "bg-red-50 text-red-700 border-red-200",
  DEACTIVATE: "bg-red-50 text-red-700 border-red-200",
};

export default function UsersPage() {
  const {
    isOwner,
    users,
    setUsers,
    rolePermissions,
    updateRolePermission,
    userPermissions,
    setUserPermissionOverride,
    resetUserPermissionOverrides,
    getEffectivePermissions,
    activityLogs,
    logActivity,
    sessionLogs,
  } = useAppStore();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<"users" | "rbac" | "logs">("users");
  const [toggleTarget, setToggleTarget] = useState<MockUser | null>(null);
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingUser, setEditingUser] = useState<MockUser | null>(null);

  // Target user untuk panel user_permissions (izin khusus per individu)
  const nonOwnerUsers = useMemo(() => users.filter((u) => u.role_name !== "Owner"), [users]);
  const [selectedOverrideUserId, setSelectedOverrideUserId] = useState<number>(() => {
    const pkl = users.find((u) => u.role_name === "Anak PKL");
    return pkl?.user_id ?? nonOwnerUsers[0]?.user_id ?? 0;
  });
  const selectedOverrideUser = useMemo(
    () =>
      nonOwnerUsers.find((u) => u.user_id === selectedOverrideUserId) ?? nonOwnerUsers[0] ?? null,
    [nonOwnerUsers, selectedOverrideUserId],
  );

  // Modal Reset Password
  const [resetTarget, setResetTarget] = useState<MockUser | null>(null);
  const [newPassword, setNewPassword] = useState("Kelo#12345");
  const [showNewPass, setShowNewPass] = useState(false);

  // Filter Log Aktivitas
  const [logModuleFilter, setLogModuleFilter] = useState<string>("ALL");
  const [logActionFilter, setLogActionFilter] = useState<string>("ALL");

  const filteredActivityLogs = useMemo(() => {
    return activityLogs.filter((l) => {
      if (logModuleFilter !== "ALL" && l.module_code !== logModuleFilter) return false;
      if (logActionFilter !== "ALL" && l.action !== logActionFilter) return false;
      return true;
    });
  }, [activityLogs, logModuleFilter, logActionFilter]);

  if (!isOwner) {
    return (
      <AppLayout>
        <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-slate-200 bg-white px-8 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">Akses Khusus Owner (403)</h1>
          <p className="mt-2 text-sm text-slate-600">
            Manajemen pengguna, pengaturan matriks hak akses, dan log aktivitas hanya dapat dibuka
            oleh Owner.
          </p>
        </div>
      </AppLayout>
    );
  }

  const handleSaveUser = (values: EmployeeFormValues) => {
    if (modalMode === "create") {
      const nextId = Math.max(0, ...users.map((u) => u.user_id)) + 1;
      setUsers((prev) => [
        ...prev,
        {
          user_id: nextId,
          full_name: values.full_name,
          username: values.username,
          phone: values.phone || "-",
          role_name: values.role_name,
          employment_type: values.employment_type,
          pay_scheme: values.pay_scheme,
          base_salary: toDecimalString(values.base_salary),
          start_date: values.start_date,
          end_date: values.end_date,
          status: "Aktif",
          last_login: new Date().toISOString(),
        },
      ]);
      logActivity(
        "USERS",
        "CREATE",
        values.username,
        `Menambahkan akun pengguna ${values.full_name} dengan role ${values.role_name}.`,
      );
      showToast(
        `Pengguna ${values.full_name} berhasil ditambahkan`,
        "success",
        `Role: ${values.role_name}`,
      );
    } else if (modalMode === "edit" && editingUser) {
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === editingUser.user_id
            ? {
                ...u,
                full_name: values.full_name,
                phone: values.phone || "-",
                role_name: values.role_name,
                employment_type: values.employment_type,
                pay_scheme: values.pay_scheme,
                base_salary: toDecimalString(values.base_salary),
                start_date: values.start_date,
                end_date: values.end_date,
              }
            : u,
        ),
      );
      logActivity(
        "USERS",
        "UPDATE",
        editingUser.username,
        `Memperbarui profil & role pengguna ${values.full_name}.`,
      );
      showToast(`Data ${values.full_name} berhasil diperbarui`);
    }
    setModalMode(null);
    setEditingUser(null);
  };

  const confirmToggleStatus = () => {
    if (!toggleTarget) return;
    const nextStatus = toggleTarget.status === "Aktif" ? "Nonaktif" : "Aktif";
    setUsers((prev) =>
      prev.map((u) => (u.user_id === toggleTarget.user_id ? { ...u, status: nextStatus } : u)),
    );
    logActivity(
      "USERS",
      nextStatus === "Nonaktif" ? "DEACTIVATE" : "UPDATE",
      toggleTarget.username,
      `Mengubah status akun ${toggleTarget.full_name} menjadi ${nextStatus}.`,
    );
    showToast(
      `Status ${toggleTarget.full_name} diubah menjadi ${nextStatus}`,
      nextStatus === "Nonaktif" ? "info" : "success",
    );
    setToggleTarget(null);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget || newPassword.length < 8) return;
    logActivity(
      "USERS",
      "UPDATE",
      resetTarget.username,
      `Mereset kata sandi akun ${resetTarget.full_name} (sesi aktif diputus).`,
    );
    showToast(
      `Kata sandi ${resetTarget.full_name} direset`,
      "success",
      "Pengguna wajib login ulang dengan kata sandi baru.",
    );
    setResetTarget(null);
    setNewPassword("Kelo#12345");
    setShowNewPass(false);
  };

  const userColumns: ColumnDef<MockUser>[] = [
    {
      key: "name",
      header: "Nama & Username",
      render: (u) => (
        <div>
          <p className="font-semibold text-slate-900">{u.full_name}</p>
          <p className="text-xs text-slate-500">@{u.username}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (u) => <StatusBadge status={u.role_name} />,
    },
    {
      key: "emp",
      header: "Status Kerja",
      render: (u) => (
        <span className="text-xs text-slate-700">
          {u.employment_type} • {u.pay_scheme}
        </span>
      ),
    },
    {
      key: "last_login",
      header: "Login Terakhir",
      render: (u) => <span className="text-xs text-slate-600">{formatDateTime(u.last_login)}</span>,
    },
    {
      key: "status",
      header: "Status Akun",
      render: (u) => <StatusBadge status={u.status} />,
    },
    {
      key: "action",
      header: "Aksi",
      align: "center",
      render: (u) =>
        u.role_name === "Owner" ? (
          <span className="inline-flex items-center gap-1 text-xs text-slate-400">
            <Lock className="h-3 w-3" /> Terkunci
          </span>
        ) : (
          <ActionMenu
            ariaLabel={`Aksi untuk ${u.full_name}`}
            items={[
              {
                label: "Edit Data Pengguna",
                icon: <Pencil className="h-3.5 w-3.5" />,
                onClick: () => {
                  setEditingUser(u);
                  setModalMode("edit");
                },
              },
              {
                label: "Reset Kata Sandi",
                icon: <KeyRound className="h-3.5 w-3.5" />,
                onClick: () => {
                  setResetTarget(u);
                  setNewPassword("Kelo#12345");
                  setShowNewPass(false);
                },
              },
              {
                label: u.status === "Aktif" ? "Nonaktifkan Akun" : "Aktifkan Akun",
                variant: u.status === "Aktif" ? "danger" : "primary",
                onClick: () => setToggleTarget(u),
              },
            ]}
          />
        ),
    },
  ];

  const activityColumns: ColumnDef<MockActivityLog>[] = [
    {
      key: "time",
      header: "Waktu (WIB)",
      render: (l) => <span className="text-xs whitespace-nowrap">{formatDateTime(l.timestamp)}</span>,
    },
    {
      key: "actor",
      header: "Pengguna",
      render: (l) => (
        <div>
          <p className="text-xs font-semibold text-slate-900">{l.actor_name}</p>
          <p className="text-[11px] text-slate-500">{l.actor_role}</p>
        </div>
      ),
    },
    {
      key: "mod",
      header: "Modul & Aksi",
      render: (l) => (
        <div className="flex items-center gap-1.5">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
            {l.module_code}
          </span>
          <span
            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ACTION_BADGE_STYLE[l.action]}`}
          >
            {l.action}
          </span>
        </div>
      ),
    },
    {
      key: "ref",
      header: "Referensi",
      render: (l) => <span className="font-mono text-xs text-slate-800">{l.entity_ref}</span>,
    },
    {
      key: "desc",
      header: "Keterangan",
      render: (l) => <span className="text-xs text-slate-700">{l.description}</span>,
    },
  ];

  const sessionColumns: ColumnDef<MockSessionLog>[] = [
    {
      key: "sid",
      header: "ID Sesi",
      render: (s) => <span className="font-mono text-xs text-slate-700">{s.session_id}</span>,
    },
    {
      key: "user",
      header: "Pengguna",
      render: (s) => (
        <div>
          <p className="text-xs font-semibold text-slate-900">{s.full_name}</p>
          <p className="text-[11px] text-slate-500">@{s.username}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (s) => <StatusBadge status={s.role_name} />,
    },
    {
      key: "login",
      header: "Waktu Login",
      render: (s) => <span className="text-xs">{formatDateTime(s.login_at)}</span>,
    },
    {
      key: "logout",
      header: "Waktu Logout",
      render: (s) => (
        <span className="text-xs text-slate-600">{s.logout_at ? formatDateTime(s.logout_at) : "-"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (s) => (
        <StatusBadge status={s.status === "Aktif" ? "Aktif" : "Nonaktif"} label={s.status} />
      ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Pengaturan Sistem & Akses (RBAC)"
        description="Khusus Owner — kelola akun pengguna, reset kata sandi, hak akses per role (role_permissions) & per individu (user_permissions), serta log aktivitas."
        actions={
          <button
            type="button"
            onClick={() => {
              setEditingUser(null);
              setModalMode("create");
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" />
            Tambah Pengguna
          </button>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`rounded-lg px-3.5 py-2 text-sm font-medium ${
            activeTab === "users"
              ? "bg-emerald-900 text-white"
              : "bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          Manajemen Akun ({users.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("rbac")}
          className={`rounded-lg px-3.5 py-2 text-sm font-medium ${
            activeTab === "rbac"
              ? "bg-emerald-900 text-white"
              : "bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          Hak Akses Role &amp; User
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("logs")}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium ${
            activeTab === "logs"
              ? "bg-emerald-900 text-white"
              : "bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          <Activity className="h-4 w-4" />
          Log Aktivitas &amp; Sesi ({activityLogs.length})
        </button>
      </div>

      {activeTab === "users" && (
        <DataTable
          data={users}
          columns={userColumns}
          rowKey={(u) => u.user_id}
          searchPlaceholder="Cari nama atau username..."
          searchKeys={(u) => `${u.full_name} ${u.username} ${u.role_name}`}
        />
      )}

      {activeTab === "rbac" && (
        <div className="space-y-6">
          {/* 1. Matriks role_permissions */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                Matriks Hak Akses per Jabatan (<code>role_permissions</code> — V = View, C = Create,
                E = Edit, D = Delete)
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Baris Owner selalu terkunci penuh. Pengaturan default: Anak PKL (Sales &amp; SCM),
                Pegawai (+Finance operasional), Manager/SDM (+HR &amp; Laporan Bulanan).
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                    <th className="px-5 py-3">Role</th>
                    {MODULES.map((mod) => (
                      <th key={mod} className="px-4 py-3 text-center">
                        {mod}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ROLES.map((role) => {
                    const locked = role === "Owner";
                    return (
                      <tr key={role} className={locked ? "bg-emerald-50/30" : ""}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <StatusBadge status={role} />
                            {locked && <Lock className="h-3.5 w-3.5 text-slate-400" />}
                          </div>
                        </td>
                        {MODULES.map((mod) => (
                          <td key={mod} className="px-4 py-3.5">
                            <div className="flex items-center justify-center gap-2">
                              {ACTIONS.map((act) => {
                                const checked = rolePermissions[role][mod][act.key];
                                return (
                                  <label
                                    key={act.key}
                                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium ${
                                      checked
                                        ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                                        : "border-slate-200 bg-white text-slate-400"
                                    } ${locked ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      disabled={locked}
                                      onChange={(e) => {
                                        updateRolePermission(role, mod, act.key, e.target.checked);
                                        logActivity(
                                          "USERS",
                                          "UPDATE",
                                          `${role}:${mod}.${act.key}`,
                                          `Mengubah izin role ${role} pada ${mod}.${act.key} menjadi ${
                                            e.target.checked ? "AKTIF" : "NONAKTIF"
                                          }.`,
                                        );
                                        showToast(
                                          `Izin ${role} → ${mod}.${act.key} diperbarui`,
                                          "info",
                                        );
                                      }}
                                      className="h-3.5 w-3.5 accent-emerald-800"
                                    />
                                    {act.short}
                                  </label>
                                );
                              })}
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Panel user_permissions (Izin Khusus Per Individu) */}
          {selectedOverrideUser && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                    <UserCog className="h-4 w-4 text-emerald-700" />
                    Izin Khusus Per Individu (<code>user_permissions</code>)
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Berikan pengecualian akses untuk akun tertentu tanpa mengubah aturan default
                    role. Contoh: pilih <strong>Anak PKL</strong> lalu centang{" "}
                    <strong>FINANCE → V</strong> agar menu Finance muncul khusus untuk akun
                    tersebut.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Pilih pengguna untuk izin khusus"
                    value={selectedOverrideUser.user_id}
                    onChange={(e) => setSelectedOverrideUserId(Number(e.target.value))}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800"
                  >
                    {nonOwnerUsers.map((u) => (
                      <option key={u.user_id} value={u.user_id}>
                        {u.full_name} (@{u.username}) — {u.role_name}
                        {userPermissions[u.user_id] ? " [Override]" : ""}
                      </option>
                    ))}
                  </select>

                  {userPermissions[selectedOverrideUser.user_id] && (
                    <button
                      type="button"
                      onClick={() => {
                        resetUserPermissionOverrides(selectedOverrideUser.user_id);
                        logActivity(
                          "USERS",
                          "UPDATE",
                          selectedOverrideUser.username,
                          `Mereset izin khusus (user_permissions) ${selectedOverrideUser.full_name} kembali ke default role ${selectedOverrideUser.role_name}.`,
                        );
                        showToast(
                          `Izin khusus ${selectedOverrideUser.full_name} direset ke default role`,
                          "info",
                        );
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset ke Default Role
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                      <th className="px-5 py-3">Modul</th>
                      <th className="px-4 py-3">Default Role ({selectedOverrideUser.role_name})</th>
                      <th className="px-4 py-3 text-center">Izin Efektif Akun Ini</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {MODULES.map((mod) => {
                      const roleDefault = rolePermissions[selectedOverrideUser.role_name][mod];
                      const effective = getEffectivePermissions(selectedOverrideUser)[mod];
                      return (
                        <tr key={mod}>
                          <td className="px-5 py-3.5 font-semibold text-slate-900">{mod}</td>
                          <td className="px-4 py-3.5 text-xs text-slate-500">
                            {ACTIONS.filter((a) => roleDefault[a.key])
                              .map((a) => a.short)
                              .join(" · ") || "Tidak ada akses"}
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center justify-center gap-2">
                              {ACTIONS.map((act) => {
                                const checked = effective[act.key];
                                const isOverridden = checked !== roleDefault[act.key];
                                return (
                                  <label
                                    key={act.key}
                                    className={`inline-flex cursor-pointer items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium ${
                                      isOverridden
                                        ? "border-amber-400 bg-amber-50 text-amber-950"
                                        : checked
                                          ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                                          : "border-slate-200 bg-white text-slate-400"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) => {
                                        const nextVal = e.target.checked;
                                        setUserPermissionOverride(
                                          selectedOverrideUser.user_id,
                                          mod,
                                          act.key,
                                          nextVal,
                                        );
                                        logActivity(
                                          "USERS",
                                          "UPDATE",
                                          `${selectedOverrideUser.username}:${mod}.${act.key}`,
                                          `Mengatur izin khusus ${selectedOverrideUser.full_name} pada ${mod}.${act.key} menjadi ${
                                            nextVal ? "AKTIF" : "NONAKTIF"
                                          }.`,
                                        );
                                        showToast(
                                          `Izin khusus ${selectedOverrideUser.full_name} → ${mod}.${act.key} diperbarui`,
                                          "info",
                                        );
                                      }}
                                      className="h-3.5 w-3.5 accent-emerald-800"
                                    />
                                    {act.short}
                                    {isOverridden && (
                                      <span className="ml-0.5 text-[10px] font-bold text-amber-700">
                                        *
                                      </span>
                                    )}
                                  </label>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-2.5 text-[11px] text-slate-500">
                Tanda <strong className="text-amber-700">*</strong> menandakan izin khusus (
                <code>user_permissions</code>) yang berbeda dari default role. Perubahan langsung
                berlaku saat beralih akun lewat Role Switcher di sidebar.
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "logs" && (
        <div className="space-y-6">
          <div>
            <h2 className="mb-3 text-sm font-bold text-slate-900">
              Log Aktivitas Sistem (Real-Time Audit Trail)
            </h2>
            <DataTable
              data={filteredActivityLogs}
              columns={activityColumns}
              rowKey={(l) => l.log_id}
              searchPlaceholder="Cari pengguna, referensi, atau keterangan..."
              searchKeys={(l) => `${l.actor_name} ${l.entity_ref} ${l.description} ${l.module_code}`}
              filters={
                <>
                  <select
                    value={logModuleFilter}
                    onChange={(e) => setLogModuleFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                  >
                    <option value="ALL">Semua Modul</option>
                    {(["AUTH", "USERS", "SALES", "SCM", "FINANCE", "HR"] as ActivityModule[]).map(
                      (m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ),
                    )}
                  </select>
                  <select
                    value={logActionFilter}
                    onChange={(e) => setLogActionFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                  >
                    <option value="ALL">Semua Aksi</option>
                    {(
                      [
                        "LOGIN",
                        "LOGOUT",
                        "CREATE",
                        "UPDATE",
                        "VERIFY",
                        "STATUS_CHANGE",
                        "CANCEL",
                        "DEACTIVATE",
                      ] as ActivityAction[]
                    ).map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </>
              }
            />
          </div>

          <div>
            <h2 className="mb-3 text-sm font-bold text-slate-900">
              Riwayat Sesi Login (`session_logs` — PRD Proses 1.1)
            </h2>
            <DataTable
              data={sessionLogs}
              columns={sessionColumns}
              rowKey={(s) => s.session_id}
              searchPlaceholder="Cari username atau ID sesi..."
              searchKeys={(s) => `${s.session_id} ${s.username} ${s.full_name}`}
            />
          </div>
        </div>
      )}

      <EmployeeFormModal
        open={modalMode !== null}
        mode={modalMode ?? "create"}
        isOwner={true}
        initialUser={editingUser}
        existingUsernames={users.map((u) => u.username)}
        onSubmit={handleSaveUser}
        onClose={() => {
          setModalMode(null);
          setEditingUser(null);
        }}
      />

      {/* Modal Reset Kata Sandi */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Reset Kata Sandi</h2>
                <p className="text-xs text-slate-500">
                  {resetTarget.full_name} (@{resetTarget.username})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResetTarget(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="mt-4 space-y-4">
              <FormField label="Kata Sandi Baru" required hint="Minimal 8 karakter">
                <div className="relative">
                  <input
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    minLength={8}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 py-2 pl-3 pr-10 text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass((p) => !p)}
                    aria-label={showNewPass ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormField>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetTarget(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Simpan Sandi Baru
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(toggleTarget)}
        title={
          toggleTarget?.status === "Aktif" ? "Nonaktifkan Akun Pengguna?" : "Aktifkan Akun Pengguna?"
        }
        description={
          toggleTarget?.status === "Aktif"
            ? `Akun ${toggleTarget.full_name} akan langsung ditolak di seluruh endpoint aktif (soft-delete, bukan hapus permanen).`
            : `Akun ${toggleTarget?.full_name} akan dapat login kembali ke Kelo-ERP.`
        }
        confirmLabel={toggleTarget?.status === "Aktif" ? "Ya, Nonaktifkan" : "Ya, Aktifkan"}
        danger={toggleTarget?.status === "Aktif"}
        onConfirm={confirmToggleStatus}
        onClose={() => setToggleTarget(null)}
      />
    </AppLayout>
  );
}
