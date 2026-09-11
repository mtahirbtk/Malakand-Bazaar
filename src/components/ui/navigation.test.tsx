import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Accordion } from "./accordion";
import { Breadcrumb } from "./breadcrumb";
import { Pagination, paginationRange } from "./pagination";

describe("paginationRange", () => {
  it("lists every page when there are few", () => {
    expect(paginationRange(1, 4)).toEqual([1, 2, 3, 4]);
  });
  it("collapses the tail when deep in a long list", () => {
    expect(paginationRange(1, 20)).toEqual([1, 2, "ellipsis", 20]);
  });
  it("collapses both ends when in the middle", () => {
    expect(paginationRange(10, 20)).toEqual([1, "ellipsis", 9, 10, 11, "ellipsis", 20]);
  });
  it("collapses the head when near the end", () => {
    expect(paginationRange(20, 20)).toEqual([1, "ellipsis", 19, 20]);
  });
  it("never repeats a page number", () => {
    for (let page = 1; page <= 20; page++) {
      const nums = paginationRange(page, 20).filter((x) => typeof x === "number");
      expect(new Set(nums).size).toBe(nums.length);
    }
  });
});

describe("Pagination", () => {
  const labels = { previous: "Previous", next: "Next", page: "Page" };

  it("disables Previous on the first page", () => {
    render(<Pagination page={1} pageCount={5} onPageChange={() => {}} labels={labels} />);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  });

  it("disables Next on the last page", () => {
    render(<Pagination page={5} pageCount={5} onPageChange={() => {}} labels={labels} />);
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("marks the current page for assistive tech", () => {
    render(<Pagination page={3} pageCount={5} onPageChange={() => {}} labels={labels} />);
    expect(screen.getByRole("button", { name: "Page 3" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("reports the requested page", async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} pageCount={5} onPageChange={onPageChange} labels={labels} />);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});

describe("Accordion", () => {
  it("reveals a panel when its trigger is clicked", async () => {
    render(
      <Accordion items={[{ value: "tehsil", title: "Tehsil", content: <p>Batkhela</p> }]} />
    );
    expect(screen.queryByText("Batkhela")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Tehsil/ }));
    expect(screen.getByText("Batkhela")).toBeInTheDocument();
  });

  it("opens the panels named in defaultOpen", () => {
    render(
      <Accordion
        defaultOpen={["tehsil"]}
        items={[{ value: "tehsil", title: "Tehsil", content: <p>Batkhela</p> }]}
      />
    );
    expect(screen.getByText("Batkhela")).toBeInTheDocument();
  });
});

describe("Breadcrumb", () => {
  it("renders a navigation landmark with the trail", () => {
    render(
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Solar & Energy", href: "/search" },
          { label: "Solar Inverters" },
        ]}
      />
    );
    expect(screen.getByRole("navigation", { name: /breadcrumb/i })).toBeInTheDocument();
    expect(screen.getByText("Solar Inverters")).toBeInTheDocument();
  });
});
