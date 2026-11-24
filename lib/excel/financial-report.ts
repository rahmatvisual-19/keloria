import ExcelJS from "exceljs";
import { MonthlyFinancialReportData } from "@/lib/pdf/financial-report";

/**
 * Menghasilkan workbook Excel (.xlsx) Laporan Keuangan Bulanan UMKM Keloria (Owner-only).
 */
export async function generateMonthlyFinancialExcel(
  report: MonthlyFinancialReportData,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Kelo-ERP UMKM Keloria";
  workbook.created = new Date();

  // Sheet 1: Ringkasan
  const summarySheet = workbook.addWorksheet("Ringkasan");
  summarySheet.columns = [
    { header: "Komponen", key: "label", width: 38 },
    { header: "Nominal (Rp)", key: "amount", width: 22 },
  ];
  summarySheet.addRow({ label: `Periode Laporan`, amount: report.period });
  summarySheet.addRow({ label: "Kas Masuk (Pembayaran Terverifikasi)", amount: Number(report.summary.kas_masuk) });
  summarySheet.addRow({ label: "Total Biaya (Expenses)", amount: Number(report.summary.total_expenses) });
  summarySheet.addRow({ label: "Total Penggajian (Payroll Net)", amount: Number(report.summary.total_payrolls) });
  summarySheet.addRow({ label: "Total Kas Keluar", amount: Number(report.summary.kas_keluar) });
  summarySheet.addRow({ label: "Piutang Belum Lunas", amount: Number(report.summary.piutang) });
  summarySheet.addRow({ label: "Laba / Rugi Bersih", amount: Number(report.summary.laba_rugi_bersih) });

  // Sheet 2: Kas Masuk
  const inSheet = workbook.addWorksheet("Kas Masuk");
  inSheet.columns = [
    { header: "Tanggal", key: "date", width: 16 },
    { header: "No. Invoice", key: "invoice_number", width: 20 },
    { header: "Tahap", key: "term_type", width: 18 },
    { header: "Nominal (Rp)", key: "amount_paid", width: 18 },
  ];
  for (const p of report.payments) {
    inSheet.addRow({
      date: p.date.slice(0, 10),
      invoice_number: p.invoice_number,
      term_type: p.term_type,
      amount_paid: Number(p.amount_paid),
    });
  }

  // Sheet 3: Biaya & Payroll
  const outSheet = workbook.addWorksheet("Kas Keluar");
  outSheet.columns = [
    { header: "Tanggal", key: "date", width: 16 },
    { header: "Jenis", key: "source", width: 18 },
    { header: "Kategori / Pekerja", key: "category", width: 24 },
    { header: "Keterangan", key: "description", width: 40 },
    { header: "Nominal (Rp)", key: "amount", width: 18 },
  ];
  for (const e of report.expenses) {
    outSheet.addRow({
      date: e.date.slice(0, 10),
      source: "Biaya",
      category: e.category,
      description: e.description,
      amount: Number(e.amount),
    });
  }
  for (const pr of report.payrolls) {
    outSheet.addRow({
      date: pr.date.slice(0, 10),
      source: "Payroll",
      category: pr.employee_name,
      description: pr.payment_type,
      amount: Number(pr.net_amount),
    });
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
