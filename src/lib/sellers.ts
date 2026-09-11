import { SELLERS, findSeller } from "@/data/fixtures/sellers";
import type { Seller } from "@/types";

export function getSellerBySlug(slug: string): Seller | undefined {
  return SELLERS.find((seller) => seller.slug === slug);
}

export const getSellerById = findSeller;
