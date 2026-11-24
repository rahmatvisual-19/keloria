import { generateMonthlyFinancialExcel } from "@/lib/excel/financial-report";
import { generateMonthlyFinancialPdf } from "@/lib/pdf/financial-report";
import { ok } from "@/lib/response";
import { parseQuery } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { financialReportQuerySchema } from "@/modules/finance/schema";
import { getMonthlyFinancialReportService } from "@/modules/finance/service";

/**
 * GET /api/v1/reports/financial?month=2026-11&format=json|pdf|excel
 * Owner-only hard guard.
 */
export const GET = withAuth(
  async (request) => {
    const query = parseQuery(request, financialReportQuerySchema);
    const report = await getMonthlyFinancialReportService(query);

    if (query.format === "pdf") {
      const pdfBuffer = await generateMonthlyFinancialPdf(report);
      return new Response(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="laporan-keuangan-${report.period}.pdf"`,
        },
      });
    }

    if (query.format === "excel") {
      const excelBuffer = await generateMonthlyFinancialExcel(report);
      return new Response(new Uint8Array(excelBuffer), {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="laporan-keuangan-${report.period}.xlsx"`,
        },
      });
    }

    return ok(report, `Laporan keuangan periode ${report.period} berhasil dimuat.`);
  },
  { roles: ["Owner"] },
);
