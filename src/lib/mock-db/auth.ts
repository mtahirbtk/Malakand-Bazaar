import { readStore, writeStore, makeId } from "./store";
import { saveSeller, generateSellerSlug, initialsFrom } from "./sellers";
import { normalizePhone } from "@/lib/phone";
import type { Seller, User } from "@/types";

export type AuthResult = { ok: true; user: User } | { ok: false; error: string };

export type RegisterSellerInput = {
  /** Ignored when the caller is already signed in as a customer. */
  phone: string;
  /** Ignored when the caller is already signed in as a customer. */
  password: string;
  storeName: string;
  description: string;
  storePhone: string;
  tehsilSlug: Seller["tehsilSlug"];
  localitySlug: string;
  localityLabel: string;
  coordinates: { lat: number; lng: number };
  avatarUrl?: string;
  storefrontBanner?: string;
};

export type RegisterSellerResult = { ok: true; seller: Seller } | { ok: false; error: string };

function getUsers(): User[] {
  return readStore<User[]>("mb.users", []);
}

function saveUsers(users: User[]): void {
  writeStore("mb.users", users);
}

function getSessionUserId(): string | null {
  return readStore<string | null>("mb.session", null);
}

function setSessionUserId(id: string | null): void {
  writeStore("mb.session", id);
}

export function getCurrentUser(): User | null {
  const id = getSessionUserId();
  if (!id) return null;
  return getUsers().find((u) => u.id === id) ?? null;
}

export function login(phoneInput: string, password: string): AuthResult {
  const phone = normalizePhone(phoneInput);
  if (!phone) return { ok: false, error: "Enter a valid Pakistani mobile number." };
  const user = getUsers().find((u) => u.phone === phone);
  if (!user || user.password !== password) {
    return { ok: false, error: "Phone number or password is incorrect." };
  }
  setSessionUserId(user.id);
  return { ok: true, user };
}

export function signupCustomer(phoneInput: string, password: string, displayName: string): AuthResult {
  const phone = normalizePhone(phoneInput);
  if (!phone) return { ok: false, error: "Enter a valid Pakistani mobile number." };
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  const users = getUsers();
  if (users.some((u) => u.phone === phone)) {
    return { ok: false, error: "This phone number is already registered." };
  }
  const user: User = {
    id: makeId("u"),
    phone,
    password,
    role: "customer",
    displayName: displayName.trim() || "MalakandBazaar Customer",
  };
  saveUsers([...users, user]);
  setSessionUserId(user.id);
  return { ok: true, user };
}

export function logout(): void {
  setSessionUserId(null);
}

export function registerSeller(input: RegisterSellerInput): RegisterSellerResult {
  const current = getCurrentUser();
  let user: User;

  if (current && current.role === "customer") {
    user = current;
  } else {
    const phone = normalizePhone(input.phone);
    if (!phone) return { ok: false, error: "Enter a valid Pakistani mobile number." };
    if (input.password.length < 8) {
      return { ok: false, error: "Password must be at least 8 characters." };
    }
    const users = getUsers();
    if (users.some((u) => u.phone === phone)) {
      return { ok: false, error: "This phone number is already registered." };
    }
    user = { id: makeId("u"), phone, password: input.password, role: "customer", displayName: input.storeName };
    saveUsers([...users, user]);
  }

  if (!input.storeName.trim()) return { ok: false, error: "Store name is required." };
  const storePhone = normalizePhone(input.storePhone);
  if (!storePhone) return { ok: false, error: "Enter a valid store contact number." };

  const seller: Seller = {
    id: makeId("s"),
    slug: generateSellerSlug(input.storeName),
    name: input.storeName,
    initials: initialsFrom(input.storeName),
    tehsilSlug: input.tehsilSlug,
    localityLabel: input.localityLabel,
    rating: 0,
    reviewCount: 0,
    verified: false,
    responseMinutes: 30,
    specialty: input.description.slice(0, 60),
    statLabel: "Listings",
    statValue: "0",
    phone: storePhone,
    description: input.description,
    avatarUrl: input.avatarUrl,
    storefrontBanner: input.storefrontBanner,
    coordinates: input.coordinates,
  };
  saveSeller(seller);

  const updatedUser: User = { ...user, role: "seller", sellerId: seller.id, displayName: input.storeName };
  const users = getUsers();
  const index = users.findIndex((u) => u.id === user.id);
  if (index === -1) users.push(updatedUser);
  else users[index] = updatedUser;
  saveUsers(users);
  setSessionUserId(updatedUser.id);

  return { ok: true, seller };
}
