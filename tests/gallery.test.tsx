import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const UI_DIR = path.resolve(__dirname, "../src/components/ui");
const GALLERY = path.resolve(__dirname, "../src/app/[locale]/dev/ui/page.tsx");

describe("component gallery", () => {
  it("references every component in the ui kit", () => {
    const gallery = readFileSync(GALLERY, "utf8");
    const missing = readdirSync(UI_DIR)
      .filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx"))
      .map((f) => f.replace(/\.tsx$/, ""))
      .filter((name) => !gallery.includes(`/ui/${name}`));
    expect(missing).toEqual([]);
  });
});
