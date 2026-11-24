import { ok } from "@/lib/response";
import { parseBody, parseParams } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { financeIdParamSchema, updateExpenseSchema } from "@/modules/finance/schema";
import { deleteExpenseService, updateExpenseService } from "@/modules/finance/service";

export const PATCH = withAuth<{ id: string }>(
  async (request, { params }) => {
    const { id } = parseParams(await params, financeIdParamSchema);
    const body = await parseBody(request, updateExpenseSchema);
    const saved = await updateExpenseService(id, body);
    return ok(saved, "Data biaya berhasil diperbarui.");
  },
  { permission: ["FINANCE", "edit"] },
);

export const DELETE = withAuth<{ id: string }>(
  async (_request, { params }) => {
    const { id } = parseParams(await params, financeIdParamSchema);
    const result = await deleteExpenseService(id);
    return ok(result, "Data biaya berhasil dihapus.");
  },
  { permission: ["FINANCE", "delete"] },
);
