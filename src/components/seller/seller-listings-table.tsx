"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useAuth } from "@/lib/auth/auth-context";
import { getListingsBySellerOverlay, setListingStatus } from "@/lib/mock-db/listings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Price } from "@/components/ui/price";
import type { Listing, ListingStatus, BadgeTone } from "@/types";

const STATUS_TONE: Record<ListingStatus, BadgeTone> = {
  active: "green",
  reserved: "sand",
  sold: "neutral",
  removed: "danger",
};

const STATUS_LABEL_KEY: Record<ListingStatus, string> = {
  active: "activeTab",
  reserved: "reservedTab",
  sold: "soldTab",
  removed: "removedTab",
};

export function SellerListingsTable() {
  const t = useTranslations("sellerListings");
  const { user } = useAuth();
  const [listings, setListings] = React.useState<Listing[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<ListingStatus>("active");

  const refresh = React.useCallback(() => {
    if (!user?.sellerId) return;
    setListings(getListingsBySellerOverlay(user.sellerId));
  }, [user?.sellerId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const visible = listings.filter((l) => l.status === statusFilter);

  function handleStatusChange(id: string, status: ListingStatus) {
    setListingStatus(id, status);
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as ListingStatus)}
          tabs={[
            { value: "active", label: t("activeTab") },
            { value: "reserved", label: t("reservedTab") },
            { value: "sold", label: t("soldTab") },
            { value: "removed", label: t("removedTab") },
          ]}
        />
        <Button asChild size="md">
          <Link href="/seller/dashboard/listings/new">{t("addListingCta")}</Link>
        </Button>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon="inventory_2" title={t("emptyTitle")} body={t("emptyBody")} />
      ) : (
        <div className="space-y-2">
          {visible.map((listing) => (
            <div
              key={listing.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-on-surface">{listing.title}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Price value={listing.price} size="sm" />
                  <Badge tone={STATUS_TONE[listing.status]}>{t(STATUS_LABEL_KEY[listing.status])}</Badge>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="subtle" size="sm">
                  <Link href={`/seller/dashboard/listings/${listing.id}/edit`}>{t("editCta")}</Link>
                </Button>
                {listing.status !== "reserved" && (
                  <Button variant="subtle" size="sm" onClick={() => handleStatusChange(listing.id, "reserved")}>
                    {t("markReservedCta")}
                  </Button>
                )}
                {listing.status !== "sold" && (
                  <Button variant="subtle" size="sm" onClick={() => handleStatusChange(listing.id, "sold")}>
                    {t("markSoldCta")}
                  </Button>
                )}
                {listing.status !== "removed" && (
                  <Button variant="ghost" size="sm" onClick={() => handleStatusChange(listing.id, "removed")}>
                    {t("removeCta")}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
