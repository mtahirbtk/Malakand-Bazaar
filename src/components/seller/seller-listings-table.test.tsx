import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { AuthProvider, type AuthUser } from "@/lib/auth/auth-context";
import { makeSeller } from "@tests/auth-harness";
import { saveListing } from "@/lib/mock-db/listings";
import { SellerListingsTable } from "./seller-listings-table";
import type { Listing } from "@/types";

let signedIn: AuthUser | null = null;

/** Seeds the auth context the way the server would, rather than faking cookies. */
function seedSignedInSeller() {
  signedIn = makeSeller({ sellerId: "s_test1" });
}

const LISTING: Listing = {
  id: "l_test1",
  slug: "test-listing",
  title: "Test Listing",
  description: "A listing.",
  price: 1000,
  categorySlug: "electronics",
  subcategorySlug: "electronics-generators",
  tehsilSlug: "batkhela",
  localitySlug: "batkhela-city",
  localityLabel: "Batkhela City & Bazaar",
  images: [],
  contactPhone: "+923001234567",
  sellerId: "s_test1",
  status: "active",
  createdAt: "2026-09-12T00:00:00.000Z",
};

function renderTable() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AuthProvider initialUser={signedIn}>
        <SellerListingsTable />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}

describe("SellerListingsTable", () => {
  beforeEach(() => {
    window.localStorage.clear();
    signedIn = null;
  });

  it("shows the seller's active listings by default", async () => {
    seedSignedInSeller();
    saveListing(LISTING);
    renderTable();
    expect(await screen.findByText("Test Listing")).toBeInTheDocument();
  });

  it("shows an empty state on a tab with no listings", async () => {
    seedSignedInSeller();
    saveListing(LISTING);
    renderTable();
    await userEvent.click(await screen.findByRole("tab", { name: "Sold" }));
    expect(await screen.findByText("Nothing here yet")).toBeInTheDocument();
  });

  it("moves a listing to the Sold tab after Mark Sold", async () => {
    seedSignedInSeller();
    saveListing(LISTING);
    renderTable();
    await userEvent.click(await screen.findByRole("button", { name: "Mark Sold" }));
    expect(screen.queryByText("Test Listing")).toBeNull();
    await userEvent.click(screen.getByRole("tab", { name: "Sold" }));
    expect(await screen.findByText("Test Listing")).toBeInTheDocument();
  });
});
