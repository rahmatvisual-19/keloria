import { ok } from "@/lib/response";
import { parseBody, parseParams } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { scmIdParamSchema, updateMaterialSchema } from "@/modules/scm/schema";
import { deactivateMaterialService, updateMaterialService } from "@/modules/scm/service";

export const PATCH = withAuth<{ id: string }>(
  async (request, { params }) => {
    const { id } = parseParams(await params, scmIdParamSchema);
    const body = await parseBody(request, updateMaterialSchema);
    const saved = await updateMaterialService(id, body);
    return ok(saved, "Bahan baku berhasil diperbarui.");
  },
  { permission: ["SCM", "edit"] },
);

export const DELETE = withAuth<{ id: string }>(
  async (_request, { params }) => {
    const { id } = parseParams(await params, scmIdParamSchema);
    const result = await deactivateMaterialService(id);
    return ok(result, "Bahan baku berhasil dinonaktifkan.");
  },
  { permission: ["SCM", "delete"] },
);
