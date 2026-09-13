import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { ListingCard } from "./listing-card";
import { getSellerOtherListings } from "@/server/services/listings";

/**
 * The "more from this seller" strip on the listing detail page.
 *
 * Split out as its own async component (rather than an prop awaited in
 * `page.tsx`) so it can sit behind its own `<Suspense>` boundary — the main
 * listing (title, price, gallery, phone reveal) has everything it needs from
 * one `getListingBySlug` call and shouldn't wait on this second, unrelated
 * round trip before painting.
 */
export async function SellerOtherListings({
  sellerId,
  excludeListingId,
  sellerSlug,
  sellerName,
}: {
  sellerId: string;
  excludeListingId: string;
  sellerSlug: string;
  sellerName: string;
}) {
  const t = await getTranslations("marketplace");
  const otherListings = await getSellerOtherListings(sellerId, excludeListingId);

  if (otherListings.length === 0) return null;

  return (
    <div className="lg:col-span-2 space-y-4 pt-4 border-t border-surface-border">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold text-on-surface tracking-tight">
          {t("moreFromSeller", { seller: sellerName })}
        </h2>
        <Link href={`/seller/${sellerSlug}`} className="text-xs font-bold text-brand-700 hover:underline">
          {t("visitStorefront")}
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {otherListings.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
    </div>
  );
}
