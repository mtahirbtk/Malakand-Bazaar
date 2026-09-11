import { SELLERS } from "@/data/fixtures/sellers";
import type { Seller } from "@/types";

export function getSellerBySlug(slug: string): Seller | undefined {
  return SELLERS.find((seller) => seller.slug === slug);
}

export function getSellerById(id: string): Seller | undefined {
  return SELLERS.find((seller) => seller.id === id);
}
