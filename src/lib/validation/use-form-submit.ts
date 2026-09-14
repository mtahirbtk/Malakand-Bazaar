import * as React from "react";
import type { FormikErrors, FormikTouched } from "formik";
import { ApiClientError } from "@/lib/api-client";
import { focusFirstInvalidField } from "./focus-first-invalid-field";

function touchAll<Values>(keys: string[]): FormikTouched<Values> {
  // A flat `{ [key]: true }` map is all Formik actually needs at runtime —
  // FormikTouched<Values> only requires that shape for nested object fields,
  // none of which this app validates from here (see visibleFieldErrors' note).
  return keys.reduce<Record<string, boolean>>((acc, key) => {
    acc[key] = true;
    return acc;
  }, {}) as FormikTouched<Values>;
}

/**
 * The subset of Formik's `FormikProps` this hook drives. Typed by hand
 * rather than `Pick<FormikProps<Values>, ...>` so a plain
 * `Record<string, boolean>` touched-map (built generically from whatever
 * keys errored) can be passed to `setTouched` without fighting
 * `FormikTouched<Values>`'s nested-object shape for fields like
 * `coordinates`.
 */
type FormikSubset<Values> = {
  values: Values;
  validateForm: () => Promise<FormikErrors<Values>>;
  setTouched: (touched: FormikTouched<Values>, shouldValidate?: boolean) => void;
  setErrors: (errors: FormikErrors<Values>) => void;
  setSubmitting: (isSubmitting: boolean) => void;
};

/**
 * The submit pattern shared by every form in this app: validate with Yup
 * before calling the API (not as-you-type — see the forms using this), send
 * a server field-error back under the field the API named, and autofocus the
 * first invalid field either way. Each form still owns its own API call and
 * its own success side effects (toast, redirect) via `action`.
 */
export function useFormSubmit<Values extends object>(
  formik: FormikSubset<Values>,
  formRef: React.RefObject<HTMLFormElement | null>,
  action: (values: Values) => Promise<void>,
  setTopError: (message: string | null) => void,
  genericErrorMessage: string
) {
  return React.useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setTopError(null);

      const errors = await formik.validateForm();
      if (Object.keys(errors).length > 0) {
        formik.setTouched(touchAll<Values>(Object.keys(errors)), false);
        focusFirstInvalidField(formRef.current, errors);
        return;
      }

      formik.setSubmitting(true);
      try {
        await action(formik.values);
      } catch (caught) {
        if (caught instanceof ApiClientError) {
          const fields = caught.fields ?? {};
          if (Object.keys(fields).length > 0) {
            formik.setErrors(fields as FormikErrors<Values>);
            formik.setTouched(touchAll<Values>(Object.keys(fields)), false);
            focusFirstInvalidField(formRef.current, fields);
          } else {
            setTopError(caught.message);
          }
        } else {
          setTopError(genericErrorMessage);
        }
      } finally {
        formik.setSubmitting(false);
      }
    },
    [formik, formRef, action, setTopError, genericErrorMessage]
  );
}
