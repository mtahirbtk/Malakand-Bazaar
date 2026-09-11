import * as React from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

/** Ported from code.html:415-431. */
export function SectionHeader({
  eyebrow,
  eyebrowIcon = "verified",
  title,
  icon,
  actionLabel,
  actionHref,
}: {
  eyebrow: string;
  eyebrowIcon?: string;
  title: string;
  icon: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#e3f4e8] text-primary flex items-center justify-center font-bold shadow-2xs shrink-0">
          <Icon name={icon} size={24} className="text-accent-green-dark" />
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
