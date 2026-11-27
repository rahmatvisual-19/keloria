"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import {
  ActivityAction,
  ActivityModule,
  INITIAL_ACTIVITY_LOGS,
  INITIAL_CUSTOMERS,
  INITIAL_EXPENSES,
  INITIAL_INVOICES,
  INITIAL_MATERIALS,
  INITIAL_ORDERS,
  INITIAL_PAYROLLS,
  INITIAL_POS,
  INITIAL_PRODUCTS,
  INITIAL_SESSION_LOGS,
  INITIAL_SUPPLIERS,
  INITIAL_USERS,
  MockActivityLog,
  MockCustomer,
  MockExpense,
  MockInvoice,
  MockMaterial,
  MockOrder,
  MockPayroll,
  MockProduct,
  MockPurchaseOrder,
  MockSessionLog,
  MockSupplier,
  MockUser,
} from "@/lib/mock/data";
import {
  ModuleCode,
  PermissionAction,
  PermissionMatrix,
  ROLE_PERMISSION_DEFAULTS,
  RoleName,
  SessionUser,
  UserPermissionOverrides,
} from "@/lib/types/domain";

interface AppStoreContextValue {
  // Auth & RBAC state
  currentUser: SessionUser | null;
  isOwner: boolean;
  isManagerOrOwner: boolean;
  can: (moduleCode: ModuleCode, action: PermissionAction) => boolean;
  loginAsRole: (role: RoleName) => void;
  loginWithCredentials: (username: string, password: string) => { ok: boolean; message?: string };
  logout: () => void;
  rolePermissions: Record<RoleName, PermissionMatrix>;
  updateRolePermission: (
    role: RoleName,
    moduleCode: ModuleCode,
    action: PermissionAction,
    value: boolean,
  ) => void;
  userPermissions: UserPermissionOverrides;
  setUserPermissionOverride: (
    userId: number,
    moduleCode: ModuleCode,
    action: PermissionAction,
    value: boolean,
  ) => void;
  resetUserPermissionOverrides: (userId: number) => void;
  getEffectivePermissions: (user: MockUser) => PermissionMatrix;

  // Domain state (interaktif di UI, siap diganti TanStack Query + API)
  users: MockUser[];
  setUsers: React.Dispatch<React.SetStateAction<MockUser[]>>;
  products: MockProduct[];
  setProducts: React.Dispatch<React.SetStateAction<MockProduct[]>>;
  materials: MockMaterial[];
  setMaterials: React.Dispatch<React.SetStateAction<MockMaterial[]>>;
  suppliers: MockSupplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<MockSupplier[]>>;
  customers: MockCustomer[];
  setCustomers: React.Dispatch<React.SetStateAction<MockCustomer[]>>;
  orders: MockOrder[];
  setOrders: React.Dispatch<React.SetStateAction<MockOrder[]>>;
  purchaseOrders: MockPurchaseOrder[];
  setPurchaseOrders: React.Dispatch<React.SetStateAction<MockPurchaseOrder[]>>;
  invoices: MockInvoice[];
  setInvoices: React.Dispatch<React.SetStateAction<MockInvoice[]>>;
  expenses: MockExpense[];
  setExpenses: React.Dispatch<React.SetStateAction<MockExpense[]>>;
  payrolls: MockPayroll[];
  setPayrolls: React.Dispatch<React.SetStateAction<MockPayroll[]>>;
  activityLogs: MockActivityLog[];
  logActivity: (
    moduleCode: ActivityModule,
    action: ActivityAction,
    entityRef: string,
    description: string,
  ) => void;
  sessionLogs: MockSessionLog[];
  lowStockProducts: MockProduct[];
}

const AppStoreContext = createContext<AppStoreContextValue | null>(null);

function mergePermissions(
  roleMatrix: PermissionMatrix,
  userOverride?: Partial<Record<ModuleCode, Partial<Record<PermissionAction, boolean>>>>,
): PermissionMatrix {
  const merged = structuredClone(roleMatrix);
  if (!userOverride) return merged;
  for (const mod of ["SALES", "SCM", "FINANCE", "HR"] as ModuleCode[]) {
    const modOv = userOverride[mod];
    if (!modOv) continue;
    for (const act of ["view", "create", "edit", "delete"] as PermissionAction[]) {
      if (modOv[act] !== undefined) {
        merged[mod][act] = modOv[act]!;
      }
    }
  }
  return merged;
}

