"use client";

import * as React from "react";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { Icon } from "./icon";

/**
 * Fullscreen image viewer, used by ImageGallery for mobile tap-to-zoom.
 * Built directly on @radix-ui/react-dialog (same primitive `Drawer` wraps)
 * rather than stretching `Drawer` — its side panels aren't fullscreen.
 */
export function Lightbox({
  images,
  alt,
  index,
  onIndexChange,
  open,
  onOpenChange,
}: {
  images: string[];
  alt: string;
  index: number;
  onIndexChange: (index: number) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const go = (next: number) => onIndexChange((next + images.length) % images.length);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[90] bg-black/90 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center outline-none"
          aria-label={alt}
        >
          <Dialog.Title className="sr-only">{alt}</Dialog.Title>
          <Dialog.Close
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <Icon name="close" size={24} />
          </Dialog.Close>

          <div className="relative h-full w-full max-w-3xl">
            <Image src={images[index]} alt={alt} fill sizes="100vw" className="object-contain" />
          </div>

          {images.length > 1 && (
            <div className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-4">
              <button
                type="button"
                aria-label="Previous image"
                onClick={() => go(index - 1)}
                className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              >
                <Icon name="chevron_left" size={22} />
              </button>
              <span className="text-xs font-bold text-white tabular">
                {index + 1} / {images.length}
              </span>
              <button
                type="button"
                aria-label="Next image"
                onClick={() => go(index + 1)}
                className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              >
                <Icon name="chevron_right" size={22} />
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
