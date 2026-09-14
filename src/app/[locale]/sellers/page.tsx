import { setRequestLocale } from "next-intl/server";
import { sellersDirectoryQuerySchema } from "@/server/schemas/sellers-directory";
import { listSellers } from "@/server/services/sellers";
import { SellersDirectory } from "@/components/marketplace/sellers-directory";

/** `/sellers` directory — §2.4 #26. Server fetches, client renders + filters via the URL. */
export default async function SellersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const raw = await searchParams;
  const parsed = sellersDirectoryQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : sellersDirectoryQuerySchema.parse({});

  const result = await listSellers(query);

  return (
    <main className="w-full flex-1 max-w-[1360px] mx-auto px-4 py-6 sm:px-6 lg:px-8">
      <SellersDirectory query={query} result={result} />
    </main>
  );
}
