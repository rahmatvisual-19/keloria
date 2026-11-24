"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  FileText,
  GripVertical,
  PackagePlus,
  Plus,
  X,
} from "lucide-react";
import { AppLayout } from "@/components/layouts/AppLayout";
import { useAppStore } from "@/components/providers/AppStoreProvider";
import { ActionMenu, ActionMenuItem } from "@/components/ui/ActionMenu";
import { ColumnDef, DataTable } from "@/components/ui/DataTable";
import { FormField } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { formatDate, formatRupiah } from "@/lib/client/format";
import { calculateDp50, calculateSettlement, multiplyMoney, toDecimalString } from "@/lib/money";
import { MockOrder, MockPurchaseOrder } from "@/lib/mock/data";
import { B2B_STATUS_FLOW, B2C_STATUS_FLOW, OrderStatus, PoStatus } from "@/lib/types/domain";

type ScmTab = "kanban" | "bom" | "stock" | "master";

const KANBAN_COLUMNS: OrderStatus[] = [
  "Produksi",
  "Packing",
  "Karantina",
  "Siap_Kirim",
  "Dikirim",
];

interface PendingTransition {
  order: MockOrder;
  targetStatus: OrderStatus;
}

export default function ScmPage() {
  const {
    currentUser,
    can,
    orders,
    setOrders,
    products,
    setProducts,
    materials,
    setMaterials,
    suppliers,
    setSuppliers,
    purchaseOrders,
    setPurchaseOrders,
    invoices,
    setInvoices,
    setExpenses,
    lowStockProducts,
    logActivity,
  } = useAppStore();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<ScmTab>("kanban");
  const [draggedOrderId, setDraggedOrderId] = useState<number | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<OrderStatus | null>(null);

  // Modal transisi Kanban (Karantina / Siap_Kirim / Dikirim)
  const [pendingTransition, setPendingTransition] = useState<PendingTransition | null>(null);
  const [transQuarantineDoc, setTransQuarantineDoc] = useState("");
  const [transShippingCost, setTransShippingCost] = useState("0");
  const [transTrackingNumber, setTransTrackingNumber] = useState("");
  const [transNote, setTransNote] = useState("");

  // Kalkulator BOM state (editable qty & harga sebelum buat PO)
  const eligibleBomOrders = useMemo(
    () => orders.filter((o) => o.order_channel === "PO Besar" && o.order_status === "DP_Lunas"),
    [orders],
  );
  const [bomOrderId, setBomOrderId] = useState<number>(eligibleBomOrders[0]?.order_id ?? 3);
  const [selectedSupplierId, setSelectedSupplierId] = useState<number>(1);
  const [bomOverrides, setBomOverrides] = useState<
    Record<number, { qty?: number; unit_cost?: number }>
  >({});

  // Persiapan stok online state
  const [prepProductId, setPrepProductId] = useState<number>(1);
  const [prepQty, setPrepQty] = useState<number>(15);
  const [prepDate, setPrepDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [prepNote, setPrepNote] = useState<string>("");
  const [prepHistory, setPrepHistory] = useState<
    { id: number; date: string; product: string; qty: number; note: string }[]
  >([]);

  // Modal Tambah Bahan Baku & Supplier
  const [matModalOpen, setMatModalOpen] = useState(false);
  const [matName, setMatName] = useState("");
  const [matUnit, setMatUnit] = useState("kg");
  const [matCost, setMatCost] = useState("40000");

  const [supModalOpen, setSupModalOpen] = useState(false);
  const [supName, setSupName] = useState("");
  const [supPic, setSupPic] = useState("");
  const [supPhone, setSupPhone] = useState("");
  const [supAddress, setSupAddress] = useState("");

  const draggedOrder = useMemo(
    () => (draggedOrderId !== null ? orders.find((o) => o.order_id === draggedOrderId) ?? null : null),
    [draggedOrderId, orders],
  );

  const getNextAllowedStatus = (order: MockOrder): OrderStatus | null => {
    const flow = order.order_channel === "PO Besar" ? B2B_STATUS_FLOW : B2C_STATUS_FLOW;
    const idx = flow.indexOf(order.order_status);
    if (idx === -1 || idx >= flow.length - 1) return null;
    return flow[idx + 1];
  };

  const selectedBomOrder = orders.find((o) => o.order_id === bomOrderId);

  const bomRequirements = useMemo(() => {
    if (!selectedBomOrder) return [];
    const map = new Map<
      number,
      { material_id: number; material_name: string; unit: string; total_qty: number; unit_cost: number }
    >();

    for (const item of selectedBomOrder.items) {
      const prod = products.find((p) => p.product_id === item.product_id);
      if (!prod) continue;
      for (const b of prod.bom) {
        const mat = materials.find((m) => m.material_id === b.material_id);
        const prev = map.get(b.material_id);
        const addQty = Number((item.qty * b.qty_per_unit).toFixed(2));
        if (prev) {
          prev.total_qty = Number((prev.total_qty + addQty).toFixed(2));
        } else {
          map.set(b.material_id, {
            material_id: b.material_id,
            material_name: b.material_name,
            unit: b.unit,
            total_qty: addQty,
            unit_cost: Number(mat?.default_cost ?? 0),
          });
        }
      }
    }

    return Array.from(map.values()).map((r) => {
      const ov = bomOverrides[r.material_id];
      return {
        ...r,
        total_qty: ov?.qty !== undefined ? ov.qty : r.total_qty,
        unit_cost: ov?.unit_cost !== undefined ? ov.unit_cost : r.unit_cost,
      };
    });
  }, [selectedBomOrder, products, materials, bomOverrides]);

  const executeOrderStatusChange = (
    order: MockOrder,
    targetStatus: OrderStatus,
    extra?: {
      quarantine_doc_number?: string;
      shipping_cost?: string;
      tracking_number?: string;
      note?: string;
    },
  ) => {
    const shippingStr =
      extra?.shipping_cost !== undefined ? toDecimalString(extra.shipping_cost) : order.shipping_cost;

    setOrders((prev) =>
      prev.map((o) =>
        o.order_id === order.order_id
          ? {
              ...o,
              order_status: targetStatus,
              quarantine_doc_number:
                targetStatus === "Karantina" && extra?.quarantine_doc_number
                  ? extra.quarantine_doc_number
                  : o.quarantine_doc_number,
              shipping_cost: targetStatus === "Siap_Kirim" ? shippingStr : o.shipping_cost,
              tracking_number:
                targetStatus === "Dikirim" && extra?.tracking_number
                  ? extra.tracking_number
                  : o.tracking_number,
              logs: [
                ...o.logs,
                {
                  from_status: o.order_status,
                  to_status: targetStatus,
                  changed_by: currentUser?.full_name ?? "Staf SCM",
                  changed_at: new Date().toISOString(),
                  note:
                    extra?.note?.trim() ||
                    `Status dimajukan ke ${targetStatus.replaceAll("_", " ")}.`,
                },
              ],
            }
          : o,
      ),
    );

    // Aturan bisnis #7: saat order B2B masuk Siap_Kirim, terbitkan Invoice Pelunasan otomatis
    let settlementInvNumber: string | null = null;
    if (order.order_channel === "PO Besar" && targetStatus === "Siap_Kirim") {
      const alreadyExists = invoices.some(
        (i) => i.order_number === order.order_number && i.invoice_type === "PELUNASAN",
      );
      if (!alreadyExists) {
        const dpInv = invoices.find(
          (i) => i.order_number === order.order_number && i.invoice_type === "DP_50",
        );
        const dpAmt = dpInv ? dpInv.total_billed : calculateDp50(order.total_amount);
        const settlementBilled = calculateSettlement(order.total_amount, dpAmt, shippingStr);
        settlementInvNumber = `INV-202611-${String(invoices.length + 1).padStart(4, "0")}`;

        setInvoices((prev) => [
          {
            invoice_id: Math.max(0, ...prev.map((i) => i.invoice_id)) + 1,
            invoice_number: settlementInvNumber!,
            order_number: order.order_number,
            customer_name: order.customer_name,
            invoice_type: "PELUNASAN",
            issued_date: new Date().toISOString().slice(0, 10),
            total_billed: settlementBilled,
            shipping_cost_billed: shippingStr,
            amount_paid: "0.00",
            payment_status: "Belum_Bayar",
            proof_note: null,
          },
          ...prev,
        ]);
      }
    }

    logActivity(
      "SCM",
      "STATUS_CHANGE",
      order.order_number,
      `Memindahkan status dari ${order.order_status.replaceAll("_", " ")} ke ${targetStatus.replaceAll("_", " ")}${
        settlementInvNumber ? ` (${settlementInvNumber} terbit otomatis)` : ""
      }.`,
    );

    showToast(
      `${order.order_number} pindah ke ${targetStatus.replaceAll("_", " ")}`,
      "success",
      settlementInvNumber
        ? `Invoice Pelunasan ${settlementInvNumber} (termasuk ongkir ${formatRupiah(shippingStr)}) terbit otomatis di Finance.`
        : undefined,
    );
  };

  const requestMoveOrderToStatus = (order: MockOrder, targetStatus: OrderStatus) => {
    if (order.order_status === targetStatus) return;

    const nextStatus = getNextAllowedStatus(order);
    if (!nextStatus) {
      showToast("Tahap Akhir", "info", `${order.order_number} sudah berada di tahap akhir.`);
      return;
    }

    if (targetStatus !== nextStatus) {
      showToast(
        "Transisi Tidak Valid",
        "error",
        `Alur harus berurutan. Dari ${order.order_status.replaceAll("_", " ")} hanya boleh dipindahkan ke ${nextStatus.replaceAll("_", " ")}.`,
      );
      return;
    }

    if (targetStatus === "Dikirim" && !order.settlement_paid) {
      showToast(
        "Pengiriman Diblokir",
        "error",
        "Pelunasan belum terverifikasi. Verifikasi pelunasan di modul Finance terlebih dahulu.",
      );
      return;
    }

    // Tahap yang memiliki input dokumen/ongkir/resi membuka modal khusus
    if (
      targetStatus === "Karantina" ||
      targetStatus === "Siap_Kirim" ||
      targetStatus === "Dikirim"
    ) {
      setTransQuarantineDoc(order.quarantine_doc_number ?? "");
      setTransShippingCost(String(Number(order.shipping_cost) || 0));
      setTransTrackingNumber(order.tracking_number ?? "");
      setTransNote("");
      setPendingTransition({ order, targetStatus });
      return;
    }

    executeOrderStatusChange(order, targetStatus);
  };

  const handleConfirmTransitionModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingTransition) return;
    executeOrderStatusChange(pendingTransition.order, pendingTransition.targetStatus, {
      quarantine_doc_number: transQuarantineDoc.trim() || undefined,
      shipping_cost: transShippingCost,
      tracking_number: transTrackingNumber.trim() || undefined,
      note: transNote.trim() || undefined,
    });
    setPendingTransition(null);
  };

  const advanceOrderStatus = (order: MockOrder) => {
    const nextStatus = getNextAllowedStatus(order);
    if (!nextStatus) return;
    requestMoveOrderToStatus(order, nextStatus);
  };

  const handleDragStart = (e: React.DragEvent, orderId: number) => {
    setDraggedOrderId(orderId);
    e.dataTransfer.setData("text/plain", String(orderId));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedOrderId(null);
    setDragOverStatus(null);
  };

  const handleColumnDragOver = (e: React.DragEvent, colStatus: OrderStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverStatus !== colStatus) {
      setDragOverStatus(colStatus);
    }
  };

  const handleColumnDrop = (e: React.DragEvent, colStatus: OrderStatus) => {
    e.preventDefault();
    const idFromTransfer = Number(e.dataTransfer.getData("text/plain"));
    const targetId = draggedOrderId ?? (Number.isFinite(idFromTransfer) ? idFromTransfer : null);
    setDraggedOrderId(null);
    setDragOverStatus(null);

    if (!targetId || !can("SCM", "edit")) return;
    const order = orders.find((o) => o.order_id === targetId);
    if (!order) return;
    requestMoveOrderToStatus(order, colStatus);
  };

  const handleCreateSupplierPo = () => {
    if (!selectedBomOrder || bomRequirements.length === 0) return;
    const sup = suppliers.find((s) => s.supplier_id === selectedSupplierId);
    const nextPoNum = `PO-202611-${String(purchaseOrders.length + 1).padStart(4, "0")}`;

    const items = bomRequirements.map((r) => {
      const pkg = toDecimalString(r.unit_cost);
      return {
        material_name: r.material_name,
        qty_ordered: r.total_qty,
        unit: r.unit,
        package_cost: pkg,
        subtotal_cost: multiplyMoney(pkg, r.total_qty),
      };
    });
    const totalCost = toDecimalString(
      items.reduce((acc, i) => acc + Number(i.subtotal_cost), 0),
    );

    const newPo: MockPurchaseOrder = {
      po_id: Math.max(0, ...purchaseOrders.map((p) => p.po_id)) + 1,
      po_number: nextPoNum,
      order_number: selectedBomOrder.order_number,
      supplier_id: selectedSupplierId,
      supplier_name: sup?.supplier_name ?? "Supplier",
      po_date: new Date().toISOString().slice(0, 10),
      total_cost: totalCost,
      po_status: "Dipesan",
      items,
    };

    setPurchaseOrders((prev) => [newPo, ...prev]);
    setBomOverrides({});
    logActivity(
      "SCM",
      "CREATE",
      nextPoNum,
      `Membuat PO Supplier ke ${newPo.supplier_name} untuk ${selectedBomOrder.order_number} senilai ${formatRupiah(totalCost)}.`,
    );
    showToast(
      `PO Supplier ${nextPoNum} dibuat`,
      "success",
      `Total estimasi pembelian: ${formatRupiah(totalCost)}`,
    );
  };

  const advancePoStatus = (po: MockPurchaseOrder) => {
    const nextMap: Record<PoStatus, PoStatus | null> = {
      Dipesan: "Diterima",
      Diterima: "Selesai",
      Selesai: null,
    };
    const next = nextMap[po.po_status];
    if (!next) return;

    setPurchaseOrders((prev) =>
      prev.map((item) => (item.po_id === po.po_id ? { ...item, po_status: next } : item)),
    );

    if (next === "Diterima") {
      setExpenses((prev) => {
        if (prev.some((e) => e.po_number === po.po_number)) return prev;
        return [
          {
            expense_id: Math.max(0, ...prev.map((e) => e.expense_id)) + 1,
            po_number: po.po_number,
            expense_date: new Date().toISOString().slice(0, 10),
            category: "Pembelian Supplier",
            description: `Penerimaan bahan baku ${po.po_number} (${po.supplier_name})`,
            amount: po.total_cost,
            recorded_by: currentUser?.full_name ?? "Staf SCM",
          },
          ...prev,
        ];
      });
      logActivity(
        "SCM",
        "STATUS_CHANGE",
        po.po_number,
        `Menandai PO Diterima; biaya Pembelian Supplier ${formatRupiah(po.total_cost)} tercatat otomatis.`,
      );
      showToast(
        `${po.po_number} berstatus Diterima`,
        "success",
        "Biaya Pembelian Supplier otomatis tercatat di modul Finance.",
      );
    } else {
      logActivity("SCM", "STATUS_CHANGE", po.po_number, "Menandai PO Supplier Selesai.");
      showToast(`${po.po_number} berstatus Selesai`);
    }
  };

  const handleAddOnlineStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (prepQty <= 0) return;
    const prod = products.find((p) => p.product_id === prepProductId);
    setProducts((prev) =>
      prev.map((p) =>
        p.product_id === prepProductId ? { ...p, stock_online: p.stock_online + prepQty } : p,
      ),
    );
    setPrepHistory((prev) => [
      {
        id: Date.now(),
        date: prepDate,
        product: `${prod?.sku_code ?? ""} — ${prod?.product_name ?? "Produk"}`,
        qty: prepQty,
        note: prepNote.trim() || "Persiapan stok online reguler",
      },
      ...prev,
    ]);
    logActivity(
      "SCM",
      "UPDATE",
      prod?.sku_code ?? "STOK",
      `Menambah stok online +${prepQty} ${prod?.unit ?? "pcs"} (${prepDate})${prepNote ? `: ${prepNote}` : ""}.`,
    );
    setPrepNote("");
    showToast(
      "Stok online berhasil ditambahkan",
      "success",
      `${prod?.product_name ?? "Produk"} (+${prepQty} ${prod?.unit ?? "pcs"})`,
    );
  };

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (matName.trim().length < 2) return;
    const nextId = Math.max(0, ...materials.map((m) => m.material_id)) + 1;
    setMaterials((prev) => [
      ...prev,
      {
        material_id: nextId,
        material_name: matName.trim(),
        unit: matUnit.trim() || "kg",
        default_cost: toDecimalString(Number(matCost) || 0),
      },
    ]);
    logActivity("SCM", "CREATE", matName.trim(), `Menambahkan bahan baku baru (${matUnit.trim()}).`);
    setMatModalOpen(false);
    setMatName("");
    showToast(`Bahan baku ${matName.trim()} ditambahkan`);
  };

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (supName.trim().length < 2) return;
    const nextId = Math.max(0, ...suppliers.map((s) => s.supplier_id)) + 1;
    setSuppliers((prev) => [
      ...prev,
      {
        supplier_id: nextId,
        supplier_name: supName.trim(),
        contact_person: supPic.trim() || "-",
        phone: supPhone.trim() || "-",
        address: supAddress.trim() || "-",
      },
    ]);
    logActivity("SCM", "CREATE", supName.trim(), "Menambahkan data supplier bahan baku baru.");
    setSupModalOpen(false);
    setSupName("");
    setSupPic("");
    setSupPhone("");
    setSupAddress("");
    showToast(`Supplier ${supName.trim()} ditambahkan`);
  };

  const poColumns: ColumnDef<MockPurchaseOrder>[] = [
    {
      key: "po_number",
      header: "No. PO",
      render: (po) => (
        <div>
          <p className="font-semibold text-slate-900">{po.po_number}</p>
          <p className="text-xs text-slate-500">Order: {po.order_number}</p>
        </div>
      ),
    },
    {
      key: "supplier",
      header: "Supplier",
      render: (po) => (
        <div>
          <p className="font-medium text-slate-900">{po.supplier_name}</p>
          <p className="text-xs text-slate-500">{formatDate(po.po_date)}</p>
        </div>
      ),
    },
    {
      key: "total",
      header: "Total Biaya",
      align: "right",
      render: (po) => <span className="font-semibold">{formatRupiah(po.total_cost)}</span>,
    },
    {
      key: "status",
      header: "Status PO",
      render: (po) => <StatusBadge status={po.po_status} />,
    },
    {
      key: "action",
      header: "Aksi",
      align: "center",
      render: (po) => {
        const items: ActionMenuItem[] = [];
        if (po.po_status !== "Selesai" && can("SCM", "edit")) {
          items.push({
            label: po.po_status === "Dipesan" ? "Tandai Diterima" : "Tandai Selesai",
            icon: <ArrowRight className="h-3.5 w-3.5" />,
            variant: "primary",
            onClick: () => advancePoStatus(po),
          });
        }
        items.push({
          label: "Unduh PDF PO",
          icon: <FileText className="h-3.5 w-3.5" />,
          onClick: () =>
            showToast(
              `Pratinjau PDF ${po.po_number}`,
              "info",
              "Unduh PDF PO langsung via /api/v1/scm/purchase-orders/:id/pdf saat database aktif.",
            ),
        });
        return <ActionMenu items={items} ariaLabel={`Aksi untuk ${po.po_number}`} />;
      },
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Supply Chain Management (SCM)"
        description="Papan status produksi & logistik, kalkulator kebutuhan bahan (BOM), PO supplier, dan pengelolaan stok online."
      />

      <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {(
          [
            { id: "kanban", label: "Papan Produksi & Logistik" },
            { id: "bom", label: "Kalkulator BOM & PO Supplier" },
            {
              id: "stock",
              label: `Stok Online & Alert (${lowStockProducts.length})`,
            },
            { id: "master", label: "Bahan Baku & Supplier" },
          ] as { id: ScmTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-emerald-900 text-white"
                : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: KANBAN PRODUKSI & LOGISTIK */}
      {activeTab === "kanban" && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Tarik dan lepas (<em>drag &amp; drop</em>) kartu pesanan ke kolom tahap berikutnya yang
            berurutan, atau klik tombol <strong>Tahap Berikutnya</strong>. Tahap{" "}
            <strong>Karantina</strong>, <strong>Siap Kirim</strong>, dan <strong>Dikirim</strong>{" "}
            akan membuka form input nomor dokumen / ongkir / resi.
          </p>

          {orders.some((o) => o.order_status === "DP_Lunas") && (
            <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4">
              <p className="text-xs font-bold text-sky-900">
                Siap Masuk Produksi (DP 50% Sudah Terverifikasi — bisa ditarik ke kolom Produksi)
              </p>
              <div className="mt-2.5 flex flex-wrap gap-3">
                {orders
                  .filter((o) => o.order_status === "DP_Lunas")
                  .map((order) => (
                    <div
                      key={order.order_id}
                      draggable={can("SCM", "edit")}
                      onDragStart={(e) => handleDragStart(e, order.order_id)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-3 rounded-lg border border-sky-200 bg-white px-3.5 py-2 text-xs transition-all ${
                        can("SCM", "edit")
                          ? "cursor-grab active:cursor-grabbing hover:border-emerald-600"
                          : ""
                      } ${draggedOrderId === order.order_id ? "opacity-50 ring-2 ring-emerald-700" : ""}`}
                    >
                      {can("SCM", "edit") && (
                        <GripVertical className="h-4 w-4 shrink-0 text-slate-400" />
                      )}
                      <div>
                        <p className="font-bold text-slate-900">{order.order_number}</p>
                        <p className="text-slate-600">{order.customer_name}</p>
                      </div>
                      {can("SCM", "edit") && (
                        <button
                          type="button"
                          onClick={() => advanceOrderStatus(order)}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-900 px-2.5 py-1.5 font-medium text-white hover:bg-emerald-800"
                        >
                          Mulai Produksi
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-5">
            {KANBAN_COLUMNS.map((colStatus) => {
              const colOrders = orders.filter((o) => o.order_status === colStatus);
              const isOver = dragOverStatus === colStatus && draggedOrder !== null;
              const expectedNext = draggedOrder ? getNextAllowedStatus(draggedOrder) : null;
              const isSameColumn = draggedOrder?.order_status === colStatus;
              const isValidTarget =
                draggedOrder !== null &&
                expectedNext === colStatus &&
                !(colStatus === "Dikirim" && !draggedOrder.settlement_paid);

              const columnHighlight = isOver
                ? isValidTarget
                  ? "border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-600/20"
                  : isSameColumn
                    ? "border-slate-300 bg-slate-100/90"
                    : "border-red-400 bg-red-50/70 ring-2 ring-red-400/20"
                : draggedOrder && isValidTarget
                  ? "border-emerald-400 border-dashed bg-emerald-50/30"
                  : "border-slate-200 bg-slate-100/70";

              return (
                <div
                  key={colStatus}
                  onDragOver={(e) => handleColumnDragOver(e, colStatus)}
                  onDragLeave={() => {
                    if (dragOverStatus === colStatus) setDragOverStatus(null);
                  }}
                  onDrop={(e) => handleColumnDrop(e, colStatus)}
                  className={`flex min-h-[260px] flex-col rounded-xl border p-3 transition-colors ${columnHighlight}`}
                >
                  <div className="mb-3 flex items-center justify-between px-1">
                    <StatusBadge status={colStatus} />
                    <span className="text-xs font-bold text-slate-500">{colOrders.length}</span>
                  </div>

                  {isOver && !isSameColumn && (
                    <div
                      className={`mb-2.5 rounded-lg px-2.5 py-1.5 text-center text-[11px] font-semibold ${
                        isValidTarget
                          ? "bg-emerald-100 text-emerald-900"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {isValidTarget
                        ? `Lepas di sini → ${colStatus.replaceAll("_", " ")}`
                        : colStatus === "Dikirim" && draggedOrder && !draggedOrder.settlement_paid
                          ? "Diblokir: pelunasan belum Lunas"
                          : "Tidak bisa melompat / mundur tahap"}
                    </div>
                  )}

                  <div className="flex-1 space-y-3">
                    {colOrders.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-slate-300 bg-white/60 py-6 text-center text-xs text-slate-400">
                        Kosong
                      </p>
                    ) : (
                      colOrders.map((order) => (
                        <div
                          key={order.order_id}
                          draggable={can("SCM", "edit")}
                          onDragStart={(e) => handleDragStart(e, order.order_id)}
                          onDragEnd={handleDragEnd}
                          className={`rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs transition-all ${
                            can("SCM", "edit")
                              ? "cursor-grab active:cursor-grabbing hover:border-emerald-600/60 hover:shadow-xs"
                              : ""
                          } ${
                            draggedOrderId === order.order_id
                              ? "scale-[0.98] opacity-50 ring-2 ring-emerald-700"
                              : ""
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex items-center gap-1.5">
                              {can("SCM", "edit") && (
                                <GripVertical className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              )}
                              <span className="text-xs font-bold text-slate-900">
                                {order.order_number}
                              </span>
                            </div>
                            <StatusBadge status={order.customer_type} />
                          </div>
                          <p className="mt-1 text-xs font-medium text-slate-700">
                            {order.customer_name}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {order.items.map((i) => `${i.qty}x ${i.sku_code}`).join(", ")}
                          </p>
                          {order.quarantine_doc_number && (
                            <p className="mt-1 text-[11px] text-slate-500">
                              Karantina: <strong>{order.quarantine_doc_number}</strong>
                            </p>
                          )}
                          {order.tracking_number && (
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              Resi: <strong>{order.tracking_number}</strong>
                            </p>
                          )}
                          {colStatus === "Siap_Kirim" && !order.settlement_paid && (
                            <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800">
                              Menunggu pelunasan Lunas sebelum dikirim
                            </p>
                          )}
                          {can("SCM", "edit") && (
                            <button
                              type="button"
                              onClick={() => advanceOrderStatus(order)}
                              className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg bg-emerald-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
                            >
                              {colStatus === "Dikirim" ? "Selesaikan Order" : "Tahap Berikutnya"}
                              <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: KALKULATOR BOM & PO SUPPLIER (EDITABLE QTY & HARGA) */}
      {activeTab === "bom" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Calculator className="h-4 w-4 text-emerald-700" />
              Kalkulator Kebutuhan Bahan Baku (By Order)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Hanya order B2B dengan DP 50% terverifikasi yang dapat dihitung kebutuhan bahannya.
              Anda dapat menyesuaikan qty dan harga beli sebelum membuat PO.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <FormField label="Pilih Order (DP Lunas)">
                <select
                  value={bomOrderId}
                  onChange={(e) => {
                    setBomOrderId(Number(e.target.value));
                    setBomOverrides({});
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {orders
                    .filter((o) => o.order_channel === "PO Besar")
                    .map((o) => (
                      <option key={o.order_id} value={o.order_id}>
                        {o.order_number} — {o.customer_name} ({o.order_status.replaceAll("_", " ")})
                      </option>
                    ))}
                </select>
              </FormField>

              <FormField label="Pilih Supplier Tujuan PO">
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {suppliers.map((s) => (
                    <option key={s.supplier_id} value={s.supplier_id}>
                      {s.supplier_name} ({s.contact_person})
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            {bomRequirements.length > 0 && (
              <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-2.5">Bahan Baku</th>
                      <th className="px-4 py-2.5 text-right">Qty Dipesan (Editable)</th>
                      <th className="px-4 py-2.5 text-right">Harga/Satuan (Rp)</th>
                      <th className="px-4 py-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bomRequirements.map((r) => (
                      <tr key={r.material_id}>
                        <td className="px-4 py-2.5 font-medium text-slate-900">
                          {r.material_name} ({r.unit})
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            step="0.1"
                            min={0.1}
                            value={r.total_qty}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0);
                              setBomOverrides((prev) => ({
                                ...prev,
                                [r.material_id]: { ...prev[r.material_id], qty: val },
                              }));
                            }}
                            className="w-24 rounded-md border border-slate-300 px-2 py-1 text-right text-xs tabular-nums"
                          />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <input
                            type="number"
                            min={0}
                            value={r.unit_cost}
                            onChange={(e) => {
                              const val = Math.max(0, Number(e.target.value) || 0);
                              setBomOverrides((prev) => ({
                                ...prev,
                                [r.material_id]: { ...prev[r.material_id], unit_cost: val },
                              }));
                            }}
                            className="w-28 rounded-md border border-slate-300 px-2 py-1 text-right text-xs tabular-nums"
                          />
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                          {formatRupiah(multiplyMoney(toDecimalString(r.unit_cost), r.total_qty))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {can("SCM", "create") && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={handleCreateSupplierPo}
                  className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Buat PO ke Supplier
                </button>
              </div>
            )}
          </div>

          <DataTable
            data={purchaseOrders}
            columns={poColumns}
            rowKey={(po) => po.po_id}
            searchPlaceholder="Cari nomor PO atau supplier..."
            searchKeys={(po) => `${po.po_number} ${po.order_number} ${po.supplier_name}`}
          />
        </div>
      )}

      {/* TAB 3: STOK ONLINE & ALERT STOCK */}
      {activeTab === "stock" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Daftar Stok Produk Online
              </h2>
              <div className="divide-y divide-slate-100">
                {products.map((p) => {
                  const isLow = p.stock_online <= p.min_stock_threshold;
                  return (
                    <div
                      key={p.product_id}
                      className="flex items-center justify-between py-3 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">
                          {p.product_name} ({p.variant_size})
                        </p>
                        <p className="text-xs text-slate-500">
                          SKU: {p.sku_code} • Batas minimum: {p.min_stock_threshold} {p.unit}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold tabular-nums ${
                            isLow
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-50 text-emerald-800"
                          }`}
                        >
                          Stok: {p.stock_online} {p.unit}
                        </span>
                        {isLow && (
                          <span className="rounded-md bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                            Alert Stock
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {prepHistory.length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="mb-2 text-sm font-bold text-slate-900">
                  Riwayat Persiapan Produk Terbaru
                </h3>
                <div className="divide-y divide-slate-100 text-xs">
                  {prepHistory.map((h) => (
                    <div key={h.id} className="flex items-center justify-between py-2">
                      <div>
                        <p className="font-semibold text-slate-900">{h.product}</p>
                        <p className="text-slate-500">
                          {formatDate(h.date)} • {h.note}
                        </p>
                      </div>
                      <span className="font-bold text-emerald-800">+{h.qty}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="flex items-center gap-2 text-base font-bold text-slate-900">
              <PackagePlus className="h-4 w-4 text-emerald-700" />
              Persiapan Produk (Tambah Stok Online)
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Catat hasil produksi stok tipis untuk etalase penjualan online B2C.
            </p>
            <form onSubmit={handleAddOnlineStock} className="mt-4 space-y-4">
              <FormField label="Pilih Produk" required>
                <select
                  value={prepProductId}
                  onChange={(e) => setPrepProductId(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {products.map((p) => (
                    <option key={p.product_id} value={p.product_id}>
                      {p.sku_code} — {p.product_name} ({p.variant_size})
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Jumlah Produksi" required>
                  <input
                    type="number"
                    min={1}
                    value={prepQty}
                    onChange={(e) => setPrepQty(Math.max(1, Number(e.target.value)))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums"
                  />
                </FormField>
                <FormField label="Tanggal Produksi" required>
                  <input
                    type="date"
                    value={prepDate}
                    onChange={(e) => setPrepDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </FormField>
              </div>

              <FormField label="Catatan">
                <input
                  type="text"
                  value={prepNote}
                  onChange={(e) => setPrepNote(e.target.value)}
                  placeholder="Contoh: Batch produksi pagi"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </FormField>

              <button
                type="submit"
                disabled={!can("SCM", "edit")}
                className="w-full rounded-lg bg-emerald-900 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-40"
              >
                Simpan Tambahan Stok
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 4: BAHAN BAKU & SUPPLIER */}
      {activeTab === "master" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Daftar Bahan Baku ({materials.length})
              </h2>
              {can("SCM", "create") && (
                <button
                  type="button"
                  onClick={() => setMatModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah Bahan
                </button>
              )}
            </div>
            <div className="divide-y divide-slate-100 text-sm">
              {materials.map((m) => (
                <div key={m.material_id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="font-medium text-slate-900">{m.material_name}</p>
                    <p className="text-xs text-slate-500">Satuan: {m.unit}</p>
                  </div>
                  <span className="font-semibold text-slate-800 tabular-nums">
                    {formatRupiah(m.default_cost)}/{m.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900">
                Daftar Supplier ({suppliers.length})
              </h2>
              {can("SCM", "create") && (
                <button
                  type="button"
                  onClick={() => setSupModalOpen(true)}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Tambah Supplier
                </button>
              )}
            </div>
            <div className="space-y-3">
              {suppliers.map((s) => (
                <div
                  key={s.supplier_id}
                  className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 text-xs"
                >
                  <p className="text-sm font-bold text-slate-900">{s.supplier_name}</p>
                  <p className="mt-1 text-slate-700">
                    PIC: {s.contact_person} • {s.phone}
                  </p>
                  <p className="mt-0.5 text-slate-500">{s.address}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Input Logistik Transisi Kanban (Karantina / Siap Kirim / Dikirim) */}
      {pendingTransition && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Pindah ke {pendingTransition.targetStatus.replaceAll("_", " ")}
                </h2>
                <p className="text-xs text-slate-500">
                  {pendingTransition.order.order_number} — {pendingTransition.order.customer_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPendingTransition(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmTransitionModal} className="mt-4 space-y-4">
              {pendingTransition.targetStatus === "Karantina" && (
                <FormField
                  label="Nomor Dokumen Karantina (Opsional)"
                  hint="Isi nomor surat karantina bila pengiriman antar-pulau / memerlukan izin."
                >
                  <input
                    type="text"
                    value={transQuarantineDoc}
                    onChange={(e) => setTransQuarantineDoc(e.target.value)}
                    placeholder="Contoh: KRN-2026-11-021"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </FormField>
              )}

              {pendingTransition.targetStatus === "Siap_Kirim" && (
                <>
                  <FormField
                    label="Ongkos Kirim (Rp)"
                    required
                    hint={
                      pendingTransition.order.order_channel === "PO Besar"
                        ? "Invoice Pelunasan (sisa 50% + ongkir) akan diterbitkan otomatis di Finance."
                        : "Biaya pengiriman untuk pesanan B2C."
                    }
                  >
                    <input
                      type="number"
                      min={0}
                      value={transShippingCost}
                      onChange={(e) => setTransShippingCost(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums"
                      required
                    />
                  </FormField>
                </>
              )}

              {pendingTransition.targetStatus === "Dikirim" && (
                <FormField label="Nomor Resi Pengiriman" required>
                  <input
                    type="text"
                    value={transTrackingNumber}
                    onChange={(e) => setTransTrackingNumber(e.target.value)}
                    placeholder="Contoh: JNE-CARGO-991022"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </FormField>
              )}

              <FormField label="Catatan Tahap (Opsional)">
                <input
                  type="text"
                  value={transNote}
                  onChange={(e) => setTransNote(e.target.value)}
                  placeholder="Contoh: Barang sudah dikemas rapi"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </FormField>

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={() => setPendingTransition(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Simpan & Pindahkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Bahan Baku */}
      {matModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">Tambah Bahan Baku Baru</h2>
              <button
                type="button"
                onClick={() => setMatModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAddMaterial} className="mt-4 space-y-4">
              <FormField label="Nama Bahan Baku" required>
                <input
                  type="text"
                  value={matName}
                  onChange={(e) => setMatName(e.target.value)}
                  placeholder="Contoh: Ekstrak Herbal Alami"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Satuan" required>
                  <input
                    type="text"
                    value={matUnit}
                    onChange={(e) => setMatUnit(e.target.value)}
                    placeholder="kg / pcs / liter"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </FormField>
                <FormField label="Harga Default (Rp)" required>
                  <input
                    type="number"
                    min={0}
                    value={matCost}
                    onChange={(e) => setMatCost(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums"
                    required
                  />
                </FormField>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMatModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Simpan Bahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Supplier */}
      {supModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">Tambah Supplier Baru</h2>
              <button
                type="button"
                onClick={() => setSupModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleAddSupplier} className="mt-4 space-y-4">
              <FormField label="Nama Supplier" required>
                <input
                  type="text"
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="Contoh: PT Tani Makmur Sentosa"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Kontak PIC">
                  <input
                    type="text"
                    value={supPic}
                    onChange={(e) => setSupPic(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </FormField>
                <FormField label="No. Telepon">
                  <input
                    type="text"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </FormField>
              </div>
              <FormField label="Alamat Supplier">
                <textarea
                  rows={2}
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </FormField>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSupModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Simpan Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
