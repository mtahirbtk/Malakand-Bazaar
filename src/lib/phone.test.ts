import { describe, it, expect } from "vitest";
import { normalizePhone, formatPhoneDisplay } from "./phone";
import { whatsappUrl } from "./whatsapp";

describe("normalizePhone", () => {
  it("accepts a bare 10-digit mobile number", () => {
    expect(normalizePhone("3001234567")).toBe("+923001234567");
  });
  it("strips a leading zero", () => {
    expect(normalizePhone("03001234567")).toBe("+923001234567");
  });
  it("strips dashes and spaces", () => {
    expect(normalizePhone("0300-123 4567")).toBe("+923001234567");
  });
  it("accepts an already-prefixed number", () => {
    expect(normalizePhone("+923001234567")).toBe("+923001234567");
  });
  it("accepts a 92-prefixed number without plus", () => {
    expect(normalizePhone("923001234567")).toBe("+923001234567");
  });
  it("rejects a number that is too short", () => {
    expect(normalizePhone("30012345")).toBeNull();
  });
  it("rejects a number not starting with 3", () => {
    expect(normalizePhone("9451234567")).toBeNull();
  });
  it("rejects letters", () => {
    expect(normalizePhone("abcdefghij")).toBeNull();
  });
});

describe("formatPhoneDisplay", () => {
  it("groups an E.164 number for reading", () => {
    expect(formatPhoneDisplay("+923001234567")).toBe("+92 300 1234567");
  });
});

describe("whatsappUrl", () => {
  it("builds a wa.me link with no plus and an encoded message", () => {
    expect(whatsappUrl("+923001234567", "Interested in Solar Inverter")).toBe(
      "https://wa.me/923001234567?text=Interested%20in%20Solar%20Inverter"
    );
  });
});
