import { ok } from "@/lib/response";
import { parseBody, parseParams } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { updateUserSchema, userIdParamSchema } from "@/modules/users/schema";
import { getUserDetailService, updateUserService } from "@/modules/users/service";

/**
 * GET /api/v1/users/:id (Owner-only)
 */
export const GET = withAuth<{ id: string }>(
  async (_request, { params }) => {
    const { id } = parseParams(await params, userIdParamSchema);
    const user = await getUserDetailService(id);
    return ok(user);
  },
  { roles: ["Owner"] },
);

/**
 * PATCH /api/v1/users/:id (Owner-only)
 */
export const PATCH = withAuth<{ id: string }>(
  async (request, { params, user }) => {
    const { id } = parseParams(await params, userIdParamSchema);
    const body = await parseBody(request, updateUserSchema);
    const updated = await updateUserService(id, body, user.user_id);
    return ok(updated, "Data pengguna berhasil diperbarui.");
  },
  { roles: ["Owner"] },
);
