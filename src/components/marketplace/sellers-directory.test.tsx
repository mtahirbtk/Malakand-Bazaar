import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { SellersDirectory } from "./sellers-directory";
import type { SellersDirectoryQuery } from "@/server/schemas/sellers-directory";
import type { Seller } from "@/types";

// jsdom has no real Next.js App Router mounted — mock the navigation hooks
// the same way client-search.test.tsx does.
const pushMock = vi.fn();
vi.mock("@/i18n/routing", async () => {
  const actual = await vi.importActual<typeof import("@/i18n/routing")>("@/i18n/routing");
  return {
    ...actual,
    useRouter: () => ({ push: pushMock, replace: pushMock }),
    usePathname: () => "/sellers",
  };
});

const SELLER: Seller = {
  id: "s1",
  slug: "khan-solar",
  name: "Khan Solar",
  initials: "KS",
  tehsilSlug: "batkhela",
  localityLabel: "Batkhela City",
  rating: 4.8,
  reviewCount: 20,
  verified: true,
  responseMinutes: 10,
  phone: "+923001234567",
};

function baseQuery(overrides: Partial<SellersDirectoryQuery> = {}): SellersDirectoryQuery {
  return {
    q: undefined,
    tehsil: undefined,
    category: undefined,
    verifiedOnly: false,
    sort: "rating",
    limit: 24,
    cursor: undefined,
    page: undefined,
    ...overrides,
  };
}

function renderDirectory(
  items: Seller[] = [SELLER],
  total = 1,
  query: SellersDirectoryQuery = baseQuery()
) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SellersDirectory query={query} result={{ items, total }} />
    </NextIntlClientProvider>
  );
}

describe("SellersDirectory", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it("renders a seller card for each result", () => {
    renderDirectory();
    expect(screen.getByText("Khan Solar")).toBeInTheDocument();
  });

  it("shows the empty state when there are no results", () => {
    renderDirectory([], 0);
    expect(screen.getByText("No sellers match your filters")).toBeInTheDocument();
  });

  it("submitting the search box navigates with a q param", async () => {
    renderDirectory();
    const input = screen.getByRole("searchbox", { name: "Search sellers by name..." });
    await userEvent.type(input, "Khan{enter}");
    expect(pushMock).toHaveBeenCalledWith("/sellers?q=Khan", { scroll: false });
  });

  it("toggling verified-only navigates with verifiedOnly=true", async () => {
    renderDirectory();
    await userEvent.click(screen.getByText("Verified only"));
    expect(pushMock).toHaveBeenCalledWith("/sellers?verifiedOnly=true", { scroll: false });
  });

  it("changing the sort navigates with the chosen sort", async () => {
    renderDirectory();
    await userEvent.click(screen.getByRole("combobox", { name: "Sort sellers by" }));
    await userEvent.click(screen.getByRole("option", { name: "Newest" }));
    expect(pushMock).toHaveBeenCalledWith("/sellers?sort=newest", { scroll: false });
  });

  it("does not render pagination when there is only one page", () => {
    renderDirectory([SELLER], 1);
    expect(screen.queryByRole("navigation")).toBeNull();
  });

  it("changing the page navigates with a page param", async () => {
    const items = [SELLER];
    renderDirectory(items, 50, baseQuery());
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(pushMock).toHaveBeenCalledWith("/sellers?page=2", { scroll: false });
  });

  it("preserves an incoming tehsil/category filter across a new search", async () => {
    renderDirectory([SELLER], 1, baseQuery({ tehsil: "batkhela", category: "electronics" }));
    const input = screen.getByRole("searchbox", { name: "Search sellers by name..." });
    await userEvent.type(input, "Khan{enter}");
    expect(pushMock).toHaveBeenCalledWith("/sellers?tehsil=batkhela&category=electronics&q=Khan", { scroll: false });
  });
});
