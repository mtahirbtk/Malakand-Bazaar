import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
  contactPhone: "",
};

const FILLED_VALUE: ListingFormValue = {
  ...BASE_VALUE,
  title: "A bicycle",
  description: "Lightly used.",
  price: "5000",
  contactPhone: "+923001234567",
};

function Wrapper({
  value = BASE_VALUE,
  onSubmit,
}: {
  value?: ListingFormValue;
  onSubmit: (value: ListingFormValue) => Promise<void>;
}) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <ListingForm
        initialValue={value}
        onSubmit={onSubmit}
        submitLabel="Save Listing"
        submittingLabel="Saving…"
      />
    </NextIntlClientProvider>
  );
}

describe("ListingForm", () => {
  it("updates the selected category", async () => {
    render(<Wrapper onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByRole("combobox", { name: "Category" }));
    await userEvent.click(await screen.findByRole("option", { name: CATEGORIES[1].nameEn }));

    await userEvent.click(screen.getByRole("combobox", { name: "Category" }));
    expect(await screen.findByRole("option", { name: CATEGORIES[1].nameEn })).toHaveAttribute(
      "aria-selected",
      "true"
    );
  });

  it("blocks submit and shows errors under the empty required fields", async () => {
    const onSubmit = vi.fn();
    render(<Wrapper onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "Save Listing" }));

    expect((await screen.findAllByText("This field is required.")).length).toBeGreaterThan(0);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("autofocuses the first invalid field on a failed submit", async () => {
    render(<Wrapper onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Save Listing" }));

    await waitFor(() => expect(screen.getByLabelText("Title")).toHaveFocus());
  });

  it("calls onSubmit with the current values once validation passes", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<Wrapper value={FILLED_VALUE} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "Save Listing" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(FILLED_VALUE));
  });

  it("shows the thrown error and lets the seller try again", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("network down"));
    render(<Wrapper value={FILLED_VALUE} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "Save Listing" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong. Please try again.");
  });
});
