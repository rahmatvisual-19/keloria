import { created, paginated } from "@/lib/response";
import { parseBody, parseQuery } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { createUserSchema, listUsersQuerySchema } from "@/modules/users/schema";
import { createUserService, listUsersService } from "@/modules/users/service";

/**
 * GET /api/v1/users (Owner-only)
 */
export const GET = withAuth(
  async (request) => {
    const query = parseQuery(request, listUsersQuerySchema);
    const result = await listUsersService(query);
    return paginated(result.items, result.total, result.page, result.limit);
  },
  { roles: ["Owner"] },
);

/**
 * POST /api/v1/users (Owner-only)
 */
export const POST = withAuth(
  async (request) => {
    const body = await parseBody(request, createUserSchema);
    const user = await createUserService(body);
    return created(user, "Pengguna baru berhasil ditambahkan.");
  },
  { roles: ["Owner"] },
);
