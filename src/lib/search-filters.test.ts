import { describe, expect, it } from "vitest";
import { CATEGORIES } from "@/data/categories";
import { categoryLabel, subcategoryLabel, SORT_OPTIONS } from "./search-filters";

describe("categoryLabel / subcategoryLabel", () => {
  it("resolves a known category and subcategory slug", () => {
    const category = CATEGORIES[0];
    const subcategory = category.subcategories[0];
    expect(categoryLabel(category.slug)).toBe(category.nameEn);
    expect(subcategoryLabel(subcategory.slug)).toBe(subcategory.nameEn);
  });

  it("returns undefined for an unknown slug", () => {
    expect(categoryLabel("not-a-real-category")).toBeUndefined();
    expect(subcategoryLabel("not-a-real-subcategory")).toBeUndefined();
  });
});

describe("SORT_OPTIONS", () => {
  it("matches the sort vocabulary the search API accepts", () => {
    expect(SORT_OPTIONS).toEqual([
      "featured",
      "relevant",
      "price_low",
      "price_high",
      "date_new",
      "date_old",
    ]);
  });
});
