import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { SellerStorefront } from "./seller-storefront";
import { getSellerBySlug } from "@/lib/sellers";
import { getListingsBySeller } from "@/lib/listings";

const seller = getSellerBySlug("khan-solar-engineering")!;
const listings = getListingsBySeller(seller.id);

function renderStorefront() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SellerStorefront seller={seller} listings={listings} />
    </NextIntlClientProvider>
  );
}

describe("SellerStorefront", () => {
  it("renders the seller name and rating", () => {
    renderStorefront();
    expect(screen.getByRole("heading", { name: seller.name })).toBeInTheDocument();
    expect(screen.getByLabelText(`Rated ${seller.rating} out of 5`)).toBeInTheDocument();
  });

  it("lists all of that seller's listings", () => {
    renderStorefront();
    expect(listings.length).toBeGreaterThan(0);
    for (const listing of listings) {
      expect(screen.getByRole("heading", { name: listing.title })).toBeInTheDocument();
    }
  });

  it("reveals the seller's phone on demand", () => {
    renderStorefront();
    expect(screen.getByRole("button", { name: /Show Number/ })).toBeInTheDocument();
  });
});
