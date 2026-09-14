import { useTranslations } from "next-intl";
import Image from "next/image";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { PhoneReveal } from "./phone-reveal";
import { ListingCard } from "./listing-card";
import { SellerRatingSummary } from "./seller-rating-summary";
import { SellerReviews } from "./seller-reviews";
import type { Listing, Seller } from "@/types";

export function SellerStorefront({ seller, listings }: { seller: Seller; listings: Listing[] }) {
  const t = useTranslations("marketplace");

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-2xl border border-surface-border overflow-hidden">
        {/* aspect-[3/1] matches what SellerProfileFields' banner cropper
            outputs, so a banner uploaded through it always fills this
            exactly — no further cropping needed on display. A banner from
            before that cropper existed just gets object-cover's best fit. */}
        <div className="relative aspect-[3/1] w-full bg-surface-low sm:aspect-[3.5/1]">
          {seller.storefrontBanner ? (
            <Image src={seller.storefrontBanner} alt="" fill sizes="100vw" className="object-cover" priority />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-brand-100 to-brand-50" />
          )}
          <Avatar
            initials={seller.initials}
            src={seller.avatarUrl}
            alt={seller.name}
            size="xl"
            className="absolute -bottom-8 left-5 border-4 border-surface shadow-md sm:-bottom-10 sm:left-6"
          />
        </div>
        <div className="p-5 pt-10 sm:p-6 sm:pt-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="sm:pl-[6.5rem]">
            <h1 className="text-xl sm:text-2xl font-extrabold text-on-surface tracking-tight">
              {seller.name}
            </h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <SellerRatingSummary seller={seller} />
              {seller.verified && (
                <Badge tone="green" icon="check_circle">
                  {t("verified")}
                </Badge>
              )}
            </div>
            <p className="text-xs text-on-surface-muted flex items-center gap-1 mt-1">
              <Icon name="location_on" size={13} />
              {seller.localityLabel}
              {seller.memberSince && (
                <>
                  {" · "}
                  {t("memberSince", { date: new Date(seller.memberSince).getFullYear() })}
                </>
              )}
            </p>
            {seller.description && <p className="mt-1.5 text-sm text-on-surface">{seller.description}</p>}
          </div>
          <PhoneReveal phone={seller.phone} listingTitle={seller.name} />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-extrabold text-on-surface tracking-tight">
          {t("allListingsBy", { seller: seller.name })}
        </h2>
        {listings.length === 0 ? (
          <p className="text-sm text-on-surface-muted">{t("noListingsYet")}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>

      <SellerReviews seller={seller} />
    </div>
  );
}
