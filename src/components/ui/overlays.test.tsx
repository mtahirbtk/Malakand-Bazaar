import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "./modal";
import { Drawer } from "./drawer";
import { DropdownMenu } from "./dropdown-menu";

describe("Modal", () => {
  it("renders nothing when closed", () => {
    render(
      <Modal open={false} onOpenChange={() => {}} title="Report listing">
        <p>Body</p>
      </Modal>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a titled dialog when open", () => {
    render(
      <Modal open onOpenChange={() => {}} title="Report listing">
        <p>Body</p>
      </Modal>
    );
    expect(screen.getByRole("dialog", { name: "Report listing" })).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const onOpenChange = vi.fn();
    render(
      <Modal open onOpenChange={onOpenChange} title="Report listing">
        <p>Body</p>
      </Modal>
    );
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes via the close button", async () => {
    const onOpenChange = vi.fn();
    render(
      <Modal open onOpenChange={onOpenChange} title="Report listing">
        <p>Body</p>
      </Modal>
    );
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("Drawer", () => {
  it("renders its children when open", () => {
    render(
      <Drawer open onOpenChange={() => {}} title="Filters">
        <p>Tehsil filters</p>
      </Drawer>
    );
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
    expect(screen.getByText("Tehsil filters")).toBeInTheDocument();
  });
});

describe("DropdownMenu", () => {
  it("opens and fires the chosen item", async () => {
    const onSelect = vi.fn();
    render(
      <DropdownMenu
        ariaLabel="Account"
        trigger={<button>Account</button>}
        items={[
          { label: "My Listings", onSelect },
          { label: "Sign Out", onSelect: () => {} },
        ]}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Account" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "My Listings" }));
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
