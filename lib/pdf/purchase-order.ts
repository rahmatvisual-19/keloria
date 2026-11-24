import PDFDocument from "pdfkit";
import { formatDate, formatRupiah } from "@/lib/client/format";

export interface PurchaseOrderPdfData {
  po_number: string;
  po_date: Date;
  po_status: string;
  total_cost: { toString(): string };
  order: { order_number: string };
  supplier: {
    supplier_name: string;
    contact_person: string | null;
    phone: string | null;
    address: string | null;
  };
  creator: { full_name: string };
  items: {
    qty_ordered: { toString(): string };
    unit: string;
    package_cost: { toString(): string };
    subtotal_cost: { toString(): string };
    material: { material_name: string };
  }[];
}

/**
 * Menghasilkan buffer PDF dokumen Purchase Order (PO) Supplier UMKM Keloria.
 */
export async function generatePurchaseOrderPdf(po: PurchaseOrderPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Kop Surat UMKM Keloria
    doc.fontSize(18).font("Helvetica-Bold").text("UMKM KELORIA", { align: "left" });
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#475569")
      .text("Sistem Kelo-ERP • Pengolahan Produk B2B & B2C");
    doc.moveDown(0.5);
    doc.moveTo(48, doc.y).lineTo(547, doc.y).strokeColor("#cbd5e1").stroke();
    doc.moveDown(1);

    // Judul Dokumen
    doc.fillColor("#0f172a").fontSize(15).font("Helvetica-Bold").text("PURCHASE ORDER (PO) SUPPLIER");
    doc.moveDown(0.5);

    doc.fontSize(10).font("Helvetica");
    doc.text(`No. PO        : ${po.po_number}`);
    doc.text(`Ref. Pesanan  : ${po.order.order_number}`);
    doc.text(`Tanggal PO    : ${formatDate(po.po_date)}`);
    doc.text(`Status        : ${po.po_status}`);
    doc.text(`Dibuat Oleh   : ${po.creator.full_name}`);
    doc.moveDown(0.8);

    // Info Supplier
    doc.font("Helvetica-Bold").text("Kepada Supplier:");
    doc.font("Helvetica").text(po.supplier.supplier_name);
    if (po.supplier.contact_person) doc.text(`PIC: ${po.supplier.contact_person}`);
    if (po.supplier.phone) doc.text(`Telepon: ${po.supplier.phone}`);
    if (po.supplier.address) doc.text(`Alamat: ${po.supplier.address}`);
    doc.moveDown(1);

    // Header Tabel
    const startY = doc.y;
    doc.font("Helvetica-Bold").fontSize(9);
    doc.text("No", 48, startY, { width: 25 });
    doc.text("Nama Bahan Baku", 75, startY, { width: 210 });
    doc.text("Jumlah", 290, startY, { width: 70, align: "right" });
    doc.text("Harga Satuan", 365, startY, { width: 85, align: "right" });
    doc.text("Subtotal", 455, startY, { width: 92, align: "right" });

    doc.moveTo(48, startY + 15).lineTo(547, startY + 15).strokeColor("#94a3b8").stroke();

    // Baris Item
    let y = startY + 22;
    doc.font("Helvetica").fontSize(9);
    po.items.forEach((item, idx) => {
      doc.text(String(idx + 1), 48, y, { width: 25 });
      doc.text(item.material.material_name, 75, y, { width: 210 });
      doc.text(`${Number(item.qty_ordered.toString())} ${item.unit}`, 290, y, {
        width: 70,
        align: "right",
      });
      doc.text(formatRupiah(item.package_cost.toString()), 365, y, {
        width: 85,
        align: "right",
      });
      doc.text(formatRupiah(item.subtotal_cost.toString()), 455, y, {
        width: 92,
        align: "right",
      });
      y += 20;
    });

    doc.moveTo(48, y + 4).lineTo(547, y + 4).strokeColor("#94a3b8").stroke();
    y += 12;

    doc.font("Helvetica-Bold").fontSize(11);
    doc.text("Total Estimasi PO", 320, y, { width: 130, align: "right" });
    doc.text(formatRupiah(po.total_cost.toString()), 455, y, { width: 92, align: "right" });

    doc.end();
  });
}
