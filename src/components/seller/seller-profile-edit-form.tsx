"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { api, ApiClientError } from "@/lib/api-client";
import { findTehsil } from "@/data/tehsils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { SellerProfileFields, MALAKAND_CENTER, type SellerProfileFieldsValue } from "./seller-profile-fields";

/** GET /api/seller/me's shape — see SellerPrivateSummary in src/server/services/sellers.ts. */
type SellerRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  phone: string;
  tehsilSlug: string | null;
  localitySlug: string | null;
  localityLabel: string | null;
  coordinates: { lat: number; lng: number } | null;
  verified: boolean;
  ratingAvg: number;
  ratingCount: number;
  listingCount: number;
  avatarPath: string | null;
  bannerPath: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
};

function toFieldsValue(seller: SellerRecord): SellerProfileFieldsValue {
  return {
    storeName: seller.name,
    description: seller.description ?? "",
    storePhone: seller.phone,
    tehsilSlug: (seller.tehsilSlug ?? "batkhela") as SellerProfileFieldsValue["tehsilSlug"],
    localitySlug: seller.localitySlug ?? "",
    coordinates: seller.coordinates ?? MALAKAND_CENTER,
    avatarUrl: seller.avatarUrl ?? "",
    storefrontBanner: seller.bannerUrl ?? "",
  };
}

export function SellerProfileEditForm() {
  const t = useTranslations("sellerProfileEdit");
  const common = useTranslations("common");
  const [seller, setSeller] = React.useState<SellerRecord | null>(null);
  const [fields, setFields] = React.useState<SellerProfileFieldsValue | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    let cancelled = false;
    api
      .get<{ seller: SellerRecord }>("/api/seller/me")
      .then(({ seller: found }) => {
        if (cancelled) return;
        setSeller(found);
        setFields(toFieldsValue(found));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiClientError ? err.message : common("genericError"));
      });
    return () => {
      cancelled = true;
    };
  }, [common]);

  if (error && !seller) {
    return (
      <p role="alert" className="text-sm font-semibold text-danger">
        {error}
      </p>
    );
  }
  if (!seller || !fields) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fields) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    setFieldErrors({});

    const locality = findTehsil(fields.tehsilSlug)?.localities.find((l) => l.slug === fields.localitySlug);

    try {
      const { seller: updated } = await api.patch<{ seller: SellerRecord }>("/api/seller/me", {
        storeName: fields.storeName,
        description: fields.description,
        storePhone: fields.storePhone,
        tehsilSlug: fields.tehsilSlug,
        localitySlug: locality?.slug ?? fields.localitySlug,
        coordinates: fields.coordinates,
        // Only sent when actually touched — see SellerProfileFieldsValue's
        // doc comment on why undefined and "" mean different things here.
        ...(fields.avatarPath !== undefined ? { avatarPath: fields.avatarPath } : {}),
        ...(fields.bannerPath !== undefined ? { bannerPath: fields.bannerPath } : {}),
      });
      setSeller(updated);
      setFields(toFieldsValue(updated));
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
        setFieldErrors(err.fields ?? {});
      } else {
        setError(common("genericError"));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="max-w-2xl space-y-6" onSubmit={handleSubmit}>
      <Badge tone={seller.verified ? "green" : "sand"} icon={seller.verified ? "check_circle" : "hourglass_empty"}>
        {seller.verified ? t("verified") : t("pending")}
      </Badge>

      <SellerProfileFields value={fields} onChange={setFields} errors={fieldErrors} />

      {error && (
        <p role="alert" className="text-xs font-semibold text-danger">
          {error}
        </p>
      )}
      {saved && !error && <p className="text-xs font-semibold text-brand-700">{t("savedMessage")}</p>}

      <Button type="submit" size="lg" disabled={saving} aria-busy={saving}>
        {saving ? <Spinner size="sm" tone="onBrand" /> : t("saveCta")}
      </Button>
    </form>
  );
}
