import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import HomeContent from "@/app/[locale]/home-content";
import type { HomePayload } from "@/server/services/home";
import type { Listing, Seller } from "@/types";

function makeSeller(id: string): Seller {
  return {
    id,
    slug: `seller-${id}`,
    name: `Seller ${id}`,
    initials: "S" + id,
    tehsilSlug: "batkhela",
    localityLabel: "Batkhela",
    rating: 4.8,
    reviewCount: 20,
    verified: true,
    responseMinutes: 10,
    listingCount: 5,
    phone: "+923001234567",
  };
}

function makeListing(id: string, categorySlug = "vehicles"): Listing {
  return {
    id,
    slug: `listing-${id}`,
    title: `Listing ${id}`,
    description: "A test listing.",
    price: 1000,
    categorySlug,
    subcategorySlug: "vehicles-cars",
    tehsilSlug: "batkhela",
    localitySlug: "",
    localityLabel: "Batkhela",
    images: [],
    contactPhone: "+923001234567",
    sellerId: "seller-1",
    status: "active",
    createdAt: new Date().toISOString(),
  };
}

function emptyPayload(overrides: Partial<HomePayload> = {}): HomePayload {
  return {
    topListings: [],
    topSellers: [],
    counters: { totalActiveListings: 0, totalSellers: 0 },
    ...overrides,
  };
}

function renderHome(payload: HomePayload) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <HomeContent payload={payload} />
    </NextIntlClientProvider>
  );
}

describe("Home page", () => {
  it("renders a hero carousel and the sector grid unconditionally", () => {
    renderHome(emptyPayload());
    expect(screen.getByRole("region", { name: /Highlights/ })).toBeInTheDocument();
    const sectors = screen.getByRole("region", { name: /Popular Marketplace Sectors/ });
    expect(sectors.querySelectorAll("a")).toHaveLength(9); // 8 circles + View All
  });

  it("shows the honest launch state when there are no top listings", () => {
    renderHome(emptyPayload());
    expect(screen.getByText("Malakand's marketplace is opening")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /List your first item/ })).toHaveAttribute("href", "/en/sell");
  });

  it("renders the Top Listings shelf with no minimum-count gate", () => {
    const payload = emptyPayload({ topListings: [makeListing("1")] });
    renderHome(payload);
    expect(screen.getByText("Top Listings")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Listing 1" })).toBeInTheDocument();
    expect(screen.queryByText("Malakand's marketplace is opening")).not.toBeInTheDocument();
  });

  it("caps the shelf at 12 listings and links See All to /search", () => {
    const payload = emptyPayload({
      topListings: Array.from({ length: 15 }, (_, i) => makeListing(String(i))),
    });
    renderHome(payload);
    expect(screen.getAllByRole("heading", { name: /^Listing \d+$/ })).toHaveLength(12);
    const seeAllLinks = screen.getAllByRole("link", { name: /View All/ });
    expect(seeAllLinks.some((link) => link.getAttribute("href") === "/en/search")).toBe(true);
  });

  it("omits the Top Sellers shelf when there are no qualifying sellers", () => {
    renderHome(emptyPayload());
    expect(screen.queryByText("Top Sellers")).not.toBeInTheDocument();
  });

  it("renders the Top Sellers shelf and links View All to /sellers", () => {
    const payload = emptyPayload({ topSellers: [makeSeller("1"), makeSeller("2")] });
    renderHome(payload);
    expect(screen.getByText("Top Sellers")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Seller 1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Seller 2" })).toBeInTheDocument();
    const seeAllLinks = screen.getAllByRole("link", { name: /View All/ });
    expect(seeAllLinks.some((link) => link.getAttribute("href") === "/en/sellers")).toBe(true);
  });
});
