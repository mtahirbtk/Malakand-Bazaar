import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { Carousel } from "./carousel";

const slides = [
  <p key="1">Slide One</p>,
  <p key="2">Slide Two</p>,
  <p key="3">Slide Three</p>,
];

function mockReducedMotion(matches: boolean) {
  window.matchMedia = vi.fn().mockReturnValue({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  vi.useFakeTimers();
  mockReducedMotion(false);
});
afterEach(() => vi.useRealTimers());

describe("Carousel", () => {
  it("marks the first slide current on mount", () => {
    render(<Carousel ariaLabel="Highlights" slides={slides} />);
    expect(screen.getByRole("group", { name: "Slide 1 of 3" })).toHaveAttribute(
      "aria-current",
      "true"
    );
  });

  it("auto-advances after the interval", () => {
    render(<Carousel ariaLabel="Highlights" slides={slides} autoPlayMs={4500} />);
    act(() => {
      vi.advanceTimersByTime(4500);
    });
    expect(screen.getByRole("group", { name: "Slide 2 of 3" })).toHaveAttribute(
      "aria-current",
      "true"
    );
  });

  it("wraps from the last slide back to the first", () => {
    render(<Carousel ariaLabel="Highlights" slides={slides} autoPlayMs={1000} />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByRole("group", { name: "Slide 1 of 3" })).toHaveAttribute(
      "aria-current",
      "true"
    );
  });

  // fireEvent, not userEvent: userEvent awaits real timers internally and
  // deadlocks against vi.useFakeTimers in this file.
  it("moves to a slide when its dot is clicked", () => {
    render(<Carousel ariaLabel="Highlights" slides={slides} />);
    fireEvent.click(screen.getByRole("button", { name: "Go to slide 3" }));
    expect(screen.getByRole("group", { name: "Slide 3 of 3" })).toHaveAttribute(
      "aria-current",
      "true"
    );
  });

  // Queried by attribute rather than by role: aria-hidden removes the node
  // from the accessibility tree, so getByRole cannot reach it at all.
  it("hides the inactive slides from assistive tech", () => {
    const { container } = render(<Carousel ariaLabel="Highlights" slides={slides} />);
    expect(container.querySelector('[aria-label="Slide 2 of 3"]')).toHaveAttribute(
      "aria-hidden",
      "true"
    );
    expect(container.querySelector('[aria-label="Slide 1 of 3"]')).toHaveAttribute(
      "aria-hidden",
      "false"
    );
  });

  it("does not auto-advance when reduced motion is preferred", () => {
    mockReducedMotion(true);
    render(<Carousel ariaLabel="Highlights" slides={slides} autoPlayMs={1000} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByRole("group", { name: "Slide 1 of 3" })).toHaveAttribute(
      "aria-current",
      "true"
    );
  });
});
