import { SELLERS, findSeller } from "@/data/fixtures/sellers";
import { readStore, writeStore } from "./store";
import type { Seller } from "@/types";

export type ProfileFieldsPatch = {
  storeName: string;
  description: string;
  storePhone: string;
  tehsilSlug: Seller["tehsilSlug"];
  localityLabel: string;
  coordinates: { lat: number; lng: number };
  avatarUrl?: string;
  storefrontBanner?: string;
};

export function initialsFrom(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return (words[0]?.[0] ?? "").toUpperCase() || "SL";
  }
  return ((words[0]?.[0] ?? "") + (words[2]?.[0] ?? words[1]?.[0] ?? "")).toUpperCase() || "SL";
}

export function applyProfileFields(seller: Seller, fields: ProfileFieldsPatch): Seller {
  return {
    ...seller,
    name: fields.storeName,
    initials: initialsFrom(fields.storeName),
    description: fields.description,
    phone: fields.storePhone,
    tehsilSlug: fields.tehsilSlug,
    localityLabel: fields.localityLabel,
    coordinates: fields.coordinates,
    avatarUrl: fields.avatarUrl,
    storefrontBanner: fields.storefrontBanner,
  };
}

function getStoredSellers(): Seller[] {
  return readStore<Seller[]>("mb.sellers", []);
}

export function saveSeller(seller: Seller): void {
  const sellers = getStoredSellers();
  const index = sellers.findIndex((s) => s.id === seller.id);
  if (index === -1) sellers.push(seller);
  else sellers[index] = seller;
  writeStore("mb.sellers", sellers);
}

export function getSellerBySlugOverlay(slug: string): Seller | undefined {
  return SELLERS.find((s) => s.slug === slug) ?? getStoredSellers().find((s) => s.slug === slug);
}

export function getSellerByIdOverlay(id: string): Seller | undefined {
  return findSeller(id) ?? getStoredSellers().find((s) => s.id === id);
}

export function generateSellerSlug(storeName: string): string {
  const base =
    storeName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "store";
  const taken = new Set([...SELLERS, ...getStoredSellers()].map((s) => s.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
