"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Select } from "@/components/ui/select";
import { Drawer } from "@/components/ui/drawer";
import { Avatar } from "@/components/ui/avatar";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { BrandLogo } from "./brand-logo";
import { CategoryRibbon } from "./category-ribbon";
import { LocaleSwitcher } from "./locale-switcher";
import { MegaMenu } from "./mega-menu";
import { CATEGORY_OPTIONS } from "@/data/categories";
import { TEHSIL_OPTIONS } from "@/data/tehsils";
import { QUICK_LINKS } from "@/data/quick-links";
import { Link } from "@/i18n/routing";
import { useAuth } from "@/lib/mock-db/auth-context";
import { getSellerByIdOverlay } from "@/lib/mock-db/sellers";

/**
 * Ported from code.html:93-161. The mockup's category dropdown listed six
 * ad hoc sectors ("Agro & Daily Fresh", "Vehicles & CD70", ...); this uses
 * the real 26-category taxonomy instead — a Combobox, not a 6-item native
 * select, matches "All Sectors" as a department-level scope.
 */
export function SiteHeader() {
  const t = useTranslations("header");
  const common = useTranslations("common");
  const announcement = useTranslations("announcement");
  const locale = useTranslations("locale");
  const nav = useTranslations("nav");
  const { user, logout } = useAuth();
  const currentLocale = useLocale();
  const [sector, setSector] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [categoriesOpen, setCategoriesOpen] = React.useState(false);
  const [tehsil, setTehsil] = React.useState("all");
  const sellerSlug = user?.sellerId ? getSellerByIdOverlay(user.sellerId)?.slug : undefined;

  return (
    <header className="bg-surface sticky top-0 z-50 border-b border-surface-border shadow-sm">
      <div className="max-w-[1360px] mx-auto px-3 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-2 sm:gap-4 lg:gap-8">
        <div className="flex items-center gap-2 shrink-0">
          {/* Tehsil + language live here on mobile instead of the
              announcement bar — see announcement-bar.tsx. */}
          <button
            type="button"
            aria-label={t("menuAria")}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
            className="sm:hidden flex items-center justify-center p-2 -ml-2 text-on-surface rounded-lg hover:bg-surface-low"
          >
            <Icon name="menu" size={24} />
          </button>

          <Link className="flex items-center gap-2 group" href="/">
            {/* Smaller than the source's flat h-10 below sm: at 390px width the
                header's action items (sign in + Become a Seller) don't fit
                beside a 40px-tall logo without causing horizontal scroll. */}
            <BrandLogo className="h-8 sm:h-10 md:h-12 w-auto" />
          </Link>
        </div>

        <Drawer open={menuOpen} onOpenChange={setMenuOpen} title={t("menuTitle")} side="left">
          <div className="space-y-5">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setCategoriesOpen(true);
              }}
              className="flex w-full items-center justify-between rounded-lg bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white"
            >
              <span className="flex items-center gap-2">
                <Icon name="menu" size={18} />
                {nav("allCategories")}
              </span>
              <Icon name="chevron_right" size={16} />
            </button>

            <ul className="space-y-2.5">
              {QUICK_LINKS.map((link) => (
                <li key={link.labelKey}>
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="text-sm font-semibold text-on-surface hover:text-brand-600"
                  >
                    {nav(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>

            <div className="border-t border-surface-border pt-4">
              <div className="text-[11px] font-bold text-on-surface-muted uppercase tracking-wider mb-1.5">
                {announcement("tehsilLabel")}
              </div>
              <Select
                ariaLabel={announcement("tehsilAria")}
                selectSize="sm"
                value={tehsil}
                onValueChange={setTehsil}
                options={TEHSIL_OPTIONS}
                className="w-full"
              />
            </div>
            <div>
              <div className="text-[11px] font-bold text-on-surface-muted uppercase tracking-wider mb-1.5">
                {locale("aria")}
              </div>
              <LocaleSwitcher />
            </div>
          </div>
        </Drawer>

        <MegaMenu open={categoriesOpen} onOpenChange={setCategoriesOpen} />

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
          {user ? (
            <DropdownMenu
              ariaLabel={t("accountMenuAria")}
              align="end"
              trigger={
                <button
                  type="button"
                  aria-label={t("accountMenuAria")}
                  className="flex items-center gap-1.5 rounded-full p-0.5 transition-colors hover:bg-surface-low"
                >
                  <Avatar initials={user.displayName.slice(0, 2).toUpperCase()} alt={user.displayName} size="sm" />
                </button>
              }
              items={[
                ...(user.role === "seller" && sellerSlug
                  ? [{ label: t("myStorefront"), icon: "storefront", href: `/${currentLocale}/seller/${sellerSlug}` }]
                  : []),
                ...(user.role === "seller"
                  ? [{ label: t("myDashboard"), icon: "dashboard", href: `/${currentLocale}/seller/dashboard/listings` }]
                  : []),
                { label: t("logout"), icon: "logout", onSelect: () => logout() },
              ]}
            />
          ) : (
            <Link
              className="flex items-center gap-1.5 text-on-surface hover:text-brand-600 font-semibold text-xs px-2 py-2 transition-colors"
              href="/sign-in"
            >
              <Icon name="person" size={24} className="text-secondary" />
              <span className="hidden sm:inline">{common("signIn")}</span>
            </Link>
          )}

          {user?.role !== "seller" && (
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
          )}
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
