import { describe, it, expect } from "vitest";
import { clampCropToImage } from "./crop-image";

describe("clampCropToImage", () => {
  it("leaves a crop that already fits untouched", () => {
    expect(clampCropToImage({ x: 10, y: 20, width: 100, height: 50 }, 400, 300)).toEqual({
      x: 10,
      y: 20,
      width: 100,
      height: 50,
    });
  });

  it("pulls a crop box back inside the image when it hangs off the right/bottom edge", () => {
    expect(clampCropToImage({ x: 380, y: 290, width: 100, height: 50 }, 400, 300)).toEqual({
      x: 300,
      y: 250,
      width: 100,
      height: 50,
    });
  });

  it("pulls a crop box back inside the image when x/y are negative", () => {
    expect(clampCropToImage({ x: -20, y: -5, width: 100, height: 50 }, 400, 300)).toEqual({
      x: 0,
      y: 0,
      width: 100,
      height: 50,
    });
  });

  it("shrinks a crop box larger than the image itself instead of overrunning it", () => {
    expect(clampCropToImage({ x: 0, y: 0, width: 500, height: 400 }, 400, 300)).toEqual({
      x: 0,
      y: 0,
      width: 400,
      height: 300,
    });
  });
});
