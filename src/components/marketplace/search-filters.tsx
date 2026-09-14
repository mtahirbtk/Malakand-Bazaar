"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Checkbox } from "@/components/ui/checkbox";
import { PriceRange } from "@/components/ui/price-range";
import { Icon } from "@/components/ui/icon";
import { CATEGORIES } from "@/data/categories";
import { TEHSILS } from "@/data/tehsils";
import type { TehsilSlug } from "@/types";
import { cn } from "@/lib/cn";

/** The subset of the search query this sidebar reads and patches. */
export type SearchFiltersValue = {
  category: string;
  subcategory: string;
  tehsils: TehsilSlug[];
  minPrice: number | null;
  maxPrice: number | null;
  availability: "active" | "all";
  verifiedOnly: boolean;
};

/**
 * Ported from code.html:256-465 (the Greenvalley-style sidebar). Two
 * deviations from the mockup: "Shop by Category" behaves as a single-select
 * (the data model gives each listing exactly one category, so multi-check
 * would mean OR-across-categories with nothing to uncheck back to "all"
 * without a dedicated control) and "Seller Type" is dropped — there is no
 * wholesaler/individual field on Seller, and CLAUDE.md rules out inventing
 * per-category attributes that aren't in the data model.
 */
export function SearchFiltersPanel({
  filters,
  onChange,
  onReset,
  categoryCounts,
  tehsilCounts,
  priceMax,
  className,
}: {
  filters: SearchFiltersValue;
  onChange: (patch: Partial<SearchFiltersValue>) => void;
  onReset: () => void;
  categoryCounts: Record<string, number>;
  tehsilCounts: Record<TehsilSlug, number>;
  /** Upper bound for the price slider — the live max across current results. */
  priceMax: number;
  className?: string;
}) {
  const t = useTranslations("search");
  const [priceDraft, setPriceDraft] = React.useState<[number, number]>([
    filters.minPrice ?? 0,
    filters.maxPrice ?? priceMax,
  ]);

  React.useEffect(() => {
    setPriceDraft([filters.minPrice ?? 0, filters.maxPrice ?? priceMax]);
  }, [filters.minPrice, filters.maxPrice, priceMax]);

  function toggleTehsil(slug: TehsilSlug) {
    const next = filters.tehsils.includes(slug)
      ? filters.tehsils.filter((s) => s !== slug)
      : [...filters.tehsils, slug];
    onChange({ tehsils: next });
  }

  return (
    <aside className={cn("space-y-6 rounded-xl border border-surface-border bg-surface p-5 shadow-2xs", className)}>
      <div className="flex items-center justify-between border-b border-surface-border pb-3">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-on-surface">
          <Icon name="tune" size={18} className="text-primary" />
          {t("filters")}
        </h2>
        <button type="button" onClick={onReset} className="text-xs font-semibold text-primary hover:underline">
          {t("resetAll")}
        </button>
      </div>

      {/* Category */}
      <div>
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-on-surface">{t("categoryHeading")}</h3>
        <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
          {CATEGORIES.map((category) => (
            <Checkbox
              key={category.slug}
              label={category.nameEn}
              checked={filters.category === category.slug}
              onCheckedChange={(checked) =>
                onChange(
                  checked
                    ? { category: category.slug, subcategory: "" }
                    : { category: "", subcategory: "" }
                )
              }
              count={categoryCounts[category.slug] ?? 0}
            />
          ))}
        </div>
      </div>

      <hr className="border-surface-border" />

      {/* Price */}
      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface">{t("priceHeading")}</h3>
        <PriceRange
          min={0}
          max={priceMax}
          value={priceDraft}
          onChange={setPriceDraft}
          onApply={() => onChange({ minPrice: priceDraft[0] || null, maxPrice: priceDraft[1] })}
          labels={{
            from: t("priceFrom"),
            to: t("priceTo"),
            apply: t("priceApply"),
            highest: t("priceHighest"),
          }}
        />
      </div>

      <hr className="border-surface-border" />

      {/* Availability */}
      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface">{t("availabilityHeading")}</h3>
        <Checkbox
          label={t("availabilityActiveOnly")}
          checked={filters.availability === "active"}
          onCheckedChange={(checked) => onChange({ availability: checked ? "active" : "all" })}
        />
      </div>

      <hr className="border-surface-border" />

      {/* Tehsil / locality */}
      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface">{t("localityHeading")}</h3>
        <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
          {TEHSILS.map((tehsil) => (
            <Checkbox
              key={tehsil.slug}
              label={tehsil.nameEn}
              checked={filters.tehsils.includes(tehsil.slug)}
              onCheckedChange={() => toggleTehsil(tehsil.slug)}
              count={tehsilCounts[tehsil.slug] ?? 0}
            />
          ))}
        </div>
      </div>

      <hr className="border-surface-border" />

      {/* Verified seller */}
      <div>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-on-surface">{t("sellerHeading")}</h3>
        <Checkbox
          label={t("verifiedOnly")}
          checked={filters.verifiedOnly}
          onCheckedChange={(checked) => onChange({ verifiedOnly: checked })}
        />
      </div>

      {/* WhatsApp facilitation card — ported from code.html:452-464 */}
      <div className="space-y-2 rounded-xl bg-gradient-to-br from-primary to-primary-dark p-4 text-xs text-white">
        <p className="flex items-center gap-1.5 font-bold text-emerald-200">
          <Icon name="chat" size={16} />
          {t("helpTitle")}
        </p>
        <p className="text-[11px] leading-relaxed text-white/85">{t("helpBody")}</p>
        <a
          href="https://wa.me/923166441108"
          target="_blank"
          rel="noreferrer"
          className="block rounded bg-accent-green-dark py-1.5 text-center font-bold text-white shadow-sm transition-colors hover:bg-accent-green-darker"
        >
          {t("helpCta")}
        </a>
      </div>
    </aside>
  );
}
