import "server-only";
import { rpc } from "../db";
import { toListing, type ListingItemRow } from "./listings";
import { topSellers } from "./sellers";
import type { Listing, Seller } from "@/types";

/**
 * The homepage (§2.3 #25). One RPC — `fn_home_payload` — ranks active,
 * approved listings by lifetime view_count (most recently published as
 * tiebreak) and caps the list at `home.top_listings_size`; no minimum-count
 * gate. This layer only reshapes rows into the types the front end's
 * listing-card component already renders.
 *
 * `topSellers` rides alongside it in parallel — a separate REST read (not
 * part of the RPC), ranked by rating_score/rating_count first, then
 * listing_count/recency so an unrated marketplace still fills the shelf.
 */

export type HomePayload = {
  topListings: Listing[];
  topSellers: Seller[];
  counters: { totalActiveListings: number; totalSellers: number };
};

type HomePayloadRow = {
  topListings: ListingItemRow[];
  counters: HomePayload["counters"];
};

export async function getHomePayload(): Promise<HomePayload> {
  const [row, sellers] = await Promise.all([
    rpc<HomePayloadRow>("fn_home_payload"),
    topSellers({ limit: 6 }),
  ]);

  return {
    topListings: row.topListings.map(toListing),
    topSellers: sellers,
    counters: row.counters,
  };
}
