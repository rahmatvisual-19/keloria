import { created, paginated } from "@/lib/response";
import { parseBody, parseQuery } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { createOrderSchema, listOrdersQuerySchema } from "@/modules/sales/schema";
import { createOrderService, listOrdersService } from "@/modules/sales/service";

export const GET = withAuth(
  async (request) => {
    const query = parseQuery(request, listOrdersQuerySchema);
    const result = await listOrdersService(query);
    return paginated(result.items, result.total, result.page, result.limit);
  },
  { permission: ["SALES", "view"] },
);

export const POST = withAuth(
  async (request, { user }) => {
    const body = await parseBody(request, createOrderSchema);
    const result = await createOrderService(body, user.user_id);
    return created(result, "Pesanan berhasil dibuat beserta invoice awal.");
  },
  { permission: ["SALES", "create"] },
);
