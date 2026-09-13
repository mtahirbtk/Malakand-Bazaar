# Phase 7 — Reviews, Ratings, Sellers Directory, Favourites — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship endpoints 26–37 of `docs/backend-plan.md` — reviews (write/edit/delete + Bayesian rating aggregation, already trigger-maintained in the DB), the public sellers directory (`/sellers`), favourites (save/unsave a listing, `/account/favorites`), and `/account/reviews` — replacing every mock/stand-in this touches.

**Architecture:** Same shape as every prior phase: Next.js Route Handlers under `src/app/api/**` backed by `src/server/services/*`, Supabase Postgres reached through the service-role client (`src/server/db.ts`), zod request validation (`src/server/schemas/*`), the `{ ok, data }` / `{ ok: false, error }` envelope (`src/server/http/respond.ts`). Server Components call services directly; Client Components call the same logic over `/api` via `src/lib/api-client.ts`. **No migration is needed** — `reviews` and `favorites` tables, their indexes, and the `trg_reviews_aggregate` / `fn_rating_score` triggers were already provisioned in migrations `0004` and `0007` (Phase 1, Foundation). This phase is app-layer only.

**Tech Stack:** Next.js 15 App Router (Node runtime route handlers) · `@supabase/supabase-js` (service-role) · zod · Vitest + Testing Library (`tests/auth-harness.tsx`) · next-intl.

