"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { HeroCarousel } from "@/components/marketplace/hero-carousel";
import { PromoCard } from "@/components/marketplace/promo-card";
import { CategoryCircle } from "@/components/marketplace/category-circle";
import { SectionHeader } from "@/components/marketplace/section-header";
import { ListingCard } from "@/components/marketplace/listing-card";
import { SellerCard } from "@/components/marketplace/seller-card";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/routing";
import { LISTINGS } from "@/data/fixtures/listings";
import { SELLERS } from "@/data/fixtures/sellers";
import type { Listing } from "@/types";

function byId(ids: string[]): Listing[] {
  return ids.map((id) => LISTINGS.find((l) => l.id === id)).filter((l): l is Listing => Boolean(l));
}

const SHELF_A_IDS = ["l1", "l2", "l3", "l4", "l5"];
const SHELF_B_IDS = ["l6", "l7", "l8", "l9", "l10"];
const SHELF_C_IDS = ["l11", "l12", "l13", "l14", "l15"];

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

export default function HomeContent() {
  const t = useTranslations("home");
  const marketplace = useTranslations("marketplace");
  const common = useTranslations("common");

  const heroSlides = [
    {
      eyebrow: t("hero.slide1Eyebrow"),
      eyebrowIcon: "local_florist",
      eyebrowTone: "green" as const,
      title: t("hero.slide1Title"),
      titleAccent: t("hero.slide1Accent"),
      body: t("hero.slide1Body"),
      image: "/images/seed/hero-1.jpg",
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
      image: "/images/seed/hero-2.jpg",
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
      image: "/images/seed/hero-3.jpg",
      imageAlt: "High Alpine Swat & Malakand Valley",
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

  return (
    <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-8">
      {/* 1. Hero grid */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-8">
          <HeroCarousel ariaLabel="Highlights" slides={heroSlides} />
        </div>
        <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
          <PromoCard
            tone="green"
            eyebrow={t("promo1.eyebrow")}
            title={t("promo1.title")}
            body={t("promo1.body")}
            highlight={t("promo1.highlight")}
            linkLabel={t("promo1.link")}
            href="/search?category=fresh-produce-food"
            icon="nutrition"
          />
          <PromoCard
            tone="sand"
            eyebrow={t("promo2.eyebrow")}
            title={t("promo2.title")}
            body={t("promo2.body")}
            highlight={t("promo2.highlight")}
            linkLabel={t("promo2.link")}
            href="/search?category=solar-energy"
            icon="solar_power"
          />
        </div>
      </section>

      {/* 2. Popular Marketplace Sectors */}
      <section
        aria-label={t("sectors.heading")}
        className="bg-surface rounded-2xl p-5 sm:p-6 border border-surface-border shadow-xs"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-primary tracking-tight">
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

      {/* 3. Shelf A: Electronics & Solar Tech */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow={t("shelfA.eyebrow")}
          title={t("shelfA.title")}
          icon="solar_power"
          actionLabel={t("shelfA.action")}
          actionHref="/search?category=solar-energy"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {byId(SHELF_A_IDS).map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      {/* 4. Shelf B: Fresh Valley Fruits & Agro Produce */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow={t("shelfB.eyebrow")}
          eyebrowIcon="spa"
          title={t("shelfB.title")}
          icon="nutrition"
          actionLabel={t("shelfB.action")}
          actionHref="/search?category=fresh-produce-food"
          tileClassName="bg-[#fef5ec]"
          iconClassName="text-[#875520]"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {byId(SHELF_B_IDS).map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      {/* 5. Shelf C: Vehicles & Motorbikes */}
      <section className="space-y-4">
        <SectionHeader
          eyebrow={t("shelfC.eyebrow")}
          eyebrowIcon="directions_car"
          title={t("shelfC.title")}
          icon="two_wheeler"
          actionLabel={t("shelfC.action")}
          actionHref="/search?category=vehicles"
          iconClassName="text-secondary"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {byId(SHELF_C_IDS).map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      </section>

      {/* 6. Top Verified Local Sellers */}
      <section
        aria-label={t("sellers.title")}
        className="bg-surface rounded-2xl p-5 sm:p-7 border border-surface-border shadow-xs space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-accent-green-dark font-extrabold text-xs uppercase tracking-wider">
              <Icon name="workspace_premium" size={16} />
              <span>{t("sellers.eyebrow")}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">
              {t("sellers.title")}
            </h2>
            <p className="text-xs text-on-surface-muted">{t("sellers.subtitle")}</p>
          </div>
          <Link
            className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-dark text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-colors shadow-2xs self-start sm:self-auto"
            href="/sell"
          >
            <Icon name="how_to_reg" size={16} />
            <span>{marketplace("registerVerifiedSeller")}</span>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {SELLERS.map((seller) => (
            <SellerCard key={seller.id} seller={seller} />
          ))}
        </div>
      </section>

      {/* 7. Mid-page seller banner */}
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

      {/* 8. Three-way category promo strips */}
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
    </main>
  );
}
