import { created, paginated } from "@/lib/response";
import { parseBody, parseQuery } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { createProductSchema, listProductsQuerySchema } from "@/modules/sales/schema";
import { createProductService, listProductsService } from "@/modules/sales/service";

export const GET = withAuth(
  async (request) => {
    const query = parseQuery(request, listProductsQuerySchema);
    const result = await listProductsService(query);
    return paginated(result.items, result.total, result.page, result.limit);
  },
  { permission: ["SALES", "view"] },
);

export const POST = withAuth(
  async (request) => {
    const body = await parseBody(request, createProductSchema);
    const product = await createProductService(body);
    return created(product, "Produk berhasil ditambahkan.");
  },
  { permission: ["SALES", "create"] },
);
