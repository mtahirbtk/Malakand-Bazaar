"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { Icon } from "@/components/ui/icon";
import { ContactActions } from "./contact-actions";
import { cn } from "@/lib/cn";
import type { Listing } from "@/types";

/** Ported from code.html:434-464 (Card 1: Solar Inverter 15kW VFD). */
export function ListingCard({ listing }: { listing: Listing }) {
  const t = useTranslations("marketplace");
  const [saved, setSaved] = React.useState(false);
  const hasPhoto = listing.images.length > 0;
  const isSold = listing.status !== "active";

  return (
    <article className="bg-surface rounded-xl border border-surface-border hover:border-accent-green hover:shadow-md transition-all p-3.5 flex flex-col justify-between group">
      <div>
        <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-surface-low mb-2.5">
          {hasPhoto ? (
            <Image
              src={listing.images[0]}
              alt={listing.title}
              fill
              sizes="(max-width: 640px) 100vw, 20vw"
              className={cn(
                "object-cover group-hover:scale-105 transition-transform duration-300",
                isSold && "opacity-60"
              )}
            />
          ) : (
            <div
              className={cn(
                "flex h-full w-full items-center justify-center",
                isSold && "opacity-60"
              )}
            >
              <Icon name={listing.iconFallback ?? "image"} size={72} className="text-secondary" />
            </div>
          )}

          {listing.badge && !isSold && (
            <Badge tone={listing.badge.tone} className="absolute top-2 left-2 shadow-xs">
              {listing.badge.label}
            </Badge>
          )}

          {isSold && (
            <Badge
              tone="neutral"
              className="absolute top-2 left-2 bg-on-surface/80 text-white shadow-xs"
            >
              {listing.status === "sold" ? t("sold") : t("reserved")}
            </Badge>
          )}

          <button
            type="button"
            aria-label={t("saveListing")}
            aria-pressed={saved}
            onClick={() => setSaved((s) => !s)}
            className={cn(
              "absolute top-2 right-2 bg-surface/90 p-1 rounded-full text-xs shadow-xs transition-colors",
              saved ? "text-red-500" : "text-primary hover:text-red-500"
            )}
          >
            <Icon name="favorite" size={16} filled={saved} />
          </button>
        </div>

        <div className="text-[11px] font-semibold text-accent-green-dark flex items-center gap-1">
          <Icon name="location_on" size={13} />
          {listing.localityLabel}
        </div>

        <h3 className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-2 mt-1">
          {listing.title}
        </h3>

        <Price value={listing.price} compareAt={listing.compareAtPrice} size="sm" className="mt-2" />
      </div>

      <ContactActions
        phone={listing.contactPhone}
        listingTitle={listing.title}
        className="mt-3 pt-2.5 border-t border-surface-border"
      />
    </article>
  );
}
