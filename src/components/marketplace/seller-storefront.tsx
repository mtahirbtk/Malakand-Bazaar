import { useTranslations } from "next-intl";
import Image from "next/image";
import { Avatar } from "@/components/ui/avatar";
import { Rating } from "@/components/ui/rating";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { PhoneReveal } from "./phone-reveal";
import { ListingCard } from "./listing-card";
import type { Listing, Seller } from "@/types";

export function SellerStorefront({ seller, listings }: { seller: Seller; listings: Listing[] }) {
  const t = useTranslations("marketplace");

  return (
    <div className="space-y-6">
      <div className="bg-surface rounded-2xl border border-surface-border overflow-hidden">
        {seller.storefrontBanner && (
          <div className="relative h-28 sm:h-40 w-full bg-surface-low">
            <Image src={seller.storefrontBanner} alt="" fill sizes="100vw" className="object-cover" />
          </div>
        )}
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
          <div className="flex items-center gap-3.5">
            <Avatar initials={seller.initials} alt={seller.name} size="lg" />
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-on-surface tracking-tight">
                {seller.name}
              </h1>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <Rating value={seller.rating} count={seller.reviewCount} />
                {seller.verified && (
                  <Badge tone="green" icon="check_circle">
                    {t("verified")}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-on-surface-muted flex items-center gap-1 mt-1">
                <Icon name="location_on" size={13} />
                {seller.localityLabel} · {seller.specialty}
              </p>
            </div>
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
    </div>
  );
}
