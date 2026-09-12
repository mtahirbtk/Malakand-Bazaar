import { setRequestLocale } from "next-intl/server";
import { getListingBySlug, getListingsBySeller } from "@/lib/listings";
import { getSellerById } from "@/lib/sellers";
import { ListingDetail } from "@/components/marketplace/listing-detail";
import { ClientListingDetail } from "@/components/marketplace/client-listing-detail";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const listing = getListingBySlug(slug);

  return (
    <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {listing ? (
        <ListingDetail
          listing={listing}
          seller={getSellerById(listing.sellerId)}
          otherListings={getListingsBySeller(listing.sellerId, { excludeId: listing.id, limit: 5 })}
        />
      ) : (
        <ClientListingDetail slug={slug} />
      )}
    </main>
  );
}
