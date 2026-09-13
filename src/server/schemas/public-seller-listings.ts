import { z } from "zod";
import { paginationSchema } from "../http/validate";

/** GET /api/sellers/:slug/listings — §2.4 #28. */
export const publicSellerListingsQuerySchema = z
  .object({
    status: z.enum(["active", "reserved", "sold"]).default("active"),
    sort: z.enum(["newest", "price_low", "price_high"]).default("newest"),
  })
  .merge(paginationSchema);
export type PublicSellerListingsQuery = z.infer<typeof publicSellerListingsQuerySchema>;
