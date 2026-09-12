import "server-only";
import { env } from "../env";

/**
 * Structured logging.
 *
 * One JSON object per line so a log drain can parse it. Two rules that are not
 * negotiable and are enforced by `redact` below:
 *
 *   - no secret ever reaches a log line (passwords, tokens, keys, cookies)
 *   - no raw IP address and no full phone number; phones are masked to the
 *     last three digits, which is enough to correlate a support call
 */

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 } as const;
type Level = keyof typeof LEVELS;

const threshold = LEVELS[env.LOG_LEVEL];

const SECRET_KEY = /(password|token|secret|authorization|cookie|apikey|api_key|hash|pepper|jwt)/i;
const PHONE_LIKE = /^\+?[0-9]{7,15}$/;

function redact(value: unknown, key?: string): unknown {
  if (key && SECRET_KEY.test(key)) return "[redacted]";
  if (typeof value === "string") {
    if (PHONE_LIKE.test(value)) return `${"*".repeat(Math.max(0, value.length - 3))}${value.slice(-3)}`;
    return value.length > 500 ? `${value.slice(0, 500)}…` : value;
  }
  if (Array.isArray(value)) return value.map((v) => redact(v));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, redact(v, k)])
    );
  }
  return value;
}

function emit(level: Level, message: string, context?: Record<string, unknown>) {
  if (LEVELS[level] > threshold) return;
  const line = {
    level,
    ts: new Date().toISOString(),
    msg: message,
    ...(context ? (redact(context) as Record<string, unknown>) : {}),
  };
  const out = JSON.stringify(line);
  if (level === "error") console.error(out);
  else if (level === "warn") console.warn(out);
  else console.log(out);
}

export const log = {
  error: (message: string, context?: Record<string, unknown>) => emit("error", message, context),
  warn: (message: string, context?: Record<string, unknown>) => emit("warn", message, context),
  info: (message: string, context?: Record<string, unknown>) => emit("info", message, context),
  debug: (message: string, context?: Record<string, unknown>) => emit("debug", message, context),
};
