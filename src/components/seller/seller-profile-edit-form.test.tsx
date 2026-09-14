import { describe, it, expect, vi, afterEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithAuth, mockApi, makeSeller } from "@tests/auth-harness";
import { SellerProfileEditForm } from "./seller-profile-edit-form";

vi.mock("leaflet/dist/leaflet.css", () => ({}));
vi.mock("leaflet/dist/images/marker-icon-2x.png", () => ({ default: { src: "" } }));
vi.mock("leaflet/dist/images/marker-icon.png", () => ({ default: { src: "" } }));
vi.mock("leaflet/dist/images/marker-shadow.png", () => ({ default: { src: "" } }));
vi.mock("leaflet", () => ({ default: { icon: () => ({}) } }));
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TileLayer: () => null,
  useMapEvents: () => null,
  Marker: () => null,
}));

const SELLER = {
  id: "s_edit1",
  slug: "edit-store",
  name: "Edit Store",
  description: "Original bio.",
  phone: "+923001234567",
  tehsilSlug: "batkhela",
  localitySlug: "batkhela-city",
  localityLabel: "Batkhela City & Bazaar",
  coordinates: { lat: 34.5667, lng: 71.9333 },
  verified: false,
  ratingAvg: 0,
  ratingCount: 0,
  listingCount: 0,
  avatarPath: null,
  bannerPath: null,
  avatarUrl: null,
  bannerUrl: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SellerProfileEditForm", () => {
  it("shows a Pending Verification badge for an unverified seller", async () => {
    mockApi({ "GET /api/seller/me": { data: { seller: SELLER } } });
    renderWithAuth(<SellerProfileEditForm />, makeSeller());
    expect(await screen.findByText("Pending Verification")).toBeInTheDocument();
  });

  it("saves an edited store name back to the seller record", async () => {
    const { callTo } = mockApi({
      "GET /api/seller/me": { data: { seller: SELLER } },
      "PATCH /api/seller/me": { data: { seller: { ...SELLER, name: "Renamed Store" } } },
    });
    renderWithAuth(<SellerProfileEditForm />, makeSeller());

    const nameInput = await screen.findByDisplayValue("Edit Store");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Renamed Store");
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByText("Storefront updated.")).toBeInTheDocument();
    expect(callTo("PATCH", "/api/seller/me")?.body).toMatchObject({ storeName: "Renamed Store" });
  });
});
