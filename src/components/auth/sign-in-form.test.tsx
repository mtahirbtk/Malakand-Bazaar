import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithAuth, mockApi, makeUser } from "@tests/auth-harness";
import { SignInForm } from "./sign-in-form";

// jsdom mounts no Next.js App Router, so useRouter()/useSearchParams() would
// throw or return null — mock both so a successful submit's redirect runs.
const pushMock = vi.fn();
vi.mock("@/i18n/routing", async () => {
  const actual = await vi.importActual<typeof import("@/i18n/routing")>("@/i18n/routing");
  return { ...actual, useRouter: () => ({ push: pushMock, replace: pushMock }) };
});
vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return { ...actual, useSearchParams: () => new URLSearchParams() };
});

beforeEach(() => {
  pushMock.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SignInForm", () => {
  it("signs in and sends a customer to the home page", async () => {
    const { callTo } = mockApi({
      "POST /api/auth/login": { data: { user: { ...makeUser(), sellerId: null, sellerSlug: null } } },
    });

    renderWithAuth(<SignInForm />);

    await userEvent.type(screen.getByLabelText(/Phone Number/), "3001234567");
    await userEvent.type(screen.getByLabelText(/Password/), "password1");
    await userEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));

    // The phone is normalised to E.164 before it leaves the browser, matching
    // what the server stores.
    expect(callTo("POST", "/api/auth/login")?.body).toMatchObject({
      phone: "+923001234567",
      password: "password1",
    });
  });

  it("sends a seller straight to their dashboard", async () => {
    mockApi({
      "POST /api/auth/login": {
        data: { user: { ...makeUser({ role: "seller" }), sellerId: "s1", sellerSlug: "store" } },
      },
    });

    renderWithAuth(<SignInForm />);
    await userEvent.type(screen.getByLabelText(/Phone Number/), "3001234567");
    await userEvent.type(screen.getByLabelText(/Password/), "password1");
    await userEvent.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/seller/dashboard/listings"));
  });

  it("creates an account from the Create Account tab", async () => {
    const { callTo } = mockApi({
      "POST /api/auth/signup": {
        data: { user: { ...makeUser({ displayName: "Ayesha" }), sellerId: null, sellerSlug: null } },
        status: 201,
      },
    });

    renderWithAuth(<SignInForm />);
    await userEvent.click(screen.getByRole("tab", { name: "Create Account" }));
    await userEvent.type(screen.getByLabelText(/Your Name/), "Ayesha");
    await userEvent.type(screen.getByLabelText(/Phone Number/), "3007654321");
    await userEvent.type(screen.getByLabelText(/Password/), "password1");
    await userEvent.click(screen.getByRole("button", { name: "Create Account" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/"));
    expect(callTo("POST", "/api/auth/signup")?.body).toMatchObject({
      phone: "+923007654321",
      displayName: "Ayesha",
    });
  });

  it("shows the server's message when the credentials are wrong", async () => {
    mockApi({
      "POST /api/auth/login": {
        status: 401,
        error: { code: "AUTH_INVALID_CREDENTIALS", message: "That number or password is incorrect." },
      },
    });

    renderWithAuth(<SignInForm />);
    await userEvent.type(screen.getByLabelText(/Phone Number/), "3001234567");
    await userEvent.type(screen.getByLabelText(/Password/), "wrongpassword");
    await userEvent.click(screen.getByRole("button", { name: "Sign In" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("That number or password is incorrect.");
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("puts a field-level error beside the field that caused it", async () => {
    mockApi({
      "POST /api/auth/signup": {
        status: 409,
        error: {
          code: "CONFLICT",
          message: "That number already has an account.",
          fields: { phone: "This number is already registered." },
        },
      },
    });

    renderWithAuth(<SignInForm />);
    await userEvent.click(screen.getByRole("tab", { name: "Create Account" }));
    await userEvent.type(screen.getByLabelText(/Your Name/), "Ayesha");
    await userEvent.type(screen.getByLabelText(/Phone Number/), "3007654321");
    await userEvent.type(screen.getByLabelText(/Password/), "password1");
    await userEvent.click(screen.getByRole("button", { name: "Create Account" }));

    expect(await screen.findByText("This number is already registered.")).toBeInTheDocument();
  });

  it("does not submit twice while a request is in flight", async () => {
    let resolve: (value: Response) => void = () => {};
    const pending = new Promise<Response>((r) => {
      resolve = r;
    });
    // Only the login call hangs — the bootstrap GET /api/auth/me still
    // answers immediately, otherwise it would consume the same Response
    // this test resolves at the end and the login call would find its body
    // already read.
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url.includes("/api/auth/login")) return pending;
        return Promise.resolve(
          new Response(
            JSON.stringify({ ok: false, error: { code: "AUTH_REQUIRED", message: "Sign in to continue." } }),
            { status: 401, headers: { "content-type": "application/json" } }
          )
        );
      })
    );

    renderWithAuth(<SignInForm />);
    await userEvent.type(screen.getByLabelText(/Phone Number/), "3001234567");
    await userEvent.type(screen.getByLabelText(/Password/), "password1");

    const button = screen.getByRole("button", { name: "Sign In" });
    await userEvent.click(button);

    expect(await screen.findByRole("button", { name: /Signing in/ })).toBeDisabled();

    resolve(
      new Response(JSON.stringify({ ok: true, data: { user: { ...makeUser(), sellerId: null, sellerSlug: null } } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    // Let the resolution finish settling (the toast, the redirect) before the
    // test ends, so React never warns about an update outside of act().
    await waitFor(() => expect(pushMock).toHaveBeenCalled());
  });
});
