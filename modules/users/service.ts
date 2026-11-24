import { Prisma } from "@prisma/client";
import { hashPassword } from "@/lib/auth";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { toDecimalString } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { invalidateRbacCache } from "@/lib/rbac";
import {
  findAllRolesWithPermissions,
  findRoleById,
  findUserByIdSafe,
  findUsersPaginated,
  SAFE_USER_SELECT,
} from "./repository";
import {
  CreateUserInput,
  ListUsersQuery,
  ResetPasswordInput,
  UpdateRolePermissionInput,
  UpdateUserInput,
} from "./schema";

function serializeUser<
  T extends { base_salary: Prisma.Decimal; role: { role_name: string } },
>(user: T) {
  return {
    ...user,
    role_name: user.role.role_name,
    base_salary: toDecimalString(user.base_salary.toString()),
  };
}

export async function listUsersService(query: ListUsersQuery) {
  const where: Prisma.UserWhereInput = {
    ...(query.role_id ? { role_id: query.role_id } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { full_name: { contains: query.search, mode: "insensitive" } },
            { username: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const skip = (query.page - 1) * query.limit;
  const { items, total } = await findUsersPaginated({ where, skip, take: query.limit });

  return {
    items: items.map(serializeUser),
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function getUserDetailService(userId: number) {
  const user = await findUserByIdSafe(userId);
  if (!user) {
    throw new NotFoundError("Pengguna tidak ditemukan.");
  }
  return serializeUser(user);
}

export async function createUserService(input: CreateUserInput) {
  const role = await findRoleById(input.role_id);
  if (!role) {
    throw new BadRequestError("Role yang dipilih tidak ditemukan.");
  }

  // Aturan desain #4: jika role = Anak PKL, employment_type wajib PKL
  if (role.role_name === "Anak PKL" && input.employment_type !== "PKL") {
    throw new BadRequestError("Untuk role Anak PKL, tipe pekerja (employment_type) wajib 'PKL'.");
  }

  const existingUsername = await prisma.user.findUnique({
    where: { username: input.username },
    select: { user_id: true },
  });
  if (existingUsername) {
    throw new ConflictError(`Username '${input.username}' sudah digunakan.`);
  }

  const passwordHash = await hashPassword(input.password);

  const created = await prisma.user.create({
    data: {
      role_id: input.role_id,
      full_name: input.full_name,
      phone: input.phone ?? null,
      employment_type: input.employment_type,
      pay_scheme: input.pay_scheme,
      base_salary: toDecimalString(input.base_salary),
      username: input.username,
      password_hash: passwordHash,
      status: input.status,
    },
    select: SAFE_USER_SELECT,
  });

  return serializeUser(created);
}

export async function updateUserService(
  userId: number,
  input: UpdateUserInput,
  actorUserId: number,
) {
  const existing = await findUserByIdSafe(userId);
  if (!existing) {
    throw new NotFoundError("Pengguna tidak ditemukan.");
  }

  if (userId === actorUserId && input.status === "Nonaktif") {
    throw new BadRequestError("Anda tidak dapat menonaktifkan akun Anda sendiri.");
  }

  const targetRoleId = input.role_id ?? existing.role_id;
  const targetRole = await findRoleById(targetRoleId);
  if (!targetRole) {
    throw new BadRequestError("Role yang dipilih tidak ditemukan.");
  }

  const targetEmployment = input.employment_type ?? existing.employment_type;
  if (targetRole.role_name === "Anak PKL" && targetEmployment !== "PKL") {
    throw new BadRequestError("Untuk role Anak PKL, tipe pekerja (employment_type) wajib 'PKL'.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.user.update({
      where: { user_id: userId },
      data: {
        ...(input.role_id !== undefined ? { role_id: input.role_id } : {}),
        ...(input.full_name !== undefined ? { full_name: input.full_name } : {}),
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.employment_type !== undefined ? { employment_type: input.employment_type } : {}),
        ...(input.pay_scheme !== undefined ? { pay_scheme: input.pay_scheme } : {}),
        ...(input.base_salary !== undefined
          ? { base_salary: toDecimalString(input.base_salary) }
          : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
      select: SAFE_USER_SELECT,
    });

    // Jika akun dinonaktifkan, tutup semua sesi aktifnya segera
    if (input.status === "Nonaktif") {
      await tx.sessionLog.updateMany({
        where: { user_id: userId, status: "Aktif" },
        data: { status: "Logout", logout_at: new Date() },
      });
    }

    return saved;
  });

  return serializeUser(updated);
}

export async function resetUserPasswordService(userId: number, input: ResetPasswordInput) {
  const existing = await findUserByIdSafe(userId);
  if (!existing) {
    throw new NotFoundError("Pengguna tidak ditemukan.");
  }

  const passwordHash = await hashPassword(input.new_password);
  await prisma.$transaction([
    prisma.user.update({
      where: { user_id: userId },
      data: { password_hash: passwordHash },
    }),
    // Paksa login ulang dengan kata sandi baru
    prisma.sessionLog.updateMany({
      where: { user_id: userId, status: "Aktif" },
      data: { status: "Logout", logout_at: new Date() },
    }),
  ]);

  return { user_id: userId, reset: true };
}

export async function getPermissionMatrixService() {
  const roles = await findAllRolesWithPermissions();
  return roles.map((r) => ({
    role_id: r.role_id,
    role_name: r.role_name,
    is_locked: r.role_name === "Owner",
    permissions: r.role_permissions.map((rp) => ({
      role_permission_id: rp.role_permission_id,
      module_id: rp.module_id,
      module_code: rp.module.module_code,
      module_name: rp.module.module_name,
      can_view: rp.can_view,
      can_create: rp.can_create,
      can_edit: rp.can_edit,
      can_delete: rp.can_delete,
    })),
  }));
}

export async function updateRolePermissionService(input: UpdateRolePermissionInput) {
  const role = await findRoleById(input.role_id);
  if (!role) {
    throw new NotFoundError("Role tidak ditemukan.");
  }
  if (role.role_name === "Owner") {
    throw new ForbiddenError("Izin untuk role Owner terkunci dan tidak dapat diubah.");
  }

  const updated = await prisma.rolePermission.upsert({
    where: {
      role_id_module_id: {
        role_id: input.role_id,
        module_id: input.module_id,
      },
    },
    update: {
      can_view: input.can_view,
      can_create: input.can_create,
      can_edit: input.can_edit,
      can_delete: input.can_delete,
    },
    create: {
      role_id: input.role_id,
      module_id: input.module_id,
      can_view: input.can_view,
      can_create: input.can_create,
      can_edit: input.can_edit,
      can_delete: input.can_delete,
    },
    include: { module: true },
  });

  invalidateRbacCache(input.role_id);

  return {
    role_permission_id: updated.role_permission_id,
    role_id: updated.role_id,
    module_id: updated.module_id,
    module_code: updated.module.module_code,
    can_view: updated.can_view,
    can_create: updated.can_create,
    can_edit: updated.can_edit,
    can_delete: updated.can_delete,
  };
}
