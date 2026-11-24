import { created, ok } from "@/lib/response";
import { parseBody } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { createMaterialSchema } from "@/modules/scm/schema";
import { createMaterialService, listMaterialsService } from "@/modules/scm/service";

export const GET = withAuth(
  async () => {
    const items = await listMaterialsService();
    return ok(items);
  },
  { permission: ["SCM", "view"] },
);

export const POST = withAuth(
  async (request) => {
    const body = await parseBody(request, createMaterialSchema);
    const saved = await createMaterialService(body);
    return created(saved, "Bahan baku berhasil ditambahkan.");
  },
  { permission: ["SCM", "create"] },
);
