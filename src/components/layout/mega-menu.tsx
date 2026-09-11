"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { Drawer } from "@/components/ui/drawer";
import { CATEGORIES } from "@/data/categories";
import { Link } from "@/i18n/routing";
import { useMediaQuery } from "@/lib/use-media-query";

/**
 * Full category grid, not part of the static Stitch export (its "All
 * Categories" trigger is inert markup) but required by the brief: every
 * category must be reachable. Desktop renders an anchored panel; mobile
 * reuses the Drawer primitive full-screen.
 *
 * The two are chosen with a JS media query, not a CSS "hidden md:block"
 * wrapper: Drawer's Dialog.Content portals straight to document.body, so a
 * CSS class on a wrapper around <Drawer> has no effect on whether the
 * portaled content renders — it would show at every viewport once opened.
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
          className="hidden md:block absolute left-0 top-full z-50 mt-px w-[min(90vw,880px)] max-h-[70vh] overflow-y-auto custom-scrollbar rounded-b-xl border border-surface-border bg-surface p-5 shadow-floating"
        >
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
            {CATEGORIES.map((category) => (
              <div key={category.slug}>
                <Link
                  href={`/search?category=${category.slug}`}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-2 font-extrabold text-xs text-brand-700 hover:text-brand-600 mb-1.5"
                >
                  <Icon name={category.icon} size={16} />
                  {category.nameEn}
                </Link>
                <ul className="space-y-1">
                  {category.subcategories.slice(0, 4).map((sub) => (
                    <li key={sub.slug}>
                      <Link
                        href={`/search?subcategory=${sub.slug}`}
                        onClick={() => onOpenChange(false)}
                        className="text-[11px] text-on-surface-muted hover:text-brand-600 transition-colors"
                      >
                        {sub.nameEn}
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link
                      href={`/search?category=${category.slug}`}
                      onClick={() => onOpenChange(false)}
                      className="text-[11px] font-bold text-brand-600 hover:underline"
                    >
                      {t("viewAll")} →
                    </Link>
                  </li>
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isDesktop && (
        <Drawer open={open} onOpenChange={onOpenChange} title={t("title")} side="left">
          <ul className="divide-y divide-surface-border">
            {CATEGORIES.map((category) => (
              <li key={category.slug} className="py-2.5">
                <Link
                  href={`/search?category=${category.slug}`}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-2 font-bold text-sm text-on-surface"
                >
                  <Icon name={category.icon} size={18} className="text-brand-600" />
                  {category.nameEn}
                </Link>
              </li>
            ))}
          </ul>
        </Drawer>
      )}
    </>
  );
}
