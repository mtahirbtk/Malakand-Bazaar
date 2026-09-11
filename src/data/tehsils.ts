import type { Tehsil } from "@/types";
import type { SelectOption } from "@/components/ui/select";

/**
 * Malakand District has three tehsil local governments per the KP Local
 * Government Department: Batkhela, Dargai and Thana Baizai.
 * Source: https://lgkp.gov.pk/page/city-tehsil-local-governments
 *
 * Batkhela and Dargai are the seats of the Swat Ranizai and Sam Ranizai
 * revenue tehsils respectively; Thana Baizai was carved out of Swat Ranizai.
 */
export const TEHSILS: Tehsil[] = [
  {
    slug: "batkhela",
    nameEn: "Batkhela",
    nameUr: "بٹ خیلہ",
    revenueTehsil: "Swat Ranizai",
    localities: [
      { slug: "batkhela-main-road", nameEn: "Batkhela Main Commercial Road", nameUr: "بٹ خیلہ مین روڈ" },
      { slug: "batkhela-city", nameEn: "Batkhela City & Bazaar", nameUr: "بٹ خیلہ شہر و بازار" },
      { slug: "batkhela-mobile-market", nameEn: "Batkhela Mobile Market", nameUr: "بٹ خیلہ موبائل مارکیٹ" },
      { slug: "amandara", nameEn: "Amandara", nameUr: "امان درہ" },
      { slug: "totakan", nameEn: "Totakan", nameUr: "توتکان" },
      { slug: "alladand", nameEn: "Alladand Dheri", nameUr: "اللہ ڈنڈ ڈھیری" },
    ],
  },
  {
    slug: "dargai",
    nameEn: "Dargai",
    nameUr: "درگئی",
    revenueTehsil: "Sam Ranizai",
    localities: [
      { slug: "dargai-industrial-belt", nameEn: "Dargai Industrial Belt", nameUr: "درگئی صنعتی علاقہ" },
      { slug: "dargai-border-exchange", nameEn: "Dargai Border Exchange", nameUr: "درگئی بارڈر ایکسچینج" },
      { slug: "dargai-city", nameEn: "Dargai City Market", nameUr: "درگئی سٹی مارکیٹ" },
      { slug: "sakhakot", nameEn: "Sakhakot Cloth Market", nameUr: "سخاکوٹ کپڑا مارکیٹ" },
      { slug: "heroshah", nameEn: "Heroshah", nameUr: "ہیروشاہ" },
      { slug: "malakand-pass", nameEn: "Malakand Pass", nameUr: "ملاکنڈ پاس" },
    ],
  },
  {
    slug: "thana-baizai",
    nameEn: "Thana Baizai",
    nameUr: "تھانہ بائزئی",
    revenueTehsil: "Thana Baizai",
    localities: [
      { slug: "thana-main-chowk", nameEn: "Thana Main Chowk", nameUr: "تھانہ مین چوک" },
      { slug: "thana-proper", nameEn: "Thana Proper", nameUr: "تھانہ" },
      { slug: "thana-swat-river", nameEn: "Thana Swat River Belt", nameUr: "تھانہ دریائے سوات" },
      { slug: "palai", nameEn: "Palai", nameUr: "پالئی" },
      { slug: "agra", nameEn: "Agra", nameUr: "آگرہ" },
      { slug: "dherai", nameEn: "Dherai", nameUr: "ڈھیرئی" },
    ],
  },
];

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
