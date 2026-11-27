import { beforeEach, describe, expect, it } from "vitest";
import { ForbiddenError, TooManyRequestsError, UnauthorizedError } from "./errors";
import { enforceLoginRateLimit, resetLoginRateLimit } from "./rate-limit";
import { assertAccess } from "./rbac";
import { ROLE_PERMISSION_DEFAULTS, RoleName } from "./types/domain";

function makeUser(role: RoleName, status: "Aktif" | "Nonaktif" = "Aktif") {
  return {
    role_name: role,
    status,
    permissions: ROLE_PERMISSION_DEFAULTS[role],
  };
}

describe("Matriks RBAC 4 Role (lib/rbac.ts)", () => {
  it("Owner dapat mengakses seluruh modul (V C E D) dan fitur Owner-only", () => {
    const owner = makeUser("Owner");
    expect(() => assertAccess(owner, { roles: ["Owner"] })).not.toThrow();
    expect(() => assertAccess(owner, { permission: ["SALES", "delete"] })).not.toThrow();
    expect(() => assertAccess(owner, { permission: ["SCM", "delete"] })).not.toThrow();
    expect(() => assertAccess(owner, { permission: ["FINANCE", "edit"] })).not.toThrow();
    expect(() => assertAccess(owner, { permission: ["HR", "delete"] })).not.toThrow();
  });

  it("Manager/SDM ditolak (403) pada fitur Admin Owner-only, tetapi memiliki V/C/E penuh di SALES, SCM, FINANCE, dan HR", () => {
    const manager = makeUser("Manager/SDM");
    // Hard guard Admin Owner-only (user management & RBAC settings)
    expect(() => assertAccess(manager, { roles: ["Owner"] })).toThrow(ForbiddenError);
    // Operasional & HR penuh (tanpa delete)
    expect(() => assertAccess(manager, { permission: ["SALES", "create"] })).not.toThrow();
    expect(() => assertAccess(manager, { permission: ["FINANCE", "edit"] })).not.toThrow();
    expect(() => assertAccess(manager, { permission: ["HR", "view"] })).not.toThrow();
    expect(() => assertAccess(manager, { permission: ["HR", "create"] })).not.toThrow();
    expect(() => assertAccess(manager, { permission: ["HR", "edit"] })).not.toThrow();
    // Tidak boleh delete di modul mana pun
    expect(() => assertAccess(manager, { permission: ["HR", "delete"] })).toThrow(ForbiddenError);
    expect(() => assertAccess(manager, { permission: ["SALES", "delete"] })).toThrow(ForbiddenError);
  });

  it("Pegawai ditolak (403) pada seluruh modul HR, tetapi boleh V/C/E pada SALES, SCM, FINANCE", () => {
    const pegawai = makeUser("Pegawai");
    expect(() => assertAccess(pegawai, { permission: ["HR", "view"] })).toThrow(ForbiddenError);
    expect(() => assertAccess(pegawai, { permission: ["HR", "edit"] })).toThrow(ForbiddenError);
    expect(() => assertAccess(pegawai, { roles: ["Owner"] })).toThrow(ForbiddenError);

    expect(() => assertAccess(pegawai, { permission: ["SALES", "create"] })).not.toThrow();
    expect(() => assertAccess(pegawai, { permission: ["SCM", "edit"] })).not.toThrow();
    expect(() => assertAccess(pegawai, { permission: ["FINANCE", "edit"] })).not.toThrow();
    expect(() => assertAccess(pegawai, { permission: ["FINANCE", "delete"] })).toThrow(
      ForbiddenError,
    );
  });

  it("Anak PKL fokus pada SALES & SCM saja; secara default 403 pada FINANCE dan HR", () => {
    const pkl = makeUser("Anak PKL");
    expect(() => assertAccess(pkl, { permission: ["SALES", "create"] })).not.toThrow();
    expect(() => assertAccess(pkl, { permission: ["SCM", "edit"] })).not.toThrow();

    // Default Anak PKL tidak punya akses Finance maupun HR (kecuali lewat user_permissions)
    expect(() => assertAccess(pkl, { permission: ["FINANCE", "view"] })).toThrow(ForbiddenError);
    expect(() => assertAccess(pkl, { permission: ["FINANCE", "edit"] })).toThrow(ForbiddenError);
    expect(() => assertAccess(pkl, { permission: ["FINANCE", "create"] })).toThrow(ForbiddenError);
    expect(() => assertAccess(pkl, { permission: ["HR", "view"] })).toThrow(ForbiddenError);
  });

  it("Akun berstatus Nonaktif langsung ditolak (401) pada setiap request", () => {
    const inactiveOwner = makeUser("Owner", "Nonaktif");
    const inactivePegawai = makeUser("Pegawai", "Nonaktif");

    expect(() => assertAccess(inactiveOwner, { permission: ["SALES", "view"] })).toThrow(
      UnauthorizedError,
    );
    expect(() => assertAccess(inactivePegawai, {})).toThrow(UnauthorizedError);
  });
});

describe("Rate-Limit Login In-Memory (lib/rate-limit.ts)", () => {
  beforeEach(() => {
    resetLoginRateLimit();
  });

  it("mengizinkan 5 percobaan dalam 1 menit dan menolak percobaan ke-6 dengan 429", () => {
    const now = 1_700_000_000_000;
    for (let i = 0; i < 5; i++) {
      expect(() => enforceLoginRateLimit("10.0.0.1", now + i * 1000)).not.toThrow();
    }
    expect(() => enforceLoginRateLimit("10.0.0.1", now + 6000)).toThrow(TooManyRequestsError);
    // IP berbeda tidak terpengaruh
    expect(() => enforceLoginRateLimit("10.0.0.2", now + 6000)).not.toThrow();
    // Setelah 60 detik jendela di-reset
    expect(() => enforceLoginRateLimit("10.0.0.1", now + 61_000)).not.toThrow();
  });
});
