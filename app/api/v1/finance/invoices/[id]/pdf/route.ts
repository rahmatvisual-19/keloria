import { generateInvoicePdf } from "@/lib/pdf/invoice";
import { parseParams } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { financeIdParamSchema } from "@/modules/finance/schema";
import { getInvoiceForPdfService } from "@/modules/finance/service";

export const GET = withAuth<{ id: string }>(
  async (_request, { params }) => {
    const { id } = parseParams(await params, financeIdParamSchema);
    const inv = await getInvoiceForPdfService(id);
    const pdfBuffer = await generateInvoicePdf(inv);

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${inv.invoice_number}.pdf"`,
      },
    });
  },
  { permission: ["FINANCE", "view"] },
);
