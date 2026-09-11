"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { Select } from "@/components/ui/select";
import { TEHSIL_OPTIONS } from "@/data/tehsils";
import { LocaleSwitcher } from "./locale-switcher";

/**
 * Ported from code.html:55-90. The source dropdown mixed three tehsils with
 * three localities (Totakan, Sakhakot, Khar) as if they were peers; per
 * docs/decisions.md the tehsil selector uses only the three official
 * tehsils (TEHSIL_OPTIONS) — localities are a separate, second-level filter.
 *
 * Fill is accent-green-dark, not accent-green: white text on #50a23e is
 * 3.19:1 and fails WCAG AA. See docs/palette.md.
 */
export function AnnouncementBar() {
  const t = useTranslations("announcement");
  const [tehsil, setTehsil] = React.useState("all");

  return (
    <aside className="bg-accent-green-dark text-white text-sm font-medium py-2.5 px-4 sm:px-8 border-b border-accent-green-darker/40">
      <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 pr-3 border-r border-white/30">
            <a className="hover:opacity-80 transition-opacity" href="#" title={t("facebook")}>
              <Icon name="public" size={15} />
            </a>
            <a className="hover:opacity-80 transition-opacity" href="#" title={t("whatsappCommunity")}>
              <Icon name="forum" size={15} />
            </a>
            <a className="hover:opacity-80 transition-opacity" href="#" title={t("phoneSupport")}>
              <Icon name="call" size={15} />
            </a>
          </div>
          <span className="inline-flex items-center gap-1.5 tracking-tight font-semibold">
            <span className="w-2 h-2 rounded-full bg-white animate-none sm:animate-ping" />
            {t("message")}
          </span>
        </div>

        {/* Tehsil + language move into the mobile hamburger drawer (SiteHeader)
            below sm — duplicated below, not shared, since neither component
            has a global filter store yet. */}
        <div className="hidden sm:flex items-center gap-3 text-[11px]">
          <span className="hidden md:inline-block text-white/90">{t("officialHub")}</span>
          <div className="flex items-center gap-1 bg-white/15 px-2.5 py-0.5 rounded-full backdrop-blur-sm border border-white/20">
            <Icon name="location_on" size={14} />
            <span className="font-bold">{t("tehsilLabel")}</span>
            <Select
              variant="bare"
              selectSize="sm"
              ariaLabel={t("tehsilAria")}
              value={tehsil}
              onValueChange={setTehsil}
              options={TEHSIL_OPTIONS}
              className="text-white h-auto py-0 pl-1 pr-0"
              chevronClassName="text-white/80"
            />
          </div>
          <div className="flex items-center bg-white/15 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/20">
            <LocaleSwitcher
              variant="bare"
              className="text-white h-auto py-0 pl-1 pr-0"
              chevronClassName="text-white/80"
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
