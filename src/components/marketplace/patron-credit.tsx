import Image from "next/image";
import { useTranslations } from "next-intl";

/**
 * Quiet, plaque-style acknowledgement — deliberately restrained rather than
 * a promotional banner. Sits last on the homepage so it doesn't compete
 * with the commerce sections above it. Portrait fills the left column at
 * full bleed; the grid's natural height (set by the text side) is what the
 * image stretches to fill, so no hand-tuned pixel height is needed.
 */
export function PatronCredit() {
  const t = useTranslations("home.patron");

  return (
    <section
      aria-label={t("role")}
      className="grid grid-cols-1 md:grid-cols-2 rounded-2xl border border-surface-border overflow-hidden bg-surface shadow-xs"
    >
      <div className="relative w-full h-64 sm:h-80 md:h-full min-h-[280px]">
        <Image
          src="/images/DC/dc-malakand-portrait.jpg"
          alt={t("role")}
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
      </div>

      <div className="flex flex-col justify-center gap-3 p-6 sm:p-10 bg-gradient-to-br from-surface to-[#faf7f0] text-center md:text-left">
        <span className="text-[11px] uppercase font-bold tracking-wider text-tertiary-hover">
          {t("eyebrow")}
        </span>

        <div className="w-10 h-px bg-tertiary/50 mx-auto md:mx-0" />

        <p className="text-sm sm:text-base text-on-surface-muted leading-relaxed max-w-md mx-auto md:mx-0">
          {t("body")}
        </p>

        <div className="mt-1">
          <p className="text-xl sm:text-2xl font-extrabold text-brand-700 tracking-tight">
            {t("name")}
          </p>
          <p className="text-xs sm:text-sm text-on-surface-muted mt-0.5">{t("role")}</p>
        </div>
      </div>
    </section>
  );
}
