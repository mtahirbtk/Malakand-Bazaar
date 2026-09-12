"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export function MultiFileUpload({
  label,
  urls,
  onAdd,
  onRemove,
  max = 6,
  className,
}: {
  label: string;
  urls: string[];
  onAdd: (file: File) => void;
  onRemove: (index: number) => void;
  max?: number;
  className?: string;
}) {
  const inputId = React.useId();
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2">
        {urls.map((url, index) => (
          <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-surface-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => onRemove(index)}
              className="absolute right-0.5 top-0.5 rounded-full bg-on-surface/60 p-0.5 text-white"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
        {urls.length < max && (
          <>
            <label
              htmlFor={inputId}
              className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-surface-border bg-surface-low text-brand-600 transition-colors hover:border-brand-400"
            >
              <Icon name="add_photo_alternate" size={20} />
              <span className="text-[10px] font-bold">{label}</span>
            </label>
            <input
              id={inputId}
              type="file"
              accept="image/*"
              aria-label={label}
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onAdd(file);
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
