import { ok } from "@/lib/response";
import { parseBody, parseParams } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { financeIdParamSchema, verifyPaymentSchema } from "@/modules/finance/schema";
import { verifyInvoicePaymentService } from "@/modules/finance/service";

/**
 * POST /api/v1/finance/invoices/:id/verify
 * Wajib izin FINANCE.edit (Anak PKL otomatis mendapat 403).
 * Mendukung `multipart/form-data` (untuk unggah bukti bayar via `request.formData()`) atau JSON.
 */
export const POST = withAuth<{ id: string }>(
  async (request, { params, user }) => {
    const { id } = parseParams(await params, financeIdParamSchema);
    const contentType = request.headers.get("content-type") ?? "";

    let rawInput;
    let proofFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const fileEntry = formData.get("proof_file");
      if (fileEntry instanceof File && fileEntry.size > 0) {
        proofFile = fileEntry;
      }
      rawInput = verifyPaymentSchema.parse({
        amount_paid: formData.get("amount_paid"),
        payment_date: formData.get("payment_date") || undefined,
        payment_method: formData.get("payment_method"),
        proof_note: formData.get("proof_note") || null,
      });
    } else {
      rawInput = await parseBody(request, verifyPaymentSchema);
    }

    const result = await verifyInvoicePaymentService(id, rawInput, user.user_id, proofFile);
    return ok(result, "Pembayaran berhasil diverifikasi.");
  },
  { permission: ["FINANCE", "edit"] },
);
