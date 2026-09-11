import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { getListingBySlug, getListingsBySeller } from "@/lib/listings";
import { getSellerById } from "@/lib/sellers";
import { ListingDetail } from "@/components/marketplace/listing-detail";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const listing = getListingBySlug(slug);
  if (!listing) notFound();

  const seller = getSellerById(listing.sellerId);
  const otherListings = seller
    ? getListingsBySeller(seller.id, { excludeId: listing.id, limit: 5 })
    : [];

  return (
    <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <ListingDetail listing={listing} seller={seller} otherListings={otherListings} />
    </main>
  );
}
