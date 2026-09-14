import "server-only";
import { db } from "../db";
import { ApiError } from "../http/errors";
import { log } from "../http/log";

/**
 * GET /api/seller/analytics — one RPC (fn_seller_analytics, migration 0017),
 * scoped to the caller's own sellerId. See that migration's comment for why
 * there is no buyer identity anywhere in the source tables.
 */

export type SellerAnalyticsDay = { day: string; views: number; contacts: number };
export type SellerAnalyticsListing = { listingId: string; slug: string; title: string; views: number; contacts: number };
export type SellerAnalytics = {
  days: 30 | 90;
  daily: SellerAnalyticsDay[];
  perListing: SellerAnalyticsListing[];
  totals: {
    periodViews: number;
    periodContacts: number;
    storefrontViews: number;
    allTimeSellerViews: number;
    listingCount: number;
  };
};

export async function getSellerAnalytics(sellerId: string, days: 30 | 90): Promise<SellerAnalytics> {
  const { data, error } = await db.rpc("fn_seller_analytics", { p_seller_id: sellerId, p_days: days });
  if (error) {
    log.error("fn_seller_analytics failed", { sellerId, message: error.message });
    throw new ApiError("INTERNAL", "Could not load your analytics. Please try again.");
  }
  return data as SellerAnalytics;
}
