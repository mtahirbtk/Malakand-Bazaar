import { Skeleton } from "@/components/ui/skeleton";

/** Streams while `getListingBySlug()` resolves. */
export default function ListingDetailLoading() {
  return (
    <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Skeleton className="aspect-square w-full rounded-2xl" />

        <div className="space-y-4">
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="h-8 w-4/5" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </div>
    </main>
  );
}
