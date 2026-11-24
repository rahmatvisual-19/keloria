import { ForbiddenError, UnauthorizedError } from "./errors";
import { prisma } from "./prisma";
import {
  ModuleCode,
  PermissionAction,
  PermissionMatrix,
  RoleName,
  UserStatus,
} from "./types/domain";

const CACHE_TTL_MS = 30_000; // Cache singkat 30 detik di server

interface CacheEntry {
  matrix: PermissionMatrix;
  expiresAt: number;
}

const roleMatrixCache = new Map<number, CacheEntry>();

function createEmptyMatrix(): PermissionMatrix {
  return {
    SALES: { view: false, create: false, edit: false, delete: false },
    SCM: { view: false, create: false, edit: false, delete: false },
    FINANCE: { view: false, create: false, edit: false, delete: false },
    HR: { view: false, create: false, edit: false, delete: false },
  };
}

/**
 * Memuat matriks izin `role_permissions` untuk suatu `role_id` dari DB (dengan cache singkat).
 */
export async function getRolePermissions(roleId: number): Promise<PermissionMatrix> {
  const now = Date.now();
  const cached = roleMatrixCache.get(roleId);
  if (cached && now < cached.expiresAt) {
    return cached.matrix;
  }

  const rows = await prisma.rolePermission.findMany({
    where: { role_id: roleId },
    include: { module: true },
  });

  const matrix = createEmptyMatrix();
  for (const row of rows) {
    const code = row.module.module_code as ModuleCode;
    if (code in matrix) {
      matrix[code] = {
        view: row.can_view,
        create: row.can_create,
        edit: row.can_edit,
        delete: row.can_delete,
      };
    }
  }

  roleMatrixCache.set(roleId, { matrix, expiresAt: now + CACHE_TTL_MS });
  return matrix;
}

/**
 * Hapus cache RBAC setiap kali Owner mengubah matriks `role_permissions`.
 */
export function invalidateRbacCache(roleId?: number): void {
  if (roleId !== undefined) {
    roleMatrixCache.delete(roleId);
  } else {
    roleMatrixCache.clear();
  }
}

export function hasPermission(
  matrix: PermissionMatrix,
  moduleCode: ModuleCode,
  action: PermissionAction,
): boolean {
  return Boolean(matrix[moduleCode]?.[action]);
}

export interface AccessCheckTarget {
  role_name: RoleName;
  status: UserStatus;
  permissions: PermissionMatrix;
}

export interface AccessGuardOptions {
  roles?: RoleName[];
  permission?: [ModuleCode, PermissionAction];
}

/**
 * Fungsi murni pengecekan status akun + RBAC (dipakai oleh `withAuth` dan diuji di unit test).
 */
export function assertAccess(user: AccessCheckTarget, options: AccessGuardOptions = {}): void {
  if (user.status !== "Aktif") {
    throw new UnauthorizedError("Akun Anda berstatus Nonaktif. Hubungi Owner.");
  }

  if (options.roles && options.roles.length > 0) {
    if (!options.roles.includes(user.role_name)) {
      throw new ForbiddenError(
        `Akses ditolak. Fitur ini khusus untuk role: ${options.roles.join(", ")}.`,
      );
    }
  }

  if (options.permission) {
    const [moduleCode, action] = options.permission;
    if (!hasPermission(user.permissions, moduleCode, action)) {
      throw new ForbiddenError(
        `Anda tidak memiliki izin ${action.toUpperCase()} pada modul ${moduleCode}.`,
      );
    }
  }
}
