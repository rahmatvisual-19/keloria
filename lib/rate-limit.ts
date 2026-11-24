import { TooManyRequestsError } from "./errors";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000; // 1 menit
const MAX_LOGIN_ATTEMPTS = 5;

const buckets = new Map<string, RateLimitBucket>();

/**
 * Mengambil alamat IP klien dari header reverse proxy atau fallback lokal.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip")?.trim() || "127.0.0.1";
}

/**
 * Rate-limit in-memory sederhana: maks 5 percobaan login per menit per IP.
 * Catatan keterbatasan: tidak terbagi antar-instance pada deployment serverless/multi-node.
 */
export function enforceLoginRateLimit(ip: string, now: number = Date.now()): void {
  const existing = buckets.get(ip);

  if (!existing || now >= existing.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  if (existing.count >= MAX_LOGIN_ATTEMPTS) {
    const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    throw new TooManyRequestsError(
      `Terlalu banyak percobaan login. Silakan coba lagi dalam ${retryAfterSec} detik.`,
    );
  }

  existing.count += 1;
}

export function resetLoginRateLimit(ip?: string): void {
  if (ip) {
    buckets.delete(ip);
  } else {
    buckets.clear();
  }
}
