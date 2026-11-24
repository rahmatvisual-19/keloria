import { ok } from "@/lib/response";
import { parseParams } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { scmIdParamSchema } from "@/modules/scm/schema";
import { calculateOrderBomService } from "@/modules/scm/service";

export const GET = withAuth<{ id: string }>(
  async (_request, { params }) => {
    const { id } = parseParams(await params, scmIdParamSchema);
    const result = await calculateOrderBomService(id);
    return ok(result, "Berhasil menghitung kebutuhan bahan baku (BOM).");
  },
  { permission: ["SCM", "view"] },
);
