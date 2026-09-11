import { defineRouting } from "next-intl/routing";
import { createSharedPathnamesNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["en", "ur"] as const,
  defaultLocale: "en",
});

export type Locale = (typeof routing.locales)[number];

export const { Link, redirect, usePathname, useRouter } =
  createSharedPathnamesNavigation(routing);

export function dirForLocale(locale: string): "ltr" | "rtl" {
  return locale === "ur" ? "rtl" : "ltr";
}
