import { z } from "zod";
import { normalizePhone } from "@/lib/phone";
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "../auth/password";
import { text, optionalText } from "../http/validate";

/**
 * Request shapes for /api/auth/*.
 *
 * The phone field normalises on the way in, so every layer below this sees
 * E.164 and only E.164 — the same normaliser the UI uses, running again on the
 * server because client-side validation is a convenience, not a control.
 */

export const phoneSchema = z
  .string()
  .min(1, "Enter your mobile number.")
  .transform((value, ctx) => {
    const normalized = normalizePhone(value);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "Enter a valid Pakistani mobile number." });
      return z.NEVER;
    }
    return normalized;
  });

/**
 * Length only, per docs/decisions.md: composition rules increase forgetting,
 * and with no reset channel at launch a forgotten password is unrecoverable.
 */
export const passwordSchema = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`)
  .max(MAX_PASSWORD_LENGTH, "That password is too long.");

export const signupSchema = z.object({
  phone: phoneSchema,
  password: passwordSchema,
  displayName: text(2, 60),
  turnstileToken: z.string().max(4096).optional(),
});

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Enter your password.").max(MAX_PASSWORD_LENGTH),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password.").max(MAX_PASSWORD_LENGTH),
  newPassword: passwordSchema,
});

export const updateProfileSchema = z
  .object({
    displayName: text(2, 60).optional(),
    recoveryEmail: z
      .union([z.literal(""), z.string().email("Enter a valid email address.").max(160)])
      .optional()
      .transform((v) => (v === "" ? null : v)),
  })
  .refine((v) => v.displayName !== undefined || v.recoveryEmail !== undefined, {
    message: "Nothing to update.",
  });

export const phoneAvailableSchema = z.object({ phone: phoneSchema });

export const registerSellerSchema = z.object({
  // Only used when the caller is not already signed in.
  phone: phoneSchema.optional(),
  password: passwordSchema.optional(),
  turnstileToken: z.string().max(4096).optional(),

  storeName: text(2, 80),
  description: optionalText(2000),
  storePhone: phoneSchema,
  tehsilSlug: z.string().min(1).max(60),
  localitySlug: z.string().min(1).max(60),
  coordinates: z
    .object({
      // Bounds are Pakistan's, so a mis-wired map cannot drop a store in the sea.
      lat: z.number().min(23).max(38),
      lng: z.number().min(60).max(78),
    })
    .optional(),
  avatarPath: z.string().max(300).optional(),
  bannerPath: z.string().max(300).optional(),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterSellerInput = z.infer<typeof registerSellerSchema>;
