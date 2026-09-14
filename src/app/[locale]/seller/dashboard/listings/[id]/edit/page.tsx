"use client";

import * as React from "react";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { api, ApiClientError } from "@/lib/api-client";
import { ListingForm, type ListingFormValue } from "@/components/seller/listing-form";
import { ListingImageManager } from "@/components/seller/listing-image-manager";
import { Spinner } from "@/components/ui/spinner";
import type { ListingImage } from "@/types";

/** GET /api/seller/listings/:id's shape — see SellerListingDetail in src/server/services/seller-listings.ts. */
type SellerListingDetail = {
  id: string;
  title: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  categorySlug: string;
  subcategorySlug: string;
  tehsilSlug: ListingFormValue["tehsilSlug"];
  localitySlug: string;
  contactPhone: string;
  imageDetails: ListingImage[];
};

function toFormValue(listing: SellerListingDetail): ListingFormValue {
  return {
    title: listing.title,
    description: listing.description,
    price: String(listing.price),
    compareAtPrice: listing.compareAtPrice ? String(listing.compareAtPrice) : "",
    categorySlug: listing.categorySlug,
    subcategorySlug: listing.subcategorySlug,
    tehsilSlug: listing.tehsilSlug,
    localitySlug: listing.localitySlug,
    contactPhone: listing.contactPhone,
  };
}

export default function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const t = useTranslations("sellerListingForm");
  const common = useTranslations("common");
  const router = useRouter();
  const [value, setValue] = React.useState<ListingFormValue | null>(null);
  const [images, setImages] = React.useState<ListingImage[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [loadFailed, setLoadFailed] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    api
      .get<{ listing: SellerListingDetail }>(`/api/seller/listings/${id}`)
      .then(({ listing }) => {
        if (cancelled) return;
        setValue(toFormValue(listing));
        setImages(listing.imageDetails);
      })
      .catch((err) => {
        if (cancelled) return;
        // NOT_FOUND covers both "no such listing" and "someone else's listing"
        // — see assertOwnership's doc comment on why that's 404, not 403.
        if (err instanceof ApiClientError && err.code === "NOT_FOUND") setLoadFailed(true);
        else setError(err instanceof ApiClientError ? err.message : common("genericError"));
      });
    return () => {
      cancelled = true;
    };
  }, [id, common]);

  if (loadFailed) {
    notFound();
    return null;
  }
  if (!value) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value) return;
    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      await api.patch(`/api/seller/listings/${id}`, {
        title: value.title,
        description: value.description,
        price: Number(value.price),
        compareAtPrice: value.compareAtPrice ? Number(value.compareAtPrice) : null,
        categorySlug: value.categorySlug,
        subcategorySlug: value.subcategorySlug,
        tehsilSlug: value.tehsilSlug,
        localitySlug: value.localitySlug,
        contactPhone: value.contactPhone,
      });
      router.push("/seller/dashboard/listings");
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
        setFieldErrors(err.fields ?? {});
      } else {
        setError(common("genericError"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-extrabold tracking-tight text-on-surface">{t("editPageTitle")}</h2>
      <ListingForm
        value={value}
        onChange={setValue}
        onSubmit={handleSubmit}
        submitLabel={submitting ? common("saving") : t("saveCta")}
        error={Object.values(fieldErrors)[0] ?? error}
        imagesSection={<ListingImageManager listingId={id} value={images} onChange={setImages} />}
      />
    </div>
  );
}
