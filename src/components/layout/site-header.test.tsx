import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { AuthProvider, type AuthUser } from "@/lib/auth/auth-context";
import { makeUser, makeSeller } from "@tests/auth-harness";
import { SiteHeader } from "./site-header";

// jsdom has no real Next.js App Router mounted — the header's search forms
// now navigate via useRouter() (see goToSearch), so mock it the same way
// sign-in-form.test.tsx does.
const pushMock = vi.fn();
vi.mock("@/i18n/routing", async () => {
  const actual = await vi.importActual<typeof import("@/i18n/routing")>("@/i18n/routing");
  return { ...actual, useRouter: () => ({ push: pushMock, replace: pushMock }) };
});

let signedIn: AuthUser | null = null;

function renderHeader() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AuthProvider initialUser={signedIn}>
        <SiteHeader />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  signedIn = null;
  pushMock.mockClear();
});

describe("SiteHeader", () => {
  it("renders the brand name", () => {
    renderHeader();
    expect(screen.getByRole("banner")).toHaveTextContent("MalakandBazar");
  });

  it("uses no native select element", () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <AuthProvider initialUser={signedIn}>
          <SiteHeader />
        </AuthProvider>
      </NextIntlClientProvider>
    );
    expect(container.querySelector("select")).toBeNull();
  });

  it("exposes labelled search fields for desktop and mobile", () => {
    renderHeader();
    const boxes = screen.getAllByRole("searchbox", { name: /search/i });
    expect(boxes.length).toBeGreaterThanOrEqual(1);
  });

  it("submitting the mobile search box navigates to /search with the query", async () => {
    renderHeader();
    const [box] = screen.getAllByRole("searchbox", { name: /search/i });
    await userEvent.type(box, "solar inverter{enter}");
    expect(pushMock).toHaveBeenCalledWith("/search?q=solar+inverter");
  });

  it("shows the Become a Seller call to action when signed out", () => {
    renderHeader();
    expect(screen.getByRole("link", { name: /Become a Seller/ })).toBeInTheDocument();
  });

  it("shows the sign in link when signed out", () => {
    renderHeader();
    expect(screen.getByRole("link", { name: /Sign In/ })).toBeInTheDocument();
  });

  it("shows an account menu instead of Sign In once signed in", async () => {
    signedIn = makeUser({ displayName: "Ayesha" });
    renderHeader();
    expect(await screen.findByRole("button", { name: "Account menu" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Sign In/ })).toBeNull();
  });

  it("hides Become a Seller once signed in as a seller", async () => {
    signedIn = makeSeller({ displayName: "Green Valley", sellerId: "s_x", sellerSlug: "green-valley" });
    renderHeader();
    await screen.findByRole("button", { name: "Account menu" });
    expect(screen.queryByRole("link", { name: /Become a Seller/ })).toBeNull();
  });

  it("links the account menu's Saved Listings and My Reviews entries to /account", async () => {
    signedIn = makeUser({ displayName: "Ayesha" });
    renderHeader();
    await userEvent.click(await screen.findByRole("button", { name: "Account menu" }));
    expect(await screen.findByRole("menuitem", { name: "Saved Listings" })).toHaveAttribute(
      "href",
      expect.stringContaining("/account/favorites")
    );
    expect(screen.getByRole("menuitem", { name: "My Reviews" })).toHaveAttribute(
      "href",
      expect.stringContaining("/account/reviews")
    );
  });

  it("links My Storefront to the seller's own public storefront page", async () => {
    window.localStorage.setItem(
      "mb.sellers",
      JSON.stringify([
        {
          id: "s_teststore1",
          slug: "test-store",
          name: "Test Store",
          initials: "TS",
          tehsilSlug: "batkhela",
          localityLabel: "X",
          rating: 0,
          reviewCount: 0,
          verified: false,
          responseMinutes: 30,
          specialty: "X",
          statLabel: "X",
          statValue: "0",
          phone: "+923001234567",
        },
      ])
    );
    signedIn = makeSeller({ displayName: "Test Store", sellerId: "s_teststore1", sellerSlug: "test-store" });
    renderHeader();
    await userEvent.click(await screen.findByRole("button", { name: "Account menu" }));
    expect(await screen.findByRole("menuitem", { name: "My Storefront" })).toHaveAttribute(
      "href",
      expect.stringContaining("/seller/test-store")
    );
  });
});
