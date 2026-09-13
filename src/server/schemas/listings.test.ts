import { describe, expect, it } from "vitest";
import { readQuery } from "../http/validate";
import { searchListingsQuerySchema, suggestListingsQuerySchema } from "./listings";

function queryRequest(qs: string) {
  return new Request(`https://malakandbazaar.pk/api/listings${qs}`);
}

describe("searchListingsQuerySchema", () => {
  it("defaults to an unfiltered, relevance-sorted first page", () => {
    const query = readQuery(queryRequest(""), searchListingsQuerySchema);
    expect(query.q).toBeUndefined();
    expect(query).toMatchObject({
      verifiedOnly: false,
      availability: "active",
      sort: "relevant",
      limit: 24,
    });
  });

  it("collapses a comma-separated tehsil list into an array", () => {
    const query = readQuery(queryRequest("?tehsil=batkhela,dargai"), searchListingsQuerySchema);
    expect(query.tehsil).toEqual(["batkhela", "dargai"]);
  });

  it("collapses a repeated tehsil query key into an array", () => {
    const query = readQuery(queryRequest("?tehsil=batkhela&tehsil=dargai"), searchListingsQuerySchema);
    expect(query.tehsil).toEqual(["batkhela", "dargai"]);
  });

  it("trims a blank q to undefined rather than matching everything literally", () => {
    const query = readQuery(queryRequest("?q=%20%20"), searchListingsQuerySchema);
    expect(query.q).toBeUndefined();
  });

  it("coerces verifiedOnly and numeric price bounds from query strings", () => {
    const query = readQuery(
      queryRequest("?verifiedOnly=true&minPrice=1000&maxPrice=5000"),
      searchListingsQuerySchema
    );
    expect(query.verifiedOnly).toBe(true);
    expect(query.minPrice).toBe(1000);
    expect(query.maxPrice).toBe(5000);
  });

  it("rejects a minPrice greater than maxPrice", () => {
    expect(() => readQuery(queryRequest("?minPrice=5000&maxPrice=1000"), searchListingsQuerySchema)).toThrow();
  });

  it("rejects a sort value outside the known vocabulary", () => {
    expect(() => readQuery(queryRequest("?sort=cheapest"), searchListingsQuerySchema)).toThrow();
  });

  it("caps limit at 60 and page at 100, per the shared pagination schema", () => {
    expect(() => readQuery(queryRequest("?limit=999"), searchListingsQuerySchema)).toThrow();
    expect(() => readQuery(queryRequest("?page=999"), searchListingsQuerySchema)).toThrow();
  });
});

describe("suggestListingsQuerySchema", () => {
  it("requires a non-empty q", () => {
    expect(() => readQuery(queryRequest(""), suggestListingsQuerySchema)).toThrow();
  });

  it("defaults limit to 8 and caps it there", () => {
    const query = readQuery(queryRequest("?q=solar"), suggestListingsQuerySchema);
    expect(query.limit).toBe(8);
    expect(() => readQuery(queryRequest("?q=solar&limit=20"), suggestListingsQuerySchema)).toThrow();
  });
});
