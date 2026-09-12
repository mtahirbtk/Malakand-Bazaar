import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { AuthProvider } from "@/lib/mock-db/auth-context";
import { SiteHeader } from "./site-header";

function renderHeader() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AuthProvider>
        <SiteHeader />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("SiteHeader", () => {
  it("renders the brand name", () => {
    renderHeader();
    expect(screen.getByRole("banner")).toHaveTextContent("MalakandBazaar");
  });

  it("uses no native select element", () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <AuthProvider>
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

  it("shows the Become a Seller call to action when signed out", () => {
    renderHeader();
    expect(screen.getByRole("link", { name: /Become a Seller/ })).toBeInTheDocument();
  });

  it("shows the sign in link when signed out", () => {
    renderHeader();
    expect(screen.getByRole("link", { name: /Sign In/ })).toBeInTheDocument();
  });

  it("shows an account menu instead of Sign In once signed in", async () => {
    window.localStorage.setItem(
      "mb.users",
      JSON.stringify([{ id: "u1", phone: "+923001234567", password: "password1", role: "customer", displayName: "Ayesha" }])
    );
    window.localStorage.setItem("mb.session", JSON.stringify("u1"));
    renderHeader();
    expect(await screen.findByRole("button", { name: "Account menu" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Sign In/ })).toBeNull();
  });

  it("hides Become a Seller once signed in as a seller", async () => {
    window.localStorage.setItem(
      "mb.users",
      JSON.stringify([
        { id: "u2", phone: "+923001234567", password: "password1", role: "seller", displayName: "Green Valley", sellerId: "s_x" },
      ])
    );
    window.localStorage.setItem("mb.session", JSON.stringify("u2"));
    renderHeader();
    await screen.findByRole("button", { name: "Account menu" });
    expect(screen.queryByRole("link", { name: /Become a Seller/ })).toBeNull();
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
    window.localStorage.setItem(
      "mb.users",
      JSON.stringify([
        { id: "u3", phone: "+923001234567", password: "password1", role: "seller", displayName: "Test Store", sellerId: "s_teststore1" },
      ])
    );
    window.localStorage.setItem("mb.session", JSON.stringify("u3"));
    renderHeader();
    await userEvent.click(await screen.findByRole("button", { name: "Account menu" }));
    expect(await screen.findByRole("menuitem", { name: "My Storefront" })).toHaveAttribute(
      "href",
      expect.stringContaining("/seller/test-store")
    );
  });
});
