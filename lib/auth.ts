import bcrypt from "bcryptjs";
import { jwtVerify, SignJWT } from "jose";
import { NextResponse } from "next/server";
import { getEnv } from "./env";
import { RoleName } from "./types/domain";

export interface SessionJwtPayload {
  sub: string; // user_id sebagai string
  sid: string; // session_id pada tabel session_logs
  role: RoleName;
}

const BCRYPT_COST = 10;

export async function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, BCRYPT_COST);
}

export async function verifyPassword(plainPassword: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, hash);
}

export async function signSessionToken(payload: SessionJwtPayload): Promise<string> {
  const env = getEnv();
  const secret = new TextEncoder().encode(env.jwtSecret);

  return new SignJWT({ sid: payload.sid, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(env.jwtExpiresIn)
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionJwtPayload> {
  const env = getEnv();
  const secret = new TextEncoder().encode(env.jwtSecret);

  const { payload } = await jwtVerify(token, secret);
  if (
    typeof payload.sub !== "string" ||
    typeof payload.sid !== "string" ||
    typeof payload.role !== "string"
  ) {
    throw new Error("Payload JWT tidak lengkap.");
  }

  return {
    sub: payload.sub,
    sid: payload.sid,
    role: payload.role as RoleName,
  };
}

/**
 * Menetapkan cookie sesi httpOnly dengan konfigurasi SameSite & Secure sesuai environment.
 */
export function setSessionCookie(response: NextResponse, token: string): NextResponse {
  const env = getEnv();
  response.cookies.set({
    name: env.cookieName,
    value: token,
    httpOnly: true,
    secure: env.isProd || env.cookieSameSite === "none",
    sameSite: env.cookieSameSite,
    path: "/",
    maxAge: 60 * 60 * 8, // 8 jam
  });
  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  const env = getEnv();
  response.cookies.set({
    name: env.cookieName,
    value: "",
    httpOnly: true,
    secure: env.isProd || env.cookieSameSite === "none",
    sameSite: env.cookieSameSite,
    path: "/",
    maxAge: 0,
  });
  return response;
}
