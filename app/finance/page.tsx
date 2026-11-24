"use client";

import React, { useMemo, useState } from "react";
import { CheckCircle2, Download, FileText, Lock, Plus, Upload, X } from "lucide-react";
import { AppLayout } from "@/components/layouts/AppLayout";
import { useAppStore } from "@/components/providers/AppStoreProvider";
import { ActionMenu, ActionMenuItem } from "@/components/ui/ActionMenu";
import { ColumnDef, DataTable } from "@/components/ui/DataTable";
import { FormField } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { formatDate, formatRupiah } from "@/lib/client/format";
import { toDecimalString } from "@/lib/money";
import { MockExpense, MockInvoice } from "@/lib/mock/data";
import { ExpenseCategory } from "@/lib/types/domain";

type FinanceTab = "invoices" | "expenses" | "cashflow" | "report";

const MAX_PROOF_BYTES = 2 * 1024 * 1024; // 2 MB
const ALLOWED_EXT = /\.(jpg|jpeg|png|pdf)$/i;

export default function FinancePage() {
  const {
    currentUser,
    isOwner,
    can,
    invoices,
    setInvoices,
    setOrders,
    expenses,
    setExpenses,
    payrolls,
    logActivity,
  } = useAppStore();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<FinanceTab>("invoices");
  const [reportMonth, setReportMonth] = useState<string>("2026-11");
  const [verifyingInvoice, setVerifyingInvoice] = useState<MockInvoice | null>(null);
  const [payMethod, setPayMethod] = useState("Transfer BCA");
  const [proofNote, setProofNote] = useState("");
  const [proofFileName, setProofFileName] = useState<string | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);

  // Form tambah biaya
  const [expModalOpen, setExpModalOpen] = useState(false);
  const [expCategory, setExpCategory] = useState<ExpenseCategory>("Operasional");
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");

  // Ringkasan Arus Kas keseluruhan
  const summary = useMemo(() => {
    const kasMasuk = invoices.reduce((acc, i) => acc + Number(i.amount_paid), 0);
    const totalBiaya = expenses.reduce((acc, e) => acc + Number(e.amount), 0);
    const totalPayroll = payrolls.reduce((acc, p) => acc + Number(p.net_amount), 0);
    const kasKeluar = totalBiaya + totalPayroll;
    const piutang = invoices
      .filter((i) => i.payment_status !== "Lunas")
      .reduce((acc, i) => acc + Math.max(0, Number(i.total_billed) - Number(i.amount_paid)), 0);
    const labaRugi = kasMasuk - kasKeluar;
    return { kasMasuk, totalBiaya, totalPayroll, kasKeluar, piutang, labaRugi };
  }, [invoices, expenses, payrolls]);

  // Laporan Bulanan terfilter periode YYYY-MM + rincian transaksi sesuai Kamus Data PRD
  const monthlyReport = useMemo(() => {
    const monthInvoices = invoices.filter(
      (i) => i.issued_date.startsWith(reportMonth) && Number(i.amount_paid) > 0,
    );
    const monthExpenses = expenses.filter((e) => e.expense_date.startsWith(reportMonth));
    const monthPayrolls = payrolls.filter((p) => p.payment_date.startsWith(reportMonth));

    const kasMasuk = monthInvoices.reduce((acc, i) => acc + Number(i.amount_paid), 0);
    const totalBiaya = monthExpenses.reduce((acc, e) => acc + Number(e.amount), 0);
    const totalPayroll = monthPayrolls.reduce((acc, p) => acc + Number(p.net_amount), 0);
    const kasKeluar = totalBiaya + totalPayroll;
    const piutang = invoices
      .filter((i) => i.payment_status !== "Lunas")
      .reduce((acc, i) => acc + Math.max(0, Number(i.total_billed) - Number(i.amount_paid)), 0);
    const labaRugi = kasMasuk - kasKeluar;

    const transactions = [
      ...monthInvoices.map((i) => ({
        id: `in-${i.invoice_id}`,
        date: i.issued_date,
        type: "Kas Masuk" as const,
        ref: i.invoice_number,
        description: `${i.customer_name} (${i.invoice_type})`,
        amount: Number(i.amount_paid),
      })),
      ...monthExpenses.map((e) => ({
        id: `exp-${e.expense_id}`,
        date: e.expense_date,
        type: "Biaya" as const,
        ref: e.po_number ?? e.category,
        description: e.description,
        amount: -Number(e.amount),
      })),
      ...monthPayrolls.map((p) => ({
        id: `pay-${p.payroll_id}`,
        date: p.payment_date,
        type: "Payroll" as const,
        ref: p.period_label,
        description: `${p.employee_name} — ${p.payment_type}`,
        amount: -Number(p.net_amount),
      })),
    ].sort((a, b) => b.date.localeCompare(a.date));

    return { kasMasuk, totalBiaya, totalPayroll, kasKeluar, piutang, labaRugi, transactions };
  }, [invoices, expenses, payrolls, reportMonth]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProofError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setProofFileName(null);
      return;
    }
    if (!ALLOWED_EXT.test(file.name)) {
      setProofError("Format berkas harus .jpg, .jpeg, .png, atau .pdf.");
      setProofFileName(null);
      return;
    }
    if (file.size > MAX_PROOF_BYTES) {
      setProofError("Ukuran berkas melebihi batas maksimal 2 MB.");
      setProofFileName(null);
      return;
    }
    setProofFileName(file.name);
  };

  const handleVerifyPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingInvoice || proofError) return;

    const nextPayStatus = verifyingInvoice.invoice_type === "DP_50" ? "DP_Terbayar" : "Lunas";

    setInvoices((prev) =>
      prev.map((inv) =>
        inv.invoice_id === verifyingInvoice.invoice_id
          ? {
              ...inv,
              amount_paid: inv.total_billed,
              payment_status: nextPayStatus,
              proof_note: `${payMethod}${proofNote ? ` — ${proofNote}` : ""}${
                proofFileName ? ` (${proofFileName})` : ""
              }`,
            }
          : inv,
      ),
    );

    // Sinkronkan status order terkait (aturan bisnis #3 & #7)
    setOrders((prev) =>
      prev.map((o) => {
        if (o.order_number !== verifyingInvoice.order_number) return o;
        if (verifyingInvoice.invoice_type === "DP_50") {
          return {
            ...o,
            order_status: "DP_Lunas",
            logs: [
              ...o.logs,
              {
                from_status: o.order_status,
                to_status: "DP_Lunas",
                changed_by: currentUser?.full_name ?? "Finance",
                changed_at: new Date().toISOString(),
                note: `DP 50% (${verifyingInvoice.invoice_number}) diverifikasi. Kalkulator BOM & produksi dibuka.`,
              },
            ],
          };
        }
        return {
          ...o,
          settlement_paid: true,
          order_status:
            o.order_channel === "Online" && o.order_status === "Menunggu_Pembayaran"
              ? "Packing"
              : o.order_status,
        };
      }),
    );

    logActivity(
      "FINANCE",
      "VERIFY",
      verifyingInvoice.invoice_number,
      `Memverifikasi pembayaran ${formatRupiah(verifyingInvoice.total_billed)} (${payMethod}) untuk ${verifyingInvoice.order_number}.`,
    );

    showToast(
      `Pembayaran ${verifyingInvoice.invoice_number} terverifikasi`,
      "success",
      verifyingInvoice.invoice_type === "DP_50"
        ? "Status order otomatis berubah menjadi DP Lunas."
        : "Invoice berstatus Lunas; pengiriman kini diizinkan.",
    );
    setVerifyingInvoice(null);
    setProofNote("");
    setProofFileName(null);
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = Number(expAmount);
    if (!expDesc.trim() || !Number.isFinite(numeric) || numeric <= 0) return;

    setExpenses((prev) => [
      {
        expense_id: prev.length + 1,
        po_number: null,
        expense_date: new Date().toISOString().slice(0, 10),
        category: expCategory,
        description: expDesc.trim(),
        amount: toDecimalString(numeric),
        recorded_by: currentUser?.full_name ?? "Staf Finance",
      },
      ...prev,
    ]);
    logActivity(
      "FINANCE",
      "CREATE",
      expCategory,
      `Mencatat biaya ${expCategory}: ${expDesc.trim()} (${formatRupiah(numeric)}).`,
    );
    setExpModalOpen(false);
    setExpDesc("");
    setExpAmount("");
    showToast("Biaya berhasil dicatat");
  };

  const invoiceColumns: ColumnDef<MockInvoice>[] = [
    {
      key: "inv",
      header: "No. Invoice",
      render: (i) => (
        <div>
          <p className="font-semibold text-slate-900">{i.invoice_number}</p>
          <p className="text-xs text-slate-500">Order: {i.order_number}</p>
        </div>
      ),
    },
    {
      key: "cust",
      header: "Pelanggan & Jenis",
      render: (i) => (
        <div>
          <p className="font-medium text-slate-900">{i.customer_name}</p>
          <p className="text-xs text-slate-500">
            {i.invoice_type === "DP_50"
              ? "Tagihan DP 50%"
              : i.invoice_type === "PELUNASAN"
                ? "Pelunasan + Ongkir"
                : "Bayar Penuh (B2C)"}
          </p>
        </div>
      ),
    },
    {
      key: "date",
      header: "Tanggal Terbit",
      render: (i) => <span className="text-xs">{formatDate(i.issued_date)}</span>,
    },
    {
      key: "billed",
      header: "Total Tagihan",
      align: "right",
      render: (i) => <span className="font-semibold">{formatRupiah(i.total_billed)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (i) => <StatusBadge status={i.payment_status} />,
    },
    {
      key: "action",
      header: "Aksi",
      align: "center",
      render: (i) => {
        const items: ActionMenuItem[] = [];
        if (i.payment_status === "Belum_Bayar" && can("FINANCE", "edit")) {
          items.push({
            label: "Verifikasi Pembayaran",
            icon: <CheckCircle2 className="h-3.5 w-3.5" />,
            variant: "primary",
            onClick: () => {
              setVerifyingInvoice(i);
              setProofError(null);
              setProofFileName(null);
            },
          });
        }
        items.push({
          label: "Unduh PDF Invoice",
          icon: <FileText className="h-3.5 w-3.5" />,
          onClick: () =>
            showToast(
              `Pratinjau PDF ${i.invoice_number}`,
              "info",
              "Unduh PDF langsung via /api/v1/finance/invoices/:id/pdf saat database aktif.",
            ),
        });
        return <ActionMenu items={items} ariaLabel={`Aksi untuk ${i.invoice_number}`} />;
      },
    },
  ];

  const expenseColumns: ColumnDef<MockExpense>[] = [
    {
      key: "date",
      header: "Tanggal",
      render: (e) => <span className="text-xs">{formatDate(e.expense_date)}</span>,
    },
    {
      key: "category",
      header: "Kategori",
      render: (e) => <StatusBadge status={e.category} label={e.category} />,
    },
    {
      key: "desc",
      header: "Keterangan",
      render: (e) => (
        <div>
          <p className="font-medium text-slate-900">{e.description}</p>
          {e.po_number && <p className="text-xs text-slate-500">Ref PO: {e.po_number}</p>}
        </div>
      ),
    },
    {
      key: "by",
      header: "Dicatat Oleh",
      render: (e) => <span className="text-xs text-slate-600">{e.recorded_by}</span>,
    },
    {
      key: "amount",
      header: "Nominal",
      align: "right",
      render: (e) => <span className="font-semibold text-red-700">{formatRupiah(e.amount)}</span>,
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Finance & Accounting"
        description="Kelola invoice DP 50% & pelunasan, verifikasi pembayaran, pencatatan biaya, arus kas, dan laporan keuangan bulanan."
        actions={
          can("FINANCE", "create") ? (
            <button
              type="button"
              onClick={() => setExpModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              <Plus className="h-4 w-4" />
              Catat Biaya
            </button>
          ) : null
        }
      />

      {!can("FINANCE", "edit") && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-900">
          Anda masuk dengan izin <strong>Lihat Saja (View-Only)</strong> pada modul Finance.
          Verifikasi pembayaran dan pencatatan biaya dinonaktifkan sesuai matriks RBAC.
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {(
          [
            { id: "invoices", label: "Invoice & Verifikasi" },
            { id: "expenses", label: "Biaya (Expenses)" },
            { id: "cashflow", label: "Arus Kas & Piutang" },
            { id: "report", label: "Laporan Bulanan (Owner)" },
          ] as { id: FinanceTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-emerald-900 text-white"
                : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "invoices" && (
        <DataTable
          data={invoices}
          columns={invoiceColumns}
          rowKey={(i) => i.invoice_id}
          searchPlaceholder="Cari nomor invoice, order, atau pelanggan..."
          searchKeys={(i) => `${i.invoice_number} ${i.order_number} ${i.customer_name}`}
        />
      )}

      {activeTab === "expenses" && (
        <DataTable
          data={expenses}
          columns={expenseColumns}
          rowKey={(e) => e.expense_id}
          searchPlaceholder="Cari keterangan atau kategori biaya..."
          searchKeys={(e) => `${e.description} ${e.category} ${e.po_number ?? ""}`}
        />
      )}

      {activeTab === "cashflow" && (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold text-slate-500">Kas Masuk Terverifikasi</p>
              <p className="mt-1.5 text-2xl font-bold text-emerald-800 tabular-nums">
                {formatRupiah(summary.kasMasuk)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold text-slate-500">Total Kas Keluar (Biaya + Payroll)</p>
              <p className="mt-1.5 text-2xl font-bold text-red-700 tabular-nums">
                {formatRupiah(summary.kasKeluar)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold text-slate-500">Total Piutang Belum Lunas</p>
              <p className="mt-1.5 text-2xl font-bold text-amber-700 tabular-nums">
                {formatRupiah(summary.piutang)}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-base font-bold text-slate-900">Daftar Piutang Aktif</h3>
            <div className="divide-y divide-slate-100 text-sm">
              {invoices
                .filter((i) => i.payment_status !== "Lunas")
                .map((i) => {
                  const sisa = Math.max(0, Number(i.total_billed) - Number(i.amount_paid));
                  return (
                    <div key={i.invoice_id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {i.invoice_number} — {i.customer_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          Terbit {formatDate(i.issued_date)} • Jenis: {i.invoice_type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-amber-800 tabular-nums">{formatRupiah(sisa)}</p>
                        <StatusBadge status={i.payment_status} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {activeTab === "report" &&
        (isOwner ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Laporan Keuangan Bulanan — Periode {reportMonth}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Rekap otomatis kas masuk, kas keluar (biaya &amp; payroll), piutang, dan
                    laba/rugi bersih beserta rincian transaksi.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="month"
                    aria-label="Pilih periode bulan laporan"
                    value={reportMonth}
                    onChange={(e) => setReportMonth(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      showToast(
                        `Laporan PDF ${reportMonth} siap`,
                        "info",
                        "Unduh PDF langsung via /api/v1/reports/financial?format=pdf saat database aktif.",
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Unduh PDF
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      showToast(
                        `Laporan Excel ${reportMonth} siap`,
                        "info",
                        "Unduh Excel langsung via /api/v1/reports/financial?format=excel saat database aktif.",
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Unduh Excel (.xlsx)
                  </button>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-emerald-50/70 p-4">
                  <p className="text-xs text-emerald-900">Kas Masuk ({reportMonth})</p>
                  <p className="mt-1 text-xl font-bold text-emerald-950 tabular-nums">
                    {formatRupiah(monthlyReport.kasMasuk)}
                  </p>
                </div>
                <div className="rounded-lg bg-red-50/70 p-4">
                  <p className="text-xs text-red-900">Kas Keluar ({reportMonth})</p>
                  <p className="mt-1 text-xl font-bold text-red-950 tabular-nums">
                    {formatRupiah(monthlyReport.kasKeluar)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-red-800">
                    Biaya {formatRupiah(monthlyReport.totalBiaya)} + Payroll{" "}
                    {formatRupiah(monthlyReport.totalPayroll)}
                  </p>
                </div>
                <div className="rounded-lg bg-amber-50/70 p-4">
                  <p className="text-xs text-amber-900">Saldo Piutang Berjalan</p>
                  <p className="mt-1 text-xl font-bold text-amber-950 tabular-nums">
                    {formatRupiah(monthlyReport.piutang)}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-900 p-4 text-white">
                  <p className="text-xs text-slate-300">Laba / Rugi Bersih</p>
                  <p className="mt-1 text-xl font-bold tabular-nums">
                    {formatRupiah(monthlyReport.labaRugi)}
                  </p>
                </div>
              </div>
            </div>

            {/* Tabel Rincian Transaksi sesuai Kamus Data Laporan_Keuangan */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
              <div className="border-b border-slate-200 px-5 py-3.5">
                <h3 className="text-sm font-bold text-slate-900">
                  Rincian Transaksi Periode {reportMonth} ({monthlyReport.transactions.length})
                </h3>
              </div>
              {monthlyReport.transactions.length === 0 ? (
                <p className="p-8 text-center text-xs text-slate-500">
                  Belum ada transaksi kas masuk, biaya, atau payroll pada periode {reportMonth}.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th className="px-4 py-2.5">Tanggal</th>
                        <th className="px-4 py-2.5">Jenis</th>
                        <th className="px-4 py-2.5">Referensi</th>
                        <th className="px-4 py-2.5">Keterangan</th>
                        <th className="px-4 py-2.5 text-right">Nominal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {monthlyReport.transactions.map((trx) => (
                        <tr key={trx.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(trx.date)}</td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                trx.type === "Kas Masuk"
                                  ? "bg-emerald-50 text-emerald-800"
                                  : trx.type === "Payroll"
                                    ? "bg-sky-50 text-sky-800"
                                    : "bg-red-50 text-red-700"
                              }`}
                            >
                              {trx.type}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-slate-700">
                            {trx.ref}
                          </td>
                          <td className="px-4 py-2.5 text-slate-800">{trx.description}</td>
                          <td
                            className={`px-4 py-2.5 text-right font-semibold tabular-nums ${
                              trx.amount >= 0 ? "text-emerald-800" : "text-red-700"
                            }`}
                          >
                            {trx.amount >= 0 ? "+" : "-"}
                            {formatRupiah(Math.abs(trx.amount))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-12 text-center">
            <Lock className="h-8 w-8 text-slate-400" />
            <h3 className="mt-3 text-base font-bold text-slate-900">Akses Khusus Owner (403)</h3>
            <p className="mt-1 max-w-md text-sm text-slate-600">
              Laporan keuangan bulanan dan ekspor PDF/Excel dikunci khusus untuk Owner.
            </p>
          </div>
        ))}

      {/* Modal Verifikasi Pembayaran */}
      {verifyingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                Verifikasi Pembayaran {verifyingInvoice.invoice_number}
              </h2>
              <button
                type="button"
                onClick={() => setVerifyingInvoice(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleVerifyPayment} className="mt-4 space-y-4">
              <div className="rounded-lg bg-slate-50 p-3 text-xs">
                <p className="text-slate-600">Pelanggan: {verifyingInvoice.customer_name}</p>
                <p className="mt-1 text-sm font-bold text-slate-900 tabular-nums">
                  Nominal Tagihan: {formatRupiah(verifyingInvoice.total_billed)}
                </p>
              </div>

              <FormField label="Metode Pembayaran" required>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="Transfer BCA">Transfer BCA</option>
                  <option value="Transfer Mandiri">Transfer Mandiri</option>
                  <option value="QRIS">QRIS</option>
                  <option value="Tunai">Tunai</option>
                </select>
              </FormField>

              <FormField
                label="Unggah Bukti Bayar (.jpg/.jpeg/.png/.pdf, maks 2 MB)"
                error={proofError ?? undefined}
              >
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-xs text-slate-600 hover:bg-slate-50">
                  <Upload className="h-4 w-4 text-slate-400" />
                  <span>{proofFileName ?? "Pilih berkas bukti transfer..."}</span>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </FormField>

              <FormField label="Catatan Verifikasi">
                <input
                  type="text"
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  placeholder="Contoh: Mutasi masuk pukul 10:15 WIB"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </FormField>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVerifyingInvoice(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={Boolean(proofError)}
                  className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-40"
                >
                  Konfirmasi Verifikasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Catat Biaya */}
      {expModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">Catat Biaya Operasional</h2>
              <button
                type="button"
                onClick={() => setExpModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="mt-4 space-y-4">
              <FormField label="Kategori Biaya" required>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="Operasional">Operasional</option>
                  <option value="Kemasan">Kemasan</option>
                  <option value="Ongkir">Ongkir</option>
                  <option value="Pembelian Supplier">Pembelian Supplier</option>
                  <option value="Lain">Lain</option>
                </select>
              </FormField>
              <FormField label="Deskripsi" required>
                <input
                  type="text"
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                  placeholder="Contoh: Pembelian gas LPG produksi"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </FormField>
              <FormField label="Nominal (Rp)" required>
                <input
                  type="number"
                  min={1000}
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  placeholder="Contoh: 150000"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums"
                  required
                />
              </FormField>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setExpModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Simpan Biaya
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
