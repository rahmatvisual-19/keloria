import { ok } from "@/lib/response";
import { parseParams } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { hrIdParamSchema } from "@/modules/hr/schema";
import { deletePayrollService } from "@/modules/hr/service";

/**
 * DELETE /api/v1/hr/payrolls/:id (Owner-only)
 */
export const DELETE = withAuth<{ id: string }>(
  async (_request, { params }) => {
    const { id } = parseParams(await params, hrIdParamSchema);
    const result = await deletePayrollService(id);
    return ok(result, "Data penggajian berhasil dihapus.");
  },
  { roles: ["Owner"] },
);
