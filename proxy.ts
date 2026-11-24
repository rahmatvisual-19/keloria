import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { applyCorsHeaders, verifyMutationOrigin } from "@/lib/cors";
import { getEnv } from "@/lib/env";

/**
 * Daftar endpoint API publik yang tidak memerlukan cookie JWT.
 */
const PUBLIC_API_PREFIXES = ["/api/v1/health", "/api/v1/auth/login", "/api/v1/auth/logout"];

function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Next.js 16 Proxy (pengganti middleware.ts).
 * Tanggung jawab terbatas pada:
 * 1. Penanganan preflight CORS (OPTIONS) & header CORS berdasarkan CLIENT_ORIGIN.
 * 2. Perlindungan CSRF melalui verifikasi header Origin pada request mutasi.
 * 3. Pengecekan optimistik keberadaan & validitas JWT (via jose).
 *
 * Pengecekan status user (Aktif/Nonaktif) dan RBAC penuh tetap dilakukan di Route Handler
 * lewat wrapper `withAuth` (Fase 2), bukan di sini.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api/v1")) {
    return NextResponse.next();
  }

  // 1. Tangani preflight OPTIONS
  if (request.method === "OPTIONS") {
    const preflight = new NextResponse(null, { status: 204 });
    return applyCorsHeaders(request, preflight);
  }

  // 2. Perlindungan CSRF untuk method mutasi (POST, PUT, PATCH, DELETE)
  if (!verifyMutationOrigin(request)) {
    const forbidden = NextResponse.json(
      {
        success: false,
        data: null,
        message: "Origin permintaan tidak diizinkan (perlindungan CSRF).",
      },
      { status: 403 },
    );
    return applyCorsHeaders(request, forbidden);
  }

  // 3. Pengecekan optimistik JWT untuk endpoint API non-publik
  if (!isPublicApiPath(pathname)) {
    const env = getEnv();
    const token = request.cookies.get(env.cookieName)?.value;

    if (!token) {
      const unauthorized = NextResponse.json(
        {
          success: false,
          data: null,
          message: "Sesi tidak ditemukan. Silakan login terlebih dahulu.",
        },
        { status: 401 },
      );
      return applyCorsHeaders(request, unauthorized);
    }

    try {
      const secret = new TextEncoder().encode(env.jwtSecret);
      await jwtVerify(token, secret);
    } catch {
      const unauthorized = NextResponse.json(
        {
          success: false,
          data: null,
          message: "Sesi tidak valid atau telah kedaluwarsa. Silakan login kembali.",
        },
        { status: 401 },
      );
      return applyCorsHeaders(request, unauthorized);
    }
  }

  const response = NextResponse.next();
  return applyCorsHeaders(request, response);
}

export const config = {
  matcher: ["/api/v1/:path*"],
};
