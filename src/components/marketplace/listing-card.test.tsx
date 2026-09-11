import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { ListingCard } from "./listing-card";
import type { Listing } from "@/types";

const listing: Listing = {
  id: "l1",
  slug: "solar-inverter-15kw-vfd",
  title: "Solar Inverter 15kW VFD Heavy Tubewell System",
  description: "Heavy duty VFD inverter for tubewell use.",
  price: 240000,
  compareAtPrice: 265000,
  categorySlug: "solar-energy",
  subcategorySlug: "solar-energy-solar-inverters",
  tehsilSlug: "dargai",
  localitySlug: "dargai-industrial-belt",
  localityLabel: "Dargai Industrial Belt",
  images: ["/images/seed/1.jpg"],
  badge: { label: "2 Yr Warranty", tone: "sand" },
  contactPhone: "+923166441108",
  sellerId: "s1",
  status: "active",
  createdAt: "2026-08-01T00:00:00.000Z",
};

function renderCard(overrides: Partial<Listing> = {}) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ListingCard listing={{ ...listing, ...overrides }} />
    </NextIntlClientProvider>
  );
}

describe("ListingCard", () => {
  it("renders the title as a heading", () => {
    renderCard();
    expect(screen.getByRole("heading", { name: listing.title })).toBeInTheDocument();
  });

  it("shows the formatted price and the struck-through compare price", () => {
    renderCard();
    expect(screen.getByText("PKR 240,000")).toBeInTheDocument();
    expect(screen.getByText("265,000")).toHaveClass("line-through");
  });

  it("shows the locality label", () => {
    renderCard();
    expect(screen.getByText("Dargai Industrial Belt")).toBeInTheDocument();
  });

  it("renders the badge", () => {
    renderCard();
    expect(screen.getByText("2 Yr Warranty")).toBeInTheDocument();
  });

  it("links to the listing detail page, with no contact buttons on the card", () => {
    renderCard();
    const link = screen.getByRole("link", { name: new RegExp(listing.title) });
    expect(link).toHaveAttribute("href", `/en/listing/${listing.slug}`);
    expect(screen.queryByRole("link", { name: /WhatsApp/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("gives the image alt text", () => {
    renderCard();
    expect(screen.getByAltText(listing.title)).toBeInTheDocument();
  });

  it("marks a sold listing", () => {
    renderCard({ status: "sold" });
    expect(screen.getByText(/Sold/i)).toBeInTheDocument();
  });

  it("falls back to an icon when there is no photo", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <ListingCard listing={{ ...listing, images: [], iconFallback: "phone_iphone" }} />
      </NextIntlClientProvider>
    );
    expect(screen.queryByAltText(listing.title)).not.toBeInTheDocument();
  });
});
