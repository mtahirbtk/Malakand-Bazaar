import { describe, it, expect, beforeEach } from "vitest";
import { readStore, writeStore, makeId } from "./store";

describe("mock-db store", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns the fallback when nothing is stored", () => {
    expect(readStore("mb.users", [] as unknown[])).toEqual([]);
  });

  it("round-trips a value through localStorage", () => {
    writeStore("mb.session", "user_123");
    expect(readStore("mb.session", null)).toBe("user_123");
  });

  it("returns the fallback for corrupt JSON instead of throwing", () => {
    window.localStorage.setItem("mb.session", "{not json");
    expect(readStore("mb.session", null)).toBeNull();
  });

  it("generates ids that are unique and prefixed", () => {
    const a = makeId("u");
    const b = makeId("u");
    expect(a).not.toBe(b);
    expect(a.startsWith("u_")).toBe(true);
  });
});
