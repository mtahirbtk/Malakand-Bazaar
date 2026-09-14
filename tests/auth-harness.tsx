import * as React from "react";
import { vi } from "vitest";
import { render, type RenderResult } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { AuthProvider, type AuthUser } from "@/lib/auth/auth-context";
import { ToastProvider } from "@/components/ui/toast";

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
      <ToastProvider>
        <AuthProvider initialUser={user}>{ui}</AuthProvider>
      </ToastProvider>
    </NextIntlClientProvider>
  );
}

export function renderWithAuth(ui: React.ReactNode, user: AuthUser | null = null): RenderResult {
  return render(withAuth(ui, user));
}

type Route = { status?: number; ok?: boolean; data?: unknown; error?: { code: string; message: string; fields?: Record<string, string> } };

/**
 * A route can also be a function of the call so far — for the rare test that
 * needs a mocked endpoint's answer to change between calls (e.g. a list that
 * should reflect a mutation made moments earlier in the same test). Most
 * tests want the plain static form.
 */
type RouteEntry = Route | ((call: { body: unknown; callNumber: number }) => Route);

/**
 * Stubs `fetch` with a map of "METHOD /path" to an envelope.
 *
 * Anything not listed fails the test loudly rather than returning undefined —
 * a component quietly calling an endpoint nobody stubbed is exactly the bug
 * this should surface.
 */
export function mockApi(routes: Record<string, RouteEntry>) {
  const calls: { method: string; path: string; body: unknown }[] = [];
  const callCounts: Record<string, number> = {};

  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = typeof input === "string" ? input : input.toString();
    const method = (init?.method ?? "GET").toUpperCase();
    const key = `${method} ${path}`;
    // A direct-to-Storage upload PUT (see src/lib/upload-image.ts) sends a
    // File/Blob body, not JSON — record it as-is rather than assuming string.
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : init?.body;
    calls.push({ method, path, body });

    const entry = routes[key];
    if (!entry) {
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

    callCounts[key] = (callCounts[key] ?? 0) + 1;
    const route = typeof entry === "function" ? entry({ body, callNumber: callCounts[key] }) : entry;

    const responseBody = route.error
      ? { ok: false, error: route.error }
      : { ok: route.ok ?? true, data: route.data ?? {} };

    return new Response(JSON.stringify(responseBody), {
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
