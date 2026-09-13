import { setRequestLocale } from "next-intl/server";
import { getListingBySlug, getSellerOtherListings } from "@/server/services/listings";
import { ListingDetail } from "@/components/marketplace/listing-detail";
import { ClientListingDetail } from "@/components/marketplace/client-listing-detail";
import { env } from "@/server/env";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const detail = await getListingBySlug(slug);

  if (detail) {
    const { listing, seller } = detail;
    const otherListings = await getSellerOtherListings(listing.sellerId, listing.id);

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: listing.title,
      description: listing.description,
      image: listing.images,
      offers: {
        "@type": "Offer",
        price: listing.price,
        priceCurrency: "PKR",
        availability:
          listing.status === "active"
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        url: `${env.NEXT_PUBLIC_SITE_URL}/${locale}/listing/${listing.slug}`,
      },
    };

    return (
      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <ListingDetail listing={listing} seller={seller} otherListings={otherListings} />
      </main>
    );
  }

  // Not a real, moderated listing yet — falls back to the seller dashboard's
  // client-side mock overlay (localStorage) until Phase 6 moves listing
  // creation into the database, at which point this branch and
  // ClientListingDetail go away and a miss becomes a real notFound().
  return (
    <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <ClientListingDetail slug={slug} />
    </main>
  );
}
