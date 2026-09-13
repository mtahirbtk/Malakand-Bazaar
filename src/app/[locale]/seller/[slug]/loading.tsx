import { Skeleton } from "@/components/ui/skeleton";
import { ListingCardSkeletonGrid } from "@/components/marketplace/listing-card-skeleton";

/** Streams while `getPublicSellerBySlug()` + `searchListings()` resolve. */
export default function SellerStorefrontLoading() {
  return (
    <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3.5 w-32" />
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <ListingCardSkeletonGrid
          count={10}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
        />
      </div>
    </main>
  );
}
