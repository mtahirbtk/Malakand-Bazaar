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

  it("applies the whatsapp variant", () => {
    render(<Button variant="whatsapp">Chat</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-accent-green");
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
