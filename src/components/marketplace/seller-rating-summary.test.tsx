import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SellerRatingSummary } from "./seller-rating-summary";
import type { Seller } from "@/types";

const SELLER: Seller = {
  id: "s1",
  slug: "khan-solar-engineering",
  name: "Khan Solar & Engineering",
  initials: "KS",
  tehsilSlug: "dargai",
  localityLabel: "Dargai Industrial Belt",
  rating: 4.9,
  reviewCount: 142,
  verified: true,
  responseMinutes: 15,
  phone: "+923166441108",
};

describe("SellerRatingSummary", () => {
  it("renders the seller's rating and review count", () => {
    render(<SellerRatingSummary seller={SELLER} />);
    expect(screen.getByText("4.9")).toBeInTheDocument();
    expect(screen.getByText("(142)")).toBeInTheDocument();
  });
});
