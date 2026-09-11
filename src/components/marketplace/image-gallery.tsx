"use client";

import * as React from "react";
import Image from "next/image";
import { Icon } from "@/components/ui/icon";
import { Lightbox } from "@/components/ui/lightbox";
import { cn } from "@/lib/cn";

/**
 * Purpose-built for a product gallery, not the ui/carousel.tsx primitive —
 * that one autoplays and owns its index internally, which fits the hero
 * but not a manually-browsed, non-autoplaying gallery. Desktop hover shows
 * a zoom lens (plain CSS, no library); mobile tap opens the Lightbox.
 */
export function ImageGallery({
  images,
  alt,
  iconFallback,
}: {
  images: string[];
  alt: string;
  iconFallback?: string;
}) {
  const [index, setIndex] = React.useState(0);
  const [lensPos, setLensPos] = React.useState<{ x: number; y: number } | null>(null);
  const [lightboxOpen, setLightboxOpen] = React.useState(false);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-surface-low">
        <Icon name={iconFallback ?? "image"} size={96} className="text-secondary" />
      </div>
    );
  }

  return (
    <div>
      <div
        className="relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-xl bg-surface-low"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setLensPos({
            x: ((e.clientX - rect.left) / rect.width) * 100,
            y: ((e.clientY - rect.top) / rect.height) * 100,
          });
        }}
        onMouseLeave={() => setLensPos(null)}
        onClick={() => setLightboxOpen(true)}
      >
        <Image
          src={images[index]}
          alt={alt}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
          priority
        />
        {lensPos && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hidden [@media(hover:hover)]:block"
            style={{
              backgroundImage: `url(${images[index]})`,
              backgroundSize: "200%",
              backgroundPosition: `${lensPos.x}% ${lensPos.y}%`,
            }}
          />
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-2.5 flex gap-2 overflow-x-auto no-scrollbar">
          {images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              aria-label={`View image ${i + 1}`}
              aria-current={i === index}
              onClick={() => setIndex(i)}
              className={cn(
                "relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors",
                i === index ? "border-accent-green" : "border-surface-border hover:border-brand-400"
              )}
            >
              <Image src={src} alt="" fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}

      <Lightbox
        images={images}
        alt={alt}
        index={index}
        onIndexChange={setIndex}
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
      />
    </div>
  );
}
