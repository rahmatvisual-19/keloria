import { created, paginated } from "@/lib/response";
import { parseBody, parseQuery } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { createExpenseSchema, listExpensesQuerySchema } from "@/modules/finance/schema";
import { createExpenseService, listExpensesService } from "@/modules/finance/service";

export const GET = withAuth(
  async (request) => {
    const query = parseQuery(request, listExpensesQuerySchema);
    const result = await listExpensesService(query);
    return paginated(result.items, result.total, result.page, result.limit);
  },
  { permission: ["FINANCE", "view"] },
);

export const POST = withAuth(
  async (request, { user }) => {
    const body = await parseBody(request, createExpenseSchema);
    const saved = await createExpenseService(body, user.user_id);
    return created(saved, "Biaya berhasil dicatat.");
  },
  { permission: ["FINANCE", "create"] },
);
