import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getPublicSellerBySlug } from "@/server/services/sellers";
import { searchListings } from "@/server/services/listings";
import { SellerStorefront } from "@/components/marketplace/seller-storefront";

export default async function SellerStorefrontPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const seller = await getPublicSellerBySlug(slug);
  if (!seller) notFound();

  // Stands in for §2.4's GET /api/sellers/:slug/listings (Phase 7) — see
  // getPublicSellerBySlug's doc comment for why this page reads the DB
  // directly rather than waiting for that endpoint.
  const { items: listings } = await searchListings({
    sellerId: seller.id,
    q: undefined,
    tehsil: undefined,
    verifiedOnly: false,
    availability: "active",
    sort: "date_new",
    limit: 24,
  });

  return (
    <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <SellerStorefront seller={seller} listings={listings} />
    </main>
  );
}
