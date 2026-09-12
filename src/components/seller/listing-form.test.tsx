import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { CATEGORIES } from "@/data/categories";
import { ListingForm, type ListingFormValue } from "./listing-form";

const BASE_VALUE: ListingFormValue = {
  title: "",
  description: "",
  price: "",
  compareAtPrice: "",
  categorySlug: CATEGORIES[0].slug,
  subcategorySlug: CATEGORIES[0].subcategories[0].slug,
  tehsilSlug: "batkhela",
  localitySlug: "batkhela-city",
  images: [],
  contactPhone: "",
};

function Wrapper({
  onChange,
  onSubmit,
}: {
  onChange: (v: ListingFormValue) => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <ListingForm value={BASE_VALUE} onChange={onChange} onSubmit={onSubmit} submitLabel="Save Listing" />
    </NextIntlClientProvider>
  );
}

describe("ListingForm", () => {
  it("reports title changes via onChange", async () => {
    const onChange = vi.fn();
    render(<Wrapper onChange={onChange} onSubmit={() => {}} />);
    await userEvent.type(screen.getByLabelText("Title"), "S");
    expect(onChange).toHaveBeenCalledWith({ ...BASE_VALUE, title: "S" });
  });

  it("resets subcategory when category changes", async () => {
    const onChange = vi.fn();
    render(<Wrapper onChange={onChange} onSubmit={() => {}} />);
    await userEvent.click(screen.getByRole("combobox", { name: "Category" }));
    await userEvent.click(await screen.findByRole("option", { name: CATEGORIES[1].nameEn }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ categorySlug: CATEGORIES[1].slug, subcategorySlug: CATEGORIES[1].subcategories[0].slug })
    );
  });

  it("calls onSubmit when the form is submitted", async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(<Wrapper onChange={() => {}} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "Save Listing" }));
    expect(onSubmit).toHaveBeenCalled();
  });
});
