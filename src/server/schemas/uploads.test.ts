import { describe, expect, it } from "vitest";
import { commitUploadSchema, MAX_UPLOAD_BYTES, signUploadSchema } from "./uploads";

const validSign = { kind: "listing" as const, contentType: "image/jpeg" as const, size: 1024 };

describe("signUploadSchema", () => {
  it("accepts a well-formed request", () => {
    expect(signUploadSchema.parse(validSign)).toEqual(validSign);
  });

  it("rejects a content type outside the four allowed formats", () => {
    expect(() => signUploadSchema.parse({ ...validSign, contentType: "image/gif" })).toThrow();
  });

  it("rejects a size over 5 MB", () => {
    expect(() => signUploadSchema.parse({ ...validSign, size: MAX_UPLOAD_BYTES + 1 })).toThrow(
      "5 MB"
    );
  });

  it("rejects a zero or negative size", () => {
    expect(() => signUploadSchema.parse({ ...validSign, size: 0 })).toThrow();
    expect(() => signUploadSchema.parse({ ...validSign, size: -100 })).toThrow();
  });

  it("rejects an unknown kind", () => {
    expect(() => signUploadSchema.parse({ ...validSign, kind: "profile" })).toThrow();
  });
});

describe("commitUploadSchema", () => {
  it("accepts a path with no listingId — the new-listing draft path", () => {
    const parsed = commitUploadSchema.parse({ path: "sellers/s1/listing/abc.jpg" });
    expect(parsed.listingId).toBeUndefined();
  });

  it("accepts a path with a listingId — the existing-listing attach path", () => {
    const parsed = commitUploadSchema.parse({
      path: "sellers/s1/listing/abc.jpg",
      listingId: "00000000-0000-4000-8000-000000000000",
    });
    expect(parsed.listingId).toBe("00000000-0000-4000-8000-000000000000");
  });

  it("rejects a non-uuid listingId", () => {
    expect(() => commitUploadSchema.parse({ path: "x.jpg", listingId: "not-a-uuid" })).toThrow();
  });
});
