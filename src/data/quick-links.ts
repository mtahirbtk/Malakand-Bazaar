/** Shared between the desktop CategoryRibbon and the mobile hamburger drawer. */
export const QUICK_LINKS: {
  labelKey:
    | "dailyFreshAgro"
    | "livestockCattle"
    | "vehiclesBikes"
    | "propertyPlots"
    | "solarElectronics";
  href: string;
}[] = [
  { labelKey: "dailyFreshAgro", href: "/search?category=fresh-produce-food" },
  { labelKey: "livestockCattle", href: "/search?category=livestock-animals" },
  { labelKey: "vehiclesBikes", href: "/search?category=vehicles" },
  { labelKey: "propertyPlots", href: "/search?category=property-for-sale" },
  { labelKey: "solarElectronics", href: "/search?category=solar-energy" },
];
