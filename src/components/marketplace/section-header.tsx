import * as React from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

/**
 * Ported from code.html:415-431 (Shelf A), 591-613 (Shelf B), 772-795
 * (Shelf C). The three shelves each use a different icon tile/glyph colour
 * combination (A: green tile + accent-green-dark icon, B: sand tile +
 * #875520 icon, C: green tile + secondary icon) rather than a clean
 * two-tone system, so both are plain className passthroughs.
 */
export function SectionHeader({
  eyebrow,
  eyebrowIcon = "verified",
  title,
  icon,
  actionLabel,
  actionHref,
  tileClassName = "bg-[#e3f4e8]",
  iconClassName = "text-accent-green-dark",
}: {
  eyebrow: string;
  eyebrowIcon?: string;
  title: string;
  icon: string;
  actionLabel: string;
  actionHref: string;
  tileClassName?: string;
  iconClassName?: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-3">
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-xl ${tileClassName} flex items-center justify-center font-bold shadow-2xs shrink-0`}
        >
          <Icon name={icon} size={24} className={iconClassName} />
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-accent-green-dark font-extrabold text-[11px] uppercase tracking-wider">
            <Icon name={eyebrowIcon} size={15} />
            <span>{eyebrow}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-primary tracking-tight">{title}</h2>
        </div>
      </div>
      <Button asChild variant="subtle" className="self-start sm:self-auto">
        <Link href={actionHref}>
          <span>{actionLabel}</span>
          <Icon name="arrow_forward" size={16} />
        </Link>
      </Button>
    </div>
  );
}
