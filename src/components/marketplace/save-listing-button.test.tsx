import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithAuth, mockApi, makeUser } from "@tests/auth-harness";
import { SaveListingButton } from "./save-listing-button";

describe("SaveListingButton", () => {
  it("renders nothing for a signed-out visitor", () => {
    renderWithAuth(<SaveListingButton listingId="l1" />, null);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("saves a listing on click", async () => {
    const { calls } = mockApi({ "POST /api/me/favorites": { data: { saved: true }, status: 201 } });
    renderWithAuth(<SaveListingButton listingId="l1" />, makeUser());
    await userEvent.click(screen.getByRole("button", { name: "Save listing" }));
    expect(await screen.findByRole("button", { name: "Remove from saved" })).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST" && c.path === "/api/me/favorites")).toBe(true);
  });

  it("unsaves a listing on second click, reverting optimistic state on failure", async () => {
    const { calls } = mockApi({
      "POST /api/me/favorites": { data: { saved: true }, status: 201 },
      "DELETE /api/me/favorites/l1": { error: { code: "INTERNAL", message: "Could not remove this listing. Please try again." }, status: 500 },
    });
    renderWithAuth(<SaveListingButton listingId="l1" />, makeUser());

    await userEvent.click(screen.getByRole("button", { name: "Save listing" }));
    await screen.findByRole("button", { name: "Remove from saved" });

    await userEvent.click(screen.getByRole("button", { name: "Remove from saved" }));
    // The DELETE failed, so the optimistic unsave is reverted back to saved.
    expect(await screen.findByRole("button", { name: "Remove from saved" })).toBeInTheDocument();
    expect(calls.some((c) => c.method === "DELETE" && c.path === "/api/me/favorites/l1")).toBe(true);
  });
});
