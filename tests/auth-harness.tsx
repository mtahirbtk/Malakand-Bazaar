import * as React from "react";
import { vi } from "vitest";
import { render, type RenderResult } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { AuthProvider, type AuthUser } from "@/lib/auth/auth-context";

/**
 * Test seam for anything that renders behind AuthProvider.
 *
 * The provider takes a server-resolved user, so a test can seed a signed-in
 * customer or seller directly instead of faking cookies and a /api/auth/me
 * round trip. That keeps these tests about the component under test rather
 * than about the session plumbing, which has its own tests.
 */

export const TEST_SELLER_ID = "11111111-1111-4111-8111-111111111111";
export const TEST_USER_ID = "22222222-2222-4222-8222-222222222222";

export function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: TEST_USER_ID,
    phone: "+923001234567",
    role: "customer",
    displayName: "Test Person",
    recoveryEmail: null,
    ...overrides,
  };
}

export function makeSeller(overrides: Partial<AuthUser> = {}): AuthUser {
  return makeUser({
    role: "seller",
    displayName: "Test Store",
    sellerId: TEST_SELLER_ID,
    sellerSlug: "test-store",
    ...overrides,
  });
}

export function withAuth(ui: React.ReactNode, user: AuthUser | null = null) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <AuthProvider initialUser={user}>{ui}</AuthProvider>
    </NextIntlClientProvider>
  );
}

export function renderWithAuth(ui: React.ReactNode, user: AuthUser | null = null): RenderResult {
  return render(withAuth(ui, user));
}

type Route = { status?: number; ok?: boolean; data?: unknown; error?: { code: string; message: string; fields?: Record<string, string> } };

/**
 * Stubs `fetch` with a map of "METHOD /path" to an envelope.
 *
 * Anything not listed fails the test loudly rather than returning undefined —
 * a component quietly calling an endpoint nobody stubbed is exactly the bug
 * this should surface.
 */
export function mockApi(routes: Record<string, Route>) {
  const calls: { method: string; path: string; body: unknown }[] = [];

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = typeof input === "string" ? input : input.toString();
    const method = (init?.method ?? "GET").toUpperCase();
    const key = `${method} ${path}`;
    calls.push({ method, path, body: init?.body ? JSON.parse(init.body as string) : undefined });

    const route = routes[key];
    if (!route) {
      // The provider bootstraps with GET /api/auth/me whenever no server user
      // was supplied. Answering "signed out" by default keeps every test from
      // having to stub a call it does not care about.
      if (key === "GET /api/auth/me") {
        return new Response(
          JSON.stringify({ ok: false, error: { code: "AUTH_REQUIRED", message: "Sign in to continue." } }),
          { status: 401, headers: { "content-type": "application/json" } }
        );
      }
      throw new Error(`No mock for ${key}. Add it to mockApi({ "${key}": { data: {} } }).`);
    }

    const body = route.error
      ? { ok: false, error: route.error }
      : { ok: route.ok ?? true, data: route.data ?? {} };

    return new Response(JSON.stringify(body), {
      status: route.status ?? (route.error ? 400 : 200),
      headers: { "content-type": "application/json" },
    });
  });

  vi.stubGlobal("fetch", fetchMock);

  /** The recorded call for one route, so assertions do not depend on ordering. */
  const callTo = (method: string, path: string) =>
    calls.find((c) => c.method === method.toUpperCase() && c.path === path);

  return { calls, callTo, fetchMock };
}
