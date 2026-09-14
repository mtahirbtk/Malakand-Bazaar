import { describe, it, expect, vi, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithAuth, mockApi, makeSeller } from "@tests/auth-harness";
import NewListingPage from "./page";

const pushMock = vi.fn();
vi.mock("@/i18n/routing", async () => {
  const actual = await vi.importActual<typeof import("@/i18n/routing")>("@/i18n/routing");
  return { ...actual, useRouter: () => ({ push: pushMock, replace: pushMock }) };
});

afterEach(() => {
  vi.unstubAllGlobals();
  pushMock.mockClear();
});

const SELLER_ME = { "GET /api/seller/me": { data: { seller: { phone: "+923001234567" } } } };

describe("NewListingPage", () => {
  it("creates a listing for the signed-in seller and redirects to the listings tab", async () => {
    const { callTo } = mockApi({
      ...SELLER_ME,
      "POST /api/seller/listings": { data: { listing: { id: "l_new" } }, status: 201 },
    });
    renderWithAuth(<NewListingPage />, makeSeller({ sellerId: "s1" }));

    await userEvent.type(screen.getByLabelText("Title"), "Second Hand Bicycle");
    await userEvent.type(screen.getByLabelText("Description"), "Lightly used, well maintained.");
    await userEvent.type(screen.getByLabelText("Price (PKR)"), "15000");
    await userEvent.clear(screen.getByLabelText("Contact Number"));
    await userEvent.type(screen.getByLabelText("Contact Number"), "3001234567");
    await userEvent.click(screen.getByRole("button", { name: "Publish Listing" }));

    await vi.waitFor(() => expect(pushMock).toHaveBeenCalledWith("/seller/dashboard/listings"));
    expect(callTo("POST", "/api/seller/listings")?.body).toMatchObject({ title: "Second Hand Bicycle", price: 15000 });
  });

  it("shows the server's field error against the right field", async () => {
    mockApi({
      ...SELLER_ME,
      "POST /api/seller/listings": {
        status: 400,
        error: {
          code: "VALIDATION_FAILED",
          message: "Some of the details need fixing.",
          fields: { title: "Must be at least 4 characters." },
        },
      },
    });
    renderWithAuth(<NewListingPage />, makeSeller({ sellerId: "s1" }));

    await userEvent.type(screen.getByLabelText("Price (PKR)"), "15000");
    await userEvent.click(screen.getByRole("button", { name: "Publish Listing" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Must be at least 4 characters.");
    expect(pushMock).not.toHaveBeenCalled();
  });
});
