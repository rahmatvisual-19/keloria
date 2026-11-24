import { PayrollPaymentType, Prisma } from "@prisma/client";
import { hashPassword } from "@/lib/auth";
import { BadRequestError, ConflictError, NotFoundError } from "@/lib/errors";
import { addMoney, toDecimalString } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { RoleName } from "@/lib/types/domain";
import {
  computePayrollNet,
  normalizePayrollType,
  resolveEmployeeCreationPolicy,
  sanitizeEmployeeForRole,
} from "./rules";
import {
  CreateEmployeeInput,
  CreatePayrollInput,
  ListEmployeesQuery,
  ListPayrollsQuery,
  UpdateEmployeeNonSensitiveInput,
} from "./schema";

const EMPLOYEE_SELECT = {
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
  role: { select: { role_name: true } },
} satisfies Prisma.UserSelect;

export async function listEmployeesService(query: ListEmployeesQuery, viewerRole: RoleName) {
  const where: Prisma.UserWhereInput = {
    ...(query.employment_type ? { employment_type: query.employment_type } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { full_name: { contains: query.search, mode: "insensitive" } },
            { phone: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const skip = (query.page - 1) * query.limit;
  const [rows, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: EMPLOYEE_SELECT,
      orderBy: { user_id: "asc" },
      skip,
      take: query.limit,
    }),
    prisma.user.count({ where }),
  ]);

  const items = rows.map((row) => {
    const sanitized = sanitizeEmployeeForRole(row, viewerRole);
    return {
      ...sanitized,
      role_name: row.role.role_name,
    };
  });

  return { items, total, page: query.page, limit: query.limit };
}

/**
 * Tambah pegawai/pengguna baru dari modul HR:
 * - Owner: bebas memilih 4 role & mengisi base_salary.
 * - Manager/SDM (delegasi terbatas): hanya role Pegawai / Anak PKL, base_salary otomatis 0.00.
 */
export async function createEmployeeService(input: CreateEmployeeInput, actorRole: RoleName) {
  const { base_salary } = resolveEmployeeCreationPolicy({
    actorRole,
    targetRole: input.role_name,
    employmentType: input.employment_type,
    requestedBaseSalary: input.base_salary,
  });

  const role = await prisma.role.findUnique({ where: { role_name: input.role_name } });
  if (!role) throw new BadRequestError("Role tidak ditemukan.");

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
      role_id: role.role_id,
      full_name: input.full_name,
      phone: input.phone ?? null,
      employment_type: input.employment_type,
      pay_scheme: input.pay_scheme,
      base_salary,
      username: input.username,
      password_hash: passwordHash,
      status: "Aktif",
    },
    select: EMPLOYEE_SELECT,
  });

  return {
    ...sanitizeEmployeeForRole(created, actorRole),
    role_name: created.role.role_name,
  };
}

/**
 * Edit data pekerja non-sensitif (Owner & Manager/SDM).
 * Tidak dapat mengubah role, username, password, status, atau base_salary.
 */
