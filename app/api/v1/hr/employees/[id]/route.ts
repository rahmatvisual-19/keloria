import { ok } from "@/lib/response";
import { parseBody, parseParams } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { hrIdParamSchema, updateEmployeeNonSensitiveSchema } from "@/modules/hr/schema";
import { updateEmployeeNonSensitiveService } from "@/modules/hr/service";

/**
 * PATCH /api/v1/hr/employees/:id
 * Memerlukan HR.edit. Hanya memperbarui field non-sensitif (full_name, phone, employment_type, pay_scheme).
 */
export const PATCH = withAuth<{ id: string }>(
  async (request, { params, user }) => {
    const { id } = parseParams(await params, hrIdParamSchema);
    const body = await parseBody(request, updateEmployeeNonSensitiveSchema);
    const updated = await updateEmployeeNonSensitiveService(id, body, user.role_name);
    return ok(updated, "Data pekerja berhasil diperbarui.");
  },
  { permission: ["HR", "edit"] },
);
