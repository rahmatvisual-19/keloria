import { ok } from "@/lib/response";
import { parseBody, parseParams } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { cancelOrderSchema, idParamSchema } from "@/modules/sales/schema";
import { cancelOrderService } from "@/modules/sales/service";

export const POST = withAuth<{ id: string }>(
  async (request, { params, user }) => {
    const { id } = parseParams(await params, idParamSchema);
    const body = await parseBody(request, cancelOrderSchema);
    const result = await cancelOrderService(id, body, user.user_id);
    return ok(result, "Pesanan berhasil dibatalkan.");
  },
  { permission: ["SALES", "edit"] },
);
