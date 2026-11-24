import { BadRequestError, ForbiddenError } from "@/lib/errors";
import { compareMoney, subtractMoney, toDecimalString } from "@/lib/money";
import { RoleName } from "@/lib/types/domain";

const MANAGER_DELEGATED_ROLES = new Set<RoleName>(["Pegawai", "Anak PKL"]);

/**
 * Validasi delegasi terbatas pembuatan pekerja baru:
 * - Owner boleh membuat semua role dan menentukan base_salary.
 * - Manager/SDM hanya boleh membuat role Pegawai / Anak PKL dan base_salary dipaksa "0.00".
 * - Role Anak PKL wajib employment_type = "PKL".
 */
export function resolveEmployeeCreationPolicy(params: {
  actorRole: RoleName;
  targetRole: RoleName;
  employmentType: "Tetap" | "PKL";
  requestedBaseSalary?: string | number;
}): { base_salary: string } {
  if (params.actorRole !== "Owner") {
    if (params.actorRole !== "Manager/SDM" || !MANAGER_DELEGATED_ROLES.has(params.targetRole)) {
      throw new ForbiddenError(
        "Manager/SDM hanya diizinkan menambahkan akun dengan role Pegawai atau Anak PKL.",
      );
    }
  }

  if (params.targetRole === "Anak PKL" && params.employmentType !== "PKL") {
    throw new BadRequestError("Untuk role Anak PKL, tipe pekerja wajib 'PKL'.");
  }

  const baseSalary =
    params.actorRole === "Owner" && params.requestedBaseSalary !== undefined
      ? toDecimalString(params.requestedBaseSalary)
      : "0.00";

  return { base_salary: baseSalary };
}

/**
 * Menghitung `net_amount = gross_amount - kasbon_deduction` dan memvalidasi tidak negatif.
 */
export function computePayrollNet(grossAmount: string | number, kasbonDeduction: string | number) {
  const gross = toDecimalString(grossAmount);
  const kasbon = toDecimalString(kasbonDeduction);

  if (compareMoney(gross, "0.00") <= 0) {
    throw new BadRequestError("Nominal bruto (gross_amount) harus lebih dari 0.");
  }
  if (compareMoney(kasbon, "0.00") < 0) {
    throw new BadRequestError("Potongan kasbon tidak boleh negatif.");
  }
  if (compareMoney(kasbon, gross) > 0) {
    throw new BadRequestError("Potongan kasbon tidak boleh melebihi nominal bruto.");
  }

  return {
    gross_amount: gross,
    kasbon_deduction: kasbon,
    net_amount: subtractMoney(gross, kasbon),
  };
}

/**
 * Masking nilai `base_salary` untuk non-Owner (aturan keras PRD/RBAC):
 * hanya Owner yang menerima field `base_salary`.
 */
export function sanitizeEmployeeForRole<
  T extends { base_salary: string | { toString(): string } },
>(employee: T, viewerRole: RoleName): Omit<T, "base_salary"> & { base_salary?: string } {
  const { base_salary, ...safeRest } = employee;
  if (viewerRole === "Owner") {
    return {
      ...safeRest,
      base_salary: toDecimalString(base_salary.toString()),
    };
  }
  return safeRest;
}

export function normalizePayrollType(
  raw: string,
): "Gaji_Bulanan" | "Upah_Mingguan" | "Kasbon" {
  if (raw === "Gaji Bulanan" || raw === "Gaji_Bulanan") return "Gaji_Bulanan";
  if (raw === "Upah Mingguan" || raw === "Upah_Mingguan") return "Upah_Mingguan";
  return "Kasbon";
}
