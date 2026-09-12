import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

/**
 * Two jobs, in this order:
 *
 *   1. Security headers on every response, including a nonce-based CSP.
 *   2. Locale routing (next-intl), for everything that is not an API route.
 *
 * Route authorization is added in phase 2 and sits between the two. Note that
 * middleware is a UX layer, not a security boundary — every API handler
 * re-checks the caller itself, so a direct fetch is never trusted because it
 * got past here.
 */

const intlMiddleware = createMiddleware(routing);

/** Edge runtime: Web Crypto, not node:crypto. */
function makeNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

function contentSecurityPolicy(nonce: string, supabaseOrigin: string, isDev: boolean): string {
  const directives = [
    `default-src 'self'`,
    // 'strict-dynamic' lets the nonce-trusted Next bootstrap load its own
    // chunks without every chunk needing its own nonce. Dev needs eval for
    // React Refresh; production must never have it.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${isDev ? "'unsafe-eval'" : ""}`.trim(),
    // Tailwind and next/font emit inline <style>; there is no nonce path for
    // those in Next 15, so style-src keeps 'unsafe-inline'. Style injection
    // without script execution is a far smaller problem than the alternative.
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com data:`,
    // OpenStreetMap tiles are images fetched by Leaflet; a duplicate img-src
    // directive is ignored by the parser, so every image source lives here.
    `img-src 'self' data: blob: ${supabaseOrigin} https://*.tile.openstreetmap.org`,
    `media-src 'self' ${supabaseOrigin}`,
    `connect-src 'self' ${supabaseOrigin}${isDev ? " ws: wss:" : ""}`,
    `frame-ancestors 'none'`,
    `frame-src 'none'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `manifest-src 'self'`,
    `worker-src 'self' blob:`,
  ];
  if (!isDev) directives.push("upgrade-insecure-requests");
  return directives.join("; ");
}

function supabaseOrigin(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
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
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }
  return response;
}

export default function middleware(request: NextRequest): NextResponse {
  const isDev = process.env.NODE_ENV !== "production";
  const nonce = makeNonce();
  const csp = contentSecurityPolicy(nonce, supabaseOrigin(), isDev);
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
    return applySecurityHeaders(
      NextResponse.next({ request: { headers: requestHeaders } }),
      csp,
      isDev
    );
  }

  const intlResponse = intlMiddleware(request);

  // A redirect (missing locale prefix) or a rewrite carries a Location or
  // x-middleware-rewrite header; pass it straight through with headers applied.
  const rewrite = intlResponse.headers.get("x-middleware-rewrite");
  const redirect = intlResponse.headers.get("location");

  if (redirect || (rewrite && new URL(rewrite, request.url).pathname !== pathname)) {
    return applySecurityHeaders(intlResponse, csp, isDev);
  }

  // Otherwise next-intl is letting the request through: re-issue it so the
  // nonce header is actually attached to the request the layout will read,
  // then carry over anything next-intl set (the NEXT_LOCALE cookie, Vary).
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  intlResponse.headers.forEach((value, key) => {
    if (key === "x-middleware-next") return;
    response.headers.set(key, value);
  });
  intlResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));

  return applySecurityHeaders(response, csp, isDev);
}

export const config = {
  // Everything except Next's own static output and files with an extension.
  // API routes are included so they get security headers too.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
