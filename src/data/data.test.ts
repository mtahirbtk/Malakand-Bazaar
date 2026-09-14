import { describe, it, expect } from "vitest";
import { TEHSILS, TEHSIL_OPTIONS, ALL_LOCALITIES } from "./tehsils";
import { CATEGORIES, allSubcategoryOptions } from "./categories";

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
