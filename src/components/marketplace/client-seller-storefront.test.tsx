import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { saveSeller } from "@/lib/mock-db/sellers";
import { saveListing } from "@/lib/mock-db/listings";
import { AuthProvider } from "@/lib/auth/auth-context";
import { ClientSellerStorefront } from "./client-seller-storefront";
import type { Seller, Listing } from "@/types";

const SELLER: Seller = {
  id: "s_client1",
  slug: "client-only-store",
  name: "Client Only Store",
  initials: "CO",
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
  id: "l_client1",
  slug: "client-only-listing",
  title: "Client Only Listing",
  description: "Created on the client only.",
  price: 2000,
  categorySlug: "electronics",
  subcategorySlug: "electronics-generators",
  tehsilSlug: "batkhela",
  localitySlug: "batkhela-city",
  localityLabel: "Batkhela City & Bazaar",
  images: [],
  contactPhone: "+923001234567",
  sellerId: "s_client1",
  status: "active",
  createdAt: "2026-09-12T00:00:00.000Z",
};

function renderStorefront(slug: string) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AuthProvider>
        <ClientSellerStorefront slug={slug} />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}

describe("ClientSellerStorefront", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders a mock-db-only seller and its listings after mount", async () => {
    saveSeller(SELLER);
    saveListing(LISTING);
    renderStorefront("client-only-store");
    expect(await screen.findByText("Client Only Store")).toBeInTheDocument();
    expect(await screen.findByText("Client Only Listing")).toBeInTheDocument();
  });

  it("shows a not-found state for an unknown slug", async () => {
    renderStorefront("no-such-store");
    expect(await screen.findByText("Store Not Found")).toBeInTheDocument();
  });
});
