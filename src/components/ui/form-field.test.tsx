import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormField } from "./form-field";
import { Input } from "./input";

describe("FormField", () => {
  it("associates its label with the control", () => {
    render(
      <FormField label="Phone number" htmlFor="phone">
        <Input id="phone" />
      </FormField>
    );
    expect(screen.getByLabelText("Phone number")).toBeInTheDocument();
  });

  it("shows an error instead of the hint when both are given", () => {
    render(
      <FormField label="Price" hint="In PKR" error="Price is required">
        <Input />
      </FormField>
    );
    expect(screen.getByText("Price is required")).toBeInTheDocument();
    expect(screen.queryByText("In PKR")).not.toBeInTheDocument();
  });

  it("announces errors politely", () => {
    render(
      <FormField label="Price" error="Price is required">
        <Input />
      </FormField>
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Price is required");
  });

  it("marks required fields", () => {
    render(
      <FormField label="Title" required>
        <Input />
      </FormField>
    );
    expect(screen.getByText("*")).toBeInTheDocument();
  });
});
