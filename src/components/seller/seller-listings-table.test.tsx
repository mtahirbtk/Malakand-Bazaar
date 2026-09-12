import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { AuthProvider } from "@/lib/mock-db/auth-context";
import { saveListing } from "@/lib/mock-db/listings";
import { SellerListingsTable } from "./seller-listings-table";
import type { Listing } from "@/types";

function seedSignedInSeller() {
  window.localStorage.setItem(
    "mb.users",
    JSON.stringify([{ id: "u1", phone: "+923001234567", password: "password1", role: "seller", displayName: "Store", sellerId: "s_test1" }])
  );
  window.localStorage.setItem("mb.session", JSON.stringify("u1"));
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
      <AuthProvider>
        <SellerListingsTable />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}

describe("SellerListingsTable", () => {
  beforeEach(() => {
    window.localStorage.clear();
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
