"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { MegaMenu } from "./mega-menu";
import { Link } from "@/i18n/routing";
import { QUICK_LINKS } from "@/data/quick-links";

/** Ported from code.html:162-208. */
export function CategoryRibbon() {
  const t = useTranslations("nav");
  const [open, setOpen] = React.useState(false);

  return (
    // No overflow-x-auto on <nav> itself: per spec, giving one axis auto/scroll
    // forces the other axis's default `visible` to compute as `auto` too, which
    // clipped MegaMenu's absolutely-positioned panel (open dropdown rendered
    // under the rest of the page). Scrolling is scoped to the quick-links row
    // below instead, which has nothing that needs to overflow its bounds.
    <nav className="bg-surface-low border-t border-surface-border text-on-surface">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center text-xs font-bold whitespace-nowrap">
        <div className="flex items-center divide-x divide-surface-border min-w-0">
          <div className="relative shrink-0">
            <button
              type="button"
              aria-expanded={open}
              aria-haspopup="true"
              onClick={() => setOpen((o) => !o)}
              className="bg-primary text-white hover:bg-primary-dark flex items-center gap-2 py-2.5 px-4 font-bold uppercase tracking-wider text-[11px]"
            >
              <Icon name="menu" size={18} />
              <span>{t("allCategories")}</span>
              <Icon name="expand_more" size={16} />
            </button>
            <MegaMenu open={open} onOpenChange={setOpen} />
          </div>

          <div className="flex items-center gap-1 sm:gap-2 px-2 overflow-x-auto no-scrollbar">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.labelKey}
                href={link.href}
                className="px-2.5 py-2.5 hover:text-brand-600 transition-colors"
              >
                {t(link.labelKey)}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
