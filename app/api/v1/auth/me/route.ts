import { ok } from "@/lib/response";
import { withAuth } from "@/lib/withAuth";
import { getMeService } from "@/modules/auth/service";

/**
 * GET /api/v1/auth/me
 * Mengembalikan profil user yang sedang login, role, dan matriks izin RBAC.
 */
export const GET = withAuth(async (_request, { user }) => {
  const profile = getMeService(user);
  return ok(profile, "Berhasil mengambil profil pengguna.");
});
