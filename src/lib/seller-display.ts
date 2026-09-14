/**
 * "Khan Solar Traders" -> "KS" — a display transform of the real store name,
 * not invented data. Shared by every place that turns a seller row into the
 * public `Seller` shape (src/server/services/home.ts, sellers.ts).
 */
export function initialsFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "");
  return letters.join("") || "?";
}
