import { Skeleton } from "@/components/ui/skeleton";
import { ListingCardSkeletonGrid } from "@/components/marketplace/listing-card-skeleton";

/** Streams while `searchListings()` runs — see `[locale]/loading.tsx`'s note. */
export default function SearchLoading() {
  return (
    <main className="w-full flex-1 max-w-[1360px] mx-auto px-4 py-6 sm:px-6 lg:px-8 space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-9 w-full sm:w-72" />
      </div>

      <Skeleton className="h-14 w-full rounded-xl" />

      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-4">
        <div className="hidden md:col-span-1 md:block">
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
        <section className="md:col-span-3">
          <ListingCardSkeletonGrid count={9} className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4" />
        </section>
      </div>
    </main>
  );
}
