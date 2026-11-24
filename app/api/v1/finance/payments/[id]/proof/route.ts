import { parseParams } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { financeIdParamSchema } from "@/modules/finance/schema";
import { downloadPaymentProofService } from "@/modules/finance/service";

/**
 * GET /api/v1/finance/payments/:id/proof
 * Endpoint terautentikasi untuk mengunduh/melihat bukti pembayaran dari direktori di luar `public`.
 */
export const GET = withAuth<{ id: string }>(
  async (_request, { params }) => {
    const { id } = parseParams(await params, financeIdParamSchema);
    const { buffer, contentType, filename } = await downloadPaymentProofService(id);

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  },
  { permission: ["FINANCE", "view"] },
);
