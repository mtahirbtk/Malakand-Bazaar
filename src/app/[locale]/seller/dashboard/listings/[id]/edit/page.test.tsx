import * as React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithAuth, mockApi, makeSeller } from "@tests/auth-harness";
import EditListingPage from "./page";

const pushMock = vi.fn();
const notFoundMock = vi.fn();
vi.mock("@/i18n/routing", async () => {
  const actual = await vi.importActual<typeof import("@/i18n/routing")>("@/i18n/routing");
  return { ...actual, useRouter: () => ({ push: pushMock, replace: pushMock }) };
});
vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return { ...actual, notFound: () => notFoundMock() };
});

const OWNED_LISTING = {
  id: "l_owned",
  title: "Owned Listing",
  description: "Mine, and it says so right here.",
  price: 5000,
  categorySlug: "electronics",
  subcategorySlug: "electronics-generators",
  tehsilSlug: "batkhela",
  localitySlug: "batkhela-city",
  contactPhone: "+923001234567",
  imageDetails: [],
};

async function renderPage(id: string) {
  // EditListingPage unwraps its `params` promise with React.use(), which
  // suspends until the promise settles — even one already created via
  // Promise.resolve() isn't synchronously "settled" from React's
  // perspective, so a Suspense boundary is required here the same way the
  // App Router provides one around every page in production. The render
  // call itself is additionally wrapped in `act` because with the installed
  // React 19 / Testing Library versions, the microtask that settles an
  // already-resolved promise inside React's Suspense retry never flushes to
  // the DOM otherwise — jsdom has no browser event loop driving it forward.
  await act(async () => {
    renderWithAuth(
      <React.Suspense fallback={null}>
        <EditListingPage params={Promise.resolve({ id })} />
      </React.Suspense>,
      makeSeller({ sellerId: "s1" })
    );
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  pushMock.mockClear();
  notFoundMock.mockClear();
});

describe("EditListingPage", () => {
  it("loads and saves changes to the seller's own listing", async () => {
    mockApi({
      "GET /api/seller/listings/l_owned": { data: { listing: OWNED_LISTING } },
      "PATCH /api/seller/listings/l_owned": { data: { listing: { ...OWNED_LISTING, title: "Renamed Listing" } } },
    });
    await renderPage("l_owned");

    const titleInput = await screen.findByDisplayValue("Owned Listing");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Renamed Listing");
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await vi.waitFor(() => expect(pushMock).toHaveBeenCalledWith("/seller/dashboard/listings"));
  });

  it("calls notFound for a listing belonging to a different seller", async () => {
    mockApi({
      "GET /api/seller/listings/l_owned": {
        status: 404,
        error: { code: "NOT_FOUND", message: "That listing could not be found." },
      },
    });
    await renderPage("l_owned");
    await vi.waitFor(() => expect(notFoundMock).toHaveBeenCalled());
  });
});
