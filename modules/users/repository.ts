import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Select aman untuk data user (tidak pernah menyertakan `password_hash`).
 */
export const SAFE_USER_SELECT = {
  user_id: true,
  role_id: true,
  full_name: true,
  phone: true,
  employment_type: true,
  pay_scheme: true,
  base_salary: true,
  username: true,
  status: true,
  last_login: true,
  created_at: true,
  updated_at: true,
  role: {
    select: {
      role_id: true,
      role_name: true,
    },
  },
} satisfies Prisma.UserSelect;

export async function findUsersPaginated(params: {
  where: Prisma.UserWhereInput;
  skip: number;
  take: number;
}) {
  const [items, total] = await prisma.$transaction([
    prisma.user.findMany({
      where: params.where,
      select: SAFE_USER_SELECT,
      orderBy: { user_id: "asc" },
      skip: params.skip,
      take: params.take,
    }),
    prisma.user.count({ where: params.where }),
  ]);

  return { items, total };
}

export async function findUserByIdSafe(userId: number) {
  return prisma.user.findUnique({
    where: { user_id: userId },
    select: SAFE_USER_SELECT,
  });
}

export async function findRoleById(roleId: number) {
  return prisma.role.findUnique({ where: { role_id: roleId } });
}

export async function findAllRolesWithPermissions() {
  return prisma.role.findMany({
    orderBy: { role_id: "asc" },
    include: {
      role_permissions: {
        include: { module: true },
        orderBy: { module_id: "asc" },
      },
    },
  });
}
