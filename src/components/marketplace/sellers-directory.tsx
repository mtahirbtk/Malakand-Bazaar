"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { SellerCard } from "./seller-card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, type SelectOption } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import type { SellersDirectoryQuery } from "@/server/schemas/sellers-directory";
import type { Seller } from "@/types";

/**
 * `/sellers` directory — §2.4 #26. Same "server fetches, client renders and
 * turns interaction into a URL change" pattern as ClientSearch
 * (client-search.tsx): every filter/sort/page change is a real navigation,
 * so the filtered directory stays shareable and bookmarkable. `tehsil` and
 * `category` are supported by the query schema and the service (linked in
 * from elsewhere, e.g. a category page), but this page exposes no control
 * for them — they're only carried through untouched when already present.
 */
export function SellersDirectory({
  query,
  result,
}: {
  query: SellersDirectoryQuery;
  result: { items: Seller[]; total: number };
}) {
  const t = useTranslations("sellers");
  const router = useRouter();
  const pathname = usePathname();

  const [q, setQ] = React.useState(query.q ?? "");

  // Keep the draft in sync with the URL — e.g. browser back/forward, or a
  // filter chip cleared elsewhere on the page.
  React.useEffect(() => {
    setQ(query.q ?? "");
  }, [query.q]);

  function pushQuery(next: Partial<SellersDirectoryQuery>) {
    const merged = {
      q: next.q !== undefined ? next.q : query.q ?? "",
      verifiedOnly: next.verifiedOnly !== undefined ? next.verifiedOnly : query.verifiedOnly,
      sort: next.sort !== undefined ? next.sort : query.sort,
      // A filter/sort change resets to page 1; an explicit page patch (the pager) doesn't.
      page: next.page !== undefined ? next.page : 1,
    };

    const params = new URLSearchParams();
    if (query.tehsil) params.set("tehsil", query.tehsil);
    if (query.category) params.set("category", query.category);
    if (merged.q) params.set("q", merged.q);
    if (merged.verifiedOnly) params.set("verifiedOnly", "true");
    if (merged.sort !== "rating") params.set("sort", merged.sort);
    if (merged.page > 1) params.set("page", String(merged.page));

    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    pushQuery({ q });
  }

  const pageCount = Math.max(1, Math.ceil(result.total / query.limit));

  const sortOptions: SelectOption[] = [
    { value: "rating", label: t("sortRating") },
    { value: "newest", label: t("sortNewest") },
    { value: "listings", label: t("sortListings") },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">{t("title")}</h1>

      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearchSubmit} role="search" className="w-full sm:w-72">
          <Input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            leadingIcon="search"
            aria-label={t("searchPlaceholder")}
            placeholder={t("searchPlaceholder")}
            inputSize="sm"
          />
        </form>
        <Checkbox
          checked={query.verifiedOnly}
          onCheckedChange={(checked) => pushQuery({ verifiedOnly: checked })}
          label={t("verifiedOnlyLabel")}
        />
        <Select
          value={query.sort}
          onValueChange={(sort) => pushQuery({ sort: sort as SellersDirectoryQuery["sort"] })}
          options={sortOptions}
          ariaLabel={t("sortAriaLabel")}
          selectSize="sm"
        />
      </div>

      {result.items.length === 0 ? (
        <EmptyState icon="storefront" title={t("emptyTitle")} body={t("emptyBody")} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {result.items.map((seller) => (
            <SellerCard key={seller.id} seller={seller} />
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <Pagination
          page={query.page ?? 1}
          pageCount={pageCount}
          onPageChange={(page) => pushQuery({ page })}
          labels={{ previous: t("paginationPrevious"), next: t("paginationNext"), page: t("paginationPage") }}
        />
      )}
    </div>
  );
}
