/**
 * HTTP Client wrapper frontend untuk berkomunikasi dengan API Kelo-ERP (`/api/v1/**`).
 * - Selalu mengirim cookie sesi (`credentials: "include"`).
 * - Menangani interceptor 401 (arahkan ke /login) dan 403 (arahkan ke /forbidden).
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  message: string;
  errors?: Record<string, string[]>;
}

export class HttpClientError extends Error {
  public readonly status: number;
  public readonly errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = "HttpClientError";
    this.status = status;
    this.errors = errors;
  }
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Nonaktifkan redirect otomatis untuk 401/403 (misalnya saat cek sesi awal di /auth/me) */
  skipAuthRedirect?: boolean;
}

interface AuthNavigationHandlers {
  onUnauthorized?: () => void;
  onForbidden?: () => void;
}

let authHandlers: AuthNavigationHandlers = {};

/**
 * Mendaftarkan handler navigasi dari AuthProvider (mis. `router.replace('/login')`)
 * agar interceptor 401/403 memakai router Next.js secara mulus.
 */
export function setAuthNavigationHandlers(handlers: AuthNavigationHandlers) {
  authHandlers = handlers;
}

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/+$/, "");

function buildUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, skipAuthRedirect = false, ...rest } = options;

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const computedHeaders = new Headers(headers);

  if (!isFormData && body !== undefined && !computedHeaders.has("Content-Type")) {
    computedHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(path), {
    ...rest,
    credentials: "include",
    headers: computedHeaders,
    body:
      body === undefined
        ? undefined
        : isFormData
          ? (body as FormData)
          : JSON.stringify(body),
  });

  // Interceptor 401 & 403 di sisi browser
  if (typeof window !== "undefined" && !skipAuthRedirect) {
    if (response.status === 401 && window.location.pathname !== "/login") {
      if (authHandlers.onUnauthorized) {
        authHandlers.onUnauthorized();
      } else {
        window.location.href = `${window.location.origin}/login`;
      }
    } else if (response.status === 403 && window.location.pathname !== "/forbidden") {
      if (authHandlers.onForbidden) {
        authHandlers.onForbidden();
      } else {
        window.location.href = `${window.location.origin}/forbidden`;
      }
    }
  }

  const contentType = response.headers.get("content-type") ?? "";
  let parsed: ApiResponse<T> | null = null;
  if (contentType.includes("application/json")) {
    parsed = (await response.json()) as ApiResponse<T>;
  }

  if (!response.ok || (parsed && !parsed.success)) {
    throw new HttpClientError(
      parsed?.message ?? `Permintaan gagal dengan status ${response.status}.`,
      response.status,
      parsed?.errors,
    );
  }

  return (parsed?.data ?? null) as T;
}

export const http = {
  get: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
};
