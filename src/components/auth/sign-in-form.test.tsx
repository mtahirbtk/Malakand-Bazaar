import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { AuthProvider } from "@/lib/mock-db/auth-context";
import { SignInForm } from "./sign-in-form";

// jsdom has no real Next.js App Router mounted, and useRouter()/
// useSearchParams() from next's navigation throw or return null without
// one — mock both so a successful submit's redirect doesn't crash the test.
const pushMock = vi.fn();
vi.mock("@/i18n/routing", async () => {
  const actual = await vi.importActual<typeof import("@/i18n/routing")>("@/i18n/routing");
  return { ...actual, useRouter: () => ({ push: pushMock, replace: pushMock }) };
});
vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return { ...actual, useSearchParams: () => new URLSearchParams() };
});

function renderForm() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AuthProvider>
        <SignInForm />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}

describe("SignInForm", () => {
  beforeEach(() => {
    window.localStorage.clear();
    pushMock.mockClear();
  });

  it("creates a customer account from the Create Account tab", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("tab", { name: "Create Account" }));
    await userEvent.type(screen.getByLabelText("Your Name"), "Ayesha");
    await userEvent.type(screen.getByLabelText("Phone Number"), "3001234567");
    await userEvent.type(screen.getByLabelText("Password"), "password1");
    await userEvent.click(screen.getByRole("button", { name: "Create Account" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(pushMock).toHaveBeenCalledWith("/");
  });

  it("shows an error for an invalid sign-in", async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText("Phone Number"), "3001234567");
    await userEvent.type(screen.getByLabelText("Password"), "wrongpass");
    await userEvent.click(screen.getByRole("button", { name: "Sign In" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/incorrect/i);
  });
});
