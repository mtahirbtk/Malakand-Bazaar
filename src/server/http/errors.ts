import "server-only";

/**
 * The error taxonomy.
 *
 * Every failure the API can return has a stable machine code here. Clients
 * branch on `code`, never on the human message — so copy can be reworded and
 * translated without breaking a caller.
 */

export const ERROR_CODES = {
  // 400
  VALIDATION_FAILED: 400,
  MALFORMED_REQUEST: 400,

  // 401 / 403
  AUTH_REQUIRED: 401,
  AUTH_INVALID_CREDENTIALS: 401,
  AUTH_TOKEN_EXPIRED: 401,
  AUTH_TOKEN_INVALID: 401,
  AUTH_SESSION_REVOKED: 401,
  AUTH_ACCOUNT_LOCKED: 403,
  AUTH_ACCOUNT_SUSPENDED: 403,
  CSRF_FAILED: 403,
  FORBIDDEN: 403,
  SELLER_REQUIRED: 403,
  ADMIN_REQUIRED: 403,
  TURNSTILE_FAILED: 403,

  // 404 / 409 / 413 / 415
  NOT_FOUND: 404,
  CONFLICT: 409,
  ALREADY_EXISTS: 409,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,

  // 429 / 5xx
  RATE_LIMITED: 429,
  INTERNAL: 500,
  UPSTREAM_UNAVAILABLE: 503,
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

/** Field-level messages for a form, keyed by the field name the client sent. */
export type FieldErrors = Record<string, string>;

export class ApiError extends Error {
  readonly status: number;

  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly fields?: FieldErrors,
    readonly headers?: Record<string, string>
  ) {
    super(message);
    this.name = "ApiError";
    this.status = ERROR_CODES[code];
  }

  static validation(message: string, fields?: FieldErrors) {
    return new ApiError("VALIDATION_FAILED", message, fields);
  }
  static notFound(what = "That page") {
    return new ApiError("NOT_FOUND", `${what} could not be found.`);
  }
  static unauthorized(message = "Sign in to continue.") {
    return new ApiError("AUTH_REQUIRED", message);
  }
  static forbidden(message = "You do not have access to this.") {
    return new ApiError("FORBIDDEN", message);
  }
  static conflict(message: string, fields?: FieldErrors) {
    return new ApiError("CONFLICT", message, fields);
  }
  static rateLimited(retryAfterSeconds: number) {
    return new ApiError(
      "RATE_LIMITED",
      "Too many requests. Wait a moment and try again.",
      undefined,
      { "Retry-After": String(Math.max(1, Math.ceil(retryAfterSeconds))) }
    );
  }
}