export async function updateEmployeeNonSensitiveService(
  userId: number,
  input: UpdateEmployeeNonSensitiveInput,
  viewerRole: RoleName,
) {
  const existing = await prisma.user.findUnique({
    where: { user_id: userId },
    include: { role: true },
  });
  if (!existing) throw new NotFoundError("Data pekerja tidak ditemukan.");

  const nextEmployment = input.employment_type ?? existing.employment_type;
  if (existing.role.role_name === "Anak PKL" && nextEmployment !== "PKL") {
    throw new BadRequestError("Untuk role Anak PKL, tipe pekerja wajib tetap 'PKL'.");
  }

  const updated = await prisma.user.update({
    where: { user_id: userId },
    data: {
      ...(input.full_name !== undefined ? { full_name: input.full_name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.employment_type !== undefined ? { employment_type: input.employment_type } : {}),
      ...(input.pay_scheme !== undefined ? { pay_scheme: input.pay_scheme } : {}),
    },
    select: EMPLOYEE_SELECT,
  });

  return {
    ...sanitizeEmployeeForRole(updated, viewerRole),
    role_name: updated.role.role_name,
  };
}

export async function listPayrollsService(query: ListPayrollsQuery) {
  const where: Prisma.PayrollWhereInput = {
    ...(query.user_id ? { user_id: query.user_id } : {}),
    ...(query.period_label
      ? { period_label: { contains: query.period_label, mode: "insensitive" } }
      : {}),
    ...(query.payment_type
      ? { payment_type: normalizePayrollType(query.payment_type) as PayrollPaymentType }
      : {}),
    ...(query.date_from || query.date_to
      ? {
          payment_date: {
            ...(query.date_from ? { gte: new Date(query.date_from) } : {}),
            ...(query.date_to ? { lte: new Date(query.date_to) } : {}),
          },
        }
      : {}),
  };

  const skip = (query.page - 1) * query.limit;
  const [rows, total, allMatching] = await prisma.$transaction([
    prisma.payroll.findMany({
      where,
      include: {
        employee: { select: { user_id: true, full_name: true, employment_type: true } },
        recorder: { select: { user_id: true, full_name: true } },
      },
      orderBy: { payment_date: "desc" },
      skip,
      take: query.limit,
    }),
    prisma.payroll.count({ where }),
    prisma.payroll.findMany({
      where,
      select: { gross_amount: true, kasbon_deduction: true, net_amount: true },
    }),
  ]);

  const totals = allMatching.reduce(
    (acc, r) => ({
      total_gross: addMoney(acc.total_gross, r.gross_amount.toString()),
      total_kasbon: addMoney(acc.total_kasbon, r.kasbon_deduction.toString()),
      total_net: addMoney(acc.total_net, r.net_amount.toString()),
    }),
    { total_gross: "0.00", total_kasbon: "0.00", total_net: "0.00" },
  );

  return {
    items: rows.map((r) => ({
      ...r,
      gross_amount: toDecimalString(r.gross_amount.toString()),
      kasbon_deduction: toDecimalString(r.kasbon_deduction.toString()),
      net_amount: toDecimalString(r.net_amount.toString()),
    })),
    totals,
    total,
    page: query.page,
    limit: query.limit,
  };
}

export async function createPayrollService(input: CreatePayrollInput, actorUserId: number) {
  const employee = await prisma.user.findUnique({
    where: { user_id: input.user_id },
    select: { user_id: true, full_name: true },
  });
  if (!employee) throw new NotFoundError("Pekerja tidak ditemukan.");

  const calc = computePayrollNet(input.gross_amount, input.kasbon_deduction);

  const saved = await prisma.payroll.create({
    data: {
      user_id: input.user_id,
      recorded_by: actorUserId,
      payment_date: input.payment_date ? new Date(input.payment_date) : new Date(),
      payment_type: normalizePayrollType(input.payment_type),
      gross_amount: calc.gross_amount,
      kasbon_deduction: calc.kasbon_deduction,
      net_amount: calc.net_amount,
      period_label: input.period_label ?? null,
      notes: input.notes ?? null,
    },
    include: {
      employee: { select: { user_id: true, full_name: true } },
    },
  });

  return {
    ...saved,
    gross_amount: toDecimalString(saved.gross_amount.toString()),
    kasbon_deduction: toDecimalString(saved.kasbon_deduction.toString()),
    net_amount: toDecimalString(saved.net_amount.toString()),
  };
}

export async function deletePayrollService(payrollId: number) {
  const existing = await prisma.payroll.findUnique({ where: { payroll_id: payrollId } });
  if (!existing) throw new NotFoundError("Data penggajian tidak ditemukan.");

  await prisma.payroll.delete({ where: { payroll_id: payrollId } });
  return { payroll_id: payrollId, deleted: true };
}
