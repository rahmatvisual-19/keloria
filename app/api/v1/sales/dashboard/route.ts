import { ok } from "@/lib/response";
import { parseQuery } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { salesDashboardQuerySchema } from "@/modules/sales/schema";
import { getSalesDashboardService } from "@/modules/sales/service";

/**
 * GET /api/v1/sales/dashboard (Owner-only hard guard)
 * Perbandingan transaksi dan omzet B2B vs B2C per bulan.
 */
export const GET = withAuth(
  async (request) => {
    const query = parseQuery(request, salesDashboardQuerySchema);
    const result = await getSalesDashboardService(query);
    return ok(result, "Berhasil memuat dasbor penjualan B2B vs B2C.");
  },
  { roles: ["Owner"] },
);
