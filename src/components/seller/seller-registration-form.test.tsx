import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithAuth, mockApi, makeUser, makeSeller } from "@tests/auth-harness";
import { SellerRegistrationForm } from "./seller-registration-form";

const pushMock = vi.fn();
vi.mock("@/i18n/routing", async () => {
  const actual = await vi.importActual<typeof import("@/i18n/routing")>("@/i18n/routing");
  return { ...actual, useRouter: () => ({ push: pushMock, replace: pushMock }) };
});

// The map picker pulls in Leaflet, which needs layout APIs jsdom does not have.
vi.mock("@/components/marketplace/map-pin-picker", () => ({
  MapPinPicker: () => <div data-testid="map-pin-picker" />,
}));

const REGISTERED = {
  data: {
    seller: { id: "s_new", slug: "green-valley-store" },
    user: { ...makeSeller({ sellerId: "s_new", sellerSlug: "green-valley-store" }), sellerId: "s_new", sellerSlug: "green-valley-store" },
  },
  status: 201,
};

async function fillStoreFields() {
  await userEvent.type(screen.getByLabelText(/Store Name/), "Green Valley Store");
  await userEvent.type(screen.getByLabelText(/Store Contact Number/), "3009876543");
}

beforeEach(() => {
  pushMock.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SellerRegistrationForm", () => {
  it("asks a signed-out visitor for credentials and registers them in one call", async () => {
    const { callTo } = mockApi({ "POST /api/seller/register": REGISTERED });

    renderWithAuth(<SellerRegistrationForm />);

    await userEvent.type(screen.getByLabelText(/^Phone Number/), "3001234567");
    await userEvent.type(screen.getByLabelText(/^Password/), "password1");
    await fillStoreFields();
    await userEvent.click(screen.getByRole("button", { name: "Create My Storefront" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/seller/dashboard/listings"));

    expect(callTo("POST", "/api/seller/register")?.body).toMatchObject({
      phone: "+923001234567",
      password: "password1",
      storeName: "Green Valley Store",
      storePhone: "+923009876543",
    });
  });

  it("hides the credential fields for a signed-in customer and sends no password", async () => {
    const { callTo } = mockApi({ "POST /api/seller/register": REGISTERED });

    renderWithAuth(<SellerRegistrationForm />, makeUser({ displayName: "Ayesha" }));

    expect(screen.queryByLabelText(/^Password/)).toBeNull();

    await fillStoreFields();
    await userEvent.click(screen.getByRole("button", { name: "Create My Storefront" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/seller/dashboard/listings"));

    const body = callTo("POST", "/api/seller/register")?.body as Record<string, unknown>;
    expect(body).toMatchObject({ storeName: "Green Valley Store" });
    // The account already exists; re-sending credentials would be a way to
    // overwrite someone else's password if the server ever trusted them.
    expect(body.phone).toBeUndefined();
    expect(body.password).toBeUndefined();
  });

  it("sends an existing seller to the dashboard instead of the form", () => {
    renderWithAuth(<SellerRegistrationForm />, makeSeller());

    expect(screen.getByText("You already have a storefront")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create My Storefront" })).toBeNull();
  });

  it("shows a field error against the field the server named", async () => {
    mockApi({
      "POST /api/seller/register": {
        status: 409,
        error: {
          code: "CONFLICT",
          message: "That number already has an account.",
          fields: { phone: "This number is already registered." },
        },
      },
    });

    renderWithAuth(<SellerRegistrationForm />);

    await userEvent.type(screen.getByLabelText(/^Phone Number/), "3001234567");
    await userEvent.type(screen.getByLabelText(/^Password/), "password1");
    await fillStoreFields();
    await userEvent.click(screen.getByRole("button", { name: "Create My Storefront" }));

    expect(await screen.findByText("This number is already registered.")).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("does not offer image uploads until the upload pipeline exists", () => {
    renderWithAuth(<SellerRegistrationForm />);
    // A picker that silently discarded the file would be worse than none.
    expect(screen.queryByText(/Storefront Banner/i)).toBeNull();
  });
});
