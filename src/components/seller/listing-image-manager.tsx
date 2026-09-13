"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { api } from "@/lib/api-client";
import { uploadSellerImage, UploadValidationError } from "@/lib/upload-image";
import { MAX_LISTING_IMAGES } from "./listing-image-staging";
import type { ListingImage } from "@/types";

/**
 * Image manager for a listing that already exists (EditListingPage). Every
 * action here is a live API call, not local state the form batches up —
 * add attaches immediately (commit with listingId), remove deletes the
 * Storage object too (§2.8 #49), and reorder persists the new sort order
 * (§2.8 #48). `onChange` just tells the parent the current list, for the
 * page to keep in sync with what render needs elsewhere.
 */
export function ListingImageManager({
  listingId,
  value,
  onChange,
}: {
  listingId: string;
  value: ListingImage[];
  onChange: (value: ListingImage[]) => void;
}) {
  const t = useTranslations("listingForm");
  const inputId = React.useId();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setBusy(true);
    try {
      const uploaded = await uploadSellerImage(file, "listing", listingId);
      onChange([...value, { id: "", url: uploaded.url, width: uploaded.width, height: uploaded.height, sort: value.length }]);
      // The commit response has no image row id — refetch to pick it up, so
      // remove/reorder below have a real id to act on.
      const { listing } = await api.get<{ listing: { imageDetails: ListingImage[] } }>(
        `/api/seller/listings/${listingId}`
      );
      onChange(listing.imageDetails);
    } catch (err) {
      setError(err instanceof UploadValidationError ? err.message : t("uploadFailedError"));
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(imageId: string) {
    setError(null);
    const previous = value;
    onChange(value.filter((image) => image.id !== imageId));
    try {
      await api.delete(`/api/seller/listings/${listingId}/images/${imageId}`);
    } catch {
      onChange(previous);
      setError(t("removePhotoFailedError"));
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const next = [...value];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];

    const previous = value;
    onChange(next);
    try {
      const { images } = await api.post<{ images: ListingImage[] }>(
        `/api/seller/listings/${listingId}/images/reorder`,
        { ids: next.map((image) => image.id) }
      );
      onChange(images);
    } catch {
      onChange(previous);
      setError(t("reorderFailedError"));
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((image, index) => (
          <div key={image.id} className="relative h-20 w-20 overflow-hidden rounded-lg border border-surface-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              aria-label={t("removePhotoCta")}
              onClick={() => handleRemove(image.id)}
              className="absolute right-0.5 top-0.5 rounded-full bg-on-surface/60 p-0.5 text-white"
            >
              <Icon name="close" size={14} />
            </button>
            <div className="absolute bottom-0.5 left-0.5 flex gap-0.5">
              <button
                type="button"
                aria-label={t("movePhotoEarlierCta")}
                disabled={index === 0}
                onClick={() => move(index, -1)}
                className="rounded-full bg-on-surface/60 p-0.5 text-white disabled:opacity-30"
              >
                <Icon name="chevron_left" size={14} />
              </button>
              <button
                type="button"
                aria-label={t("movePhotoLaterCta")}
                disabled={index === value.length - 1}
                onClick={() => move(index, 1)}
                className="rounded-full bg-on-surface/60 p-0.5 text-white disabled:opacity-30"
              >
                <Icon name="chevron_right" size={14} />
              </button>
            </div>
          </div>
        ))}
        {value.length < MAX_LISTING_IMAGES && (
          <>
            <label
              htmlFor={inputId}
              className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-surface-border bg-surface-low text-brand-600 transition-colors hover:border-brand-400"
            >
              <Icon name="add_photo_alternate" size={20} />
              <span className="text-[10px] font-bold">{busy ? t("uploadingCta") : t("addPhotoCta")}</span>
            </label>
            <input
              id={inputId}
              type="file"
              accept="image/*"
              aria-label={t("addPhotoCta")}
              className="sr-only"
              disabled={busy}
              onChange={handleAdd}
            />
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="text-xs font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
