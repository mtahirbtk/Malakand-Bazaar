import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { saveSeller } from "@/lib/mock-db/sellers";
import { saveListing } from "@/lib/mock-db/listings";
import { ClientListingDetail } from "./client-listing-detail";
import type { Seller, Listing } from "@/types";

const SELLER: Seller = {
  id: "s_ld1",
  slug: "listing-detail-store",
  name: "Listing Detail Store",
  initials: "LD",
  tehsilSlug: "batkhela",
  localityLabel: "Batkhela City & Bazaar",
  rating: 0,
  reviewCount: 0,
  verified: false,
  responseMinutes: 30,
  specialty: "General goods",
  statLabel: "Listings",
  statValue: "0",
  phone: "+923001234567",
};

const LISTING: Listing = {
  id: "l_ld1",
  slug: "client-only-detail-listing",
  title: "Client Only Detail Listing",
  description: "Created on the client only.",
  price: 3000,
  categorySlug: "electronics",
  subcategorySlug: "electronics-generators",
  tehsilSlug: "batkhela",
  localitySlug: "batkhela-city",
  localityLabel: "Batkhela City & Bazaar",
  images: [],
  contactPhone: "+923001234567",
  sellerId: "s_ld1",
  status: "active",
  createdAt: "2026-09-12T00:00:00.000Z",
};

function renderDetail(slug: string) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ClientListingDetail slug={slug} />
    </NextIntlClientProvider>
  );
}

describe("ClientListingDetail", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders a mock-db-only listing after mount", async () => {
    saveSeller(SELLER);
    saveListing(LISTING);
    renderDetail("client-only-detail-listing");
    expect(await screen.findByText("Client Only Detail Listing")).toBeInTheDocument();
  });

  it("shows a not-found state for an unknown slug", async () => {
    renderDetail("no-such-listing");
    expect(await screen.findByText("Store Not Found")).toBeInTheDocument();
  });
});
