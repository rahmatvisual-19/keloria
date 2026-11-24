import PDFDocument from "pdfkit";
import { formatDate, formatRupiah } from "@/lib/client/format";

export interface InvoicePdfData {
  invoice_number: string;
  invoice_type: string;
  issued_date: Date;
  total_billed: { toString(): string };
  shipping_cost_billed: { toString(): string };
  payment_status: string;
  order: {
    order_number: string;
    total_amount: { toString(): string };
    recipient_name: string;
    recipient_phone: string;
    shipping_address: string;
    customer: {
      customer_name: string;
      customer_type: string;
    };
    items: {
      qty: number;
      unit_price_snapshot: { toString(): string };
      subtotal: { toString(): string };
      product: { product_name: string; variant_size: string | null };
    }[];
  };
  payments: {
    amount_paid: { toString(): string };
  }[];
}

/**
 * Menghasilkan buffer PDF Invoice UMKM Keloria (DP 50%, Pelunasan, atau Bayar Penuh).
 */
export async function generateInvoicePdf(inv: InvoicePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Kop Surat UMKM Keloria
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#14532d").text("UMKM KELORIA");
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#475569")
      .text("Kelo-ERP • Dokumen Tagihan Resmi");
    doc.moveDown(0.5);
    doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor("#cbd5e1").stroke();
    doc.moveDown(1);

    const typeLabel =
      inv.invoice_type === "DP_50"
        ? "INVOICE UANG MUKA (DP 50%)"
        : inv.invoice_type === "PELUNASAN"
          ? "INVOICE PELUNASAN & ONGKIR"
          : "INVOICE PEMBAYARAN PENUH";

    doc.fillColor("#0f172a").fontSize(14).font("Helvetica-Bold").text(typeLabel);
    doc.moveDown(0.4);

    doc.fontSize(10).font("Helvetica");
    doc.text(`No. Invoice   : ${inv.invoice_number}`);
    doc.text(`No. Pesanan   : ${inv.order.order_number}`);
    doc.text(`Tanggal Terbit: ${formatDate(inv.issued_date)}`);
    doc.text(`Status        : ${inv.payment_status.replaceAll("_", " ")}`);
    doc.moveDown(0.7);

    doc.font("Helvetica-Bold").text("Ditagihkan Kepada:");
    doc.font("Helvetica").text(`${inv.order.customer.customer_name} (${inv.order.customer.customer_type})`);
    doc.text(`Penerima: ${inv.order.recipient_name} (${inv.order.recipient_phone})`);
    doc.text(`Alamat: ${inv.order.shipping_address}`);
    doc.moveDown(1);

    // Tabel Rincian Item
    const startY = doc.y;
    doc.font("Helvetica-Bold").fontSize(9);
    doc.text("No", 48, startY, { width: 25 });
    doc.text("Produk", 75, startY, { width: 225 });
    doc.text("Qty", 305, startY, { width: 45, align: "right" });
    doc.text("Harga Satuan", 355, startY, { width: 90, align: "right" });
    doc.text("Subtotal", 450, startY, { width: 97, align: "right" });
    doc.moveTo(48, startY + 15).lineTo(547, startY + 15).strokeColor("#94a3b8").stroke();

    let y = startY + 22;
    doc.font("Helvetica").fontSize(9);
    inv.order.items.forEach((item, idx) => {
      const label = item.product.variant_size
        ? `${item.product.product_name} (${item.product.variant_size})`
        : item.product.product_name;
      doc.text(String(idx + 1), 48, y, { width: 25 });
      doc.text(label, 75, y, { width: 225 });
      doc.text(String(item.qty), 305, y, { width: 45, align: "right" });
      doc.text(formatRupiah(item.unit_price_snapshot.toString()), 355, y, {
        width: 90,
        align: "right",
      });
      doc.text(formatRupiah(item.subtotal.toString()), 450, y, { width: 97, align: "right" });
      y += 18;
    });

    doc.moveTo(48, y + 4).lineTo(547, y + 4).strokeColor("#94a3b8").stroke();
    y += 12;

    const totalPaid = inv.payments.reduce((acc, p) => acc + Number(p.amount_paid.toString()), 0);
    doc.font("Helvetica").fontSize(9);
    doc.text("Total Nilai Pesanan", 320, y, { width: 125, align: "right" });
    doc.text(formatRupiah(inv.order.total_amount.toString()), 450, y, { width: 97, align: "right" });
    y += 16;

    if (Number(inv.shipping_cost_billed.toString()) > 0) {
      doc.text("Ongkos Kirim Ditagihkan", 320, y, { width: 125, align: "right" });
      doc.text(formatRupiah(inv.shipping_cost_billed.toString()), 450, y, {
        width: 97,
        align: "right",
      });
      y += 16;
    }

    doc.font("Helvetica-Bold").fontSize(11);
    doc.text("Total Tagihan Invoice Ini", 290, y, { width: 155, align: "right" });
    doc.text(formatRupiah(inv.total_billed.toString()), 450, y, { width: 97, align: "right" });
    y += 18;

    doc.font("Helvetica").fontSize(9);
    doc.text("Sudah Terbayar", 320, y, { width: 125, align: "right" });
    doc.text(formatRupiah(totalPaid), 450, y, { width: 97, align: "right" });

    doc.end();
  });
}
