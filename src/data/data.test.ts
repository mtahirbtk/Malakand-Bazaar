import { describe, it, expect } from "vitest";
import { TEHSILS, TEHSIL_OPTIONS, ALL_LOCALITIES } from "./tehsils";
import { CATEGORIES, allSubcategoryOptions } from "./categories";
import { LISTINGS } from "./fixtures/listings";
import { SELLERS } from "./fixtures/sellers";
import { normalizePhone } from "@/lib/phone";

describe("tehsils", () => {
  it("holds exactly the three official Malakand tehsils", () => {
    expect(TEHSILS.map((t) => t.slug)).toEqual(["batkhela", "dargai", "thana-baizai"]);
  });
  it("gives every tehsil at least one locality", () => {
    for (const t of TEHSILS) expect(t.localities.length).toBeGreaterThan(0);
  });
  it("gives every tehsil and locality an Urdu name", () => {
    for (const t of TEHSILS) {
      expect(t.nameUr.length).toBeGreaterThan(0);
      for (const l of t.localities) expect(l.nameUr.length).toBeGreaterThan(0);
    }
  });
  it("uses unique locality slugs across the district", () => {
    const slugs = ALL_LOCALITIES.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it("offers an all-district option first", () => {
    expect(TEHSIL_OPTIONS[0].value).toBe("all");
    expect(TEHSIL_OPTIONS).toHaveLength(4);
  });
});

describe("categories", () => {
  it("seeds all 26 top-level categories", () => {
    expect(CATEGORIES).toHaveLength(26);
  });
  it("uses unique slugs across every category and subcategory", () => {
    const slugs = CATEGORIES.flatMap((c) => [
      c.slug,
      ...c.subcategories.map((s) => s.slug),
    ]);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it("ends every category with an Other subcategory", () => {
    for (const c of CATEGORIES) {
      expect(c.subcategories.at(-1)!.slug).toMatch(/-other$/);
    }
  });
  it("gives every category an icon and a sort position", () => {
    const sorts = CATEGORIES.map((c) => c.sort);
    expect(sorts).toEqual([...Array(26)].map((_, i) => i + 1));
    for (const c of CATEGORIES) expect(c.icon).toMatch(/^[a-z_]+$/);
  });
  it("flattens every subcategory into combobox options", () => {
    const total = CATEGORIES.reduce((n, c) => n + c.subcategories.length, 0);
    expect(allSubcategoryOptions()).toHaveLength(total);
    expect(total).toBeGreaterThan(400);
  });
});

describe("fixtures", () => {
  it("gives every listing a seller that exists", () => {
    const ids = new Set(SELLERS.map((s) => s.id));
    for (const l of LISTINGS) expect(ids.has(l.sellerId)).toBe(true);
  });
  it("gives every listing a category that exists", () => {
    const slugs = new Set(CATEGORIES.map((c) => c.slug));
    for (const l of LISTINGS) expect(slugs.has(l.categorySlug)).toBe(true);
  });
  it("gives every listing a subcategory that exists within its category", () => {
    for (const l of LISTINGS) {
      const category = CATEGORIES.find((c) => c.slug === l.categorySlug)!;
      const subs = category.subcategories.map((s) => s.slug);
      expect(subs).toContain(l.subcategorySlug);
    }
  });
  it("gives every listing a locality that exists within its tehsil", () => {
    for (const l of LISTINGS) {
      const tehsil = TEHSILS.find((t) => t.slug === l.tehsilSlug)!;
      expect(tehsil.localities.map((x) => x.slug)).toContain(l.localitySlug);
    }
  });
  it("stores every contact phone in E.164", () => {
    for (const l of LISTINGS) expect(normalizePhone(l.contactPhone)).toBe(l.contactPhone);
    for (const s of SELLERS) expect(normalizePhone(s.phone)).toBe(s.phone);
  });
  it("uses unique listing ids and slugs", () => {
    expect(new Set(LISTINGS.map((l) => l.id)).size).toBe(LISTINGS.length);
    expect(new Set(LISTINGS.map((l) => l.slug)).size).toBe(LISTINGS.length);
  });
  it("has enough listings to fill the home shelves and a catalog page", () => {
    expect(LISTINGS.length).toBeGreaterThanOrEqual(21);
  });
  it("includes at least one sold listing so the availability filter has a target", () => {
    expect(LISTINGS.some((l) => l.status === "sold")).toBe(true);
  });
  it("never sets a compare-at price below the asking price", () => {
    for (const l of LISTINGS) {
      if (l.compareAtPrice !== undefined) {
        expect(l.compareAtPrice).toBeGreaterThan(l.price);
      }
    }
  });
});
