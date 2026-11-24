import { ok } from "@/lib/response";
import { parseBody, parseParams } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { advanceOrderStatusSchema, scmIdParamSchema } from "@/modules/scm/schema";
import { advanceOrderStatusService } from "@/modules/scm/service";

export const PATCH = withAuth<{ id: string }>(
  async (request, { params, user }) => {
    const { id } = parseParams(await params, scmIdParamSchema);
    const body = await parseBody(request, advanceOrderStatusSchema);
    const result = await advanceOrderStatusService(id, body, user.user_id);
    return ok(result, "Status produksi/logistik pesanan berhasil diperbarui.");
  },
  { permission: ["SCM", "edit"] },
);
