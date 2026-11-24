import { ok } from "@/lib/response";
import { parseParams } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { idParamSchema } from "@/modules/sales/schema";
import { getOrderDetailService } from "@/modules/sales/service";

export const GET = withAuth<{ id: string }>(
  async (_request, { params }) => {
    const { id } = parseParams(await params, idParamSchema);
    const order = await getOrderDetailService(id);
    return ok(order);
  },
  { permission: ["SALES", "view"] },
);
