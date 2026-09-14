import { Suspense } from "react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getListingBySlug } from "@/server/services/listings";
import { ListingDetail } from "@/components/marketplace/listing-detail";
import { SellerOtherListings } from "@/components/marketplace/seller-other-listings";
import { ListingViewPing } from "@/components/marketplace/listing-view-ping";
import { Skeleton } from "@/components/ui/skeleton";
import { env } from "@/server/env";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const detail = await getListingBySlug(slug);
  if (!detail) notFound();

  const { listing, seller } = detail;

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
      url: `${env.SITE_URL}/${locale}/listing/${listing.slug}`,
    },
  };

  return (
    <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ListingViewPing listingId={listing.id} />
      <ListingDetail
        listing={listing}
        seller={seller}
        otherListingsSlot={
          seller && (
            <Suspense fallback={<OtherListingsSkeleton />}>
              <SellerOtherListings
                sellerId={listing.sellerId}
                excludeListingId={listing.id}
                sellerSlug={seller.slug}
                sellerName={seller.name}
              />
            </Suspense>
          )
        }
      />
    </main>
  );
}

function OtherListingsSkeleton() {
  return (
    <div className="lg:col-span-2 space-y-4 pt-4 border-t border-surface-border">
      <Skeleton className="h-5 w-48" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="aspect-square w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
