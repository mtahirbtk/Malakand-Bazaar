import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Combobox } from "./combobox";

const options = [
  { value: "solar-panels", label: "Solar Panels" },
  { value: "solar-inverters", label: "Solar Inverters" },
  { value: "honey", label: "Honey (Sidr, Palosa, Wild)" },
  { value: "motorcycles", label: "Motorcycles" },
];

function setup(onValueChange = vi.fn()) {
  render(
    <Combobox
      ariaLabel="Category"
      value=""
      onValueChange={onValueChange}
      options={options}
      placeholder="All Sectors"
      searchPlaceholder="Search categories"
      emptyText="No category found"
    />
  );
  return onValueChange;
}

describe("Combobox", () => {
  it("shows the placeholder when empty", () => {
    setup();
    expect(screen.getByRole("button", { name: /Category/ })).toHaveTextContent("All Sectors");
  });

  it("filters options as the user types", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: /Category/ }));
    await userEvent.type(screen.getByPlaceholderText("Search categories"), "solar");
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("matches case-insensitively and mid-string", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: /Category/ }));
    await userEvent.type(screen.getByPlaceholderText("Search categories"), "PALOSA");
    expect(screen.getAllByRole("option")).toHaveLength(1);
  });

  it("shows empty text when nothing matches", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: /Category/ }));
    await userEvent.type(screen.getByPlaceholderText("Search categories"), "zzzz");
    expect(screen.getByText("No category found")).toBeInTheDocument();
  });

  it("reports the chosen value and closes", async () => {
    const onValueChange = setup();
    await userEvent.click(screen.getByRole("button", { name: /Category/ }));
    await userEvent.click(screen.getByRole("option", { name: "Motorcycles" }));
    expect(onValueChange).toHaveBeenCalledWith("motorcycles");
    expect(screen.queryByPlaceholderText("Search categories")).not.toBeInTheDocument();
  });
});
