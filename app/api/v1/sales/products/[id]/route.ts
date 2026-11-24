import { ok } from "@/lib/response";
import { parseBody, parseParams } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { idParamSchema, updateProductSchema } from "@/modules/sales/schema";
import {
  deactivateProductService,
  getProductDetailService,
  updateProductService,
} from "@/modules/sales/service";

export const GET = withAuth<{ id: string }>(
  async (_request, { params }) => {
    const { id } = parseParams(await params, idParamSchema);
    const product = await getProductDetailService(id);
    return ok(product);
  },
  { permission: ["SALES", "view"] },
);

export const PATCH = withAuth<{ id: string }>(
  async (request, { params }) => {
    const { id } = parseParams(await params, idParamSchema);
    const body = await parseBody(request, updateProductSchema);
    const updated = await updateProductService(id, body);
    return ok(updated, "Produk berhasil diperbarui.");
  },
  { permission: ["SALES", "edit"] },
);

export const DELETE = withAuth<{ id: string }>(
  async (_request, { params }) => {
    const { id } = parseParams(await params, idParamSchema);
    const result = await deactivateProductService(id);
    return ok(result, "Produk berhasil dinonaktifkan (soft-delete).");
  },
  { permission: ["SALES", "delete"] },
);
