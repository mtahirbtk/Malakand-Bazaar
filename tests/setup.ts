import { vi } from "vitest";
import "@testing-library/jest-dom/vitest";

/**
 * SweetAlert2 (src/components/ui/toast.tsx) is imperative: it appends its own
 * DOM directly to document.body, outside anything React or
 * @testing-library/react's cleanup() knows about, and runs its dismiss timer
 * on a real setTimeout. Left unmocked, one test's toast is still on screen —
 * and its timer still running — when the next test starts, which pollutes
 * role/text queries across tests in the same file. Every test gets a no-op
 * stand-in; toast.test.tsx defines its own richer mock to assert against.
 */
vi.mock("sweetalert2", () => ({
  default: {
    mixin: () => ({ fire: vi.fn() }),
    stopTimer: vi.fn(),
    resumeTimer: vi.fn(),
  },
}));

// jsdom's URL has no createObjectURL/revokeObjectURL at all — anything that
// previews a locally-picked file (FileUpload's crop flow, dev/ui's gallery)
// needs a stand-in, not real blob semantics.
if (!("createObjectURL" in URL)) {
  URL.createObjectURL = vi.fn(() => "blob:mock-object-url");
  URL.revokeObjectURL = vi.fn();
}

// Radix primitives rely on browser APIs jsdom does not implement.
globalThis.ResizeObserver =
  globalThis.ResizeObserver ??
  (class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver);

if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// jsdom implements no media query engine at all — window.matchMedia is
// simply absent. Default every query to "not matching" (desktop-first
// components like useMediaQuery("(min-width: 768px)") read as mobile,
// carousel's prefers-reduced-motion reads as motion allowed) unless a test
// overrides window.matchMedia itself, as the carousel and media-query specs do.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// The auth provider asks /api/auth/me when the server did not supply a user.
// jsdom has no server, so without a default every signed-out render logs an
// unhandled rejection and an act() warning. Tests that care about the response
// override this with mockApi from tests/auth-harness.
if (!("__mbDefaultFetch" in globalThis)) {
  Object.defineProperty(globalThis, "__mbDefaultFetch", { value: true });
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    return new Response(
      JSON.stringify({ ok: false, error: { code: "AUTH_REQUIRED", message: "Sign in to continue." } }),
      { status: url.includes("/api/") ? 401 : 404, headers: { "content-type": "application/json" } }
    );
  }) as typeof fetch;
}
