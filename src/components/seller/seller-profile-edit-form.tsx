"use client";

import * as React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useTranslations } from "next-intl";
import { api, ApiClientError } from "@/lib/api-client";
import { findTehsil } from "@/data/tehsils";
import { phoneSchema, requiredString } from "@/lib/validation/schemas";
import { useFormSubmit } from "@/lib/validation/use-form-submit";
import { visibleFieldErrors } from "@/lib/validation/visible-errors";
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
  const v = useTranslations("validation");
  const [seller, setSeller] = React.useState<SellerRecord | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [topError, setTopError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);

  const formik = useFormik<SellerProfileFieldsValue>({
    initialValues: {
      storeName: "",
      description: "",
      storePhone: "",
      tehsilSlug: "batkhela",
      localitySlug: "batkhela-city",
      coordinates: MALAKAND_CENTER,
      avatarUrl: "",
      storefrontBanner: "",
    },
    validationSchema: Yup.object({
      storeName: requiredString(v),
      storePhone: phoneSchema(v),
    }),
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: () => {},
  });

  React.useEffect(() => {
    let cancelled = false;
    api
      .get<{ seller: SellerRecord }>("/api/seller/me")
      .then(({ seller: found }) => {
        if (cancelled) return;
        setSeller(found);
        formik.setValues(toFieldsValue(found));
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err instanceof ApiClientError ? err.message : common("genericError"));
      });
    return () => {
      cancelled = true;
    };
    // formik's identity is stable across renders (from useFormik); only the
    // fetch itself should re-run if the translator changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [common]);

  const handleSubmit = useFormSubmit(
    formik,
    formRef,
    async (values) => {
      const locality = findTehsil(values.tehsilSlug)?.localities.find((l) => l.slug === values.localitySlug);
      const { seller: updated } = await api.patch<{ seller: SellerRecord }>("/api/seller/me", {
        storeName: values.storeName,
        description: values.description,
        storePhone: values.storePhone,
        tehsilSlug: values.tehsilSlug,
        localitySlug: locality?.slug ?? values.localitySlug,
        coordinates: values.coordinates,
        // Only sent when actually touched — see SellerProfileFieldsValue's
        // doc comment on why undefined and "" mean different things here.
        ...(values.avatarPath !== undefined ? { avatarPath: values.avatarPath } : {}),
        ...(values.bannerPath !== undefined ? { bannerPath: values.bannerPath } : {}),
      });
      setSeller(updated);
      formik.setValues(toFieldsValue(updated));
      setSaved(true);
    },
    (message) => {
      setTopError(message);
      setSaved(false);
    },
    common("genericError")
  );

  if (loadError && !seller) {
    return (
      <p role="alert" className="text-sm font-semibold text-danger">
        {loadError}
      </p>
    );
  }
  if (!seller) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <form ref={formRef} className="max-w-2xl space-y-6" onSubmit={handleSubmit}>
      <Badge tone={seller.verified ? "green" : "sand"} icon={seller.verified ? "check_circle" : "hourglass_empty"}>
        {seller.verified ? t("verified") : t("pending")}
      </Badge>

      <SellerProfileFields
        value={formik.values}
        onChange={(next) => formik.setValues(next)}
        errors={visibleFieldErrors(formik.touched, formik.errors)}
      />

      {topError && (
        <p role="alert" className="text-xs font-semibold text-danger">
          {topError}
        </p>
      )}
      {saved && !topError && <p className="text-xs font-semibold text-brand-700">{t("savedMessage")}</p>}

      <Button type="submit" size="lg" disabled={formik.isSubmitting} aria-busy={formik.isSubmitting}>
        {formik.isSubmitting ? <Spinner size="sm" tone="onBrand" /> : t("saveCta")}
      </Button>
    </form>
  );
}
