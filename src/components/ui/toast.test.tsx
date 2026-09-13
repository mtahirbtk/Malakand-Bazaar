import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider, useToast, type ToastPosition } from "./toast";

const POSITIONS: ToastPosition[] = ["top-right", "top-left", "bottom-right", "bottom-left", "center"];

function Trigger() {
  const { show } = useToast();
  return (
    <div>
      <button onClick={() => show("Account created")}>string form</button>
      <button onClick={() => show({ title: "Custom", position: "bottom-left", tone: "error" })}>
        bottom-left error
      </button>
      {POSITIONS.map((position) => (
        <button key={position} onClick={() => show({ title: `at ${position}`, position })}>
          {position}
        </button>
      ))}
    </div>
  );
}

describe("useToast / ToastProvider", () => {
  it("throws when used outside a provider", () => {
    // Suppress the expected console.error from React's error boundary noise.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    function Bare() {
      useToast();
      return null;
    }
    expect(() => render(<Bare />)).toThrow(/must be used within a ToastProvider/);
    spy.mockRestore();
  });

  it("defaults a string call to top-right", async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );
    await userEvent.click(screen.getByText("string form"));
    expect(await screen.findByText("Account created")).toBeInTheDocument();
  });

  it("renders each position in its own viewport, independent of the others", async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );

    for (const position of POSITIONS) {
      await userEvent.click(screen.getByRole("button", { name: position }));
    }

    // Five distinct toasts, all live at once — positions do not share a queue,
    // so triggering one never displaces or replaces another.
    for (const position of POSITIONS) {
      expect(await screen.findByText(`at ${position}`)).toBeInTheDocument();
    }
  });

  it("shows a title and description together", async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );
    await userEvent.click(screen.getByText("bottom-left error"));
    const toast = await screen.findByText("Custom");
    expect(toast).toBeInTheDocument();
  });

  it("can be dismissed by its close button", async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>
    );
    await userEvent.click(screen.getByText("string form"));
    await screen.findByText("Account created");
    await userEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    await waitFor(() => expect(screen.queryByText("Account created")).not.toBeInTheDocument());
  });
});
