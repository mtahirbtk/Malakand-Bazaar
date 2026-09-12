import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MultiFileUpload } from "./multi-file-upload";

describe("MultiFileUpload", () => {
  it("calls onAdd with the chosen file", async () => {
    const onAdd = vi.fn();
    render(<MultiFileUpload label="Add photo" urls={[]} onAdd={onAdd} onRemove={() => {}} />);
    const file = new File(["hello"], "listing.png", { type: "image/png" });
    const input = screen.getByLabelText("Add photo", { selector: "input" });
    await userEvent.upload(input, file);
    expect(onAdd).toHaveBeenCalledWith(file);
  });

  it("calls onRemove with the index of the clicked photo", async () => {
    const onRemove = vi.fn();
    render(<MultiFileUpload label="Add photo" urls={["blob:a", "blob:b"]} onAdd={() => {}} onRemove={onRemove} />);
    const removeButtons = screen.getAllByRole("button", { name: "Remove photo" });
    await userEvent.click(removeButtons[1]);
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it("hides the add tile once max is reached", () => {
    render(<MultiFileUpload label="Add photo" urls={["blob:a", "blob:b"]} onAdd={() => {}} onRemove={() => {}} max={2} />);
    expect(screen.queryByLabelText("Add photo", { selector: "input" })).toBeNull();
  });
});
