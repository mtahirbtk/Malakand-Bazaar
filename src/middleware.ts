import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { verifyAccessToken } from "@/server/auth/jwt";

/**
 * Three jobs, in this order:
 *
 *   1. Security headers on every response, including a nonce-based CSP.
 *   2. Route authorization, so a protected page never renders for someone who
 *      may not see it.
 *   3. Locale routing (next-intl), for everything that is not an API route.
 *
 * Point 2 is a UX layer, not the security boundary. Every API handler re-checks
 * the caller itself — nothing is trusted merely because it got past here.
 */

const intlMiddleware = createMiddleware(routing);

const CSRF_COOKIE = "mb_csrf";
const ACCESS_COOKIE = "mb_at";

/** Route prefixes that need an account, keyed by the role they demand. */
const PROTECTED: { prefix: string; role: "user" | "seller" | "admin" }[] = [
  { prefix: "/seller/dashboard", role: "seller" },
  { prefix: "/admin", role: "admin" },
  { prefix: "/account", role: "user" },
];

/** Signed-in users have no business on these. */
const GUEST_ONLY = ["/sign-in", "/sign-up"];

/** Edge runtime: Web Crypto, not node:crypto. */
function randomToken(bytes = 16): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return btoa(String.fromCharCode(...buf)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function contentSecurityPolicy(nonce: string, isDev: boolean): string {
  const directives = [
    `default-src 'self'`,
    // 'strict-dynamic' lets the nonce-trusted Next bootstrap load its own
    // chunks without every chunk needing its own nonce. Dev needs eval for
    // React Refresh; production must never have it.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-eval'" : ""}`.trim(),
    // Tailwind and next/font emit inline <style> with no nonce path in Next 15,
    // so style-src keeps 'unsafe-inline'. Style injection without script
    // execution is a far smaller problem than the alternative.
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com data:`,
    // OpenStreetMap tiles (Leaflet) and Cloudinary-hosted photos — a
    // duplicate img-src directive is ignored by the parser, so every image
    // source lives here. The browser never talks to Supabase directly (§1.2)
    // — Cloudinary is the only third-party media origin.
    `img-src 'self' data: blob: https://res.cloudinary.com https://*.tile.openstreetmap.org`,
    // The signed-upload POST (src/lib/upload-image.ts) goes straight from the
    // browser to Cloudinary's own upload endpoint — bytes never pass through
    // this server, same principle as the old Supabase Storage PUT.
    `connect-src 'self' https://api.cloudinary.com${isDev ? " ws: wss:" : ""}`,
    // Turnstile renders in an iframe from Cloudflare's challenge origin.
    `frame-src https://challenges.cloudflare.com`,
    `frame-ancestors 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `manifest-src 'self'`,
    `worker-src 'self' blob:`,
  ];
  if (!isDev) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

function applySecurityHeaders(response: NextResponse, csp: string, isDev: boolean): NextResponse {
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(self), camera=(), microphone=(), payment=(), usb=(), interest-cohort=()"
  );
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("X-DNS-Prefetch-Control", "off");

  if (!isDev) {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  return response;
}

/**
 * Issues the CSRF cookie on first contact.
 *
 * It has to exist before the first write, and the first write for a new
 * visitor is signup or sign-in — neither of which has a session to hang it
 * off. Middleware is the only place that runs early enough and can set a
 * cookie, so it is minted here and rotated at every session boundary.
 */
function ensureCsrfCookie(request: NextRequest, response: NextResponse): void {
  if (request.cookies.get(CSRF_COOKIE)) return;
  response.cookies.set(CSRF_COOKIE, randomToken(24), {
    httpOnly: false, // read by the client fetch wrapper and echoed in a header
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

/** Strips the locale prefix so route matching is written once, not twice. */
function pathWithoutLocale(pathname: string): { locale: string; path: string } {
  const match = pathname.match(/^\/(en|ur)(\/.*)?$/);
  if (!match) return { locale: routing.defaultLocale, path: pathname };
  return { locale: match[1], path: match[2] || "/" };
}

function redirectTo(request: NextRequest, locale: string, path: string, next?: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${path}`;
  url.search = "";
  if (next) url.searchParams.set("next", next);
  return NextResponse.redirect(url);
}

export default async function middleware(request: NextRequest): Promise<NextResponse> {
  const isDev = process.env.NODE_ENV !== "production";
  const nonce = randomToken(16);
  const csp = contentSecurityPolicy(nonce, isDev);
  const { pathname } = request.nextUrl;

  // Both headers go on the *request*, not just the response: `x-nonce` so a
  // Server Component can read it, and the CSP so Next's renderer finds the
  // nonce and stamps it on the bootstrap scripts it generates itself. Without
  // the second one, 'strict-dynamic' blocks Next's own hydration.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  // API routes are not locale-prefixed and must not be redirected by next-intl.
  if (pathname.startsWith("/api/")) {
    const response = NextResponse.next({ request: { headers: requestHeaders } });
    ensureCsrfCookie(request, response);
    return applySecurityHeaders(response, csp, isDev);
  }

  // --- route authorization -------------------------------------------------
  const { locale, path } = pathWithoutLocale(pathname);
  const rule = PROTECTED.find((r) => path === r.prefix || path.startsWith(`${r.prefix}/`));
  const guestOnly = GUEST_ONLY.some((p) => path === p || path.startsWith(`${p}/`));

  if (rule || guestOnly) {
    const token = request.cookies.get(ACCESS_COOKIE)?.value;
    const claims = token ? await verifyAccessToken(token) : null;

    if (rule && !claims) {
      // The access token may simply have expired while the refresh token is
      // still good, so send the visitor to sign-in with a return path rather
      // than trying to refresh from the edge.
      return applySecurityHeaders(redirectTo(request, locale, "/sign-in", pathname), csp, isDev);
    }

    if (rule && claims) {
      const allowed =
        rule.role === "user" ||
        (rule.role === "seller" && (claims.role === "seller" || claims.role === "admin")) ||
        (rule.role === "admin" && claims.role === "admin");

      if (!allowed) {
        // A customer landing on the dashboard is being asked to register a
        // store, not told off; an unauthorised admin attempt gets the home page.
        const target = rule.role === "seller" ? "/sell" : "/";
        return applySecurityHeaders(redirectTo(request, locale, target), csp, isDev);
      }
    }

    if (guestOnly && claims) {
      return applySecurityHeaders(redirectTo(request, locale, "/"), csp, isDev);
    }
  }

  // --- locale routing ------------------------------------------------------
  const intlResponse = intlMiddleware(request);

  const rewrite = intlResponse.headers.get("x-middleware-rewrite");
  const redirect = intlResponse.headers.get("location");

  if (redirect || (rewrite && new URL(rewrite, request.url).pathname !== pathname)) {
    ensureCsrfCookie(request, intlResponse);
    return applySecurityHeaders(intlResponse, csp, isDev);
  }

  // next-intl is letting the request through: re-issue it so the nonce header
  // is attached to the request the layout will read, then carry over anything
  // next-intl set (the NEXT_LOCALE cookie, Vary).
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  intlResponse.headers.forEach((value, key) => {
    if (key === "x-middleware-next") return;
    response.headers.set(key, value);
  });
  intlResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));

  ensureCsrfCookie(request, response);
  return applySecurityHeaders(response, csp, isDev);
}

export const config = {
  // Everything except Next's own static output and files with an extension.
  // API routes are included so they get security headers and a CSRF cookie.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
