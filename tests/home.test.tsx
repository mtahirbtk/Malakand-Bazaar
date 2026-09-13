import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import HomeContent from "@/app/[locale]/home-content";
import type { HomePayload } from "@/server/services/home";
import type { Listing, Seller } from "@/types";

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

function makeSeller(id: string): Seller {
  return {
    id,
    slug: `seller-${id}`,
    name: `Seller ${id}`,
    initials: "SE",
    tehsilSlug: "batkhela",
    localityLabel: "Batkhela",
    rating: 4.8,
    reviewCount: 12,
    verified: true,
    responseMinutes: 20,
    phone: "+923001234567",
  };
}

function emptyPayload(overrides: Partial<HomePayload> = {}): HomePayload {
  return {
    readiness: { showTrending: false, showTopSellers: false },
    shelves: [],
    trending: [],
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

  it("shows the honest launch state when there are no shelves, trending or top sellers", () => {
    renderHome(emptyPayload());
    expect(screen.getByText("Malakand's marketplace is opening")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /List your first item/ })).toHaveAttribute("href", "/en/sell");
  });

  it("renders a category shelf returned by the payload, and nothing above threshold", () => {
    const payload = emptyPayload({
      shelves: [
        {
          categorySlug: "vehicles",
          categoryName: "Vehicles",
          items: [makeListing("1"), makeListing("2")],
        },
      ],
    });
    renderHome(payload);
    expect(screen.getByRole("heading", { name: "Vehicles" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Listing 1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Listing 2" })).toBeInTheDocument();
    expect(screen.queryByText("Malakand's marketplace is opening")).not.toBeInTheDocument();
  });

  it("hides trending when readiness.showTrending is false even if items are present", () => {
    const payload = emptyPayload({ trending: [makeListing("1")], readiness: { showTrending: false, showTopSellers: false } });
    renderHome(payload);
    expect(screen.queryByText("Trending This Week")).not.toBeInTheDocument();
  });

  it("shows trending only when readiness.showTrending is true and items exist", () => {
    const payload = emptyPayload({
      trending: [makeListing("1")],
      readiness: { showTrending: true, showTopSellers: false },
    });
    renderHome(payload);
    expect(screen.getByText("Trending This Week")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Listing 1" })).toBeInTheDocument();
  });

  it("shows top sellers only when readiness.showTopSellers is true and sellers exist", () => {
    const payload = emptyPayload({
      topSellers: [makeSeller("1"), makeSeller("2")],
      readiness: { showTrending: false, showTopSellers: true },
    });
    renderHome(payload);
    expect(screen.getAllByRole("link", { name: /Visit Store/ })).toHaveLength(2);
  });

  it("does not show top sellers when readiness.showTopSellers is false", () => {
    const payload = emptyPayload({
      topSellers: [makeSeller("1")],
      readiness: { showTrending: false, showTopSellers: false },
    });
    renderHome(payload);
    expect(screen.queryByRole("link", { name: /Visit Store/ })).not.toBeInTheDocument();
  });
});
