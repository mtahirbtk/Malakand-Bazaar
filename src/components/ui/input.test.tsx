import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./input";

describe("Input", () => {
  it("accepts typing", async () => {
    render(<Input aria-label="Search" />);
    await userEvent.type(screen.getByLabelText("Search"), "solar");
    expect(screen.getByLabelText("Search")).toHaveValue("solar");
  });

  it("marks itself invalid for assistive tech", () => {
    render(<Input aria-label="Price" invalid />);
    expect(screen.getByLabelText("Price")).toHaveAttribute("aria-invalid", "true");
  });

  it("reserves left padding when a leading icon is present", () => {
    render(<Input aria-label="Search" leadingIcon="search" />);
    expect(screen.getByLabelText("Search")).toHaveClass("pl-9");
  });
});
