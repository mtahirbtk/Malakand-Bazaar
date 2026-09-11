"use client";

import { useLocale, useTranslations } from "next-intl";
import { Select } from "@/components/ui/select";
import { usePathname, useRouter } from "@/i18n/routing";
import type { Locale } from "@/i18n/routing";

const LOCALES = ["en", "ur"] as const satisfies readonly Locale[];

function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function LocaleSwitcher({
  variant = "default",
  className,
  chevronClassName,
}: {
  variant?: "default" | "bare";
  className?: string;
  chevronClassName?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("locale");
  const pathname = usePathname();
  const router = useRouter();

  const options = LOCALES.map((code) => ({ value: code, label: t(code) }));

  return (
    <Select
      ariaLabel={t("aria")}
      selectSize="sm"
      variant={variant}
      className={className}
      chevronClassName={chevronClassName}
      value={locale}
      onValueChange={(next) => {
        if (isLocale(next)) router.replace(pathname, { locale: next });
      }}
      options={options}
    />
  );
}
