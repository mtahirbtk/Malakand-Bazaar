"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";
import { ImageCropModal, type ImageCropLabels } from "./image-crop-modal";

export function FileUpload({
  label,
  description,
  previewUrl,
  onFileSelected,
  onClear,
  accept = "image/*",
  removeLabel = "Remove",
  className,
  crop,
  uploading = false,
}: {
  label: string;
  /** Small helper line shown inside the empty dropzone, e.g. "PNG, JPG or WebP up to 5MB". */
  description?: string;
  previewUrl?: string;
  onFileSelected: (file: File) => void;
  onClear?: () => void;
  accept?: string;
  removeLabel?: string;
  className?: string;
  /**
   * Opt into the pan/zoom crop step. Omit it and a picked file goes straight
   * to `onFileSelected`, unchanged — the original behavior, still what plain
   * (non-photo) uploads want.
   */
  crop?: { aspect: number; shape?: "circle" | "rect"; labels: ImageCropLabels };
  /** True while the parent's async upload is in flight. */
  uploading?: boolean;
}) {
  const inputId = React.useId();
  const [dragOver, setDragOver] = React.useState(false);
  const [pendingSrc, setPendingSrc] = React.useState<string | null>(null);
  const [localPreview, setLocalPreview] = React.useState<string | null>(null);
  const pendingFileName = React.useRef("photo.jpg");

  // The real, hosted preview (once the parent's upload lands) supersedes the
  // local object-URL stand-in shown the instant a crop is confirmed.
  React.useEffect(() => {
    if (previewUrl && localPreview) {
      URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
    }
    // Only react to the parent's preview changing, not to our own local one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewUrl]);

  React.useEffect(
    () => () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
      if (pendingSrc) URL.revokeObjectURL(pendingSrc);
    },
    // Cleanup-only effect — deliberately does not re-run when the URLs change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const shownPreview = previewUrl || localPreview;
  const shape = crop?.shape ?? "rect";

  function processFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (crop) {
      pendingFileName.current = file.name;
      setPendingSrc(URL.createObjectURL(file));
    } else {
      onFileSelected(file);
    }
  }

  function handleCropConfirm(blob: Blob) {
    const baseName = pendingFileName.current.replace(/\.\w+$/, "") || "photo";
    const file = new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
    setLocalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(blob);
    });
    onFileSelected(file);
    setPendingSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  return (
    <div className={cn("space-y-2", className)}>
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (uploading) return;
          const file = e.dataTransfer.files?.[0];
          if (file) processFile(file);
        }}
        style={{ aspectRatio: shape === "circle" ? "1" : String(crop?.aspect ?? 3) }}
        className={cn(
          "group relative flex w-full overflow-hidden border-2 border-dashed border-surface-border bg-surface-low transition-colors",
          uploading ? "cursor-wait" : "cursor-pointer",
          shape === "circle" ? "mx-auto max-w-[9rem] rounded-full" : "rounded-2xl",
          dragOver && "border-brand-500 bg-brand-50",
          !dragOver && !uploading && "hover:border-brand-400 hover:bg-brand-50/40"
        )}
      >
        {shownPreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shownPreview} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}

        {shownPreview ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-white opacity-0 transition-opacity group-hover:bg-on-surface/45 group-hover:opacity-100">
            <Icon name="edit" size={20} />
            <span className="text-[11px] font-bold">{label}</span>
          </div>
        ) : (
          <div className="flex w-full flex-col items-center justify-center gap-1.5 px-4 py-6 text-center">
            <Icon name="cloud_upload" size={28} className="text-brand-400" />
            <span className="text-xs font-bold text-brand-700">{label}</span>
            {description && <span className="text-[11px] text-on-surface-muted">{description}</span>}
          </div>
        )}

        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/70 backdrop-blur-[1px]">
            <Icon name="progress_activity" size={28} className="animate-spin text-brand-600" />
          </div>
        )}

        <input
          id={inputId}
          type="file"
          accept={accept}
          aria-label={label}
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) processFile(file);
            e.target.value = "";
          }}
        />
      </label>

      {shownPreview && onClear && !uploading && (
        <button type="button" onClick={onClear} className="text-xs font-bold text-danger hover:underline">
          {removeLabel}
        </button>
      )}

      {crop && (
        <ImageCropModal
          open={!!pendingSrc}
          onOpenChange={(next) => {
            if (!next) {
              setPendingSrc((prev) => {
                if (prev) URL.revokeObjectURL(prev);
                return null;
              });
            }
          }}
          imageSrc={pendingSrc}
          aspect={crop.aspect}
          shape={crop.shape}
          onConfirm={handleCropConfirm}
          labels={crop.labels}
        />
      )}
    </div>
  );
}
