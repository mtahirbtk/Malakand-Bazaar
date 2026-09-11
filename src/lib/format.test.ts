import { describe, it, expect } from "vitest";
import { formatPkr } from "./format";

describe("formatPkr", () => {
  it("formats with thousands separators and a PKR prefix", () => {
    expect(formatPkr(240000)).toBe("PKR 240,000");
  });
  it("formats millions", () => {
    expect(formatPkr(5800000)).toBe("PKR 5,800,000");
  });
  it("formats zero", () => {
    expect(formatPkr(0)).toBe("PKR 0");
  });
  it("drops decimals", () => {
    expect(formatPkr(1999.6)).toBe("PKR 2,000");
  });
});
