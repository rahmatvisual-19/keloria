import { NextRequest } from "next/server";
import { clearSessionCookie, verifySessionToken } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { handleApiError, ok } from "@/lib/response";
import { logoutService } from "@/modules/auth/service";

/**
 * POST /api/v1/auth/logout
 * Menutup sesi aktif di `session_logs` dan menghapus cookie JWT.
 */
export async function POST(request: NextRequest) {
  try {
    const env = getEnv();
    const token = request.cookies.get(env.cookieName)?.value;
    let sid: string | null = null;

    if (token) {
      try {
        const payload = await verifySessionToken(token);
        sid = payload.sid;
      } catch {
        // Token sudah kedaluwarsa/tidak valid; tetap bersihkan cookie
      }
    }

    await logoutService(sid);
    const response = ok({ logged_out: true }, "Logout berhasil.");
    return clearSessionCookie(response);
  } catch (err) {
    return handleApiError(err);
  }
}
