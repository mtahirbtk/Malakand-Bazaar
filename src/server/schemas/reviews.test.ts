import { describe, it, expect } from "vitest";
import { createReviewSchema, updateReviewSchema, sellerReviewsQuerySchema } from "./reviews";

describe("createReviewSchema", () => {
  it("accepts a valid review", () => {
    const result = createReviewSchema.parse({ rating: 5, comment: "Great seller, fast delivery." });
    expect(result).toEqual({ rating: 5, comment: "Great seller, fast delivery." });
  });

  it("allows an empty comment", () => {
    const result = createReviewSchema.parse({ rating: 4, comment: "" });
    expect(result.comment).toBeUndefined();
  });

  it("rejects a rating outside 1-5", () => {
    expect(() => createReviewSchema.parse({ rating: 6, comment: "" })).toThrow();
    expect(() => createReviewSchema.parse({ rating: 0, comment: "" })).toThrow();
  });

  it("rejects a comment over 1500 characters", () => {
    expect(() => createReviewSchema.parse({ rating: 5, comment: "x".repeat(1501) })).toThrow();
  });
});

describe("updateReviewSchema", () => {
  it("requires at least one field", () => {
    expect(() => updateReviewSchema.parse({})).toThrow("Nothing to update.");
  });

  it("accepts rating only", () => {
    expect(updateReviewSchema.parse({ rating: 3 })).toEqual({ rating: 3 });
  });
});

describe("sellerReviewsQuerySchema", () => {
  it("defaults limit and page", () => {
    const result = sellerReviewsQuerySchema.parse({});
    expect(result.limit).toBe(24);
  });
});
