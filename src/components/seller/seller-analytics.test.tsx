import { describe, it, expect, afterEach, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithAuth, mockApi, makeSeller } from "@tests/auth-harness";
import { SellerAnalytics } from "./seller-analytics";

const ANALYTICS_30 = {
  days: 30,
  daily: [{ day: "2026-09-01", views: 5, contacts: 1 }],
  perListing: [{ listingId: "l1", slug: "solar-inverter", title: "Solar Inverter", views: 5, contacts: 1 }],
  totals: { periodViews: 7, periodContacts: 2, storefrontViews: 3, allTimeSellerViews: 10, listingCount: 2 },
};

const ANALYTICS_90 = { ...ANALYTICS_30, days: 90, totals: { ...ANALYTICS_30.totals, periodViews: 40 } };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SellerAnalytics", () => {
  it("shows totals and the per-listing table for the default 30-day range", async () => {
    mockApi({ "GET /api/seller/analytics?days=30": { data: ANALYTICS_30 } });
    renderWithAuth(<SellerAnalytics />, makeSeller());

    expect(await screen.findByText("Solar Inverter")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument(); // periodViews stat tile
  });

  it("refetches with days=90 when that tab is selected", async () => {
    const { callTo } = mockApi({
      "GET /api/seller/analytics?days=30": { data: ANALYTICS_30 },
      "GET /api/seller/analytics?days=90": { data: ANALYTICS_90 },
    });
    renderWithAuth(<SellerAnalytics />, makeSeller());

    await screen.findByText("Solar Inverter");
    await userEvent.click(screen.getByRole("tab", { name: "Last 90 Days" }));

    await screen.findByText("40");
    expect(callTo("GET", "/api/seller/analytics?days=90")).toBeTruthy();
  });

  it("shows an empty state when nothing has any activity", async () => {
    mockApi({
      "GET /api/seller/analytics?days=30": { data: { ...ANALYTICS_30, perListing: [] } },
    });
    renderWithAuth(<SellerAnalytics />, makeSeller());

    expect(await screen.findByText("No activity yet")).toBeInTheDocument();
  });
});
