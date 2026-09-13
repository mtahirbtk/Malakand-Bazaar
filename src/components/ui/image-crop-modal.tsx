"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import type { Area, Point } from "react-easy-crop";
import { Modal } from "./modal";
import { Button } from "./button";
import { Slider } from "./slider";
import { Icon } from "./icon";
import { getCroppedImageBlob } from "@/lib/crop-image";

// react-easy-crop measures its container with ResizeObserver and reads the
// image's natural size on load — browser-only work, same reason
// map-pin-picker.tsx dynamic-imports Leaflet with ssr:false instead of
// importing it at the top of a "use client" file.
const Cropper = dynamic(() => import("react-easy-crop"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center sm:h-96">
      <Icon name="progress_activity" size={28} className="animate-spin text-white/70" />
    </div>
  ),
});

export type ImageCropLabels = {
  title: string;
  description: string;
  zoomAria: string;
  cancel: string;
  save: string;
  error: string;
};

/**
 * The crop step FileUpload opens once a seller picks a photo for a field
 * that declared an `aspect` (avatar/banner) — lets them pan and zoom instead
 * of the upload just taking whatever rectangle the source image happened to
 * be, which is what made banners look wrong at any size other than the one
 * the mockup assumed (§10 of the Sept 2026 fix list).
 */
export function ImageCropModal({
  open,
  onOpenChange,
  imageSrc,
  aspect,
  shape = "rect",
  onConfirm,
  labels,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Object URL of the just-picked file. Modal renders nothing without one. */
  imageSrc: string | null;
  aspect: number;
  shape?: "circle" | "rect";
  onConfirm: (blob: Blob) => void;
  labels: ImageCropLabels;
}) {
  const [crop, setCrop] = React.useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [area, setArea] = React.useState<Area | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset to a centered, unzoomed crop each time a new photo comes in —
  // otherwise the second photo a seller picks opens already panned/zoomed
  // to wherever the first one was left.
  React.useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setArea(null);
    setError(null);
  }, [imageSrc]);

  async function handleSave() {
    if (!imageSrc || !area) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await getCroppedImageBlob(imageSrc, area);
      onConfirm(blob);
    } catch {
      setError(labels.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={labels.title} description={labels.description} size="lg">
      <div className="space-y-4">
        <div className="relative h-72 w-full overflow-hidden rounded-xl bg-neutral-900 sm:h-96">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              cropShape={shape === "circle" ? "round" : "rect"}
              showGrid={shape !== "circle"}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_croppedArea, croppedAreaPixels) => setArea(croppedAreaPixels)}
            />
          )}
        </div>

        <div className="flex items-center gap-3 px-1">
          <Icon name="zoom_out" size={18} className="shrink-0 text-on-surface-muted" />
          <Slider ariaLabel={labels.zoomAria} min={1} max={3} step={0.01} value={[zoom]} onValueChange={([z]) => setZoom(z)} />
          <Icon name="zoom_in" size={18} className="shrink-0 text-on-surface-muted" />
        </div>

        {error && <p className="text-xs font-semibold text-danger">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="subtle" size="md" onClick={() => onOpenChange(false)} disabled={busy}>
            {labels.cancel}
          </Button>
          <Button type="button" variant="primary" size="md" onClick={handleSave} disabled={busy || !area}>
            {busy && <Icon name="progress_activity" size={16} className="animate-spin" />}
            {labels.save}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
