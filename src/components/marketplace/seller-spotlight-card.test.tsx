import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { SellerSpotlightCard } from "./seller-spotlight-card";
import type { Seller } from "@/types";

const seller: Seller = {
  id: "s1",
  slug: "khan-solar",
  name: "Khan Solar & Powerhouse",
  initials: "KS",
  tehsilSlug: "dargai",
  localityLabel: "Dargai Industrial Belt",
  rating: 4.9,
  reviewCount: 142,
  verified: true,
  responseMinutes: 5,
  listingCount: 37,
  phone: "+923166441108",
  avatarUrl: "https://res.cloudinary.com/demo/image/upload/avatar.jpg",
  storefrontBanner: "https://res.cloudinary.com/demo/image/upload/banner.jpg",
};

function renderCard(overrides: Partial<Seller> = {}) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SellerSpotlightCard seller={{ ...seller, ...overrides }} />
    </NextIntlClientProvider>
  );
}

describe("SellerSpotlightCard", () => {
  it("renders the seller name", () => {
    renderCard();
    expect(screen.getByRole("heading", { name: seller.name })).toBeInTheDocument();
  });

  it("shows the rating and review count", () => {
    renderCard();
    expect(screen.getByLabelText("Rated 4.9 out of 5")).toBeInTheDocument();
    expect(screen.getByText("(142)")).toBeInTheDocument();
  });

  it("shows the locality and listing count", () => {
    renderCard();
    expect(screen.getByText("Dargai Industrial Belt")).toBeInTheDocument();
    expect(screen.getByText(/37\s*Active Listings/)).toBeInTheDocument();
  });

  it("shows a verified badge for verified sellers", () => {
    renderCard();
    expect(screen.getByText(/Verified/i)).toBeInTheDocument();
  });

  it("omits the verified badge otherwise", () => {
    renderCard({ verified: false });
    expect(screen.queryByText(/Verified/i)).not.toBeInTheDocument();
  });

  it("falls back to initials when there is no avatar image", () => {
    renderCard({ avatarUrl: undefined });
    expect(screen.getByText("KS")).toBeInTheDocument();
  });

  it("links the whole card to the seller's storefront", () => {
    renderCard();
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", `/en/seller/${seller.slug}`);
  });
});
