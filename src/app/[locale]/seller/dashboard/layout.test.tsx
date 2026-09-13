import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { AuthProvider, type AuthUser } from "@/lib/auth/auth-context";
import { makeSeller, mockApi } from "@tests/auth-harness";
import SellerDashboardLayout from "./layout";

let signedIn: AuthUser | null = null;

const pushMock = vi.fn();
vi.mock("@/i18n/routing", async () => {
  const actual = await vi.importActual<typeof import("@/i18n/routing")>("@/i18n/routing");
  return {
    ...actual,
    useRouter: () => ({ push: pushMock, replace: pushMock }),
    usePathname: () => "/seller/dashboard/listings",
  };
});

/** Seeds the auth context the way the server would, rather than faking cookies. */
function seedSeller() {
  signedIn = makeSeller({ sellerId: "s1" });
}

function renderLayout() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AuthProvider initialUser={signedIn}>
        <SellerDashboardLayout>
          <p>Route content</p>
        </SellerDashboardLayout>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}

describe("SellerDashboardLayout", () => {
  beforeEach(() => {
    window.localStorage.clear();
    signedIn = null;
    pushMock.mockClear();
  });

  it("renders the tabs and route content once a seller is signed in", async () => {
    seedSeller();
    renderLayout();
    await waitFor(() => expect(screen.getByText("Route content")).toBeInTheDocument());
    expect(screen.getByRole("tab", { name: /Listings/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Profile/ })).toBeInTheDocument();
  });

  it("redirects a signed-out visitor to sign-in and never renders route content", async () => {
    // No server-provided user, so the provider asks /api/auth/me and is told
    // there is no session — the same shape the real endpoint returns.
    mockApi({
      "GET /api/auth/me": { error: { code: "AUTH_REQUIRED", message: "Sign in to continue." }, status: 401 },
    });

    renderLayout();

    expect(screen.queryByText("Route content")).toBeNull();
    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith(expect.stringContaining("/sign-in"))
    );
    expect(screen.queryByText("Route content")).toBeNull();
  });
});
