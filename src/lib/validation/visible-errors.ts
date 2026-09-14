/**
 * Narrows a Formik `errors` object down to the ones that should actually be
 * shown — i.e. the field has been touched (by typing, blurring, or a failed
 * submit marking it touched). Used to feed components that take a plain
 * `Record<string, string>` of field errors (e.g. FormField, SellerProfileFields)
 * from Formik state without repeating the touched-gate at every field.
 *
 * Loosely typed on purpose: Formik's own `FormikTouched<Values>`/
 * `FormikErrors<Values>` types a nested object field (e.g. `coordinates`) as
 * a nested touched/error shape rather than `boolean`/`string`, which this
 * helper doesn't care about — it only ever surfaces the string-valued (leaf)
 * errors, skipping anything else.
 */
export function visibleFieldErrors(
  touched: Record<string, unknown>,
  errors: Record<string, unknown>
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of Object.keys(errors)) {
    if (touched[key] && typeof errors[key] === "string") {
      result[key] = errors[key] as string;
    }
  }
  return result;
}
