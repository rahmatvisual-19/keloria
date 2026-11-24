import { ok } from "@/lib/response";
import { parseBody } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { updateRolePermissionSchema } from "@/modules/users/schema";
import {
  getPermissionMatrixService,
  updateRolePermissionService,
} from "@/modules/users/service";

/**
 * GET /api/v1/roles/permissions (Owner-only)
 * Mengambil matriks hak akses lengkap (4 role × 4 modul).
 */
export const GET = withAuth(
  async () => {
    const matrix = await getPermissionMatrixService();
    return ok(matrix, "Berhasil mengambil matriks hak akses.");
  },
  { roles: ["Owner"] },
);

/**
 * PATCH /api/v1/roles/permissions (Owner-only)
 * Memperbarui hak akses untuk role non-Owner dan menginvalidasi cache RBAC.
 */
export const PATCH = withAuth(
  async (request) => {
    const body = await parseBody(request, updateRolePermissionSchema);
    const updated = await updateRolePermissionService(body);
    return ok(updated, "Hak akses role berhasil diperbarui.");
  },
  { roles: ["Owner"] },
);
