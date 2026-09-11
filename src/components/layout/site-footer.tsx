"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "./brand-logo";
import { Link } from "@/i18n/routing";

/** Ported from code.html:1236-1330. */
export function SiteFooter() {
  const t = useTranslations("footer");
  const [subscribeValue, setSubscribeValue] = React.useState("");

  const marketLinks: { label: string; href: string }[] = [
    { label: t("electronicsSolar"), href: "/search?category=solar-energy" },
    { label: t("dailyFreshProduce"), href: "/search?category=fresh-produce-food" },
    { label: t("vehiclesBikes"), href: "/search?category=vehicles" },
    { label: t("verifiedSellersList"), href: "/sellers" },
    { label: t("sellerRegistration"), href: "/sell" },
  ];

  const policyLinks: { label: string; href: string }[] = [
    { label: t("safeTradingGuidelines"), href: "/help/safe-trading" },
    { label: t("verifiedSellerProgram"), href: "/help/verified-sellers" },
    { label: t("livestockHealthVerification"), href: "/help/livestock-health" },
    { label: t("vehicleNcpGuidance"), href: "/help/vehicle-ncp" },
    { label: t("privacyTerms"), href: "/legal/privacy" },
  ];

  return (
    <footer className="bg-surface-low border-t border-surface-border mt-12 text-on-surface">
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-3.5">
            <BrandLogo className="h-10 w-auto" />
            <p className="text-xs text-on-surface-muted leading-relaxed">{t("description")}</p>
            <div className="pt-2 text-xs space-y-1.5 text-on-surface">
              <div className="flex items-center gap-2 font-bold text-accent-green-dark">
                <Icon name="support_agent" size={18} />
                <span>
                  {t("whatsappHotline")}: <span dir="ltr">+92 316 644 1108</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-on-surface-muted">
                <Icon name="mail" size={18} />
                <span dir="ltr">{t("email")}</span>
              </div>
              <div className="flex items-center gap-2 text-on-surface-muted">
                <Icon name="location_on" size={18} />
                <span>{t("address")}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-700">
              {t("marketLinksHeading")}
            </h4>
            <ul className="space-y-2 text-xs text-on-surface-muted">
              {marketLinks.map((link) => (
                <li key={link.label}>
                  <Link className="hover:text-brand-600 transition-colors" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-700">
              {t("securityPoliciesHeading")}
            </h4>
            <ul className="space-y-2 text-xs text-on-surface-muted">
              {policyLinks.map((link) => (
                <li key={link.label}>
                  <Link className="hover:text-brand-600 transition-colors" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-brand-700">
              {t("newsletterHeading")}
            </h4>
            <p className="text-xs text-on-surface-muted">{t("newsletterBody")}</p>
            <form className="space-y-2" onSubmit={(e) => e.preventDefault()}>
              <div className="flex rounded-lg overflow-hidden border border-surface-border bg-surface">
                <Input
                  type="email"
                  aria-label={t("newsletterAria")}
                  placeholder={t("newsletterPlaceholder")}
                  value={subscribeValue}
                  onChange={(e) => setSubscribeValue(e.target.value)}
                  className="border-0 rounded-none focus:ring-0 h-auto py-2"
                />
                <Button type="submit" aria-label={t("newsletterSubmitAria")} className="rounded-none px-3">
                  <Icon name="send" size={18} />
                </Button>
              </div>
              <span className="text-[10px] text-on-surface-muted block">{t("newsletterNote")}</span>
            </form>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-surface-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-on-surface-muted">
          <p>{t("copyright")}</p>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link className="hover:text-brand-600 transition-colors" href="/legal/privacy">
              {t("privacyPolicy")}
            </Link>
            <Link className="hover:text-brand-600 transition-colors" href="/legal/terms">
              {t("termsOfTrade")}
            </Link>
            <Link className="hover:text-brand-600 transition-colors" href="/help">
              {t("helpCenter")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
