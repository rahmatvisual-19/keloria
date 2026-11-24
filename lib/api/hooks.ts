"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { http } from "@/lib/client/http";
import { PaginatedPayload } from "@/lib/response";
import { SessionUser } from "@/lib/types/domain";

/**
 * Kumpulan TanStack Query hooks untuk berkomunikasi dengan seluruh endpoint `/api/v1/**`.
 * Siap digunakan secara langsung saat backend terhubung ke PostgreSQL.
 */

export const queryKeys = {
  me: ["auth", "me"] as const,
  users: ["users"] as const,
  rolePermissions: ["roles", "permissions"] as const,
  products: ["sales", "products"] as const,
  customers: ["sales", "customers"] as const,
  orders: ["sales", "orders"] as const,
  salesDashboard: (months: number) => ["sales", "dashboard", months] as const,
  materials: ["scm", "materials"] as const,
  suppliers: ["scm", "suppliers"] as const,
  purchaseOrders: ["scm", "purchase-orders"] as const,
  stockAlerts: ["scm", "stock-alerts"] as const,
  invoices: ["finance", "invoices"] as const,
  expenses: ["finance", "expenses"] as const,
  cashflow: ["finance", "cashflow"] as const,
  financialReport: (month: string) => ["reports", "financial", month] as const,
  employees: ["hr", "employees"] as const,
  payrolls: ["hr", "payrolls"] as const,
};

// --- AUTH ---

export function useMeQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => http.get<SessionUser>("/api/v1/auth/me", { skipAuthRedirect: true }),
    enabled,
    retry: false,
  });
}

export function useLoginMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { username: string; password: string }) =>
      http.post<SessionUser>("/api/v1/auth/login", payload, { skipAuthRedirect: true }),
    onSuccess: (user) => {
      qc.setQueryData(queryKeys.me, user);
    },
  });
}

export function useLogoutMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => http.post<{ logged_out: boolean }>("/api/v1/auth/logout"),
    onSuccess: () => {
      qc.clear();
    },
  });
}

// --- SALES ---

export function useProductsQuery(search = "") {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  return useQuery({
    queryKey: [...queryKeys.products, search],
    queryFn: () => http.get<PaginatedPayload<unknown>>(`/api/v1/sales/products${qs}`),
  });
}

export function useCustomersQuery(search = "") {
  const qs = search ? `?search=${encodeURIComponent(search)}` : "";
  return useQuery({
    queryKey: [...queryKeys.customers, search],
    queryFn: () => http.get<PaginatedPayload<unknown>>(`/api/v1/sales/customers${qs}`),
  });
}

export function useOrdersQuery(params?: { channel?: string; status?: string; search?: string }) {
  const sp = new URLSearchParams();
  if (params?.channel) sp.set("order_channel", params.channel);
  if (params?.status) sp.set("order_status", params.status);
  if (params?.search) sp.set("search", params.search);
  const qs = sp.toString() ? `?${sp.toString()}` : "";

  return useQuery({
    queryKey: [...queryKeys.orders, params],
    queryFn: () => http.get<PaginatedPayload<unknown>>(`/api/v1/sales/orders${qs}`),
  });
}

export function useCreateOrderMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      http.post<unknown>("/api/v1/sales/orders", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.orders });
      qc.invalidateQueries({ queryKey: queryKeys.invoices });
      qc.invalidateQueries({ queryKey: queryKeys.products });
      qc.invalidateQueries({ queryKey: queryKeys.stockAlerts });
    },
  });
}

export function useSalesDashboardQuery(months = 6, enabled = true) {
  return useQuery({
    queryKey: queryKeys.salesDashboard(months),
    queryFn: () => http.get<unknown>(`/api/v1/sales/dashboard?months=${months}`),
    enabled,
  });
}

// --- SCM ---

export function useStockAlertsQuery() {
  return useQuery({
    queryKey: queryKeys.stockAlerts,
    queryFn: () => http.get<{ count: number; items: unknown[] }>("/api/v1/scm/stock-alerts"),
  });
}

export function usePurchaseOrdersQuery() {
  return useQuery({
    queryKey: queryKeys.purchaseOrders,
    queryFn: () => http.get<PaginatedPayload<unknown>>("/api/v1/scm/purchase-orders"),
  });
}

// --- FINANCE ---

export function useInvoicesQuery() {
  return useQuery({
    queryKey: queryKeys.invoices,
    queryFn: () => http.get<PaginatedPayload<unknown>>("/api/v1/finance/invoices"),
  });
}

export function useVerifyInvoiceMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ invoiceId, payload }: { invoiceId: number; payload: FormData | Record<string, unknown> }) =>
      http.post<unknown>(`/api/v1/finance/invoices/${invoiceId}/verify`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.invoices });
      qc.invalidateQueries({ queryKey: queryKeys.orders });
      qc.invalidateQueries({ queryKey: queryKeys.cashflow });
    },
  });
}

export function useCashflowQuery() {
  return useQuery({
    queryKey: queryKeys.cashflow,
    queryFn: () => http.get<unknown>("/api/v1/finance/cashflow"),
  });
}

export function useMonthlyReportQuery(month: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.financialReport(month),
    queryFn: () =>
      http.get<unknown>(`/api/v1/reports/financial?month=${encodeURIComponent(month)}&format=json`),
    enabled,
  });
}

// --- HR & USERS ---

export function useEmployeesQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.employees,
    queryFn: () => http.get<PaginatedPayload<unknown>>("/api/v1/hr/employees"),
    enabled,
  });
}

export function usePayrollsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.payrolls,
    queryFn: () => http.get<unknown>("/api/v1/hr/payrolls"),
    enabled,
  });
}

export function useUsersQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: () => http.get<PaginatedPayload<unknown>>("/api/v1/users"),
    enabled,
  });
}

export function useRolePermissionsQuery(enabled = true) {
  return useQuery({
    queryKey: queryKeys.rolePermissions,
    queryFn: () => http.get<unknown[]>("/api/v1/roles/permissions"),
    enabled,
  });
}
