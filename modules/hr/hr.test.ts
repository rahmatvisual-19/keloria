import { describe, expect, it } from "vitest";
import { BadRequestError, ForbiddenError } from "@/lib/errors";
import { computePayrollNet, resolveEmployeeCreationPolicy, sanitizeEmployeeForRole } from "./rules";

describe("Aturan Bisnis Modul HR (modules/hr/rules.ts)", () => {
  it("menyembunyikan base_salary untuk non-Owner (Manager/SDM) dan menampilkannya bagi Owner", () => {
    const raw = {
      user_id: 3,
      full_name: "Budi Santoso",
      base_salary: "3200000.00",
    };

    const forOwner = sanitizeEmployeeForRole(raw, "Owner");
    const forManager = sanitizeEmployeeForRole(raw, "Manager/SDM");

    expect(forOwner.base_salary).toBe("3200000.00");
    expect("base_salary" in forManager).toBe(false);
  });

  it("menghitung net_amount = gross_amount - kasbon_deduction dan menolak potongan melebihi bruto", () => {
    const res = computePayrollNet("800000.00", "150000.00");
    expect(res.net_amount).toBe("650000.00");

    expect(() => computePayrollNet("500000.00", "600000.00")).toThrow(BadRequestError);
    expect(() => computePayrollNet("0.00", "0.00")).toThrow(BadRequestError);
  });

  it("menerapkan delegasi terbatas Manager/SDM: hanya Pegawai/Anak PKL dengan base_salary dipaksa 0.00", () => {
    // Manager/SDM boleh tambah Pegawai & Anak PKL, tapi base_salary selalu 0.00
    const res = resolveEmployeeCreationPolicy({
      actorRole: "Manager/SDM",
      targetRole: "Pegawai",
      employmentType: "Tetap",
      requestedBaseSalary: "5000000.00",
    });
    expect(res.base_salary).toBe("0.00");

    // Manager/SDM ditolak (403) membuat Owner atau Manager/SDM
    expect(() =>
      resolveEmployeeCreationPolicy({
        actorRole: "Manager/SDM",
        targetRole: "Owner",
        employmentType: "Tetap",
      }),
    ).toThrow(ForbiddenError);

    expect(() =>
      resolveEmployeeCreationPolicy({
        actorRole: "Manager/SDM",
        targetRole: "Manager/SDM",
        employmentType: "Tetap",
      }),
    ).toThrow(ForbiddenError);

    // Role Anak PKL wajib employmentType = PKL
    expect(() =>
      resolveEmployeeCreationPolicy({
        actorRole: "Owner",
        targetRole: "Anak PKL",
        employmentType: "Tetap",
      }),
    ).toThrow(BadRequestError);

    // Owner boleh set base_salary penuh
    const ownerRes = resolveEmployeeCreationPolicy({
      actorRole: "Owner",
      targetRole: "Manager/SDM",
      employmentType: "Tetap",
      requestedBaseSalary: "4800000",
    });
    expect(ownerRes.base_salary).toBe("4800000.00");
  });
});
