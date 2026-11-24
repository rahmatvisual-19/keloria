import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "./env";

const ALLOWED_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS";
const ALLOWED_HEADERS = "Content-Type, Authorization, X-Requested-With";
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Daftar origin yang diizinkan (CLIENT_ORIGIN dari env, plus origin yang sama dengan request).
 */
export function isOriginAllowed(origin: string | null, requestUrl: string): boolean {
  if (!origin) return true; // Permintaan server-to-server / curl tanpa header Origin
  const normalized = origin.replace(/\/+$/, "");
  const { clientOrigin } = getEnv();
  const selfOrigin = new URL(requestUrl).origin.replace(/\/+$/, "");
  return normalized === clientOrigin || normalized === selfOrigin;
}

/**
 * Menambahkan header CORS ke response (tidak pernah memakai wildcard '*').
 */
export function applyCorsHeaders(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get("origin");
  const { clientOrigin } = getEnv();

  if (origin && isOriginAllowed(origin, request.url)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  } else {
    response.headers.set("Access-Control-Allow-Origin", clientOrigin);
  }

  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  response.headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  response.headers.set("Vary", "Origin");
  return response;
}

/**
 * Verifikasi header Origin untuk request mutasi sebagai perlindungan CSRF
 * (penting terutama bila cookie memakai SameSite=None lintas domain).
 */
export function verifyMutationOrigin(request: NextRequest): boolean {
  if (!MUTATION_METHODS.has(request.method.toUpperCase())) {
    return true;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    // Izinkan hanya jika bukan dari browser lintas situs (mis. test lokal / curl);
    // jika ada Referer dari origin asing, tolak.
    const referer = request.headers.get("referer");
    if (!referer) return true;
    try {
      const refOrigin = new URL(referer).origin;
      return isOriginAllowed(refOrigin, request.url);
    } catch {
      return false;
    }
  }

  return isOriginAllowed(origin, request.url);
}
