import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileUpload } from "./file-upload";

const CROP_LABELS = {
  title: "Adjust photo",
  description: "Drag to reposition, use the slider to zoom.",
  zoomAria: "Zoom",
  cancel: "Cancel",
  save: "Save",
  error: "Could not process that image.",
};

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

  it("opens the crop modal instead of firing onFileSelected immediately when `crop` is set", async () => {
    const onFileSelected = vi.fn();
    render(
      <FileUpload
        label="Upload banner"
        onFileSelected={onFileSelected}
        crop={{ aspect: 3, labels: CROP_LABELS }}
      />
    );
    const file = new File(["hello"], "banner.png", { type: "image/png" });
    const input = screen.getByLabelText("Upload banner", { selector: "input" });
    await userEvent.upload(input, file);

    expect(await screen.findByText("Adjust photo")).toBeInTheDocument();
    expect(onFileSelected).not.toHaveBeenCalled();
  });

  it("closes the crop modal without calling onFileSelected on Cancel", async () => {
    const onFileSelected = vi.fn();
    render(
      <FileUpload
        label="Upload banner"
        onFileSelected={onFileSelected}
        crop={{ aspect: 3, labels: CROP_LABELS }}
      />
    );
    const file = new File(["hello"], "banner.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText("Upload banner", { selector: "input" }), file);
    await screen.findByText("Adjust photo");

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByText("Adjust photo")).not.toBeInTheDocument();
    expect(onFileSelected).not.toHaveBeenCalled();
  });

  it("shows a spinner and disables the input while uploading", () => {
    render(<FileUpload label="Upload photo" onFileSelected={() => {}} uploading previewUrl="blob:preview" />);
    expect(screen.getByLabelText("Upload photo", { selector: "input" })).toBeDisabled();
    // The Remove action is hidden mid-upload — nothing to remove yet from the server's point of view.
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });
});
