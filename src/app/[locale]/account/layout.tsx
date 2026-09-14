import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

/**
 * `/account` shell — a two-tab nav (Saved Listings, My Reviews) over the
 * account pages below it.
 *
 * `middleware.ts` already gates `/account/**` behind a `requireUser`-
 * equivalent (`{ prefix: "/account", role: "user" }`), so this layout does
 * not need its own auth check.
 */
export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");

  return (
    <main className="w-full flex-1 max-w-[960px] mx-auto px-4 py-6 sm:px-6 lg:px-8">
      <nav className="flex gap-4 border-b border-surface-border mb-6 text-sm font-bold">
        <Link href="/account/favorites" className="pb-2 border-b-2 border-transparent hover:border-brand-600 text-on-surface">
          {t("navFavorites")}
        </Link>
        <Link href="/account/reviews" className="pb-2 border-b-2 border-transparent hover:border-brand-600 text-on-surface">
          {t("navReviews")}
        </Link>
      </nav>
      {children}
    </main>
  );
}
