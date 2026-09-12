import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { upsertReview } from "@/lib/mock-db/reviews";
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
  specialty: "VFD Inverters",
  statLabel: "Deals Done",
  statValue: "142 Systems",
  phone: "+923166441108",
};

describe("SellerRatingSummary", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the seed rating and count with no stored reviews", async () => {
    render(<SellerRatingSummary seller={SELLER} />);
    expect(await screen.findByText("(142)")).toBeInTheDocument();
  });

  it("blends in a stored review after mount", async () => {
    upsertReview({ sellerId: "s1", buyerId: "u1", buyerName: "Bilal", rating: 5, comment: "Great!" });
    render(<SellerRatingSummary seller={SELLER} />);
    expect(await screen.findByText("(143)")).toBeInTheDocument();
  });
});
