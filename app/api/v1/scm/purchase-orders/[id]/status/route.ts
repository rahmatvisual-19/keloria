import { ok } from "@/lib/response";
import { parseBody, parseParams } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { scmIdParamSchema, updatePoStatusSchema } from "@/modules/scm/schema";
import { updatePoStatusService } from "@/modules/scm/service";

export const PATCH = withAuth<{ id: string }>(
  async (request, { params, user }) => {
    const { id } = parseParams(await params, scmIdParamSchema);
    const body = await parseBody(request, updatePoStatusSchema);
    const result = await updatePoStatusService(id, body, user.user_id);
    return ok(result, "Status PO supplier berhasil diperbarui.");
  },
  { permission: ["SCM", "edit"] },
);
