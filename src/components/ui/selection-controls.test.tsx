import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "./checkbox";
import { RadioGroup } from "./radio-group";
import { Switch } from "./switch";

describe("Checkbox", () => {
  it("renders a labelled checkbox role", () => {
    render(<Checkbox checked={false} onCheckedChange={() => {}} label="In Stock" />);
    expect(screen.getByRole("checkbox", { name: /In Stock/ })).toBeInTheDocument();
  });

  it("toggles when the label text is clicked", async () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox checked={false} onCheckedChange={onCheckedChange} label="In Stock" />);
    await userEvent.click(screen.getByText("In Stock"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("reports its checked state", () => {
    render(<Checkbox checked onCheckedChange={() => {}} label="In Stock" />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("renders a count pill when given one", () => {
    render(<Checkbox checked={false} onCheckedChange={() => {}} label="Batkhela" count={54} />);
    expect(screen.getByText("54")).toBeInTheDocument();
  });
});

describe("RadioGroup", () => {
  it("selects an option and reports its value", async () => {
    const onValueChange = vi.fn();
    render(
      <RadioGroup
        ariaLabel="Condition"
        value="new"
        onValueChange={onValueChange}
        options={[
          { value: "new", label: "New" },
          { value: "used", label: "Used" },
        ]}
      />
    );
    await userEvent.click(screen.getByRole("radio", { name: "Used" }));
    expect(onValueChange).toHaveBeenCalledWith("used");
  });
});

describe("Switch", () => {
  it("toggles", async () => {
    const onCheckedChange = vi.fn();
    render(<Switch checked={false} onCheckedChange={onCheckedChange} label="Show map" />);
    await userEvent.click(screen.getByRole("switch", { name: "Show map" }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});
