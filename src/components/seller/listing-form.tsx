"use client";

import * as React from "react";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useTranslations } from "next-intl";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";
import { Button } from "@/components/ui/button";
import { CATEGORY_OPTIONS, findCategory } from "@/data/categories";
import { TEHSIL_OPTIONS, findTehsil } from "@/data/tehsils";
import { requiredString, requiredNonNegativeNumber, nonNegativeNumber, phoneSchema } from "@/lib/validation/schemas";
import { useFormSubmit } from "@/lib/validation/use-form-submit";
import type { TehsilSlug } from "@/types";

export type ListingFormValue = {
  title: string;
  description: string;
  price: string;
  compareAtPrice: string;
  categorySlug: string;
  subcategorySlug: string;
  tehsilSlug: TehsilSlug;
  localitySlug: string;
  contactPhone: string;
};

export function ListingForm({
  initialValue,
  onSubmit,
  submitLabel,
  submittingLabel,
  imagesSection,
}: {
  initialValue: ListingFormValue;
  /** Throw (e.g. an ApiClientError with `.fields`) to report a failed save — the form surfaces it itself. */
  onSubmit: (value: ListingFormValue) => Promise<void>;
  submitLabel: string;
  /** Shown on the submit button while the save is in flight. */
  submittingLabel: string;
  /**
   * Create and edit need different image UIs — a new listing stages uploads
   * locally until the listing itself exists, an existing one attaches,
   * reorders and deletes each photo against the API immediately (§2.8
   * #48/#49) — so this field owns none of it and just renders whatever its
   * caller passes (NewListingPage / EditListingPage).
   */
  imagesSection?: React.ReactNode;
}) {
  const t = useTranslations("listingForm");
  const v = useTranslations("validation");
  const [topError, setTopError] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  const formik = useFormik<ListingFormValue>({
    initialValues: initialValue,
    validationSchema: Yup.object({
      title: requiredString(v),
      description: requiredString(v),
      price: requiredNonNegativeNumber(v),
      compareAtPrice: nonNegativeNumber(v),
      contactPhone: phoneSchema(v),
    }),
    validateOnChange: false,
    validateOnBlur: false,
    onSubmit: () => {},
  });

  const handleSubmit = useFormSubmit(formik, formRef, onSubmit, setTopError, t("genericError"));

  // `initialValue` can change after mount — e.g. NewListingPage backfills the
  // phone field once its own async fetch resolves. Only apply that once: if
  // the seller has already started filling the form in, a late-arriving
  // prefill must not clobber what they typed.
  const initialValueRef = React.useRef(initialValue);
  React.useEffect(() => {
    if (initialValue !== initialValueRef.current) {
      initialValueRef.current = initialValue;
      if (!formik.dirty) formik.setValues(initialValue);
    }
    // formik's identity is stable across renders (from useFormik).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue]);

  const value = formik.values;
  function setField<K extends keyof ListingFormValue>(key: K, next: ListingFormValue[K]) {
    formik.setFieldValue(key, next);
  }

  const subcategoryOptions = (findCategory(value.categorySlug)?.subcategories ?? []).map((s) => ({
    value: s.slug,
    label: s.nameEn,
  }));
  const localityOptions = (findTehsil(value.tehsilSlug)?.localities ?? []).map((l) => ({
    value: l.slug,
    label: l.nameEn,
  }));

  return (
    <form ref={formRef} className="max-w-2xl space-y-4" onSubmit={handleSubmit} noValidate>
      <FormField
        label={t("titleLabel")}
        htmlFor="lf-title"
        required
        error={formik.touched.title ? formik.errors.title : undefined}
      >
        <Input
          id="lf-title"
          name="title"
          value={value.title}
          invalid={Boolean(formik.touched.title && formik.errors.title)}
          onChange={(e) => setField("title", e.target.value)}
        />
      </FormField>

      <FormField
        label={t("descriptionLabel")}
        htmlFor="lf-description"
        required
        error={formik.touched.description ? formik.errors.description : undefined}
      >
        <Textarea
          id="lf-description"
          name="description"
          value={value.description}
          invalid={Boolean(formik.touched.description && formik.errors.description)}
          onChange={(e) => setField("description", e.target.value)}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label={t("priceLabel")}
          htmlFor="lf-price"
          required
          error={formik.touched.price ? formik.errors.price : undefined}
        >
          <Input
            id="lf-price"
            name="price"
            type="number"
            min={0}
            value={value.price}
            invalid={Boolean(formik.touched.price && formik.errors.price)}
            onChange={(e) => setField("price", e.target.value)}
          />
        </FormField>
        <FormField
          label={t("compareAtPriceLabel")}
          htmlFor="lf-compare-price"
          hint={t("compareAtPriceHint")}
          error={formik.touched.compareAtPrice ? formik.errors.compareAtPrice : undefined}
        >
          <Input
            id="lf-compare-price"
            name="compareAtPrice"
            type="number"
            min={0}
            value={value.compareAtPrice}
            invalid={Boolean(formik.touched.compareAtPrice && formik.errors.compareAtPrice)}
            onChange={(e) => setField("compareAtPrice", e.target.value)}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("categoryLabel")} htmlFor="lf-category" required>
          <Select
            ariaLabel={t("categoryLabel")}
            value={value.categorySlug}
            onValueChange={(categorySlug) => {
              const nextSubcategories = findCategory(categorySlug)?.subcategories ?? [];
              formik.setValues({ ...value, categorySlug, subcategorySlug: nextSubcategories[0]?.slug ?? "" });
            }}
            options={CATEGORY_OPTIONS}
            className="w-full"
          />
        </FormField>
        <FormField label={t("subcategoryLabel")} htmlFor="lf-subcategory" required>
          <Select
            ariaLabel={t("subcategoryLabel")}
            value={value.subcategorySlug}
            onValueChange={(subcategorySlug) => setField("subcategorySlug", subcategorySlug)}
            options={subcategoryOptions}
            className="w-full"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("tehsilLabel")} htmlFor="lf-tehsil" required>
          <Select
            ariaLabel={t("tehsilLabel")}
            value={value.tehsilSlug}
            onValueChange={(tehsilSlug) => {
              const nextLocalities = findTehsil(tehsilSlug as TehsilSlug)?.localities ?? [];
              formik.setValues({
                ...value,
                tehsilSlug: tehsilSlug as TehsilSlug,
                localitySlug: nextLocalities[0]?.slug ?? "",
              });
            }}
            options={TEHSIL_OPTIONS.filter((o) => o.value !== "all")}
            className="w-full"
          />
        </FormField>
        <FormField label={t("localityLabel")} htmlFor="lf-locality" required>
          <Select
            ariaLabel={t("localityLabel")}
            value={value.localitySlug}
            onValueChange={(localitySlug) => setField("localitySlug", localitySlug)}
            options={localityOptions}
            className="w-full"
          />
        </FormField>
      </div>

      <FormField
        label={t("contactPhoneLabel")}
        htmlFor="lf-phone"
        required
        error={formik.touched.contactPhone ? formik.errors.contactPhone : undefined}
      >
        <PhoneInput
          id="lf-phone"
          name="contactPhone"
          value={value.contactPhone}
          invalid={Boolean(formik.touched.contactPhone && formik.errors.contactPhone)}
          onChange={(e) => setField("contactPhone", e.target.value)}
        />
      </FormField>

      <FormField label={t("imagesLabel")} hint={t("imagesHint")}>
        {imagesSection}
      </FormField>

      {topError && (
        <p role="alert" className="text-xs font-semibold text-danger">
          {topError}
        </p>
      )}

      <Button type="submit" size="lg" disabled={formik.isSubmitting} aria-busy={formik.isSubmitting}>
        {formik.isSubmitting ? submittingLabel : submitLabel}
      </Button>
    </form>
  );
}
