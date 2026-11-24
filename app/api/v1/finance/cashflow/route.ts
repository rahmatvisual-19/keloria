import { ok } from "@/lib/response";
import { withAuth } from "@/lib/withAuth";
import { getCashflowAndReceivablesService } from "@/modules/finance/service";

export const GET = withAuth(
  async () => {
    const data = await getCashflowAndReceivablesService();
    return ok(data, "Berhasil memuat ringkasan arus kas dan daftar piutang.");
  },
  { permission: ["FINANCE", "view"] },
);
