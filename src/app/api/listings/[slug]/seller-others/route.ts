import { handler, ok } from "@/server/http/respond";
import { ApiError } from "@/server/http/errors";
import { getListingBySlug, getSellerOtherListings } from "@/server/services/listings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Other live listings from the same seller — detail-page rail (§2.3 #20). */
export const GET = handler(async (_request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const detail = await getListingBySlug(slug);
  if (!detail) throw ApiError.notFound("That listing");
  return ok(await getSellerOtherListings(detail.listing.sellerId, detail.listing.id));
});
