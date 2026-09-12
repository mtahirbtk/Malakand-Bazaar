import { describe, it, expect, beforeEach } from "vitest";
import {
  saveSeller,
  getSellerBySlugOverlay,
  getSellerByIdOverlay,
  generateSellerSlug,
  initialsFrom,
  applyProfileFields,
} from "./sellers";
import { SELLERS } from "@/data/fixtures/sellers";
import type { Seller } from "@/types";

const NEW_SELLER: Seller = {
  id: "s_new1",
  slug: "green-valley-traders",
  name: "Green Valley Traders",
  initials: "GV",
  tehsilSlug: "batkhela",
  localityLabel: "Batkhela City & Bazaar",
  rating: 0,
  reviewCount: 0,
  verified: false,
  responseMinutes: 30,
  specialty: "General goods",
  statLabel: "Listings",
  statValue: "0",
  phone: "+923001234567",
};

describe("mock-db sellers", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("finds an existing fixture seller by slug", () => {
    expect(getSellerBySlugOverlay(SELLERS[0].slug)?.id).toBe(SELLERS[0].id);
  });

  it("returns undefined for an unknown slug", () => {
    expect(getSellerBySlugOverlay("no-such-store")).toBeUndefined();
  });

  it("saves and finds a runtime-created seller by slug and id", () => {
    saveSeller(NEW_SELLER);
    expect(getSellerBySlugOverlay("green-valley-traders")?.id).toBe("s_new1");
    expect(getSellerByIdOverlay("s_new1")?.name).toBe("Green Valley Traders");
  });

  it("updates in place on a second save with the same id", () => {
    saveSeller(NEW_SELLER);
    saveSeller({ ...NEW_SELLER, name: "Green Valley Traders Co." });
    expect(getSellerByIdOverlay("s_new1")?.name).toBe("Green Valley Traders Co.");
  });

  it("generates a unique slug, appending a number on collision", () => {
    expect(generateSellerSlug("Brand New Store")).toBe("brand-new-store");
    saveSeller({ ...NEW_SELLER, id: "s_new2", slug: "brand-new-store" });
    expect(generateSellerSlug("Brand New Store")).toBe("brand-new-store-2");
  });

  it("derives initials from a store name", () => {
    expect(initialsFrom("Green Valley Traders")).toBe("GT");
    expect(initialsFrom("Solo")).toBe("S");
  });

  it("applies a profile fields patch onto an existing seller, preserving id/slug/rating", () => {
    saveSeller(NEW_SELLER);
    const updated = applyProfileFields(NEW_SELLER, {
      storeName: "Green Valley Traders Co.",
      description: "Updated bio.",
      storePhone: "+923001112222",
      tehsilSlug: "dargai",
      localityLabel: "Dargai City Market",
      coordinates: { lat: 34.5, lng: 71.9 },
      avatarUrl: "blob:avatar",
      storefrontBanner: undefined,
    });
    expect(updated.id).toBe(NEW_SELLER.id);
    expect(updated.slug).toBe(NEW_SELLER.slug);
    expect(updated.rating).toBe(NEW_SELLER.rating);
    expect(updated.name).toBe("Green Valley Traders Co.");
    expect(updated.initials).toBe("GT");
    expect(updated.tehsilSlug).toBe("dargai");
  });
});
