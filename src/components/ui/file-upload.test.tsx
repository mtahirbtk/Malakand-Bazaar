import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileUpload } from "./file-upload";

describe("FileUpload", () => {
  it("calls onFileSelected with the chosen file", async () => {
    const onFileSelected = vi.fn();
    render(<FileUpload label="Upload photo" onFileSelected={onFileSelected} />);
    const file = new File(["hello"], "avatar.png", { type: "image/png" });
    const input = screen.getByLabelText("Upload photo", { selector: "input" });
    await userEvent.upload(input, file);
    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it("shows a Remove button and calls onClear when a preview exists", async () => {
    const onClear = vi.fn();
    render(<FileUpload label="Upload photo" previewUrl="blob:preview" onFileSelected={() => {}} onClear={onClear} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onClear).toHaveBeenCalled();
  });
});
