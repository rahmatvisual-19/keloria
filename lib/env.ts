/**
 * Konfigurasi environment terpusat untuk Kelo-ERP.
 * Menghindari akses langsung `process.env` yang tersebar di banyak file.
 */

export type CookieSameSite = "lax" | "strict" | "none";

const DEV_FALLBACK_JWT_SECRET = "kelo-erp-dev-secret-jangan-dipakai-di-produksi-32chars";

export function getEnv() {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const isProd = nodeEnv === "production";

  const jwtSecret = process.env.JWT_SECRET || (isProd ? "" : DEV_FALLBACK_JWT_SECRET);
  if (isProd && jwtSecret.length < 32) {
    throw new Error("JWT_SECRET wajib disetel minimal 32 karakter pada lingkungan produksi.");
  }

  const rawSameSite = (process.env.COOKIE_SAME_SITE ?? "lax").toLowerCase();
  const cookieSameSite: CookieSameSite =
    rawSameSite === "none" || rawSameSite === "strict" ? rawSameSite : "lax";

  const clientOrigin = (process.env.CLIENT_ORIGIN ?? "http://localhost:3000").replace(/\/+$/, "");

  return {
    nodeEnv,
    isProd,
    databaseUrl: process.env.DATABASE_URL ?? "",
    jwtSecret,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "8h",
    cookieName: process.env.COOKIE_NAME ?? "kelo_session",
    cookieSameSite,
    clientOrigin,
    storageDriver: process.env.STORAGE_DRIVER ?? "local",
    uploadDir: process.env.UPLOAD_DIR ?? "./storage/uploads",
    logLevel: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),
  };
}
