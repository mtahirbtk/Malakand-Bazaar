import { z } from "zod";
import { paginationSchema, sanitizeText } from "../http/validate";

/**
 * Request shapes for reviews — §2.5 #31-34. `rating` is a plain 1-5 int (the
 * DB's `reviews_rating_chk` constraint is the same bound, this is the
 * friendly-error copy of it). `comment` is optional everywhere: a star rating
 * alone is a valid review.
 */

const commentSchema = z
  .string()
  .transform(sanitizeText)
  .pipe(z.string().max(1500, "Keep this under 1500 characters."))
  .optional()
  .transform((v) => (v === "" ? undefined : v));

export const createReviewSchema = z.object({
  rating: z.number().int().min(1, "Choose 1 to 5 stars.").max(5, "Choose 1 to 5 stars."),
  comment: commentSchema,
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: commentSchema,
  })
  .refine((v) => v.rating !== undefined || v.comment !== undefined, {
    message: "Nothing to update.",
  });
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

export const sellerReviewsQuerySchema = paginationSchema;
export type SellerReviewsQuery = z.infer<typeof sellerReviewsQuerySchema>;

export const myReviewsQuerySchema = paginationSchema;
export type MyReviewsQuery = z.infer<typeof myReviewsQuerySchema>;
