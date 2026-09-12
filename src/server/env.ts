import "server-only";
import { z } from "zod";

/**
 * Validated server environment.
 *
 * Parsed once, at first import, and thrown on if anything required is missing
 * or malformed — a misconfigured deploy should fail at boot with a readable
 * message, not at 3am inside a request handler.
 *
 * `import "server-only"` makes importing this from a Client Component a build
 * error, so the service-role key cannot reach the browser by accident.
 */

const secret = (min: number) =>
  z.string().min(min, `must be at least ${min} characters — generate with \`openssl rand -base64 48\``);

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  NEXT_PUBLIC_SITE_URL: z.string().url().transform((v) => v.replace(/\/+$/, "")),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default("media"),

  AUTH_JWT_SECRET: secret(32),
  AUTH_JWT_SECRET_PREVIOUS: z.string().optional().transform((v) => (v ? v : undefined)),
  AUTH_JWT_ISSUER: z.string().min(1).default("malakandbazaar"),
  AUTH_JWT_AUDIENCE: z.string().min(1).default("malakandbazaar-web"),
  AUTH_TOKEN_PEPPER: secret(24),
  AUTH_ACCESS_TOKEN_TTL: z.string().default("15m"),
  AUTH_REFRESH_TOKEN_TTL: z.string().default("30d"),

  TURNSTILE_SECRET_KEY: z.string().optional().transform((v) => (v ? v : undefined)),
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional().transform((v) => (v ? v : undefined)),

  CRON_SECRET: z.string().optional().transform((v) => (v ? v : undefined)),

  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  ENABLE_DEV_ENDPOINTS: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

function parseEnv() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`);
    throw new Error(
      `Invalid server environment.\n${lines.join("\n")}\n\n` +
        `Copy .env.example to .env.local and fill in the missing values.`
    );
  }
  return parsed.data;
}

export const env = parseEnv();

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";

/** Turnstile is only enforced when both halves of the key pair are configured. */
export const turnstileEnabled = Boolean(env.TURNSTILE_SECRET_KEY && env.NEXT_PUBLIC_TURNSTILE_SITE_KEY);
