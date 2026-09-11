"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { MegaMenu } from "./mega-menu";
import { Link } from "@/i18n/routing";

const QUICK_LINKS: {
  icon: string;
  iconClassName: string;
  labelKey: "dailyFreshAgro" | "livestockCattle" | "vehiclesBikes" | "propertyPlots" | "solarElectronics" | "topLocalSellers";
  href: string;
}[] = [
  { icon: "agriculture", iconClassName: "text-accent-green", labelKey: "dailyFreshAgro", href: "/search?category=fresh-produce-food" },
  { icon: "cruelty_free", iconClassName: "text-secondary", labelKey: "livestockCattle", href: "/search?category=livestock-animals" },
  { icon: "two_wheeler", iconClassName: "text-secondary", labelKey: "vehiclesBikes", href: "/search?category=vehicles" },
  { icon: "home_pin", iconClassName: "text-secondary", labelKey: "propertyPlots", href: "/search?category=property-for-sale" },
  { icon: "solar_power", iconClassName: "text-secondary", labelKey: "solarElectronics", href: "/search?category=solar-energy" },
  { icon: "verified_user", iconClassName: "text-secondary", labelKey: "topLocalSellers", href: "/sellers" },
];

/** Ported from code.html:162-208. */
export function CategoryRibbon() {
  const t = useTranslations("nav");
  const [open, setOpen] = React.useState(false);

  return (
    <nav className="bg-surface-low border-t border-surface-border text-on-surface overflow-x-auto no-scrollbar">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between text-xs font-bold whitespace-nowrap">
        <div className="flex items-center divide-x divide-surface-border">
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

          <div className="flex items-center gap-1 sm:gap-2 px-2">
            {QUICK_LINKS.map((link) => (
              <Link
                key={link.labelKey}
                href={link.href}
                className="px-2.5 py-2.5 hover:text-brand-600 transition-colors flex items-center gap-1"
              >
                <Icon name={link.icon} size={16} className={link.iconClassName} />
                <span>{t(link.labelKey)}</span>
              </Link>
            ))}
          </div>
        </div>

        <Link
          href="/search?sort=featured"
          className="hidden lg:flex items-center gap-1 text-accent-green-dark hover:text-accent-green font-extrabold uppercase tracking-wider py-2.5 pl-3"
        >
          <Icon name="local_fire_department" size={17} className="animate-bounce" />
          <span>{t("hotDeals")}</span>
        </Link>
      </div>
    </nav>
  );
}
