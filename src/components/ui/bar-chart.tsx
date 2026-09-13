import { cn } from "@/lib/cn";

/**
 * A minimal daily bar chart — one series, magnitude via bar height.
 *
 * Deliberately not a charting library: one series, no zoom, no legend needed
 * (the heading beside it names what's plotted — see dataviz skill's "a single
 * series needs no legend box"). Each bar carries a native `title` tooltip
 * with the exact value, which is the hover layer a bar chart needs without
 * building a custom tooltip component for one admin screen.
 *
 * Deliberately never dual-axis: a second measure (e.g. contact clicks
 * alongside views) gets its own <BarChart>, not a second scale overlaid on
 * this one.
 */
export function BarChart({
  data,
  color = "bg-brand-600",
  height = 96,
  formatValue = (v: number) => String(v),
  className,
}: {
  data: { label: string; value: number }[];
  /** A Tailwind background-color class for the bars. */
  color?: string;
  height?: number;
  formatValue?: (value: number) => string;
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className={cn("flex items-end gap-[3px] border-b border-surface-border", className)} style={{ height }}>
      {data.map((d, i) => {
        // A real zero still gets a hairline sliver so the bar is legible as
        // "present, zero" rather than reading as a missing data point.
        const pct = d.value === 0 ? 0.02 : d.value / max;
        return (
          <div
            key={i}
            role="img"
            aria-label={`${d.label}: ${formatValue(d.value)}`}
            title={`${d.label}: ${formatValue(d.value)}`}
            className={cn("flex-1 rounded-t-sm min-w-[2px]", color)}
            style={{ height: `${Math.max(pct * 100, 2)}%` }}
          />
        );
      })}
    </div>
  );
}
