import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { ClientSearch } from "./client-search";
import type { SearchListingsQuery } from "@/server/schemas/listings";
import type { SearchListingsResult } from "@/server/services/listings";
import type { Listing } from "@/types";

// jsdom has no real Next.js App Router mounted — mock the navigation hooks
// the same way sign-in-form.test.tsx does.
const pushMock = vi.fn();
vi.mock("@/i18n/routing", async () => {
  const actual = await vi.importActual<typeof import("@/i18n/routing")>("@/i18n/routing");
  return {
    ...actual,
    useRouter: () => ({ push: pushMock, replace: pushMock }),
    usePathname: () => "/search",
  };
});

function makeListing(overrides: Partial<Listing>): Listing {
  return {
    id: "id-1",
    slug: "listing-1",
    title: "Listing One",
    description: "A test listing.",
    price: 1000,
    categorySlug: "vehicles",
    subcategorySlug: "vehicles-cars",
    tehsilSlug: "batkhela",
    localitySlug: "",
    localityLabel: "Batkhela",
    images: [],
    contactPhone: "+923001234567",
    sellerId: "seller-1",
    status: "active",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function baseQuery(overrides: Partial<SearchListingsQuery> = {}): SearchListingsQuery {
  return {
    q: undefined,
    category: undefined,
    subcategory: undefined,
    tehsil: undefined,
    locality: undefined,
    minPrice: undefined,
    maxPrice: undefined,
    verifiedOnly: false,
    availability: "active",
    sellerId: undefined,
    sort: "relevant",
    limit: 24,
    cursor: undefined,
    page: 1,
    ...overrides,
  };
}

function baseResult(items: Listing[], overrides: Partial<SearchListingsResult> = {}): SearchListingsResult {
  return {
    items,
    total: items.length,
    page: 1,
    limit: 24,
    facets: { category: {}, tehsil: {}, minPrice: null, maxPrice: null },
    ...overrides,
  };
}

function renderSearch(query: SearchListingsQuery, result: SearchListingsResult) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ClientSearch query={query} result={result} />
    </NextIntlClientProvider>
  );
}

describe("ClientSearch", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it("shows the server-computed total in the matches badge", () => {
    const items = [makeListing({ id: "1", slug: "a" }), makeListing({ id: "2", slug: "b" })];
    renderSearch(baseQuery(), baseResult(items, { total: 2 }));
    expect(screen.getByText("2 matches")).toBeInTheDocument();
  });

  it("shows the active category chip from the query", () => {
    const items = [makeListing({ id: "1", slug: "a" })];
    renderSearch(baseQuery({ category: "vehicles" }), baseResult(items));
    expect(screen.getByText(/Category: Vehicles/)).toBeInTheDocument();
  });

  it("submitting the inline search box navigates with a q param", async () => {
    renderSearch(baseQuery(), baseResult([]));
    const input = screen.getByRole("searchbox", { name: "Search" });
    await userEvent.type(input, "honey{enter}");
    expect(pushMock).toHaveBeenCalledWith("/search?q=honey", { scroll: false });
  });

  it("removing an active filter chip navigates without that filter", async () => {
    const items = [makeListing({ id: "1", slug: "a" })];
    renderSearch(baseQuery({ category: "vehicles" }), baseResult(items));
    await userEvent.click(screen.getByRole("button", { name: /Remove Category: Vehicles/ }));
    expect(pushMock).toHaveBeenCalledWith("/search", { scroll: false });
  });

  it("shows the empty state when the server returns no items", () => {
    renderSearch(baseQuery({ q: "nonexistent" }), baseResult([]));
    expect(screen.getByText("No listings match your filters")).toBeInTheDocument();
  });

  it("clearing all filters from the empty state resets the URL", async () => {
    renderSearch(baseQuery({ q: "nonexistent" }), baseResult([]));
    await userEvent.click(screen.getByRole("button", { name: "Clear all filters" }));
    expect(pushMock).toHaveBeenLastCalledWith("/search", { scroll: false });
  });

  it("changing the page navigates with a page param", async () => {
    const items = [makeListing({ id: "1", slug: "a" })];
    renderSearch(baseQuery(), baseResult(items, { total: 50, limit: 24, page: 1 }));
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(pushMock).toHaveBeenCalledWith("/search?page=2", { scroll: false });
  });
});
