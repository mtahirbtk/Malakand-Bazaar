"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { PhoneInput } from "@/components/ui/phone-input";
import { FileUpload } from "@/components/ui/file-upload";
import { uploadSellerImage, UploadValidationError } from "@/lib/upload-image";
import { TEHSIL_OPTIONS, findTehsil } from "@/data/tehsils";
import type { TehsilSlug } from "@/types";

const MapPinPicker = dynamic(() => import("./../marketplace/map-pin-picker").then((m) => m.MapPinPicker), {
  ssr: false,
  loading: () => <div className="h-56 rounded-xl bg-surface-low animate-pulse sm:h-72" />,
});

export type SellerProfileFieldsValue = {
  storeName: string;
  description: string;
  storePhone: string;
  tehsilSlug: TehsilSlug;
  localitySlug: string;
  coordinates: { lat: number; lng: number };
  /** Preview only — what the FileUpload shows. */
  avatarUrl: string;
  storefrontBanner: string;
  /**
   * The Storage object path to actually save, once a new photo is uploaded
   * (§2.8 #41 takes `avatarPath`/`bannerPath`, never a URL). `undefined` means
   * "unchanged since the form opened"; `""` means "the seller cleared it" —
   * SellerProfileEditForm relies on that distinction to omit the field
   * entirely from a PATCH that never touched it.
   */
  avatarPath?: string;
  bannerPath?: string;
};

/** No per-locality coordinates exist in TEHSILS — this is a fixed
 * district-center default the seller drags the pin from, not a true
 * per-locality center. */
export const MALAKAND_CENTER = { lat: 34.5667, lng: 71.9333 };

export function SellerProfileFields({
  value,
  onChange,
  showImages = true,
  errors = {},
}: {
  value: SellerProfileFieldsValue;
  onChange: (value: SellerProfileFieldsValue) => void;
  /**
   * Hidden during registration until the Storage upload pipeline lands —
   * a picker that silently discarded the file would be worse than no picker.
   */
  showImages?: boolean;
  /** Server-side field errors, keyed by the API's field name. */
  errors?: Record<string, string>;
}) {
  const t = useTranslations("sellerProfile");
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const localityOptions = (findTehsil(value.tehsilSlug)?.localities ?? []).map((l) => ({
    value: l.slug,
    label: l.nameEn,
  }));

  async function handlePhotoSelected(kind: "avatar" | "banner", file: File) {
    setUploadError(null);
    try {
      const uploaded = await uploadSellerImage(file, kind);
      if (kind === "avatar") onChange({ ...value, avatarUrl: uploaded.url, avatarPath: uploaded.path });
      else onChange({ ...value, storefrontBanner: uploaded.url, bannerPath: uploaded.path });
    } catch (err) {
      setUploadError(err instanceof UploadValidationError ? err.message : t("uploadFailedError"));
    }
  }

  return (
    <div className="space-y-4">
      <FormField label={t("storeNameLabel")} htmlFor="sp-name" required error={errors.storeName}>
        <Input id="sp-name" value={value.storeName} onChange={(e) => onChange({ ...value, storeName: e.target.value })} />
      </FormField>

      <FormField label={t("descriptionLabel")} htmlFor="sp-description" error={errors.description}>
        <Textarea
          id="sp-description"
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
        />
      </FormField>

      <FormField label={t("storePhoneLabel")} htmlFor="sp-phone" required hint={t("storePhoneHint")} error={errors.storePhone}>
        <PhoneInput
          id="sp-phone"
          value={value.storePhone}
          onChange={(e) => onChange({ ...value, storePhone: e.target.value })}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("tehsilLabel")} htmlFor="sp-tehsil" required>
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
        <FormField label={t("localityLabel")} htmlFor="sp-locality" required error={errors.localitySlug}>
          <Select
            ariaLabel={t("localityLabel")}
            value={value.localitySlug}
            onValueChange={(localitySlug) => onChange({ ...value, localitySlug })}
            options={localityOptions}
            className="w-full"
          />
        </FormField>
      </div>

      <FormField label={t("mapLabel")} hint={t("mapHint")}>
        <MapPinPicker
          value={value.coordinates}
          onChange={(coordinates) => onChange({ ...value, coordinates })}
          ariaLabel={t("mapLabel")}
        />
      </FormField>

      {showImages && (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("avatarLabel")} error={uploadError ?? undefined}>
          <FileUpload
            label={t("avatarUploadCta")}
            previewUrl={value.avatarUrl || undefined}
            onFileSelected={(file) => handlePhotoSelected("avatar", file)}
            onClear={() => onChange({ ...value, avatarUrl: "", avatarPath: "" })}
            removeLabel={t("removeCta")}
          />
        </FormField>
        <FormField label={t("bannerLabel")}>
          <FileUpload
            label={t("bannerUploadCta")}
            previewUrl={value.storefrontBanner || undefined}
            onFileSelected={(file) => handlePhotoSelected("banner", file)}
            onClear={() => onChange({ ...value, storefrontBanner: "", bannerPath: "" })}
            removeLabel={t("removeCta")}
          />
        </FormField>
      </div>
      )}
    </div>
  );
}
