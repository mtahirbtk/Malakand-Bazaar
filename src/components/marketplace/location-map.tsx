import { useTranslations } from "next-intl";
import { Icon } from "@/components/ui/icon";

/**
 * No mapping library in the repo and no backend/API key infra to hold one —
 * Google's no-key "output=embed" iframe form covers a single pinned point,
 * which is all a store location needs here.
 */
export function LocationMap({
  coordinates,
  label,
}: {
  coordinates: { lat: number; lng: number };
  label: string;
}) {
  const t = useTranslations("marketplace");
  const { lat, lng } = coordinates;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-extrabold text-on-surface tracking-tight flex items-center gap-1.5">
        <Icon name="map" size={17} />
        {t("storeLocation")}
      </h2>
      <div className="overflow-hidden rounded-xl border border-surface-border">
        <iframe
          title={label}
          src={`https://www.google.com/maps?q=${lat},${lng}&z=15&output=embed`}
          className="h-56 w-full sm:h-72"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
      <a
        href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-bold text-brand-700 hover:underline"
      >
        {t("getDirections")}
        <Icon name="arrow_forward" size={14} />
      </a>
    </div>
  );
}
