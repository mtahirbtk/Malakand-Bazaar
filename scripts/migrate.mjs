#!/usr/bin/env node
/**
 * Migration runner.
 *
 * Applies every `supabase/migrations/*.sql` file that has not run yet, in
 * filename order, each inside its own transaction, recording the file's
 * checksum so an already-applied migration can never be silently edited.
 *
 *   node scripts/migrate.mjs            apply pending
 *   node scripts/migrate.mjs --status   list applied/pending, change nothing
 *   node scripts/migrate.mjs --seed     apply pending, then re-run supabase/seed/*.sql
 *
 * Runs against DIRECT_URL (session mode, port 5432) — DDL cannot run through
 * the transaction pooler on 6543.
 */
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      if (process.env[key] !== undefined) continue;
      process.env[key] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    }
  }
}

loadEnv();

const url = process.env.DIRECT_URL;
if (!url) {
  console.error("DIRECT_URL is not set. Copy .env.example to .env.local and fill it in.");
  process.exit(1);
}
if (url.includes(":6543")) {
  console.error("DIRECT_URL points at the transaction pooler (6543). DDL needs the session pooler (5432).");
  process.exit(1);
}

const statusOnly = process.argv.includes("--status");
const withSeed = process.argv.includes("--seed");

const sql = postgres(url, { max: 1, idle_timeout: 5, connect_timeout: 20, onnotice: () => {} });

function sqlFiles(dir) {
  const path = join(root, dir);
  if (!existsSync(path)) return [];
  return readdirSync(path)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((name) => {
      const body = readFileSync(join(path, name), "utf8");
      return { name, body, checksum: createHash("sha256").update(body).digest("hex").slice(0, 16) };
    });
}

try {
  await sql.unsafe(`
    create table if not exists public._migrations (
      name text primary key,
      checksum text not null,
      applied_at timestamptz not null default now()
    );
  `);

  const applied = new Map(
    (await sql`select name, checksum from public._migrations`).map((r) => [r.name, r.checksum])
  );
  const migrations = sqlFiles("supabase/migrations");

  if (migrations.length === 0) {
    console.log("No migration files found in supabase/migrations/.");
    process.exit(0);
  }

  for (const m of migrations) {
    const prior = applied.get(m.name);
    if (prior && prior !== m.checksum) {
      console.error(
        `\n  ${m.name} has changed since it was applied (${prior} → ${m.checksum}).\n` +
          `  Applied migrations are immutable. Add a new migration instead.\n`
      );
      process.exit(1);
    }
  }

  const pending = migrations.filter((m) => !applied.has(m.name));

  if (statusOnly) {
    for (const m of migrations) {
      console.log(`${applied.has(m.name) ? "  applied" : "  PENDING"}  ${m.name}`);
    }
    console.log(`\n${applied.size} applied, ${pending.length} pending.`);
    process.exit(0);
  }

  if (pending.length === 0) {
    console.log("Up to date — no pending migrations.");
  }

  for (const m of pending) {
    const started = Date.now();
    process.stdout.write(`  applying ${m.name} ... `);
    try {
      await sql.begin(async (tx) => {
        await tx.unsafe(m.body);
        await tx`insert into public._migrations (name, checksum) values (${m.name}, ${m.checksum})`;
      });
      console.log(`ok (${Date.now() - started}ms)`);
    } catch (err) {
      console.log("FAILED");
      console.error(`\n  ${m.name}: ${err.message}\n`);
      if (err.position) console.error(`  at character ${err.position}`);
      process.exit(1);
    }
  }

  if (withSeed) {
    for (const s of sqlFiles("supabase/seed")) {
      const started = Date.now();
      process.stdout.write(`  seeding  ${s.name} ... `);
      await sql.begin(async (tx) => tx.unsafe(s.body));
      console.log(`ok (${Date.now() - started}ms)`);
    }
  }

  console.log("\nDone.");
} finally {
  await sql.end({ timeout: 5 });
}
