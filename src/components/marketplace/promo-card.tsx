import * as React from "react";
import Image from "next/image";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/routing";
import { cn } from "@/lib/cn";

const TONE_STYLES = {
  green: {
    frame: "bg-gradient-to-br from-[#eaf4ed] to-[#d6ebd9] border-accent-green/30",
    eyebrow: "text-accent-green-dark",
    title: "text-primary",
    highlight: "text-accent-green-dark",
    link: "text-primary hover:text-accent-green-dark",
    watermark: "text-accent-green",
  },
  sand: {
    frame: "bg-gradient-to-br from-[#fef5ec] to-[#fce4c8] border-tertiary/40",
    eyebrow: "text-[#875520]",
    title: "text-[#422808]",
    highlight: "text-[#9c6328]",
    link: "text-[#422808] hover:text-[#9c6328]",
    watermark: "text-[#9c6328]",
  },
} as const;

/** Ported from code.html:307-344 (the two Greenvalley-style promo cards). */
export function PromoCard({
  eyebrow,
  title,
  body,
  highlight,
  linkLabel,
  href,
  image,
  icon,
  tone,
}: {
  eyebrow: string;
  title: string;
  body: string;
  highlight?: string;
  linkLabel: string;
  href: string;
  image?: string;
  icon?: string;
  tone: "sand" | "green";
}) {
  const styles = TONE_STYLES[tone];

  return (
    <div
      className={cn(
        "border rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden shadow-xs",
        styles.frame
      )}
    >
      {image && (
        <Image
          src={image}
          alt=""
          fill
          sizes="(max-width: 1024px) 50vw, 25vw"
          className="object-cover opacity-20"
        />
      )}
      <div className="relative z-10 space-y-1.5">
        <span
          className={cn(
            "text-[10px] font-extrabold uppercase tracking-widest bg-white px-2 py-0.5 rounded-md inline-block shadow-2xs",
            styles.eyebrow
          )}
        >
          {eyebrow}
        </span>
        <h3 className={cn("text-lg font-bold", styles.title)}>{title}</h3>
        <p className="text-xs text-on-surface-muted">{body}</p>
        {highlight && (
          <div className={cn("text-sm font-extrabold pt-1", styles.highlight)}>{highlight}</div>
        )}
      </div>
      <div className="relative z-10 pt-3">
        <Link
          href={href}
          className={cn("inline-flex items-center gap-1 text-xs font-bold transition-colors", styles.link)}
        >
          <span>{linkLabel}</span>
          <Icon name="arrow_forward" size={15} />
        </Link>
      </div>
      {icon && (
        <div className={cn("absolute -right-3 -bottom-3 opacity-15 pointer-events-none", styles.watermark)}>
          <Icon name={icon} size={130} />
        </div>
      )}
    </div>
  );
}
