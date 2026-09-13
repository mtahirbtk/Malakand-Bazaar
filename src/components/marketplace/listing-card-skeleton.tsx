import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder for `ListingCard` — same aspect-square image block and two text
 * lines, so a grid of these doesn't reflow (CLS) once real cards swap in.
 */
export function ListingCardSkeleton() {
  return (
    <div className="bg-surface rounded-xl sm:rounded-2xl border border-surface-border overflow-hidden">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="p-2.5 space-y-2 sm:p-3">
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-3.5 w-1/2" />
      </div>
    </div>
  );
}

export function ListingCardSkeletonGrid({
  count,
  className,
}: {
  count: number;
  className: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }, (_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
}
