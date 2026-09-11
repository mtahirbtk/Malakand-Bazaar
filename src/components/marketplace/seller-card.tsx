import * as React from "react";
import { useTranslations } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { Rating } from "@/components/ui/rating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/routing";
import type { Seller } from "@/types";

/** Ported from code.html:971-1006 (Seller 1: Khan Solar). */
export function SellerCard({ seller }: { seller: Seller }) {
  const t = useTranslations("marketplace");

  return (
    <div className="bg-surface-low border border-surface-border rounded-xl p-4 flex flex-col justify-between hover:border-brand-400 hover:shadow-sm transition-all">
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <Avatar initials={seller.initials} alt={seller.name} size="md" />
          <Rating value={seller.rating} count={seller.reviewCount} />
        </div>

        <div>
          <h4 className="text-sm font-extrabold text-primary leading-snug">{seller.name}</h4>
          <p className="text-[11px] text-accent-green-dark font-semibold flex items-center gap-1 mt-0.5">
            <Icon name="location_on" size={13} />
            {seller.localityLabel}
          </p>
          {seller.verified && (
            <Badge tone="green" icon="check_circle" className="mt-1">
              {t("verified")}
            </Badge>
          )}
        </div>

        <div className="text-[11px] text-on-surface-muted space-y-1 pt-1 border-t border-surface-border/60">
          <div className="flex items-center justify-between">
            <span>Response:</span>
            <span className="font-bold text-accent-green-dark tabular">
              &lt; {seller.responseMinutes} mins
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>{seller.statLabel}:</span>
            <span className="font-bold text-on-surface tabular">{seller.statValue}</span>
          </div>
          <div className="text-[10px] bg-white px-2 py-1 rounded border border-surface-border text-on-surface-muted mt-1">
            Specialty: {seller.specialty}
          </div>
        </div>
      </div>

      <Button asChild className="mt-3.5 w-full">
        <Link href={`/seller/${seller.slug}`}>
          <Icon name="storefront" size={15} />
          <span>{t("visitStore")}</span>
        </Link>
      </Button>
    </div>
  );
}
