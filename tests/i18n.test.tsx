import { describe, it, expect } from "vitest";
import { routing, dirForLocale } from "@/i18n/routing";

describe("i18n routing", () => {
  it("supports English and Urdu with English as default", () => {
    expect(routing.locales).toEqual(["en", "ur"]);
    expect(routing.defaultLocale).toBe("en");
  });

  it("renders Urdu right-to-left and English left-to-right", () => {
    expect(dirForLocale("ur")).toBe("rtl");
    expect(dirForLocale("en")).toBe("ltr");
  });
});
