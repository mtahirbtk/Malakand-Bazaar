import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithAuth, mockApi, makeUser, makeSeller, TEST_USER_ID } from "@tests/auth-harness";
import { SellerReviews } from "./seller-reviews";
import type { Seller } from "@/types";

// Toast content (the error-path assertions below) is rendered by SweetAlert2
// itself — mocked the same way src/components/ui/toast.test.tsx does, so
// `fire`'s call args are what we assert against instead of real DOM the
// library renders outside Testing Library's reach.
const { fire } = vi.hoisted(() => ({ fire: vi.fn() }));
vi.mock("sweetalert2", () => ({
  default: { mixin: () => ({ fire }), stopTimer: vi.fn(), resumeTimer: vi.fn() },
}));

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

const MY_REVIEW = {
  id: "r1",
  buyerId: TEST_USER_ID,
  buyerName: "Bilal",
  rating: 4,
  comment: "Solid, would buy again.",
  createdAt: "2026-09-01T00:00:00.000Z",
};

describe("SellerReviews", () => {
  beforeEach(() => {
    fire.mockClear();
  });

  it("shows the review composer inline (no button needed) even signed out, and prompts sign-in on submit", async () => {
    mockApi({ "GET /api/sellers/khan-solar-engineering/reviews?limit=24": { data: [] } });
    renderWithAuth(<SellerReviews seller={SELLER} />, null);
    const textarea = await screen.findByPlaceholderText("Share your experience with this seller...");
    await userEvent.type(textarea, "Great seller!");
    await userEvent.click(screen.getByRole("button", { name: "Submit Review" }));
    expect(await screen.findByText("Sign In to Review")).toBeInTheDocument();
  });

  it("lets a signed-in customer submit a review directly (no toggle button), which then appears in the list", async () => {
    mockApi({
      "GET /api/sellers/khan-solar-engineering/reviews?limit=24": ({ callNumber }) =>
        callNumber === 1 ? { data: [] } : { data: [MY_REVIEW] },
      "GET /api/me/reviews?limit=60": ({ callNumber }) =>
        callNumber === 1 ? { data: [] } : { data: [{ id: "r1", sellerId: "s1", rating: 5, comment: "Great seller!" }] },
      "POST /api/sellers/khan-solar-engineering/reviews": { data: { review: { id: "r1" } }, status: 201 },
    });
    renderWithAuth(<SellerReviews seller={SELLER} />, makeUser({ displayName: "Bilal" }));
    await userEvent.type(await screen.findByPlaceholderText("Share your experience with this seller..."), "Great seller!");
    await userEvent.click(screen.getByRole("button", { name: "Submit Review" }));
    expect(await screen.findByText("Bilal")).toBeInTheDocument();
    expect(await screen.findByText("Solid, would buy again.")).toBeInTheDocument();
    // Composer hides itself once the buyer has a review — replaced by the read-only card + Edit/Delete.
    expect(screen.queryByPlaceholderText("Share your experience with this seller...")).toBeNull();
  });

  it("hides the composer entirely for the seller's own storefront", async () => {
    mockApi({ "GET /api/sellers/khan-solar-engineering/reviews?limit=24": { data: [] } });
    renderWithAuth(<SellerReviews seller={SELLER} />, makeSeller({ sellerId: "s1" }));
    await screen.findByText("Reviews");
    expect(screen.queryByPlaceholderText("Share your experience with this seller...")).toBeNull();
  });

  it("shows Edit/Delete instead of the composer for a buyer whose review is on the fetched page", async () => {
    mockApi({
      "GET /api/sellers/khan-solar-engineering/reviews?limit=24": { data: [MY_REVIEW] },
      "GET /api/me/reviews?limit=60": { data: [{ id: "r1", sellerId: "s1", rating: 4, comment: MY_REVIEW.comment }] },
    });
    renderWithAuth(<SellerReviews seller={SELLER} />, makeUser({ id: TEST_USER_ID, displayName: "Bilal" }));
    expect(await screen.findByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Share your experience with this seller...")).toBeNull();
  });

  it("still hides the composer for a buyer whose review exists but isn't on the fetched page (>1 page of reviews)", async () => {
    // The seller-scoped list only ever returns the newest 24 — simulate the
    // buyer's own review having aged off that page while /api/me/reviews
    // (account-wide, not seller-scoped) still reports it exists.
    mockApi({
      "GET /api/sellers/khan-solar-engineering/reviews?limit=24": {
        data: [{ id: "r-someone-else", buyerId: "other-buyer", buyerName: "Ayesha", rating: 5, comment: "Good", createdAt: "2026-09-10T00:00:00.000Z" }],
      },
      "GET /api/me/reviews?limit=60": { data: [{ id: "r1", sellerId: "s1", rating: 4, comment: MY_REVIEW.comment }] },
    });
    renderWithAuth(<SellerReviews seller={SELLER} />, makeUser({ id: TEST_USER_ID, displayName: "Bilal" }));
    await screen.findByText("Ayesha");
    await waitFor(() => {
      expect(screen.queryByPlaceholderText("Share your experience with this seller...")).toBeNull();
    });
  });

  it("edits the buyer's existing review: prefills the form and PATCHes", async () => {
    const { calls } = mockApi({
      "GET /api/sellers/khan-solar-engineering/reviews?limit=24": ({ callNumber }) =>
        callNumber === 1 ? { data: [MY_REVIEW] } : { data: [{ ...MY_REVIEW, comment: "Updated after visiting again." }] },
      "GET /api/me/reviews?limit=60": { data: [{ id: "r1", sellerId: "s1", rating: 4, comment: MY_REVIEW.comment }] },
      "PATCH /api/reviews/r1": { data: { review: { id: "r1" } } },
    });
    renderWithAuth(<SellerReviews seller={SELLER} />, makeUser({ id: TEST_USER_ID, displayName: "Bilal" }));

    await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
    const textarea = screen.getByPlaceholderText("Share your experience with this seller...");
    expect(textarea).toHaveValue("Solid, would buy again.");
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();

    await userEvent.clear(textarea);
    await userEvent.type(textarea, "Updated after visiting again.");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Updated after visiting again.")).toBeInTheDocument();
    const patchCall = calls.find((c) => c.method === "PATCH" && c.path === "/api/reviews/r1");
    expect(patchCall?.body).toEqual({ rating: 4, comment: "Updated after visiting again." });
  });

  it("cancelling the delete confirmation makes no DELETE call", async () => {
    const { calls } = mockApi({
      "GET /api/sellers/khan-solar-engineering/reviews?limit=24": { data: [MY_REVIEW] },
      "GET /api/me/reviews?limit=60": { data: [{ id: "r1", sellerId: "s1", rating: 4, comment: MY_REVIEW.comment }] },
    });
    renderWithAuth(<SellerReviews seller={SELLER} />, makeUser({ id: TEST_USER_ID, displayName: "Bilal" }));

    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog", { name: "Delete this review?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    expect(screen.getByText("Solid, would buy again.")).toBeInTheDocument();
  });

  it("confirming the delete calls DELETE and the review disappears", async () => {
    mockApi({
      "GET /api/sellers/khan-solar-engineering/reviews?limit=24": ({ callNumber }) =>
        callNumber === 1 ? { data: [MY_REVIEW] } : { data: [] },
      "GET /api/me/reviews?limit=60": ({ callNumber }) =>
        callNumber === 1 ? { data: [{ id: "r1", sellerId: "s1", rating: 4, comment: MY_REVIEW.comment }] } : { data: [] },
      "DELETE /api/reviews/r1": { data: { deleted: true } },
    });
    renderWithAuth(<SellerReviews seller={SELLER} />, makeUser({ id: TEST_USER_ID, displayName: "Bilal" }));

    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog", { name: "Delete this review?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(screen.queryByText("Solid, would buy again.")).toBeNull();
    });
    // Composer reappears since the buyer no longer has a review.
    expect(await screen.findByPlaceholderText("Share your experience with this seller...")).toBeInTheDocument();
  });

  it("shows an error toast and leaves the form open when submitting fails", async () => {
    mockApi({
      "GET /api/sellers/khan-solar-engineering/reviews?limit=24": { data: [] },
      "GET /api/me/reviews?limit=60": { data: [] },
      "POST /api/sellers/khan-solar-engineering/reviews": {
        status: 409,
        error: { code: "CONFLICT", message: "You have already reviewed this seller. Edit your existing review instead." },
      },
    });
    renderWithAuth(<SellerReviews seller={SELLER} />, makeUser({ displayName: "Bilal" }));

    await userEvent.type(await screen.findByPlaceholderText("Share your experience with this seller..."), "Great seller!");
    await userEvent.click(screen.getByRole("button", { name: "Submit Review" }));

    await waitFor(() => {
      expect(fire).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "You have already reviewed this seller. Edit your existing review instead.",
          icon: "error",
        })
      );
    });
    expect(screen.getByRole("button", { name: "Submit Review" })).toBeInTheDocument();
  });

  it("shows an error toast and keeps the confirm modal open when deleting fails", async () => {
    mockApi({
      "GET /api/sellers/khan-solar-engineering/reviews?limit=24": { data: [MY_REVIEW] },
      "GET /api/me/reviews?limit=60": { data: [{ id: "r1", sellerId: "s1", rating: 4, comment: MY_REVIEW.comment }] },
      "DELETE /api/reviews/r1": {
        status: 500,
        error: { code: "INTERNAL", message: "Could not delete that review. Please try again." },
      },
    });
    renderWithAuth(<SellerReviews seller={SELLER} />, makeUser({ id: TEST_USER_ID, displayName: "Bilal" }));

    await userEvent.click(await screen.findByRole("button", { name: "Delete" }));
    const dialog = await screen.findByRole("dialog", { name: "Delete this review?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(fire).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Could not delete that review. Please try again.", icon: "error" })
      );
    });
    expect(screen.getByRole("dialog", { name: "Delete this review?" })).toBeInTheDocument();
  });
});
