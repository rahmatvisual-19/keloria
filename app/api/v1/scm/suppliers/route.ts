import { created, ok } from "@/lib/response";
import { parseBody } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { createSupplierSchema } from "@/modules/scm/schema";
import { createSupplierService, listSuppliersService } from "@/modules/scm/service";

export const GET = withAuth(
  async () => {
    const items = await listSuppliersService();
    return ok(items);
  },
  { permission: ["SCM", "view"] },
);

export const POST = withAuth(
  async (request) => {
    const body = await parseBody(request, createSupplierSchema);
    const saved = await createSupplierService(body);
    return created(saved, "Supplier berhasil ditambahkan.");
  },
  { permission: ["SCM", "create"] },
);
