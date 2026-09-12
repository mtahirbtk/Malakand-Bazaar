import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "./auth-context";

function Probe() {
  const { user, ready, login, signupCustomer, logout } = useAuth();
  return (
    <div>
      <p data-testid="ready">{String(ready)}</p>
      <p data-testid="user">{user ? user.displayName : "none"}</p>
      <button onClick={() => signupCustomer("3001234567", "password1", "Ayesha")}>signup</button>
      <button onClick={() => login("3001234567", "password1")}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("becomes ready with no user when nothing is stored", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId("ready")).toHaveTextContent("true"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  it("updates the user after signup, and clears it after logout", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await userEvent.click(screen.getByText("signup"));
    expect(screen.getByTestId("user")).toHaveTextContent("Ayesha");
    await userEvent.click(screen.getByText("logout"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });
});
