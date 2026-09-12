"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export function FileUpload({
  label,
  previewUrl,
  onFileSelected,
  onClear,
  accept = "image/*",
  removeLabel = "Remove",
  className,
}: {
  label: string;
  previewUrl?: string;
  onFileSelected: (file: File) => void;
  onClear?: () => void;
  accept?: string;
  removeLabel?: string;
  className?: string;
}) {
  const inputId = React.useId();
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt=""
          className="h-16 w-16 rounded-lg border border-surface-border object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-surface-border bg-surface-low">
          <Icon name="image" size={22} className="text-brand-300" />
        </div>
      )}
      <div className="flex items-center gap-2">
        <label
          htmlFor={inputId}
          className="cursor-pointer rounded-lg border border-surface-border bg-surface px-3 py-2 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-50"
        >
          {label}
        </label>
        <input
          id={inputId}
          type="file"
          accept={accept}
          aria-label={label}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelected(file);
            e.target.value = "";
          }}
        />
        {previewUrl && onClear && (
          <button type="button" onClick={onClear} className="text-xs font-bold text-danger hover:underline">
            {removeLabel}
          </button>
        )}
      </div>
    </div>
  );
}
