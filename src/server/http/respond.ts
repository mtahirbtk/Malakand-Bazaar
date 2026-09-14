import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError, type ErrorCode, type FieldErrors } from "./errors";
import { DatabaseError } from "../db";
import { log } from "./log";
import { requestId } from "./request-context";

/**
 * The response envelope.
 *
 *   success  { ok: true,  data, meta? }
 *   failure  { ok: false, error: { code, message, fields? } }
 *
 * Uniform shape means the client fetch wrapper has exactly one branch, and a
 * failure never arrives looking like data.
 */

export type PageInfo = {
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
  page?: number;
  limit: number;
};

export type ApiSuccess<T> = { ok: true; data: T; meta?: Record<string, unknown> };
export type ApiFailure = {
  ok: false;
  error: { code: ErrorCode; message: string; fields?: FieldErrors };
};

export function ok<T>(
  data: T,
  init?: { meta?: Record<string, unknown>; status?: number; headers?: Record<string, string> }
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json<ApiSuccess<T>>(
    { ok: true, data, ...(init?.meta ? { meta: init.meta } : {}) },
    { status: init?.status ?? 200, headers: init?.headers }
  );
}

/** Public, cacheable read. `swr` keeps a stale copy serving while it revalidates. */
export function okCached<T>(
  data: T,
  seconds: number,
  init?: { meta?: Record<string, unknown>; swr?: number }
): NextResponse<ApiSuccess<T>> {
  return ok(data, {
    meta: init?.meta,
    headers: {
      "Cache-Control": `public, s-maxage=${seconds}, stale-while-revalidate=${init?.swr ?? seconds * 10}`,
    },
  });
}

export function fail(error: ApiError): NextResponse<ApiFailure> {
  return NextResponse.json<ApiFailure>(
    {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
        ...(error.fields ? { fields: error.fields } : {}),
      },
    },
    { status: error.status, headers: error.headers }
  );
}

function zodToFieldErrors(error: ZodError): FieldErrors {
  const fields: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

/**
 * Wraps a route handler so no handler has to write a try/catch.
 *
 * Anything thrown is converted to the envelope. An unexpected error is logged
 * with its stack and returned as an opaque 500 — internal messages, SQL and
 * stack traces never reach a client.
 */
export function handler<Ctx = unknown>(
  fn: (request: Request, context: Ctx) => Promise<Response>
): (request: Request, context: Ctx) => Promise<Response> {
  return async (request, context) => {
    const id = requestId(request);
    const started = Date.now();

    try {
      const response = await fn(request, context);
      response.headers.set("x-request-id", id);
      return response;
    } catch (error) {
      const response = toResponse(error, request, id);
      response.headers.set("x-request-id", id);
      return response;
    } finally {
      const ms = Date.now() - started;
      if (ms > 1000) {
        log.warn("slow request", { requestId: id, path: new URL(request.url).pathname, ms });
      }
    }
  };
}

function toResponse(error: unknown, request: Request, id: string): NextResponse<ApiFailure> {
  if (error instanceof ApiError) {
    // Expected outcomes (a wrong password, a 404) are not incidents.
    if (error.status >= 500) {
      log.error("api error", { requestId: id, code: error.code, message: error.message });
    }
    return fail(error);
  }

  if (error instanceof ZodError) {
    return fail(
      ApiError.validation("Some of the details need fixing.", zodToFieldErrors(error))
    );
  }

  if (error instanceof DatabaseError) {
    log.error("database error", {
      requestId: id,
      path: new URL(request.url).pathname,
      code: error.code,
      message: error.message,
    });
    return fail(new ApiError("INTERNAL", "Something went wrong. Please try again."));
  }

  log.error("unhandled error", {
    requestId: id,
    path: new URL(request.url).pathname,
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  return fail(new ApiError("INTERNAL", "Something went wrong. Please try again."));
}
