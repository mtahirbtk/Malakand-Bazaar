import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { AuthProvider } from "@/lib/mock-db/auth-context";
import { SellerReviews } from "./seller-reviews";
import type { Seller } from "@/types";

const SELLER: Seller = {
  id: "s1",
  slug: "khan-solar-engineering",
  name: "Khan Solar & Engineering",
  initials: "KS",
  tehsilSlug: "dargai",
  localityLabel: "Dargai Industrial Belt",
  rating: 4.9,
  reviewCount: 142,
  verified: true,
  responseMinutes: 15,
  specialty: "VFD Inverters",
  statLabel: "Deals Done",
  statValue: "142 Systems",
  phone: "+923166441108",
};

function renderReviews() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AuthProvider>
        <SellerReviews seller={SELLER} />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}

describe("SellerReviews", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("prompts sign-in when a signed-out visitor tries to write a review", async () => {
    renderReviews();
    await userEvent.click(screen.getByRole("button", { name: "Write a Review" }));
    expect(await screen.findByText("Sign In to Review")).toBeInTheDocument();
  });

  it("lets a signed-in customer submit a review, which then appears in the list", async () => {
    window.localStorage.setItem(
      "mb.users",
      JSON.stringify([{ id: "u1", phone: "+923001234567", password: "password1", role: "customer", displayName: "Bilal" }])
    );
    window.localStorage.setItem("mb.session", JSON.stringify("u1"));
    renderReviews();
    await userEvent.click(await screen.findByRole("button", { name: "Write a Review" }));
    await userEvent.type(screen.getByPlaceholderText("Share your experience with this seller..."), "Great seller!");
    await userEvent.click(screen.getByRole("button", { name: "Submit Review" }));
    expect(await screen.findByText("Bilal")).toBeInTheDocument();
    expect(await screen.findByText("Great seller!")).toBeInTheDocument();
  });

  it("hides the write-review button for the seller's own storefront", async () => {
    window.localStorage.setItem(
      "mb.users",
      JSON.stringify([{ id: "u2", phone: "+923166441108", password: "password1", role: "seller", displayName: "Khan Solar", sellerId: "s1" }])
    );
    window.localStorage.setItem("mb.session", JSON.stringify("u2"));
    renderReviews();
    await screen.findByText("Reviews");
    expect(screen.queryByRole("button", { name: "Write a Review" })).toBeNull();
  });
});
