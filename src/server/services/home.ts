import "server-only";
import { rpc } from "../db";
import { toListing, type ListingItemRow } from "./listings";
import type { Listing } from "@/types";

/**
 * The homepage (§2.3 #25). One RPC — `fn_home_payload` — ranks active,
 * approved listings by lifetime view_count (most recently published as
 * tiebreak) and caps the list at `home.top_listings_size`; no minimum-count
 * gate. This layer only reshapes rows into the types the front end's
 * listing-card component already renders.
 */

export type HomePayload = {
  topListings: Listing[];
  counters: { totalActiveListings: number; totalSellers: number };
};

type HomePayloadRow = {
  topListings: ListingItemRow[];
  counters: HomePayload["counters"];
};

export async function getHomePayload(): Promise<HomePayload> {
  const row = await rpc<HomePayloadRow>("fn_home_payload");

  return {
    topListings: row.topListings.map(toListing),
    counters: row.counters,
  };
}
