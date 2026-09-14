import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireFreshUser } from "@/server/auth/guard";
import { listFavorites } from "@/server/services/favorites";
import { ListingCard } from "@/components/marketplace/listing-card";

export default async function FavoritesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");

  const user = await requireFreshUser();
  const { items } = await listFavorites(user.id, { limit: 60 });

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-surface-border bg-surface-low p-8 text-center">
        <p className="font-bold text-on-surface">{t("favoritesEmptyTitle")}</p>
        <p className="text-sm text-on-surface-muted mt-1">{t("favoritesEmptyBody")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {items.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
