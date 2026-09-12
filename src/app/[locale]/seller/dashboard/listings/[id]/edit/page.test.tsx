import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { AuthProvider } from "@/lib/mock-db/auth-context";
import { saveListing, getListingByIdOverlay } from "@/lib/mock-db/listings";
import EditListingPage from "./page";
import type { Listing } from "@/types";

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

const OWNED_LISTING: Listing = {
  id: "l_owned",
  slug: "owned-listing",
  title: "Owned Listing",
  description: "Mine.",
  price: 5000,
  categorySlug: "electronics",
  subcategorySlug: "electronics-generators",
  tehsilSlug: "batkhela",
  localitySlug: "batkhela-city",
  localityLabel: "Batkhela City & Bazaar",
  images: [],
  contactPhone: "+923001234567",
  sellerId: "s1",
  status: "active",
  createdAt: "2026-09-12T00:00:00.000Z",
};

function seedSignedInSeller(sellerId: string) {
  window.localStorage.setItem(
    "mb.users",
    JSON.stringify([{ id: "u1", phone: "+923001234567", password: "password1", role: "seller", displayName: "Store", sellerId }])
  );
  window.localStorage.setItem("mb.session", JSON.stringify("u1"));
}

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
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <AuthProvider>
          <React.Suspense fallback={null}>
            <EditListingPage params={Promise.resolve({ id })} />
          </React.Suspense>
        </AuthProvider>
      </NextIntlClientProvider>
    );
  });
}

describe("EditListingPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    pushMock.mockClear();
    notFoundMock.mockClear();
  });

  it("loads and saves changes to the seller's own listing", async () => {
    saveListing(OWNED_LISTING);
    seedSignedInSeller("s1");
    await renderPage("l_owned");
    const titleInput = await screen.findByDisplayValue("Owned Listing");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Renamed Listing");
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(pushMock).toHaveBeenCalledWith("/seller/dashboard/listings");
    expect(getListingByIdOverlay("l_owned")?.title).toBe("Renamed Listing");
  });

  it("calls notFound for a listing belonging to a different seller", async () => {
    saveListing(OWNED_LISTING);
    seedSignedInSeller("s_someone_else");
    await renderPage("l_owned");
    await vi.waitFor(() => expect(notFoundMock).toHaveBeenCalled());
  });
});
