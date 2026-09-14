"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { HeroCarousel } from "@/components/marketplace/hero-carousel";
import { PromoCard } from "@/components/marketplace/promo-card";
import { CategoryCircle } from "@/components/marketplace/category-circle";
import { ListingCard } from "@/components/marketplace/listing-card";
import { PatronCredit } from "@/components/marketplace/patron-credit";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/routing";
import type { HomePayload } from "@/server/services/home";

const PROMO_STRIPS = [
  {
    key: "strip1" as const,
    frame: "bg-gradient-to-br from-[#f8f4ed] to-[#eee2d0] border-tertiary/30",
    label: "text-tertiary-hover",
    iconWrap: "text-primary",
    icon: "chair",
    href: "/search?category=handicrafts-artisan-goods",
  },
  {
    key: "strip2" as const,
    frame: "bg-gradient-to-br from-[#edf6f0] to-[#daece0] border-accent-green/30",
    label: "text-accent-green-dark",
    iconWrap: "text-accent-green-dark",
    icon: "apparel",
    href: "/search?category=clothing-fashion",
  },
  {
    key: "strip3" as const,
    frame: "bg-gradient-to-br from-[#f2f4f8] to-[#e2e7f0] border-surface-border",
    label: "text-secondary",
    iconWrap: "text-secondary",
    icon: "devices",
    href: "/search?category=mobiles-tablets",
  },
];

/**
 * Below the sectors grid: one "Top Listings" shelf (§2.3 #25), ranked by
 * lifetime views server-side, no minimum-count gate — it renders as soon as
 * there's a single live listing. Zero listings falls back to one honest
 * launch message instead of an empty shelf — the hero, sectors grid and
 * promo tiles above and below it are brand content and stay either way.
 */
