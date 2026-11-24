import { ok } from "@/lib/response";
import { withAuth } from "@/lib/withAuth";
import { getStockAlertsService } from "@/modules/scm/service";

export const GET = withAuth(
  async () => {
    const result = await getStockAlertsService();
    return ok(result, "Berhasil memuat daftar peringatan stok minimum.");
  },
  { permission: ["SCM", "view"] },
);
