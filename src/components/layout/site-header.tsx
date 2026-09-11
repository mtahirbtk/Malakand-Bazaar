"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { BrandLogo } from "./brand-logo";
import { CategoryRibbon } from "./category-ribbon";
import { CATEGORY_OPTIONS } from "@/data/categories";
import { Link } from "@/i18n/routing";

/**
 * Ported from code.html:93-161. The mockup's category dropdown listed six
 * ad hoc sectors ("Agro & Daily Fresh", "Vehicles & CD70", ...); this uses
 * the real 26-category taxonomy instead — a Combobox, not a 6-item native
 * select, matches "All Sectors" as a department-level scope.
 */
export function SiteHeader() {
  const t = useTranslations("header");
  const common = useTranslations("common");
  const [sector, setSector] = React.useState("");
  const [query, setQuery] = React.useState("");

  return (
    <header className="bg-surface sticky top-0 z-50 border-b border-surface-border shadow-sm">
      <div className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-2 sm:gap-4 lg:gap-8">
        <Link className="shrink-0 flex items-center gap-2 group" href="/">
          {/* Smaller than the source's flat h-10 below sm: at 390px width the
              header's action items (sign in + Become a Seller) don't fit
              beside a 40px-tall logo without causing horizontal scroll. */}
          <BrandLogo className="h-8 sm:h-10 md:h-12 w-auto" />
        </Link>

        {/* min-w-0 overrides the flex-item default of min-width:auto — without
            it, this flex-1 box refuses to shrink below the Input's intrinsic
            content width and forces the whole header to overflow between
            roughly 768-880px, where the search form has least room. */}
        <div className="flex-1 min-w-0 max-w-3xl hidden md:block">
          <form
            className="flex items-stretch border-2 border-accent-green rounded-lg overflow-hidden bg-surface shadow-xs"
            onSubmit={(e) => e.preventDefault()}
            role="search"
          >
            <div className="relative flex items-center bg-surface-low border-r border-surface-border px-3 shrink-0">
              <Icon name="category" size={18} className="text-secondary mr-1" />
              <Combobox
                ariaLabel={t("sectorAria")}
                value={sector}
                onValueChange={setSector}
                options={CATEGORY_OPTIONS}
                placeholder={t("sectorPlaceholder")}
                searchPlaceholder={t("sectorAria")}
                emptyText={t("sectorPlaceholder")}
                className="border-0 bg-transparent h-auto px-0 py-2 pr-6 text-xs"
              />
            </div>
            <Input
              type="search"
              aria-label={common("search")}
              placeholder={t("searchPlaceholderDesktop")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-0 rounded-none focus:ring-0 h-auto py-2.5 min-w-0"
            />
            <Button type="submit" variant="whatsapp" className="rounded-none px-6">
              <Icon name="search" size={22} />
            </Button>
          </form>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            type="button"
            className="hidden xl:flex items-center gap-2 border border-surface-border hover:border-brand-400 bg-surface-low/80 hover:bg-surface-low px-3.5 py-2 rounded-lg text-left transition-colors"
          >
            <Icon name="store" size={22} className="text-primary" />
            <div className="leading-tight">
              <div className="text-[10px] uppercase font-bold text-on-surface-muted tracking-wider">
                {t("tradingHub")}
              </div>
              <div className="text-xs font-bold text-primary flex items-center gap-0.5">
                {t("tradingHubValue")}
                <Icon name="expand_more" size={14} />
              </div>
            </div>
          </button>

          <Link
            className="flex items-center gap-1.5 text-on-surface hover:text-brand-600 font-semibold text-xs px-2 py-2 transition-colors"
            href="/sign-in"
          >
            <Icon name="person" size={24} className="text-secondary" />
            <span className="hidden sm:inline">{common("signIn")}</span>
          </Link>

          <Button asChild size="md" className="px-3 sm:px-4 sm:text-sm">
            {/* Below 375px even the tightened button can't fit logo + sign-in +
                "Become a Seller" without horizontal scroll, so the label
                collapses to icon-only; aria-label keeps it announced. */}
            <Link href="/sell" aria-label={common("becomeSeller")}>
              <Icon name="storefront" size={18} />
              <span className="hidden min-[375px]:inline">{common("becomeSeller")}</span>
              <span className="hidden md:inline-block text-[10px] bg-white/20 text-white font-semibold px-1.5 py-0.5 rounded-full ml-0.5">
                {common("free")}
              </span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="md:hidden px-4 pb-3">
        <form
          className="flex items-stretch border-2 border-accent-green rounded-lg overflow-hidden bg-surface"
          onSubmit={(e) => e.preventDefault()}
          role="search"
        >
          <Input
            type="search"
            aria-label={common("search")}
            placeholder={t("searchPlaceholderMobile")}
            className="border-0 rounded-none focus:ring-0 h-auto py-2 text-xs"
          />
          <Button type="submit" variant="whatsapp" className="rounded-none px-4">
            <Icon name="search" size={20} />
          </Button>
        </form>
      </div>

      <CategoryRibbon />
    </header>
  );
}
