"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { Select, type SelectOption } from "@/components/ui/select";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ListingCard } from "@/components/marketplace/listing-card";
import { SearchFiltersPanel, type SearchFiltersValue } from "@/components/marketplace/search-filters";
import { SORT_OPTIONS, categoryLabel, subcategoryLabel, type SortOption } from "@/lib/search-filters";
import { findTehsil } from "@/data/tehsils";
import type { TehsilSlug } from "@/types";
import type { SearchListingsQuery } from "@/server/schemas/listings";
import type { SearchListingsResult } from "@/server/services/listings";

/**
 * Ported from code.html (malakandbazaar_grand_search_filter_catalog_page).
 * The header already carries the site's one grand-search input (see
 * site-header.tsx), so this page doesn't repeat it — just the breadcrumb,
 * filter bar, sidebar and result grid the mockup builds below that input.
 * "Quick Jump" chips and the bottom guarantee banner are dropped: both are
 * marketing filler already covered by the home page, not core search/filter
 * function.
 *
 * All the filtering, sorting, pagination and facet counting happens
 * server-side (`fn_search_listings` via `/search`'s page.tsx) — this
 * component's only job is to render that result and turn every interaction
 * into a URL change, which is what makes a filtered search shareable and
 * bookmarkable. `router.push` triggers a real navigation, so browser
 * back/forward and reloads land on the exact same filtered page.
 */
