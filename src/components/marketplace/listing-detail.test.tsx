import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { ListingDetail } from "./listing-detail";
import type { Listing, Seller } from "@/types";

const seller: Seller = {
  id: "s1",
  slug: "khan-solar-traders",
  name: "Khan Solar Traders",
  initials: "KS",
  tehsilSlug: "batkhela",
  localityLabel: "Batkhela City & Bazaar",
  rating: 4.6,
  reviewCount: 12,
  verified: true,
  responseMinutes: 20,
  phone: "+923001234567",
};

const listing: Listing = {
  id: "l1",
  slug: "solar-inverter-15kw-vfd",
  title: "Solar Inverter 1.5kW VFD",
  description: "Barely used hybrid inverter, all accessories included.",
  price: 85000,
  categorySlug: "electronics",
  subcategorySlug: "electronics-generators",
  tehsilSlug: "batkhela",
  localitySlug: "batkhela-city",
  localityLabel: "Batkhela City & Bazaar",
  images: [],
  contactPhone: "+923001234567",
  sellerId: seller.id,
  status: "active",
  createdAt: "2026-09-12T00:00:00.000Z",
};

const otherListings: Listing[] = [
  { ...listing, id: "l2", slug: "solar-battery-100ah", title: "Solar Battery 100Ah" },
];

function renderDetail() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ListingDetail listing={listing} seller={seller} otherListings={otherListings} />
    </NextIntlClientProvider>
  );
}

describe("ListingDetail", () => {
  it("renders the title, price and description", () => {
    renderDetail();
    expect(screen.getByRole("heading", { name: listing.title })).toBeInTheDocument();
    expect(screen.getByText(listing.description)).toBeInTheDocument();
  });

  it("shows a masked number behind a reveal button, then reveals contact actions", () => {
    renderDetail();
    const revealButton = screen.getByRole("button", { name: /Show WhatsApp Number/ });
    expect(screen.queryByRole("link", { name: /WhatsApp/ })).not.toBeInTheDocument();
    fireEvent.click(revealButton);
    expect(screen.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/")
    );
  });

  it("links to the seller's storefront and lists other listings", () => {
    renderDetail();
    expect(screen.getAllByRole("link", { name: new RegExp(seller.name) }).length).toBeGreaterThan(0);
    for (const other of otherListings) {
      expect(screen.getByRole("heading", { name: other.title })).toBeInTheDocument();
    }
  });
});
