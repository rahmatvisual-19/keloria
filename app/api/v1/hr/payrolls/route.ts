import { created, ok } from "@/lib/response";
import { parseBody, parseQuery } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { createPayrollSchema, listPayrollsQuerySchema } from "@/modules/hr/schema";
import { createPayrollService, listPayrollsService } from "@/modules/hr/service";

/**
 * GET /api/v1/hr/payrolls (Owner-only hard guard)
 */
export const GET = withAuth(
  async (request) => {
    const query = parseQuery(request, listPayrollsQuerySchema);
    const result = await listPayrollsService(query);
    return ok(
      {
        items: result.items,
        totals: result.totals,
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          total_pages: Math.max(1, Math.ceil(result.total / result.limit)),
        },
      },
      "Berhasil memuat riwayat penggajian.",
    );
  },
  { roles: ["Owner"] },
);

/**
 * POST /api/v1/hr/payrolls (Owner-only hard guard)
 */
export const POST = withAuth(
  async (request, { user }) => {
    const body = await parseBody(request, createPayrollSchema);
    const saved = await createPayrollService(body, user.user_id);
    return created(saved, "Data penggajian berhasil dicatat.");
  },
  { roles: ["Owner"] },
);
