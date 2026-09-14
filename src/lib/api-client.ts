"use client";

/**
 * The browser's single door to the API.
 *
 * Three things every call needs, done once here instead of at each call site:
 *
 *   - the CSRF header on writes, read from the cookie the middleware set
 *   - a silent token refresh when the 15-minute access token has expired,
 *     retrying the original request once so the user never sees a flicker
 *   - the response envelope unwrapped into either data or a typed error
 */

export type ApiErrorCode =
  | "VALIDATION_FAILED"
  | "MALFORMED_REQUEST"
  | "AUTH_REQUIRED"
  | "AUTH_INVALID_CREDENTIALS"
  | "AUTH_TOKEN_EXPIRED"
  | "AUTH_TOKEN_INVALID"
  | "AUTH_SESSION_REVOKED"
  | "AUTH_ACCOUNT_LOCKED"
  | "AUTH_ACCOUNT_SUSPENDED"
  | "CSRF_FAILED"
  | "FORBIDDEN"
  | "SELLER_REQUIRED"
  | "ADMIN_REQUIRED"
  | "TURNSTILE_FAILED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "ALREADY_EXISTS"
  | "PAYLOAD_TOO_LARGE"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "RATE_LIMITED"
  | "INTERNAL"
  | "UPSTREAM_UNAVAILABLE"
  | "NETWORK";

export class ApiClientError extends Error {
  constructor(
    readonly code: ApiErrorCode,
    message: string,
    readonly fields?: Record<string, string>,
    readonly status?: number
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

const CSRF_COOKIE = "mb_csrf";
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function readCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Concurrent 401s must not each fire their own refresh — that would rotate the
 * refresh token several times in parallel and trip the reuse detector, logging
 * the user out for being logged in. One refresh; everyone waits on it.
 */
let refreshInFlight: Promise<boolean> | null = null;

async function refreshSession(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    try {
      const response = await fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "content-type": "application/json",
          ...(readCsrfToken() ? { "x-csrf-token": readCsrfToken()! } : {}),
        },
        body: "{}",
      });
      return response.ok;
    } catch {
      return false;
    } finally {
      // Cleared on the next tick so callers awaiting this promise all resolve
      // from the same attempt.
      queueMicrotask(() => {
        refreshInFlight = null;
      });
    }
  })();

  return refreshInFlight;
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
  /** Set false for calls that must not trigger a refresh cycle (the refresh call itself). */
  retryOnExpiry?: boolean;
  headers?: Record<string, string>;
};

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const attempt = async (): Promise<Response> => {
    const headers: Record<string, string> = { ...options.headers };

    if (options.body !== undefined) headers["content-type"] = "application/json";

    if (!SAFE_METHODS.has(method)) {
      const csrf = readCsrfToken();
      if (csrf) headers["x-csrf-token"] = csrf;
    }

    return fetch(path, {
      method,
      credentials: "same-origin",
      signal: options.signal,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
  };

  let response: Response;
  try {
    response = await attempt();
  } catch {
    throw new ApiClientError("NETWORK", "You appear to be offline. Check your connection and try again.");
  }

  // 401 usually means the short-lived access token aged out while the refresh
  // token is still good. Refresh once, then replay the original request.
  if (response.status === 401 && (options.retryOnExpiry ?? true)) {
    if (await refreshSession()) {
      try {
        response = await attempt();
      } catch {
        throw new ApiClientError("NETWORK", "You appear to be offline. Check your connection and try again.");
      }
    }
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiClientError(
      response.ok ? "INTERNAL" : "INTERNAL",
      "Something went wrong. Please try again.",
      undefined,
      response.status
    );
  }

  const envelope = payload as
    | { ok: true; data: T; meta?: unknown }
    | { ok: false; error: { code: ApiErrorCode; message: string; fields?: Record<string, string> } };

  if (!envelope || typeof envelope !== "object" || !("ok" in envelope)) {
    throw new ApiClientError("INTERNAL", "Something went wrong. Please try again.", undefined, response.status);
  }

  if (!envelope.ok) {
    throw new ApiClientError(
      envelope.error.code,
      envelope.error.message,
      envelope.error.fields,
      response.status
    );
  }

  return envelope.data;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => apiFetch<T>(path, { method: "GET", signal }),
  post: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "POST", body: body ?? {} }),
  patch: <T>(path: string, body?: unknown) => apiFetch<T>(path, { method: "PATCH", body: body ?? {} }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
