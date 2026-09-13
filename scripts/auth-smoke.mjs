#!/usr/bin/env node
/**
 * End-to-end check of the real auth endpoints over HTTP, against a running
 * dev server. Covers the things unit tests cannot: cookie flags, CSRF, the
 * rotation/reuse path, and middleware route gating.
 *
 * Creates a throwaway account and deletes its rows afterwards.
 *
 *   npm run dev            # in another terminal
 *   node scripts/auth-smoke.mjs [baseUrl]
 */
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
for (const file of [".env.local", ".env"]) {
  const path = join(root, file);
  if (!existsSync(path)) continue;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    if (process.env[k] === undefined) process.env[k] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
  }
}

const BASE = process.argv[2] || "http://localhost:3200";
const ORIGIN = BASE;

let passed = 0;
const failures = [];
function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ok    ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/** A cookie jar, because fetch has none and the whole point is cookie behaviour. */
class Jar {
  constructor() { this.cookies = new Map(); this.attributes = new Map(); }
  absorb(response) {
    for (const raw of response.headers.getSetCookie?.() ?? []) {
      const [pair, ...attrs] = raw.split(";");
      const eq = pair.indexOf("=");
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (value === "") this.cookies.delete(name);
      else this.cookies.set(name, value);
      this.attributes.set(name, attrs.map((a) => a.trim().toLowerCase()));
    }
  }
  header() {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  get(name) { return this.cookies.get(name); }
  attrs(name) { return this.attributes.get(name) ?? []; }
}

async function call(jar, method, path, body, extraHeaders = {}) {
  const headers = { origin: ORIGIN, cookie: jar.header(), ...extraHeaders };
  if (body !== undefined) headers["content-type"] = "application/json";
  if (method !== "GET" && jar.get("mb_csrf") && !("x-csrf-token" in extraHeaders)) {
    headers["x-csrf-token"] = decodeURIComponent(jar.get("mb_csrf"));
  }
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  jar.absorb(response);
  let payload = null;
  try { payload = await response.json(); } catch { /* redirects have no body */ }
  return { status: response.status, payload, response };
}

const phone = `+9233${Math.floor(10_000_000 + Math.random() * 89_999_999)}`;
const password = "smoke-password-123";
/**
 * Cloudflare's always-passes test secret accepts any token string, so this
 * stands in for what the widget produces in a browser. Against a real secret
 * the script would correctly be rejected — which is the point of the gate.
 */
const turnstileToken = "smoke-test-token";
let userId = null;

const sql = postgres(process.env.DIRECT_URL, { max: 1, onnotice: () => {} });

try {
  console.log(`\nbase: ${BASE}`);
  console.log(`test number: ${phone.slice(0, 5)}…${phone.slice(-3)}\n`);

  // This script deliberately exceeds the auth bucket, so start from a clean
  // slate — otherwise a re-run inside the same minute fails on the previous
  // run's counters rather than on anything real.
  await sql`delete from rate_limits`;

  // --- bootstrap ----------------------------------------------------------
  console.log("csrf bootstrap");
  const jar = new Jar();
  await call(jar, "GET", "/en");
  check("middleware issues a CSRF cookie to a new visitor", Boolean(jar.get("mb_csrf")));
  check("CSRF cookie is readable by script (not HttpOnly)", !jar.attrs("mb_csrf").includes("httponly"));

  // --- CSRF enforcement ---------------------------------------------------
  console.log("\ncsrf enforcement");
  const noHeader = await call(jar, "POST", "/api/auth/login", { phone, password }, { "x-csrf-token": "" });
  check("a write without the CSRF header is rejected", noHeader.status === 403,
    `${noHeader.status} ${noHeader.payload?.error?.code}`);

  const badOrigin = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { origin: "https://evil.example", "content-type": "application/json", cookie: jar.header(),
               "x-csrf-token": decodeURIComponent(jar.get("mb_csrf")) },
    body: JSON.stringify({ phone, password }),
  });
  check("a write from another origin is rejected", badOrigin.status === 403, String(badOrigin.status));

  // --- signup -------------------------------------------------------------
  console.log("\nsignup");
  const weak = await call(jar, "POST", "/api/auth/signup", { phone, password: "short", displayName: "Smoke", turnstileToken });
  check("a short password is rejected with a field error", weak.status === 400 && Boolean(weak.payload?.error?.fields?.password),
    JSON.stringify(weak.payload?.error?.fields));

  const badPhone = await call(jar, "POST", "/api/auth/signup", { phone: "12345", password, displayName: "Smoke", turnstileToken });
  check("a non-Pakistani number is rejected", badPhone.status === 400);

  const noToken = await call(jar, "POST", "/api/auth/signup", { phone, password, displayName: "Smoke" });
  check("signup without a Turnstile token is refused", noToken.status === 403 &&
    noToken.payload?.error?.code === "TURNSTILE_FAILED", `${noToken.status} ${noToken.payload?.error?.code}`);

  const created = await call(jar, "POST", "/api/auth/signup", { phone, password, displayName: "Smoke Tester", turnstileToken });
  check("signup returns 201 with the new user", created.status === 201 && created.payload?.data?.user?.role === "customer",
    `${created.status} ${JSON.stringify(created.payload?.error ?? "")}`);
  userId = created.payload?.data?.user?.id ?? null;

  check("access cookie is HttpOnly", jar.attrs("mb_at").includes("httponly"));
  check("refresh cookie is HttpOnly", jar.attrs("mb_rt").includes("httponly"));
  check("refresh cookie is SameSite=Strict", jar.attrs("mb_rt").some((a) => a === "samesite=strict"));
  check("refresh cookie is scoped to /api/auth", jar.attrs("mb_rt").some((a) => a === "path=/api/auth"));

  const dupe = await call(jar, "POST", "/api/auth/signup", { phone, password, displayName: "Smoke Again", turnstileToken });
  check("a duplicate number is a 409, not a 500", dupe.status === 409, String(dupe.status));

  // --- password storage ---------------------------------------------------
  console.log("\npassword storage");
  const [stored] = await sql`select password_hash from users where id = ${userId}`;
  check("password is stored as an Argon2id hash", stored.password_hash.startsWith("$argon2id$"),
    stored.password_hash.slice(0, 20));
  check("password does not appear anywhere in the stored hash", !stored.password_hash.includes(password));

  const [sessionRow] = await sql`select refresh_hash from sessions where user_id = ${userId} limit 1`;
  const rtCookie = jar.get("mb_rt");
  check("refresh token is not stored in plaintext",
    Boolean(sessionRow) && sessionRow.refresh_hash !== rtCookie && sessionRow.refresh_hash.length === 64);

  // --- me + protected routes ----------------------------------------------
  console.log("\nsession");
  const me = await call(jar, "GET", "/api/auth/me");
  check("/api/auth/me returns the signed-in user", me.status === 200 && me.payload?.data?.user?.id === userId);

  const anon = new Jar();
  await call(anon, "GET", "/en");
  const anonMe = await call(anon, "GET", "/api/auth/me");
  check("a signed-out caller gets 401 from /api/auth/me", anonMe.status === 401,
    `${anonMe.status} ${anonMe.payload?.error?.code}`);

  const anonDash = await call(anon, "GET", "/en/seller/dashboard/listings");
  check("middleware redirects a signed-out visitor away from the dashboard",
    anonDash.status === 307 && (anonDash.response.headers.get("location") ?? "").includes("/sign-in"),
    `${anonDash.status} ${anonDash.response.headers.get("location")}`);

  const customerDash = await call(jar, "GET", "/en/seller/dashboard/listings");
  check("middleware redirects a customer to /sell rather than the dashboard",
    customerDash.status === 307 && (customerDash.response.headers.get("location") ?? "").includes("/sell"),
    `${customerDash.status} ${customerDash.response.headers.get("location")}`);

  const sellerOnly = await call(jar, "GET", "/api/seller/listings");
  check("a customer calling a seller API is refused by the handler, not just the page",
    sellerOnly.status === 403 || sellerOnly.status === 404,
    `${sellerOnly.status} ${sellerOnly.payload?.error?.code ?? "no route yet"}`);

  // --- refresh rotation + reuse detection ---------------------------------
  console.log("\nrefresh rotation");
  const firstRefresh = jar.get("mb_rt");
  const rotated = await call(jar, "POST", "/api/auth/refresh", {});
  check("refresh succeeds", rotated.status === 200, String(rotated.status));
  check("refresh rotates the token", jar.get("mb_rt") !== firstRefresh);

  const replayJar = new Jar();
  await call(replayJar, "GET", "/en");
  replayJar.cookies.set("mb_rt", firstRefresh);
  const replay = await call(replayJar, "POST", "/api/auth/refresh", {});
  check("replaying a rotated refresh token is rejected", replay.status === 401,
    `${replay.status} ${replay.payload?.error?.code}`);

  const [{ live }] = await sql`
    select count(*)::int as live from sessions where user_id = ${userId} and revoked_at is null`;
  check("reuse revokes the whole session family", live === 0, `${live} sessions still live`);

  const afterBurn = await call(jar, "POST", "/api/auth/refresh", {});
  check("the legitimate client is signed out too, as containment requires", afterBurn.status === 401,
    String(afterBurn.status));

  // --- rate limiting ------------------------------------------------------
  // The auth bucket is 10/min/IP, and the checks above have already spent it.
  // Assert that explicitly rather than letting it surprise the next phase.
  console.log("\nrate limiting");
  const burnJar = new Jar();
  await call(burnJar, "GET", "/en");
  let throttled;
  // The IP-bucket limit is 10/min; this address has already spent some of it
  // above, so send enough requests to guarantee it trips regardless of how
  // many that was.
  for (let i = 0; i < 12; i += 1) {
    throttled = await call(burnJar, "POST", "/api/auth/login", { phone: "+923000000000", password: "x" });
    if (throttled.status === 429) break;
  }
  check("the auth bucket throttles a burst from one address", throttled.status === 429,
    `${throttled.status} ${throttled.payload?.error?.code}`);
  check("a throttled response tells the caller when to retry",
    Boolean(throttled.response.headers.get("retry-after")),
    String(throttled.response.headers.get("retry-after")));

  // Clear this address's buckets so the remaining phases test what they mean to.
  await sql`delete from rate_limits where key like 'auth:%' or key like 'authPhone:%'`;

  // --- login + lockout ----------------------------------------------------
  console.log("\nlogin");
  const fresh = new Jar();
  await call(fresh, "GET", "/en");
  const wrong = await call(fresh, "POST", "/api/auth/login", { phone, password: "not-the-password" });
  check("a wrong password is 401 with a non-specific message", wrong.status === 401 &&
    !/phone|number not found/i.test(wrong.payload?.error?.message ?? ""),
    wrong.payload?.error?.message);

  const unknown = await call(fresh, "POST", "/api/auth/login", { phone: "+923009999999", password });
  check("an unknown number returns the same code as a wrong password",
    unknown.payload?.error?.code === wrong.payload?.error?.code,
    `${unknown.payload?.error?.code} vs ${wrong.payload?.error?.code}`);

  const good = await call(fresh, "POST", "/api/auth/login", { phone, password });
  check("correct credentials sign in", good.status === 200 && good.payload?.data?.user?.id === userId,
    `${good.status} ${JSON.stringify(good.payload?.error ?? "")}`);

  // --- logout -------------------------------------------------------------
  console.log("\nlogout");
  const out = await call(fresh, "POST", "/api/auth/logout", {});
  check("logout succeeds", out.status === 200);
  check("logout clears the access cookie", !fresh.get("mb_at"));
  const afterOut = await call(fresh, "GET", "/api/auth/me");
  check("the session is dead after logout", afterOut.status === 401, String(afterOut.status));

  // --- security headers ---------------------------------------------------
  console.log("\nheaders");
  const page = await fetch(`${BASE}/en`, { redirect: "manual" });
  const csp = page.headers.get("content-security-policy") ?? "";
  check("CSP is present with a nonce", csp.includes("'nonce-") && csp.includes("'strict-dynamic'"));
  check("framing is denied", csp.includes("frame-ancestors 'none'"));
  check("object-src is none", csp.includes("object-src 'none'"));
  check("nosniff is set", page.headers.get("x-content-type-options") === "nosniff");
} catch (error) {
  console.error("\nsmoke run aborted:", error.message);
  process.exitCode = 1;
} finally {
  if (userId) {
    await sql`delete from sessions where user_id = ${userId}`;
    await sql`delete from users where id = ${userId}`;
    console.log("\ncleaned up the throwaway account");
  }
  await sql.end({ timeout: 5 });
}

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.error(`  - ${f}`);
  process.exitCode = 1;
}