function toSessionUser(
  user: MockUser,
  matrix: Record<RoleName, PermissionMatrix>,
  userOverrides: UserPermissionOverrides,
): SessionUser {
  const effective =
    user.role_name === "Owner"
      ? matrix.Owner
      : mergePermissions(matrix[user.role_name], userOverrides[user.user_id]);
  return {
    user_id: user.user_id,
    full_name: user.full_name,
    username: user.username,
    role_name: user.role_name,
    employment_type: user.employment_type,
    pay_scheme: user.pay_scheme,
    status: user.status,
    permissions: effective,
  };
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [rolePermissions, setRolePermissions] = useState<Record<RoleName, PermissionMatrix>>(
    () => structuredClone(ROLE_PERMISSION_DEFAULTS),
  );
  const [userPermissions, setUserPermissions] = useState<UserPermissionOverrides>({});
  const [users, setUsers] = useState<MockUser[]>(INITIAL_USERS);
  const [activeUserId, setActiveUserId] = useState<number | null>(1); // Default Owner agar UI langsung terlihat
  const [products, setProducts] = useState<MockProduct[]>(INITIAL_PRODUCTS);
  const [materials, setMaterials] = useState<MockMaterial[]>(INITIAL_MATERIALS);
  const [suppliers, setSuppliers] = useState<MockSupplier[]>(INITIAL_SUPPLIERS);
  const [customers, setCustomers] = useState<MockCustomer[]>(INITIAL_CUSTOMERS);
  const [orders, setOrders] = useState<MockOrder[]>(INITIAL_ORDERS);
  const [purchaseOrders, setPurchaseOrders] = useState<MockPurchaseOrder[]>(INITIAL_POS);
  const [invoices, setInvoices] = useState<MockInvoice[]>(INITIAL_INVOICES);
  const [expenses, setExpenses] = useState<MockExpense[]>(INITIAL_EXPENSES);
  const [payrolls, setPayrolls] = useState<MockPayroll[]>(INITIAL_PAYROLLS);
  const [activityLogs, setActivityLogs] = useState<MockActivityLog[]>(INITIAL_ACTIVITY_LOGS);
  const [sessionLogs, setSessionLogs] = useState<MockSessionLog[]>(INITIAL_SESSION_LOGS);

  const currentUser = useMemo(() => {
    if (activeUserId === null) return null;
    const found = users.find((u) => u.user_id === activeUserId);
    if (!found || found.status !== "Aktif") return null;
    return toSessionUser(found, rolePermissions, userPermissions);
  }, [activeUserId, users, rolePermissions, userPermissions]);

  const isOwner = currentUser?.role_name === "Owner";
  const isManagerOrOwner =
    currentUser?.role_name === "Owner" || currentUser?.role_name === "Manager/SDM";

  const getEffectivePermissions = (user: MockUser): PermissionMatrix => {
    if (user.role_name === "Owner") return rolePermissions.Owner;
    return mergePermissions(rolePermissions[user.role_name], userPermissions[user.user_id]);
  };

  const setUserPermissionOverride = (
    userId: number,
    moduleCode: ModuleCode,
    action: PermissionAction,
    value: boolean,
  ) => {
    const target = users.find((u) => u.user_id === userId);
    if (!target || target.role_name === "Owner") return;
    setUserPermissions((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [moduleCode]: {
          ...prev[userId]?.[moduleCode],
          [action]: value,
        },
      },
    }));
  };

  const resetUserPermissionOverrides = (userId: number) => {
    setUserPermissions((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  };

  const can = (moduleCode: ModuleCode, action: PermissionAction): boolean => {
    if (!currentUser) return false;
    return Boolean(currentUser.permissions[moduleCode]?.[action]);
  };

  const logActivity = (
    moduleCode: ActivityModule,
    action: ActivityAction,
    entityRef: string,
    description: string,
  ) => {
    setActivityLogs((prev) => [
      {
        log_id: prev.length > 0 ? Math.max(...prev.map((l) => l.log_id)) + 1 : 1,
        timestamp: new Date().toISOString(),
        actor_name: currentUser?.full_name ?? "Sistem",
        actor_role: currentUser?.role_name ?? "Owner",
        module_code: moduleCode,
        action,
        entity_ref: entityRef,
        description,
      },
      ...prev,
    ]);
  };

  const loginAsRole = (role: RoleName) => {
    const found = users.find((u) => u.role_name === role && u.status === "Aktif");
    if (found) {
      setActiveUserId(found.user_id);
      const nowIso = new Date().toISOString();
      setSessionLogs((prev) => [
        {
          session_id: `SES-${Date.now().toString().slice(-6)}`,
          username: found.username,
          full_name: found.full_name,
          role_name: found.role_name,
          login_at: nowIso,
          logout_at: null,
          status: "Aktif",
        },
        ...prev,
      ]);
      setActivityLogs((prev) => [
        {
          log_id: prev.length > 0 ? Math.max(...prev.map((l) => l.log_id)) + 1 : 1,
          timestamp: nowIso,
          actor_name: found.full_name,
          actor_role: found.role_name,
          module_code: "AUTH",
          action: "LOGIN",
          entity_ref: found.username,
          description: `Masuk ke sistem sebagai ${found.role_name}.`,
        },
        ...prev,
      ]);
    }
  };

  const loginWithCredentials = (username: string, password: string) => {
    const found = users.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!found || password !== "Kelo#12345") {
      return { ok: false, message: "Username atau kata sandi tidak sesuai." };
    }
    if (found.status !== "Aktif") {
      return { ok: false, message: "Akun Anda berstatus Nonaktif. Hubungi Owner." };
    }
    setActiveUserId(found.user_id);
    const nowIso = new Date().toISOString();
    setSessionLogs((prev) => [
      {
        session_id: `SES-${Date.now().toString().slice(-6)}`,
        username: found.username,
        full_name: found.full_name,
        role_name: found.role_name,
        login_at: nowIso,
        logout_at: null,
        status: "Aktif",
      },
      ...prev,
    ]);
    setActivityLogs((prev) => [
      {
        log_id: prev.length > 0 ? Math.max(...prev.map((l) => l.log_id)) + 1 : 1,
        timestamp: nowIso,
        actor_name: found.full_name,
        actor_role: found.role_name,
        module_code: "AUTH",
        action: "LOGIN",
        entity_ref: found.username,
        description: "Login berhasil melalui halaman autentikasi.",
      },
      ...prev,
    ]);
    return { ok: true };
  };

  const logout = () => {
    if (currentUser) {
      const nowIso = new Date().toISOString();
      setSessionLogs((prev) =>
        prev.map((s) =>
          s.username === currentUser.username && s.status === "Aktif"
            ? { ...s, status: "Logout", logout_at: nowIso }
            : s,
        ),
      );
      setActivityLogs((prev) => [
        {
          log_id: prev.length > 0 ? Math.max(...prev.map((l) => l.log_id)) + 1 : 1,
          timestamp: nowIso,
          actor_name: currentUser.full_name,
          actor_role: currentUser.role_name,
          module_code: "AUTH",
          action: "LOGOUT",
          entity_ref: currentUser.username,
          description: "Keluar dari sesi Kelo-ERP.",
        },
        ...prev,
      ]);
    }
    setActiveUserId(null);
  };

  const updateRolePermission = (
    role: RoleName,
    moduleCode: ModuleCode,
    action: PermissionAction,
    value: boolean,
  ) => {
    if (role === "Owner") return; // Baris Owner selalu terkunci
    setRolePermissions((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [moduleCode]: {
          ...prev[role][moduleCode],
          [action]: value,
        },
      },
    }));
  };

  const lowStockProducts = useMemo(
    () => products.filter((p) => p.is_active && p.stock_online <= p.min_stock_threshold),
    [products],
  );

  return (
    <AppStoreContext.Provider
      value={{
        currentUser,
        isOwner,
        isManagerOrOwner,
        can,
        loginAsRole,
        loginWithCredentials,
        logout,
        rolePermissions,
        updateRolePermission,
        userPermissions,
        setUserPermissionOverride,
        resetUserPermissionOverrides,
        getEffectivePermissions,
        users,
        setUsers,
        products,
        setProducts,
        materials,
        setMaterials,
        suppliers,
        setSuppliers,
        customers,
        setCustomers,
        orders,
        setOrders,
        purchaseOrders,
        setPurchaseOrders,
        invoices,
        setInvoices,
        expenses,
        setExpenses,
        payrolls,
        setPayrolls,
        activityLogs,
        logActivity,
        sessionLogs,
        lowStockProducts,
      }}
    >
      {children}
    </AppStoreContext.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) {
    throw new Error("useAppStore harus digunakan di dalam AppStoreProvider.");
  }
  return ctx;
}
