import { NextRequest } from "next/server";
import { verifySessionToken } from "./auth";
import { getEnv } from "./env";
import { UnauthorizedError } from "./errors";
import { prisma } from "./prisma";
import { AccessGuardOptions, assertAccess, getRolePermissions } from "./rbac";
import { handleApiError } from "./response";
import { EmploymentType, PayScheme, PermissionMatrix, RoleName, UserStatus } from "./types/domain";

export interface AuthenticatedUser {
  user_id: number;
  role_id: number;
  role_name: RoleName;
  full_name: string;
  username: string;
  phone: string | null;
  employment_type: EmploymentType;
  pay_scheme: PayScheme;
  status: UserStatus;
  session_id: string;
  permissions: PermissionMatrix;
}

export interface RouteHandlerContext<P = Record<string, string>> {
  params: Promise<P>;
  user: AuthenticatedUser;
}

type ProtectedHandler<P = Record<string, string>> = (
  request: NextRequest,
  context: RouteHandlerContext<P>,
) => Promise<Response>;

/**
 * Wrapper terpusat untuk semua Route Handler terproteksi:
 * 1. Verifikasi JWT dari httpOnly cookie.
 * 2. Muat user dari DB (tanpa password_hash) & tolak segera jika Nonaktif atau sesi sudah logout.
 * 3. Muat matriks RBAC dari `role_permissions` dan evaluasi guard `roles` / `permission`.
 * 4. Bungkus seluruh error melalui `handleApiError`.
 */
export function withAuth<P = Record<string, string>>(
  handler: ProtectedHandler<P>,
  options: AccessGuardOptions = {},
) {
  return async (
    request: NextRequest,
    routeCtx: { params: Promise<P> },
  ): Promise<Response> => {
    try {
      const env = getEnv();
      const token = request.cookies.get(env.cookieName)?.value;
      if (!token) {
        throw new UnauthorizedError("Sesi tidak ditemukan. Silakan login terlebih dahulu.");
      }

      let payload;
      try {
        payload = await verifySessionToken(token);
      } catch {
        throw new UnauthorizedError("Sesi tidak valid atau telah kedaluwarsa.");
      }

      const userId = Number(payload.sub);
      if (!Number.isInteger(userId) || userId <= 0) {
        throw new UnauthorizedError("Identitas sesi tidak valid.");
      }

      const [userRecord, sessionRecord] = await Promise.all([
        prisma.user.findUnique({
          where: { user_id: userId },
          select: {
            user_id: true,
            role_id: true,
            full_name: true,
            username: true,
            phone: true,
            employment_type: true,
            pay_scheme: true,
            status: true,
            role: { select: { role_name: true } },
          },
        }),
        prisma.sessionLog.findUnique({
          where: { session_id: payload.sid },
          select: { session_id: true, status: true, user_id: true },
        }),
      ]);

      if (!userRecord) {
        throw new UnauthorizedError("Pengguna tidak ditemukan.");
      }

      if (!sessionRecord || sessionRecord.user_id !== userId || sessionRecord.status !== "Aktif") {
        throw new UnauthorizedError("Sesi Anda sudah berakhir. Silakan login kembali.");
      }

      const permissions = await getRolePermissions(userRecord.role_id);

      const authUser: AuthenticatedUser = {
        user_id: userRecord.user_id,
        role_id: userRecord.role_id,
        role_name: userRecord.role.role_name as RoleName,
        full_name: userRecord.full_name,
        username: userRecord.username,
        phone: userRecord.phone,
        employment_type: userRecord.employment_type as EmploymentType,
        pay_scheme: userRecord.pay_scheme as PayScheme,
        status: userRecord.status as UserStatus,
        session_id: sessionRecord.session_id,
        permissions,
      };

      assertAccess(authUser, options);

      return await handler(request, {
        params: routeCtx.params,
        user: authUser,
      });
    } catch (err) {
      // Biarkan sinyal bail-out prerender internal Next.js 16 diteruskan tanpa dicatat sebagai error
      if (
        err &&
        typeof err === "object" &&
        "digest" in err &&
        (err as { digest?: string }).digest === "NEXT_PRERENDER_INTERRUPTED"
      ) {
        throw err;
      }
      return handleApiError(err);
    }
  };
}
