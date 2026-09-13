import { z } from "zod";
import { booleanish, numeric, paginationSchema, slugSchema } from "../http/validate";

/**
 * Request shapes for /api/listings*.
 */

export const SORT_OPTIONS = [
  "featured",
  "relevant",
  "price_low",
  "price_high",
  "date_new",
  "date_old",
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

/** `tehsil` arrives as one value, a comma list, or a repeated query key. */
const tehsilListSchema = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    const raw = Array.isArray(value) ? value : value.split(",");
    const cleaned = raw.map((v) => v.trim()).filter(Boolean);
    return cleaned.length ? cleaned : undefined;
  });

export const searchListingsQuerySchema = z
  .object({
    q: z
      .string()
      .max(200)
      .optional()
      .transform((v) => (v?.trim() ? v.trim() : undefined)),
    category: slugSchema.optional(),
    subcategory: slugSchema.optional(),
    tehsil: tehsilListSchema,
    locality: slugSchema.optional(),
    minPrice: numeric({ min: 0 }).optional(),
    maxPrice: numeric({ min: 0 }).optional(),
    verifiedOnly: booleanish.optional().default(false),
    availability: z.enum(["active", "all"]).default("active"),
    sellerId: z.string().uuid().optional(),
    sort: z.enum(SORT_OPTIONS).default("relevant"),
  })
  .merge(paginationSchema)
  .refine((v) => v.minPrice === undefined || v.maxPrice === undefined || v.minPrice <= v.maxPrice, {
    message: "Minimum price must not be greater than the maximum.",
    path: ["minPrice"],
  });

export type SearchListingsQuery = z.infer<typeof searchListingsQuerySchema>;

export const suggestListingsQuerySchema = z.object({
  q: z.string().min(1, "Type something to search for.").max(200),
  limit: numeric({ min: 1, max: 8, int: true }).default(8),
});

export type SuggestListingsQuery = z.infer<typeof suggestListingsQuerySchema>;

export const contactClickSchema = z.object({
  channel: z.enum(["whatsapp", "call", "copy"]),
});

export type ContactClickInput = z.infer<typeof contactClickSchema>;
