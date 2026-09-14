import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock factories are hoisted above the rest of the file, above a plain
// `const fire = vi.fn()` too — vi.hoisted is what makes `fire` exist by the
// time the factory (and toast.tsx's module-level Swal.mixin(...) call) runs.
const { fire } = vi.hoisted(() => ({ fire: vi.fn() }));
vi.mock("sweetalert2", () => ({
  default: { mixin: () => ({ fire }), stopTimer: vi.fn(), resumeTimer: vi.fn() },
}));

import { useToast } from "./toast";

/**
 * Confirms this file is a thin, correct pass-through to SweetAlert2's toast
 * mixin — the mapping from our props to its `fire()` call — not a
 * reimplementation of any toast behaviour.
 */
describe("useToast", () => {
  beforeEach(() => {
    fire.mockClear();
  });

  it("defaults a string call to a top-right success toast", () => {
    useToast().show("Account created");
    expect(fire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Account created", icon: "success", position: "top-end", timer: 3000 })
    );
  });

  it("passes the description through as SweetAlert2's `text`", () => {
    useToast().show({ title: "Welcome back, Usama!", description: "Signed in to MalakandBazaar." });
    expect(fire).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Welcome back, Usama!", text: "Signed in to MalakandBazaar." })
    );
  });

  it.each([
    ["top-right", "top-end"],
    ["top-left", "top-start"],
    ["bottom-right", "bottom-end"],
    ["bottom-left", "bottom-start"],
    ["center", "center"],
  ] as const)("maps position %s to SweetAlert2's %s", (position, expected) => {
    useToast().show({ title: "x", position });
    expect(fire).toHaveBeenCalledWith(expect.objectContaining({ position: expected }));
  });

  it.each(["success", "error", "info", "warning"] as const)("passes tone %s through as `icon`", (tone) => {
    useToast().show({ title: "x", tone });
    expect(fire).toHaveBeenCalledWith(expect.objectContaining({ icon: tone }));
  });

  it("honours a custom duration as SweetAlert2's `timer`", () => {
    useToast().show({ title: "x", duration: 6000 });
    expect(fire).toHaveBeenCalledWith(expect.objectContaining({ timer: 6000 }));
  });
});
