import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { SellerCard } from "./seller-card";
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
  specialty: "VFD Inverters & Tube-well Motors",
  statLabel: "Deals Done",
  statValue: "142 Systems",
  phone: "+923166441108",
};

function renderCard(overrides: Partial<Seller> = {}) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SellerCard seller={{ ...seller, ...overrides }} />
    </NextIntlClientProvider>
  );
}

describe("SellerCard", () => {
  it("renders the seller name", () => {
    renderCard();
    expect(screen.getByRole("heading", { name: seller.name })).toBeInTheDocument();
  });

  it("shows the rating and review count", () => {
    renderCard();
    expect(screen.getByLabelText("Rated 4.9 out of 5")).toBeInTheDocument();
    expect(screen.getByText("(142)")).toBeInTheDocument();
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
    renderCard();
    expect(screen.getByText("KS")).toBeInTheDocument();
  });

  it("links the Visit Store button to the seller's storefront", () => {
    renderCard();
    const link = screen.getByRole("link", { name: /Visit Store/ });
    expect(link).toHaveAttribute("href", `/en/seller/${seller.slug}`);
  });
});
