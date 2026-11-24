"use client";

import React, { useMemo, useState } from "react";
import { Lock, Pencil, Plus, ShieldAlert } from "lucide-react";
import { AppLayout } from "@/components/layouts/AppLayout";
import { useAppStore } from "@/components/providers/AppStoreProvider";
import { ActionMenu } from "@/components/ui/ActionMenu";
import { ColumnDef, DataTable } from "@/components/ui/DataTable";
import { EmployeeFormModal, EmployeeFormValues } from "@/components/ui/EmployeeFormModal";
import { FormField } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { formatDate, formatRupiah } from "@/lib/client/format";
import { subtractMoney, toDecimalString } from "@/lib/money";
import { MockPayroll, MockUser } from "@/lib/mock/data";
import { PayrollType } from "@/lib/types/domain";

type HrTab = "employees" | "payroll";

export default function HrPage() {
  const { isOwner, can, users, setUsers, payrolls, setPayrolls, logActivity } = useAppStore();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<HrTab>("employees");
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<MockUser | null>(null);

  // Form Payroll
  const [empId, setEmpId] = useState<number>(2);
  const [payType, setPayType] = useState<PayrollType>("Gaji Bulanan");
  const [gross, setGross] = useState<string>("4800000");
  const [kasbon, setKasbon] = useState<string>("0");
  const [periodLabel, setPeriodLabel] = useState<string>("Nov 2026");
  const [notes, setNotes] = useState<string>("");

  // Filter Riwayat Penggajian (Proses 5.3 PRD)
  const [filterEmpId, setFilterEmpId] = useState<string>("ALL");
  const [filterPeriod, setFilterPeriod] = useState<string>("ALL");

  const netPreview = useMemo(() => {
    const g = Number(gross) || 0;
    const k = Number(kasbon) || 0;
    return subtractMoney(toDecimalString(Math.max(0, g)), toDecimalString(Math.max(0, k)));
  }, [gross, kasbon]);

  const uniquePeriods = useMemo(
    () => Array.from(new Set(payrolls.map((p) => p.period_label))),
    [payrolls],
  );

  const filteredPayrolls = useMemo(() => {
    return payrolls.filter((p) => {
      if (filterEmpId !== "ALL" && String(p.user_id) !== filterEmpId) return false;
      if (filterPeriod !== "ALL" && p.period_label !== filterPeriod) return false;
      return true;
    });
  }, [payrolls, filterEmpId, filterPeriod]);

  const payrollTotals = useMemo(() => {
    return filteredPayrolls.reduce(
      (acc, p) => ({
        gross: acc.gross + Number(p.gross_amount),
        kasbon: acc.kasbon + Number(p.kasbon_deduction),
        net: acc.net + Number(p.net_amount),
      }),
      { gross: 0, kasbon: 0, net: 0 },
    );
  }, [filteredPayrolls]);

  if (!can("HR", "view")) {
    return (
      <AppLayout>
        <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-slate-200 bg-white px-8 py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-900">Akses Ditolak (403)</h1>
          <p className="mt-2 text-sm text-slate-600">
            Modul Human Resources tidak tersedia untuk role Pegawai maupun Anak PKL.
          </p>
        </div>
      </AppLayout>
    );
  }

  const handleSaveEmployee = (values: EmployeeFormValues) => {
    if (modalMode === "create") {
      const nextId = Math.max(0, ...users.map((u) => u.user_id)) + 1;
      const assignedRole = isOwner
        ? values.role_name
        : values.role_name === "Anak PKL"
          ? "Anak PKL"
          : "Pegawai";
      setUsers((prev) => [
        ...prev,
        {
          user_id: nextId,
          full_name: values.full_name,
          username: values.username,
          phone: values.phone || "-",
          role_name: assignedRole,
          employment_type: values.employment_type,
          pay_scheme: values.pay_scheme,
          base_salary: isOwner ? toDecimalString(values.base_salary) : "0.00",
          start_date: values.start_date,
          end_date: values.end_date,
          status: "Aktif",
          last_login: new Date().toISOString(),
        },
      ]);
      logActivity(
        "HR",
        "CREATE",
        values.username,
        `Menambahkan pekerja baru ${values.full_name} (${assignedRole}).`,
      );
      showToast(
        `Pegawai ${values.full_name} berhasil ditambahkan`,
        "success",
        isOwner
          ? `Role: ${assignedRole}`
          : `Role: ${assignedRole} • Gaji pokok menunggu pengaturan Owner.`,
      );
    } else if (modalMode === "edit" && editingEmployee) {
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === editingEmployee.user_id
            ? {
                ...u,
                full_name: values.full_name,
                phone: values.phone || "-",
                employment_type: values.employment_type,
                pay_scheme: values.pay_scheme,
                start_date: values.start_date,
                end_date: values.end_date,
                ...(isOwner
                  ? {
                      role_name: values.role_name,
                      base_salary: toDecimalString(values.base_salary),
                    }
                  : {}),
              }
            : u,
        ),
      );
      logActivity(
        "HR",
        "UPDATE",
        editingEmployee.username,
        `Memperbarui data pekerja ${values.full_name}.`,
      );
      showToast(`Data pekerja ${values.full_name} berhasil diperbarui`);
    }
    setModalMode(null);
    setEditingEmployee(null);
  };

  const handleSavePayroll = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = users.find((u) => u.user_id === empId);
    if (!emp) return;
    if (Number(kasbon) > Number(gross)) {
      showToast("Potongan kasbon tidak boleh melebihi bruto.", "error");
      return;
    }

    setPayrolls((prev) => [
      {
        payroll_id: Math.max(0, ...prev.map((p) => p.payroll_id)) + 1,
        user_id: emp.user_id,
        employee_name: emp.full_name,
        payment_date: new Date().toISOString().slice(0, 10),
        payment_type: payType,
        gross_amount: toDecimalString(Number(gross) || 0),
        kasbon_deduction: toDecimalString(Number(kasbon) || 0),
        net_amount: netPreview,
        period_label: periodLabel.trim() || "Nov 2026",
        notes: notes.trim() || "-",
      },
      ...prev,
    ]);
    logActivity(
      "HR",
      "CREATE",
      emp.username,
      `Mencatat ${payType} (${periodLabel.trim() || "Nov 2026"}) untuk ${emp.full_name} sebesar ${formatRupiah(netPreview)}.`,
    );
    setNotes("");
    showToast("Data penggajian berhasil disimpan", "success", `Net dibayarkan: ${formatRupiah(netPreview)}`);
  };

  const employeeColumns: ColumnDef<MockUser>[] = [
    {
      key: "name",
      header: "Nama Pekerja",
      render: (u) => (
        <div>
          <p className="font-semibold text-slate-900">{u.full_name}</p>
          <p className="text-xs text-slate-500">{u.phone}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (u) => <StatusBadge status={u.role_name} />,
    },
    {
      key: "emp_type",
      header: "Status & Skema",
      render: (u) => (
        <div className="text-xs">
          <p className="font-medium text-slate-800">{u.employment_type}</p>
          <p className="text-slate-500">{u.pay_scheme}</p>
        </div>
      ),
    },
    {
      key: "tenure",
      header: "Masa Kerja",
      render: (u) => (
        <div className="text-xs text-slate-700">
          <p>Mulai: {formatDate(u.start_date)}</p>
          {u.end_date && <p className="text-slate-500">Selesai: {formatDate(u.end_date)}</p>}
        </div>
      ),
    },
    {
      key: "salary",
      header: "Gaji Pokok",
      align: "right",
      render: (u) =>
        isOwner ? (
          <span className="font-semibold text-slate-900">{formatRupiah(u.base_salary)}</span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
            <Lock className="h-3 w-3" />
            Disembunyikan (Owner-only)
          </span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (u) => <StatusBadge status={u.status} />,
    },
    {
      key: "action",
      header: "Aksi",
      align: "center",
      render: (u) =>
        can("HR", "edit") ? (
          <ActionMenu
            ariaLabel={`Aksi untuk ${u.full_name}`}
            items={[
              {
                label: isOwner ? "Edit Data Pekerja" : "Edit Data Non-Sensitif",
                icon: <Pencil className="h-3.5 w-3.5" />,
                onClick: () => {
                  setEditingEmployee(u);
                  setModalMode("edit");
                },
              },
            ]}
          />
        ) : (
          <span className="text-xs text-slate-400">-</span>
        ),
    },
  ];

  const payrollColumns: ColumnDef<MockPayroll>[] = [
    {
      key: "date",
      header: "Tanggal",
      render: (p) => <span className="text-xs">{formatDate(p.payment_date)}</span>,
    },
    {
      key: "emp",
      header: "Pekerja & Periode",
      render: (p) => (
        <div>
          <p className="font-semibold text-slate-900">{p.employee_name}</p>
          <p className="text-xs text-slate-500">{p.period_label}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Jenis",
      render: (p) => <StatusBadge status={p.payment_type} label={p.payment_type} />,
    },
    {
      key: "gross",
      header: "Bruto",
      align: "right",
      render: (p) => <span>{formatRupiah(p.gross_amount)}</span>,
    },
    {
      key: "kasbon",
      header: "Potongan Kasbon",
      align: "right",
      render: (p) => <span className="text-red-700">{formatRupiah(p.kasbon_deduction)}</span>,
    },
    {
      key: "net",
      header: "Net Diterima",
      align: "right",
      render: (p) => <span className="font-bold text-emerald-900">{formatRupiah(p.net_amount)}</span>,
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Human Resources (HR)"
        description={
          isOwner
            ? "Kelola data seluruh pekerja, masa kerja, gaji pokok, penggajian bulanan/mingguan, dan kasbon."
            : "Mode Manager/SDM (Delegasi Terbatas): Anda dapat menambah Pegawai/Anak PKL serta memperbarui data non-sensitif. Gaji pokok & payroll tetap terkunci khusus Owner."
        }
        actions={
          <button
            type="button"
            onClick={() => {
              setEditingEmployee(null);
              setModalMode("create");
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" />
            {isOwner ? "Tambah Pegawai / Pengguna" : "Tambah Pegawai / PKL"}
          </button>
        }
      />

      <div className="mb-5 flex gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("employees")}
          className={`rounded-lg px-3.5 py-2 text-sm font-medium ${
            activeTab === "employees"
              ? "bg-emerald-900 text-white"
              : "bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          Data Pekerja
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("payroll")}
          className={`rounded-lg px-3.5 py-2 text-sm font-medium ${
            activeTab === "payroll"
              ? "bg-emerald-900 text-white"
              : "bg-white text-slate-700 hover:bg-slate-100"
          }`}
        >
          Payroll &amp; Riwayat (Owner)
        </button>
      </div>

      {activeTab === "employees" && (
        <DataTable
          data={users}
          columns={employeeColumns}
          rowKey={(u) => u.user_id}
          searchPlaceholder="Cari nama pekerja..."
          searchKeys={(u) => `${u.full_name} ${u.role_name} ${u.employment_type}`}
        />
      )}

      {activeTab === "payroll" &&
        (isOwner ? (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="text-base font-bold text-slate-900">Input Penggajian / Kasbon</h2>
              <form onSubmit={handleSavePayroll} className="mt-4 space-y-3.5">
                <FormField label="Pekerja" required>
                  <select
                    value={empId}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      setEmpId(id);
                      const found = users.find((u) => u.user_id === id);
                      if (found) setGross(String(Number(found.base_salary)));
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {users.map((u) => (
                      <option key={u.user_id} value={u.user_id}>
                        {u.full_name} ({u.role_name})
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Jenis Pembayaran" required>
                  <select
                    value={payType}
                    onChange={(e) => setPayType(e.target.value as PayrollType)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="Gaji Bulanan">Gaji Bulanan</option>
                    <option value="Upah Mingguan">Upah Mingguan</option>
                    <option value="Kasbon">Kasbon</option>
                  </select>
                </FormField>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Bruto (Rp)" required>
                    <input
                      type="number"
                      min={0}
                      value={gross}
                      onChange={(e) => setGross(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums"
                    />
                  </FormField>
                  <FormField label="Potongan Kasbon">
                    <input
                      type="number"
                      min={0}
                      value={kasbon}
                      onChange={(e) => setKasbon(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums"
                    />
                  </FormField>
                </div>

                <FormField label="Label Periode">
                  <input
                    type="text"
                    value={periodLabel}
                    onChange={(e) => setPeriodLabel(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </FormField>

                <FormField label="Catatan">
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Opsional"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </FormField>

                <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 p-3 text-sm">
                  <div className="flex justify-between font-bold text-emerald-950">
                    <span>Net Dibayarkan</span>
                    <span className="tabular-nums">{formatRupiah(netPreview)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full rounded-lg bg-emerald-900 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Simpan Penggajian
                </button>
              </form>
            </div>

            <div className="space-y-4 lg:col-span-2">
              {/* Ringkasan Total Periode Terfilter (Proses 5.3 PRD) */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-semibold text-slate-500">Total Bruto</p>
                  <p className="mt-1 text-lg font-bold text-slate-900 tabular-nums">
                    {formatRupiah(payrollTotals.gross)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-[11px] font-semibold text-slate-500">Total Potongan Kasbon</p>
                  <p className="mt-1 text-lg font-bold text-red-700 tabular-nums">
                    {formatRupiah(payrollTotals.kasbon)}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <p className="text-[11px] font-semibold text-emerald-900">Total Net Dibayarkan</p>
                  <p className="mt-1 text-lg font-bold text-emerald-950 tabular-nums">
                    {formatRupiah(payrollTotals.net)}
                  </p>
                </div>
              </div>

              <DataTable
                data={filteredPayrolls}
                columns={payrollColumns}
                rowKey={(p) => p.payroll_id}
                searchPlaceholder="Cari nama pekerja atau periode..."
                searchKeys={(p) => `${p.employee_name} ${p.period_label} ${p.payment_type}`}
                filters={
                  <>
                    <select
                      value={filterEmpId}
                      onChange={(e) => setFilterEmpId(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                    >
                      <option value="ALL">Semua Pekerja</option>
                      {users.map((u) => (
                        <option key={u.user_id} value={String(u.user_id)}>
                          {u.full_name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={filterPeriod}
                      onChange={(e) => setFilterPeriod(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                    >
                      <option value="ALL">Semua Periode</option>
                      {uniquePeriods.map((per) => (
                        <option key={per} value={per}>
                          {per}
                        </option>
                      ))}
                    </select>
                  </>
                }
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-12 text-center">
            <Lock className="h-8 w-8 text-slate-400" />
            <h3 className="mt-3 text-base font-bold text-slate-900">Akses Khusus Owner (403)</h3>
            <p className="mt-1 max-w-md text-sm text-slate-600">
              Fitur payroll dan riwayat penggajian hanya dapat diakses oleh Owner UMKM Keloria.
            </p>
          </div>
        ))}

      <EmployeeFormModal
        open={modalMode !== null}
        mode={modalMode ?? "create"}
        isOwner={isOwner}
        initialUser={editingEmployee}
        existingUsernames={users.map((u) => u.username)}
        onSubmit={handleSaveEmployee}
        onClose={() => {
          setModalMode(null);
          setEditingEmployee(null);
        }}
      />
    </AppLayout>
  );
}
