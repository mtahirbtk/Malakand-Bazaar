// src/components/seller/seller-registration-form.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { AuthProvider } from "@/lib/mock-db/auth-context";
import { SellerRegistrationForm } from "./seller-registration-form";

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

const pushMock = vi.fn();
vi.mock("@/i18n/routing", async () => {
  const actual = await vi.importActual<typeof import("@/i18n/routing")>("@/i18n/routing");
  return { ...actual, useRouter: () => ({ push: pushMock, replace: pushMock }) };
});

function renderForm() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AuthProvider>
        <SellerRegistrationForm />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}

async function fillCommonFields() {
  await userEvent.type(screen.getByLabelText("Store Name"), "Green Valley Traders");
  await userEvent.type(screen.getByLabelText("Store Description"), "Fresh produce and dry goods.");
  await userEvent.type(screen.getByLabelText("Store Contact Number"), "3211234567");
}

describe("SellerRegistrationForm", () => {
  beforeEach(() => {
    window.localStorage.clear();
    pushMock.mockClear();
  });

  it("shows account fields and registers a brand-new seller", async () => {
    renderForm();
    expect(screen.getByLabelText("Phone Number")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Phone Number"), "3211234567");
    await userEvent.type(screen.getByLabelText("Password"), "password1");
    await fillCommonFields();
    await userEvent.click(screen.getByRole("button", { name: "Create My Storefront" }));
    expect(pushMock).toHaveBeenCalledWith("/seller/dashboard/listings");
  });

  it("hides account fields and upgrades an already-signed-in customer", async () => {
    window.localStorage.setItem(
      "mb.users",
      JSON.stringify([{ id: "u1", phone: "+923001234567", password: "password1", role: "customer", displayName: "Ayesha" }])
    );
    window.localStorage.setItem("mb.session", JSON.stringify("u1"));
    renderForm();
    expect(await screen.findByLabelText("Store Name")).toBeInTheDocument();
    expect(screen.queryByLabelText("Phone Number")).toBeNull();
    await fillCommonFields();
    await userEvent.click(screen.getByRole("button", { name: "Create My Storefront" }));
    expect(pushMock).toHaveBeenCalledWith("/seller/dashboard/listings");
  });
});
