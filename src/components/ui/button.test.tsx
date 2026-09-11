import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  it("renders its label", () => {
    render(<Button>Become a Seller</Button>);
    expect(
      screen.getByRole("button", { name: "Become a Seller" })
    ).toBeInTheDocument();
  });

  it("applies the primary variant by default", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-primary");
  });

  // The fill is accent-green-dark, not accent-green: white on #50a23e is
  // 3.19:1 and fails WCAG AA for small text.
  it("applies the whatsapp variant with an accessible fill", () => {
    render(<Button variant="whatsapp">Chat</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("bg-accent-green-dark");
    expect(btn).not.toHaveClass("bg-accent-green");
  });

  // White on sand #c89b6d is 2.51:1 and fails badly; dark text is required.
  it("uses dark text on the sand variant", () => {
    render(<Button variant="sand">Feature Boost</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("text-on-surface");
    expect(btn).not.toHaveClass("text-white");
  });

  it("calls onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Tap</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not fire when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Tap
      </Button>
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders as an anchor when asChild is set", () => {
    render(
      <Button asChild>
        <a href="/sell">Sell</a>
      </Button>
    );
    expect(screen.getByRole("link", { name: "Sell" })).toHaveClass("bg-primary");
  });
});
