"use client";

import React, { useMemo, useState } from "react";
import { Ban, Eye, Lock, Pencil, Plus, Trash2, UserPlus, X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppLayout } from "@/components/layouts/AppLayout";
import { useAppStore } from "@/components/providers/AppStoreProvider";
import { ActionMenu, ActionMenuItem } from "@/components/ui/ActionMenu";
import { ColumnDef, DataTable } from "@/components/ui/DataTable";
import { FormField } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { formatDate, formatDateTime, formatRupiah } from "@/lib/client/format";
import { calculateDp50, multiplyMoney, toDecimalString } from "@/lib/money";
import {
  MockCustomer,
  MockOrder,
  MockProduct,
  MONTHLY_SALES_COMPARISON,
} from "@/lib/mock/data";
import { CustomerType, OrderChannel, OrderStatus } from "@/lib/types/domain";

type SalesTab = "orders" | "products" | "customers" | "dashboard";

const NON_CANCELLABLE = new Set<OrderStatus>(["Dikirim", "Selesai", "Dibatalkan"]);

export default function SalesPage() {
  const {
    currentUser,
    isOwner,
    can,
    orders,
    setOrders,
    products,
    setProducts,
    materials,
    customers,
    setCustomers,
    invoices,
    setInvoices,
    purchaseOrders,
    logActivity,
  } = useAppStore();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<SalesTab>("orders");
  const [channelFilter, setChannelFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<MockOrder | null>(null);

  // Modal Buat Pesanan Baru (+ pelanggan inline)
  const [createOpen, setCreateOpen] = useState(false);
  const [channel, setChannel] = useState<OrderChannel>("PO Besar");
  const [customerId, setCustomerId] = useState<number>(1);
  const [inlineCustomerOpen, setInlineCustomerOpen] = useState(false);
  const [inlineCustName, setInlineCustName] = useState("");
  const [inlineCustType, setInlineCustType] = useState<CustomerType>("B2B");
  const [inlineCustPhone, setInlineCustPhone] = useState("");
  const [inlineCustAddress, setInlineCustAddress] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [draftItems, setDraftItems] = useState<{ product_id: number; qty: number }[]>([
    { product_id: 4, qty: 10 },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  // Modal Batalkan Pesanan
  const [cancelTarget, setCancelTarget] = useState<MockOrder | null>(null);
  const [cancelReason, setCancelReason] = useState("");

  // Modal CRUD Produk & BOM
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MockProduct | null>(null);
  const [prodSku, setProdSku] = useState("");
  const [prodName, setProdName] = useState("");
  const [prodVariant, setProdVariant] = useState("");
  const [prodCategory, setProdCategory] = useState("Seri Original");
  const [prodUnit, setProdUnit] = useState("pcs");
  const [prodPrice, setProdPrice] = useState("50000");
  const [prodStock, setProdStock] = useState("10");
  const [prodMinStock, setProdMinStock] = useState("5");
  const [prodBom, setProdBom] = useState<{ material_id: number; qty_per_unit: number }[]>([]);
  const [prodError, setProdError] = useState<string | null>(null);

  // Modal CRUD Pelanggan
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<MockCustomer | null>(null);
  const [custName, setCustName] = useState("");
  const [custType, setCustType] = useState<CustomerType>("B2B");
  const [custPhone, setCustPhone] = useState("");
  const [custAddress, setCustAddress] = useState("");

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (channelFilter !== "ALL" && o.order_channel !== channelFilter) return false;
      if (statusFilter !== "ALL" && o.order_status !== statusFilter) return false;
      return true;
    });
  }, [orders, channelFilter, statusFilter]);

  const draftTotal = useMemo(() => {
    return draftItems.reduce((sum, item) => {
      const prod = products.find((p) => p.product_id === item.product_id);
      if (!prod) return sum;
      return sum + Number(prod.unit_price) * item.qty;
    }, 0);
  }, [draftItems, products]);

  const draftDpPreview = useMemo(() => {
    if (channel !== "PO Besar") return "0.00";
    return calculateDp50(toDecimalString(draftTotal));
  }, [channel, draftTotal]);

  const openCreateOrderModal = () => {
    const defaultCust = customers[0];
    setChannel("PO Besar");
    setCustomerId(defaultCust?.customer_id ?? 1);
    setRecipientName(defaultCust?.customer_name ?? "");
    setRecipientPhone(defaultCust?.default_phone ?? "");
    setShippingAddress(defaultCust?.default_address ?? "");
    setDraftItems([{ product_id: products.find((p) => p.is_active)?.product_id ?? 1, qty: 10 }]);
    setInlineCustomerOpen(false);
    setFormError(null);
    setCreateOpen(true);
  };

  const handleCustomerChange = (id: number) => {
    setCustomerId(id);
    const cust = customers.find((c) => c.customer_id === id);
    if (cust) {
      setRecipientName(cust.customer_name);
      setRecipientPhone(cust.default_phone);
      setShippingAddress(cust.default_address);
      setChannel(cust.customer_type === "B2B" ? "PO Besar" : "Online");
    }
  };

  const handleAddInlineCustomer = () => {
    if (inlineCustName.trim().length < 2) return;
    const nextId = Math.max(0, ...customers.map((c) => c.customer_id)) + 1;
    const newCust: MockCustomer = {
      customer_id: nextId,
      customer_name: inlineCustName.trim(),
      customer_type: inlineCustType,
      default_phone: inlineCustPhone.trim() || "-",
      default_address: inlineCustAddress.trim() || "-",
      total_orders: 0,
    };
    setCustomers((prev) => [newCust, ...prev]);
    setCustomerId(nextId);
    setRecipientName(newCust.customer_name);
    setRecipientPhone(newCust.default_phone);
    setShippingAddress(newCust.default_address);
    setChannel(newCust.customer_type === "B2B" ? "PO Besar" : "Online");
    setInlineCustomerOpen(false);
    setInlineCustName("");
    setInlineCustPhone("");
    setInlineCustAddress("");
    logActivity("SALES", "CREATE", newCust.customer_name, `Menambahkan pelanggan baru (${newCust.customer_type}) inline saat input pesanan.`);
    showToast(`Pelanggan ${newCust.customer_name} ditambahkan`);
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!recipientName.trim() || !recipientPhone.trim() || !shippingAddress.trim()) {
      setFormError("Nama penerima, telepon, dan alamat pengiriman wajib diisi.");
      return;
    }
    if (draftItems.length === 0 || draftItems.some((i) => i.qty <= 0)) {
      setFormError("Minimal 1 item produk dengan jumlah lebih dari 0.");
      return;
    }

    if (channel === "Online") {
      for (const item of draftItems) {
        const prod = products.find((p) => p.product_id === item.product_id);
        if (!prod || prod.stock_online < item.qty) {
          setFormError(
            `Stok online ${prod?.product_name ?? "produk"} tidak mencukupi (tersedia: ${prod?.stock_online ?? 0}).`,
          );
          return;
        }
      }
    }

    const cust = customers.find((c) => c.customer_id === customerId);
    const nextOrderNum = `ORD-202611-${String(orders.length + 1).padStart(4, "0")}`;
    const nextInvNum = `INV-202611-${String(invoices.length + 1).padStart(4, "0")}`;

    const builtItems = draftItems.map((item) => {
      const prod = products.find((p) => p.product_id === item.product_id)!;
      return {
        product_id: prod.product_id,
        product_name: prod.product_name,
        sku_code: prod.sku_code,
        qty: item.qty,
        unit_price_snapshot: prod.unit_price,
        subtotal: multiplyMoney(prod.unit_price, item.qty),
      };
    });

    const totalStr = toDecimalString(draftTotal);
    const isB2B = channel === "PO Besar";
    const nowIso = new Date().toISOString();

    const newOrder: MockOrder = {
      order_id: Math.max(0, ...orders.map((o) => o.order_id)) + 1,
      order_number: nextOrderNum,
      customer_id: customerId,
      customer_name: cust?.customer_name ?? recipientName,
      customer_type: isB2B ? "B2B" : "B2C",
      order_date: nowIso.slice(0, 10),
      order_channel: channel,
      payment_scheme: isB2B ? "DP_50" : "FULL",
      recipient_name: recipientName.trim(),
      recipient_phone: recipientPhone.trim(),
      shipping_address: shippingAddress.trim(),
      shipping_cost: "0.00",
      total_amount: totalStr,
      tracking_number: null,
      quarantine_doc_number: null,
      order_status: "Menunggu_Pembayaran",
      settlement_paid: false,
      items: builtItems,
      logs: [
        {
          from_status: null,
          to_status: "Menunggu_Pembayaran",
          changed_by: currentUser?.full_name ?? "Staf",
          changed_at: nowIso,
          note: isB2B
            ? `PO B2B dibuat. Invoice DP 50% (${nextInvNum}) terbit otomatis.`
            : `Pesanan B2C dibuat. Stok online dipotong & Invoice FULL (${nextInvNum}) terbit otomatis.`,
        },
      ],
    };

    if (!isB2B) {
      setProducts((prev) =>
        prev.map((p) => {
          const ordered = draftItems.find((i) => i.product_id === p.product_id);
          return ordered ? { ...p, stock_online: p.stock_online - ordered.qty } : p;
        }),
      );
    }

    setCustomers((prev) =>
      prev.map((c) => (c.customer_id === customerId ? { ...c, total_orders: c.total_orders + 1 } : c)),
    );
    setOrders((prev) => [newOrder, ...prev]);
    setInvoices((prev) => [
      {
        invoice_id: Math.max(0, ...prev.map((i) => i.invoice_id)) + 1,
        invoice_number: nextInvNum,
        order_number: nextOrderNum,
        customer_name: newOrder.customer_name,
        invoice_type: isB2B ? "DP_50" : "FULL",
        issued_date: nowIso.slice(0, 10),
        total_billed: isB2B ? draftDpPreview : totalStr,
        shipping_cost_billed: "0.00",
        amount_paid: "0.00",
        payment_status: "Belum_Bayar",
        proof_note: null,
      },
      ...prev,
    ]);

    logActivity(
      "SALES",
      "CREATE",
      nextOrderNum,
      `Membuat pesanan ${channel} untuk ${newOrder.customer_name} senilai ${formatRupiah(totalStr)} (${nextInvNum} terbit otomatis).`,
    );

    setCreateOpen(false);
    showToast(
      `Pesanan ${nextOrderNum} berhasil disimpan`,
      "success",
      isB2B
        ? `Invoice DP 50% (${nextInvNum}) senilai ${formatRupiah(draftDpPreview)} terbit otomatis.`
        : `Invoice FULL (${nextInvNum}) terbit & stok online diperbarui.`,
    );
  };

  const handleConfirmCancelOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTarget || cancelReason.trim().length < 3) return;

    const isB2C = cancelTarget.order_channel === "Online";
    if (isB2C) {
      setProducts((prev) =>
        prev.map((p) => {
          const ordered = cancelTarget.items.find((it) => it.product_id === p.product_id);
          return ordered ? { ...p, stock_online: p.stock_online + ordered.qty } : p;
        }),
      );
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.order_id === cancelTarget.order_id
          ? {
              ...o,
              order_status: "Dibatalkan",
              logs: [
                ...o.logs,
                {
                  from_status: o.order_status,
                  to_status: "Dibatalkan",
                  changed_by: currentUser?.full_name ?? "Staf",
                  changed_at: new Date().toISOString(),
                  note: `Pesanan dibatalkan: ${cancelReason.trim()}${
                    isB2C ? " (stok online dikembalikan)." : "."
                  }`,
                },
              ],
            }
          : o,
      ),
    );

    logActivity(
      "SALES",
      "CANCEL",
      cancelTarget.order_number,
      `Membatalkan pesanan (${cancelReason.trim()})${isB2C ? " & mengembalikan stok online." : "."}`,
    );

    showToast(
      `Pesanan ${cancelTarget.order_number} dibatalkan`,
      "info",
      isB2C ? "Stok online produk telah dikembalikan secara otomatis." : undefined,
    );
    setCancelTarget(null);
    setCancelReason("");
  };

  // --- CRUD PRODUK & BOM ---
  const openProductModal = (prod?: MockProduct) => {
    setProdError(null);
    if (prod) {
      setEditingProduct(prod);
      setProdSku(prod.sku_code);
      setProdName(prod.product_name);
      setProdVariant(prod.variant_size);
      setProdCategory(prod.category);
      setProdUnit(prod.unit);
      setProdPrice(String(Number(prod.unit_price)));
      setProdStock(String(prod.stock_online));
      setProdMinStock(String(prod.min_stock_threshold));
      setProdBom(prod.bom.map((b) => ({ material_id: b.material_id, qty_per_unit: b.qty_per_unit })));
    } else {
      setEditingProduct(null);
      setProdSku(`KLR-${String(products.length + 1).padStart(3, "0")}`);
      setProdName("");
      setProdVariant("250g");
      setProdCategory("Seri Original");
      setProdUnit("pcs");
      setProdPrice("50000");
      setProdStock("10");
      setProdMinStock("5");
      setProdBom(materials[0] ? [{ material_id: materials[0].material_id, qty_per_unit: 0.25 }] : []);
    }
    setProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setProdError(null);
    const cleanSku = prodSku.trim().toUpperCase();
    if (!cleanSku || prodName.trim().length < 2) {
      setProdError("SKU dan nama produk wajib diisi.");
      return;
    }
    const duplicateSku = products.some(
      (p) => p.sku_code.toUpperCase() === cleanSku && p.product_id !== editingProduct?.product_id,
    );
    if (duplicateSku) {
      setProdError(`SKU '${cleanSku}' sudah digunakan oleh produk lain.`);
      return;
    }

    const builtBom = prodBom
      .filter((b) => b.qty_per_unit > 0)
      .map((b) => {
        const mat = materials.find((m) => m.material_id === b.material_id);
        return {
          material_id: b.material_id,
          material_name: mat?.material_name ?? "Bahan Baku",
          unit: mat?.unit ?? "unit",
          qty_per_unit: b.qty_per_unit,
        };
      });

    if (editingProduct) {
      setProducts((prev) =>
        prev.map((p) =>
          p.product_id === editingProduct.product_id
            ? {
                ...p,
                sku_code: cleanSku,
                product_name: prodName.trim(),
                variant_size: prodVariant.trim(),
                category: prodCategory.trim(),
                unit: prodUnit.trim(),
                unit_price: toDecimalString(Number(prodPrice) || 0),
                stock_online: Math.max(0, Number(prodStock) || 0),
                min_stock_threshold: Math.max(0, Number(prodMinStock) || 0),
                bom: builtBom,
              }
            : p,
        ),
      );
      logActivity("SALES", "UPDATE", cleanSku, `Memperbarui produk ${prodName.trim()} beserta komposisi BOM.`);
      showToast(`Produk ${cleanSku} berhasil diperbarui`);
    } else {
      const nextId = Math.max(0, ...products.map((p) => p.product_id)) + 1;
      setProducts((prev) => [
        ...prev,
        {
          product_id: nextId,
          sku_code: cleanSku,
          product_name: prodName.trim(),
          variant_size: prodVariant.trim(),
          category: prodCategory.trim(),
          unit: prodUnit.trim(),
          unit_price: toDecimalString(Number(prodPrice) || 0),
          stock_online: Math.max(0, Number(prodStock) || 0),
          min_stock_threshold: Math.max(0, Number(prodMinStock) || 0),
          is_active: true,
          bom: builtBom,
        },
      ]);
      logActivity("SALES", "CREATE", cleanSku, `Menambahkan produk baru ${prodName.trim()} (${prodVariant.trim()}).`);
      showToast(`Produk baru ${cleanSku} berhasil ditambahkan`);
    }
    setProductModalOpen(false);
  };

  const toggleProductActive = (prod: MockProduct) => {
    const nextState = !prod.is_active;
    setProducts((prev) =>
      prev.map((p) => (p.product_id === prod.product_id ? { ...p, is_active: nextState } : p)),
    );
    logActivity(
      "SALES",
      nextState ? "UPDATE" : "DEACTIVATE",
      prod.sku_code,
      `${nextState ? "Mengaktifkan kembali" : "Menonaktifkan"} produk ${prod.product_name}.`,
    );
    showToast(`Produk ${prod.sku_code} ${nextState ? "diaktifkan" : "dinonaktifkan"}`);
  };

  // --- CRUD PELANGGAN ---
  const openCustomerModal = (cust?: MockCustomer) => {
    if (cust) {
      setEditingCustomer(cust);
      setCustName(cust.customer_name);
      setCustType(cust.customer_type);
      setCustPhone(cust.default_phone);
      setCustAddress(cust.default_address);
    } else {
      setEditingCustomer(null);
      setCustName("");
      setCustType("B2B");
      setCustPhone("");
      setCustAddress("");
    }
    setCustomerModalOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (custName.trim().length < 2) return;

    if (editingCustomer) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.customer_id === editingCustomer.customer_id
            ? {
                ...c,
                customer_name: custName.trim(),
                customer_type: custType,
                default_phone: custPhone.trim() || "-",
                default_address: custAddress.trim() || "-",
              }
            : c,
        ),
      );
      logActivity("SALES", "UPDATE", custName.trim(), `Memperbarui data pelanggan (${custType}).`);
      showToast(`Pelanggan ${custName.trim()} diperbarui`);
    } else {
      const nextId = Math.max(0, ...customers.map((c) => c.customer_id)) + 1;
      setCustomers((prev) => [
        {
          customer_id: nextId,
          customer_name: custName.trim(),
          customer_type: custType,
          default_phone: custPhone.trim() || "-",
          default_address: custAddress.trim() || "-",
          total_orders: 0,
        },
        ...prev,
      ]);
      logActivity("SALES", "CREATE", custName.trim(), `Menambahkan pelanggan baru (${custType}).`);
      showToast(`Pelanggan ${custName.trim()} berhasil ditambahkan`);
    }
    setCustomerModalOpen(false);
  };

  const orderColumns: ColumnDef<MockOrder>[] = [
    {
      key: "order_number",
      header: "No. Pesanan",
      render: (o) => (
        <div>
          <p className="font-semibold text-slate-900">{o.order_number}</p>
          <p className="text-xs text-slate-500">{formatDate(o.order_date)}</p>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Pelanggan",
      render: (o) => (
        <div>
          <p className="font-medium text-slate-900">{o.customer_name}</p>
          <div className="mt-0.5">
            <StatusBadge status={o.customer_type} />
          </div>
        </div>
      ),
    },
    {
      key: "channel",
      header: "Kanal / Skema",
      render: (o) => (
        <div className="text-xs">
          <p className="font-medium text-slate-800">{o.order_channel}</p>
          <p className="text-slate-500">{o.payment_scheme === "DP_50" ? "DP 50%" : "Bayar Penuh"}</p>
        </div>
      ),
    },
    {
      key: "total",
      header: "Total Pesanan",
      align: "right",
      render: (o) => <span className="font-semibold text-slate-900">{formatRupiah(o.total_amount)}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (o) => <StatusBadge status={o.order_status} />,
    },
    {
      key: "actions",
      header: "Aksi",
      align: "center",
      render: (o) => {
        const items: ActionMenuItem[] = [
          {
            label: "Lihat Detail Pesanan",
            icon: <Eye className="h-3.5 w-3.5" />,
            variant: "primary",
            onClick: () => setSelectedOrder(o),
          },
        ];
        if (!NON_CANCELLABLE.has(o.order_status) && can("SALES", "edit")) {
          items.push({
            label: "Batalkan Pesanan",
            icon: <Ban className="h-3.5 w-3.5" />,
            variant: "danger",
            onClick: () => {
              setCancelTarget(o);
              setCancelReason("");
            },
          });
        }
        return <ActionMenu ariaLabel={`Aksi untuk ${o.order_number}`} items={items} />;
      },
    },
  ];

  const productColumns: ColumnDef<MockProduct>[] = [
    {
      key: "sku",
      header: "SKU",
      render: (p) => <span className="font-mono text-xs font-semibold text-slate-800">{p.sku_code}</span>,
    },
    {
      key: "name",
      header: "Produk & Varian",
      render: (p) => (
        <div>
          <p className="font-medium text-slate-900">{p.product_name}</p>
          <p className="text-xs text-slate-500">
            {p.variant_size} • {p.category}
          </p>
        </div>
      ),
    },
    {
      key: "price",
      header: "Harga Satuan",
      align: "right",
      render: (p) => <span className="font-semibold">{formatRupiah(p.unit_price)}</span>,
    },
    {
      key: "stock",
      header: "Stok Online / Min",
      align: "center",
      render: (p) => {
        const low = p.stock_online <= p.min_stock_threshold;
        return (
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums ${
              low ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-800"
            }`}
          >
            {p.stock_online} / {p.min_stock_threshold} {p.unit}
          </span>
        );
      },
    },
    {
      key: "bom",
      header: "Komposisi BOM",
      render: (p) => (
        <p className="max-w-xs text-xs text-slate-600">
          {p.bom.length === 0
            ? "Belum diatur"
            : p.bom.map((b) => `${b.material_name} (${b.qty_per_unit} ${b.unit})`).join(", ")}
        </p>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (p) => <StatusBadge status={p.is_active ? "Aktif" : "Nonaktif"} />,
    },
    {
      key: "action",
      header: "Aksi",
      align: "center",
      render: (p) => {
        const items: ActionMenuItem[] = [];
        if (can("SALES", "edit")) {
          items.push({
            label: "Edit Produk & BOM",
            icon: <Pencil className="h-3.5 w-3.5" />,
            onClick: () => openProductModal(p),
          });
        }
        if (can("SALES", "delete")) {
          items.push({
            label: p.is_active ? "Nonaktifkan Produk" : "Aktifkan Produk",
            variant: p.is_active ? "danger" : "primary",
            onClick: () => toggleProductActive(p),
          });
        }
        return <ActionMenu ariaLabel={`Aksi untuk ${p.sku_code}`} items={items} />;
      },
    },
  ];

  const customerColumns: ColumnDef<MockCustomer>[] = [
    {
      key: "name",
      header: "Nama Pelanggan",
      render: (c) => <span className="font-semibold text-slate-900">{c.customer_name}</span>,
    },
    {
      key: "type",
      header: "Tipe",
      render: (c) => <StatusBadge status={c.customer_type} />,
    },
    {
      key: "phone",
      header: "Telepon",
      render: (c) => <span className="text-xs text-slate-700">{c.default_phone}</span>,
    },
    {
      key: "address",
      header: "Alamat",
      render: (c) => <span className="text-xs text-slate-600">{c.default_address}</span>,
    },
    {
      key: "orders",
      header: "Riwayat Order",
      align: "center",
      render: (c) => <span className="font-semibold tabular-nums">{c.total_orders}</span>,
    },
    {
      key: "action",
      header: "Aksi",
      align: "center",
      render: (c) =>
        can("SALES", "edit") ? (
          <ActionMenu
            ariaLabel={`Aksi untuk ${c.customer_name}`}
            items={[
              {
                label: "Edit Pelanggan",
                icon: <Pencil className="h-3.5 w-3.5" />,
                onClick: () => openCustomerModal(c),
              },
            ]}
          />
        ) : (
          <span className="text-xs text-slate-400">-</span>
        ),
    },
  ];

  return (
    <AppLayout>
      <PageHeader
        title="Sales & Marketing"
        description="Kelola pesanan PO B2B (DP 50%), pesanan ritel B2C, katalog produk beserta BOM, dan data pelanggan."
        actions={
          can("SALES", "create") ? (
            <div className="flex flex-wrap gap-2">
              {activeTab === "products" && (
                <button
                  type="button"
                  onClick={() => openProductModal()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-900 bg-white px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Produk
                </button>
              )}
              {activeTab === "customers" && (
                <button
                  type="button"
                  onClick={() => openCustomerModal()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-900 bg-white px-4 py-2 text-sm font-medium text-emerald-900 hover:bg-emerald-50"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Pelanggan
                </button>
              )}
              <button
                type="button"
                onClick={openCreateOrderModal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
              >
                <Plus className="h-4 w-4" />
                Buat Pesanan Baru
              </button>
            </div>
          ) : null
        }
      />

      {/* Tabs Modul Sales */}
      <div className="mb-5 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {(
          [
            { id: "orders", label: "Pesanan & Pelacakan" },
            { id: "products", label: "Katalog Produk & BOM" },
            { id: "customers", label: "Pelanggan" },
            { id: "dashboard", label: "Dasbor Penjualan (Owner)" },
          ] as { id: SalesTab; label: string }[]
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

      {activeTab === "orders" && (
        <DataTable
          data={filteredOrders}
          columns={orderColumns}
          rowKey={(o) => o.order_id}
          searchPlaceholder="Cari nomor pesanan atau pelanggan..."
          searchKeys={(o) => `${o.order_number} ${o.customer_name}`}
          filters={
            <>
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
              >
                <option value="ALL">Semua Kanal</option>
                <option value="PO Besar">PO Besar (B2B)</option>
                <option value="Online">Online (B2C)</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700"
              >
                <option value="ALL">Semua Status</option>
                {(
                  [
                    "Menunggu_Pembayaran",
                    "DP_Lunas",
                    "Produksi",
                    "Packing",
                    "Karantina",
                    "Siap_Kirim",
                    "Dikirim",
                    "Selesai",
                    "Dibatalkan",
                  ] as OrderStatus[]
                ).map((st) => (
                  <option key={st} value={st}>
                    {st.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </>
          }
        />
      )}

      {activeTab === "products" && (
        <DataTable
          data={products}
          columns={productColumns}
          rowKey={(p) => p.product_id}
          searchPlaceholder="Cari SKU atau nama produk..."
          searchKeys={(p) => `${p.sku_code} ${p.product_name} ${p.category}`}
        />
      )}

      {activeTab === "customers" && (
        <DataTable
          data={customers}
          columns={customerColumns}
          rowKey={(c) => c.customer_id}
          searchPlaceholder="Cari nama pelanggan atau alamat..."
          searchKeys={(c) => `${c.customer_name} ${c.default_address} ${c.customer_type}`}
        />
      )}

      {activeTab === "dashboard" &&
        (isOwner ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold text-slate-500">Omzet B2B (6 Bulan)</p>
                <p className="mt-1.5 text-xl font-bold text-slate-900 tabular-nums">
                  {formatRupiah(
                    MONTHLY_SALES_COMPARISON.reduce((acc, m) => acc + m.b2b_omzet, 0),
                  )}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold text-slate-500">Omzet B2C (6 Bulan)</p>
                <p className="mt-1.5 text-xl font-bold text-slate-900 tabular-nums">
                  {formatRupiah(
                    MONTHLY_SALES_COMPARISON.reduce((acc, m) => acc + m.b2c_omzet, 0),
                  )}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold text-slate-500">Total Transaksi B2B / B2C</p>
                <p className="mt-1.5 text-xl font-bold text-slate-900 tabular-nums">
                  17 PO / 133 Online
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-semibold text-slate-500">Rasio Kontribusi B2C</p>
                <p className="mt-1.5 text-xl font-bold text-emerald-800 tabular-nums">20,7%</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="mb-4 text-base font-bold text-slate-900">
                Grafik Omzet Bulanan B2B vs B2C
              </h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MONTHLY_SALES_COMPARISON}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `${Math.round(Number(v) / 1_000_000)}jt`} />
                    <Tooltip formatter={(val) => formatRupiah(Number(val))} />
                    <Legend />
                    <Bar dataKey="b2b_omzet" name="B2B (PO Besar)" fill="#14532d" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="b2c_omzet" name="B2C (Ritel Online)" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center rounded-xl border border-slate-200 bg-white p-12 text-center">
            <Lock className="h-8 w-8 text-slate-400" />
            <h3 className="mt-3 text-base font-bold text-slate-900">Akses Khusus Owner (403)</h3>
            <p className="mt-1 max-w-md text-sm text-slate-600">
              Dasbor perbandingan omzet B2B vs B2C hanya dapat diakses oleh Owner sesuai kebijakan
              RBAC UMKM Keloria.
            </p>
          </div>
        ))}

      {/* Modal Detail Pesanan */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">{selectedOrder.order_number}</h2>
                  <StatusBadge status={selectedOrder.order_status} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedOrder.customer_name} • {selectedOrder.order_channel} ({selectedOrder.payment_scheme})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 grid gap-4 text-xs sm:grid-cols-2">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="font-semibold text-slate-700">Penerima & Alamat</p>
                <p className="mt-1 font-medium text-slate-900">{selectedOrder.recipient_name}</p>
                <p className="text-slate-600">{selectedOrder.recipient_phone}</p>
                <p className="mt-0.5 text-slate-600">{selectedOrder.shipping_address}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="font-semibold text-slate-700">Logistik & Dokumen</p>
                <p className="mt-1 text-slate-600">
                  No. Karantina: <strong>{selectedOrder.quarantine_doc_number ?? "-"}</strong>
                </p>
                <p className="text-slate-600">
                  Ongkir: <strong>{formatRupiah(selectedOrder.shipping_cost)}</strong>
                </p>
                <p className="text-slate-600">
                  No. Resi: <strong>{selectedOrder.tracking_number ?? "-"}</strong>
                </p>
              </div>
            </div>

            <h3 className="mt-5 text-sm font-bold text-slate-900">Rincian Item</h3>
            <div className="mt-2 overflow-hidden rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Produk</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Harga Snapshot</th>
                    <th className="px-3 py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedOrder.items.map((item) => (
                    <tr key={item.product_id}>
                      <td className="px-3 py-2 font-medium text-slate-900">{item.product_name}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{item.qty}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatRupiah(item.unit_price_snapshot)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold tabular-nums">
                        {formatRupiah(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Invoice Terkait</h3>
                <div className="mt-2 space-y-2">
                  {invoices
                    .filter((i) => i.order_number === selectedOrder.order_number)
                    .map((inv) => (
                      <div
                        key={inv.invoice_id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-slate-900">{inv.invoice_number}</p>
                          <p className="text-slate-500">
                            {inv.invoice_type} • {formatRupiah(inv.total_billed)}
                          </p>
                        </div>
                        <StatusBadge status={inv.payment_status} />
                      </div>
                    ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">PO Supplier Terkait</h3>
                <div className="mt-2 space-y-2">
                  {purchaseOrders.filter((po) => po.order_number === selectedOrder.order_number)
                    .length === 0 ? (
                    <p className="text-xs text-slate-500">Belum ada PO supplier.</p>
                  ) : (
                    purchaseOrders
                      .filter((po) => po.order_number === selectedOrder.order_number)
                      .map((po) => (
                        <div
                          key={po.po_id}
                          className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-xs"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{po.po_number}</p>
                            <p className="text-slate-500">{po.supplier_name}</p>
                          </div>
                          <StatusBadge status={po.po_status} />
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            <h3 className="mt-5 text-sm font-bold text-slate-900">Timeline Status</h3>
            <div className="mt-2 space-y-2 border-l-2 border-emerald-200 pl-4">
              {selectedOrder.logs.map((log, idx) => (
                <div key={idx} className="text-xs">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={log.to_status} />
                    <span className="text-slate-500">{formatDateTime(log.changed_at)}</span>
                  </div>
                  <p className="mt-1 text-slate-700">{log.note}</p>
                  <p className="text-[11px] text-slate-500">Oleh: {log.changed_by}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Batalkan Pesanan */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                Batalkan Pesanan {cancelTarget.order_number}?
              </h2>
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleConfirmCancelOrder} className="mt-4 space-y-4">
              <p className="text-xs text-slate-600">
                {cancelTarget.order_channel === "Online"
                  ? "Karena ini pesanan B2C (Online) dan belum dikirim, stok online akan dikembalikan secara otomatis."
                  : "Pesanan B2B yang dibatalkan akan dicatat pada riwayat status dan tidak dapat diproses lebih lanjut."}
              </p>
              <FormField label="Alasan Pembatalan" required>
                <textarea
                  rows={2}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Contoh: Pembeli membatalkan pesanan sebelum DP dibayar"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </FormField>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCancelTarget(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Konfirmasi Batalkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Buat Pesanan Baru */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Buat Pesanan Baru</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Kanal & Skema Pembayaran" required>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as OrderChannel)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="PO Besar">PO Besar (B2B — DP 50%)</option>
                    <option value="Online">Online (B2C — Bayar Penuh)</option>
                  </select>
                </FormField>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700">
                      Pelanggan <span className="text-red-600">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setInlineCustomerOpen((prev) => !prev)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:underline"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      {inlineCustomerOpen ? "Tutup Form" : "Pelanggan Baru"}
                    </button>
                  </div>
                  <select
                    value={customerId}
                    onChange={(e) => handleCustomerChange(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {customers.map((c) => (
                      <option key={c.customer_id} value={c.customer_id}>
                        {c.customer_name} ({c.customer_type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Form Buat Pelanggan Inline */}
              {inlineCustomerOpen && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 space-y-3">
                  <p className="text-xs font-bold text-emerald-950">Tambah Pelanggan Baru (Inline)</p>
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    <input
                      type="text"
                      value={inlineCustName}
                      onChange={(e) => setInlineCustName(e.target.value)}
                      placeholder="Nama pelanggan / perusahaan"
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                    />
                    <select
                      value={inlineCustType}
                      onChange={(e) => setInlineCustType(e.target.value as CustomerType)}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                    >
                      <option value="B2B">Mitra B2B</option>
                      <option value="B2C">Retail (B2C)</option>
                    </select>
                    <input
                      type="text"
                      value={inlineCustPhone}
                      onChange={(e) => setInlineCustPhone(e.target.value)}
                      placeholder="No. Telepon"
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inlineCustAddress}
                      onChange={(e) => setInlineCustAddress(e.target.value)}
                      placeholder="Alamat lengkap"
                      className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddInlineCustomer}
                      className="rounded-lg bg-emerald-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      Pakai Pelanggan Ini
                    </button>
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Nama Penerima" required>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </FormField>
                <FormField label="Telepon Penerima" required>
                  <input
                    type="text"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </FormField>
              </div>

              <FormField label="Alamat Pengiriman" required>
                <textarea
                  rows={2}
                  value={shippingAddress}
                  onChange={(e) => setShippingAddress(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </FormField>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Daftar Produk</span>
                  <button
                    type="button"
                    onClick={() =>
                      setDraftItems((prev) => [
                        ...prev,
                        { product_id: products.find((p) => p.is_active)?.product_id ?? 1, qty: 1 },
                      ])
                    }
                    className="text-xs font-semibold text-emerald-800 hover:underline"
                  >
                    + Tambah Baris
                  </button>
                </div>
                <div className="space-y-2">
                  {draftItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={item.product_id}
                        onChange={(e) => {
                          const pid = Number(e.target.value);
                          setDraftItems((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, product_id: pid } : row)),
                          );
                        }}
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      >
                        {products
                          .filter((p) => p.is_active)
                          .map((p) => (
                            <option key={p.product_id} value={p.product_id}>
                              {p.sku_code} — {p.product_name} ({p.variant_size}) |{" "}
                              {formatRupiah(p.unit_price)} [Stok: {p.stock_online}]
                            </option>
                          ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={item.qty}
                        onChange={(e) => {
                          const qty = Math.max(1, Number(e.target.value));
                          setDraftItems((prev) =>
                            prev.map((row, i) => (i === idx ? { ...row, qty } : row)),
                          );
                        }}
                        className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-right text-sm tabular-nums"
                      />
                      {draftItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setDraftItems((prev) => prev.filter((_, i) => i !== idx))}
                          className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                          aria-label="Hapus baris"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-700">Total Nilai Pesanan</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {formatRupiah(draftTotal)}
                  </span>
                </div>
                {channel === "PO Besar" && (
                  <div className="mt-1.5 flex justify-between border-t border-emerald-200 pt-1.5">
                    <span className="font-medium text-emerald-900">
                      Pratinjau Tagihan Invoice DP 50% (Otomatis)
                    </span>
                    <span className="font-bold text-emerald-900 tabular-nums">
                      {formatRupiah(draftDpPreview)}
                    </span>
                  </div>
                )}
              </div>

              {formError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Simpan Pesanan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Produk & BOM */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                {editingProduct ? `Edit Produk ${editingProduct.sku_code}` : "Tambah Produk & BOM Baru"}
              </h2>
              <button
                type="button"
                onClick={() => setProductModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveProduct} className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <FormField label="Kode SKU" required>
                  <input
                    type="text"
                    value={prodSku}
                    onChange={(e) => setProdSku(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                    required
                  />
                </FormField>
                <div className="sm:col-span-2">
                  <FormField label="Nama Produk" required>
                    <input
                      type="text"
                      value={prodName}
                      onChange={(e) => setProdName(e.target.value)}
                      placeholder="Contoh: Produk Olahan Keloria Rasa Baru"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      required
                    />
                  </FormField>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <FormField label="Varian / Ukuran">
                  <input
                    type="text"
                    value={prodVariant}
                    onChange={(e) => setProdVariant(e.target.value)}
                    placeholder="250g / 1 kg"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </FormField>
                <FormField label="Kategori" required>
                  <input
                    type="text"
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </FormField>
                <FormField label="Satuan" required>
                  <input
                    type="text"
                    value={prodUnit}
                    onChange={(e) => setProdUnit(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    required
                  />
                </FormField>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <FormField label="Harga Jual (Rp)" required>
                  <input
                    type="number"
                    min={0}
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums"
                    required
                  />
                </FormField>
                <FormField label="Stok Online Awal">
                  <input
                    type="number"
                    min={0}
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums"
                  />
                </FormField>
                <FormField label="Batas Min. Stok">
                  <input
                    type="number"
                    min={0}
                    value={prodMinStock}
                    onChange={(e) => setProdMinStock(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums"
                  />
                </FormField>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    Komposisi Bahan Baku (BOM per 1 unit)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setProdBom((prev) => [
                        ...prev,
                        { material_id: materials[0]?.material_id ?? 1, qty_per_unit: 1 },
                      ])
                    }
                    className="text-xs font-semibold text-emerald-800 hover:underline"
                  >
                    + Tambah Bahan
                  </button>
                </div>
                <div className="space-y-2">
                  {prodBom.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={row.material_id}
                        onChange={(e) => {
                          const mid = Number(e.target.value);
                          setProdBom((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, material_id: mid } : r)),
                          );
                        }}
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                      >
                        {materials.map((m) => (
                          <option key={m.material_id} value={m.material_id}>
                            {m.material_name} ({m.unit})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        min={0.01}
                        value={row.qty_per_unit}
                        onChange={(e) => {
                          const q = Number(e.target.value) || 0;
                          setProdBom((prev) =>
                            prev.map((r, i) => (i === idx ? { ...r, qty_per_unit: q } : r)),
                          );
                        }}
                        className="w-24 rounded-lg border border-slate-300 px-2.5 py-1.5 text-right text-xs tabular-nums"
                      />
                      <button
                        type="button"
                        onClick={() => setProdBom((prev) => prev.filter((_, i) => i !== idx))}
                        className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {prodError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                  {prodError}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah / Edit Pelanggan */}
      {customerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                {editingCustomer ? "Edit Pelanggan" : "Tambah Pelanggan Baru"}
              </h2>
              <button
                type="button"
                onClick={() => setCustomerModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCustomer} className="mt-4 space-y-4">
              <FormField label="Nama Pelanggan / Perusahaan" required>
                <input
                  type="text"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </FormField>
              <FormField label="Tipe Pelanggan" required>
                <select
                  value={custType}
                  onChange={(e) => setCustType(e.target.value as CustomerType)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="B2B">Mitra B2B</option>
                  <option value="B2C">Retail (B2C)</option>
                </select>
              </FormField>
              <FormField label="Nomor Telepon">
                <input
                  type="text"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </FormField>
              <FormField label="Alamat Default">
                <textarea
                  rows={2}
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </FormField>
              <div className="flex justify-end gap-2 border-t border-slate-200 pt-3">
                <button
                  type="button"
                  onClick={() => setCustomerModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
