import { z } from "zod";
import { booleanish, numeric, paginationSchema, slugSchema } from "../http/validate";

/** Public sellers directory — §2.4 #26, #30. */

export const sellersDirectoryQuerySchema = z
  .object({
    tehsil: slugSchema.optional(),
    category: slugSchema.optional(),
    verifiedOnly: booleanish.default(false),
    q: z
      .string()
      .max(200)
      .optional()
      .transform((v) => (v?.trim() ? v.trim() : undefined)),
    sort: z.enum(["rating", "newest", "listings"]).default("rating"),
  })
  .merge(paginationSchema);
export type SellersDirectoryQuery = z.infer<typeof sellersDirectoryQuerySchema>;

export const topSellersQuerySchema = z.object({
  limit: numeric({ min: 1, max: 12, int: true }).default(8),
});
export type TopSellersQuery = z.infer<typeof topSellersQuerySchema>;
