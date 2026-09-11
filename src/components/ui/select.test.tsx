import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "./select";

const options = [
  { value: "all", label: "All Malakand District" },
  { value: "batkhela", label: "Batkhela" },
  { value: "dargai", label: "Dargai" },
  { value: "thana", label: "Thana Baizai" },
];

describe("Select", () => {
  it("renders no native select element", () => {
    const { container } = render(
      <Select ariaLabel="Tehsil" value="all" onValueChange={() => {}} options={options} />
    );
    expect(container.querySelector("select")).toBeNull();
  });

  it("shows the selected option's label on the trigger", () => {
    render(
      <Select ariaLabel="Tehsil" value="batkhela" onValueChange={() => {}} options={options} />
    );
    expect(screen.getByRole("combobox", { name: "Tehsil" })).toHaveTextContent("Batkhela");
  });

  it("opens on click and lists every option", async () => {
    render(
      <Select ariaLabel="Tehsil" value="all" onValueChange={() => {}} options={options} />
    );
    await userEvent.click(screen.getByRole("combobox", { name: "Tehsil" }));
    expect(screen.getAllByRole("option")).toHaveLength(4);
  });

  it("reports the chosen value", async () => {
    const onValueChange = vi.fn();
    render(
      <Select ariaLabel="Tehsil" value="all" onValueChange={onValueChange} options={options} />
    );
    await userEvent.click(screen.getByRole("combobox", { name: "Tehsil" }));
    await userEvent.click(screen.getByRole("option", { name: "Dargai" }));
    expect(onValueChange).toHaveBeenCalledWith("dargai");
  });

  it("opens with the keyboard and selects with Enter", async () => {
    const onValueChange = vi.fn();
    render(
      <Select ariaLabel="Tehsil" value="all" onValueChange={onValueChange} options={options} />
    );
    screen.getByRole("combobox", { name: "Tehsil" }).focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("batkhela");
  });

  it("shows a placeholder when nothing is selected", () => {
    render(
      <Select
        ariaLabel="Tehsil"
        value=""
        onValueChange={() => {}}
        options={options}
        placeholder="Choose a tehsil"
      />
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("Choose a tehsil");
  });
});
