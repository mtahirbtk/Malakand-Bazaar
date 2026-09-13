import { Rating } from "@/components/ui/rating";
import type { Seller } from "@/types";

export function SellerRatingSummary({ seller }: { seller: Seller }) {
  return <Rating value={seller.rating} count={seller.reviewCount} />;
}
