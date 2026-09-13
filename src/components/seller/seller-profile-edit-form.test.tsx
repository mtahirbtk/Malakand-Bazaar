import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { AuthProvider, type AuthUser } from "@/lib/auth/auth-context";
import { makeSeller } from "@tests/auth-harness";
import { saveSeller } from "@/lib/mock-db/sellers";
import { SellerProfileEditForm } from "./seller-profile-edit-form";
import type { Seller } from "@/types";

let signedIn: AuthUser | null = null;

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

const SELLER: Seller = {
  id: "s_edit1",
  slug: "edit-store",
  name: "Edit Store",
  initials: "ES",
  tehsilSlug: "batkhela",
  localityLabel: "Batkhela City & Bazaar",
  rating: 0,
  reviewCount: 0,
  verified: false,
  responseMinutes: 30,
  specialty: "General goods",
  statLabel: "Listings",
  statValue: "0",
  phone: "+923001234567",
  description: "Original bio.",
};

/** Seeds the auth context the way the server would, rather than faking cookies. */
function seedSignedInSeller() {
  signedIn = makeSeller({ sellerId: "s_edit1" });
  saveSeller(SELLER);
}

function renderForm() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AuthProvider initialUser={signedIn}>
        <SellerProfileEditForm />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}

describe("SellerProfileEditForm", () => {
  beforeEach(() => {
    window.localStorage.clear();
    signedIn = null;
  });

  it("shows a Pending Verification badge for an unverified seller", async () => {
    seedSignedInSeller();
    renderForm();
    expect(await screen.findByText("Pending Verification")).toBeInTheDocument();
  });

  it("saves an edited store name back to the seller record", async () => {
    seedSignedInSeller();
    renderForm();
    const nameInput = await screen.findByDisplayValue("Edit Store");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Renamed Store");
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(await screen.findByText("Storefront updated.")).toBeInTheDocument();
  });
});
