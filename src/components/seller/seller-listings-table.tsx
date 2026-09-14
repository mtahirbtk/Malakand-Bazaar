"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { api, ApiClientError } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Price } from "@/components/ui/price";
import { Spinner } from "@/components/ui/spinner";
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
  const common = useTranslations("common");
  const [listings, setListings] = React.useState<Listing[] | null>(null);
  const [statusFilter, setStatusFilter] = React.useState<ListingStatus>("active");
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const refresh = React.useCallback(async (status: ListingStatus) => {
    setError(null);
    try {
      const items = await api.get<Listing[]>(`/api/seller/listings?status=${status}&limit=60`);
      setListings(items);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : common("genericError"));
    }
  }, [common]);

  React.useEffect(() => {
    void refresh(statusFilter);
  }, [refresh, statusFilter]);

  async function handleStatusChange(id: string, status: ListingStatus) {
    setPendingId(id);
    setError(null);
    try {
      await api.patch(`/api/seller/listings/${id}/status`, { status });
      await refresh(statusFilter);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : common("genericError"));
    } finally {
      setPendingId(null);
    }
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

      {error && (
        <p role="alert" className="text-xs font-semibold text-danger">
          {error}
        </p>
      )}

      {listings === null ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : listings.length === 0 ? (
        <EmptyState icon="inventory_2" title={t("emptyTitle")} body={t("emptyBody")} />
      ) : (
        <div className="space-y-2">
          {listings.map((listing) => (
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
                  <Button
                    variant="subtle"
                    size="sm"
                    disabled={pendingId === listing.id}
                    onClick={() => handleStatusChange(listing.id, "reserved")}
                  >
                    {t("markReservedCta")}
                  </Button>
                )}
                {listing.status !== "sold" && (
                  <Button
                    variant="subtle"
                    size="sm"
                    disabled={pendingId === listing.id}
                    onClick={() => handleStatusChange(listing.id, "sold")}
                  >
                    {t("markSoldCta")}
                  </Button>
                )}
                {listing.status !== "removed" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pendingId === listing.id}
                    onClick={() => handleStatusChange(listing.id, "removed")}
                  >
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
