import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { AuthProvider } from "@/lib/auth/auth-context";
import { SellerStorefront } from "./seller-storefront";
import type { Listing, Seller } from "@/types";

const seller: Seller = {
  id: "s1",
  slug: "khan-solar-engineering",
  name: "Khan Solar Engineering",
  initials: "KS",
  tehsilSlug: "batkhela",
  localityLabel: "Batkhela City & Bazaar",
  rating: 4.6,
  reviewCount: 12,
  verified: true,
  responseMinutes: 20,
  phone: "+923001234567",
};

const listings: Listing[] = [
  {
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
  },
];

function renderStorefront() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AuthProvider>
        <SellerStorefront seller={seller} listings={listings} />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}

describe("SellerStorefront", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders the seller name and rating", () => {
    renderStorefront();
    expect(screen.getByRole("heading", { name: seller.name })).toBeInTheDocument();
    expect(screen.getByLabelText(`Rated ${seller.rating} out of 5`)).toBeInTheDocument();
  });

  it("lists all of that seller's listings", () => {
    renderStorefront();
    for (const listing of listings) {
      expect(screen.getByRole("heading", { name: listing.title })).toBeInTheDocument();
    }
  });

  it("reveals the seller's phone on demand", () => {
    renderStorefront();
    expect(screen.getByRole("button", { name: /Show WhatsApp Number/ })).toBeInTheDocument();
  });

  it("shows member-since copy when the seller has a memberSince date", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <AuthProvider>
          <SellerStorefront seller={{ ...seller, memberSince: "2023-05-01T00:00:00.000Z" }} listings={listings} />
        </AuthProvider>
      </NextIntlClientProvider>
    );
    expect(screen.getByText(/Member since 2023/)).toBeInTheDocument();
  });

  it("omits member-since copy when the seller has no memberSince date", () => {
    renderStorefront();
    expect(screen.queryByText(/Member since/)).not.toBeInTheDocument();
  });
});
