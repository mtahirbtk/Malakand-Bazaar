import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { AuthProvider } from "@/lib/mock-db/auth-context";
import SellerDashboardLayout from "./layout";

const pushMock = vi.fn();
vi.mock("@/i18n/routing", async () => {
  const actual = await vi.importActual<typeof import("@/i18n/routing")>("@/i18n/routing");
  return {
    ...actual,
    useRouter: () => ({ push: pushMock, replace: pushMock }),
    usePathname: () => "/seller/dashboard/listings",
  };
});

function seedSeller() {
  window.localStorage.setItem(
    "mb.users",
    JSON.stringify([
      { id: "u1", phone: "+923001234567", password: "password1", role: "seller", displayName: "Green Valley", sellerId: "s1" },
    ])
  );
  window.localStorage.setItem("mb.session", JSON.stringify("u1"));
}

function renderLayout() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AuthProvider>
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
    pushMock.mockClear();
  });

  it("renders the tabs and route content once a seller is signed in", async () => {
    seedSeller();
    renderLayout();
    await waitFor(() => expect(screen.getByText("Route content")).toBeInTheDocument());
    expect(screen.getByRole("tab", { name: /Listings/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Profile/ })).toBeInTheDocument();
  });

  it("shows a loading state instead of route content when signed out", () => {
    renderLayout();
    expect(screen.queryByText("Route content")).toBeNull();
    expect(pushMock).toHaveBeenCalledWith(expect.stringContaining("/sign-in"));
  });
});
