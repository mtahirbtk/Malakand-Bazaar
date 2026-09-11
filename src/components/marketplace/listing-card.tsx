"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import type { Listing } from "@/types";

/**
 * Ported from code.html:434-464 (Card 1: Solar Inverter 15kW VFD), simplified:
 * no buttons on the card (no WhatsApp/call, no save) and no hover border —
 * the whole card is a Link to the listing detail page, hover just scales it
 * up. Contact, phone reveal, and seller storefront live on that detail page.
 */
export function ListingCard({ listing }: { listing: Listing }) {
  const t = useTranslations("marketplace");
  const hasPhoto = listing.images.length > 0;
  const isSold = listing.status !== "active";

  return (
    <Link
      href={`/listing/${listing.slug}`}
      className="group block bg-surface rounded-xl border border-surface-border hover:shadow-md hover:scale-[1.03] transition-transform duration-200 p-3.5"
    >
      <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-surface-low mb-2.5">
        {hasPhoto ? (
          <Image
            src={listing.images[0]}
            alt={listing.title}
            fill
            sizes="(max-width: 640px) 100vw, 20vw"
            className={cn("object-cover", isSold && "opacity-60")}
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
      </div>

      <div className="text-[11px] font-semibold text-accent-green-dark flex items-center gap-1">
        <Icon name="location_on" size={13} />
        {listing.localityLabel}
      </div>

      <h3 className="text-xs font-bold text-on-surface line-clamp-2 mt-1">{listing.title}</h3>

      <Price value={listing.price} compareAt={listing.compareAtPrice} size="sm" className="mt-2" />
    </Link>
  );
}
