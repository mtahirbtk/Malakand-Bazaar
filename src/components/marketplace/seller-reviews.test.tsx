import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithAuth, mockApi, makeUser, makeSeller } from "@tests/auth-harness";
import { SellerReviews } from "./seller-reviews";
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

describe("SellerReviews", () => {
  it("prompts sign-in when a signed-out visitor tries to write a review", async () => {
    mockApi({ "GET /api/sellers/khan-solar-engineering/reviews?limit=24": { data: [] } });
    renderWithAuth(<SellerReviews seller={SELLER} />, null);
    await userEvent.click(await screen.findByRole("button", { name: "Write a Review" }));
    expect(await screen.findByText("Sign In to Review")).toBeInTheDocument();
  });

  it("lets a signed-in customer submit a review, which then appears in the list", async () => {
    mockApi({
      "GET /api/sellers/khan-solar-engineering/reviews?limit=24": ({ callNumber }) =>
        callNumber === 1
          ? { data: [] }
          : {
              data: [{ id: "r1", buyerId: "22222222-2222-4222-8222-222222222222", buyerName: "Bilal", rating: 5, comment: "Great seller!", createdAt: "2026-09-13T00:00:00.000Z" }],
            },
      "POST /api/sellers/khan-solar-engineering/reviews": { data: { review: { id: "r1" } }, status: 201 },
    });
    renderWithAuth(<SellerReviews seller={SELLER} />, makeUser({ displayName: "Bilal" }));
    await userEvent.click(await screen.findByRole("button", { name: "Write a Review" }));
    await userEvent.type(screen.getByPlaceholderText("Share your experience with this seller..."), "Great seller!");
    await userEvent.click(screen.getByRole("button", { name: "Submit Review" }));
    expect(await screen.findByText("Bilal")).toBeInTheDocument();
    expect(await screen.findByText("Great seller!")).toBeInTheDocument();
  });

  it("hides the write-review button for the seller's own storefront", async () => {
    mockApi({ "GET /api/sellers/khan-solar-engineering/reviews?limit=24": { data: [] } });
    renderWithAuth(<SellerReviews seller={SELLER} />, makeSeller({ sellerId: "s1" }));
    await screen.findByText("Reviews");
    expect(screen.queryByRole("button", { name: "Write a Review" })).toBeNull();
  });
});
