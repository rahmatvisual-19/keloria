import { ok } from "@/lib/response";
import { parseBody } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { stockPreparationSchema } from "@/modules/scm/schema";
import { recordStockPreparationService } from "@/modules/scm/service";

export const POST = withAuth(
  async (request) => {
    const body = await parseBody(request, stockPreparationSchema);
    const result = await recordStockPreparationService(body);
    return ok(result, "Stok online produk berhasil ditambahkan.");
  },
  { permission: ["SCM", "edit"] },
);
