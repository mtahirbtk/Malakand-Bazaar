"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/lib/mock-db/auth-context";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { findTehsil } from "@/data/tehsils";
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

export function SellerRegistrationForm() {
  const t = useTranslations("sellerRegistration");
  const { user, registerSeller } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fields, setFields] = React.useState<SellerProfileFieldsValue>(INITIAL_FIELDS);
  const [error, setError] = React.useState<string | null>(null);

  if (user?.role === "seller") {
    return (
      <EmptyState
        icon="storefront"
        title={t("alreadySellerTitle")}
        body={t("alreadySellerBody")}
        action={<Button onClick={() => router.push("/seller/dashboard/listings")}>{t("goToDashboardCta")}</Button>}
      />
    );
  }

  const needsAccountFields = !user || user.role !== "customer";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const locality = findTehsil(fields.tehsilSlug)?.localities.find((l) => l.slug === fields.localitySlug);
    const result = registerSeller({
      phone: needsAccountFields ? phone : user!.phone,
      password: needsAccountFields ? password : "",
      storeName: fields.storeName,
      description: fields.description,
      storePhone: fields.storePhone,
      tehsilSlug: fields.tehsilSlug,
      localitySlug: fields.localitySlug,
      localityLabel: locality?.nameEn ?? "",
      coordinates: fields.coordinates,
      avatarUrl: fields.avatarUrl || undefined,
      storefrontBanner: fields.storefrontBanner || undefined,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    router.push("/seller/dashboard/listings");
  }

  return (
    <form className="mx-auto max-w-2xl space-y-6" onSubmit={handleSubmit}>
      {needsAccountFields && (
        <div className="space-y-4 rounded-xl border border-surface-border bg-surface-low p-4">
          <FormField label={t("phoneLabel")} htmlFor="reg-phone" required>
            <Input id="reg-phone" leadingIcon="call" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </FormField>
          <FormField label={t("passwordLabel")} htmlFor="reg-password" required hint={t("passwordHint")}>
            <Input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </FormField>
        </div>
      )}

      <SellerProfileFields value={fields} onChange={setFields} />

      {error && (
        <p role="alert" className="text-xs font-semibold text-danger">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full">
        {t("submitCta")}
      </Button>
    </form>
  );
}
