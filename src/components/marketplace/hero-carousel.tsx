import * as React from "react";
import Image from "next/image";
import { Carousel } from "@/components/ui/carousel";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/cn";

export type HeroSlide = {
  eyebrow: string;
  eyebrowIcon: string;
  eyebrowTone: "green" | "sand" | "secondary";
  title: string;
  titleAccent: string;
  body: string;
  image: string;
  imageAlt: string;
  scrimTone: "primary" | "secondary" | "accent-green-dark";
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string; icon?: string };
};

const EYEBROW_BG = {
  green: "bg-accent-green",
  sand: "bg-tertiary",
  secondary: "bg-secondary",
};

const SCRIM = {
  primary: "bg-primary/25",
  secondary: "bg-secondary/30",
  "accent-green-dark": "bg-accent-green-dark/30",
};

/**
 * Wraps the Task 11 Carousel with the hero's content, ported from
 * code.html:214-304 (the 4.5s auto-rotating slider + two stacked CTAs).
 */
export function HeroCarousel({
  slides,
  ariaLabel,
}: {
  slides: HeroSlide[];
  ariaLabel: string;
}) {
  return (
    <Carousel
      ariaLabel={ariaLabel}
      autoPlayMs={4500}
      showDots={false}
      className="rounded-2xl shadow-md bg-primary min-h-[360px] md:min-h-[420px]"
      slides={slides.map((slide, i) => (
        <div key={i} className="relative h-full min-h-[360px] md:min-h-[420px] flex flex-col justify-end p-6 sm:p-10">
          <Image
            src={slide.image}
            alt={slide.imageAlt}
            fill
            priority={i === 0}
            sizes="(max-width: 1024px) 100vw, 66vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-primary-dark via-primary/80 to-primary/20" />
          <div className={cn("absolute inset-0 mix-blend-multiply", SCRIM[slide.scrimTone])} />

          <div className="relative z-10 max-w-xl text-white space-y-3 pb-4">
            <div
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider text-white shadow-sm mb-2",
                EYEBROW_BG[slide.eyebrowTone]
              )}
            >
              <Icon name={slide.eyebrowIcon} size={14} />
              <span>{slide.eyebrow}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white">
              {slide.title} <span className="text-tertiary font-serif italic">{slide.titleAccent}</span>
            </h1>
            <p className="text-xs sm:text-sm text-gray-200 line-clamp-2 mt-1.5">{slide.body}</p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Button
                asChild
                variant="whatsapp"
                size="md"
                className="px-5 sm:text-sm active:scale-95"
              >
                <Link href={slide.primaryCta.href}>
                  <span>{slide.primaryCta.label}</span>
                  <Icon name="arrow_forward" size={16} />
                </Link>
              </Button>
              <Button
                asChild
                size="md"
                className="bg-white/95 hover:bg-white text-primary backdrop-blur-sm sm:text-sm active:scale-95"
              >
                <Link href={slide.secondaryCta.href}>
                  <Icon name={slide.secondaryCta.icon ?? "how_to_reg"} size={16} className="text-accent-green-dark" />
                  <span>{slide.secondaryCta.label}</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ))}
    />
  );
}
