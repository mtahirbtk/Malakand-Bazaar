import { Skeleton } from "@/components/ui/skeleton";
import { ListingCardSkeletonGrid } from "@/components/marketplace/listing-card-skeleton";

/**
 * Home page fallback. Next streams this immediately while `getHomePayload()`
 * (hero content + category shelves) resolves on the server — see the
 * performance note on `[locale]/layout.tsx` for why this route had none
 * before and shipped a blank tab instead.
 */
export default function HomeLoading() {
  return (
    <div className="w-full max-w-[1360px] mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      <Skeleton className="h-56 w-full rounded-2xl sm:h-72" />

      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex shrink-0 flex-col items-center gap-2">
            <Skeleton className="h-16 w-16 rounded-full" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <ListingCardSkeletonGrid
          count={5}
          className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 sm:gap-4"
        />
      </div>
    </div>
  );
}