**Spec:** `docs/backend-plan.md` §2.4 (sellers, #26–30), §2.5 (reviews, #31–34), §2.6 (favourites, #35–37), §9 Phase 7.

## Global Constraints

- Envelope, error codes and rate-limit buckets exactly as `docs/backend-plan.md` §2/§3.4 and `src/server/http/errors.ts` already define them — do not invent new `ErrorCode` values.
- Every mutating route: `enforceCsrf(request)` first, then the guard (`requireUser`/`requireSeller`), then `enforceRateLimit("write", sub)`. Copy the order from `src/app/api/seller/me/route.ts:23-30`.
- Ownership checks happen in the SQL `WHERE` clause, never only in JS (`docs/backend-plan.md` §3.3, `src/server/auth/guard.ts` doc comment). A mismatched id updates/deletes zero rows and the handler reports `404`, not `403` — same idiom as `getOwnListingById` in `src/server/services/seller-listings.ts:131-141`.
- No native form controls outside `src/components/ui/` (project ESLint rule, `CLAUDE.md`).
- `brand-600` for interactive elements, `brand-800` reserved for primary CTAs/prices/titles (`CLAUDE.md`).
- This codebase does not unit-test service functions (no DB-mocking harness exists — confirmed: only `src/server/schemas/*.test.ts` and `src/server/http/validate.test.ts` exist under `src/server`). Backend tasks below follow that convention: zod schemas get real Vitest unit tests; services/routes are verified with `npm run dev` + `curl` against local Supabase, per each task's manual verification step. UI component tasks get full Testing-Library tests using `tests/auth-harness.tsx` (`renderWithAuth`, `mockApi`, `makeUser`, `makeSeller`) — that harness already exists and is the established pattern (see `src/components/seller/seller-listings-table.test.tsx`).
- Every new/changed file ends with `npm run lint` and `npx tsc --noEmit` passing (this repo has no separate typecheck script — confirm with `cat package.json` if that assumption is stale before Task 1).
- `npm run dev` is pinned to port 3200. Never run `npm run build` while `dev` is running (`CLAUDE.md`).

---

## Part A — Reviews backend

### Task 1: Review request schemas

**Files:**
- Create: `src/server/schemas/reviews.ts`
- Test: `src/server/schemas/reviews.test.ts`

**Interfaces:**
- Produces: `createReviewSchema`, `CreateReviewInput`; `updateReviewSchema`, `UpdateReviewInput`; `sellerReviewsQuerySchema`, `SellerReviewsQuery`; `myReviewsQuerySchema`, `MyReviewsQuery` — all consumed by Task 2 (service) and Task 3 (routes).

- [ ] **Step 1: Write the failing test**

```typescript
// src/server/schemas/reviews.test.ts
import { describe, it, expect } from "vitest";
import { createReviewSchema, updateReviewSchema, sellerReviewsQuerySchema } from "./reviews";

describe("createReviewSchema", () => {
  it("accepts a valid review", () => {
    const result = createReviewSchema.parse({ rating: 5, comment: "Great seller, fast delivery." });
    expect(result).toEqual({ rating: 5, comment: "Great seller, fast delivery." });
  });

  it("allows an empty comment", () => {
    const result = createReviewSchema.parse({ rating: 4, comment: "" });
    expect(result.comment).toBeUndefined();
  });

  it("rejects a rating outside 1-5", () => {
    expect(() => createReviewSchema.parse({ rating: 6, comment: "" })).toThrow();
    expect(() => createReviewSchema.parse({ rating: 0, comment: "" })).toThrow();
  });

  it("rejects a comment over 1500 characters", () => {
    expect(() => createReviewSchema.parse({ rating: 5, comment: "x".repeat(1501) })).toThrow();
  });
});

describe("updateReviewSchema", () => {
  it("requires at least one field", () => {
    expect(() => updateReviewSchema.parse({})).toThrow("Nothing to update.");
  });

  it("accepts rating only", () => {
    expect(updateReviewSchema.parse({ rating: 3 })).toEqual({ rating: 3 });
  });
});

describe("sellerReviewsQuerySchema", () => {
  it("defaults limit and page", () => {
    const result = sellerReviewsQuerySchema.parse({});
    expect(result.limit).toBe(24);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/schemas/reviews.test.ts`
Expected: FAIL — `Cannot find module './reviews'`

- [ ] **Step 3: Write the schema**

```typescript
// src/server/schemas/reviews.ts
import { z } from "zod";
import { paginationSchema, sanitizeText } from "../http/validate";

/**
 * Request shapes for reviews — §2.5 #31-34. `rating` is a plain 1-5 int (the
 * DB's `reviews_rating_chk` constraint is the same bound, this is the
 * friendly-error copy of it). `comment` is optional everywhere: a star rating
 * alone is a valid review.
 */

const commentSchema = z
  .string()
  .transform(sanitizeText)
  .pipe(z.string().max(1500, "Keep this under 1500 characters."))
  .optional()
  .transform((v) => (v === "" ? undefined : v));

export const createReviewSchema = z.object({
  rating: z.number().int().min(1, "Choose 1 to 5 stars.").max(5, "Choose 1 to 5 stars."),
  comment: commentSchema,
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5).optional(),
    comment: commentSchema,
  })
  .refine((v) => v.rating !== undefined || v.comment !== undefined, {
    message: "Nothing to update.",
  });
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

export const sellerReviewsQuerySchema = paginationSchema;
export type SellerReviewsQuery = z.infer<typeof sellerReviewsQuerySchema>;

export const myReviewsQuerySchema = paginationSchema;
export type MyReviewsQuery = z.infer<typeof myReviewsQuerySchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/server/schemas/reviews.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/schemas/reviews.ts src/server/schemas/reviews.test.ts
git commit -m "feat: Phase 7 — review request schemas" -m "$(cat <<'EOF'
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Reviews service

**Files:**
- Create: `src/server/services/reviews.ts`

**Interfaces:**
- Consumes: `db`, `PG`, `ApiError`, `log` (existing); `CreateReviewInput`/`UpdateReviewInput`/`SellerReviewsQuery`/`MyReviewsQuery` (Task 1).
- Produces (consumed by Task 3 routes):
  - `type ReviewItem = { id: string; buyerId: string; buyerName: string; rating: number; comment: string | null; createdAt: string; updatedAt: string }`
  - `type ReviewHistogram = { 1: number; 2: number; 3: number; 4: number; 5: number }`
  - `createReview(sellerId: string, buyerId: string, input: CreateReviewInput): Promise<ReviewItem>`
  - `updateReview(reviewId: string, buyerId: string, input: UpdateReviewInput): Promise<ReviewItem>`
  - `deleteReview(reviewId: string, caller: { id: string; role: string }): Promise<void>`
  - `listSellerReviews(sellerId: string, query: SellerReviewsQuery): Promise<{ items: ReviewItem[]; total: number; histogram: ReviewHistogram }>`
  - `type MyReviewItem = ReviewItem & { sellerId: string; sellerName: string; sellerSlug: string }`
  - `listMyReviews(buyerId: string, query: MyReviewsQuery): Promise<{ items: MyReviewItem[]; total: number }>`

- [ ] **Step 1: Write the service**

```typescript
// src/server/services/reviews.ts
import "server-only";
import { db, PG } from "../db";
import { ApiError } from "../http/errors";
import { log } from "../http/log";
import type { CreateReviewInput, MyReviewsQuery, SellerReviewsQuery, UpdateReviewInput } from "../schemas/reviews";

/**
 * Reviews — §2.5 #31-34. The DB owns the invariants application code would
 * otherwise have to re-check:
 *
 *   - `reviews_one_per_buyer_uniq (seller_id, buyer_id)` — a second POST hits
 *     PG.UNIQUE_VIOLATION, translated to 409 CONFLICT below.
 *   - `trg_reviews_no_self` — reviewing your own storefront raises P0001,
 *     translated to a validation error below.
 *   - `trg_reviews_aggregate` — every insert/update/delete recomputes the
 *     seller's rating_avg/rating_count/rating_score (migration 0007). This
 *     layer never touches those columns.
 */

export type ReviewItem = {
  id: string;
  buyerId: string;
  buyerName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReviewHistogram = { 1: number; 2: number; 3: number; 4: number; 5: number };

type ReviewRow = {
  id: string;
  buyer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

/** Batch-fetches display names for a page of reviews — one round trip, not N. */
async function buyerNames(buyerIds: string[]): Promise<Map<string, string>> {
  if (buyerIds.length === 0) return new Map();
  const { data } = await db.from("users").select("id, display_name").in("id", buyerIds);
  return new Map((data ?? []).map((u) => [u.id, u.display_name as string]));
}

function toReviewItem(row: ReviewRow, buyerName: string): ReviewItem {
  return {
    id: row.id,
    buyerId: row.buyer_id,
    buyerName,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps the two DB-enforced invariants to friendly errors; rethrows anything
 * else. The self-review trigger (`fn_reviews_no_self`, migration 0007)
 * explicitly sets `errcode = 'check_violation'` (PG.CHECK_VIOLATION,
 * `23514`) — the same SQLSTATE a plain `check (...)` constraint violation
 * would raise (e.g. `reviews_rating_chk`, unreachable here since zod already
 * bounds rating/comment before this query runs, but sharing the code
 * regardless). The message text is what's actually unique to this trigger,
 * so match on that, not on the error code.
 */
function translateReviewWriteError(error: { code?: string; message: string }, context: Record<string, unknown>): never {
  if (error.code === PG.UNIQUE_VIOLATION) {
    throw ApiError.conflict("You have already reviewed this seller. Edit your existing review instead.");
  }
  if (/cannot review their own storefront/.test(error.message)) {
    throw ApiError.validation("You cannot review your own storefront.");
  }
  log.error("review write failed", { ...context, code: error.code, message: error.message });
  throw new ApiError("INTERNAL", "Could not save your review. Please try again.");
}

export async function createReview(sellerId: string, buyerId: string, input: CreateReviewInput): Promise<ReviewItem> {
  const { data, error } = await db
    .from("reviews")
    .insert({ seller_id: sellerId, buyer_id: buyerId, rating: input.rating, comment: input.comment ?? null })
    .select("id, buyer_id, rating, comment, created_at, updated_at")
    .single();

  if (error) translateReviewWriteError(error, { sellerId, buyerId });

  return toReviewItem(data as ReviewRow, (await buyerNames([buyerId])).get(buyerId) ?? "");
}

export async function updateReview(reviewId: string, buyerId: string, input: UpdateReviewInput): Promise<ReviewItem> {
  const patch: Record<string, unknown> = {};
  if (input.rating !== undefined) patch.rating = input.rating;
  if (input.comment !== undefined) patch.comment = input.comment;

  const { data, error } = await db
    .from("reviews")
    .update(patch)
    .eq("id", reviewId)
    .eq("buyer_id", buyerId)
    .select("id, buyer_id, rating, comment, created_at, updated_at")
    .maybeSingle();

  if (error) translateReviewWriteError(error, { reviewId, buyerId });
  // Ownership mismatch or a deleted review both land here — same idiom as
  // getOwnListingById: 404, not 403 (see guard.ts's assertOwnership doc).
  if (!data) throw ApiError.notFound("That review");

  return toReviewItem(data as ReviewRow, (await buyerNames([buyerId])).get(buyerId) ?? "");
}

export async function deleteReview(reviewId: string, caller: { id: string; role: string }): Promise<void> {
  let query = db.from("reviews").delete().eq("id", reviewId);
  // §2.5 #33: own, or admin moderation. Audit logging for the admin path
  // lands with Phase 8's admin surface (docs/backend-plan.md §9) — this is
  // the plain delete until then.
  if (caller.role !== "admin") query = query.eq("buyer_id", caller.id);

  const { data, error } = await query.select("id");
  if (error) {
    log.error("review delete failed", { reviewId, callerId: caller.id, message: error.message });
    throw new ApiError("INTERNAL", "Could not delete that review. Please try again.");
  }
  if (!data || data.length === 0) throw ApiError.notFound("That review");
}

export async function listSellerReviews(
  sellerId: string,
  query: SellerReviewsQuery
): Promise<{ items: ReviewItem[]; total: number; histogram: ReviewHistogram }> {
  const page = query.page ?? 1;
  const from = (page - 1) * query.limit;
  const to = from + query.limit - 1;

  const [{ data, error, count }, { data: allRatings }] = await Promise.all([
    db
      .from("reviews")
      .select("id, buyer_id, rating, comment, created_at, updated_at", { count: "exact" })
      .eq("seller_id", sellerId)
      .eq("status", "visible")
      .order("created_at", { ascending: false })
      .range(from, to),
    // Histogram over every visible review, not just this page. Fine at
    // marketplace scale (a seller's total review count, not every review's
    // text) — revisit with a SQL group-by if a storefront ever has
    // thousands of reviews.
    db.from("reviews").select("rating").eq("seller_id", sellerId).eq("status", "visible"),
  ]);

  if (error) {
    log.error("listSellerReviews failed", { sellerId, message: error.message });
    throw new ApiError("INTERNAL", "Could not load reviews. Please try again.");
  }

  const rows = (data ?? []) as ReviewRow[];
  const names = await buyerNames(rows.map((r) => r.buyer_id));

  const histogram: ReviewHistogram = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of allRatings ?? []) {
    histogram[r.rating as 1 | 2 | 3 | 4 | 5]++;
  }

  return {
    items: rows.map((row) => toReviewItem(row, names.get(row.buyer_id) ?? "")),
    total: count ?? 0,
    histogram,
  };
}

export type MyReviewItem = ReviewItem & { sellerId: string; sellerName: string; sellerSlug: string };

export async function listMyReviews(
  buyerId: string,
  query: MyReviewsQuery
): Promise<{ items: MyReviewItem[]; total: number }> {
  const page = query.page ?? 1;
  const from = (page - 1) * query.limit;
  const to = from + query.limit - 1;

  const { data, error, count } = await db
    .from("reviews")
    .select("id, buyer_id, seller_id, rating, comment, created_at, updated_at", { count: "exact" })
    .eq("buyer_id", buyerId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    log.error("listMyReviews failed", { buyerId, message: error.message });
    throw new ApiError("INTERNAL", "Could not load your reviews. Please try again.");
  }

  const rows = (data ?? []) as (ReviewRow & { seller_id: string })[];
  const sellerIds = [...new Set(rows.map((r) => r.seller_id))];
  const { data: sellerRows } = sellerIds.length
    ? await db.from("sellers").select("id, name, slug").in("id", sellerIds)
    : { data: [] as { id: string; name: string; slug: string }[] };
  const sellers = new Map((sellerRows ?? []).map((s) => [s.id, s]));

  return {
    items: rows.map((row) => ({
      ...toReviewItem(row, ""),
      sellerId: row.seller_id,
      sellerName: sellers.get(row.seller_id)?.name ?? "",
      sellerSlug: sellers.get(row.seller_id)?.slug ?? "",
    })),
    total: count ?? 0,
  };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors from `src/server/services/reviews.ts`

- [ ] **Step 3: Commit**

```bash
git add src/server/services/reviews.ts
git commit -m "feat: Phase 7 — reviews service (create/update/delete/list)" -m "$(cat <<'EOF'
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Review routes

**Files:**
- Create: `src/app/api/sellers/[slug]/reviews/route.ts` (GET #29, POST #31)
- Create: `src/app/api/reviews/[id]/route.ts` (PATCH #32, DELETE #33)
- Create: `src/app/api/me/reviews/route.ts` (GET #34)

**Interfaces:**
- Consumes: `handler`, `ok`, `okCached` (`respond.ts`); `ApiError`; `readJson`/`readQuery`; `enforceRateLimit`; `enforceCsrf`; `requireUser`; everything from Task 1 and Task 2.

- [ ] **Step 1: `/api/sellers/[slug]/reviews` — GET (public, cached) and POST (write)**

The spec table lists POST under `/api/sellers/:id/reviews` while every sibling read in §2.4 uses `:slug`. Next.js requires one dynamic-segment name per path level, so both live under `[slug]` here — POST resolves the seller by slug (the client already has it on the `Seller` object) rather than requiring a second identifier scheme. Documented here rather than silently deviating.

```typescript
// src/app/api/sellers/[slug]/reviews/route.ts
import { handler, ok, okCached } from "@/server/http/respond";
import { ApiError } from "@/server/http/errors";
import { readJson, readQuery } from "@/server/http/validate";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { enforceCsrf } from "@/server/auth/csrf";
import { requireUser } from "@/server/auth/guard";
import { createReviewSchema, sellerReviewsQuerySchema } from "@/server/schemas/reviews";
import { createReview, listSellerReviews } from "@/server/services/reviews";
import { db } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function sellerIdForSlug(slug: string): Promise<string> {
  const { data } = await db.from("sellers").select("id").eq("slug", slug).eq("status", "active").maybeSingle();
  if (!data) throw ApiError.notFound("That seller");
  return data.id;
}

/** Public reviews list, newest first, with a rating histogram (§2.4 #29). */
export const GET = handler(async (request, context: { params: Promise<{ slug: string }> }) => {
  const { slug } = await context.params;
  const sellerId = await sellerIdForSlug(slug);
  const query = readQuery(request, sellerReviewsQuerySchema);
  const result = await listSellerReviews(sellerId, query);
  return okCached(result.items, 30, { meta: { total: result.total, histogram: result.histogram } });
});

/** Write a review — one per (buyer, seller) (§2.5 #31). */
export const POST = handler(async (request, context: { params: Promise<{ slug: string }> }) => {
  await enforceCsrf(request);
  const user = await requireUser();
  await enforceRateLimit("write", user.sub);

  const { slug } = await context.params;
  const sellerId = await sellerIdForSlug(slug);
  const input = await readJson(request, createReviewSchema);
  const review = await createReview(sellerId, user.sub, input);

  return ok({ review }, { status: 201 });
});
```

- [ ] **Step 2: `/api/reviews/[id]` — PATCH and DELETE**

```typescript
// src/app/api/reviews/[id]/route.ts
import { handler, ok } from "@/server/http/respond";
import { readJson } from "@/server/http/validate";
import { uuidSchema } from "@/server/http/validate";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { enforceCsrf } from "@/server/auth/csrf";
import { requireUser } from "@/server/auth/guard";
import { updateReviewSchema } from "@/server/schemas/reviews";
import { deleteReview, updateReview } from "@/server/services/reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Edit your own review (§2.5 #32). */
export const PATCH = handler(async (request, context: { params: Promise<{ id: string }> }) => {
  await enforceCsrf(request);
  const user = await requireUser();
  await enforceRateLimit("write", user.sub);

  const { id } = await context.params;
  const reviewId = uuidSchema.parse(id);
  const patch = await readJson(request, updateReviewSchema);
  const review = await updateReview(reviewId, user.sub, patch);

  return ok({ review });
});

/** Delete your own review, or an admin moderating (§2.5 #33). */
export const DELETE = handler(async (request, context: { params: Promise<{ id: string }> }) => {
  await enforceCsrf(request);
  const user = await requireUser();
  await enforceRateLimit("write", user.sub);

  const { id } = await context.params;
  const reviewId = uuidSchema.parse(id);
  await deleteReview(reviewId, { id: user.sub, role: user.role });

  return ok({ deleted: true });
});
```

- [ ] **Step 3: `/api/me/reviews` — GET**

```typescript
// src/app/api/me/reviews/route.ts
import { handler, ok } from "@/server/http/respond";
import { readQuery } from "@/server/http/validate";
import { requireUser } from "@/server/auth/guard";
import { myReviewsQuerySchema } from "@/server/schemas/reviews";
import { listMyReviews } from "@/server/services/reviews";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reviews I wrote — account page (§2.5 #34). */
export const GET = handler(async (request) => {
  const user = await requireUser();
  const query = readQuery(request, myReviewsQuerySchema);
  const result = await listMyReviews(user.sub, query);

  return ok(result.items, {
    meta: { total: result.total, limit: query.limit, page: query.page ?? 1 },
    headers: { "Cache-Control": "no-store" },
  });
});
```

- [ ] **Step 4: Manual verification**

Run: `npm run dev` (port 3200; it must not already be running per `CLAUDE.md`), then in another terminal, signed in as a customer (reuse the cookie jar from a prior sign-in, or sign up first):

```bash
curl -s -c /tmp/mb.jar -X POST http://localhost:3200/api/auth/signup \
  -H "content-type: application/json" \
  -d '{"phone":"+923001112222","password":"testpass1","displayName":"Test Buyer"}'

# Grab a real seller slug from /api/sellers once Task 6 exists, or from the DB directly:
SLUG=$(curl -s http://localhost:3200/api/home | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['topSellers'][0]['slug'])")

CSRF=$(grep mb_csrf /tmp/mb.jar | awk '{print $7}')
curl -s -b /tmp/mb.jar -X POST "http://localhost:3200/api/sellers/$SLUG/reviews" \
  -H "content-type: application/json" -H "x-csrf-token: $CSRF" \
  -d '{"rating":5,"comment":"Great seller"}'
# Expect: {"ok":true,"data":{"review":{...}}}

curl -s -b /tmp/mb.jar "http://localhost:3200/api/sellers/$SLUG/reviews"
# Expect: {"ok":true,"data":[{...}],"meta":{"total":1,"histogram":{"1":0,...,"5":1}}}

# Repeat POST -> expect {"ok":false,"error":{"code":"CONFLICT",...}}
```

Expected: signup succeeds, POST creates the review, GET lists it with a populated histogram, a second POST 409s.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/sellers/\[slug\]/reviews/route.ts src/app/api/reviews/\[id\]/route.ts src/app/api/me/reviews/route.ts
git commit -m "feat: Phase 7 — review routes (write, edit, delete, list mine)" -m "$(cat <<'EOF'
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Part B — Sellers directory backend

### Task 4: Sellers directory query schema

**Files:**
- Create: `src/server/schemas/sellers-directory.ts`
- Test: `src/server/schemas/sellers-directory.test.ts`

**Interfaces:**
- Produces: `sellersDirectoryQuerySchema`, `SellersDirectoryQuery`; `topSellersQuerySchema`, `TopSellersQuery` — consumed by Task 5 (service) and Task 6 (routes).

- [ ] **Step 1: Write the failing test**

```typescript
// src/server/schemas/sellers-directory.test.ts
import { describe, it, expect } from "vitest";
import { sellersDirectoryQuerySchema, topSellersQuerySchema } from "./sellers-directory";

describe("sellersDirectoryQuerySchema", () => {
  it("defaults sort to rating and limit to 24", () => {
    const result = sellersDirectoryQuerySchema.parse({});
    expect(result.sort).toBe("rating");
    expect(result.limit).toBe(24);
  });

  it("coerces verifiedOnly from a query-string boolean", () => {
    expect(sellersDirectoryQuerySchema.parse({ verifiedOnly: "true" }).verifiedOnly).toBe(true);
    expect(sellersDirectoryQuerySchema.parse({}).verifiedOnly).toBe(false);
  });

  it("rejects an unknown sort value", () => {
    expect(() => sellersDirectoryQuerySchema.parse({ sort: "bogus" })).toThrow();
  });
});

describe("topSellersQuerySchema", () => {
  it("caps limit at 12", () => {
    expect(() => topSellersQuerySchema.parse({ limit: "50" })).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/server/schemas/sellers-directory.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the schema**

```typescript
// src/server/schemas/sellers-directory.ts
import { z } from "zod";
import { booleanish, numeric, paginationSchema, slugSchema } from "../http/validate";

/** Public sellers directory — §2.4 #26, #30. */

export const sellersDirectoryQuerySchema = z
  .object({
    tehsil: slugSchema.optional(),
    category: slugSchema.optional(),
    verifiedOnly: booleanish.default(false),
    q: z
      .string()
      .max(200)
      .optional()
      .transform((v) => (v?.trim() ? v.trim() : undefined)),
    sort: z.enum(["rating", "newest", "listings"]).default("rating"),
  })
  .merge(paginationSchema);
export type SellersDirectoryQuery = z.infer<typeof sellersDirectoryQuerySchema>;

export const topSellersQuerySchema = z.object({
  limit: numeric({ min: 1, max: 12, int: true }).default(8),
});
export type TopSellersQuery = z.infer<typeof topSellersQuerySchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/server/schemas/sellers-directory.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/server/schemas/sellers-directory.ts src/server/schemas/sellers-directory.test.ts
git commit -m "feat: Phase 7 — sellers directory query schema" -m "$(cat <<'EOF'
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Sellers directory, detail, and top-sellers services

**Files:**
- Modify: `src/server/services/sellers.ts`
- Modify: `src/types/index.ts` (add `memberSince` to `Seller`)

**Interfaces:**
- Consumes: `SellersDirectoryQuery`, `TopSellersQuery` (Task 4); existing `SELLER_COLUMNS`, `toSellerSummary` (already in `sellers.ts`).
- Produces (consumed by Task 6 routes and Task 11 storefront rewire):
  - `listSellers(query: SellersDirectoryQuery): Promise<{ items: Seller[]; total: number }>`
  - `getSellerDetail(slug: string): Promise<Seller | null>` — supersedes `getPublicSellerBySlug` (kept as a re-export alias so `seller/[slug]/page.tsx` swaps in Task 11 with a one-line import change, not a rename hunt).
  - `topSellers(query: TopSellersQuery): Promise<Seller[]>`

- [ ] **Step 1: Add `memberSince` to the `Seller` type**

`src/types/index.ts` — insert after the `description` field (around line 86):

```typescript
  /** Storefront bio, set at registration. Absent on the 5 seed fixtures. */
  description?: string;
  avatarUrl?: string;
  /** ISO date the storefront was created. Absent only for the 5 seed fixtures. */
  memberSince?: string;
```

- [ ] **Step 2: Add a shared `Seller`-shaping helper + the three new functions**

Insert into `src/server/services/sellers.ts`, after the existing `toSellerSummary` function and before `resolveLocality`:

```typescript
import type { SellersDirectoryQuery, TopSellersQuery } from "../schemas/sellers-directory";

const PUBLIC_SELLER_COLUMNS =
  "id, slug, name, description, phone, tehsil_slug, locality_label, verified, rating_avg, rating_count, response_minutes, listing_count, avatar_path, banner_path, created_at";

type PublicSellerRow = {
  id: string; slug: string; name: string; description: string | null; phone: string;
  tehsil_slug: string | null; locality_label: string | null; verified: boolean;
  rating_avg: number; rating_count: number; response_minutes: number; listing_count: number;
  avatar_path: string | null; banner_path: string | null; created_at: string;
};

function toPublicSeller(row: PublicSellerRow): Seller {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    initials: initialsFromName(row.name),
    tehsilSlug: (row.tehsil_slug ?? "batkhela") as TehsilSlug,
    localityLabel: row.locality_label ?? "",
    rating: Number(row.rating_avg),
    reviewCount: row.rating_count,
    verified: row.verified,
    responseMinutes: row.response_minutes,
    listingCount: row.listing_count,
    phone: row.phone,
    description: row.description ?? undefined,
    avatarUrl: row.avatar_path ? cloudinaryUrl(row.avatar_path) : undefined,
    storefrontBanner: row.banner_path ? cloudinaryUrl(row.banner_path) : undefined,
    memberSince: row.created_at,
  };
}
```

Add after `resolveLocality` (or anywhere below the imports are settled — file organization already groups by feature, so place these near the bottom with the other public-read functions, after `getSellerPrivate`):

```typescript
/**
 * `/sellers` directory — §2.4 #26. Plain filtered/sorted/paginated read, no
 * facets (unlike GET /api/listings, this list doesn't need them) — matches
 * the pattern in seller-listings.ts's listSellerListings rather than the RPC
 * pattern reserved for the heavy search/home reads (§1.4).
 */
export async function listSellers(query: SellersDirectoryQuery): Promise<{ items: Seller[]; total: number }> {
  const page = query.page ?? 1;
  const from = (page - 1) * query.limit;
  const to = from + query.limit - 1;

  let builder = db.from("sellers").select(PUBLIC_SELLER_COLUMNS, { count: "exact" }).eq("status", "active");

  if (query.tehsil) builder = builder.eq("tehsil_slug", query.tehsil);
  if (query.verifiedOnly) builder = builder.eq("verified", true);
  if (query.q) builder = builder.ilike("name", `%${query.q}%`);
  if (query.category) {
    // A seller has no category of its own — "sells in this category" means
    // "has at least one publicly-visible listing in it". Same visibility
    // definition as the `listings_active_idx` partial index (0004_marketplace.sql):
    // active + approved + not deleted, not just active + not deleted — a
    // listing still pending moderation must not surface its seller here.
    const { data: sellerIds, error: categoryError } = await db
      .from("listings")
      .select("seller_id")
      .eq("category_slug", query.category)
      .eq("status", "active")
      .eq("moderation_status", "approved")
      .is("deleted_at", null);
    if (categoryError) {
      log.error("listSellers category filter failed", { category: query.category, message: categoryError.message });
      throw new ApiError("INTERNAL", "Could not load sellers. Please try again.");
    }
    const ids = [...new Set((sellerIds ?? []).map((r) => r.seller_id))];
    if (ids.length === 0) return { items: [], total: 0 };
    builder = builder.in("id", ids);
  }

  const [column, ascending] = (
    { rating: ["rating_score", false], newest: ["created_at", false], listings: ["listing_count", false] } as const
  )[query.sort];

  const { data, error, count } = await builder.order(column, { ascending }).range(from, to);
  if (error) {
    log.error("listSellers failed", { message: error.message });
    throw new ApiError("INTERNAL", "Could not load sellers. Please try again.");
  }

  return { items: (data as PublicSellerRow[] ?? []).map(toPublicSeller), total: count ?? 0 };
}

/**
 * Homepage top-sellers widget — §2.4 #30. `getSellerDetail`'s DB query with
 * a rating floor and a hard limit instead of a slug lookup.
 */
export async function topSellers(query: TopSellersQuery): Promise<Seller[]> {
  const { data, error } = await db
    .from("sellers")
    .select(PUBLIC_SELLER_COLUMNS)
    .eq("status", "active")
    .gte("rating_count", 1)
    .order("rating_score", { ascending: false })
    .order("rating_count", { ascending: false })
    .limit(query.limit);

  if (error) {
    log.error("topSellers failed", { message: error.message });
    throw new ApiError("INTERNAL", "Could not load top sellers. Please try again.");
  }
  return (data as PublicSellerRow[] ?? []).map(toPublicSeller);
}
```

- [ ] **Step 3: Rename `getPublicSellerBySlug` to `getSellerDetail`, add `memberSince`**

Replace the existing `getPublicSellerBySlug` function body (currently hand-building the `Seller` object field by field) to reuse the new shared mapper, and rename it:

```typescript
/**
 * `/seller/[slug]` storefront header — §2.4 #27. Was a stand-in
 * (`getPublicSellerBySlug`) built ahead of this phase; now the real thing —
 * same query, routed through the shared `toPublicSeller` mapper so it always
 * matches what `listSellers`/`topSellers` return.
 */
export async function getSellerDetail(slug: string): Promise<Seller | null> {
  const { data } = await db
    .from("sellers")
    .select(PUBLIC_SELLER_COLUMNS)
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  return data ? toPublicSeller(data as PublicSellerRow) : null;
}
```

`grep -rn getPublicSellerBySlug src` first to confirm the only caller is `seller/[slug]/page.tsx` (Task 11 rewrites that page to call `getSellerDetail` directly). Until Task 11 runs, the branch must still compile and every other task's `npx tsc --noEmit` must stay clean — so keep a thin re-export alias rather than deleting the old name outright:

```typescript
/** @deprecated Use getSellerDetail — this alias exists only until Task 11 updates its one caller. */
export const getPublicSellerBySlug = getSellerDetail;
```

Task 11 removes this alias in the same commit that switches the page's import.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean. The branch must compile after every task, not just after Task 11 — that's what the alias in Step 3 is for.

- [ ] **Step 5: Commit**

```bash
git add src/server/services/sellers.ts src/types/index.ts
git commit -m "feat: Phase 7 — sellers directory, detail, and top-sellers services" -m "$(cat <<'EOF'
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Sellers directory routes

**Files:**
- Create: `src/app/api/sellers/route.ts` (GET #26)
- Create: `src/app/api/sellers/top/route.ts` (GET #30)

**Interfaces:**
- Consumes: `listSellers`, `topSellers` (Task 5); `sellersDirectoryQuerySchema`, `topSellersQuerySchema` (Task 4).

- [ ] **Step 1: Write both routes**

```typescript
// src/app/api/sellers/route.ts
import { handler, okCached } from "@/server/http/respond";
import { readQuery } from "@/server/http/validate";
import { sellersDirectoryQuerySchema } from "@/server/schemas/sellers-directory";
import { listSellers } from "@/server/services/sellers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The /sellers directory (§2.4 #26). */
export const GET = handler(async (request) => {
  const query = readQuery(request, sellersDirectoryQuerySchema);
  const result = await listSellers(query);
  return okCached(result.items, 60, { meta: { total: result.total, limit: query.limit, page: query.page ?? 1 } });
});
```

```typescript
// src/app/api/sellers/top/route.ts
import { handler, okCached } from "@/server/http/respond";
import { readQuery } from "@/server/http/validate";
import { topSellersQuerySchema } from "@/server/schemas/sellers-directory";
import { topSellers } from "@/server/services/sellers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Homepage top-sellers widget (§2.4 #30). Static "top" sibling next to the
 * dynamic [slug] segment — same coexistence already used by
 * /api/listings/suggest next to /api/listings/[slug]. */
export const GET = handler(async (request) => {
  const query = readQuery(request, topSellersQuerySchema);
  const items = await topSellers(query);
  return okCached(items, 300);
});
```

- [ ] **Step 2: Manual verification**

```bash
npm run dev &  # if not already running
curl -s "http://localhost:3200/api/sellers?sort=rating&limit=5" | python3 -m json.tool
curl -s "http://localhost:3200/api/sellers?verifiedOnly=true" | python3 -m json.tool
curl -s "http://localhost:3200/api/sellers/top?limit=3" | python3 -m json.tool
```

Expected: each returns `{"ok":true,"data":[...]}` with the seeded sellers, filtered/sorted as requested.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/sellers/route.ts src/app/api/sellers/top/route.ts
git commit -m "feat: Phase 7 — GET /api/sellers and /api/sellers/top" -m "$(cat <<'EOF'
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Public seller listings + wire GET /api/sellers/[slug]

**Files:**
- Modify: `src/server/services/listings.ts` (add `listPublicSellerListings`)
- Create: `src/server/schemas/public-seller-listings.ts`
- Create: `src/app/api/sellers/[slug]/route.ts` (GET #27)
- Create: `src/app/api/sellers/[slug]/listings/route.ts` (GET #28)

**Interfaces:**
- Consumes: `getSellerDetail` (Task 5).
- Produces: `publicSellerListingsQuerySchema`, `PublicSellerListingsQuery`; `listPublicSellerListings(sellerId: string, query: PublicSellerListingsQuery): Promise<{ items: Listing[]; total: number }>` — consumed by Task 11 (storefront page rewire, replacing its `searchListings` stand-in call).

- [ ] **Step 1: Query schema**

```typescript
// src/server/schemas/public-seller-listings.ts
import { z } from "zod";
import { paginationSchema } from "../http/validate";

/** GET /api/sellers/:slug/listings — §2.4 #28. */
export const publicSellerListingsQuerySchema = z
  .object({
    status: z.enum(["active", "reserved", "sold"]).default("active"),
    sort: z.enum(["newest", "price_low", "price_high"]).default("newest"),
  })
  .merge(paginationSchema);
export type PublicSellerListingsQuery = z.infer<typeof publicSellerListingsQuerySchema>;
```

- [ ] **Step 2: `listPublicSellerListings` in `listings.ts`**

Add near the bottom of `src/server/services/listings.ts`, reusing the file's own `ListingItemRow`/`toListing`:

```typescript
import type { PublicSellerListingsQuery } from "../schemas/public-seller-listings";

const SELLER_LISTING_COLUMNS =
  "id, slug, title, description, price, compare_at_price, category_slug, subcategory_slug, tehsil_slug, locality_slug, locality_label, coordinates, contact_phone, seller_id, status, created_at";

type PlainListingRow = {
  id: string; slug: string; title: string; description: string; price: number;
  compare_at_price: number | null; category_slug: string; subcategory_slug: string | null;
  tehsil_slug: string | null; locality_slug: string | null; locality_label: string | null;
  coordinates: { lat: number; lng: number } | null; contact_phone: string; seller_id: string;
  status: Listing["status"]; created_at: string;
};

function plainRowToItem(row: PlainListingRow, images: string[]): ListingItemRow {
  return {
    id: row.id, slug: row.slug, title: row.title, description: row.description, price: row.price,
    compareAtPrice: row.compare_at_price, categorySlug: row.category_slug,
    subcategorySlug: row.subcategory_slug, tehsilSlug: row.tehsil_slug, localitySlug: row.locality_slug,
    localityLabel: row.locality_label, images, contactPhone: row.contact_phone, sellerId: row.seller_id,
    status: row.status, createdAt: row.created_at, coordinates: row.coordinates,
  };
}

async function imagesFor(listingIds: string[]): Promise<Map<string, string[]>> {
  if (listingIds.length === 0) return new Map();
  const { data } = await db.from("listing_images").select("listing_id, path, sort").in("listing_id", listingIds).order("sort", { ascending: true });
  const map = new Map<string, string[]>();
  for (const row of data ?? []) {
    const list = map.get(row.listing_id) ?? [];
    list.push(row.path);
    map.set(row.listing_id, list);
  }
  return map;
}

/**
 * `/seller/[slug]` listings tab — §2.4 #28. A plain paginated read scoped to
 * one seller, `moderation_status = 'approved'` and `deleted_at is null`
 * always (a buyer never sees a pending or removed listing here regardless of
 * `status`).
 */
export async function listPublicSellerListings(
  sellerId: string,
  query: PublicSellerListingsQuery
): Promise<{ items: Listing[]; total: number }> {
  const page = query.page ?? 1;
  const from = (page - 1) * query.limit;
  const to = from + query.limit - 1;

  const [column, ascending] = (
    { newest: ["created_at", false], price_low: ["price", true], price_high: ["price", false] } as const
  )[query.sort];

  const { data, error, count } = await db
    .from("listings")
    .select(SELLER_LISTING_COLUMNS, { count: "exact" })
    .eq("seller_id", sellerId)
    .eq("status", query.status)
    .eq("moderation_status", "approved")
    .is("deleted_at", null)
    .order(column, { ascending })
    .range(from, to);

  if (error) {
    log.error("listPublicSellerListings failed", { sellerId, message: error.message });
    throw new ApiError("INTERNAL", "Could not load this seller's listings. Please try again.");
  }

  const rows = (data ?? []) as PlainListingRow[];
  const images = await imagesFor(rows.map((r) => r.id));
  return { items: rows.map((row) => toListing(plainRowToItem(row, images.get(row.id) ?? []))), total: count ?? 0 };
}
```

Add the two missing imports at the top of `listings.ts`: `import { db } from "../db";` and `import { ApiError } from "../http/errors"; import { log } from "../http/log";` (check first — `listings.ts` currently only imports `rpc`, not `db`/`ApiError`/`log`, since every other function goes through an RPC; these need adding, not assuming they're already there).

- [ ] **Step 3: Routes**

```typescript
// src/app/api/sellers/[slug]/route.ts
import { handler, okCached } from "@/server/http/respond";
import { ApiError } from "@/server/http/errors";
import { getSellerDetail } from "@/server/services/sellers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Storefront header + stats (§2.4 #27). */
export const GET = handler(async (_request, context: { params: Promise<{ slug: string }> }) => {
  const { slug } = await context.params;
  const seller = await getSellerDetail(slug);
  if (!seller) throw ApiError.notFound("That seller");
  return okCached({ seller }, 60);
});
```

```typescript
// src/app/api/sellers/[slug]/listings/route.ts
import { handler, ok } from "@/server/http/respond";
import { ApiError } from "@/server/http/errors";
import { readQuery } from "@/server/http/validate";
import { publicSellerListingsQuerySchema } from "@/server/schemas/public-seller-listings";
import { getSellerDetail } from "@/server/services/sellers";
import { listPublicSellerListings } from "@/server/services/listings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Paginated listings tab on the storefront (§2.4 #28). */
export const GET = handler(async (request, context: { params: Promise<{ slug: string }> }) => {
  const { slug } = await context.params;
  const seller = await getSellerDetail(slug);
  if (!seller) throw ApiError.notFound("That seller");

  const query = readQuery(request, publicSellerListingsQuerySchema);
  const result = await listPublicSellerListings(seller.id, query);
  return ok(result.items, { meta: { total: result.total, limit: query.limit, page: query.page ?? 1 } });
});
```

- [ ] **Step 4: Manual verification**

```bash
SLUG=$(curl -s "http://localhost:3200/api/sellers?limit=1" | python3 -c "import json,sys; print(json.load(sys.stdin)['data'][0]['slug'])")
curl -s "http://localhost:3200/api/sellers/$SLUG" | python3 -m json.tool
curl -s "http://localhost:3200/api/sellers/$SLUG/listings" | python3 -m json.tool
curl -s "http://localhost:3200/api/sellers/does-not-exist" | python3 -m json.tool  # expect 404 NOT_FOUND
```

- [ ] **Step 5: Commit**

```bash
git add src/server/services/listings.ts src/server/schemas/public-seller-listings.ts src/app/api/sellers/\[slug\]/route.ts src/app/api/sellers/\[slug\]/listings/route.ts
git commit -m "feat: Phase 7 — GET /api/sellers/:slug and :slug/listings" -m "$(cat <<'EOF'
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Part C — Favourites backend

### Task 8: Favourites schema + service

**Files:**
- Create: `src/server/schemas/favorites.ts`
- Modify: `src/server/services/listings.ts` (add `getListingsByIds`)
- Create: `src/server/services/favorites.ts`

**Interfaces:**
- Produces: `addFavoriteSchema`, `AddFavoriteInput`; `getListingsByIds(ids: string[]): Promise<Listing[]>` (listings.ts); `addFavorite`, `removeFavorite`, `listFavorites` (favorites.ts) — consumed by Task 9 routes.

- [ ] **Step 1: Schema**

```typescript
// src/server/schemas/favorites.ts
import { z } from "zod";
import { uuidSchema } from "../http/validate";

export const addFavoriteSchema = z.object({ listingId: uuidSchema });
export type AddFavoriteInput = z.infer<typeof addFavoriteSchema>;
```

- [ ] **Step 2: `getListingsByIds` in `listings.ts`**

Add alongside `listPublicSellerListings` (Task 7), reusing its `imagesFor`:

```typescript
/**
 * Batch-fetches listings by id, preserving none of the caller's ordering —
 * `listFavorites` (favorites.ts) reorders by the favorite row's own
 * `created_at`. Soft-deleted listings are silently dropped rather than
 * erroring: a favorite on a listing the seller later removed just stops
 * appearing, the favorite row itself is left alone.
 */
export async function getListingsByIds(ids: string[]): Promise<Listing[]> {
  if (ids.length === 0) return [];
  const { data, error } = await db
    .from("listings")
    .select(SELLER_LISTING_COLUMNS)
    .in("id", ids)
    .is("deleted_at", null);

  if (error) {
    log.error("getListingsByIds failed", { message: error.message });
    throw new ApiError("INTERNAL", "Could not load listings. Please try again.");
  }

  const rows = (data ?? []) as PlainListingRow[];
  const images = await imagesFor(rows.map((r) => r.id));
  return rows.map((row) => toListing(plainRowToItem(row, images.get(row.id) ?? [])));
}
```

- [ ] **Step 3: Favorites service**

```typescript
// src/server/services/favorites.ts
import "server-only";
import { db } from "../db";
import { ApiError } from "../http/errors";
import { log } from "../http/log";
import { getListingsByIds } from "./listings";
import type { Listing } from "@/types";

/** Saved listings — §2.6 #35-37. */

export async function addFavorite(userId: string, listingId: string): Promise<void> {
  const { data: listing, error: lookupError } = await db
    .from("listings")
    .select("id")
    .eq("id", listingId)
    .is("deleted_at", null)
    .maybeSingle();
  if (lookupError) {
    log.error("addFavorite lookup failed", { userId, listingId, message: lookupError.message });
    throw new ApiError("INTERNAL", "Could not save this listing. Please try again.");
  }
  if (!listing) throw ApiError.notFound("That listing");

  // Idempotent per §2.6 #36: a repeat POST is not an error.
  const { error } = await db
    .from("favorites")
    .upsert({ user_id: userId, listing_id: listingId }, { onConflict: "user_id,listing_id", ignoreDuplicates: true });

  if (error) {
    log.error("addFavorite failed", { userId, listingId, message: error.message });
    throw new ApiError("INTERNAL", "Could not save this listing. Please try again.");
  }
}

export async function removeFavorite(userId: string, listingId: string): Promise<void> {
  const { error } = await db.from("favorites").delete().eq("user_id", userId).eq("listing_id", listingId);
  if (error) {
    log.error("removeFavorite failed", { userId, listingId, message: error.message });
    throw new ApiError("INTERNAL", "Could not remove this listing. Please try again.");
  }
}

export async function listFavorites(
  userId: string,
  pagination: { limit: number; page?: number }
): Promise<{ items: Listing[]; total: number }> {
  const page = pagination.page ?? 1;
  const from = (page - 1) * pagination.limit;
  const to = from + pagination.limit - 1;

  const { data, error, count } = await db
    .from("favorites")
    .select("listing_id", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    log.error("listFavorites failed", { userId, message: error.message });
    throw new ApiError("INTERNAL", "Could not load your saved listings. Please try again.");
  }

  const ids = (data ?? []).map((r) => r.listing_id);
  const listings = await getListingsByIds(ids);
  const byId = new Map(listings.map((l) => [l.id, l]));
  // getListingsByIds drops soft-deleted rows; filter(Boolean) then restores
  // the favorites list's own recency order, which the `in()` fetch does not
  // preserve.
  const items = ids.map((id) => byId.get(id)).filter((l): l is Listing => l !== undefined);

  return { items, total: count ?? 0 };
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/server/schemas/favorites.ts src/server/services/listings.ts src/server/services/favorites.ts
git commit -m "feat: Phase 7 — favourites schema and service" -m "$(cat <<'EOF'
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Favourites routes

**Files:**
- Create: `src/app/api/me/favorites/route.ts` (GET #35, POST #36)
- Create: `src/app/api/me/favorites/[listingId]/route.ts` (DELETE #37)

**Interfaces:**
- Consumes: `addFavorite`, `removeFavorite`, `listFavorites` (Task 8); `addFavoriteSchema` (Task 8); `paginationSchema` (existing).

- [ ] **Step 1: Write both routes**

```typescript
// src/app/api/me/favorites/route.ts
import { handler, ok } from "@/server/http/respond";
import { readJson, readQuery, paginationSchema } from "@/server/http/validate";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { enforceCsrf } from "@/server/auth/csrf";
import { requireUser } from "@/server/auth/guard";
import { addFavoriteSchema } from "@/server/schemas/favorites";
import { addFavorite, listFavorites } from "@/server/services/favorites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** My saved listings, joined with live listing data (§2.6 #35). */
export const GET = handler(async (request) => {
  const user = await requireUser();
  const query = readQuery(request, paginationSchema);
  const result = await listFavorites(user.sub, query);
  return ok(result.items, {
    meta: { total: result.total, limit: query.limit, page: query.page ?? 1 },
    headers: { "Cache-Control": "no-store" },
  });
});

/** Save a listing. Idempotent (§2.6 #36). */
export const POST = handler(async (request) => {
  await enforceCsrf(request);
  const user = await requireUser();
  await enforceRateLimit("write", user.sub);

  const { listingId } = await readJson(request, addFavoriteSchema);
  await addFavorite(user.sub, listingId);

  return ok({ saved: true }, { status: 201 });
});
```

```typescript
// src/app/api/me/favorites/[listingId]/route.ts
import { handler, ok } from "@/server/http/respond";
import { uuidSchema } from "@/server/http/validate";
import { enforceRateLimit } from "@/server/http/rate-limit";
import { enforceCsrf } from "@/server/auth/csrf";
import { requireUser } from "@/server/auth/guard";
import { removeFavorite } from "@/server/services/favorites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Unsave a listing (§2.6 #37). */
export const DELETE = handler(async (request, context: { params: Promise<{ listingId: string }> }) => {
  await enforceCsrf(request);
  const user = await requireUser();
  await enforceRateLimit("write", user.sub);

  const { listingId } = await context.params;
  await removeFavorite(user.sub, uuidSchema.parse(listingId));

  return ok({ removed: true });
});
```

- [ ] **Step 2: Manual verification**

```bash
LISTING_ID=$(curl -s "http://localhost:3200/api/listings?limit=1" | python3 -c "import json,sys; print(json.load(sys.stdin)['data']['items'][0]['id'])")
curl -s -b /tmp/mb.jar -X POST http://localhost:3200/api/me/favorites -H "content-type: application/json" -H "x-csrf-token: $CSRF" -d "{\"listingId\":\"$LISTING_ID\"}"
curl -s -b /tmp/mb.jar http://localhost:3200/api/me/favorites | python3 -m json.tool
curl -s -b /tmp/mb.jar -X DELETE "http://localhost:3200/api/me/favorites/$LISTING_ID" -H "x-csrf-token: $CSRF"
curl -s -b /tmp/mb.jar http://localhost:3200/api/me/favorites | python3 -m json.tool  # expect empty
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/me/favorites/route.ts src/app/api/me/favorites/\[listingId\]/route.ts
git commit -m "feat: Phase 7 — favourites routes" -m "$(cat <<'EOF'
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Part D — Frontend

### Task 10: Rewire review UI to the real API, delete the mock reviews layer

**Files:**
- Modify: `src/components/marketplace/seller-reviews.tsx`
- Modify: `src/components/marketplace/seller-reviews.test.tsx`
- Modify: `src/components/marketplace/seller-rating-summary.tsx`
- Delete: `src/lib/mock-db/reviews.ts`
- Delete: `src/lib/mock-db/reviews.test.ts`
- Modify: `src/i18n/messages/en.json`, `src/i18n/messages/ur.json`

**Interfaces:**
- Consumes: `api` (`@/lib/api-client`), `useAuth` (`@/lib/auth/auth-context`), `useToast` (`@/components/ui/toast`).

The mock behaviour ("submit" always upserts) doesn't match the real API's semantics (one review per buyer, edit is a separate action, delete exists). The rewrite reflects that: a signed-in buyer with no review sees "Write a Review"; with an existing review sees it rendered with Edit/Delete instead of a second write form.

- [ ] **Step 1: Add new copy keys**

`src/i18n/messages/en.json`, inside the existing `"reviews"` object, add:

```json
"editReviewCta": "Edit",
"deleteReviewCta": "Delete",
"deleteConfirmTitle": "Delete this review?",
"deleteConfirmBody": "This can't be undone.",
"deleteConfirmCta": "Delete",
"cancelCta": "Cancel",
"saveCta": "Save",
"loadMoreCta": "Load more reviews"
```

Mirror the same keys into `src/i18n/messages/ur.json` under `"reviews"`, translated (check the existing Urdu strings in that block for register/tone before writing new ones — this app is RTL Urdu, not transliterated English).

- [ ] **Step 2: Rewrite `seller-reviews.tsx`**

```tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { usePathname, Link } from "@/i18n/routing";
import { useAuth } from "@/lib/auth/auth-context";
import { api, ApiClientError } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Rating } from "@/components/ui/rating";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { Seller } from "@/types";

type ReviewItem = { id: string; buyerId: string; buyerName: string; rating: number; comment: string | null; createdAt: string };

export function SellerReviews({ seller }: { seller: Seller }) {
  const t = useTranslations("reviews");
  const common = useTranslations("common");
  const { user, ready } = useAuth();
  const pathname = usePathname();
  const { show } = useToast();

  const [reviews, setReviews] = React.useState<ReviewItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showSignInPrompt, setShowSignInPrompt] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const refresh = React.useCallback(async () => {
    try {
      const items = await api.get<ReviewItem[]>(`/api/sellers/${seller.slug}/reviews?limit=24`);
      setReviews(items);
    } catch {
      // A failed reviews load shouldn't blank the rest of the storefront.
    } finally {
      setLoading(false);
    }
  }, [seller.slug]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  const isOwnStore = user?.sellerId === seller.id;
  const myReview = user ? reviews.find((r) => r.buyerId === user.id) : undefined;

  function openWriteForm() {
    if (!user) {
      setShowSignInPrompt(true);
      return;
    }
    setRating(myReview?.rating ?? 5);
    setComment(myReview?.comment ?? "");
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    try {
      if (myReview) {
        await api.patch(`/api/reviews/${myReview.id}`, { rating, comment });
      } else {
        await api.post(`/api/sellers/${seller.slug}/reviews`, { rating, comment });
      }
      setShowForm(false);
      await refresh();
      show({ title: t("title"), tone: "success" });
    } catch (err) {
      show({ title: err instanceof ApiClientError ? err.message : common("genericError"), tone: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!myReview) return;
    try {
      await api.delete(`/api/reviews/${myReview.id}`);
      setShowDeleteConfirm(false);
      await refresh();
    } catch (err) {
      show({ title: err instanceof ApiClientError ? err.message : common("genericError"), tone: "error" });
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold tracking-tight text-on-surface">{t("title")}</h2>
        {ready && user?.role !== "admin" && !isOwnStore && !myReview && (
          <Button variant="subtle" size="sm" onClick={openWriteForm}>
            {t("writeReviewCta")}
          </Button>
        )}
      </div>

      {showForm && (
        <form className="space-y-3 rounded-xl border border-surface-border bg-surface-low p-4" onSubmit={handleSubmit}>
          <Rating value={rating} editable onChange={setRating} ariaLabel={t("yourRatingAria")} />
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("commentPlaceholder")} />
          <Button type="submit" size="sm" disabled={submitting}>
            {myReview ? t("saveCta") : t("submitReviewCta")}
          </Button>
        </form>
      )}

      {!loading && reviews.length === 0 && <p className="text-sm text-on-surface-muted">{t("noReviewsYet")}</p>}

      {reviews.length > 0 && (
        <div className="space-y-3">
          {reviews.map((review) => {
            const isMine = user?.id === review.buyerId;
            return (
              <div key={review.id} className="rounded-xl border border-surface-border bg-surface p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-on-surface">{review.buyerName}</p>
                  <Rating value={review.rating} />
                </div>
                {review.comment && <p className="mt-1 text-xs text-on-surface-muted">{review.comment}</p>}
                {isMine && (
                  <div className="mt-2 flex gap-3">
                    <button type="button" onClick={openWriteForm} className="text-xs font-bold text-brand-700 hover:underline">
                      {t("editReviewCta")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-xs font-bold text-danger hover:underline"
                    >
                      {t("deleteReviewCta")}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showSignInPrompt} onOpenChange={setShowSignInPrompt} title={t("signInPromptTitle")} description={t("signInPromptBody")}>
        <div className="flex justify-end">
          <Button asChild size="sm">
            <Link href={`/sign-in?next=${encodeURIComponent(pathname ?? "/")}`}>{t("signInPromptCta")}</Link>
          </Button>
        </div>
      </Modal>

      <Modal open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm} title={t("deleteConfirmTitle")} description={t("deleteConfirmBody")}>
        <div className="flex justify-end gap-2">
          <Button variant="subtle" size="sm" onClick={() => setShowDeleteConfirm(false)}>
            {t("cancelCta")}
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete}>
            {t("deleteConfirmCta")}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
```

Before using it, confirm `Button` has a `"danger"` variant (`grep -n "variant" src/components/ui/button.tsx`) — if it doesn't, add one following the existing variant pattern in that file (a red-toned equivalent of whatever `"subtle"` does), since `CLAUDE.md` reserves `brand-800`/`brand-600` for green tones and a delete action needs a `danger`-tone control, not a repurposed brand color.

- [ ] **Step 2: Simplify `seller-rating-summary.tsx`**

The mock's `subscribeToReviewChanges` machinery is gone — the DB trigger keeps `seller.rating`/`reviewCount` live, and `SellerReviews`'s own `refresh()` (Step 1) is what needs to re-run after a write, not this component. Replace the whole file:

```tsx
import { Rating } from "@/components/ui/rating";
import type { Seller } from "@/types";

export function SellerRatingSummary({ seller }: { seller: Seller }) {
  return <Rating value={seller.rating} count={seller.reviewCount} />;
}
```

`seller-storefront.tsx` calls `router.refresh()`-equivalent naturally on next navigation since it's a Server Component page; a same-page rating bump immediately after posting a review is a nice-to-have, not required by the spec's *Done when* line — skip it rather than re-adding a subscription mechanism (YAGNI).

- [ ] **Step 3: Delete the mock reviews layer**

```bash
rm src/lib/mock-db/reviews.ts src/lib/mock-db/reviews.test.ts
grep -rn "mock-db/reviews" src  # must return nothing
```

- [ ] **Step 4: Rewrite the component test**

```tsx
// src/components/marketplace/seller-reviews.test.tsx
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithAuth, mockApi, makeUser, makeSeller } from "@tests/auth-harness";
import { SellerReviews } from "./seller-reviews";
import type { Seller } from "@/types";

const SELLER: Seller = {
  id: "s1",
  slug: "khan-solar-engineering",
  name: "Khan Solar & Engineering",
  initials: "KS",
  tehsilSlug: "dargai",
  localityLabel: "Dargai Industrial Belt",
  rating: 4.9,
  reviewCount: 142,
  verified: true,
  responseMinutes: 15,
  phone: "+923166441108",
};

describe("SellerReviews", () => {
  it("prompts sign-in when a signed-out visitor tries to write a review", async () => {
    mockApi({ "GET /api/sellers/khan-solar-engineering/reviews?limit=24": { data: [], meta: { total: 0, histogram: {} } } });
    renderWithAuth(<SellerReviews seller={SELLER} />, null);
    await userEvent.click(await screen.findByRole("button", { name: "Write a Review" }));
    expect(await screen.findByText("Sign In to Review")).toBeInTheDocument();
  });

  it("lets a signed-in customer submit a review, which then appears in the list", async () => {
    mockApi({
      "GET /api/sellers/khan-solar-engineering/reviews?limit=24": ({ callNumber }) =>
        callNumber === 1
          ? { data: [], meta: { total: 0, histogram: {} } }
          : {
              data: [{ id: "r1", buyerId: "22222222-2222-4222-8222-222222222222", buyerName: "Bilal", rating: 5, comment: "Great seller!", createdAt: "2026-09-13T00:00:00.000Z" }],
              meta: { total: 1, histogram: { 5: 1 } },
            },
      "POST /api/sellers/khan-solar-engineering/reviews": { data: { review: { id: "r1" } }, status: 201 },
    });
    renderWithAuth(<SellerReviews seller={SELLER} />, makeUser({ displayName: "Bilal" }));
    await userEvent.click(await screen.findByRole("button", { name: "Write a Review" }));
    await userEvent.type(screen.getByPlaceholderText("Share your experience with this seller..."), "Great seller!");
    await userEvent.click(screen.getByRole("button", { name: "Submit Review" }));
    expect(await screen.findByText("Bilal")).toBeInTheDocument();
    expect(await screen.findByText("Great seller!")).toBeInTheDocument();
  });

  it("hides the write-review button for the seller's own storefront", async () => {
    mockApi({ "GET /api/sellers/khan-solar-engineering/reviews?limit=24": { data: [], meta: { total: 0, histogram: {} } } });
    renderWithAuth(<SellerReviews seller={SELLER} />, makeSeller({ sellerId: "s1" }));
    await screen.findByText("Reviews");
    expect(screen.queryByRole("button", { name: "Write a Review" })).toBeNull();
  });
});
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run src/components/marketplace/seller-reviews.test.tsx`
Expected: PASS (3 tests). If `mockApi`'s function-route form (`({ callNumber }) => ...`) doesn't match the querystring your `refresh()` builds exactly, adjust the mocked key to match — `mockApi` fails loudly with the exact key it received when nothing matches, use that to fix the URL rather than guessing.

Also run: `npx vitest run src/components/marketplace/seller-storefront.test.tsx src/components/marketplace/seller-rating-summary.test.tsx` — `seller-rating-summary.test.tsx` (if it exercised the old subscription behavior) now needs deleting or trimming to just assert `<Rating value={...} count={...}/>` renders; fix per what it currently asserts.

- [ ] **Step 6: Commit**

```bash
git add src/components/marketplace/seller-reviews.tsx src/components/marketplace/seller-reviews.test.tsx \
  src/components/marketplace/seller-rating-summary.tsx src/components/marketplace/seller-rating-summary.test.tsx \
  src/i18n/messages/en.json src/i18n/messages/ur.json
git rm src/lib/mock-db/reviews.ts src/lib/mock-db/reviews.test.ts
git commit -m "feat: Phase 7 — wire reviews UI to the real API, retire mock reviews" -m "$(cat <<'EOF'
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Rewire the storefront page to the real sellers/listings endpoints

**Files:**
- Modify: `src/app/[locale]/seller/[slug]/page.tsx`
- Modify: `src/components/marketplace/seller-storefront.tsx` (render `memberSince`)
- Modify: `src/server/services/sellers.ts` (remove the `getPublicSellerBySlug` deprecated alias added in Task 5, now that its one caller is gone)

**Interfaces:**
- Consumes: `getSellerDetail`, `listPublicSellerListings` (Tasks 5, 7).

- [ ] **Step 1: Rewrite the page**

```tsx
// src/app/[locale]/seller/[slug]/page.tsx
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
```

- [ ] **Step 2: Render "member since" in the storefront header**

`src/components/marketplace/seller-storefront.tsx` — in the locality/specialty line (around line 38-41), replace the `{seller.specialty}` fragment (dead now that fixtures aren't the data source — `specialty` was always fixture-only marketing copy per its own type comment in `types/index.ts`) with member-since copy:

```tsx
<p className="text-xs text-on-surface-muted flex items-center gap-1 mt-1">
  <Icon name="location_on" size={13} />
  {seller.localityLabel}
  {seller.memberSince && (
    <>
      {" · "}
      {t("memberSince", { date: new Date(seller.memberSince).getFullYear() })}
    </>
  )}
</p>
```

Add `"memberSince": "Member since {date}"` to the `"marketplace"` block in `en.json` and its Urdu equivalent in `ur.json`.

- [ ] **Step 3: Update `seller-storefront.test.tsx`**

Its `seller` fixture doesn't set `memberSince`, so the new conditional renders nothing extra — the existing test should still pass unmodified. Run it to confirm:

Run: `npx vitest run src/components/marketplace/seller-storefront.test.tsx`
Expected: PASS. If it fails on the removed `{seller.specialty}` reference, check whether the fixture or an assertion referenced `specialty` and remove that assertion (specialty is gone from the render).

- [ ] **Step 4: Manual verification**

`npm run dev`, visit `http://localhost:3200/en/seller/<a-real-slug>` — storefront renders with live rating, listings tab shows real listings, "Member since" shows a year.

- [ ] **Step 5: Commit**

```bash
git add src/app/\[locale\]/seller/\[slug\]/page.tsx src/components/marketplace/seller-storefront.tsx \
  src/components/marketplace/seller-storefront.test.tsx src/i18n/messages/en.json src/i18n/messages/ur.json
git commit -m "feat: Phase 7 — storefront page reads the real sellers/listings endpoints" -m "$(cat <<'EOF'
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: `/sellers` directory page

**Files:**
- Create: `src/app/[locale]/sellers/page.tsx`
- Create: `src/components/marketplace/sellers-directory.tsx`
- Create: `src/components/marketplace/sellers-directory.test.tsx`
- Modify: `src/i18n/messages/en.json`, `src/i18n/messages/ur.json` (new `"sellers"` namespace)

**Interfaces:**
- Consumes: `listSellers` (Task 5), `sellersDirectoryQuerySchema` (Task 4), `SellerCard` (existing), `Pagination` (existing `src/components/ui/pagination.tsx`).

- [ ] **Step 1: Add the `"sellers"` i18n namespace**

`src/i18n/messages/en.json`, top level:

```json
"sellers": {
  "title": "Sellers Directory",
  "searchPlaceholder": "Search sellers by name...",
  "verifiedOnlyLabel": "Verified only",
  "sortRating": "Top rated",
  "sortNewest": "Newest",
  "sortListings": "Most listings",
  "emptyTitle": "No sellers match your filters",
  "emptyBody": "Try clearing a filter or searching a different name."
}
```

Mirror into `ur.json`, translated.

- [ ] **Step 2: Server page**

```tsx
// src/app/[locale]/sellers/page.tsx
import { setRequestLocale } from "next-intl/server";
import { sellersDirectoryQuerySchema } from "@/server/schemas/sellers-directory";
import { listSellers } from "@/server/services/sellers";
import { SellersDirectory } from "@/components/marketplace/sellers-directory";

export default async function SellersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const raw = await searchParams;
  const parsed = sellersDirectoryQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : sellersDirectoryQuerySchema.parse({});

  const result = await listSellers(query);

  return (
    <main className="w-full flex-1 max-w-[1360px] mx-auto px-4 py-6 sm:px-6 lg:px-8">
      <SellersDirectory query={query} result={result} />
    </main>
  );
}
```

- [ ] **Step 3: Client component**

```tsx
// src/components/marketplace/sellers-directory.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { SellerCard } from "./seller-card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import type { SellersDirectoryQuery } from "@/server/schemas/sellers-directory";
import type { Seller } from "@/types";

export function SellersDirectory({
  query,
  result,
}: {
  query: SellersDirectoryQuery;
  result: { items: Seller[]; total: number };
}) {
  const t = useTranslations("sellers");
  const common = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = React.useState(query.q ?? "");

  function pushQuery(next: Partial<SellersDirectoryQuery>) {
    const merged = { ...query, ...next, page: next.page ?? 1 };
    const params = new URLSearchParams();
    if (merged.q) params.set("q", merged.q);
    if (merged.tehsil) params.set("tehsil", merged.tehsil);
    if (merged.category) params.set("category", merged.category);
    if (merged.verifiedOnly) params.set("verifiedOnly", "true");
    if (merged.sort !== "rating") params.set("sort", merged.sort);
    if (merged.page && merged.page > 1) params.set("page", String(merged.page));
    router.push(`${pathname}?${params.toString()}`);
  }

  const pageCount = Math.max(1, Math.ceil(result.total / query.limit));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-on-surface tracking-tight">{t("title")}</h1>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && pushQuery({ q })}
          placeholder={t("searchPlaceholder")}
          className="max-w-xs"
        />
        <Checkbox
          checked={query.verifiedOnly}
          onCheckedChange={(checked) => pushQuery({ verifiedOnly: Boolean(checked) })}
          label={t("verifiedOnlyLabel")}
        />
        <Select value={query.sort} onValueChange={(sort) => pushQuery({ sort: sort as SellersDirectoryQuery["sort"] })}>
          <option value="rating">{t("sortRating")}</option>
          <option value="newest">{t("sortNewest")}</option>
          <option value="listings">{t("sortListings")}</option>
        </Select>
      </div>

      {result.items.length === 0 ? (
        <div className="rounded-xl border border-surface-border bg-surface-low p-8 text-center">
          <p className="font-bold text-on-surface">{t("emptyTitle")}</p>
          <p className="text-sm text-on-surface-muted mt-1">{t("emptyBody")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {result.items.map((seller) => (
            <SellerCard key={seller.id} seller={seller} />
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <Pagination
          page={query.page ?? 1}
          pageCount={pageCount}
          onPageChange={(page) => pushQuery({ page })}
          labels={{ previous: common("previous"), next: common("next"), page: common("page") }}
        />
      )}
    </div>
  );
}
```

Before wiring `Input`/`Checkbox`/`Select`, confirm their exact prop names (`grep -n "export function Input\|export function Checkbox\|export function Select" src/components/ui/*.tsx`) — this codebase's `ui/` components may name these props differently (e.g. `onCheckedChange` vs `onChange`); match whatever each file actually exports rather than the names guessed above. Also confirm `common("previous")`/`common("next")`/`common("page")` exist in the `"common"` i18n namespace (`Pagination` is already used somewhere in this app for listing search — find that call site with `grep -rn "<Pagination" src/components` and copy its exact `labels` values instead of re-guessing the keys).

- [ ] **Step 4: Component test**

```tsx
// src/components/marketplace/sellers-directory.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { SellersDirectory } from "./sellers-directory";
import type { Seller } from "@/types";

const SELLER: Seller = {
  id: "s1", slug: "khan-solar", name: "Khan Solar", initials: "KS",
  tehsilSlug: "batkhela", localityLabel: "Batkhela City", rating: 4.8, reviewCount: 20,
  verified: true, responseMinutes: 10, phone: "+923001234567",
};

function renderDirectory(items: Seller[] = [SELLER], total = 1) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SellersDirectory query={{ sort: "rating", limit: 24, verifiedOnly: false }} result={{ items, total }} />
    </NextIntlClientProvider>
  );
}

describe("SellersDirectory", () => {
  it("renders a seller card for each result", () => {
    renderDirectory();
    expect(screen.getByText("Khan Solar")).toBeInTheDocument();
  });

  it("shows the empty state when there are no results", () => {
    renderDirectory([], 0);
    expect(screen.getByText("No sellers match your filters")).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/components/marketplace/sellers-directory.test.tsx`
Expected: PASS. Fix any prop-name mismatches surfaced by Step 3's caveat.

- [ ] **Step 6: Manual verification**

`npm run dev`, visit `http://localhost:3200/en/sellers` — directory renders, filters update the URL and results, pagination works past 24 sellers (seed more test sellers if there aren't enough to see a second page).

- [ ] **Step 7: Commit**

```bash
git add src/app/\[locale\]/sellers/page.tsx src/components/marketplace/sellers-directory.tsx \
  src/components/marketplace/sellers-directory.test.tsx src/i18n/messages/en.json src/i18n/messages/ur.json
git commit -m "feat: Phase 7 — /sellers directory page" -m "$(cat <<'EOF'
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: Favourites UI — save button, `/account` shell, favourites + reviews pages

**Files:**
- Create: `src/components/marketplace/save-listing-button.tsx`
- Create: `src/components/marketplace/save-listing-button.test.tsx`
- Modify: `src/components/marketplace/listing-detail.tsx`
- Create: `src/app/[locale]/account/layout.tsx`
- Create: `src/app/[locale]/account/favorites/page.tsx`
- Create: `src/app/[locale]/account/reviews/page.tsx`
- Modify: `src/components/layout/site-header.tsx` (confirm/add an Account nav entry point)
- Modify: `src/i18n/messages/en.json`, `src/i18n/messages/ur.json` (new `"account"` namespace, extend `"marketplace"`)

**Interfaces:**
- Consumes: `api` (`@/lib/api-client`), `useAuth`, `useToast`; `Listing`, `Seller` types.

- [ ] **Step 1: i18n**

Add `"unsaveListing": "Remove from saved"` and `"savedCta": "Saved"` next to the existing `"saveListing": "Save listing"` key in the `"marketplace"` block (`en.json` + `ur.json`).

Add a new top-level `"account"` namespace:

```json
"account": {
  "navFavorites": "Saved Listings",
  "navReviews": "My Reviews",
  "favoritesEmptyTitle": "Nothing saved yet",
  "favoritesEmptyBody": "Tap the save icon on a listing to keep it here.",
  "reviewsEmptyTitle": "You haven't reviewed anyone yet",
  "reviewsEmptyBody": "Reviews you write for sellers show up here."
}
```

Mirror into `ur.json`.

- [ ] **Step 2: `SaveListingButton`**

```tsx
// src/components/marketplace/save-listing-button.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/auth-context";
import { api, ApiClientError } from "@/lib/api-client";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/**
 * Placed on the listing detail page next to PhoneReveal — deliberately not
 * on ListingCard (see that component's own doc comment: "no buttons on the
 * card ... no save", by design).
 */
export function SaveListingButton({ listingId, className }: { listingId: string; className?: string }) {
  const t = useTranslations("marketplace");
  const { user } = useAuth();
  const { show } = useToast();
  const [saved, setSaved] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  if (!user) return null; // signed-out visitors get no save affordance, matching SellerReviews' sign-in gate

  async function toggle() {
    setPending(true);
    const next = !saved;
    setSaved(next); // optimistic; reverted on failure below
    try {
      if (next) await api.post("/api/me/favorites", { listingId });
      else await api.delete(`/api/me/favorites/${listingId}`);
    } catch (err) {
      setSaved(!next);
      show({ title: err instanceof ApiClientError ? err.message : t("saveListing"), tone: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? t("unsaveListing") : t("saveListing")}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-3 h-9 text-xs font-bold transition-colors",
        saved ? "border-brand-600 bg-brand-50 text-brand-700" : "border-surface-border bg-surface text-on-surface hover:bg-brand-50",
        className
      )}
    >
      <Icon name="bookmark" size={16} filled={saved} />
      {saved ? t("savedCta") : t("saveListing")}
    </button>
  );
}
```

**Ruling (made during plan preflight, not left to the implementer):** this button always starts in the unsaved state, even when the listing is already in the viewer's favourites — it does not thread an `initiallySaved` prop from the (Server Component) listing detail page through `ListingDetail` down to this button. Wiring that would mean giving the detail page a per-viewer DB read on every visit and changing two components' prop signatures for a cosmetic gap (the button briefly reads "Save" instead of "Saved" until clicked once more). Not required by Phase 7's *Done when* line in `docs/backend-plan.md` §9. Ship without it; revisit only if a future phase's spec asks for it explicitly.

- [ ] **Step 3: Mount it on the listing detail page**

`src/components/marketplace/listing-detail.tsx` — add the import and place it next to `PhoneReveal` (line 69 area):

```tsx
<div className="flex items-center gap-2 mt-2">
  <PhoneReveal phone={listing.contactPhone} listingTitle={listing.title} />
  <SaveListingButton listingId={listing.id} />
</div>
```

(Remove the standalone `className="mt-2"` from `PhoneReveal` if it's now inside a flex wrapper that applies its own spacing — check the surrounding JSX before editing so the layout doesn't double up on margin.)

- [ ] **Step 4: `SaveListingButton` test**

```tsx
// src/components/marketplace/save-listing-button.test.tsx
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithAuth, mockApi, makeUser } from "@tests/auth-harness";
import { SaveListingButton } from "./save-listing-button";

describe("SaveListingButton", () => {
  it("renders nothing for a signed-out visitor", () => {
    renderWithAuth(<SaveListingButton listingId="l1" />, null);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("saves a listing on click", async () => {
    const { calls } = mockApi({ "POST /api/me/favorites": { data: { saved: true }, status: 201 } });
    renderWithAuth(<SaveListingButton listingId="l1" />, makeUser());
    await userEvent.click(screen.getByRole("button", { name: "Save listing" }));
    expect(await screen.findByRole("button", { name: "Remove from saved" })).toBeInTheDocument();
    expect(calls.some((c) => c.method === "POST" && c.path === "/api/me/favorites")).toBe(true);
  });
});
```

Run: `npx vitest run src/components/marketplace/save-listing-button.test.tsx`
Expected: PASS.

- [ ] **Step 5: `/account` layout with nav**

```tsx
// src/app/[locale]/account/layout.tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";

export default async function AccountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");

  return (
    <main className="w-full flex-1 max-w-[960px] mx-auto px-4 py-6 sm:px-6 lg:px-8">
      <nav className="flex gap-4 border-b border-surface-border mb-6 text-sm font-bold">
        <Link href="/account/favorites" className="pb-2 border-b-2 border-transparent hover:border-brand-600 text-on-surface">
          {t("navFavorites")}
        </Link>
        <Link href="/account/reviews" className="pb-2 border-b-2 border-transparent hover:border-brand-600 text-on-surface">
          {t("navReviews")}
        </Link>
      </nav>
      {children}
    </main>
  );
}
```

`middleware.ts` already gates `/account/**` behind `requireUser`-equivalent (Global Constraints note this was confirmed present: `{ prefix: "/account", role: "user" }`), so this layout doesn't need its own auth check.

- [ ] **Step 6: `/account/favorites` page**

```tsx
// src/app/[locale]/account/favorites/page.tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireFreshUser } from "@/server/auth/guard";
import { listFavorites } from "@/server/services/favorites";
import { ListingCard } from "@/components/marketplace/listing-card";

export default async function FavoritesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");

  const user = await requireFreshUser();
  const { items } = await listFavorites(user.id, { limit: 60 });

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-surface-border bg-surface-low p-8 text-center">
        <p className="font-bold text-on-surface">{t("favoritesEmptyTitle")}</p>
        <p className="text-sm text-on-surface-muted mt-1">{t("favoritesEmptyBody")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      {items.map((listing) => (
        <ListingCard key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
```

- [ ] **Step 7: `/account/reviews` page**

```tsx
// src/app/[locale]/account/reviews/page.tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { requireFreshUser } from "@/server/auth/guard";
import { listMyReviews } from "@/server/services/reviews";
import { Rating } from "@/components/ui/rating";
import { Link } from "@/i18n/routing";

export default async function MyReviewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");

  const user = await requireFreshUser();
  const { items } = await listMyReviews(user.id, { limit: 60 });

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-surface-border bg-surface-low p-8 text-center">
        <p className="font-bold text-on-surface">{t("reviewsEmptyTitle")}</p>
        <p className="text-sm text-on-surface-muted mt-1">{t("reviewsEmptyBody")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((review) => (
        <div key={review.id} className="rounded-xl border border-surface-border bg-surface p-4">
          <div className="flex items-center justify-between">
            <Link href={`/seller/${review.sellerSlug}`} className="font-bold text-brand-700 hover:underline">
              {review.sellerName}
            </Link>
            <Rating value={review.rating} />
          </div>
          {review.comment && <p className="mt-1 text-sm text-on-surface-muted">{review.comment}</p>}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 8: Confirm/wire the site-header entry point**

`grep -n "accountMenu\|/account" src/components/layout/site-header.tsx` — this repo already has an `accountMenuAria`-labelled menu (seen in Task investigation). Open it and confirm it links somewhere real for a signed-in customer; if its links currently only cover the seller dashboard and sign-out, add entries to `/account/favorites` and `/account/reviews` using the same `Link`/menu-item pattern already used for its existing entries (copy that JSX pattern exactly — don't invent a new menu primitive).

- [ ] **Step 9: Manual verification**

`npm run dev`: sign in as a customer, save a listing from its detail page, visit `/en/account/favorites` and confirm it appears; write a review on some seller's storefront, visit `/en/account/reviews` and confirm it appears and links back to that storefront.

- [ ] **Step 10: Commit**

```bash
git add src/components/marketplace/save-listing-button.tsx src/components/marketplace/save-listing-button.test.tsx \
  src/components/marketplace/listing-detail.tsx \
  src/app/\[locale\]/account/ src/components/layout/site-header.tsx \
  src/i18n/messages/en.json src/i18n/messages/ur.json
git commit -m "feat: Phase 7 — favourites UI, /account/favorites and /account/reviews" -m "$(cat <<'EOF'
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes

- **Spec coverage:** #26 (Task 6), #27 (Task 7), #28 (Task 7), #29 (Task 3), #30 (Task 6), #31–34 (Tasks 2–3), #35–37 (Tasks 8–9), `/sellers` page (Task 12), favourites UI + `/account` (Task 13), mock deletion (Task 10) — every endpoint and *Deletes* line from `docs/backend-plan.md` §9 Phase 7 has a task.
- **Deliberate omission:** the admin "moderate a review" path (part of `DELETE /api/reviews/:id`'s "U/A" column) is implemented as a bare role check, not full admin tooling with audit logging — that's explicitly Phase 8 scope per the plan's own phase boundaries, and is called out inline in Task 2.
- **Type consistency:** `Seller.memberSince` (Task 5) flows through `toPublicSeller` → `getSellerDetail`/`listSellers`/`topSellers` → `seller-storefront.tsx` (Task 11) without renaming. `ReviewItem`/`MyReviewItem` (Task 2) match what Task 3's routes return and what Task 10/13's UI consumes. `getListingsByIds`/`listPublicSellerListings` (Tasks 7–8) share one `PlainListingRow`/`plainRowToItem`/`imagesFor` trio in `listings.ts` rather than each defining their own.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-13-phase7-reviews-sellers-favorites.md`. Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
