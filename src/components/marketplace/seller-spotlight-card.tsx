import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { Rating } from "@/components/ui/rating";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/routing";
import type { Seller } from "@/types";

/**
 * Homepage "Top Sellers" shelf card — ranked by store rating, distinct from
 * the plain directory `SellerCard`: leads with the storefront banner (same
 * aspect the profile-edit cropper outputs) with the avatar overlapping it,
 * and a hover treatment (banner zoom, card lift, CTA reveal) `SellerCard`
 * intentionally doesn't have — that one has to stay calm in a dense grid.
 */
export function SellerSpotlightCard({ seller }: { seller: Seller }) {
  const t = useTranslations("marketplace");

  return (
    <Link
      href={`/seller/${seller.slug}`}
      className="group relative block overflow-hidden rounded-2xl border border-surface-border bg-surface shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-brand-400 hover:shadow-lg focus-visible:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
    >
      {/* Banner */}
      <div className="relative aspect-[16/7] w-full overflow-hidden bg-brand-100">
        {seller.storefrontBanner ? (
          <Image
            src={seller.storefrontBanner}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-110"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-brand-200 to-brand-400" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />

        {seller.verified && (
          <Badge tone="sand" icon="workspace_premium" className="absolute right-3 top-3 shadow-sm">
            {t("verified")}
          </Badge>
        )}
      </div>

      {/* Avatar overlapping the banner — offset and top padding below are
          sized against xl's largest (sm+) rendered size, h-24 = 96px, so it
          never runs into the name at any breakpoint. */}
      <div className="relative px-5">
        <div className="absolute -top-10 left-5 rounded-full ring-4 ring-surface transition-transform duration-300 group-hover:scale-105">
          <Avatar initials={seller.initials} src={seller.avatarUrl} alt={seller.name} size="xl" />
        </div>
      </div>

      <div className="space-y-3 px-5 pb-5 pt-16">
        <div>
          <h3 className="truncate text-lg font-extrabold text-on-surface leading-snug">{seller.name}</h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-accent-green-dark font-semibold">
            <Icon name="location_on" size={16} />
            <span className="truncate">{seller.localityLabel}</span>
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-surface-border/60 pt-3 text-xs text-on-surface-muted">
          <Rating value={seller.rating} count={seller.reviewCount} />
          <span className="font-bold text-on-surface tabular">
            {seller.listingCount ?? 0} {t("activeListings")}
          </span>
        </div>

        {/* CTA — slides up into view on hover/focus, stays reachable (not display:none) for keyboard/SR */}
        <div className="grid h-0 grid-rows-[0fr] transition-[grid-template-rows] duration-300 ease-out group-hover:grid-rows-[1fr] group-focus-visible:grid-rows-[1fr]">
          <div className="overflow-hidden">
            <div className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white">
              <Icon name="storefront" size={17} />
              <span>{t("visitStore")}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
