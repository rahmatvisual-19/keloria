import { generatePurchaseOrderPdf } from "@/lib/pdf/purchase-order";
import { parseParams } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { scmIdParamSchema } from "@/modules/scm/schema";
import { getPurchaseOrderForPdfService } from "@/modules/scm/service";

export const GET = withAuth<{ id: string }>(
  async (_request, { params }) => {
    const { id } = parseParams(await params, scmIdParamSchema);
    const po = await getPurchaseOrderForPdfService(id);
    const pdfBuffer = await generatePurchaseOrderPdf(po);

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${po.po_number}.pdf"`,
      },
    });
  },
  { permission: ["SCM", "view"] },
);
