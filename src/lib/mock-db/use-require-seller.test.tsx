import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider } from "./auth-context";
import { useRequireSeller } from "./use-require-seller";

const pushMock = vi.fn();
vi.mock("@/i18n/routing", () => ({
  useRouter: () => ({ push: pushMock, replace: pushMock }),
  usePathname: () => "/seller/dashboard/listings",
}));

function Probe() {
  const { ready } = useRequireSeller();
  return <p data-testid="ready">{String(ready)}</p>;
}

describe("useRequireSeller", () => {
  beforeEach(() => {
    window.localStorage.clear();
    pushMock.mockClear();
  });

  it("redirects to sign-in when nobody is signed in", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/sign-in?next=%2Fseller%2Fdashboard%2Flistings"));
    expect(screen.getByTestId("ready")).toHaveTextContent("false");
  });

  it("stays ready for a signed-in seller, without redirecting", async () => {
    window.localStorage.setItem(
      "mb.users",
      JSON.stringify([{ id: "u1", phone: "+923001234567", password: "password1", role: "seller", displayName: "Store", sellerId: "s1" }])
    );
    window.localStorage.setItem("mb.session", JSON.stringify("u1"));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId("ready")).toHaveTextContent("true"));
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("redirects a signed-in customer (wrong role) to sign-in", async () => {
    window.localStorage.setItem(
      "mb.users",
      JSON.stringify([{ id: "u2", phone: "+923001234567", password: "password1", role: "customer", displayName: "Ayesha" }])
    );
    window.localStorage.setItem("mb.session", JSON.stringify("u2"));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalled());
  });
});
