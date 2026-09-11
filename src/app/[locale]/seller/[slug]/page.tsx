import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { getSellerBySlug } from "@/lib/sellers";
import { getListingsBySeller } from "@/lib/listings";
import { SellerStorefront } from "@/components/marketplace/seller-storefront";

export default async function SellerStorefrontPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const seller = getSellerBySlug(slug);
  if (!seller) notFound();

  const listings = getListingsBySeller(seller.id);

  return (
    <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <SellerStorefront seller={seller} listings={listings} />
    </main>
  );
}
