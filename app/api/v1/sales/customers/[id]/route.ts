import { ok } from "@/lib/response";
import { parseBody, parseParams } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { idParamSchema, updateCustomerSchema } from "@/modules/sales/schema";
import {
  deactivateCustomerService,
  getCustomerDetailService,
  updateCustomerService,
} from "@/modules/sales/service";

export const GET = withAuth<{ id: string }>(
  async (_request, { params }) => {
    const { id } = parseParams(await params, idParamSchema);
    const customer = await getCustomerDetailService(id);
    return ok(customer);
  },
  { permission: ["SALES", "view"] },
);

export const PATCH = withAuth<{ id: string }>(
  async (request, { params }) => {
    const { id } = parseParams(await params, idParamSchema);
    const body = await parseBody(request, updateCustomerSchema);
    const updated = await updateCustomerService(id, body);
    return ok(updated, "Pelanggan berhasil diperbarui.");
  },
  { permission: ["SALES", "edit"] },
);

export const DELETE = withAuth<{ id: string }>(
  async (_request, { params }) => {
    const { id } = parseParams(await params, idParamSchema);
    const result = await deactivateCustomerService(id);
    return ok(result, "Pelanggan berhasil dinonaktifkan (soft-delete).");
  },
  { permission: ["SALES", "delete"] },
);
