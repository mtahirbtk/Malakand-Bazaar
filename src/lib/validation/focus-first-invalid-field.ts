/**
 * Focuses the first field (in DOM/tab order) named in `errors`, so a failed
 * submit lands the cursor on the field the user needs to fix instead of
 * leaving focus on the submit button.
 *
 * Takes a plain container + a name lookup rather than React refs per field —
 * every input in this app already renders a `name` matching its Formik key,
 * so one querySelector pass covers any form without per-field wiring.
 */
export function focusFirstInvalidField(container: HTMLElement | null, errors: Record<string, unknown>) {
  if (!container) return;
  const errorKeys = new Set(Object.keys(errors).filter((key) => errors[key]));
  if (errorKeys.size === 0) return;

  const fields = Array.from(container.querySelectorAll<HTMLElement>("[name]"));
  const target = fields.find((el) => errorKeys.has(el.getAttribute("name") ?? ""));
  target?.focus();
}
