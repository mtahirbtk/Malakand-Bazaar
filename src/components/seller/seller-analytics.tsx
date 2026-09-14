"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { api, ApiClientError } from "@/lib/api-client";
import { Tabs } from "@/components/ui/tabs";
import { BarChart } from "@/components/ui/bar-chart";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { Link } from "@/i18n/routing";

type SellerAnalytics = {
  days: 30 | 90;
  daily: { day: string; views: number; contacts: number }[];
  perListing: { listingId: string; slug: string; title: string; views: number; contacts: number }[];
  totals: {
    periodViews: number;
    periodContacts: number;
    storefrontViews: number;
    allTimeSellerViews: number;
    listingCount: number;
  };
};

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface p-4">
      <p className="text-xs font-semibold text-on-surface-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight text-brand-800">{value.toLocaleString()}</p>
    </div>
  );
}

/** "2026-09-08" -> "8" — dense enough for a 90-bar chart to stay legible. */
function dayOfMonth(iso: string): string {
  return String(Number(iso.slice(8, 10)));
}

export function SellerAnalytics() {
  const t = useTranslations("sellerAnalytics");
  const [days, setDays] = React.useState<"30" | "90">("30");
  const [data, setData] = React.useState<SellerAnalytics | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setData(null);
    api
      .get<SellerAnalytics>(`/api/seller/analytics?days=${days}`)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiClientError ? err.message : t("genericError"));
      });
    return () => {
      cancelled = true;
    };
  }, [days, t]);

  if (error) {
    return (
      <p role="alert" className="text-sm font-semibold text-danger">
        {error}
      </p>
    );
  }
  if (!data) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  const chartData = data.daily.map((d) => ({ label: d.day, value: d.views }));
  const contactChartData = data.daily.map((d) => ({ label: d.day, value: d.contacts }));

  return (
    <div className="space-y-6">
      <Tabs
        value={days}
        onValueChange={(v) => setDays(v as "30" | "90")}
        tabs={[
          { value: "30", label: t("last30Days") },
          { value: "90", label: t("last90Days") },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t("periodViewsLabel")} value={data.totals.periodViews} />
        <StatTile label={t("periodContactsLabel")} value={data.totals.periodContacts} />
        <StatTile label={t("storefrontViewsLabel")} value={data.totals.storefrontViews} />
        <StatTile label={t("listingCountLabel")} value={data.totals.listingCount} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-surface-border bg-surface p-4">
          <h3 className="text-sm font-bold text-on-surface">{t("viewsChartTitle")}</h3>
          <BarChart
            className="mt-3"
            data={chartData.map((d) => ({ ...d, label: dayOfMonth(d.label) }))}
            color="bg-brand-600"
          />
        </div>
        <div className="rounded-xl border border-surface-border bg-surface p-4">
          <h3 className="text-sm font-bold text-on-surface">{t("contactsChartTitle")}</h3>
          <BarChart
            className="mt-3"
            data={contactChartData.map((d) => ({ ...d, label: dayOfMonth(d.label) }))}
            color="bg-tertiary"
          />
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-on-surface">{t("perListingTitle")}</h3>
        {data.perListing.length === 0 ? (
          <EmptyState icon="query_stats" title={t("emptyTitle")} body={t("emptyBody")} />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-surface-border bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-left text-xs font-semibold text-on-surface-muted">
                  <th className="p-3">{t("listingColumn")}</th>
                  <th className="p-3 text-right">{t("viewsColumn")}</th>
                  <th className="p-3 text-right">{t("contactsColumn")}</th>
                </tr>
              </thead>
              <tbody>
                {data.perListing.map((row) => (
                  <tr key={row.listingId} className="border-b border-surface-border last:border-0">
                    <td className="p-3">
                      <Link href={`/listing/${row.slug}`} className="font-medium text-on-surface hover:underline">
                        {row.title}
                      </Link>
                    </td>
                    <td className="p-3 text-right tabular-nums">{row.views.toLocaleString()}</td>
                    <td className="p-3 text-right tabular-nums">{row.contacts.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
