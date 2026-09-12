import { describe, it, expect, beforeEach } from "vitest";
import { login, signupCustomer, registerSeller, logout, getCurrentUser } from "./auth";
import { getSellerBySlugOverlay } from "./sellers";

const SELLER_INPUT = {
  phone: "3211234567",
  password: "supersecret",
  storeName: "Green Valley Traders",
  description: "Fresh produce and dry goods.",
  storePhone: "3211234567",
  tehsilSlug: "batkhela" as const,
  localitySlug: "batkhela-city",
  localityLabel: "Batkhela City & Bazaar",
  coordinates: { lat: 34.6167, lng: 71.9333 },
};

describe("mock-db auth", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("signs up a customer and starts a session", () => {
    const result = signupCustomer("3001234567", "password1", "Ayesha");
    expect(result.ok).toBe(true);
    expect(getCurrentUser()?.role).toBe("customer");
  });

  it("rejects a password under 8 characters", () => {
    const result = signupCustomer("3001234567", "short", "Ayesha");
    expect(result.ok).toBe(false);
  });

  it("rejects signing up the same phone twice", () => {
    signupCustomer("3001234567", "password1", "Ayesha");
    const second = signupCustomer("3001234567", "password2", "Ayesha Again");
    expect(second.ok).toBe(false);
  });

  it("logs in with the correct phone and password", () => {
    signupCustomer("3001234567", "password1", "Ayesha");
    logout();
    const result = login("3001234567", "password1");
    expect(result.ok).toBe(true);
    expect(getCurrentUser()?.displayName).toBe("Ayesha");
  });

  it("rejects login with the wrong password", () => {
    signupCustomer("3001234567", "password1", "Ayesha");
    logout();
    const result = login("3001234567", "wrongpass");
    expect(result.ok).toBe(false);
  });

  it("logs out and clears the session", () => {
    signupCustomer("3001234567", "password1", "Ayesha");
    logout();
    expect(getCurrentUser()).toBeNull();
  });

  it("registers a brand-new seller account", () => {
    const result = registerSeller(SELLER_INPUT);
    expect(result.ok).toBe(true);
    const user = getCurrentUser();
    expect(user?.role).toBe("seller");
    expect(getSellerBySlugOverlay("green-valley-traders")?.verified).toBe(false);
  });

  it("upgrades the currently signed-in customer to a seller", () => {
    signupCustomer("3001234567", "password1", "Ayesha");
    const result = registerSeller({ ...SELLER_INPUT, phone: "", password: "" });
    expect(result.ok).toBe(true);
    expect(getCurrentUser()?.phone).toBe("+923001234567");
    expect(getCurrentUser()?.role).toBe("seller");
  });
});
