import { describe, it, expect } from "vitest";
import { sellersDirectoryQuerySchema, topSellersQuerySchema } from "./sellers-directory";

describe("sellersDirectoryQuerySchema", () => {
  it("defaults sort to rating and limit to 24", () => {
    const result = sellersDirectoryQuerySchema.parse({});
    expect(result.sort).toBe("rating");
    expect(result.limit).toBe(24);
  });

  it("coerces verifiedOnly from a query-string boolean", () => {
    expect(sellersDirectoryQuerySchema.parse({ verifiedOnly: "true" }).verifiedOnly).toBe(true);
    expect(sellersDirectoryQuerySchema.parse({}).verifiedOnly).toBe(false);
  });

  it("rejects an unknown sort value", () => {
    expect(() => sellersDirectoryQuerySchema.parse({ sort: "bogus" })).toThrow();
  });
});

describe("topSellersQuerySchema", () => {
  it("caps limit at 12", () => {
    expect(() => topSellersQuerySchema.parse({ limit: "50" })).toThrow();
  });
});
