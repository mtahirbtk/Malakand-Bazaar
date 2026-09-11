import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PriceRange } from "./price-range";

const labels = {
  from: "From",
  to: "To",
  apply: "Apply Price Filter",
  highest: "The highest price in selection is",
};

function renderRange(onChange = vi.fn(), onApply = vi.fn()) {
  render(
    <PriceRange
      min={0}
      max={1000000}
      value={[1000, 450000]}
      onChange={onChange}
      onApply={onApply}
      labels={labels}
    />
  );
  return { onChange, onApply };
}

describe("PriceRange", () => {
  it("renders no native range input", () => {
    const { container } = render(
      <PriceRange min={0} max={1000000} value={[1000, 450000]} onChange={() => {}} onApply={() => {}} labels={labels} />
    );
    expect(container.querySelector('input[type="range"]')).toBeNull();
  });

  it("exposes two draggable thumbs", () => {
    renderRange();
    expect(screen.getAllByRole("slider")).toHaveLength(2);
  });

  it("shows the current bounds in the number fields", () => {
    renderRange();
    expect(screen.getByLabelText("From")).toHaveValue(1000);
    expect(screen.getByLabelText("To")).toHaveValue(450000);
  });

  it("reports an edited lower bound", () => {
    const { onChange } = renderRange();
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "5000" } });
    expect(onChange).toHaveBeenLastCalledWith([5000, 450000]);
  });

  it("clamps a lower bound set above the upper bound", () => {
    const { onChange } = renderRange();
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "900000" } });
    expect(onChange).toHaveBeenLastCalledWith([450000, 450000]);
  });

  it("clamps an upper bound set below the lower bound", () => {
    const { onChange } = renderRange();
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "500" } });
    expect(onChange).toHaveBeenLastCalledWith([1000, 1000]);
  });

  it("clamps an upper bound set above the maximum", () => {
    const { onChange } = renderRange();
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "9999999" } });
    expect(onChange).toHaveBeenLastCalledWith([1000, 1000000]);
  });

  it("fires onApply when the button is pressed", async () => {
    const { onApply } = renderRange();
    await userEvent.click(screen.getByRole("button", { name: "Apply Price Filter" }));
    expect(onApply).toHaveBeenCalledOnce();
  });
});
