import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Badge } from "./badge";
import { Chip } from "./chip";
import { Avatar } from "./avatar";
import { Rating } from "./rating";
import { Price } from "./price";
import { EmptyState } from "./empty-state";

describe("Badge", () => {
  it("renders its text", () => {
    render(<Badge tone="sand">2 Yr Warranty</Badge>);
    expect(screen.getByText("2 Yr Warranty")).toBeInTheDocument();
  });
});

describe("Chip", () => {
  it("renders a removable chip and reports removal", async () => {
    const onRemove = vi.fn();
    render(<Chip label='Search: "Solar Inverter"' onRemove={onRemove} />);
    await userEvent.click(screen.getByRole("button", { name: /remove/i }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("marks the active state for assistive tech", () => {
    render(<Chip label="Batkhela" active onClick={() => {}} />);
    expect(screen.getByRole("button", { name: "Batkhela" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });
});

describe("Avatar", () => {
  it("falls back to initials when no image is given", () => {
    render(<Avatar initials="KS" alt="Khan Solar" />);
    expect(screen.getByText("KS")).toBeInTheDocument();
  });
});

describe("Rating", () => {
  it("announces its value", () => {
    render(<Rating value={4.9} count={142} />);
    expect(screen.getByLabelText("Rated 4.9 out of 5")).toBeInTheDocument();
  });

  it("shows the review count", () => {
    render(<Rating value={4.9} count={142} />);
    expect(screen.getByText("(142)")).toBeInTheDocument();
  });

  it("lets a user pick a score when editable", async () => {
    const onChange = vi.fn();
    render(<Rating value={0} editable onChange={onChange} ariaLabel="Your rating" />);
    await userEvent.click(screen.getByRole("radio", { name: "4 stars" }));
    expect(onChange).toHaveBeenCalledWith(4);
  });
});

describe("Price", () => {
  it("formats the amount in PKR", () => {
    render(<Price value={240000} />);
    expect(screen.getByText("PKR 240,000")).toBeInTheDocument();
  });

  it("strikes through a compare-at price", () => {
    render(<Price value={240000} compareAt={265000} />);
    expect(screen.getByText("265,000")).toHaveClass("line-through");
  });

  it("uses tabular figures so rows align", () => {
    render(<Price value={240000} />);
    expect(screen.getByText("PKR 240,000")).toHaveClass("tabular");
  });

  it("hides a compare-at price that is not actually higher", () => {
    render(<Price value={240000} compareAt={240000} />);
    expect(screen.queryByText("240,000")).toBeNull();
  });
});

describe("EmptyState", () => {
  it("renders its title and body", () => {
    render(<EmptyState icon="search_off" title="No listings found" body="Try a wider area." />);
    expect(screen.getByText("No listings found")).toBeInTheDocument();
    expect(screen.getByText("Try a wider area.")).toBeInTheDocument();
  });
});

describe("Price in RTL context", () => {
  it("forces left-to-right so PKR amounts are not reordered in Urdu", () => {
    const { container } = render(<Price value={240000} />);
    expect(container.querySelector("span")).toHaveAttribute("dir", "ltr");
  });
});
