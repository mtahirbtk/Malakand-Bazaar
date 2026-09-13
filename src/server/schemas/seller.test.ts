import { describe, expect, it } from "vitest";
import { readJson, readQuery } from "../http/validate";
import {
  createListingSchema,
  reorderImagesSchema,
  sellerAnalyticsQuerySchema,
  sellerListingsQuerySchema,
  updateListingSchema,
  updateListingStatusSchema,
  updateSellerSchema,
} from "./seller";

function jsonRequest(body: unknown) {
  return new Request("https://malakandbazaar.pk/api/seller/listings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function queryRequest(qs: string) {
  return new Request(`https://malakandbazaar.pk/api/seller/listings${qs}`);
}

const validListing = {
  title: "Solar inverter, 5kW hybrid",
  description: "Barely used hybrid inverter, all accessories included.",
  price: 85000,
  categorySlug: "electronics",
  tehsilSlug: "batkhela",
  localitySlug: "batkhela-bazaar",
  contactPhone: "03001234567",
};

describe("updateSellerSchema", () => {
  it("rejects an empty patch", () => {
    expect(() => updateSellerSchema.parse({})).toThrow("Nothing to update.");
  });

  it("silently drops a slug field — the client never gets to set it", () => {
    const parsed = updateSellerSchema.parse({ storeName: "New Name", slug: "hacked-slug" });
    expect(parsed).not.toHaveProperty("slug");
    expect(parsed.storeName).toBe("New Name");
  });

  it("requires a locality when the tehsil changes", () => {
    expect(() => updateSellerSchema.parse({ tehsilSlug: "dargai" })).toThrow(
      "Choose a market or area for the new tehsil."
    );
  });

  it("accepts clearing a photo with an empty string", () => {
    const parsed = updateSellerSchema.parse({ avatarPath: "" });
    expect(parsed.avatarPath).toBe("");
  });
});

describe("createListingSchema", () => {
  it("accepts a well-formed listing and normalises the phone", () => {
    const parsed = createListingSchema.parse(validListing);
    expect(parsed.contactPhone).toBe("+923001234567");
    expect(parsed.images).toEqual([]);
  });

  it("rejects a title shorter than 4 characters, matching the DB check constraint", () => {
    expect(() => createListingSchema.parse({ ...validListing, title: "Hi" })).toThrow();
  });

  it("rejects a compareAtPrice that is not higher than price", () => {
    expect(() => createListingSchema.parse({ ...validListing, price: 100, compareAtPrice: 100 })).toThrow(
      "The original price must be higher than the asking price."
    );
  });

  it("caps images at 12, matching listing_images_sort_chk", () => {
    const images = Array.from({ length: 13 }, (_, i) => `sellers/s1/listing/${i}.jpg`);
    expect(() => createListingSchema.parse({ ...validListing, images })).toThrow();
  });

  it("reads a well-formed create request through readJson", async () => {
    const parsed = await readJson(jsonRequest(validListing), createListingSchema);
    expect(parsed.title).toBe(validListing.title);
  });
});

describe("updateListingSchema", () => {
  it("rejects an empty patch", () => {
    expect(() => updateListingSchema.parse({})).toThrow("Nothing to update.");
  });

  it("accepts a single-field patch", () => {
    const parsed = updateListingSchema.parse({ price: 90000 });
    expect(parsed.price).toBe(90000);
  });

  it("rejects a compareAtPrice below the new price even when price is also patched", () => {
    expect(() => updateListingSchema.parse({ price: 100, compareAtPrice: 50 })).toThrow(
      "The original price must be higher than the asking price."
    );
  });

  it("allows clearing compareAtPrice with null", () => {
    const parsed = updateListingSchema.parse({ compareAtPrice: null });
    expect(parsed.compareAtPrice).toBeNull();
  });
});

describe("updateListingStatusSchema", () => {
  it("accepts each of the four statuses", () => {
    for (const status of ["active", "reserved", "sold", "removed"]) {
      expect(updateListingStatusSchema.parse({ status }).status).toBe(status);
    }
  });

  it("rejects an unknown status", () => {
    expect(() => updateListingStatusSchema.parse({ status: "pending" })).toThrow();
  });
});

describe("reorderImagesSchema", () => {
  it("requires at least one id", () => {
    expect(() => reorderImagesSchema.parse({ ids: [] })).toThrow();
  });

  it("caps at 12 ids, matching the max photos per listing", () => {
    const ids = Array.from({ length: 13 }, () => "00000000-0000-4000-8000-000000000000");
    expect(() => reorderImagesSchema.parse({ ids })).toThrow();
  });

  it("rejects a non-uuid id", () => {
    expect(() => reorderImagesSchema.parse({ ids: ["not-a-uuid"] })).toThrow();
  });
});

describe("sellerListingsQuerySchema", () => {
  it("defaults to newest-first, unfiltered", () => {
    const query = readQuery(queryRequest(""), sellerListingsQuerySchema);
    expect(query.sort).toBe("newest");
    expect(query.status).toBeUndefined();
  });

  it("accepts a status filter", () => {
    const query = readQuery(queryRequest("?status=sold"), sellerListingsQuerySchema);
    expect(query.status).toBe("sold");
  });

  it("rejects a status outside the known vocabulary", () => {
    expect(() => readQuery(queryRequest("?status=archived"), sellerListingsQuerySchema)).toThrow();
  });
});

describe("sellerAnalyticsQuerySchema", () => {
  it("defaults to 30 days", () => {
    const query = readQuery(queryRequest(""), sellerAnalyticsQuerySchema);
    expect(query.days).toBe(30);
  });

  it("accepts 90 and rejects anything else", () => {
    expect(readQuery(queryRequest("?days=90"), sellerAnalyticsQuerySchema).days).toBe(90);
    expect(() => readQuery(queryRequest("?days=60"), sellerAnalyticsQuerySchema)).toThrow();
  });
});
