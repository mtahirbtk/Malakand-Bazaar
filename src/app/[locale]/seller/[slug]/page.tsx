import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getSellerDetail } from "@/server/services/sellers";
import { listPublicSellerListings } from "@/server/services/listings";
import { SellerStorefront } from "@/components/marketplace/seller-storefront";

export default async function SellerStorefrontPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const seller = await getSellerDetail(slug);
  if (!seller) notFound();

  const { items: listings } = await listPublicSellerListings(seller.id, {
    status: "active",
    sort: "newest",
    limit: 24,
  });

  return (
    <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <SellerStorefront seller={seller} listings={listings} />
    </main>
  );
}
