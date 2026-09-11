import * as React from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/routing";

/**
 * Ported from code.html:415-431 (Shelf A), 591-613 (Shelf B), 772-795
 * (Shelf C), simplified: the eyebrow line ("verified"-style micro-badge
 * text) and the coloured icon tile are gone — plain black title only, per
 * the "keep it simple, black headings" direction.
 */
export function SectionHeader({
  title,
  actionLabel,
  actionHref,
}: {
  title: string;
  actionLabel: string;
  actionHref: string;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-border pb-3">
      <h2 className="text-xl sm:text-2xl font-extrabold text-on-surface tracking-tight">{title}</h2>
      <Button asChild variant="subtle" className="self-start sm:self-auto">
        <Link href={actionHref}>
          <span>{actionLabel}</span>
          <Icon name="arrow_forward" size={16} />
        </Link>
      </Button>
    </div>
  );
}
