import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { BarChart } from "./bar-chart";

describe("BarChart", () => {
  it("renders one bar per data point, labelled with its value", () => {
    render(
      <BarChart
        data={[
          { label: "Mon", value: 10 },
          { label: "Tue", value: 0 },
          { label: "Wed", value: 20 },
        ]}
      />
    );
    expect(screen.getByRole("img", { name: "Mon: 10" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Tue: 0" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Wed: 20" })).toBeInTheDocument();
  });

  it("formats the value through formatValue", () => {
    render(<BarChart data={[{ label: "Mon", value: 1500 }]} formatValue={(v) => `${v} views`} />);
    expect(screen.getByRole("img", { name: "Mon: 1500 views" })).toBeInTheDocument();
  });
});
