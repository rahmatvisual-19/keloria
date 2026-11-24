import crypto from "node:crypto";
import { signSessionToken, verifyPassword } from "@/lib/auth";
import { UnauthorizedError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { getRolePermissions } from "@/lib/rbac";
import { RoleName } from "@/lib/types/domain";
import { AuthenticatedUser } from "@/lib/withAuth";
import { LoginInput } from "./schema";

const GENERIC_AUTH_ERROR = "Username atau kata sandi salah.";

/**
 * Autentikasi user: verifikasi password bcrypt, cek status Aktif,
 * catat sesi di `session_logs`, perbarui `last_login`, dan terbitkan JWT berisi `sid`.
 */
export async function loginService(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { username: input.username },
    include: { role: true },
  });

  if (!user) {
    throw new UnauthorizedError(GENERIC_AUTH_ERROR);
  }

  const valid = await verifyPassword(input.password, user.password_hash);
  if (!valid) {
    throw new UnauthorizedError(GENERIC_AUTH_ERROR);
  }

  if (user.status !== "Aktif") {
    throw new UnauthorizedError("Akun Anda berstatus Nonaktif. Hubungi Owner.");
  }

  const sessionId = crypto.randomUUID();
  const now = new Date();

  await prisma.$transaction([
    prisma.sessionLog.create({
      data: {
        session_id: sessionId,
        user_id: user.user_id,
        login_at: now,
        status: "Aktif",
      },
    }),
    prisma.user.update({
      where: { user_id: user.user_id },
      data: { last_login: now },
    }),
  ]);

  const roleName = user.role.role_name as RoleName;
  const permissions = await getRolePermissions(user.role_id);

  const token = await signSessionToken({
    sub: String(user.user_id),
    sid: sessionId,
    role: roleName,
  });

  return {
    token,
    user: {
      user_id: user.user_id,
      role_id: user.role_id,
      role_name: roleName,
      full_name: user.full_name,
      username: user.username,
      phone: user.phone,
      employment_type: user.employment_type,
      pay_scheme: user.pay_scheme,
      status: user.status,
      last_login: now.toISOString(),
      permissions,
    },
  };
}

/**
 * Menutup sesi aktif pada tabel `session_logs` saat logout.
 */
export async function logoutService(sessionId: string | null) {
  if (!sessionId) return;
  await prisma.sessionLog.updateMany({
    where: { session_id: sessionId, status: "Aktif" },
    data: { status: "Logout", logout_at: new Date() },
  });
}

/**
 * Mengembalikan profil user yang sedang login (tanpa password_hash) + matriks izin.
 */
export function getMeService(user: AuthenticatedUser) {
  return {
    user_id: user.user_id,
    role_id: user.role_id,
    role_name: user.role_name,
    full_name: user.full_name,
    username: user.username,
    phone: user.phone,
    employment_type: user.employment_type,
    pay_scheme: user.pay_scheme,
    status: user.status,
    is_owner: user.role_name === "Owner",
    permissions: user.permissions,
  };
}
