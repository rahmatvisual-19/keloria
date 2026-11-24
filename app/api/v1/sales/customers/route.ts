import { created, paginated } from "@/lib/response";
import { parseBody, parseQuery } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { createCustomerSchema, listCustomersQuerySchema } from "@/modules/sales/schema";
import { createCustomerService, listCustomersService } from "@/modules/sales/service";

export const GET = withAuth(
  async (request) => {
    const query = parseQuery(request, listCustomersQuerySchema);
    const result = await listCustomersService(query);
    return paginated(result.items, result.total, result.page, result.limit);
  },
  { permission: ["SALES", "view"] },
);

export const POST = withAuth(
  async (request) => {
    const body = await parseBody(request, createCustomerSchema);
    const customer = await createCustomerService(body);
    return created(customer, "Pelanggan berhasil ditambahkan.");
  },
  { permission: ["SALES", "create"] },
);
