import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { AuthProvider } from "@/lib/mock-db/auth-context";
import { getListingsBySellerOverlay } from "@/lib/mock-db/listings";
import NewListingPage from "./page";

const pushMock = vi.fn();
vi.mock("@/i18n/routing", async () => {
  const actual = await vi.importActual<typeof import("@/i18n/routing")>("@/i18n/routing");
  return { ...actual, useRouter: () => ({ push: pushMock, replace: pushMock }) };
});

function seedSignedInSeller() {
  window.localStorage.setItem(
    "mb.users",
    JSON.stringify([{ id: "u1", phone: "+923001234567", password: "password1", role: "seller", displayName: "Store", sellerId: "s1" }])
  );
  window.localStorage.setItem("mb.session", JSON.stringify("u1"));
}

function renderPage() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AuthProvider>
        <NewListingPage />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}

describe("NewListingPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    pushMock.mockClear();
  });

  it("creates a listing for the signed-in seller and redirects to the listings tab", async () => {
    seedSignedInSeller();
    renderPage();
    await userEvent.type(screen.getByLabelText("Title"), "Second Hand Bicycle");
    await userEvent.type(screen.getByLabelText("Description"), "Lightly used, well maintained.");
    await userEvent.type(screen.getByLabelText("Price (PKR)"), "15000");
    await userEvent.type(screen.getByLabelText("Contact Number"), "3001234567");
    await userEvent.click(screen.getByRole("button", { name: "Publish Listing" }));
    expect(pushMock).toHaveBeenCalledWith("/seller/dashboard/listings");
    expect(getListingsBySellerOverlay("s1").some((l) => l.title === "Second Hand Bicycle")).toBe(true);
  });

  it("rejects an empty title", async () => {
    seedSignedInSeller();
    renderPage();
    await userEvent.type(screen.getByLabelText("Price (PKR)"), "15000");
    await userEvent.click(screen.getByRole("button", { name: "Publish Listing" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/valid price/i);
    expect(pushMock).not.toHaveBeenCalled();
  });
});
