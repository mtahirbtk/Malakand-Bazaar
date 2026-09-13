"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/auth-context";
import { getSellerByIdOverlay, applyProfileFields, saveSeller } from "@/lib/mock-db/sellers";
import { findTehsil } from "@/data/tehsils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SellerProfileFields, type SellerProfileFieldsValue } from "./seller-profile-fields";
import type { Seller } from "@/types";

function toFieldsValue(seller: Seller): SellerProfileFieldsValue {
  const tehsil = findTehsil(seller.tehsilSlug);
  const locality = tehsil?.localities.find((l) => l.nameEn === seller.localityLabel);
  return {
    storeName: seller.name,
    description: seller.description ?? "",
    storePhone: seller.phone,
    tehsilSlug: seller.tehsilSlug,
    localitySlug: locality?.slug ?? tehsil?.localities[0]?.slug ?? "",
    coordinates: seller.coordinates ?? { lat: 34.5667, lng: 71.9333 },
    avatarUrl: seller.avatarUrl ?? "",
    storefrontBanner: seller.storefrontBanner ?? "",
  };
}

export function SellerProfileEditForm() {
  const t = useTranslations("sellerProfileEdit");
  const { user } = useAuth();
  const [seller, setSeller] = React.useState<Seller | null>(null);
  const [fields, setFields] = React.useState<SellerProfileFieldsValue | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (!user?.sellerId) return;
    const found = getSellerByIdOverlay(user.sellerId);
    if (found) {
      setSeller(found);
      setFields(toFieldsValue(found));
    }
  }, [user?.sellerId]);

  if (!seller || !fields) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!seller || !fields) return;
    const locality = findTehsil(fields.tehsilSlug)?.localities.find((l) => l.slug === fields.localitySlug);
    const updated = applyProfileFields(seller, {
      storeName: fields.storeName,
      description: fields.description,
      storePhone: fields.storePhone,
      tehsilSlug: fields.tehsilSlug,
      localityLabel: locality?.nameEn ?? seller.localityLabel,
      coordinates: fields.coordinates,
      avatarUrl: fields.avatarUrl || undefined,
      storefrontBanner: fields.storefrontBanner || undefined,
    });
    saveSeller(updated);
    setSeller(updated);
    setSaved(true);
  }

  return (
    <form className="max-w-2xl space-y-6" onSubmit={handleSubmit}>
      <Badge tone={seller.verified ? "green" : "sand"} icon={seller.verified ? "check_circle" : "hourglass_empty"}>
        {seller.verified ? t("verified") : t("pending")}
      </Badge>

      <SellerProfileFields value={fields} onChange={setFields} />

      {saved && <p className="text-xs font-semibold text-brand-700">{t("savedMessage")}</p>}

      <Button type="submit" size="lg">
        {t("saveCta")}
      </Button>
    </form>
  );
}
