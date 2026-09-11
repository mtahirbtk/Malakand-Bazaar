import { describe, it, expect } from "vitest";
import { getSellerBySlug, getSellerById } from "./sellers";
import { SELLERS } from "@/data/fixtures/sellers";

describe("getSellerBySlug", () => {
  it("finds a seller by slug", () => {
    const first = SELLERS[0];
    expect(getSellerBySlug(first.slug)?.id).toBe(first.id);
  });

  it("returns undefined for an unknown slug", () => {
    expect(getSellerBySlug("does-not-exist")).toBeUndefined();
  });
});

describe("getSellerById", () => {
  it("finds a seller by id", () => {
    const first = SELLERS[0];
    expect(getSellerById(first.id)?.slug).toBe(first.slug);
  });
});