export default function HomeContent({ payload }: { payload: HomePayload }) {
  const t = useTranslations("home");
  const common = useTranslations("common");

  const heroSlides = [
    {
      eyebrow: t("hero.slide1Eyebrow"),
      eyebrowIcon: "local_florist",
      eyebrowTone: "green" as const,
      title: t("hero.slide1Title"),
      titleAccent: t("hero.slide1Accent"),
      body: t("hero.slide1Body"),
      image: "/images/hero/hero-1.jpg",
      imageAlt: "Malakand Pass & Valley Panorama",
      scrimTone: "primary" as const,
      primaryCta: { label: t("hero.primaryCta"), href: "/search" },
      secondaryCta: { label: t("hero.secondaryCta"), href: "/sell" },
    },
    {
      eyebrow: t("hero.slide2Eyebrow"),
      eyebrowIcon: "storefront",
      eyebrowTone: "sand" as const,
      title: t("hero.slide2Title"),
      titleAccent: t("hero.slide2Accent"),
      body: t("hero.slide2Body"),
      image: "/images/hero/hero-2.jpg",
      imageAlt: "Batkhela Commercial Bazaar",
      scrimTone: "secondary" as const,
      primaryCta: { label: t("hero.primaryCta"), href: "/search" },
      secondaryCta: { label: t("hero.secondaryCta"), href: "/sell" },
    },
    {
      eyebrow: t("hero.slide3Eyebrow"),
      eyebrowIcon: "solar_power",
      eyebrowTone: "secondary" as const,
      title: t("hero.slide3Title"),
      titleAccent: t("hero.slide3Accent"),
      body: t("hero.slide3Body"),
      image: "/images/hero/hero-3.jpg",
      imageAlt: "High Alpine Swat & Malakand Valley",
      scrimTone: "accent-green-dark" as const,
      primaryCta: { label: t("hero.primaryCta"), href: "/search" },
      secondaryCta: { label: t("hero.secondaryCta"), href: "/sell" },
    },
    {
      eyebrow: t("hero.slide4Eyebrow"),
      eyebrowIcon: "forest",
      eyebrowTone: "green" as const,
      title: t("hero.slide4Title"),
      titleAccent: t("hero.slide4Accent"),
      body: t("hero.slide4Body"),
      image: "/images/hero/hero-4.jpg",
      imageAlt: "Malakand Greenery & Hillside Landscape",
      scrimTone: "primary" as const,
      primaryCta: { label: t("hero.primaryCta"), href: "/search" },
      secondaryCta: { label: t("hero.secondaryCta"), href: "/sell" },
    },
    {
      eyebrow: t("hero.slide5Eyebrow"),
      eyebrowIcon: "nutrition",
      eyebrowTone: "sand" as const,
      title: t("hero.slide5Title"),
      titleAccent: t("hero.slide5Accent"),
      body: t("hero.slide5Body"),
      image: "/images/hero/hero-5.jpg",
      imageAlt: "Malakand Palai Malta (Blood Orange) Harvest",
      scrimTone: "secondary" as const,
      primaryCta: { label: t("hero.primaryCta"), href: "/search" },
      secondaryCta: { label: t("hero.secondaryCta"), href: "/sell" },
    },
    {
      eyebrow: t("hero.slide6Eyebrow"),
      eyebrowIcon: "location_city",
      eyebrowTone: "secondary" as const,
      title: t("hero.slide6Title"),
      titleAccent: t("hero.slide6Accent"),
      body: t("hero.slide6Body"),
      image: "/images/hero/hero-6.jpg",
      imageAlt: "Batkhela City Lake View",
      scrimTone: "accent-green-dark" as const,
      primaryCta: { label: t("hero.primaryCta"), href: "/search" },
      secondaryCta: { label: t("hero.secondaryCta"), href: "/sell" },
    },
  ];

  const sectors = [
    { icon: "potted_plant", label: t("sectors.orchardsFruits"), href: "/search?category=fresh-produce-food" },
    { icon: "cruelty_free", label: t("sectors.sahiwalCattle"), href: "/search?category=livestock-animals" },
    { icon: "two_wheeler", label: t("sectors.hondaBikes"), href: "/search?category=vehicles" },
    { icon: "solar_power", label: t("sectors.solarSystems"), href: "/search?category=solar-energy" },
    { icon: "terrain", label: t("sectors.commercialPlots"), href: "/search?category=property-for-sale" },
    { icon: "carpenter", label: t("sectors.swatWoodcraft"), href: "/search?category=handicrafts-artisan-goods" },
    { icon: "hive", label: t("sectors.honeyHerbs"), href: "/search?subcategory=fresh-produce-food-honey" },
    { icon: "smartphone", label: t("sectors.mobilePhones"), href: "/search?category=mobiles-tablets" },
  ];

  const topListings = payload.topListings.slice(0, 12);
  const nothingToShow = topListings.length === 0;

  return (
    <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-8">
      {/* 1. Hero grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-12">
          <HeroCarousel ariaLabel="Highlights" slides={heroSlides} />
        </div>
       
      </section>

      {/* 2. Popular Marketplace Sectors — genuine navigation, valid with zero listings */}
      <section
        aria-label={t("sectors.heading")}
        className="bg-surface rounded-2xl p-5 sm:p-6 border border-surface-border shadow-xs"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-on-surface tracking-tight">
              {t("sectors.heading")}
            </h2>
            <p className="text-xs text-on-surface-muted">{t("sectors.subheading")}</p>
          </div>
          <Link
            className="text-xs font-bold text-accent-green-dark hover:underline flex items-center gap-0.5"
            href="/search"
          >
            <span>{common("viewAll")}</span>
            <Icon name="arrow_forward" size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-3 sm:gap-4 text-center">
          {sectors.map((sector) => (
            <CategoryCircle key={sector.label} icon={sector.icon} label={sector.label} href={sector.href} />
          ))}
        </div>
      </section>

      {nothingToShow ? (
        <EmptyState
          icon="storefront"
          title={t("launch.title")}
          body={t("launch.body")}
          action={
            <Button asChild size="sm">
              <Link href="/sell">
                <Icon name="how_to_reg" size={16} />
                <span>{t("launch.cta")}</span>
              </Link>
            </Button>
          }
        />
      ) : (
        // 3. Top Listings — one ranked shelf, no per-category threshold
        <section className="space-y-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-on-surface tracking-tight">
              {t("topListings.title")}
            </h2>
            <p className="text-xs text-on-surface-muted">{t("topListings.subtitle")}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {topListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
          <div className="flex justify-center pt-2">
            <Button asChild variant="subtle">
              <Link href="/search">
                <span>{common("viewAll")}</span>
                <Icon name="arrow_forward" size={16} />
              </Link>
            </Button>
          </div>
        </section>
      )}

      {/* 6. Mid-page seller banner — brand CTA, not listing-dependent */}
      <section className="bg-gradient-to-r from-primary via-primary-light to-secondary rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left max-w-2xl">
            <span className="bg-tertiary text-white font-extrabold text-[11px] uppercase tracking-wider px-3 py-1 rounded-full inline-block">
              {t("banner.badge")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{t("banner.title")}</h2>
            <p className="text-xs sm:text-sm text-surface-low/90">{t("banner.body")}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              className="bg-white text-primary hover:bg-surface-low font-bold text-xs sm:text-sm px-5 py-3 rounded-lg shadow-sm transition-transform active:scale-95 flex items-center gap-1.5"
              href="/sell"
            >
              <Icon name="verified" size={18} className="text-accent-green-dark" />
              <span>{t("banner.cta1")}</span>
            </Link>
            <Link
              className="bg-accent-green-dark hover:bg-accent-green-darker text-white font-bold text-xs sm:text-sm px-5 py-3 rounded-lg shadow-sm transition-transform active:scale-95 flex items-center gap-1.5"
              href="/sell"
            >
              <Icon name="how_to_reg" size={18} />
              <span>{t("banner.cta2")}</span>
            </Link>
          </div>
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-96 opacity-10 pointer-events-none flex items-center justify-end pr-6">
          <Icon name="landscape" size={240} />
        </div>
      </section>

      {/* 7. Three-way category promo strips */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PROMO_STRIPS.map((strip) => (
          <div
            key={strip.key}
            className={`rounded-2xl p-5 border flex items-center justify-between ${strip.frame}`}
          >
            <div>
              <span className={`text-[10px] uppercase font-bold tracking-wider ${strip.label}`}>
                {t(`${strip.key}.label`)}
              </span>
              <h3 className="text-base font-extrabold text-primary mt-1">{t(`${strip.key}.title`)}</h3>
              <p className="text-xs text-on-surface-muted mt-0.5">{t(`${strip.key}.body`)}</p>
              <Link
                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-accent-green-dark mt-3"
                href={strip.href}
              >
                <span>{t(`${strip.key}.link`)}</span>
                <Icon name="arrow_forward" size={14} />
              </Link>
            </div>
            <div
              className={`w-16 h-16 rounded-full bg-white/80 flex items-center justify-center shrink-0 shadow-xs ${strip.iconWrap}`}
            >
              <Icon name={strip.icon} size={32} />
            </div>
          </div>
        ))}
      </section>

      {/* 8. Patron credit — quiet, indirect acknowledgement */}
      <PatronCredit />
    </main>
  );
}
