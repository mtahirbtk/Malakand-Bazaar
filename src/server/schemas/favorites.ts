import { z } from "zod";
import { uuidSchema } from "../http/validate";

export const addFavoriteSchema = z.object({ listingId: uuidSchema });
export type AddFavoriteInput = z.infer<typeof addFavoriteSchema>;
