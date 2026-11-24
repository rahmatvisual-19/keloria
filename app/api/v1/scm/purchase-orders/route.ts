import { created, paginated } from "@/lib/response";
import { parseBody, parseQuery } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { createPurchaseOrderSchema, listPoQuerySchema } from "@/modules/scm/schema";
import { createPurchaseOrderService, listPurchaseOrdersService } from "@/modules/scm/service";

export const GET = withAuth(
  async (request) => {
    const query = parseQuery(request, listPoQuerySchema);
    const result = await listPurchaseOrdersService(query);
    return paginated(result.items, result.total, result.page, result.limit);
  },
  { permission: ["SCM", "view"] },
);

export const POST = withAuth(
  async (request, { user }) => {
    const body = await parseBody(request, createPurchaseOrderSchema);
    const po = await createPurchaseOrderService(body, user.user_id);
    return created(po, "PO supplier berhasil dibuat.");
  },
  { permission: ["SCM", "create"] },
);
