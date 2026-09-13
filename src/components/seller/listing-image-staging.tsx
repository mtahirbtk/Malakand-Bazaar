"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { MultiFileUpload } from "@/components/ui/multi-file-upload";
import { uploadSellerImage, UploadValidationError, type UploadedImage } from "@/lib/upload-image";

export const MAX_LISTING_IMAGES = 12;

export type StagedImage = Pick<UploadedImage, "path" | "url">;

/**
 * Image picker for a listing that doesn't exist yet (NewListingPage).
 * Each photo is signed, PUT straight to Storage and committed the moment it's
 * chosen — same pipeline as everywhere else — but left *unattached*
 * (§2.8 #52: commit() with no listingId). The listing's own create call then
 * sends the staged paths, and the server attaches them in the same request
 * that inserts the row. See listing-image-manager.tsx for the very different
 * edit-page version, where the listing already exists.
 */
export function ListingImageStaging({
  value,
  onChange,
}: {
  value: StagedImage[];
  onChange: (value: StagedImage[]) => void;
}) {
  const t = useTranslations("listingForm");
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleAdd(file: File) {
    setError(null);
    setUploading(true);
    try {
      const uploaded = await uploadSellerImage(file, "listing");
      onChange([...value, { path: uploaded.path, url: uploaded.url }]);
    } catch (err) {
      setError(err instanceof UploadValidationError ? err.message : t("uploadFailedError"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <MultiFileUpload
        label={uploading ? t("uploadingCta") : t("addPhotoCta")}
        urls={value.map((image) => image.url)}
        onAdd={handleAdd}
        onRemove={(index) => onChange(value.filter((_, i) => i !== index))}
        max={MAX_LISTING_IMAGES}
      />
      {error && (
        <p role="alert" className="text-xs font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
