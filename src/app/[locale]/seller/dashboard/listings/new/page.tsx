"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/lib/mock-db/auth-context";
import { saveListing, createListingId, generateListingSlug } from "@/lib/mock-db/listings";
import { getSellerByIdOverlay } from "@/lib/mock-db/sellers";
import { CATEGORIES } from "@/data/categories";
import { findTehsil } from "@/data/tehsils";
import { ListingForm, type ListingFormValue } from "@/components/seller/listing-form";

const DEFAULT_CATEGORY = CATEGORIES[0];

const INITIAL_VALUE: ListingFormValue = {
  title: "",
  description: "",
  price: "",
  compareAtPrice: "",
  categorySlug: DEFAULT_CATEGORY.slug,
  subcategorySlug: DEFAULT_CATEGORY.subcategories[0]?.slug ?? "",
  tehsilSlug: "batkhela",
  localitySlug: "batkhela-city",
  images: [],
  contactPhone: "",
};

export default function NewListingPage() {
  const t = useTranslations("sellerListingForm");
  const { user } = useAuth();
  const router = useRouter();
  const [value, setValue] = React.useState<ListingFormValue>(INITIAL_VALUE);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user?.sellerId) return;
    const seller = getSellerByIdOverlay(user.sellerId);
    if (seller) setValue((v) => (v.contactPhone ? v : { ...v, contactPhone: seller.phone }));
  }, [user?.sellerId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(value.price);
    if (!user?.sellerId || !value.title.trim() || Number.isNaN(price) || price <= 0) {
      setError(t("invalidPriceError"));
      return;
    }
    const locality = findTehsil(value.tehsilSlug)?.localities.find((l) => l.slug === value.localitySlug);
    saveListing({
      id: createListingId(),
      slug: generateListingSlug(value.title),
      title: value.title,
      description: value.description,
      price,
      compareAtPrice: value.compareAtPrice ? Number(value.compareAtPrice) : undefined,
      categorySlug: value.categorySlug,
      subcategorySlug: value.subcategorySlug,
      tehsilSlug: value.tehsilSlug,
      localitySlug: value.localitySlug,
      localityLabel: locality?.nameEn ?? "",
      images: value.images,
      contactPhone: value.contactPhone,
      sellerId: user.sellerId,
      status: "active",
      createdAt: new Date().toISOString(),
    });
    router.push("/seller/dashboard/listings");
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-extrabold tracking-tight text-on-surface">{t("newPageTitle")}</h2>
      <ListingForm value={value} onChange={setValue} onSubmit={handleSubmit} submitLabel={t("createCta")} error={error} />
    </div>
  );
}
