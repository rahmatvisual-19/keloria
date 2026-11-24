import { paginated } from "@/lib/response";
import { parseQuery } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { listInvoicesQuerySchema } from "@/modules/finance/schema";
import { listInvoicesService } from "@/modules/finance/service";

export const GET = withAuth(
  async (request) => {
    const query = parseQuery(request, listInvoicesQuerySchema);
    const result = await listInvoicesService(query);
    return paginated(result.items, result.total, result.page, result.limit);
  },
  { permission: ["FINANCE", "view"] },
);
