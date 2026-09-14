import "server-only";
import { cookies } from "next/headers";
import { accessTokenMaxAge, refreshTokenMaxAge } from "./jwt";
import { isProduction } from "../env";

/**
 * Cookie policy.
 *
 * Tokens live in cookies rather than localStorage because localStorage is
 * readable by any injected script; HttpOnly is not. The CSRF token is the one
 * cookie the client must read, so it alone is not HttpOnly — which is safe,
 * because knowing it is only useful to code already running on our origin.
 */

export const ACCESS_COOKIE = "mb_at";
export const REFRESH_COOKIE = "mb_rt";
export const CSRF_COOKIE = "mb_csrf";

/**
 * The refresh cookie is scoped to /api/auth: it is never sent with an ordinary
 * page or API request, so it cannot leak through a logging proxy or an
 * unrelated handler. SameSite=Strict on top, since no legitimate cross-site
 * navigation needs to refresh a session.
 */
const REFRESH_PATH = "/api/auth";

type Jar = Awaited<ReturnType<typeof cookies>>;

/**
 * Just the access-token half of setAuthCookies — for re-minting the token
 * mid-session (a role change) without touching the refresh token, which
 * would require rotating it in the sessions table too. See setAuthCookies'
 * doc comment on REFRESH_PATH for why a handler outside /api/auth can never
 * read the current refresh cookie to decide whether to call the full version.
 */
export function setAccessCookie(jar: Jar, accessToken: string) {
  jar.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: accessTokenMaxAge(),
  });
}

export async function setAuthCookies(jar: Jar, tokens: { accessToken: string; refreshToken: string }) {
  setAccessCookie(jar, tokens.accessToken);

  jar.set(REFRESH_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: REFRESH_PATH,
    maxAge: refreshTokenMaxAge(),
  });
}

/** Readable by client script on purpose — it is echoed back in a header. */
export async function setCsrfCookie(jar: Jar, token: string) {
  jar.set(CSRF_COOKIE, token, {
    httpOnly: false,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: refreshTokenMaxAge(),
  });
}

export async function clearAuthCookies(jar: Jar) {
  jar.set(ACCESS_COOKIE, "", { httpOnly: true, secure: isProduction, sameSite: "lax", path: "/", maxAge: 0 });
  jar.set(REFRESH_COOKIE, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    path: REFRESH_PATH,
    maxAge: 0,
  });
  jar.set(CSRF_COOKIE, "", { httpOnly: false, secure: isProduction, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function readAccessToken(): Promise<string | null> {
  return (await cookies()).get(ACCESS_COOKIE)?.value ?? null;
}

export async function readRefreshToken(): Promise<string | null> {
  return (await cookies()).get(REFRESH_COOKIE)?.value ?? null;
}
