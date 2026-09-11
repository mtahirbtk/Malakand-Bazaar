import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { ListingDetail } from "./listing-detail";
import { getListingBySlug, getListingsBySeller } from "@/lib/listings";
import { getSellerById } from "@/lib/sellers";

const listing = getListingBySlug("solar-inverter-15kw-vfd")!;
const seller = getSellerById(listing.sellerId);
const otherListings = getListingsBySeller(listing.sellerId, { excludeId: listing.id, limit: 5 });

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
    expect(screen.getAllByRole("link", { name: new RegExp(seller!.name) }).length).toBeGreaterThan(0);
    expect(otherListings.length).toBeGreaterThan(0);
    for (const other of otherListings) {
      expect(screen.getByRole("heading", { name: other.title })).toBeInTheDocument();
    }
  });
});
