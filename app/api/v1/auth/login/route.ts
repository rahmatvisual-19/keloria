import { NextRequest } from "next/server";
import { setSessionCookie } from "@/lib/auth";
import { enforceLoginRateLimit, getClientIp } from "@/lib/rate-limit";
import { handleApiError, ok } from "@/lib/response";
import { parseBody } from "@/lib/validate";
import { loginSchema } from "@/modules/auth/schema";
import { loginService } from "@/modules/auth/service";

/**
 * POST /api/v1/auth/login
 * Autentikasi username + password, rate-limit 5 percobaan/menit/IP, set JWT httpOnly cookie.
 */
export async function POST(request: NextRequest) {
  try {
    enforceLoginRateLimit(getClientIp(request));
    const body = await parseBody(request, loginSchema);
    const { token, user } = await loginService(body);

    const response = ok(user, "Login berhasil.");
    return setSessionCookie(response, token);
  } catch (err) {
    return handleApiError(err);
  }
}
