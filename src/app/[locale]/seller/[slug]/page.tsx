import { setRequestLocale } from "next-intl/server";
import { getSellerBySlug } from "@/lib/sellers";
import { getListingsBySeller } from "@/lib/listings";
import { SellerStorefront } from "@/components/marketplace/seller-storefront";
import { ClientSellerStorefront } from "@/components/marketplace/client-seller-storefront";

export default async function SellerStorefrontPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const seller = getSellerBySlug(slug);

  return (
    <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {seller ? (
        <SellerStorefront seller={seller} listings={getListingsBySeller(seller.id)} />
      ) : (
        <ClientSellerStorefront slug={slug} />
      )}
    </main>
  );
}
