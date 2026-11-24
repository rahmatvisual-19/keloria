import { ok } from "@/lib/response";
import { parseBody, parseParams } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { resetPasswordSchema, userIdParamSchema } from "@/modules/users/schema";
import { resetUserPasswordService } from "@/modules/users/service";

/**
 * POST /api/v1/users/:id/reset-password (Owner-only)
 */
export const POST = withAuth<{ id: string }>(
  async (request, { params }) => {
    const { id } = parseParams(await params, userIdParamSchema);
    const body = await parseBody(request, resetPasswordSchema);
    const result = await resetUserPasswordService(id, body);
    return ok(result, "Kata sandi pengguna berhasil direset.");
  },
  { roles: ["Owner"] },
);
