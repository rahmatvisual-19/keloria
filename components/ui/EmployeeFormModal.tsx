"use client";

import React, { useEffect, useState } from "react";
import { Eye, EyeOff, X } from "lucide-react";
import { FormField } from "@/components/ui/FormField";
import { MockUser } from "@/lib/mock/data";
import { EmploymentType, PayScheme, RoleName } from "@/lib/types/domain";

export interface EmployeeFormValues {
  full_name: string;
  username: string;
  password: string;
  phone: string;
  role_name: RoleName;
  employment_type: EmploymentType;
  pay_scheme: PayScheme;
  base_salary: string;
  start_date: string;
  end_date: string | null;
}

interface EmployeeFormModalProps {
  open: boolean;
  mode: "create" | "edit";
  isOwner: boolean;
  canManageSalary?: boolean;
  initialUser?: MockUser | null;
  existingUsernames: string[];
  onSubmit: (values: EmployeeFormValues) => void;
  onClose: () => void;
}

const OWNER_ROLES: RoleName[] = ["Owner", "Manager/SDM", "Pegawai", "Anak PKL"];
const MANAGER_ROLES: RoleName[] = ["Pegawai", "Anak PKL"];

function EmployeeFormBody({
  mode,
  isOwner,
  canManageSalary,
  initialUser,
  existingUsernames,
  onSubmit,
  onClose,
}: Omit<EmployeeFormModalProps, "open">) {
  const isEdit = mode === "edit" && Boolean(initialUser);
  const allowSalary = canManageSalary ?? isOwner;

  const [fullName, setFullName] = useState(isEdit && initialUser ? initialUser.full_name : "");
  const [username, setUsername] = useState(isEdit && initialUser ? initialUser.username : "");
  const [password, setPassword] = useState(isEdit ? "" : "Kelo#12345");
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState(isEdit && initialUser ? initialUser.phone : "");
  const [roleName, setRoleName] = useState<RoleName>(
    isEdit && initialUser ? initialUser.role_name : "Pegawai",
  );
  const [employmentType, setEmploymentType] = useState<EmploymentType>(
    isEdit && initialUser ? initialUser.employment_type : "Tetap",
  );
  const [payScheme, setPayScheme] = useState<PayScheme>(
    isEdit && initialUser ? initialUser.pay_scheme : "Mingguan",
  );
  const [baseSalary, setBaseSalary] = useState(
    isEdit && initialUser ? String(Number(initialUser.base_salary)) : "0",
  );
  const [startDate, setStartDate] = useState(
    isEdit && initialUser ? initialUser.start_date : "",
  );
  const [endDate, setEndDate] = useState(
    isEdit && initialUser?.end_date ? initialUser.end_date : "",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEdit) return;
    const id = setTimeout(() => {
      setStartDate((prev) => prev || new Date().toISOString().slice(0, 10));
    }, 0);
    return () => clearTimeout(id);
  }, [isEdit]);

  const allowedRoles = isOwner ? OWNER_ROLES : MANAGER_ROLES;
  const isPklRole = roleName === "Anak PKL";

  const handleRoleChange = (nextRole: RoleName) => {
    setRoleName(nextRole);
    if (nextRole === "Anak PKL") {
      setEmploymentType("PKL");
      setPayScheme("Mingguan");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (fullName.trim().length < 2) {
      setError("Nama lengkap minimal 2 karakter.");
      return;
    }

    if (mode === "create") {
      const cleanUser = username.trim().toLowerCase();
      if (cleanUser.length < 3 || !/^[a-zA-Z0-9._-]+$/.test(cleanUser)) {
        setError("Username minimal 3 karakter (huruf, angka, titik, garis bawah, atau strip).");
        return;
      }
      if (existingUsernames.some((u) => u.toLowerCase() === cleanUser)) {
        setError(`Username '${cleanUser}' sudah digunakan.`);
        return;
      }
      if (password.length < 8) {
        setError("Kata sandi awal minimal 8 karakter.");
        return;
      }
    }

    if (roleName === "Anak PKL" && employmentType !== "PKL") {
      setError("Untuk role Anak PKL, tipe pekerja wajib 'PKL'.");
      return;
    }

    onSubmit({
      full_name: fullName.trim(),
      username: username.trim().toLowerCase(),
      password,
      phone: phone.trim(),
      role_name: roleName,
      employment_type: roleName === "Anak PKL" ? "PKL" : employmentType,
      pay_scheme: payScheme,
      base_salary: allowSalary ? String(Math.max(0, Number(baseSalary) || 0)) : "0",
      start_date: startDate || new Date().toISOString().slice(0, 10),
      end_date: endDate.trim() ? endDate.trim() : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {mode === "create"
                ? isOwner
                  ? "Tambah Pengguna / Pegawai Baru"
                  : "Tambah Pegawai / Anak PKL (Delegasi SDM)"
                : `Edit Data Pekerja — ${initialUser?.full_name ?? ""}`}
            </h2>
            {!isOwner && mode === "create" && (
              <p className="mt-0.5 text-xs text-slate-500">
                {allowSalary
                  ? "Role dibatasi ke Pegawai / Anak PKL. Anda dapat langsung mengatur skema upah & gaji pokok."
                  : "Role dibatasi ke Pegawai / Anak PKL; gaji pokok diatur belakangan oleh Owner."}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
            aria-label="Tutup modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Nama Lengkap" required>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Contoh: Siti Rahmawati"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </FormField>

            <FormField label="Nomor Telepon">
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Contoh: 0812-3456-7890"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </FormField>
          </div>

          {mode === "create" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Username Login" required>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: siti.pkl"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </FormField>

              <FormField label="Kata Sandi Awal" required hint="Minimal 8 karakter">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 py-2 pl-3 pr-10 text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </FormField>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            {(mode === "create" || isOwner) && (
              <FormField label="Role Akses" required>
                <select
                  value={roleName}
                  onChange={(e) => handleRoleChange(e.target.value as RoleName)}
                  disabled={mode === "edit" && initialUser?.role_name === "Owner"}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                >
                  {allowedRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </FormField>
            )}

            <FormField label="Status Kerja" required>
              <select
                value={isPklRole ? "PKL" : employmentType}
                disabled={isPklRole}
                onChange={(e) => setEmploymentType(e.target.value as EmploymentType)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
              >
                <option value="Tetap">Tetap</option>
                <option value="PKL">PKL</option>
              </select>
            </FormField>

            <FormField label="Skema Upah" required>
              <select
                value={payScheme}
                onChange={(e) => setPayScheme(e.target.value as PayScheme)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="Bulanan">Bulanan</option>
                <option value="Mingguan">Mingguan</option>
              </select>
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Tanggal Mulai Kerja" required>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </FormField>
            <FormField label="Tanggal Selesai (Opsional)" hint="Diisi bila masa magang / kontrak terbatas">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </FormField>
          </div>

          {allowSalary && (
            <FormField
              label="Gaji Pokok (Rp)"
              hint="Dapat diatur oleh Owner dan Manager/SDM."
            >
              <input
                type="number"
                min={0}
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums"
              />
            </FormField>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              {mode === "create" ? "Simpan Pengguna" : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Modal Tambah / Edit Pengguna & Pegawai:
 * - Owner: akses penuh 4 role & field `base_salary`.
 * - Manager/SDM (delegasi terbatas): hanya boleh membuat role `Pegawai` / `Anak PKL`,
 *   tanpa field `base_salary` (otomatis 0), dan saat edit hanya mengubah field non-sensitif.
 */
export function EmployeeFormModal(props: EmployeeFormModalProps) {
  if (!props.open) return null;
  const formKey = `${props.mode}-${props.initialUser?.user_id ?? "new"}-${props.isOwner ? "owner" : "mgr"}-${props.canManageSalary ? "sal" : "nosal"}`;
  return <EmployeeFormBody key={formKey} {...props} />;
}
