import { CATEGORIES } from "@/data/categories";

/**
 * Client-safe pieces of the search feature: sort vocabulary and taxonomy
 * label lookups. The actual filtering/pagination/facets live server-side now
 * (`server/schemas/listings.ts`, `server/services/listings.ts`,
 * `fn_search_listings`) — this file exists so client components (the search
 * box, the filter sidebar, the sort select) don't have to import a
 * server-only module just to render an option list.
 */

export type SortOption = "featured" | "relevant" | "price_low" | "price_high" | "date_new" | "date_old";

export const SORT_OPTIONS: SortOption[] = [
  "featured",
  "relevant",
  "price_low",
  "price_high",
  "date_new",
  "date_old",
];

export function categoryLabel(slug: string): string | undefined {
  return CATEGORIES.find((c) => c.slug === slug)?.nameEn;
}

export function subcategoryLabel(slug: string): string | undefined {
  for (const category of CATEGORIES) {
    const match = category.subcategories.find((s) => s.slug === slug);
    if (match) return match.nameEn;
  }
  return undefined;
}
