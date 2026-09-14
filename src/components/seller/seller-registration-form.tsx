"use client";

import * as React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/lib/auth/auth-context";
import { phoneSchema, passwordSchema, requiredString } from "@/lib/validation/schemas";
import { useFormSubmit } from "@/lib/validation/use-form-submit";
import { visibleFieldErrors } from "@/lib/validation/visible-errors";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FullscreenLoader } from "@/components/ui/fullscreen-loader";
import { useToast } from "@/components/ui/toast";
import { TurnstileWidget, turnstileEnabled } from "@/components/auth/turnstile-widget";
import { SellerProfileFields, MALAKAND_CENTER, type SellerProfileFieldsValue } from "./seller-profile-fields";

type RegistrationValues = { phone: string; password: string } & SellerProfileFieldsValue;

const INITIAL_VALUES: RegistrationValues = {
  phone: "",
  password: "",
  storeName: "",
  description: "",
  storePhone: "",
  tehsilSlug: "batkhela",
  localitySlug: "batkhela-city",
  coordinates: MALAKAND_CENTER,
  avatarUrl: "",
  storefrontBanner: "",
};

/**
 * Register a storefront.
 *
 * Serves both entry points from one form: a signed-in customer upgrading, and
 * a new visitor creating an account and a store together. Which fields show is
 * the only difference; the server handles both in one call.
 *
 * Storefront images are not offered here yet — the upload pipeline lands with
 * the seller workspace. Showing a picker that silently discarded the file would
 * be worse than not showing one.
 */
export function SellerRegistrationForm() {
  const t = useTranslations("sellerRegistration");
  const v = useTranslations("validation");
  const locale = useLocale();
  const { user, registerSeller } = useAuth();
  const { show } = useToast();
  const router = useRouter();

  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(null);
  const [topError, setTopError] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  const needsAccountFields = !user;

  const formik = useFormik<RegistrationValues>({
    initialValues: INITIAL_VALUES,
    validationSchema: Yup.object({
      ...(needsAccountFields ? { phone: phoneSchema(v), password: passwordSchema(v) } : {}),
      storeName: requiredString(v),
      storePhone: phoneSchema(v),
    }),
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: () => {},
  });

  const handleSubmit = useFormSubmit(
    formik,
    formRef,
    async (values) => {
      await registerSeller({
        ...(needsAccountFields
          ? { phone: values.phone, password: values.password, turnstileToken: turnstileToken ?? undefined }
          : {}),
        storeName: values.storeName,
        description: values.description || undefined,
        storePhone: values.storePhone,
        tehsilSlug: values.tehsilSlug,
        localitySlug: values.localitySlug,
        coordinates: values.coordinates,
      });
      show({
        title: t("storefrontCreatedTitle"),
        description: t("storefrontCreatedDescription", { storeName: values.storeName }),
        tone: "success",
      });
      router.push("/seller/dashboard/listings");
    },
    setTopError,
    t("genericError")
  );

  if (user?.role === "seller") {
    return (
      <EmptyState
        icon="storefront"
        title={t("alreadySellerTitle")}
        body={t("alreadySellerBody")}
        action={
          <Button onClick={() => router.push("/seller/dashboard/listings")}>{t("goToDashboardCta")}</Button>
        }
      />
    );
  }

  return (
    <form ref={formRef} className="mx-auto max-w-2xl space-y-6" onSubmit={handleSubmit} noValidate>
      {formik.isSubmitting && <FullscreenLoader label={t("submitting")} />}
      {needsAccountFields && (
        <div className="space-y-4 rounded-xl border border-surface-border bg-surface-low p-4">
          <FormField
            label={t("phoneLabel")}
            htmlFor="reg-phone"
            required
            error={formik.touched.phone ? formik.errors.phone : undefined}
          >
            <PhoneInput
              id="reg-phone"
              name="phone"
              autoComplete="tel"
              value={formik.values.phone}
              invalid={Boolean(formik.touched.phone && formik.errors.phone)}
              onChange={(e) => formik.setFieldValue("phone", e.target.value)}
            />
          </FormField>
          <FormField
            label={t("passwordLabel")}
            htmlFor="reg-password"
            required
            hint={t("passwordHint")}
            error={formik.touched.password ? formik.errors.password : undefined}
          >
            <Input
              id="reg-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={formik.values.password}
              invalid={Boolean(formik.touched.password && formik.errors.password)}
              onChange={(e) => formik.setFieldValue("password", e.target.value)}
            />
          </FormField>
        </div>
      )}

      <SellerProfileFields
        value={formik.values}
        onChange={(next) => formik.setValues({ ...formik.values, ...next })}
        showImages={false}
        errors={visibleFieldErrors(formik.touched, formik.errors)}
      />

      {needsAccountFields && <TurnstileWidget onToken={setTurnstileToken} locale={locale} />}

      {topError && (
        <p role="alert" className="text-xs font-semibold text-danger">
          {topError}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={formik.isSubmitting || (needsAccountFields && turnstileEnabled() && !turnstileToken)}
        aria-busy={formik.isSubmitting}
      >
        {formik.isSubmitting ? t("submitting") : t("submitCta")}
      </Button>
    </form>
  );
}
