import { describe, it, expect } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithAuth, mockApi, makeUser } from "@tests/auth-harness";
import { ListingDetail } from "./listing-detail";
import { ListingCard } from "./listing-card";
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

// `otherListingsSlot` is rendered by the caller (see seller-other-listings.tsx,
// behind its own <Suspense>) — ListingDetail just places whatever it's given.
const otherListingsSlot = (
  <div>
    {otherListings.map((l) => (
      <ListingCard key={l.id} listing={l} />
    ))}
  </div>
);

function renderDetail() {
  // Signed out by default (SaveListingButton renders nothing for a
  // signed-out visitor) so the existing assertions below are unaffected by
  // its presence next to PhoneReveal. renderWithAuth already wraps with
  // NextIntlClientProvider, so no separate provider is needed here.
  renderWithAuth(<ListingDetail listing={listing} seller={seller} otherListingsSlot={otherListingsSlot} />, null);
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

  it("mounts the save listing button next to PhoneReveal for a signed-in visitor", async () => {
    mockApi({ "POST /api/me/favorites": { data: { saved: true }, status: 201 } });
    renderWithAuth(<ListingDetail listing={listing} seller={seller} otherListingsSlot={otherListingsSlot} />, makeUser());
    const saveButton = screen.getByRole("button", { name: "Save listing" });
    await userEvent.click(saveButton);
    expect(await screen.findByRole("button", { name: "Remove from saved" })).toBeInTheDocument();
  });
});
