"use client";

import * as React from "react";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/lib/auth/auth-context";
import { getListingByIdOverlay, saveListing } from "@/lib/mock-db/listings";
import { findTehsil } from "@/data/tehsils";
import { ListingForm, type ListingFormValue } from "@/components/seller/listing-form";
import type { Listing } from "@/types";

function toFormValue(listing: Listing): ListingFormValue {
  return {
    title: listing.title,
    description: listing.description,
    price: String(listing.price),
    compareAtPrice: listing.compareAtPrice ? String(listing.compareAtPrice) : "",
    categorySlug: listing.categorySlug,
    subcategorySlug: listing.subcategorySlug,
    tehsilSlug: listing.tehsilSlug,
    localitySlug: listing.localitySlug,
    images: listing.images,
    contactPhone: listing.contactPhone,
  };
}

export default function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const t = useTranslations("sellerListingForm");
  const { user } = useAuth();
  const router = useRouter();
  const [listing, setListing] = React.useState<Listing | null>(null);
  const [value, setValue] = React.useState<ListingFormValue | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notFoundTriggered, setNotFoundTriggered] = React.useState(false);

  React.useEffect(() => {
    if (!user?.sellerId) return;
    const found = getListingByIdOverlay(id);
    if (!found || found.sellerId !== user.sellerId) {
      setNotFoundTriggered(true);
      return;
    }
    setListing(found);
    setValue(toFormValue(found));
  }, [id, user?.sellerId]);

  if (notFoundTriggered) {
    notFound();
    return null;
  }
  if (!listing || !value) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(value!.price);
    if (!value!.title.trim() || Number.isNaN(price) || price <= 0) {
      setError(t("invalidPriceError"));
      return;
    }
    const locality = findTehsil(value!.tehsilSlug)?.localities.find((l) => l.slug === value!.localitySlug);
    saveListing({
      ...listing!,
      title: value!.title,
      description: value!.description,
      price,
      compareAtPrice: value!.compareAtPrice ? Number(value!.compareAtPrice) : undefined,
      categorySlug: value!.categorySlug,
      subcategorySlug: value!.subcategorySlug,
      tehsilSlug: value!.tehsilSlug,
      localitySlug: value!.localitySlug,
      localityLabel: locality?.nameEn ?? listing!.localityLabel,
      images: value!.images,
      contactPhone: value!.contactPhone,
    });
    router.push("/seller/dashboard/listings");
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-extrabold tracking-tight text-on-surface">{t("editPageTitle")}</h2>
      <ListingForm value={value} onChange={setValue} onSubmit={handleSubmit} submitLabel={t("saveCta")} error={error} />
    </div>
  );
}
