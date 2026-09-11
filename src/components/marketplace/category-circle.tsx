import * as React from "react";
import { Icon } from "@/components/ui/icon";
import { Link } from "@/i18n/routing";

/** Ported from code.html:360-366. */
export function CategoryCircle({
  icon,
  label,
  href,
}: {
  icon: string;
  label: string;
  href: string;
}) {
  return (
    <Link className="group flex flex-col items-center gap-2" href={href}>
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#f2f8f4] border-2 border-surface-border group-hover:border-accent-green group-hover:bg-[#e3f4e8] transition-all flex items-center justify-center shadow-xs">
        {/* Google's Material Symbols stylesheet sets display:inline-block
            unconditionally and happens to cascade after our compiled CSS, so
            at equal specificity it beats a plain `hidden`/`sm:hidden` — the
            `!` important-modifier is required to actually toggle visibility. */}
        <Icon
          name={icon}
          size={30}
          className="text-primary sm:!hidden group-hover:scale-110 transition-transform"
        />
        <Icon
          name={icon}
          size={36}
          className="text-primary !hidden sm:!block group-hover:scale-110 transition-transform"
        />
      </div>
      <span className="text-xs font-bold text-on-surface group-hover:text-accent-green-dark leading-tight text-center">
        {label}
      </span>
    </Link>
  );
}
