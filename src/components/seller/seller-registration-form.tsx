"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/lib/auth/auth-context";
import { ApiClientError } from "@/lib/api-client";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FullscreenLoader } from "@/components/ui/fullscreen-loader";
import { useToast } from "@/components/ui/toast";
import { TurnstileWidget, turnstileEnabled } from "@/components/auth/turnstile-widget";
import { SellerProfileFields, MALAKAND_CENTER, type SellerProfileFieldsValue } from "./seller-profile-fields";

const INITIAL_FIELDS: SellerProfileFieldsValue = {
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
  const locale = useLocale();
  const { user, registerSeller } = useAuth();
  const { show } = useToast();
  const router = useRouter();

  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fields, setFields] = React.useState<SellerProfileFieldsValue>(INITIAL_FIELDS);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [turnstileToken, setTurnstileToken] = React.useState<string | null>(null);

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

  const needsAccountFields = !user;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setFieldErrors({});

    try {
      await registerSeller({
        ...(needsAccountFields
          ? { phone, password, turnstileToken: turnstileToken ?? undefined }
          : {}),
        storeName: fields.storeName,
        description: fields.description || undefined,
        storePhone: fields.storePhone,
        tehsilSlug: fields.tehsilSlug,
        localitySlug: fields.localitySlug,
        coordinates: fields.coordinates,
      });
      show({
        title: t("storefrontCreatedTitle"),
        description: t("storefrontCreatedDescription", { storeName: fields.storeName }),
        tone: "success",
      });
      router.push("/seller/dashboard/listings");
    } catch (caught) {
      if (caught instanceof ApiClientError) {
        setFieldErrors(caught.fields ?? {});
        setError(caught.fields && Object.keys(caught.fields).length ? null : caught.message);
      } else {
        setError(t("genericError"));
      }
      setPending(false);
    }
  }

  return (
    <form className="mx-auto max-w-2xl space-y-6" onSubmit={handleSubmit} noValidate>
      {pending && <FullscreenLoader label={t("submitting")} />}
      {needsAccountFields && (
        <div className="space-y-4 rounded-xl border border-surface-border bg-surface-low p-4">
          <FormField label={t("phoneLabel")} htmlFor="reg-phone" required error={fieldErrors.phone}>
            <PhoneInput
              id="reg-phone"
              autoComplete="tel"
              value={phone}
              invalid={Boolean(fieldErrors.phone)}
              onChange={(e) => setPhone(e.target.value)}
            />
          </FormField>
          <FormField
            label={t("passwordLabel")}
            htmlFor="reg-password"
            required
            hint={t("passwordHint")}
            error={fieldErrors.password}
          >
            <Input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>
        </div>
      )}

      <SellerProfileFields value={fields} onChange={setFields} showImages={false} errors={fieldErrors} />

      {needsAccountFields && <TurnstileWidget onToken={setTurnstileToken} locale={locale} />}

      {error && (
        <p role="alert" className="text-xs font-semibold text-danger">
          {error}
        </p>
      )}

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={pending || (needsAccountFields && turnstileEnabled() && !turnstileToken)}
        aria-busy={pending}
      >
        {pending ? t("submitting") : t("submitCta")}
      </Button>
    </form>
  );
}
