import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

/**
 * The one database handle.
 *
 * Authenticates with the service-role key, which bypasses RLS — the standard
 * trusted-backend pattern. Every table in this schema is RLS-enabled with no
 * policies (migration 0008), so this client is the only path to the data and
 * authorization is enforced in our own handlers, not by the database.
 *
 * Consequences that matter:
 *   - never import this from a Client Component (`server-only` enforces it)
 *   - every seller-scoped query must carry its own ownership predicate; the
 *     database will not add one for you
 */

declare global {
  // Reused across hot reloads in development so `next dev` does not leak a new
  // client (and its keep-alive sockets) on every file save.
  var __mbSupabase: SupabaseClient | undefined;
}

function create(): SupabaseClient {
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      // We issue our own JWTs; Supabase Auth is not used and must not try to
      // persist or refresh a session in a server process.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "X-Client-Info": "malakandbazaar-server" },
    },
    db: { schema: "public" },
  });
}

export const db: SupabaseClient = globalThis.__mbSupabase ?? create();
if (process.env.NODE_ENV !== "production") globalThis.__mbSupabase = db;

/**
 * Calls a Postgres function and throws on failure, so callers can `await`
 * without checking `{ data, error }` by hand every time.
 */
export async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await db.rpc(fn, args ?? {});
  if (error) {
    throw new DatabaseError(`rpc ${fn} failed: ${error.message}`, error.code, error.details);
  }
  return data as T;
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly details?: string | null
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

/** Postgres error codes we translate into HTTP responses rather than 500s. */
export const PG = {
  UNIQUE_VIOLATION: "23505",
  FOREIGN_KEY_VIOLATION: "23503",
  CHECK_VIOLATION: "23514",
  NOT_NULL_VIOLATION: "23502",
  RAISE_EXCEPTION: "P0001",
} as const;
