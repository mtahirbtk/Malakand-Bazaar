import type { Tehsil } from "@/types";
import type { SelectOption } from "@/components/ui/select";
import tehsilsJson from "./tehsils.json";

/**
 * Malakand District has three tehsil local governments per the KP Local
 * Government Department: Batkhela, Dargai and Thana Baizai.
 * Source: https://lgkp.gov.pk/page/city-tehsil-local-governments
 *
 * Batkhela and Dargai are the seats of the Swat Ranizai and Sam Ranizai
 * revenue tehsils respectively; Thana Baizai was carved out of Swat Ranizai.
 */
export const TEHSILS: Tehsil[] = tehsilsJson as Tehsil[];

export const TEHSIL_OPTIONS: SelectOption[] = [
  { value: "all", label: "All Malakand District" },
  ...TEHSILS.map((t) => ({ value: t.slug, label: t.nameEn })),
];

export const ALL_LOCALITIES = TEHSILS.flatMap((t) =>
  t.localities.map((l) => ({ ...l, tehsilSlug: t.slug }))
);

export function findTehsil(slug: string): Tehsil | undefined {
  return TEHSILS.find((t) => t.slug === slug);
}
