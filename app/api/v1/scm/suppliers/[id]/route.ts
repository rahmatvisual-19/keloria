import { ok } from "@/lib/response";
import { parseBody, parseParams } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { scmIdParamSchema, updateSupplierSchema } from "@/modules/scm/schema";
import { deactivateSupplierService, updateSupplierService } from "@/modules/scm/service";

export const PATCH = withAuth<{ id: string }>(
  async (request, { params }) => {
    const { id } = parseParams(await params, scmIdParamSchema);
    const body = await parseBody(request, updateSupplierSchema);
    const saved = await updateSupplierService(id, body);
    return ok(saved, "Supplier berhasil diperbarui.");
  },
  { permission: ["SCM", "edit"] },
);

export const DELETE = withAuth<{ id: string }>(
  async (_request, { params }) => {
    const { id } = parseParams(await params, scmIdParamSchema);
    const result = await deactivateSupplierService(id);
    return ok(result, "Supplier berhasil dinonaktifkan.");
  },
  { permission: ["SCM", "delete"] },
);
