import { setRequestLocale } from "next-intl/server";
import { ClientSearch } from "@/components/marketplace/client-search";
import { searchListingsQuerySchema } from "@/server/schemas/listings";
import { searchListings } from "@/server/services/listings";

/**
 * Server-rendered: the whole filter/sort/page state lives in the URL query
 * string, parsed here and answered by one `fn_search_listings` round trip.
 * That's what makes a filtered search shareable, bookmarkable and correct on
 * reload — see `client-search.tsx` for the interaction layer that turns UI
 * actions into URL navigations.
 */
export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const raw = await searchParams;
  // A hand-edited or stale URL shouldn't 500 the page — fall back to the
  // unfiltered default search instead of surfacing a validation error here.
  const parsed = searchListingsQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : searchListingsQuerySchema.parse({});

  const result = await searchListings(query);

  return (
    <main className="w-full flex-1 max-w-[1360px] mx-auto px-4 py-6 sm:px-6 lg:px-8">
      <ClientSearch query={query} result={result} />
    </main>
  );
}
