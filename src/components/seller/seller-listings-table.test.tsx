import { describe, it, expect, afterEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithAuth, mockApi, makeSeller } from "@tests/auth-harness";
import { SellerListingsTable } from "./seller-listings-table";
import type { Listing } from "@/types";

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

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SellerListingsTable", () => {
  it("shows the seller's active listings by default", async () => {
    mockApi({
      "GET /api/seller/listings?status=active&limit=60": { data: [LISTING] },
    });
    renderWithAuth(<SellerListingsTable />, makeSeller());
    expect(await screen.findByText("Test Listing")).toBeInTheDocument();
  });

  it("shows an empty state on a tab with no listings", async () => {
    mockApi({
      "GET /api/seller/listings?status=active&limit=60": { data: [LISTING] },
      "GET /api/seller/listings?status=sold&limit=60": { data: [] },
    });
    renderWithAuth(<SellerListingsTable />, makeSeller());
    await screen.findByText("Test Listing");
    await userEvent.click(await screen.findByRole("tab", { name: "Sold" }));
    expect(await screen.findByText("Nothing here yet")).toBeInTheDocument();
  });

  it("re-fetches the active tab after Mark Sold, reflecting the new status", async () => {
    // The active-tab GET answers with the listing on the first call (initial
    // load) and without it on the second (the refetch Mark Sold triggers) —
    // exactly what the real API would do once the PATCH has landed.
    mockApi({
      "GET /api/seller/listings?status=active&limit=60": ({ callNumber }) => ({
        data: callNumber === 1 ? [LISTING] : [],
      }),
      "PATCH /api/seller/listings/l_test1/status": { data: { listing: { ...LISTING, status: "sold" } } },
    });
    renderWithAuth(<SellerListingsTable />, makeSeller());

    await screen.findByText("Test Listing");
    await userEvent.click(await screen.findByRole("button", { name: "Mark Sold" }));

    expect(await screen.findByText("Nothing here yet")).toBeInTheDocument();
  });
});