export function ClientSearch({
  query,
  result,
}: {
  query: SearchListingsQuery;
  result: SearchListingsResult;
}) {
  const t = useTranslations("search");
  const common = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();

  const [queryDraft, setQueryDraft] = React.useState(query.q ?? "");
  const [mobileFiltersOpen, setMobileFiltersOpen] = React.useState(false);

  /**
   * Every filter control below reads this, not the `query` prop directly.
   *
   * `query` is server-confirmed state: it only changes once the navigation
   * a control triggers has round-tripped (middleware -> layout -> the
   * `searchListings` DB call). Reading controls straight off it means a
   * checkbox, the sort <Select>, or a chip's remove button shows *no visual
   * change at all* — not even its own checked/selected state — until that
   * finishes, which is the "even the component itself doesn't load" feel.
   * `navigate()` updates this immediately; the effect below reconciles it
   * once the real navigation lands (or on back/forward).
   */
  const [optimisticQuery, setOptimisticQuery] = React.useState<SearchListingsQuery>(query);

  React.useEffect(() => {
    setQueryDraft(query.q ?? "");
    setOptimisticQuery(query);
  }, [query]);

  const tehsils = (optimisticQuery.tehsil ?? []) as TehsilSlug[];

  type Patch = Partial<{
    q: string;
    category: string;
    subcategory: string;
    tehsils: TehsilSlug[];
    minPrice: number | null;
    maxPrice: number | null;
    availability: "active" | "all";
    verifiedOnly: boolean;
    sort: SortOption;
    page: number;
  }>;

  function navigate(patch: Patch) {
    const params = new URLSearchParams();
    const next = {
      q: patch.q !== undefined ? patch.q : optimisticQuery.q ?? "",
      category: patch.category !== undefined ? patch.category : optimisticQuery.category ?? "",
      subcategory: patch.subcategory !== undefined ? patch.subcategory : optimisticQuery.subcategory ?? "",
      tehsils: patch.tehsils !== undefined ? patch.tehsils : tehsils,
      minPrice: patch.minPrice !== undefined ? patch.minPrice : optimisticQuery.minPrice ?? null,
      maxPrice: patch.maxPrice !== undefined ? patch.maxPrice : optimisticQuery.maxPrice ?? null,
      availability: patch.availability !== undefined ? patch.availability : optimisticQuery.availability,
      verifiedOnly: patch.verifiedOnly !== undefined ? patch.verifiedOnly : optimisticQuery.verifiedOnly,
      sort: patch.sort !== undefined ? patch.sort : (optimisticQuery.sort as SortOption),
      // Any filter change resets to page 1; an explicit page patch (the pager) doesn't.
      page: patch.page !== undefined ? patch.page : 1,
    };

    // Flip every control to its new value now — the server round trip below
    // updates the result grid, not whether the checkbox looks checked.
    setOptimisticQuery((prev) => ({
      ...prev,
      q: next.q || undefined,
      category: next.category || undefined,
      subcategory: next.subcategory || undefined,
      tehsil: next.tehsils.length ? next.tehsils : undefined,
      minPrice: next.minPrice ?? undefined,
      maxPrice: next.maxPrice ?? undefined,
      availability: next.availability,
      verifiedOnly: next.verifiedOnly,
      sort: next.sort,
      page: next.page,
    }));

    if (next.q) params.set("q", next.q);
    if (next.category) params.set("category", next.category);
    if (next.subcategory) params.set("subcategory", next.subcategory);
    if (next.tehsils.length) params.set("tehsil", next.tehsils.join(","));
    if (next.minPrice !== null) params.set("minPrice", String(next.minPrice));
    if (next.maxPrice !== null) params.set("maxPrice", String(next.maxPrice));
    if (next.availability !== "active") params.set("availability", next.availability);
    if (next.verifiedOnly) params.set("verifiedOnly", "true");
    if (next.sort !== "relevant") params.set("sort", next.sort);
    if (next.page > 1) params.set("page", String(next.page));

    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate({ q: queryDraft });
  }

  function resetAll() {
    setQueryDraft("");
    setOptimisticQuery((prev) => ({
      ...prev,
      q: undefined,
      category: undefined,
      subcategory: undefined,
      tehsil: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      availability: "active",
      verifiedOnly: false,
      sort: "relevant" as SortOption,
      page: 1,
    }));
    router.push(pathname, { scroll: false });
  }

  const sortOptions: SelectOption[] = SORT_OPTIONS.map((value) => ({ value, label: t(`sort.${value}`) }));

  const activeChips: { key: string; label: string; onRemove: () => void }[] = [];
  if (optimisticQuery.q) {
    activeChips.push({
      key: "q",
      label: t("searchFilterChip", { query: optimisticQuery.q }),
      onRemove: () => {
        setQueryDraft("");
        navigate({ q: "" });
      },
    });
  }
  if (optimisticQuery.category) {
    activeChips.push({
      key: "category",
      label: t("categoryFilterChip", {
        category: categoryLabel(optimisticQuery.category) ?? optimisticQuery.category,
      }),
      onRemove: () => navigate({ category: "", subcategory: "" }),
    });
  }
  if (optimisticQuery.subcategory) {
    activeChips.push({
      key: "subcategory",
      label: subcategoryLabel(optimisticQuery.subcategory) ?? optimisticQuery.subcategory,
      onRemove: () => navigate({ subcategory: "" }),
    });
  }
  for (const tehsilSlug of tehsils) {
    activeChips.push({
      key: `tehsil-${tehsilSlug}`,
      label: t("tehsilFilterChip", { tehsil: findTehsil(tehsilSlug)?.nameEn ?? tehsilSlug }),
      onRemove: () => navigate({ tehsils: tehsils.filter((s) => s !== tehsilSlug) }),
    });
  }
  if (optimisticQuery.verifiedOnly) {
    activeChips.push({
      key: "verified",
      label: t("verifiedFilterChip"),
      onRemove: () => navigate({ verifiedOnly: false }),
    });
  }
  if (optimisticQuery.minPrice !== undefined || optimisticQuery.maxPrice !== undefined) {
    activeChips.push({
      key: "price",
      label: t("priceFilterChip", {
        from: (optimisticQuery.minPrice ?? 0).toLocaleString("en-US"),
        to: (optimisticQuery.maxPrice ?? 0).toLocaleString("en-US"),
      }),
      onRemove: () => navigate({ minPrice: null, maxPrice: null }),
    });
  }

  const filtersValue: SearchFiltersValue = {
    category: optimisticQuery.category ?? "",
    subcategory: optimisticQuery.subcategory ?? "",
    tehsils,
    minPrice: optimisticQuery.minPrice ?? null,
    maxPrice: optimisticQuery.maxPrice ?? null,
    availability: optimisticQuery.availability,
    verifiedOnly: optimisticQuery.verifiedOnly,
  };

  const priceMax = Math.max(result.facets.maxPrice ?? 0, filtersValue.maxPrice ?? 0, 100_000);

  const filterPanel = (
    <SearchFiltersPanel
      filters={filtersValue}
      onChange={navigate}
      onReset={resetAll}
      categoryCounts={result.facets.category}
      tehsilCounts={result.facets.tehsil as Record<TehsilSlug, number>}
      priceMax={priceMax}
    />
  );

  const pageCount = Math.max(1, Math.ceil(result.total / result.limit));

  return (
    <div className="space-y-5">
      <Breadcrumb
        items={[
          { label: t("breadcrumbHome"), href: "/" },
          { label: t("breadcrumbCurrent") },
        ]}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex flex-wrap items-center gap-2.5 text-2xl font-extrabold tracking-tight text-on-surface sm:text-3xl">
            <span>{optimisticQuery.q ? t("resultsFor", { query: optimisticQuery.q }) : t("title")}</span>
            <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-bold text-white">
              {t("matches", { count: result.total })}
            </span>
          </h1>
          <p className="mt-1 text-xs text-on-surface-muted sm:text-sm">{t("subheading")}</p>
        </div>

        <form onSubmit={handleSearchSubmit} className="w-full sm:w-72" role="search">
          <Input
            type="search"
            aria-label={common("search")}
            leadingIcon="search"
            inputSize="sm"
            placeholder={t("inlineSearchPlaceholder")}
            value={queryDraft}
            onChange={(e) => setQueryDraft(e.target.value)}
          />
        </form>
      </div>

      {/* Top filter control bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface p-3 shadow-2xs md:flex-row md:items-center md:justify-between sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            className="md:hidden"
            onClick={() => setMobileFiltersOpen(true)}
          >
            <Icon name="tune" size={16} />
            {t("mobileFiltersButton", { count: activeChips.length })}
          </Button>

          {activeChips.length > 0 && (
            <>
              <span className="hidden text-xs font-bold text-on-surface-muted sm:inline">
                {t("activeFiltersLabel")}
              </span>
              {activeChips.map((chip) => (
                <Chip key={chip.key} label={chip.label} onRemove={chip.onRemove} active />
              ))}
              <button
                type="button"
                onClick={resetAll}
                className="ml-1 text-xs font-semibold text-danger hover:underline"
              >
                {t("clearAll")}
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <label htmlFor="search-sort" className="text-xs font-bold uppercase tracking-wider text-on-surface-muted">
            {t("sortLabel")}
          </label>
          <Select
            ariaLabel={t("sortLabel")}
            value={optimisticQuery.sort}
            onValueChange={(value) => navigate({ sort: value as SortOption })}
            options={sortOptions}
            selectSize="sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-4">
        <div className="hidden md:col-span-1 md:block">{filterPanel}</div>

        <Drawer
          open={mobileFiltersOpen}
          onOpenChange={setMobileFiltersOpen}
          title={t("filters")}
          side="left"
        >
          {filterPanel}
        </Drawer>

        <section className="space-y-5 md:col-span-3">
          {result.items.length === 0 ? (
            <EmptyState
              icon="search_off"
              title={t("noResultsTitle")}
              body={t("noResultsBody")}
              action={
                <Button variant="subtle" size="sm" onClick={resetAll}>
                  {t("clearFiltersCta")}
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {result.items.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}

          {result.total > 0 && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-surface-border bg-surface p-4 shadow-2xs sm:flex-row sm:justify-between">
              <span className="text-xs text-on-surface-muted">
                {t("showingRange", {
                  from: (result.page - 1) * result.limit + 1,
                  to: Math.min(result.page * result.limit, result.total),
                  total: result.total,
                })}
              </span>
              <Pagination
                page={result.page}
                pageCount={pageCount}
                onPageChange={(page) => navigate({ page })}
                labels={{
                  previous: t("paginationPrevious"),
                  next: t("paginationNext"),
                  page: t("paginationPage"),
                }}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
