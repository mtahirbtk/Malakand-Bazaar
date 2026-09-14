import * as Yup from "yup";
import { normalizePhone } from "@/lib/phone";

/** A next-intl `useTranslations("validation")` translator. */
type ValidationT = (key: string, values?: Record<string, string | number>) => string;

/**
 * Every phone field in this app stores the full "+92XXXXXXXXXX" value (see
 * PhoneInput) — validity means it normalizes, not just "non-empty".
 */
export function phoneSchema(t: ValidationT) {
  return Yup.string()
    .required(t("required"))
    .test("valid-phone", t("invalidPhone"), (value) => Boolean(value && normalizePhone(value)));
}

export function passwordSchema(t: ValidationT, min = 8) {
  return Yup.string()
    .required(t("required"))
    .min(min, t("passwordMin", { min }));
}

export function requiredString(t: ValidationT) {
  return Yup.string().required(t("required"));
}

/**
 * Price-style fields: stored as strings (native number input), must coerce to
 * a number >= 0. An empty string transforms to `undefined` rather than
 * `NaN` — otherwise an untouched optional field fails the number check
 * instead of just... being empty, and a required one reports "must be a
 * number" instead of "required".
 */
function numberField(t: ValidationT) {
  return Yup.number()
    .transform((value, originalValue) =>
      typeof originalValue === "string" && originalValue.trim() === "" ? undefined : value
    )
    .typeError(t("invalidNumber"))
    .min(0, t("minValue", { min: 0 }));
}

export function nonNegativeNumber(t: ValidationT) {
  return numberField(t);
}

export function requiredNonNegativeNumber(t: ValidationT) {
  return numberField(t).required(t("required"));
}
