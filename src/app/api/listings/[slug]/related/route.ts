import { handler, ok } from "@/server/http/respond";
import { ApiError } from "@/server/http/errors";
import { getListingBySlug, getRelatedListings } from "@/server/services/listings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Same subcategory → category → tehsil, ranked, excludes self (§2.3 #19). */
export const GET = handler(async (_request, { params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const detail = await getListingBySlug(slug);
  if (!detail) throw ApiError.notFound("That listing");
  return ok(await getRelatedListings(detail.listing.id));
});
