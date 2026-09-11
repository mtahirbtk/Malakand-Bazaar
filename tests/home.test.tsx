import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import HomeContent from "@/app/[locale]/home-content";

function renderHome() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <HomeContent />
    </NextIntlClientProvider>
  );
}

describe("Home page", () => {
  it("renders three category shelves", () => {
    renderHome();
    expect(screen.getByRole("heading", { name: /Electronics & Solar Tech/ })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Fresh Valley Fruits & Agro Produce/ })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Vehicles & Motorbikes/ })).toBeInTheDocument();
  });

  it("renders five listing cards per shelf", () => {
    renderHome();
    const listingLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.includes("/listing/"));
    expect(listingLinks.length).toBeGreaterThanOrEqual(15);
  });

  it("renders eight popular sector circles", () => {
    renderHome();
    const sectors = screen.getByRole("region", { name: /Popular Marketplace Sectors/ });
    expect(sectors.querySelectorAll("a")).toHaveLength(9); // 8 circles + View All
  });

  it("renders the five verified sellers", () => {
    renderHome();
    expect(screen.getAllByRole("link", { name: /Visit Store/ })).toHaveLength(5);
  });

  it("renders a hero carousel", () => {
    renderHome();
    expect(screen.getByRole("region", { name: /Highlights/ })).toBeInTheDocument();
  });
});
