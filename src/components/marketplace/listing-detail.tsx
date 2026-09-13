import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/ui/price";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/routing";
import { ImageGallery } from "./image-gallery";
import { PhoneReveal } from "./phone-reveal";
import { SaveListingButton } from "./save-listing-button";
import { LocationMap } from "./location-map";
import { CATEGORIES } from "@/data/categories";
import type { Listing, ListingSellerCard } from "@/types";

export function ListingDetail({
  listing,
  seller,
  otherListingsSlot,
}: {
  listing: Listing;
  seller: ListingSellerCard | undefined;
  /**
   * The "more from this seller" strip, rendered by the caller behind its own
   * `<Suspense>` — see `seller-other-listings.tsx`. Kept as a slot rather
   * than a `Listing[]` prop so this component doesn't gate on that fetch.
   */
  otherListingsSlot: ReactNode;
}) {
  const t = useTranslations("marketplace");
  const isSold = listing.status !== "active";
  const category = CATEGORIES.find((c) => c.slug === listing.categorySlug);
  const posted = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(
    new Date(listing.createdAt)
  );
  const mapCoordinates = seller?.coordinates ?? listing.coordinates;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div>
        <ImageGallery images={listing.images} alt={listing.title} iconFallback={listing.iconFallback} />
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          {listing.badge && !isSold && <Badge tone={listing.badge.tone}>{listing.badge.label}</Badge>}
          {isSold && (
            <Badge tone="neutral">{listing.status === "sold" ? t("sold") : t("reserved")}</Badge>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-on-surface tracking-tight">
          {listing.title}
        </h1>

        <Price value={listing.price} compareAt={listing.compareAtPrice} size="lg" />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-on-surface-muted border-y border-surface-border py-3">
          <span className="flex items-center gap-1 font-semibold text-accent-green-dark">
            <Icon name="location_on" size={14} />
            {listing.localityLabel}
          </span>
          {category && (
            <span className="flex items-center gap-1">
              <Icon name="category" size={14} />
              {category.nameEn}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Icon name="calendar_today" size={13} />
            {t("postedOn", { date: posted })}
          </span>
        </div>

        <p className="text-sm text-on-surface leading-relaxed">{listing.description}</p>

        <div className="flex items-center gap-2 mt-2">
          <PhoneReveal phone={listing.contactPhone} listingTitle={listing.title} />
          <SaveListingButton listingId={listing.id} />
        </div>

        {seller && (
          <Link
            href={`/seller/${seller.slug}`}
            className="flex items-center justify-between rounded-xl border border-surface-border p-3.5 hover:border-brand-400 transition-colors"
          >
            <div>
              <div className="text-[11px] text-on-surface-muted font-semibold uppercase tracking-wider">
                {t("soldBy")}
              </div>
              <div className="text-sm font-extrabold text-on-surface">{seller.name}</div>
            </div>
            <span className="text-xs font-bold text-brand-700 flex items-center gap-1">
              {t("visitStorefront")}
              <Icon name="arrow_forward" size={15} />
            </span>
          </Link>
        )}

        {mapCoordinates && (
          <LocationMap coordinates={mapCoordinates} label={seller?.name ?? listing.title} />
        )}
      </div>

      {seller && otherListingsSlot}
    </div>
  );
}
