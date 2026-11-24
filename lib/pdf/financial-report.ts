import PDFDocument from "pdfkit";
import { formatDate, formatRupiah } from "@/lib/client/format";

export interface MonthlyFinancialReportData {
  period: string;
  summary: {
    kas_masuk: string;
    total_expenses: string;
    total_payrolls: string;
    kas_keluar: string;
    piutang: string;
    laba_rugi_bersih: string;
  };
  payments: {
    date: string;
    invoice_number: string;
    term_type: string;
    amount_paid: string;
  }[];
  expenses: {
    date: string;
    category: string;
    description: string;
    amount: string;
  }[];
  payrolls: {
    date: string;
    employee_name: string;
    payment_type: string;
    net_amount: string;
  }[];
}

/**
 * Menghasilkan PDF Laporan Keuangan Bulanan UMKM Keloria (Owner-only).
 */
export async function generateMonthlyFinancialPdf(
  report: MonthlyFinancialReportData,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).font("Helvetica-Bold").fillColor("#14532d").text("UMKM KELORIA");
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .fillColor("#0f172a")
      .text(`Laporan Keuangan Bulanan — Periode ${report.period}`);
    doc.moveDown(0.5);
    doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor("#cbd5e1").stroke();
    doc.moveDown(0.8);

    doc.fontSize(10).font("Helvetica-Bold").text("Ringkasan Keuangan");
    doc.moveDown(0.3);
    doc.font("Helvetica").fontSize(10);
    doc.text(`Kas Masuk (Pembayaran Terverifikasi) : ${formatRupiah(report.summary.kas_masuk)}`);
    doc.text(`Pengeluaran Operasional & Supplier   : ${formatRupiah(report.summary.total_expenses)}`);
    doc.text(`Pengeluaran Payroll (Net)            : ${formatRupiah(report.summary.total_payrolls)}`);
    doc.text(`Total Kas Keluar                     : ${formatRupiah(report.summary.kas_keluar)}`);
    doc.text(`Piutang Belum Lunas (Saldo)          : ${formatRupiah(report.summary.piutang)}`);
    doc
      .font("Helvetica-Bold")
      .text(`Laba / Rugi Bersih                   : ${formatRupiah(report.summary.laba_rugi_bersih)}`);
    doc.moveDown(1);

    doc.font("Helvetica-Bold").fontSize(10).text("Rincian Kas Masuk");
    doc.font("Helvetica").fontSize(9);
    if (report.payments.length === 0) {
      doc.text("Tidak ada transaksi kas masuk pada periode ini.");
    } else {
      for (const p of report.payments) {
        doc.text(
          `${formatDate(p.date)} | ${p.invoice_number} (${p.term_type}) — ${formatRupiah(p.amount_paid)}`,
        );
      }
    }
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").fontSize(10).text("Rincian Biaya (Expenses)");
    doc.font("Helvetica").fontSize(9);
    if (report.expenses.length === 0) {
      doc.text("Tidak ada pencatatan biaya pada periode ini.");
    } else {
      for (const e of report.expenses) {
        doc.text(
          `${formatDate(e.date)} | [${e.category}] ${e.description} — ${formatRupiah(e.amount)}`,
        );
      }
    }
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").fontSize(10).text("Rincian Penggajian (Payroll)");
    doc.font("Helvetica").fontSize(9);
    if (report.payrolls.length === 0) {
      doc.text("Tidak ada pembayaran payroll pada periode ini.");
    } else {
      for (const pr of report.payrolls) {
        doc.text(
          `${formatDate(pr.date)} | ${pr.employee_name} (${pr.payment_type}) — ${formatRupiah(pr.net_amount)}`,
        );
      }
    }

    doc.end();
  });
}
