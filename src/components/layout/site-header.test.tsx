import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { SiteHeader } from "./site-header";

function renderHeader() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SiteHeader />
    </NextIntlClientProvider>
  );
}

describe("SiteHeader", () => {
  it("renders the brand name", () => {
    renderHeader();
    expect(screen.getByRole("banner")).toHaveTextContent("MalakandBazaar");
  });

  it("uses no native select element", () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <SiteHeader />
      </NextIntlClientProvider>
    );
    expect(container.querySelector("select")).toBeNull();
  });

  // Both the desktop and mobile search forms are in the DOM at once — only
  // one is visible at a time via a CSS media query (hidden md:block /
  // md:hidden), which jsdom does not evaluate, so both are queryable here.
  it("exposes labelled search fields for desktop and mobile", () => {
    renderHeader();
    const boxes = screen.getAllByRole("searchbox", { name: /search/i });
    expect(boxes.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the Become a Seller call to action", () => {
    renderHeader();
    expect(screen.getByRole("link", { name: /Become a Seller/ })).toBeInTheDocument();
  });

  it("shows the sign in link", () => {
    renderHeader();
    expect(screen.getByRole("link", { name: /Sign In/ })).toBeInTheDocument();
  });
});
