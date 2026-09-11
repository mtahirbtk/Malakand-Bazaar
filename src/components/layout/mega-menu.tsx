"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { Drawer } from "@/components/ui/drawer";
import { CATEGORIES } from "@/data/categories";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/cn";
import { useMediaQuery } from "@/lib/use-media-query";

/**
 * Full category list, not part of the static Stitch export (its "All
 * Categories" trigger is inert markup) but required by the brief: every
 * category must be reachable.
 *
 * A flat grid of all 26 categories + their subcategories at once was too
 * large. Desktop is now a two-pane flyout: a plain category list on the
 * left, hovering (or focusing) a row opens its subcategories on the right.
 * Mobile has no hover, so each row expands inline on tap instead — same
 * idea, different trigger.
 *
 * The desktop/mobile split is still a JS media query, not a CSS "hidden
 * md:block" wrapper: Drawer's Dialog.Content portals straight to
 * document.body, so a CSS class on a wrapper around <Drawer> has no effect
 * on whether the portaled content renders — it would show at every
 * viewport once opened.
 */
export function MegaMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("megaMenu");
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [activeSlug, setActiveSlug] = React.useState(CATEGORIES[0]?.slug);
  const [expandedSlug, setExpandedSlug] = React.useState<string | null>(null);
  const activeCategory = CATEGORIES.find((c) => c.slug === activeSlug);

  React.useEffect(() => {
    if (!open || !isDesktop) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onOpenChange(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, isDesktop, onOpenChange]);

  return (
    <>
      {isDesktop && open && (
        <div
          role="dialog"
          aria-label={t("title")}
          className="hidden md:flex absolute left-0 top-full z-50 mt-px w-[min(90vw,720px)] max-h-[70vh] rounded-b-xl border border-surface-border bg-surface shadow-floating overflow-hidden"
        >
          <ul className="w-56 shrink-0 overflow-y-auto custom-scrollbar border-r border-surface-border py-2">
            {CATEGORIES.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/search?category=${category.slug}`}
                  onClick={() => onOpenChange(false)}
                  onMouseEnter={() => setActiveSlug(category.slug)}
                  onFocus={() => setActiveSlug(category.slug)}
                  className={cn(
                    "flex items-center justify-between gap-2 px-4 py-2 text-xs font-semibold transition-colors",
                    category.slug === activeSlug
                      ? "bg-brand-50 text-brand-700"
                      : "text-on-surface hover:bg-brand-50 hover:text-brand-700"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Icon name={category.icon} size={16} />
                    {category.nameEn}
                  </span>
                  <Icon name="chevron_right" size={16} className="text-on-surface-muted" />
                </Link>
              </li>
            ))}
          </ul>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
            {activeCategory && (
              <>
                <div className="font-extrabold text-sm text-brand-700 mb-3">
                  {activeCategory.nameEn}
                </div>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                  {activeCategory.subcategories.map((sub) => (
                    <Link
                      key={sub.slug}
                      href={`/search?subcategory=${sub.slug}`}
                      onClick={() => onOpenChange(false)}
                      className="text-xs text-on-surface-muted hover:text-brand-600 transition-colors"
                    >
                      {sub.nameEn}
                    </Link>
                  ))}
                </div>
                <Link
                  href={`/search?category=${activeCategory.slug}`}
                  onClick={() => onOpenChange(false)}
                  className="inline-block mt-4 text-xs font-bold text-brand-600 hover:underline"
                >
                  {t("viewAll")} →
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {!isDesktop && (
        <Drawer open={open} onOpenChange={onOpenChange} title={t("title")} side="left">
          <ul className="divide-y divide-surface-border">
            {CATEGORIES.map((category) => {
              const isExpanded = expandedSlug === category.slug;
              return (
                <li key={category.slug} className="py-1">
                  <div className="flex items-center">
                    <Link
                      href={`/search?category=${category.slug}`}
                      onClick={() => onOpenChange(false)}
                      className="flex flex-1 items-center gap-2 py-1.5 font-bold text-sm text-on-surface"
                    >
                      <Icon name={category.icon} size={18} className="text-brand-600" />
                      {category.nameEn}
                    </Link>
                    <button
                      type="button"
                      aria-label={t("toggleSubcategories", { category: category.nameEn })}
                      aria-expanded={isExpanded}
                      onClick={() => setExpandedSlug(isExpanded ? null : category.slug)}
                      className="p-2 text-on-surface-muted"
                    >
                      <Icon
                        name="expand_more"
                        size={20}
                        className={cn("transition-transform", isExpanded && "rotate-180")}
                      />
                    </button>
                  </div>
                  {isExpanded && (
                    <ul className="pb-2 pl-7 space-y-1.5">
                      {category.subcategories.map((sub) => (
                        <li key={sub.slug}>
                          <Link
                            href={`/search?subcategory=${sub.slug}`}
                            onClick={() => onOpenChange(false)}
                            className="text-xs text-on-surface-muted hover:text-brand-600 transition-colors"
                          >
                            {sub.nameEn}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </Drawer>
      )}
    </>
  );
}
