import "server-only";
import { cache } from "react";
import { currentUser } from "./guard";
import { getPublicUser, type PublicUser } from "../services/auth";

/**
 * Who is signed in, for Server Components.
 *
 * Wrapped in React's `cache` so a layout, a page and three components in the
 * same render share one database read rather than issuing four.
 *
 * Returns null rather than throwing: rendering a page for a signed-out visitor
 * is a normal outcome, and the guards in `guard.ts` are what enforce access.
 */
export const getServerUser = cache(async (): Promise<PublicUser | null> => {
  const claims = await currentUser();
  if (!claims) return null;
  return getPublicUser(claims.sub);
});
