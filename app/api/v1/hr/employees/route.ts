import { created, paginated } from "@/lib/response";
import { parseBody, parseQuery } from "@/lib/validate";
import { withAuth } from "@/lib/withAuth";
import { createEmployeeSchema, listEmployeesQuerySchema } from "@/modules/hr/schema";
import { createEmployeeService, listEmployeesService } from "@/modules/hr/service";

/**
 * GET /api/v1/hr/employees
 * Memerlukan HR.view (Owner & Manager/SDM; Pegawai & Anak PKL otomatis 403).
 * `base_salary` otomatis disembunyikan untuk non-Owner.
 */
export const GET = withAuth(
  async (request, { user }) => {
    const query = parseQuery(request, listEmployeesQuerySchema);
    const result = await listEmployeesService(query, user.role_name);
    return paginated(result.items, result.total, result.page, result.limit);
  },
  { permission: ["HR", "view"] },
);

/**
 * POST /api/v1/hr/employees
 * Delegasi terbatas: Owner penuh; Manager/SDM hanya boleh menambah Pegawai atau Anak PKL (base_salary otomatis 0).
 */
export const POST = withAuth(
  async (request, { user }) => {
    const body = await parseBody(request, createEmployeeSchema);
    const employee = await createEmployeeService(body, user.role_name);
    return created(employee, "Pegawai baru berhasil ditambahkan.");
  },
  { roles: ["Owner", "Manager/SDM"] },
);
