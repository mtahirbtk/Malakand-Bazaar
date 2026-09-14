"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/lib/auth/auth-context";
import { api } from "@/lib/api-client";
import { CATEGORIES } from "@/data/categories";
import { ListingForm, type ListingFormValue } from "@/components/seller/listing-form";
import { ListingImageStaging, type StagedImage } from "@/components/seller/listing-image-staging";

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
  contactPhone: "",
};

export default function NewListingPage() {
  const t = useTranslations("sellerListingForm");
  const common = useTranslations("common");
  const { user } = useAuth();
  const router = useRouter();
  const [initialValue, setInitialValue] = React.useState(INITIAL_VALUE);
  const [images, setImages] = React.useState<StagedImage[]>([]);

  React.useEffect(() => {
    if (!user) return;
    api
      .get<{ seller: { phone: string } }>("/api/seller/me")
      .then(({ seller }) => setInitialValue((v) => (v.contactPhone ? v : { ...v, contactPhone: seller.phone })))
      .catch(() => {
        // A prefill is a convenience, not a requirement — the phone field is
        // still editable if this silently doesn't happen.
      });
  }, [user]);

  // ListingForm owns validation and submit state (Formik + Yup); this page
  // only supplies the API call and what happens after it succeeds. A thrown
  // ApiClientError propagates back up to the form, which shows it itself.
  async function handleSubmit(value: ListingFormValue) {
    await api.post("/api/seller/listings", {
      title: value.title,
      description: value.description,
      price: Number(value.price),
      compareAtPrice: value.compareAtPrice ? Number(value.compareAtPrice) : null,
      categorySlug: value.categorySlug,
      subcategorySlug: value.subcategorySlug,
      tehsilSlug: value.tehsilSlug,
      localitySlug: value.localitySlug,
      contactPhone: value.contactPhone,
      images: images.map((image) => image.path),
    });
    router.push("/seller/dashboard/listings");
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-extrabold tracking-tight text-on-surface">{t("newPageTitle")}</h2>
      <ListingForm
        initialValue={initialValue}
        onSubmit={handleSubmit}
        submitLabel={t("createCta")}
        submittingLabel={common("saving")}
        imagesSection={<ListingImageStaging value={images} onChange={setImages} />}
      />
    </div>
  );
}
