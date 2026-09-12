"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { MultiFileUpload } from "@/components/ui/multi-file-upload";
import { Button } from "@/components/ui/button";
import { CATEGORY_OPTIONS, findCategory } from "@/data/categories";
import { TEHSIL_OPTIONS, findTehsil } from "@/data/tehsils";
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
  images: string[];
  contactPhone: string;
};

export function ListingForm({
  value,
  onChange,
  onSubmit,
  submitLabel,
  error,
}: {
  value: ListingFormValue;
  onChange: (value: ListingFormValue) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  error?: string | null;
}) {
  const t = useTranslations("listingForm");
  const subcategoryOptions = (findCategory(value.categorySlug)?.subcategories ?? []).map((s) => ({
    value: s.slug,
    label: s.nameEn,
  }));
  const localityOptions = (findTehsil(value.tehsilSlug)?.localities ?? []).map((l) => ({
    value: l.slug,
    label: l.nameEn,
  }));

  return (
    <form className="max-w-2xl space-y-4" onSubmit={onSubmit}>
      <FormField label={t("titleLabel")} htmlFor="lf-title" required>
        <Input id="lf-title" value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} />
      </FormField>

      <FormField label={t("descriptionLabel")} htmlFor="lf-description" required>
        <Textarea
          id="lf-description"
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("priceLabel")} htmlFor="lf-price" required>
          <Input
            id="lf-price"
            type="number"
            min={0}
            value={value.price}
            onChange={(e) => onChange({ ...value, price: e.target.value })}
          />
        </FormField>
        <FormField label={t("compareAtPriceLabel")} htmlFor="lf-compare-price" hint={t("compareAtPriceHint")}>
          <Input
            id="lf-compare-price"
            type="number"
            min={0}
            value={value.compareAtPrice}
            onChange={(e) => onChange({ ...value, compareAtPrice: e.target.value })}
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
              onChange({ ...value, categorySlug, subcategorySlug: nextSubcategories[0]?.slug ?? "" });
            }}
            options={CATEGORY_OPTIONS}
            className="w-full"
          />
        </FormField>
        <FormField label={t("subcategoryLabel")} htmlFor="lf-subcategory" required>
          <Select
            ariaLabel={t("subcategoryLabel")}
            value={value.subcategorySlug}
            onValueChange={(subcategorySlug) => onChange({ ...value, subcategorySlug })}
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
              onChange({ ...value, tehsilSlug: tehsilSlug as TehsilSlug, localitySlug: nextLocalities[0]?.slug ?? "" });
            }}
            options={TEHSIL_OPTIONS.filter((o) => o.value !== "all")}
            className="w-full"
          />
        </FormField>
        <FormField label={t("localityLabel")} htmlFor="lf-locality" required>
          <Select
            ariaLabel={t("localityLabel")}
            value={value.localitySlug}
            onValueChange={(localitySlug) => onChange({ ...value, localitySlug })}
            options={localityOptions}
            className="w-full"
          />
        </FormField>
      </div>

      <FormField label={t("contactPhoneLabel")} htmlFor="lf-phone" required>
        <Input
          id="lf-phone"
          leadingIcon="call"
          value={value.contactPhone}
          onChange={(e) => onChange({ ...value, contactPhone: e.target.value })}
        />
      </FormField>

      <FormField label={t("imagesLabel")} hint={t("imagesHint")}>
        <MultiFileUpload
          label={t("addPhotoCta")}
          urls={value.images}
          onAdd={(file) => onChange({ ...value, images: [...value.images, URL.createObjectURL(file)] })}
          onRemove={(index) => onChange({ ...value, images: value.images.filter((_, i) => i !== index) })}
        />
      </FormField>

      {error && (
        <p role="alert" className="text-xs font-semibold text-danger">
          {error}
        </p>
      )}

      <Button type="submit" size="lg">
        {submitLabel}
      </Button>
    </form>
  );
}
