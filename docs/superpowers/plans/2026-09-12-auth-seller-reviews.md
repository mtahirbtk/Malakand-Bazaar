# Auth, Seller Onboarding, Seller Dashboard, Buyer Reviews Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add mock (localStorage-backed) auth with phone+password login/signup, a seller-registration flow with business profile + map pin, a guarded seller dashboard for managing listings and the storefront profile, and a buyer review/rating flow on the seller storefront.

**Architecture:** No backend exists yet — everything today reads static arrays in `src/data/fixtures/`. This plan adds a `src/lib/mock-db/` layer (localStorage + a thin React `AuthProvider`) that overlays runtime-created users/sellers/listings/reviews on top of the read-only fixtures, then builds the auth screens, seller-facing forms, guarded dashboard routes, and a reviews section on the existing storefront on top of it.

**Tech Stack:** Next.js 15 App Router (TS), Tailwind, Radix-based UI kit in `src/components/ui/`, next-intl, Vitest + Testing Library, `leaflet` + `react-leaflet` (new dependency, for the map pin picker).

**Spec:** `docs/superpowers/specs/2026-09-12-auth-seller-reviews-design.md`

## Global Constraints

- No Supabase / real backend this round — everything persists to `localStorage` via `src/lib/mock-db/store.ts`. Passwords are plain-text mock values, never a real security boundary (comment this in code).
- Phone numbers: fixed `+92` prefix, normalized/validated with the existing `normalizePhone`/`formatPhoneDisplay` helpers in `src/lib/phone.ts` — do not re-implement phone parsing.
- No native form controls outside `src/components/ui/` (ESLint enforces `<select>` and `<input type="checkbox|radio|range">`; new custom primitives needed for this work — file upload — must live in `src/components/ui/`).
- No Turnstile, no OTP/email, no forgot-password flow, no admin verification UI — out of scope per `docs/decisions.md`.
- New sellers are created with `verified: false`; there is no admin flow to flip it in this round, that's expected.
- Match existing code conventions: colocated `*.test.tsx`/`*.test.ts` files, Tailwind utility classes (no new CSS files), `useTranslations`/message JSON additions in both `src/i18n/messages/en.json` and `src/i18n/messages/ur.json` for any user-facing string, `@/` path alias.
- Run `npm test` (not `npm run build`) to verify each task — never run `npm run build` while `npm run dev` is running (see `CLAUDE.md`).

---

## File Map

New:
- `src/lib/mock-db/store.ts` — localStorage read/write + id generator
- `src/lib/mock-db/sellers.ts` — seller overlay (fixtures + stored), save, slug generation
- `src/lib/mock-db/listings.ts` — listing overlay, save, status changes, slug generation
- `src/lib/mock-db/reviews.ts` — review upsert, aggregate rating recompute
- `src/lib/mock-db/auth.ts` — pure login/signupCustomer/registerSeller/logout logic
- `src/lib/mock-db/auth-context.tsx` — `AuthProvider` / `useAuth()` React wrapper
- `src/lib/mock-db/use-require-seller.ts` — dashboard route guard hook
- `src/components/ui/file-upload.tsx`, `src/components/ui/multi-file-upload.tsx` — new UI-kit primitives
- `src/components/marketplace/map-pin-picker.tsx` — Leaflet draggable-pin picker
- `src/components/auth/sign-in-form.tsx` — Sign In / Create Account tabs
- `src/components/seller/seller-profile-fields.tsx` — shared business-profile fields
- `src/components/seller/seller-registration-form.tsx` — `/sell` page form
- `src/components/seller/seller-listings-table.tsx` — dashboard listings list
- `src/components/seller/listing-form.tsx` — shared create/edit listing form
- `src/components/marketplace/client-seller-storefront.tsx`, `src/components/marketplace/client-listing-detail.tsx` — client-side fallback lookups for mock-db-only records
- `src/components/marketplace/seller-rating-summary.tsx`, `src/components/marketplace/seller-reviews.tsx` — reactive rating + reviews section
- `src/app/[locale]/sign-in/page.tsx`
- `src/app/[locale]/sell/page.tsx`
- `src/app/[locale]/seller/dashboard/layout.tsx`
- `src/app/[locale]/seller/dashboard/profile/page.tsx`
- `src/app/[locale]/seller/dashboard/listings/page.tsx`
- `src/app/[locale]/seller/dashboard/listings/new/page.tsx`
- `src/app/[locale]/seller/dashboard/listings/[id]/edit/page.tsx`

Modified:
- `src/types/index.ts` — `User`, `UserRole`, `Review` types; `ListingStatus` gains `"removed"`; `Seller` gains `description?`, `avatarUrl?`
- `src/app/[locale]/layout.tsx` — wrap with `AuthProvider`
- `src/components/layout/site-header.tsx` + `.test.tsx` — avatar menu when signed in
- `src/app/[locale]/seller/[slug]/page.tsx`, `src/components/marketplace/seller-storefront.tsx` — fallback + reviews section
- `src/app/[locale]/listing/[slug]/page.tsx` — fallback
- `src/i18n/messages/en.json`, `src/i18n/messages/ur.json` — new `auth`, `sellerDashboard`, `reviews` namespaces

---

### Task 1: Types + mock-db store

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/lib/mock-db/store.ts`
- Test: `src/lib/mock-db/store.test.ts`

**Interfaces:**
- Produces: `UserRole`, `User`, `Review` types; `ListingStatus` including `"removed"`; `Seller.description?: string`, `Seller.avatarUrl?: string`; `readStore<T>(key: StoreKey, fallback: T): T`, `writeStore<T>(key: StoreKey, value: T): void`, `makeId(prefix: string): string`, `type StoreKey = "mb.users" | "mb.sellers" | "mb.listings" | "mb.reviews" | "mb.session"`.

- [ ] **Step 1: Add the new/changed types**

In `src/types/index.ts`, change `ListingStatus` and `Seller`, and append the new types:

```ts
export type ListingStatus = "active" | "reserved" | "sold" | "removed";
```

```ts
export type Seller = {
  id: string;
  slug: string;
  name: string;
  initials: string;
  tehsilSlug: TehsilSlug;
  localityLabel: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  responseMinutes: number;
  specialty: string;
  statLabel: string;
  statValue: string;
  phone: string;
  storefrontBanner?: string;
  coordinates?: { lat: number; lng: number };
  /** Storefront bio, set at registration. Absent on the 5 seed fixtures. */
  description?: string;
  avatarUrl?: string;
};

export type UserRole = "customer" | "seller" | "admin";

export type User = {
  id: string;
  /** E.164, e.g. "+923001234567" — the login identity. */
  phone: string;
  /** Mock only: plain text, never a real security boundary. */
  password: string;
  role: UserRole;
  displayName: string;
  /** Present once role === "seller". */
  sellerId?: string;
};

export type Review = {
  id: string;
  sellerId: string;
  buyerId: string;
  buyerName: string;
  rating: number;
  comment: string;
  createdAt: string;
};
```

- [ ] **Step 2: Write the failing store test**

```ts
// src/lib/mock-db/store.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { readStore, writeStore, makeId } from "./store";

describe("mock-db store", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns the fallback when nothing is stored", () => {
    expect(readStore("mb.users", [] as unknown[])).toEqual([]);
  });

  it("round-trips a value through localStorage", () => {
    writeStore("mb.session", "user_123");
    expect(readStore("mb.session", null)).toBe("user_123");
  });

  it("returns the fallback for corrupt JSON instead of throwing", () => {
    window.localStorage.setItem("mb.session", "{not json");
    expect(readStore("mb.session", null)).toBeNull();
  });

  it("generates ids that are unique and prefixed", () => {
    const a = makeId("u");
    const b = makeId("u");
    expect(a).not.toBe(b);
    expect(a.startsWith("u_")).toBe(true);
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run src/lib/mock-db/store.test.ts`
Expected: FAIL — `./store` has no exported members (file doesn't exist yet).

- [ ] **Step 4: Implement the store**

```ts
// src/lib/mock-db/store.ts

/**
 * Thin localStorage wrapper — the only place this build touches browser
 * storage. SSR-safe (no-ops on the server); a future real backend swap
 * only needs to change this file's internals, not its callers.
 */
export type StoreKey =
  | "mb.users"
  | "mb.sellers"
  | "mb.listings"
  | "mb.reviews"
  | "mb.session";

export function readStore<T>(key: StoreKey, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStore<T>(key: StoreKey, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode / quota exceeded — mock data just won't persist.
  }
}

let idCounter = 0;

export function makeId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${idCounter}`;
}
```

- [ ] **Step 5: Run it to see it pass**

Run: `npx vitest run src/lib/mock-db/store.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add src/types/index.ts src/lib/mock-db/store.ts src/lib/mock-db/store.test.ts
git commit -m "feat: add mock-db store and auth/review types

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Seller overlay (`mock-db/sellers.ts`)

**Files:**
- Create: `src/lib/mock-db/sellers.ts`
- Test: `src/lib/mock-db/sellers.test.ts`

**Interfaces:**
- Consumes: `readStore`, `writeStore` from `./store` (Task 1); `SELLERS`, `findSeller` from `@/data/fixtures/sellers`; `Seller` type.
- Produces: `saveSeller(seller: Seller): void`, `getSellerBySlugOverlay(slug: string): Seller | undefined`, `getSellerByIdOverlay(id: string): Seller | undefined`, `generateSellerSlug(storeName: string): string`, `initialsFrom(name: string): string`, `applyProfileFields(seller: Seller, fields: ProfileFieldsPatch): Seller` (`ProfileFieldsPatch` is also defined and exported here — Task 5's `registerSeller` and Task 15's dashboard profile save both reuse it instead of re-deriving a seller's shape).

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/mock-db/sellers.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  saveSeller,
  getSellerBySlugOverlay,
  getSellerByIdOverlay,
  generateSellerSlug,
  initialsFrom,
  applyProfileFields,
} from "./sellers";
import { SELLERS } from "@/data/fixtures/sellers";
import type { Seller } from "@/types";

const NEW_SELLER: Seller = {
  id: "s_new1",
  slug: "green-valley-traders",
  name: "Green Valley Traders",
  initials: "GV",
  tehsilSlug: "batkhela",
  localityLabel: "Batkhela City & Bazaar",
  rating: 0,
  reviewCount: 0,
  verified: false,
  responseMinutes: 30,
  specialty: "General goods",
  statLabel: "Listings",
  statValue: "0",
  phone: "+923001234567",
};

describe("mock-db sellers", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("finds an existing fixture seller by slug", () => {
    expect(getSellerBySlugOverlay(SELLERS[0].slug)?.id).toBe(SELLERS[0].id);
  });

  it("returns undefined for an unknown slug", () => {
    expect(getSellerBySlugOverlay("no-such-store")).toBeUndefined();
  });

  it("saves and finds a runtime-created seller by slug and id", () => {
    saveSeller(NEW_SELLER);
    expect(getSellerBySlugOverlay("green-valley-traders")?.id).toBe("s_new1");
    expect(getSellerByIdOverlay("s_new1")?.name).toBe("Green Valley Traders");
  });

  it("updates in place on a second save with the same id", () => {
    saveSeller(NEW_SELLER);
    saveSeller({ ...NEW_SELLER, name: "Green Valley Traders Co." });
    expect(getSellerByIdOverlay("s_new1")?.name).toBe("Green Valley Traders Co.");
  });

  it("generates a unique slug, appending a number on collision", () => {
    expect(generateSellerSlug("Brand New Store")).toBe("brand-new-store");
    saveSeller({ ...NEW_SELLER, id: "s_new2", slug: "brand-new-store" });
    expect(generateSellerSlug("Brand New Store")).toBe("brand-new-store-2");
  });

  it("derives initials from a store name", () => {
    expect(initialsFrom("Green Valley Traders")).toBe("GT");
    expect(initialsFrom("Solo")).toBe("S");
  });

  it("applies a profile fields patch onto an existing seller, preserving id/slug/rating", () => {
    saveSeller(NEW_SELLER);
    const updated = applyProfileFields(NEW_SELLER, {
      storeName: "Green Valley Traders Co.",
      description: "Updated bio.",
      storePhone: "+923001112222",
      tehsilSlug: "dargai",
      localityLabel: "Dargai City Market",
      coordinates: { lat: 34.5, lng: 71.9 },
      avatarUrl: "blob:avatar",
      storefrontBanner: undefined,
    });
    expect(updated.id).toBe(NEW_SELLER.id);
    expect(updated.slug).toBe(NEW_SELLER.slug);
    expect(updated.rating).toBe(NEW_SELLER.rating);
    expect(updated.name).toBe("Green Valley Traders Co.");
    expect(updated.initials).toBe("GT");
    expect(updated.tehsilSlug).toBe("dargai");
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/lib/mock-db/sellers.test.ts`
Expected: FAIL — `./sellers` doesn't exist.

- [ ] **Step 3: Implement**

```ts
// src/lib/mock-db/sellers.ts
import { SELLERS, findSeller } from "@/data/fixtures/sellers";
import { readStore, writeStore } from "./store";
import type { Seller } from "@/types";

export type ProfileFieldsPatch = {
  storeName: string;
  description: string;
  storePhone: string;
  tehsilSlug: Seller["tehsilSlug"];
  localityLabel: string;
  coordinates: { lat: number; lng: number };
  avatarUrl?: string;
  storefrontBanner?: string;
};

export function initialsFrom(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "SL";
}

export function applyProfileFields(seller: Seller, fields: ProfileFieldsPatch): Seller {
  return {
    ...seller,
    name: fields.storeName,
    initials: initialsFrom(fields.storeName),
    description: fields.description,
    phone: fields.storePhone,
    tehsilSlug: fields.tehsilSlug,
    localityLabel: fields.localityLabel,
    coordinates: fields.coordinates,
    avatarUrl: fields.avatarUrl,
    storefrontBanner: fields.storefrontBanner,
  };
}

function getStoredSellers(): Seller[] {
  return readStore<Seller[]>("mb.sellers", []);
}

export function saveSeller(seller: Seller): void {
  const sellers = getStoredSellers();
  const index = sellers.findIndex((s) => s.id === seller.id);
  if (index === -1) sellers.push(seller);
  else sellers[index] = seller;
  writeStore("mb.sellers", sellers);
}

export function getSellerBySlugOverlay(slug: string): Seller | undefined {
  return SELLERS.find((s) => s.slug === slug) ?? getStoredSellers().find((s) => s.slug === slug);
}

export function getSellerByIdOverlay(id: string): Seller | undefined {
  return findSeller(id) ?? getStoredSellers().find((s) => s.id === id);
}

export function generateSellerSlug(storeName: string): string {
  const base =
    storeName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "store";
  const taken = new Set([...SELLERS, ...getStoredSellers()].map((s) => s.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run src/lib/mock-db/sellers.test.ts`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/mock-db/sellers.ts src/lib/mock-db/sellers.test.ts
git commit -m "feat: add seller overlay over fixture data

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Listing overlay (`mock-db/listings.ts`)

**Files:**
- Create: `src/lib/mock-db/listings.ts`
- Test: `src/lib/mock-db/listings.test.ts`

**Interfaces:**
- Consumes: `readStore`, `writeStore`, `makeId` from `./store`; `LISTINGS` from `@/data/fixtures/listings`; `Listing`, `ListingStatus` types.
- Produces: `saveListing(listing: Listing): void`, `setListingStatus(id: string, status: ListingStatus): void`, `getListingsBySellerOverlay(sellerId: string, options?: { excludeId?: string; limit?: number; status?: ListingStatus }): Listing[]`, `getListingBySlugOverlay(slug: string): Listing | undefined`, `getListingByIdOverlay(id: string): Listing | undefined`, `createListingId(): string`, `generateListingSlug(title: string): string`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/mock-db/listings.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  saveListing,
  setListingStatus,
  getListingsBySellerOverlay,
  getListingBySlugOverlay,
  getListingByIdOverlay,
  generateListingSlug,
} from "./listings";
import { LISTINGS } from "@/data/fixtures/listings";
import type { Listing } from "@/types";

const NEW_LISTING: Listing = {
  id: "l_new1",
  slug: "used-generator-5kva",
  title: "Used Generator 5kVA",
  description: "Well maintained diesel generator.",
  price: 150000,
  categorySlug: "electronics",
  subcategorySlug: "electronics-generators",
  tehsilSlug: "batkhela",
  localitySlug: "batkhela-city",
  localityLabel: "Batkhela City & Bazaar",
  images: [],
  contactPhone: "+923001234567",
  sellerId: "s_new1",
  status: "active",
  createdAt: "2026-09-12T00:00:00.000Z",
};

describe("mock-db listings", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("finds an existing fixture listing by slug", () => {
    expect(getListingBySlugOverlay(LISTINGS[0].slug)?.id).toBe(LISTINGS[0].id);
  });

  it("saves and returns a runtime-created listing for its seller", () => {
    saveListing(NEW_LISTING);
    const listings = getListingsBySellerOverlay("s_new1");
    expect(listings).toHaveLength(1);
    expect(listings[0].title).toBe("Used Generator 5kVA");
  });

  it("updates status in place", () => {
    saveListing(NEW_LISTING);
    setListingStatus("l_new1", "sold");
    expect(getListingByIdOverlay("l_new1")?.status).toBe("sold");
  });

  it("filters by status when asked", () => {
    saveListing(NEW_LISTING);
    saveListing({ ...NEW_LISTING, id: "l_new2", slug: "used-generator-2", status: "removed" });
    expect(getListingsBySellerOverlay("s_new1", { status: "active" })).toHaveLength(1);
  });

  it("generates a unique slug, appending a number on collision", () => {
    expect(generateListingSlug("Brand New Item")).toBe("brand-new-item");
    saveListing({ ...NEW_LISTING, id: "l_new3", slug: "brand-new-item" });
    expect(generateListingSlug("Brand New Item")).toBe("brand-new-item-2");
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/lib/mock-db/listings.test.ts`
Expected: FAIL — `./listings` doesn't exist.

- [ ] **Step 3: Implement**

```ts
// src/lib/mock-db/listings.ts
import { LISTINGS } from "@/data/fixtures/listings";
import { readStore, writeStore, makeId } from "./store";
import type { Listing, ListingStatus } from "@/types";

function getStoredListings(): Listing[] {
  return readStore<Listing[]>("mb.listings", []);
}

function saveAll(listings: Listing[]): void {
  writeStore("mb.listings", listings);
}

export function saveListing(listing: Listing): void {
  const listings = getStoredListings();
  const index = listings.findIndex((l) => l.id === listing.id);
  if (index === -1) listings.push(listing);
  else listings[index] = listing;
  saveAll(listings);
}

export function setListingStatus(id: string, status: ListingStatus): void {
  const listings = getStoredListings();
  const index = listings.findIndex((l) => l.id === id);
  if (index === -1) return;
  listings[index] = { ...listings[index], status };
  saveAll(listings);
}

export function getListingsBySellerOverlay(
  sellerId: string,
  options?: { excludeId?: string; limit?: number; status?: ListingStatus }
): Listing[] {
  const all = [...LISTINGS, ...getStoredListings()];
  let matches = all.filter((l) => l.sellerId === sellerId && l.id !== options?.excludeId);
  if (options?.status) matches = matches.filter((l) => l.status === options.status);
  return options?.limit ? matches.slice(0, options.limit) : matches;
}

export function getListingBySlugOverlay(slug: string): Listing | undefined {
  return LISTINGS.find((l) => l.slug === slug) ?? getStoredListings().find((l) => l.slug === slug);
}

export function getListingByIdOverlay(id: string): Listing | undefined {
  return LISTINGS.find((l) => l.id === id) ?? getStoredListings().find((l) => l.id === id);
}

export function createListingId(): string {
  return makeId("l");
}

export function generateListingSlug(title: string): string {
  const base =
    title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "listing";
  const taken = new Set([...LISTINGS, ...getStoredListings()].map((l) => l.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run src/lib/mock-db/listings.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/mock-db/listings.ts src/lib/mock-db/listings.test.ts
git commit -m "feat: add listing overlay over fixture data

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Reviews (`mock-db/reviews.ts`)

**Files:**
- Create: `src/lib/mock-db/reviews.ts`
- Test: `src/lib/mock-db/reviews.test.ts`

**Interfaces:**
- Consumes: `readStore`, `writeStore`, `makeId` from `./store`; `Review`, `Seller` types.
- Produces: `getReviewsForSeller(sellerId: string): Review[]`, `upsertReview(input: { sellerId: string; buyerId: string; buyerName: string; rating: number; comment: string }): Review`, `getSellerRatingSummary(seller: Seller): { rating: number; reviewCount: number }`, `getMyReviewForSeller(sellerId: string, buyerId: string): Review | undefined`.

Aggregate math: treat the fixture seller's `rating`/`reviewCount` as a baseline total (`rating * reviewCount` "prior points"), add stored reviews on top, so one new review nudges a seller from e.g. 4.9★ (142) to a correctly-weighted new average (143) instead of resetting to "5.0 (1)".

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/mock-db/reviews.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { getReviewsForSeller, upsertReview, getSellerRatingSummary, getMyReviewForSeller } from "./reviews";
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
  specialty: "VFD Inverters",
  statLabel: "Deals Done",
  statValue: "142 Systems",
  phone: "+923166441108",
};

describe("mock-db reviews", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns no reviews for a seller with none stored", () => {
    expect(getReviewsForSeller("s1")).toEqual([]);
  });

  it("adds a review and returns it in the list, newest first", () => {
    upsertReview({ sellerId: "s1", buyerId: "u1", buyerName: "Bilal", rating: 5, comment: "Great!" });
    const reviews = getReviewsForSeller("s1");
    expect(reviews).toHaveLength(1);
    expect(reviews[0].buyerName).toBe("Bilal");
  });

  it("replaces the same buyer's existing review instead of adding a second", () => {
    upsertReview({ sellerId: "s1", buyerId: "u1", buyerName: "Bilal", rating: 5, comment: "Great!" });
    upsertReview({ sellerId: "s1", buyerId: "u1", buyerName: "Bilal", rating: 3, comment: "Updated." });
    const reviews = getReviewsForSeller("s1");
    expect(reviews).toHaveLength(1);
    expect(reviews[0].rating).toBe(3);
  });

  it("finds a buyer's own review for a seller", () => {
    upsertReview({ sellerId: "s1", buyerId: "u1", buyerName: "Bilal", rating: 4, comment: "Good." });
    expect(getMyReviewForSeller("s1", "u1")?.rating).toBe(4);
    expect(getMyReviewForSeller("s1", "u2")).toBeUndefined();
  });

  it("blends a new review into the seed baseline rather than resetting it", () => {
    upsertReview({ sellerId: "s1", buyerId: "u1", buyerName: "Bilal", rating: 5, comment: "Great!" });
    const summary = getSellerRatingSummary(SELLER);
    expect(summary.reviewCount).toBe(143);
    // (4.9*142 + 5) / 143 ≈ 4.9007 → rounds to 4.9
    expect(summary.rating).toBeCloseTo(4.9, 1);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/lib/mock-db/reviews.test.ts`
Expected: FAIL — `./reviews` doesn't exist.

- [ ] **Step 3: Implement**

```ts
// src/lib/mock-db/reviews.ts
import { readStore, writeStore, makeId } from "./store";
import type { Review, Seller } from "@/types";

function getStoredReviews(): Review[] {
  return readStore<Review[]>("mb.reviews", []);
}

export function getReviewsForSeller(sellerId: string): Review[] {
  return getStoredReviews()
    .filter((r) => r.sellerId === sellerId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getMyReviewForSeller(sellerId: string, buyerId: string): Review | undefined {
  return getStoredReviews().find((r) => r.sellerId === sellerId && r.buyerId === buyerId);
}

export function upsertReview(input: {
  sellerId: string;
  buyerId: string;
  buyerName: string;
  rating: number;
  comment: string;
}): Review {
  const reviews = getStoredReviews();
  const index = reviews.findIndex((r) => r.sellerId === input.sellerId && r.buyerId === input.buyerId);
  const review: Review = {
    id: index === -1 ? makeId("r") : reviews[index].id,
    sellerId: input.sellerId,
    buyerId: input.buyerId,
    buyerName: input.buyerName,
    rating: input.rating,
    comment: input.comment,
    createdAt: index === -1 ? new Date().toISOString() : reviews[index].createdAt,
  };
  if (index === -1) reviews.push(review);
  else reviews[index] = review;
  writeStore("mb.reviews", reviews);
  return review;
}

/**
 * Fixture sellers ship with a seed rating/reviewCount representing reviews
 * with no backing Review rows. Treat that seed as a weighted baseline and
 * blend stored reviews into it, rather than recomputing from stored
 * reviews alone (which would make one new review read as "5.0 (1)").
 */
export function getSellerRatingSummary(seller: Seller): { rating: number; reviewCount: number } {
  const stored = getReviewsForSeller(seller.id);
  const baselineTotal = seller.rating * seller.reviewCount;
  const storedTotal = stored.reduce((sum, r) => sum + r.rating, 0);
  const reviewCount = seller.reviewCount + stored.length;
  const rating = reviewCount === 0 ? 0 : (baselineTotal + storedTotal) / reviewCount;
  return { rating: Math.round(rating * 10) / 10, reviewCount };
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run src/lib/mock-db/reviews.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/mock-db/reviews.ts src/lib/mock-db/reviews.test.ts
git commit -m "feat: add mock review store with weighted rating recompute

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: Pure auth logic (`mock-db/auth.ts`)

**Files:**
- Create: `src/lib/mock-db/auth.ts`
- Test: `src/lib/mock-db/auth.test.ts`

**Interfaces:**
- Consumes: `readStore`, `writeStore`, `makeId` from `./store`; `saveSeller`, `generateSellerSlug`, `initialsFrom` from `./sellers`; `normalizePhone` from `@/lib/phone`; `User`, `Seller` types.
- Produces: `type AuthResult = { ok: true; user: User } | { ok: false; error: string }`; `type RegisterSellerInput = { phone: string; password: string; storeName: string; description: string; storePhone: string; tehsilSlug: Seller["tehsilSlug"]; localitySlug: string; localityLabel: string; coordinates: { lat: number; lng: number }; avatarUrl?: string; storefrontBanner?: string }`; `type RegisterSellerResult = { ok: true; seller: Seller } | { ok: false; error: string }`; `getCurrentUser(): User | null`, `login(phone: string, password: string): AuthResult`, `signupCustomer(phone: string, password: string, displayName: string): AuthResult`, `registerSeller(input: RegisterSellerInput): RegisterSellerResult`, `logout(): void`.

`registerSeller` reuses the currently signed-in user when they're a customer (an "upgrade" — `input.phone`/`input.password` are ignored in that case), otherwise creates a fresh customer-then-seller account from `input.phone`/`input.password`, matching the spec's "upgrade this account" behavior on `/sell`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/mock-db/auth.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { login, signupCustomer, registerSeller, logout, getCurrentUser } from "./auth";
import { getSellerBySlugOverlay } from "./sellers";

const SELLER_INPUT = {
  phone: "3211234567",
  password: "supersecret",
  storeName: "Green Valley Traders",
  description: "Fresh produce and dry goods.",
  storePhone: "3211234567",
  tehsilSlug: "batkhela" as const,
  localitySlug: "batkhela-city",
  localityLabel: "Batkhela City & Bazaar",
  coordinates: { lat: 34.6167, lng: 71.9333 },
};

describe("mock-db auth", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("signs up a customer and starts a session", () => {
    const result = signupCustomer("3001234567", "password1", "Ayesha");
    expect(result.ok).toBe(true);
    expect(getCurrentUser()?.role).toBe("customer");
  });

  it("rejects a password under 8 characters", () => {
    const result = signupCustomer("3001234567", "short", "Ayesha");
    expect(result.ok).toBe(false);
  });

  it("rejects signing up the same phone twice", () => {
    signupCustomer("3001234567", "password1", "Ayesha");
    const second = signupCustomer("3001234567", "password2", "Ayesha Again");
    expect(second.ok).toBe(false);
  });

  it("logs in with the correct phone and password", () => {
    signupCustomer("3001234567", "password1", "Ayesha");
    logout();
    const result = login("3001234567", "password1");
    expect(result.ok).toBe(true);
    expect(getCurrentUser()?.displayName).toBe("Ayesha");
  });

  it("rejects login with the wrong password", () => {
    signupCustomer("3001234567", "password1", "Ayesha");
    logout();
    const result = login("3001234567", "wrongpass");
    expect(result.ok).toBe(false);
  });

  it("logs out and clears the session", () => {
    signupCustomer("3001234567", "password1", "Ayesha");
    logout();
    expect(getCurrentUser()).toBeNull();
  });

  it("registers a brand-new seller account", () => {
    const result = registerSeller(SELLER_INPUT);
    expect(result.ok).toBe(true);
    const user = getCurrentUser();
    expect(user?.role).toBe("seller");
    expect(getSellerBySlugOverlay("green-valley-traders")?.verified).toBe(false);
  });

  it("upgrades the currently signed-in customer to a seller", () => {
    signupCustomer("3001234567", "password1", "Ayesha");
    const result = registerSeller({ ...SELLER_INPUT, phone: "", password: "" });
    expect(result.ok).toBe(true);
    expect(getCurrentUser()?.phone).toBe("+923001234567");
    expect(getCurrentUser()?.role).toBe("seller");
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/lib/mock-db/auth.test.ts`
Expected: FAIL — `./auth` doesn't exist.

- [ ] **Step 3: Implement**

```ts
// src/lib/mock-db/auth.ts
import { readStore, writeStore, makeId } from "./store";
import { saveSeller, generateSellerSlug, initialsFrom } from "./sellers";
import { normalizePhone } from "@/lib/phone";
import type { Seller, User } from "@/types";

export type AuthResult = { ok: true; user: User } | { ok: false; error: string };

export type RegisterSellerInput = {
  /** Ignored when the caller is already signed in as a customer. */
  phone: string;
  /** Ignored when the caller is already signed in as a customer. */
  password: string;
  storeName: string;
  description: string;
  storePhone: string;
  tehsilSlug: Seller["tehsilSlug"];
  localitySlug: string;
  localityLabel: string;
  coordinates: { lat: number; lng: number };
  avatarUrl?: string;
  storefrontBanner?: string;
};

export type RegisterSellerResult = { ok: true; seller: Seller } | { ok: false; error: string };

function getUsers(): User[] {
  return readStore<User[]>("mb.users", []);
}

function saveUsers(users: User[]): void {
  writeStore("mb.users", users);
}

function getSessionUserId(): string | null {
  return readStore<string | null>("mb.session", null);
}

function setSessionUserId(id: string | null): void {
  writeStore("mb.session", id);
}

export function getCurrentUser(): User | null {
  const id = getSessionUserId();
  if (!id) return null;
  return getUsers().find((u) => u.id === id) ?? null;
}

export function login(phoneInput: string, password: string): AuthResult {
  const phone = normalizePhone(phoneInput);
  if (!phone) return { ok: false, error: "Enter a valid Pakistani mobile number." };
  const user = getUsers().find((u) => u.phone === phone);
  if (!user || user.password !== password) {
    return { ok: false, error: "Phone number or password is incorrect." };
  }
  setSessionUserId(user.id);
  return { ok: true, user };
}

export function signupCustomer(phoneInput: string, password: string, displayName: string): AuthResult {
  const phone = normalizePhone(phoneInput);
  if (!phone) return { ok: false, error: "Enter a valid Pakistani mobile number." };
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  const users = getUsers();
  if (users.some((u) => u.phone === phone)) {
    return { ok: false, error: "This phone number is already registered." };
  }
  const user: User = {
    id: makeId("u"),
    phone,
    password,
    role: "customer",
    displayName: displayName.trim() || "MalakandBazaar Customer",
  };
  saveUsers([...users, user]);
  setSessionUserId(user.id);
  return { ok: true, user };
}

export function logout(): void {
  setSessionUserId(null);
}

export function registerSeller(input: RegisterSellerInput): RegisterSellerResult {
  const current = getCurrentUser();
  let user: User;

  if (current && current.role === "customer") {
    user = current;
  } else {
    const phone = normalizePhone(input.phone);
    if (!phone) return { ok: false, error: "Enter a valid Pakistani mobile number." };
    if (input.password.length < 8) {
      return { ok: false, error: "Password must be at least 8 characters." };
    }
    const users = getUsers();
    if (users.some((u) => u.phone === phone)) {
      return { ok: false, error: "This phone number is already registered." };
    }
    user = { id: makeId("u"), phone, password: input.password, role: "customer", displayName: input.storeName };
    saveUsers([...users, user]);
  }

  if (!input.storeName.trim()) return { ok: false, error: "Store name is required." };
  const storePhone = normalizePhone(input.storePhone);
  if (!storePhone) return { ok: false, error: "Enter a valid store contact number." };

  const seller: Seller = {
    id: makeId("s"),
    slug: generateSellerSlug(input.storeName),
    name: input.storeName,
    initials: initialsFrom(input.storeName),
    tehsilSlug: input.tehsilSlug,
    localityLabel: input.localityLabel,
    rating: 0,
    reviewCount: 0,
    verified: false,
    responseMinutes: 30,
    specialty: input.description.slice(0, 60),
    statLabel: "Listings",
    statValue: "0",
    phone: storePhone,
    description: input.description,
    avatarUrl: input.avatarUrl,
    storefrontBanner: input.storefrontBanner,
    coordinates: input.coordinates,
  };
  saveSeller(seller);

  const updatedUser: User = { ...user, role: "seller", sellerId: seller.id, displayName: input.storeName };
  const users = getUsers();
  const index = users.findIndex((u) => u.id === user.id);
  if (index === -1) users.push(updatedUser);
  else users[index] = updatedUser;
  saveUsers(users);
  setSessionUserId(updatedUser.id);

  return { ok: true, seller };
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run src/lib/mock-db/auth.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/mock-db/auth.ts src/lib/mock-db/auth.test.ts
git commit -m "feat: add mock login/signup/seller-registration logic

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: `AuthProvider` / `useAuth()` + wire into layout

**Files:**
- Create: `src/lib/mock-db/auth-context.tsx`
- Test: `src/lib/mock-db/auth-context.test.tsx`
- Modify: `src/app/[locale]/layout.tsx`

**Interfaces:**
- Consumes: everything from `./auth` (Task 5): `getCurrentUser`, `login`, `signupCustomer`, `registerSeller`, `logout`, and their result types.
- Produces: `AuthProvider({ children })`, `useAuth(): { user: User | null; ready: boolean; login; signupCustomer; registerSeller; logout }`. `ready` is `false` until the first-mount localStorage read completes — later tasks (route guards) must wait for `ready` before deciding a visitor is logged out, to avoid a false redirect on the first render.

- [ ] **Step 1: Write the failing test**

```tsx
// src/lib/mock-db/auth-context.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "./auth-context";

function Probe() {
  const { user, ready, login, signupCustomer, logout } = useAuth();
  return (
    <div>
      <p data-testid="ready">{String(ready)}</p>
      <p data-testid="user">{user ? user.displayName : "none"}</p>
      <button onClick={() => signupCustomer("3001234567", "password1", "Ayesha")}>signup</button>
      <button onClick={() => login("3001234567", "password1")}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("becomes ready with no user when nothing is stored", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId("ready")).toHaveTextContent("true"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });

  it("updates the user after signup, and clears it after logout", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await userEvent.click(screen.getByText("signup"));
    expect(screen.getByTestId("user")).toHaveTextContent("Ayesha");
    await userEvent.click(screen.getByText("logout"));
    expect(screen.getByTestId("user")).toHaveTextContent("none");
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/lib/mock-db/auth-context.test.tsx`
Expected: FAIL — `./auth-context` doesn't exist.

- [ ] **Step 3: Implement**

```tsx
// src/lib/mock-db/auth-context.tsx
"use client";

import * as React from "react";
import type { User } from "@/types";
import * as authLib from "./auth";
import type { AuthResult, RegisterSellerInput, RegisterSellerResult } from "./auth";

type AuthContextValue = {
  user: User | null;
  ready: boolean;
  login: (phone: string, password: string) => AuthResult;
  signupCustomer: (phone: string, password: string, displayName: string) => AuthResult;
  registerSeller: (input: RegisterSellerInput) => RegisterSellerResult;
  logout: () => void;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setUser(authLib.getCurrentUser());
    setReady(true);
  }, []);

  const login = React.useCallback((phone: string, password: string) => {
    const result = authLib.login(phone, password);
    if (result.ok) setUser(result.user);
    return result;
  }, []);

  const signupCustomer = React.useCallback(
    (phone: string, password: string, displayName: string) => {
      const result = authLib.signupCustomer(phone, password, displayName);
      if (result.ok) setUser(result.user);
      return result;
    },
    []
  );

  const registerSeller = React.useCallback((input: RegisterSellerInput) => {
    const result = authLib.registerSeller(input);
    if (result.ok) setUser(authLib.getCurrentUser());
    return result;
  }, []);

  const logout = React.useCallback(() => {
    authLib.logout();
    setUser(null);
  }, []);

  const value = React.useMemo(
    () => ({ user, ready, login, signupCustomer, registerSeller, logout }),
    [user, ready, login, signupCustomer, registerSeller, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run src/lib/mock-db/auth-context.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 5: Wire `AuthProvider` into the locale layout**

In `src/app/[locale]/layout.tsx`, import and wrap (inside `ToastProvider`, around everything that needs `useAuth`):

```tsx
import { AuthProvider } from "@/lib/mock-db/auth-context";
```

```tsx
<ToastProvider>
  <AuthProvider>
    <AnnouncementBar />
    <SiteHeader />
    {children}
    <SiteFooter />
    <FloatingWhatsapp />
  </AuthProvider>
</ToastProvider>
```

- [ ] **Step 6: Type-check and run the full suite**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all existing tests still pass (layout itself has no test file to update).

- [ ] **Step 7: Commit**

```bash
git add src/lib/mock-db/auth-context.tsx src/lib/mock-db/auth-context.test.tsx "src/app/[locale]/layout.tsx"
git commit -m "feat: add AuthProvider/useAuth and wire it into the locale layout

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Sign-in page (`/sign-in`)

**Files:**
- Create: `src/components/auth/sign-in-form.tsx`
- Create: `src/app/[locale]/sign-in/page.tsx`
- Test: `src/components/auth/sign-in-form.test.tsx`
- Modify: `src/i18n/messages/en.json`, `src/i18n/messages/ur.json`

**Interfaces:**
- Consumes: `useAuth()` from `@/lib/mock-db/auth-context` (Task 6); `Tabs`/`TabPanel` from `@/components/ui/tabs`; `FormField`, `Input`, `Button` from `@/components/ui/*`.
- Produces: `<SignInForm />` — a self-contained client component with no props, mounted by `/sign-in/page.tsx`.

- [ ] **Step 1: Add the `auth` message namespace**

In `src/i18n/messages/en.json`, add a new top-level key (after `"home"`):

```json
"auth": {
  "pageTitle": "Sign In or Create an Account",
  "signInTab": "Sign In",
  "createAccountTab": "Create Account",
  "nameLabel": "Your Name",
  "phoneLabel": "Phone Number",
  "phonePlaceholder": "300 1234567",
  "passwordLabel": "Password",
  "passwordHint": "At least 8 characters.",
  "signInCta": "Sign In",
  "createAccountCta": "Create Account"
}
```

In `src/i18n/messages/ur.json`, add the matching Urdu block:

```json
"auth": {
  "pageTitle": "سائن ان کریں یا اکاؤنٹ بنائیں",
  "signInTab": "سائن ان",
  "createAccountTab": "اکاؤنٹ بنائیں",
  "nameLabel": "آپ کا نام",
  "phoneLabel": "فون نمبر",
  "phonePlaceholder": "300 1234567",
  "passwordLabel": "پاس ورڈ",
  "passwordHint": "کم از کم 8 حروف۔",
  "signInCta": "سائن ان",
  "createAccountCta": "اکاؤنٹ بنائیں"
}
```

- [ ] **Step 2: Write the failing test**

```tsx
// src/components/auth/sign-in-form.test.tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { AuthProvider } from "@/lib/mock-db/auth-context";
import { SignInForm } from "./sign-in-form";

// jsdom has no real Next.js App Router mounted, and useRouter()/
// useSearchParams() from next's navigation throw or return null without
// one — mock both so a successful submit's redirect doesn't crash the test.
const pushMock = vi.fn();
vi.mock("@/i18n/routing", async () => {
  const actual = await vi.importActual<typeof import("@/i18n/routing")>("@/i18n/routing");
  return { ...actual, useRouter: () => ({ push: pushMock, replace: pushMock }) };
});
vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return { ...actual, useSearchParams: () => new URLSearchParams() };
});

function renderForm() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AuthProvider>
        <SignInForm />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}

describe("SignInForm", () => {
  beforeEach(() => {
    window.localStorage.clear();
    pushMock.mockClear();
  });

  it("creates a customer account from the Create Account tab", async () => {
    renderForm();
    await userEvent.click(screen.getByRole("tab", { name: "Create Account" }));
    await userEvent.type(screen.getByLabelText("Your Name"), "Ayesha");
    await userEvent.type(screen.getByLabelText("Phone Number"), "3001234567");
    await userEvent.type(screen.getByLabelText("Password"), "password1");
    await userEvent.click(screen.getByRole("button", { name: "Create Account" }));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(pushMock).toHaveBeenCalledWith("/");
  });

  it("shows an error for an invalid sign-in", async () => {
    renderForm();
    await userEvent.type(screen.getByLabelText("Phone Number"), "3001234567");
    await userEvent.type(screen.getByLabelText("Password"), "wrongpass");
    await userEvent.click(screen.getByRole("button", { name: "Sign In" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/incorrect/i);
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run src/components/auth/sign-in-form.test.tsx`
Expected: FAIL — `./sign-in-form` doesn't exist.

- [ ] **Step 4: Implement `SignInForm`**

```tsx
// src/components/auth/sign-in-form.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/lib/mock-db/auth-context";
import { Tabs, TabPanel } from "@/components/ui/tabs";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { User } from "@/types";

export function SignInForm() {
  const t = useTranslations("auth");
  const { login, signupCustomer } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = React.useState("sign-in");

  const [signInPhone, setSignInPhone] = React.useState("");
  const [signInPassword, setSignInPassword] = React.useState("");
  const [signInError, setSignInError] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [signUpError, setSignUpError] = React.useState<string | null>(null);

  function redirectAfterAuth(loggedInUser: User) {
    const next = searchParams.get("next");
    router.push(next || (loggedInUser.role === "seller" ? "/seller/dashboard/listings" : "/"));
  }

  function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    const result = login(signInPhone, signInPassword);
    if (!result.ok) {
      setSignInError(result.error);
      return;
    }
    setSignInError(null);
    redirectAfterAuth(result.user);
  }

  function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    const result = signupCustomer(phone, password, name);
    if (!result.ok) {
      setSignUpError(result.error);
      return;
    }
    setSignUpError(null);
    redirectAfterAuth(result.user);
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <Tabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          { value: "sign-in", label: t("signInTab") },
          { value: "create-account", label: t("createAccountTab") },
        ]}
      >
        <TabPanel value="sign-in" className="pt-6">
          <form className="space-y-4" onSubmit={handleSignIn}>
            <FormField label={t("phoneLabel")} htmlFor="si-phone" required>
              <Input
                id="si-phone"
                leadingIcon="call"
                placeholder={t("phonePlaceholder")}
                value={signInPhone}
                onChange={(e) => setSignInPhone(e.target.value)}
              />
            </FormField>
            <FormField label={t("passwordLabel")} htmlFor="si-password" required>
              <Input
                id="si-password"
                type="password"
                value={signInPassword}
                onChange={(e) => setSignInPassword(e.target.value)}
              />
            </FormField>
            {signInError && (
              <p role="alert" className="text-xs font-semibold text-danger">
                {signInError}
              </p>
            )}
            <Button type="submit" className="w-full">
              {t("signInCta")}
            </Button>
          </form>
        </TabPanel>
        <TabPanel value="create-account" className="pt-6">
          <form className="space-y-4" onSubmit={handleSignUp}>
            <FormField label={t("nameLabel")} htmlFor="su-name" required>
              <Input id="su-name" value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            <FormField label={t("phoneLabel")} htmlFor="su-phone" required>
              <Input
                id="su-phone"
                leadingIcon="call"
                placeholder={t("phonePlaceholder")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </FormField>
            <FormField label={t("passwordLabel")} htmlFor="su-password" required hint={t("passwordHint")}>
              <Input id="su-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </FormField>
            {signUpError && (
              <p role="alert" className="text-xs font-semibold text-danger">
                {signUpError}
              </p>
            )}
            <Button type="submit" className="w-full">
              {t("createAccountCta")}
            </Button>
          </form>
        </TabPanel>
      </Tabs>
    </div>
  );
}
```

Note: `FormField`'s `htmlFor` labels the field visually but the `<Input>` itself needs the matching `id` (already passed above), which is what makes `getByLabelText` resolve in the test.

- [ ] **Step 5: Create the page**

```tsx
// src/app/[locale]/sign-in/page.tsx
import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";
import { SignInForm } from "@/components/auth/sign-in-form";

export default async function SignInPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("auth");

  return (
    <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="mb-6 text-center text-xl font-extrabold tracking-tight text-on-surface">
        {t("pageTitle")}
      </h1>
      <SignInForm />
    </main>
  );
}
```

- [ ] **Step 6: Run it to see it pass**

Run: `npx vitest run src/components/auth/sign-in-form.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 7: Commit**

```bash
git add src/components/auth/sign-in-form.tsx src/components/auth/sign-in-form.test.tsx \
  "src/app/[locale]/sign-in/page.tsx" src/i18n/messages/en.json src/i18n/messages/ur.json
git commit -m "feat: add sign-in/create-account page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Header avatar menu when signed in

**Files:**
- Modify: `src/components/layout/site-header.tsx`
- Modify: `src/components/layout/site-header.test.tsx`
- Modify: `src/i18n/messages/en.json`, `src/i18n/messages/ur.json`

**Interfaces:**
- Consumes: `useAuth()` (Task 6); `Avatar` from `@/components/ui/avatar`; `DropdownMenu` from `@/components/ui/dropdown-menu`; `useLocale` from `next-intl`.

- [ ] **Step 1: Add header message keys**

In `src/i18n/messages/en.json`, inside the existing `"header"` object add:

```json
"accountMenuAria": "Account menu",
"myDashboard": "My Storefront",
"logout": "Log Out"
```

In `src/i18n/messages/ur.json`, inside `"header"` add:

```json
"accountMenuAria": "اکاؤنٹ مینو",
"myDashboard": "میری دکان",
"logout": "لاگ آؤٹ"
```

- [ ] **Step 2: Update the failing test first**

Change `renderHeader()`'s wrapper in `src/components/layout/site-header.test.tsx` to include `AuthProvider`, clear storage between tests, and add two new tests:

```tsx
// src/components/layout/site-header.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { AuthProvider } from "@/lib/mock-db/auth-context";
import { SiteHeader } from "./site-header";

function renderHeader() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AuthProvider>
        <SiteHeader />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("SiteHeader", () => {
  it("renders the brand name", () => {
    renderHeader();
    expect(screen.getByRole("banner")).toHaveTextContent("MalakandBazaar");
  });

  it("uses no native select element", () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <AuthProvider>
          <SiteHeader />
        </AuthProvider>
      </NextIntlClientProvider>
    );
    expect(container.querySelector("select")).toBeNull();
  });

  it("exposes labelled search fields for desktop and mobile", () => {
    renderHeader();
    const boxes = screen.getAllByRole("searchbox", { name: /search/i });
    expect(boxes.length).toBeGreaterThanOrEqual(1);
  });

  it("shows the Become a Seller call to action when signed out", () => {
    renderHeader();
    expect(screen.getByRole("link", { name: /Become a Seller/ })).toBeInTheDocument();
  });

  it("shows the sign in link when signed out", () => {
    renderHeader();
    expect(screen.getByRole("link", { name: /Sign In/ })).toBeInTheDocument();
  });

  it("shows an account menu instead of Sign In once signed in", async () => {
    window.localStorage.setItem(
      "mb.users",
      JSON.stringify([{ id: "u1", phone: "+923001234567", password: "password1", role: "customer", displayName: "Ayesha" }])
    );
    window.localStorage.setItem("mb.session", JSON.stringify("u1"));
    renderHeader();
    expect(await screen.findByRole("button", { name: "Account menu" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Sign In/ })).toBeNull();
  });

  it("hides Become a Seller once signed in as a seller", async () => {
    window.localStorage.setItem(
      "mb.users",
      JSON.stringify([
        { id: "u2", phone: "+923001234567", password: "password1", role: "seller", displayName: "Green Valley", sellerId: "s_x" },
      ])
    );
    window.localStorage.setItem("mb.session", JSON.stringify("u2"));
    renderHeader();
    await screen.findByRole("button", { name: "Account menu" });
    expect(screen.queryByRole("link", { name: /Become a Seller/ })).toBeNull();
  });
});
```

- [ ] **Step 3: Run it to see the new tests fail**

Run: `npx vitest run src/components/layout/site-header.test.tsx`
Expected: FAIL on the 2 new tests — `useAuth` not called yet, header still always shows Sign In / Become a Seller.

- [ ] **Step 4: Update `SiteHeader`**

`SiteHeader`'s test renders it with a bare `NextIntlClientProvider` + `AuthProvider` — no real Next.js App Router is mounted, and `useRouter()` from `next/navigation` (which `@/i18n/routing`'s `useRouter` wraps) throws immediately if called without one, even if `.push()` is never invoked. Avoid it: build a locale-prefixed `href` with `useLocale()` (safe, context-optional) and let the `DropdownMenu`'s existing `href` support do the navigation, the same way `Link` already does elsewhere in this file.

In `src/components/layout/site-header.tsx`, change the `next-intl` import to also pull `useLocale`, and add:

```tsx
import { useTranslations, useLocale } from "next-intl";
import { Avatar } from "@/components/ui/avatar";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/mock-db/auth-context";
```

Inside `SiteHeader()`, add:

```tsx
const { user, logout } = useAuth();
const locale = useLocale();
```

Replace the `<div className="flex items-center gap-1.5 sm:gap-3 shrink-0">...</div>` block (the Sign In link + Become a Seller button) with:

```tsx
<div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
  {user ? (
    <DropdownMenu
      ariaLabel={t("accountMenuAria")}
      align="end"
      trigger={
        <button
          type="button"
          aria-label={t("accountMenuAria")}
          className="flex items-center gap-1.5 rounded-full p-0.5 transition-colors hover:bg-surface-low"
        >
          <Avatar initials={user.displayName.slice(0, 2).toUpperCase()} alt={user.displayName} size="sm" />
        </button>
      }
      items={[
        ...(user.role === "seller"
          ? [{ label: t("myDashboard"), icon: "storefront", href: `/${locale}/seller/dashboard/listings` }]
          : []),
        { label: t("logout"), icon: "logout", onSelect: () => logout() },
      ]}
    />
  ) : (
    <Link
      className="flex items-center gap-1.5 text-on-surface hover:text-brand-600 font-semibold text-xs px-2 py-2 transition-colors"
      href="/sign-in"
    >
      <Icon name="person" size={24} className="text-secondary" />
      <span className="hidden sm:inline">{common("signIn")}</span>
    </Link>
  )}

  {user?.role !== "seller" && (
    <Button asChild size="md" className="px-3 sm:px-4 sm:text-sm">
      <Link href="/sell" aria-label={common("becomeSeller")}>
        <Icon name="storefront" size={18} />
        <span className="hidden min-[375px]:inline">{common("becomeSeller")}</span>
        <span className="hidden md:inline-block text-[10px] bg-white/20 text-white font-semibold px-1.5 py-0.5 rounded-full ml-0.5">
          {common("free")}
        </span>
      </Link>
    </Button>
  )}
</div>
```

`DropdownMenu`'s `trigger` prop already handles the `Menu.Trigger asChild` wiring — the `aria-label` on the inner `<button>` is what `getByRole("button", { name: "Account menu" })` matches.

- [ ] **Step 5: Run it to see it pass**

Run: `npx vitest run src/components/layout/site-header.test.tsx`
Expected: PASS (7 tests)

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions elsewhere.

- [ ] **Step 7: Commit**

```bash
git add src/components/layout/site-header.tsx src/components/layout/site-header.test.tsx \
  src/i18n/messages/en.json src/i18n/messages/ur.json
git commit -m "feat: show account menu in header when signed in

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: Seller route guard (`useRequireSeller`)

**Files:**
- Create: `src/lib/mock-db/use-require-seller.ts`
- Test: `src/lib/mock-db/use-require-seller.test.tsx`

**Interfaces:**
- Consumes: `useAuth()` (Task 6); `useRouter`, `usePathname` from `@/i18n/routing`.
- Produces: `useRequireSeller(): { ready: boolean }` — `ready` is `true` only once auth has loaded AND the current user is a signed-in seller; otherwise it redirects to `/sign-in?next=<current path>` and stays `false`. Later dashboard pages/layout render nothing but a loading state until `ready` is `true`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/lib/mock-db/use-require-seller.test.tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider } from "./auth-context";
import { useRequireSeller } from "./use-require-seller";

const pushMock = vi.fn();
vi.mock("@/i18n/routing", () => ({
  useRouter: () => ({ push: pushMock, replace: pushMock }),
  usePathname: () => "/seller/dashboard/listings",
}));

function Probe() {
  const { ready } = useRequireSeller();
  return <p data-testid="ready">{String(ready)}</p>;
}

describe("useRequireSeller", () => {
  beforeEach(() => {
    window.localStorage.clear();
    pushMock.mockClear();
  });

  it("redirects to sign-in when nobody is signed in", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/sign-in?next=%2Fseller%2Fdashboard%2Flistings"));
    expect(screen.getByTestId("ready")).toHaveTextContent("false");
  });

  it("stays ready for a signed-in seller, without redirecting", async () => {
    window.localStorage.setItem(
      "mb.users",
      JSON.stringify([{ id: "u1", phone: "+923001234567", password: "password1", role: "seller", displayName: "Store", sellerId: "s1" }])
    );
    window.localStorage.setItem("mb.session", JSON.stringify("u1"));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByTestId("ready")).toHaveTextContent("true"));
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("redirects a signed-in customer (wrong role) to sign-in", async () => {
    window.localStorage.setItem(
      "mb.users",
      JSON.stringify([{ id: "u2", phone: "+923001234567", password: "password1", role: "customer", displayName: "Ayesha" }])
    );
    window.localStorage.setItem("mb.session", JSON.stringify("u2"));
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalled());
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/lib/mock-db/use-require-seller.test.tsx`
Expected: FAIL — `./use-require-seller` doesn't exist.

- [ ] **Step 3: Implement**

```ts
// src/lib/mock-db/use-require-seller.ts
"use client";

import * as React from "react";
import { useRouter, usePathname } from "@/i18n/routing";
import { useAuth } from "./auth-context";

export function useRequireSeller(): { ready: boolean } {
  const { user, ready: authReady } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isSeller = Boolean(user && user.role === "seller");

  React.useEffect(() => {
    if (!authReady) return;
    if (!isSeller) {
      router.replace(`/sign-in?next=${encodeURIComponent(pathname)}`);
    }
  }, [authReady, isSeller, router, pathname]);

  return { ready: authReady && isSeller };
}
```

- [ ] **Step 4: Run it to see it pass**

Run: `npx vitest run src/lib/mock-db/use-require-seller.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/mock-db/use-require-seller.ts src/lib/mock-db/use-require-seller.test.tsx
git commit -m "feat: add useRequireSeller dashboard route guard

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: File upload UI primitives

**Files:**
- Create: `src/components/ui/file-upload.tsx`
- Create: `src/components/ui/multi-file-upload.tsx`
- Test: `src/components/ui/file-upload.test.tsx`
- Test: `src/components/ui/multi-file-upload.test.tsx`

**Interfaces:**
- Produces: `<FileUpload label={string} previewUrl={string=} onFileSelected={(file: File) => void} onClear={() => void=} accept={string="image/*"} className={string=} />` and `<MultiFileUpload label={string} urls={string[]} onAdd={(file: File) => void} onRemove={(index: number) => void} max={number=6} className={string=} />`. Both are the required `src/components/ui/` primitives for CLAUDE.md's "no native form controls outside `src/components/ui/`" rule — later tasks (avatar/banner, listing photos) consume these instead of a raw `<input type="file">`.

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/ui/file-upload.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileUpload } from "./file-upload";

describe("FileUpload", () => {
  it("calls onFileSelected with the chosen file", async () => {
    const onFileSelected = vi.fn();
    render(<FileUpload label="Upload photo" onFileSelected={onFileSelected} />);
    const file = new File(["hello"], "avatar.png", { type: "image/png" });
    const input = screen.getByLabelText("Upload photo", { selector: "input" });
    await userEvent.upload(input, file);
    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it("shows a Remove button and calls onClear when a preview exists", async () => {
    const onClear = vi.fn();
    render(<FileUpload label="Upload photo" previewUrl="blob:preview" onFileSelected={() => {}} onClear={onClear} />);
    await userEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onClear).toHaveBeenCalled();
  });
});
```

```tsx
// src/components/ui/multi-file-upload.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MultiFileUpload } from "./multi-file-upload";

describe("MultiFileUpload", () => {
  it("calls onAdd with the chosen file", async () => {
    const onAdd = vi.fn();
    render(<MultiFileUpload label="Add photo" urls={[]} onAdd={onAdd} onRemove={() => {}} />);
    const file = new File(["hello"], "listing.png", { type: "image/png" });
    const input = screen.getByLabelText("Add photo", { selector: "input" });
    await userEvent.upload(input, file);
    expect(onAdd).toHaveBeenCalledWith(file);
  });

  it("calls onRemove with the index of the clicked photo", async () => {
    const onRemove = vi.fn();
    render(<MultiFileUpload label="Add photo" urls={["blob:a", "blob:b"]} onAdd={() => {}} onRemove={onRemove} />);
    const removeButtons = screen.getAllByRole("button", { name: "Remove photo" });
    await userEvent.click(removeButtons[1]);
    expect(onRemove).toHaveBeenCalledWith(1);
  });

  it("hides the add tile once max is reached", () => {
    render(<MultiFileUpload label="Add photo" urls={["blob:a", "blob:b"]} onAdd={() => {}} onRemove={() => {}} max={2} />);
    expect(screen.queryByLabelText("Add photo", { selector: "input" })).toBeNull();
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `npx vitest run src/components/ui/file-upload.test.tsx src/components/ui/multi-file-upload.test.tsx`
Expected: FAIL — neither component exists.

- [ ] **Step 3: Implement `FileUpload`**

```tsx
// src/components/ui/file-upload.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export function FileUpload({
  label,
  previewUrl,
  onFileSelected,
  onClear,
  accept = "image/*",
  className,
}: {
  label: string;
  previewUrl?: string;
  onFileSelected: (file: File) => void;
  onClear?: () => void;
  accept?: string;
  className?: string;
}) {
  const inputId = React.useId();
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt=""
          className="h-16 w-16 rounded-lg border border-surface-border object-cover"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-surface-border bg-surface-low">
          <Icon name="image" size={22} className="text-brand-300" />
        </div>
      )}
      <div className="flex items-center gap-2">
        <label
          htmlFor={inputId}
          className="cursor-pointer rounded-lg border border-surface-border bg-surface px-3 py-2 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-50"
        >
          {label}
        </label>
        <input
          id={inputId}
          type="file"
          accept={accept}
          aria-label={label}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelected(file);
            e.target.value = "";
          }}
        />
        {previewUrl && onClear && (
          <button type="button" onClick={onClear} className="text-xs font-bold text-danger hover:underline">
            Remove
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement `MultiFileUpload`**

```tsx
// src/components/ui/multi-file-upload.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export function MultiFileUpload({
  label,
  urls,
  onAdd,
  onRemove,
  max = 6,
  className,
}: {
  label: string;
  urls: string[];
  onAdd: (file: File) => void;
  onRemove: (index: number) => void;
  max?: number;
  className?: string;
}) {
  const inputId = React.useId();
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2">
        {urls.map((url, index) => (
          <div key={url} className="relative h-20 w-20 overflow-hidden rounded-lg border border-surface-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              aria-label="Remove photo"
              onClick={() => onRemove(index)}
              className="absolute right-0.5 top-0.5 rounded-full bg-on-surface/60 p-0.5 text-white"
            >
              <Icon name="close" size={14} />
            </button>
          </div>
        ))}
        {urls.length < max && (
          <>
            <label
              htmlFor={inputId}
              className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-surface-border bg-surface-low text-brand-600 transition-colors hover:border-brand-400"
            >
              <Icon name="add_photo_alternate" size={20} />
              <span className="text-[10px] font-bold">{label}</span>
            </label>
            <input
              id={inputId}
              type="file"
              accept="image/*"
              aria-label={label}
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onAdd(file);
                e.target.value = "";
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `npx vitest run src/components/ui/file-upload.test.tsx src/components/ui/multi-file-upload.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/file-upload.tsx src/components/ui/multi-file-upload.tsx \
  src/components/ui/file-upload.test.tsx src/components/ui/multi-file-upload.test.tsx
git commit -m "feat: add FileUpload and MultiFileUpload UI primitives

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 11: Map pin picker (`MapPinPicker`)

**Files:**
- Modify: `package.json` (add `leaflet`, `react-leaflet` dependencies)
- Create: `src/components/marketplace/map-pin-picker.tsx`
- Test: `src/components/marketplace/map-pin-picker.test.tsx`

**Interfaces:**
- Produces: `<MapPinPicker value={{ lat: number; lng: number }} onChange={(coordinates: { lat: number; lng: number }) => void} ariaLabel={string} />`. Consumers must `dynamic`-import this component with `{ ssr: false }` (Leaflet touches `window` at import time) — Task 12 does this.

The existing `LocationMap` (`src/components/marketplace/location-map.tsx`, a read-only Google `output=embed` iframe) is unrelated and untouched — an iframe can't report drag events, so it can't serve as a picker. `docs/decisions.md` already commits the stack to Leaflet + OpenStreetMap; this adds the actual dependency for this one interactive use.

jsdom can't render a real Leaflet map (no tile fetches, no canvas sizing), so the test mocks `react-leaflet` and `leaflet` — the same kind of environment workaround already used for the carousel and media-query specs (see `tests/setup.ts`).

- [ ] **Step 1: Add the dependencies**

Run: `npm install leaflet@1.9.4 react-leaflet@5.0.0`

- [ ] **Step 2: Write the failing test**

```tsx
// src/components/marketplace/map-pin-picker.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MapPinPicker } from "./map-pin-picker";

vi.mock("leaflet/dist/leaflet.css", () => ({}));
vi.mock("leaflet/dist/images/marker-icon-2x.png", () => ({ default: { src: "" } }));
vi.mock("leaflet/dist/images/marker-icon.png", () => ({ default: { src: "" } }));
vi.mock("leaflet/dist/images/marker-shadow.png", () => ({ default: { src: "" } }));
vi.mock("leaflet", () => ({ default: { icon: () => ({}) } }));
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TileLayer: () => null,
  useMapEvents: () => null,
  Marker: ({ eventHandlers }: { eventHandlers?: { dragend?: (e: unknown) => void } }) => (
    <button
      type="button"
      data-testid="marker"
      onClick={() =>
        eventHandlers?.dragend?.({ target: { getLatLng: () => ({ lat: 34.7, lng: 72.1 }) } })
      }
    />
  ),
}));

describe("MapPinPicker", () => {
  it("calls onChange with the marker's new position on drag end", async () => {
    const onChange = vi.fn();
    render(<MapPinPicker value={{ lat: 34.5, lng: 71.9 }} onChange={onChange} ariaLabel="Store location" />);
    await userEvent.click(screen.getByTestId("marker"));
    expect(onChange).toHaveBeenCalledWith({ lat: 34.7, lng: 72.1 });
  });

  it("labels the picker for assistive tech", () => {
    render(<MapPinPicker value={{ lat: 34.5, lng: 71.9 }} onChange={() => {}} ariaLabel="Store location" />);
    expect(screen.getByRole("group", { name: "Store location" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run src/components/marketplace/map-pin-picker.test.tsx`
Expected: FAIL — `./map-pin-picker` doesn't exist.

- [ ] **Step 4: Implement**

```tsx
// src/components/marketplace/map-pin-picker.tsx
"use client";

import "leaflet/dist/leaflet.css";
import * as React from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const pinIcon = L.icon({
  iconUrl: markerIcon.src,
  iconRetinaUrl: markerIcon2x.src,
  shadowUrl: markerShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function ClickToMove({ onMove }: { onMove: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMove(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function MapPinPicker({
  value,
  onChange,
  ariaLabel,
}: {
  value: { lat: number; lng: number };
  onChange: (coordinates: { lat: number; lng: number }) => void;
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="overflow-hidden rounded-xl border border-surface-border"
    >
      <MapContainer
        center={[value.lat, value.lng]}
        zoom={14}
        scrollWheelZoom={false}
        className="h-56 w-full sm:h-72"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          position={[value.lat, value.lng]}
          icon={pinIcon}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target as L.Marker;
              const { lat, lng } = marker.getLatLng();
              onChange({ lat, lng });
            },
          }}
        />
        <ClickToMove onMove={(lat, lng) => onChange({ lat, lng })} />
      </MapContainer>
    </div>
  );
}
```

- [ ] **Step 5: Run it to see it pass**

Run: `npx vitest run src/components/marketplace/map-pin-picker.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/components/marketplace/map-pin-picker.tsx \
  src/components/marketplace/map-pin-picker.test.tsx
git commit -m "feat: add Leaflet-based map pin picker

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 12: Shared seller profile fields (`SellerProfileFields`)

**Files:**
- Create: `src/components/seller/seller-profile-fields.tsx`
- Test: `src/components/seller/seller-profile-fields.test.tsx`
- Modify: `src/i18n/messages/en.json`, `src/i18n/messages/ur.json`

**Interfaces:**
- Consumes: `TEHSIL_OPTIONS`, `findTehsil` from `@/data/tehsils`; `FileUpload` (Task 10); `MapPinPicker` (Task 11), dynamic-imported here with `ssr: false`; `TehsilSlug` type.
- Produces: `type SellerProfileFieldsValue = { storeName: string; description: string; storePhone: string; tehsilSlug: TehsilSlug; localitySlug: string; coordinates: { lat: number; lng: number }; avatarUrl: string; storefrontBanner: string }`, `MALAKAND_CENTER: { lat: number; lng: number }` (default pin position — no per-locality coordinates exist in `TEHSILS`, so this is a fixed district-center default the seller drags from, not a per-locality center), `<SellerProfileFields value={SellerProfileFieldsValue} onChange={(value: SellerProfileFieldsValue) => void} />`. Tasks 13 and 15 both wrap this in their own `<form>`.

- [ ] **Step 1: Add the `sellerProfile` message namespace**

In `src/i18n/messages/en.json`, add a new top-level key:

```json
"sellerProfile": {
  "storeNameLabel": "Store Name",
  "descriptionLabel": "Store Description",
  "storePhoneLabel": "Store Contact Number",
  "storePhoneHint": "Shown to buyers — can differ from your login number.",
  "tehsilLabel": "Tehsil",
  "localityLabel": "Locality",
  "mapLabel": "Store Location",
  "mapHint": "Drag the pin, or tap the map, to set your exact location.",
  "avatarLabel": "Store Logo",
  "avatarUploadCta": "Upload Logo",
  "bannerLabel": "Storefront Banner",
  "bannerUploadCta": "Upload Banner"
}
```

In `src/i18n/messages/ur.json`, add:

```json
"sellerProfile": {
  "storeNameLabel": "دکان کا نام",
  "descriptionLabel": "دکان کی تفصیل",
  "storePhoneLabel": "دکان کا رابطہ نمبر",
  "storePhoneHint": "خریداروں کو دکھایا جائے گا — لاگ ان نمبر سے مختلف ہو سکتا ہے۔",
  "tehsilLabel": "تحصیل",
  "localityLabel": "علاقہ",
  "mapLabel": "دکان کا مقام",
  "mapHint": "پن کو گھسیٹیں یا نقشے پر ٹیپ کریں تاکہ صحیح مقام مقرر ہو۔",
  "avatarLabel": "دکان کا لوگو",
  "avatarUploadCta": "لوگو اپ لوڈ کریں",
  "bannerLabel": "دکان کا بینر",
  "bannerUploadCta": "بینر اپ لوڈ کریں"
}
```

- [ ] **Step 2: Write the failing test**

```tsx
// src/components/seller/seller-profile-fields.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { SellerProfileFields, MALAKAND_CENTER, type SellerProfileFieldsValue } from "./seller-profile-fields";

vi.mock("leaflet/dist/leaflet.css", () => ({}));
vi.mock("leaflet/dist/images/marker-icon-2x.png", () => ({ default: { src: "" } }));
vi.mock("leaflet/dist/images/marker-icon.png", () => ({ default: { src: "" } }));
vi.mock("leaflet/dist/images/marker-shadow.png", () => ({ default: { src: "" } }));
vi.mock("leaflet", () => ({ default: { icon: () => ({}) } }));
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TileLayer: () => null,
  useMapEvents: () => null,
  Marker: () => null,
}));

const BASE_VALUE: SellerProfileFieldsValue = {
  storeName: "",
  description: "",
  storePhone: "",
  tehsilSlug: "batkhela",
  localitySlug: "batkhela-city",
  coordinates: MALAKAND_CENTER,
  avatarUrl: "",
  storefrontBanner: "",
};

function Wrapper({ onChange }: { onChange: (value: SellerProfileFieldsValue) => void }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <SellerProfileFields value={BASE_VALUE} onChange={onChange} />
    </NextIntlClientProvider>
  );
}

describe("SellerProfileFields", () => {
  it("reports store name changes via onChange", async () => {
    const onChange = vi.fn();
    render(<Wrapper onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("Store Name"), "G");
    expect(onChange).toHaveBeenCalledWith({ ...BASE_VALUE, storeName: "G" });
  });

  it("resets locality when tehsil changes", async () => {
    const onChange = vi.fn();
    render(<Wrapper onChange={onChange} />);
    await userEvent.click(screen.getByRole("combobox", { name: "Tehsil" }));
    await userEvent.click(await screen.findByRole("option", { name: "Dargai" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ tehsilSlug: "dargai", localitySlug: expect.any(String) })
    );
  });

  it("renders the map picker labelled for the store location", async () => {
    render(<Wrapper onChange={() => {}} />);
    expect(await screen.findByRole("group", { name: "Store Location" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run src/components/seller/seller-profile-fields.test.tsx`
Expected: FAIL — `./seller-profile-fields` doesn't exist.

- [ ] **Step 4: Implement**

```tsx
// src/components/seller/seller-profile-fields.tsx
"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import { TEHSIL_OPTIONS, findTehsil } from "@/data/tehsils";
import type { TehsilSlug } from "@/types";

const MapPinPicker = dynamic(() => import("./../marketplace/map-pin-picker").then((m) => m.MapPinPicker), {
  ssr: false,
  loading: () => <div className="h-56 rounded-xl bg-surface-low animate-pulse sm:h-72" />,
});

export type SellerProfileFieldsValue = {
  storeName: string;
  description: string;
  storePhone: string;
  tehsilSlug: TehsilSlug;
  localitySlug: string;
  coordinates: { lat: number; lng: number };
  avatarUrl: string;
  storefrontBanner: string;
};

/** No per-locality coordinates exist in TEHSILS — this is a fixed
 * district-center default the seller drags the pin from, not a true
 * per-locality center. */
export const MALAKAND_CENTER = { lat: 34.5667, lng: 71.9333 };

export function SellerProfileFields({
  value,
  onChange,
}: {
  value: SellerProfileFieldsValue;
  onChange: (value: SellerProfileFieldsValue) => void;
}) {
  const t = useTranslations("sellerProfile");
  const localityOptions = (findTehsil(value.tehsilSlug)?.localities ?? []).map((l) => ({
    value: l.slug,
    label: l.nameEn,
  }));

  return (
    <div className="space-y-4">
      <FormField label={t("storeNameLabel")} htmlFor="sp-name" required>
        <Input id="sp-name" value={value.storeName} onChange={(e) => onChange({ ...value, storeName: e.target.value })} />
      </FormField>

      <FormField label={t("descriptionLabel")} htmlFor="sp-description" required>
        <Textarea
          id="sp-description"
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
        />
      </FormField>

      <FormField label={t("storePhoneLabel")} htmlFor="sp-phone" required hint={t("storePhoneHint")}>
        <Input
          id="sp-phone"
          leadingIcon="call"
          value={value.storePhone}
          onChange={(e) => onChange({ ...value, storePhone: e.target.value })}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("tehsilLabel")} htmlFor="sp-tehsil" required>
          <Select
            ariaLabel={t("tehsilLabel")}
            value={value.tehsilSlug}
            onValueChange={(tehsilSlug) => {
              const nextLocalities = findTehsil(tehsilSlug as TehsilSlug)?.localities ?? [];
              onChange({ ...value, tehsilSlug: tehsilSlug as TehsilSlug, localitySlug: nextLocalities[0]?.slug ?? "" });
            }}
            options={TEHSIL_OPTIONS.filter((o) => o.value !== "all")}
            className="w-full"
          />
        </FormField>
        <FormField label={t("localityLabel")} htmlFor="sp-locality" required>
          <Select
            ariaLabel={t("localityLabel")}
            value={value.localitySlug}
            onValueChange={(localitySlug) => onChange({ ...value, localitySlug })}
            options={localityOptions}
            className="w-full"
          />
        </FormField>
      </div>

      <FormField label={t("mapLabel")} hint={t("mapHint")}>
        <MapPinPicker
          value={value.coordinates}
          onChange={(coordinates) => onChange({ ...value, coordinates })}
          ariaLabel={t("mapLabel")}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("avatarLabel")}>
          <FileUpload
            label={t("avatarUploadCta")}
            previewUrl={value.avatarUrl || undefined}
            onFileSelected={(file) => onChange({ ...value, avatarUrl: URL.createObjectURL(file) })}
            onClear={() => onChange({ ...value, avatarUrl: "" })}
          />
        </FormField>
        <FormField label={t("bannerLabel")}>
          <FileUpload
            label={t("bannerUploadCta")}
            previewUrl={value.storefrontBanner || undefined}
            onFileSelected={(file) => onChange({ ...value, storefrontBanner: URL.createObjectURL(file) })}
            onClear={() => onChange({ ...value, storefrontBanner: "" })}
          />
        </FormField>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run it to see it pass**

Run: `npx vitest run src/components/seller/seller-profile-fields.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/seller/seller-profile-fields.tsx src/components/seller/seller-profile-fields.test.tsx \
  src/i18n/messages/en.json src/i18n/messages/ur.json
git commit -m "feat: add shared seller profile fields form

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 13: Seller registration page (`/sell`)

**Files:**
- Create: `src/components/seller/seller-registration-form.tsx`
- Create: `src/app/[locale]/sell/page.tsx`
- Test: `src/components/seller/seller-registration-form.test.tsx`
- Modify: `src/i18n/messages/en.json`, `src/i18n/messages/ur.json`

**Interfaces:**
- Consumes: `useAuth()` (Task 6); `SellerProfileFields`, `SellerProfileFieldsValue`, `MALAKAND_CENTER` (Task 12); `findTehsil` from `@/data/tehsils`; `EmptyState` from `@/components/ui/empty-state`.
- Produces: `<SellerRegistrationForm />` — self-contained, mounted by `/sell/page.tsx`.

- [ ] **Step 1: Add the `sellerRegistration` message namespace**

In `src/i18n/messages/en.json`:

```json
"sellerRegistration": {
  "pageTitle": "Register Your Store",
  "phoneLabel": "Phone Number",
  "passwordLabel": "Password",
  "passwordHint": "At least 8 characters.",
  "submitCta": "Create My Storefront",
  "alreadySellerTitle": "You already have a storefront",
  "alreadySellerBody": "This account is already registered as a seller.",
  "goToDashboardCta": "Go to Dashboard"
}
```

In `src/i18n/messages/ur.json`:

```json
"sellerRegistration": {
  "pageTitle": "اپنی دکان رجسٹر کریں",
  "phoneLabel": "فون نمبر",
  "passwordLabel": "پاس ورڈ",
  "passwordHint": "کم از کم 8 حروف۔",
  "submitCta": "میری دکان بنائیں",
  "alreadySellerTitle": "آپ کی دکان پہلے سے موجود ہے",
  "alreadySellerBody": "یہ اکاؤنٹ پہلے سے بطور فروخت کنندہ رجسٹرڈ ہے۔",
  "goToDashboardCta": "ڈیش بورڈ پر جائیں"
}
```

- [ ] **Step 2: Write the failing test**

```tsx
// src/components/seller/seller-registration-form.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { AuthProvider } from "@/lib/mock-db/auth-context";
import { SellerRegistrationForm } from "./seller-registration-form";

vi.mock("leaflet/dist/leaflet.css", () => ({}));
vi.mock("leaflet/dist/images/marker-icon-2x.png", () => ({ default: { src: "" } }));
vi.mock("leaflet/dist/images/marker-icon.png", () => ({ default: { src: "" } }));
vi.mock("leaflet/dist/images/marker-shadow.png", () => ({ default: { src: "" } }));
vi.mock("leaflet", () => ({ default: { icon: () => ({}) } }));
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TileLayer: () => null,
  useMapEvents: () => null,
  Marker: () => null,
}));

const pushMock = vi.fn();
vi.mock("@/i18n/routing", async () => {
  const actual = await vi.importActual<typeof import("@/i18n/routing")>("@/i18n/routing");
  return { ...actual, useRouter: () => ({ push: pushMock, replace: pushMock }) };
});

function renderForm() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AuthProvider>
        <SellerRegistrationForm />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}

async function fillCommonFields() {
  await userEvent.type(screen.getByLabelText("Store Name"), "Green Valley Traders");
  await userEvent.type(screen.getByLabelText("Store Description"), "Fresh produce and dry goods.");
  await userEvent.type(screen.getByLabelText("Store Contact Number"), "3211234567");
}

describe("SellerRegistrationForm", () => {
  beforeEach(() => {
    window.localStorage.clear();
    pushMock.mockClear();
  });

  it("shows account fields and registers a brand-new seller", async () => {
    renderForm();
    expect(screen.getByLabelText("Phone Number")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Phone Number"), "3211234567");
    await userEvent.type(screen.getByLabelText("Password"), "password1");
    await fillCommonFields();
    await userEvent.click(screen.getByRole("button", { name: "Create My Storefront" }));
    expect(pushMock).toHaveBeenCalledWith("/seller/dashboard/listings");
  });

  it("hides account fields and upgrades an already-signed-in customer", async () => {
    window.localStorage.setItem(
      "mb.users",
      JSON.stringify([{ id: "u1", phone: "+923001234567", password: "password1", role: "customer", displayName: "Ayesha" }])
    );
    window.localStorage.setItem("mb.session", JSON.stringify("u1"));
    renderForm();
    expect(await screen.findByLabelText("Store Name")).toBeInTheDocument();
    expect(screen.queryByLabelText("Phone Number")).toBeNull();
    await fillCommonFields();
    await userEvent.click(screen.getByRole("button", { name: "Create My Storefront" }));
    expect(pushMock).toHaveBeenCalledWith("/seller/dashboard/listings");
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run src/components/seller/seller-registration-form.test.tsx`
Expected: FAIL — `./seller-registration-form` doesn't exist.

- [ ] **Step 4: Implement `SellerRegistrationForm`**

```tsx
// src/components/seller/seller-registration-form.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/lib/mock-db/auth-context";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { findTehsil } from "@/data/tehsils";
import { SellerProfileFields, MALAKAND_CENTER, type SellerProfileFieldsValue } from "./seller-profile-fields";

const INITIAL_FIELDS: SellerProfileFieldsValue = {
  storeName: "",
  description: "",
  storePhone: "",
  tehsilSlug: "batkhela",
  localitySlug: "batkhela-city",
  coordinates: MALAKAND_CENTER,
  avatarUrl: "",
  storefrontBanner: "",
};

export function SellerRegistrationForm() {
  const t = useTranslations("sellerRegistration");
  const { user, registerSeller } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fields, setFields] = React.useState<SellerProfileFieldsValue>(INITIAL_FIELDS);
  const [error, setError] = React.useState<string | null>(null);

  if (user?.role === "seller") {
    return (
      <EmptyState
        icon="storefront"
        title={t("alreadySellerTitle")}
        body={t("alreadySellerBody")}
        action={<Button onClick={() => router.push("/seller/dashboard/listings")}>{t("goToDashboardCta")}</Button>}
      />
    );
  }

  const needsAccountFields = !user || user.role !== "customer";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const locality = findTehsil(fields.tehsilSlug)?.localities.find((l) => l.slug === fields.localitySlug);
    const result = registerSeller({
      phone: needsAccountFields ? phone : user!.phone,
      password: needsAccountFields ? password : "",
      storeName: fields.storeName,
      description: fields.description,
      storePhone: fields.storePhone,
      tehsilSlug: fields.tehsilSlug,
      localitySlug: fields.localitySlug,
      localityLabel: locality?.nameEn ?? "",
      coordinates: fields.coordinates,
      avatarUrl: fields.avatarUrl || undefined,
      storefrontBanner: fields.storefrontBanner || undefined,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError(null);
    router.push("/seller/dashboard/listings");
  }

  return (
    <form className="mx-auto max-w-2xl space-y-6" onSubmit={handleSubmit}>
      {needsAccountFields && (
        <div className="space-y-4 rounded-xl border border-surface-border bg-surface-low p-4">
          <FormField label={t("phoneLabel")} htmlFor="reg-phone" required>
            <Input id="reg-phone" leadingIcon="call" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </FormField>
          <FormField label={t("passwordLabel")} htmlFor="reg-password" required hint={t("passwordHint")}>
            <Input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </FormField>
        </div>
      )}

      <SellerProfileFields value={fields} onChange={setFields} />

      {error && (
        <p role="alert" className="text-xs font-semibold text-danger">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full">
        {t("submitCta")}
      </Button>
    </form>
  );
}
```

- [ ] **Step 5: Create the page**

```tsx
// src/app/[locale]/sell/page.tsx
import { setRequestLocale, getTranslations } from "next-intl/server";
import { SellerRegistrationForm } from "@/components/seller/seller-registration-form";

export default async function SellPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("sellerRegistration");

  return (
    <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="mb-6 text-center text-xl font-extrabold tracking-tight text-on-surface">{t("pageTitle")}</h1>
      <SellerRegistrationForm />
    </main>
  );
}
```

- [ ] **Step 6: Run it to see it pass**

Run: `npx vitest run src/components/seller/seller-registration-form.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 7: Commit**

```bash
git add src/components/seller/seller-registration-form.tsx src/components/seller/seller-registration-form.test.tsx \
  "src/app/[locale]/sell/page.tsx" src/i18n/messages/en.json src/i18n/messages/ur.json
git commit -m "feat: add seller registration page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 14: Seller dashboard shell (guard + tabs)

**Files:**
- Create: `src/app/[locale]/seller/dashboard/layout.tsx`
- Test: `src/app/[locale]/seller/dashboard/layout.test.tsx`
- Modify: `src/i18n/messages/en.json`, `src/i18n/messages/ur.json`

**Interfaces:**
- Consumes: `useRequireSeller()` (Task 9); `Tabs` from `@/components/ui/tabs`; `useRouter`, `usePathname` from `@/i18n/routing`.
- Produces: a client-component route layout wrapping every `seller/dashboard/*` page — renders a loading placeholder until `useRequireSeller()` reports `ready`, then a page title, the Listings/Profile tab bar, and `{children}` (the matched dashboard page).

- [ ] **Step 1: Add the `sellerDashboard` message namespace**

In `src/i18n/messages/en.json`:

```json
"sellerDashboard": {
  "title": "Seller Dashboard",
  "listingsTab": "Listings",
  "profileTab": "Profile"
}
```

In `src/i18n/messages/ur.json`:

```json
"sellerDashboard": {
  "title": "فروخت کنندہ ڈیش بورڈ",
  "listingsTab": "اشیاء",
  "profileTab": "پروفائل"
}
```

- [ ] **Step 2: Write the failing test**

```tsx
// src/app/[locale]/seller/dashboard/layout.test.tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { AuthProvider } from "@/lib/mock-db/auth-context";
import SellerDashboardLayout from "./layout";

const pushMock = vi.fn();
vi.mock("@/i18n/routing", async () => {
  const actual = await vi.importActual<typeof import("@/i18n/routing")>("@/i18n/routing");
  return {
    ...actual,
    useRouter: () => ({ push: pushMock, replace: pushMock }),
    usePathname: () => "/seller/dashboard/listings",
  };
});

function seedSeller() {
  window.localStorage.setItem(
    "mb.users",
    JSON.stringify([
      { id: "u1", phone: "+923001234567", password: "password1", role: "seller", displayName: "Green Valley", sellerId: "s1" },
    ])
  );
  window.localStorage.setItem("mb.session", JSON.stringify("u1"));
}

function renderLayout() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AuthProvider>
        <SellerDashboardLayout>
          <p>Route content</p>
        </SellerDashboardLayout>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}

describe("SellerDashboardLayout", () => {
  beforeEach(() => {
    window.localStorage.clear();
    pushMock.mockClear();
  });

  it("renders the tabs and route content once a seller is signed in", async () => {
    seedSeller();
    renderLayout();
    await waitFor(() => expect(screen.getByText("Route content")).toBeInTheDocument());
    expect(screen.getByRole("tab", { name: /Listings/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Profile/ })).toBeInTheDocument();
  });

  it("shows a loading state instead of route content when signed out", () => {
    renderLayout();
    expect(screen.queryByText("Route content")).toBeNull();
    expect(pushMock).toHaveBeenCalledWith(expect.stringContaining("/sign-in"));
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run "src/app/[locale]/seller/dashboard/layout.test.tsx"`
Expected: FAIL — `./layout` doesn't exist under `seller/dashboard`.

- [ ] **Step 4: Implement**

```tsx
// src/app/[locale]/seller/dashboard/layout.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { useRequireSeller } from "@/lib/mock-db/use-require-seller";
import { Tabs } from "@/components/ui/tabs";

export default function SellerDashboardLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations("sellerDashboard");
  const { ready } = useRequireSeller();
  const pathname = usePathname();
  const router = useRouter();

  if (!ready) {
    return (
      <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="h-40 animate-pulse rounded-xl bg-surface-low" />
      </main>
    );
  }

  const activeTab = pathname?.includes("/profile") ? "profile" : "listings";

  return (
    <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <h1 className="text-xl font-extrabold tracking-tight text-on-surface">{t("title")}</h1>
      <Tabs
        value={activeTab}
        onValueChange={(value) => router.push(`/seller/dashboard/${value}`)}
        tabs={[
          { value: "listings", label: t("listingsTab"), icon: "storefront" },
          { value: "profile", label: t("profileTab"), icon: "person" },
        ]}
      />
      {children}
    </main>
  );
}
```

- [ ] **Step 5: Run it to see it pass**

Run: `npx vitest run "src/app/[locale]/seller/dashboard/layout.test.tsx"`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add "src/app/[locale]/seller/dashboard/layout.tsx" "src/app/[locale]/seller/dashboard/layout.test.tsx" \
  src/i18n/messages/en.json src/i18n/messages/ur.json
git commit -m "feat: add guarded seller dashboard shell with tabs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 15: Dashboard profile page (edit)

**Files:**
- Create: `src/app/[locale]/seller/dashboard/profile/page.tsx`
- Create: `src/components/seller/seller-profile-edit-form.tsx`
- Test: `src/components/seller/seller-profile-edit-form.test.tsx`
- Modify: `src/i18n/messages/en.json`, `src/i18n/messages/ur.json`

**Interfaces:**
- Consumes: `useAuth()` (Task 6); `getSellerByIdOverlay`, `applyProfileFields`, `saveSeller` from `@/lib/mock-db/sellers` (Tasks 2 & this task's addition); `SellerProfileFields`, `SellerProfileFieldsValue` (Task 12); `Badge` from `@/components/ui/badge`; `findTehsil` from `@/data/tehsils`.
- Produces: `<SellerProfileEditForm />` — reads the signed-in seller's own record, shows a Pending/Verified badge, edits in place via `applyProfileFields` + `saveSeller`.

- [ ] **Step 1: Add the `sellerProfileEdit` message namespace**

In `src/i18n/messages/en.json`:

```json
"sellerProfileEdit": {
  "pending": "Pending Verification",
  "verified": "Verified",
  "saveCta": "Save Changes",
  "savedMessage": "Storefront updated."
}
```

In `src/i18n/messages/ur.json`:

```json
"sellerProfileEdit": {
  "pending": "توثیق زیر التوا",
  "verified": "تصدیق شدہ",
  "saveCta": "تبدیلیاں محفوظ کریں",
  "savedMessage": "دکان اپ ڈیٹ ہو گئی۔"
}
```

- [ ] **Step 2: Write the failing test**

```tsx
// src/components/seller/seller-profile-edit-form.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { AuthProvider } from "@/lib/mock-db/auth-context";
import { saveSeller } from "@/lib/mock-db/sellers";
import { SellerProfileEditForm } from "./seller-profile-edit-form";
import type { Seller } from "@/types";

vi.mock("leaflet/dist/leaflet.css", () => ({}));
vi.mock("leaflet/dist/images/marker-icon-2x.png", () => ({ default: { src: "" } }));
vi.mock("leaflet/dist/images/marker-icon.png", () => ({ default: { src: "" } }));
vi.mock("leaflet/dist/images/marker-shadow.png", () => ({ default: { src: "" } }));
vi.mock("leaflet", () => ({ default: { icon: () => ({}) } }));
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TileLayer: () => null,
  useMapEvents: () => null,
  Marker: () => null,
}));

const SELLER: Seller = {
  id: "s_edit1",
  slug: "edit-store",
  name: "Edit Store",
  initials: "ES",
  tehsilSlug: "batkhela",
  localityLabel: "Batkhela City & Bazaar",
  rating: 0,
  reviewCount: 0,
  verified: false,
  responseMinutes: 30,
  specialty: "General goods",
  statLabel: "Listings",
  statValue: "0",
  phone: "+923001234567",
  description: "Original bio.",
};

function seedSignedInSeller() {
  saveSeller(SELLER);
  window.localStorage.setItem(
    "mb.users",
    JSON.stringify([{ id: "u1", phone: "+923001234567", password: "password1", role: "seller", displayName: "Edit Store", sellerId: "s_edit1" }])
  );
  window.localStorage.setItem("mb.session", JSON.stringify("u1"));
}

function renderForm() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AuthProvider>
        <SellerProfileEditForm />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}

describe("SellerProfileEditForm", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows a Pending Verification badge for an unverified seller", async () => {
    seedSignedInSeller();
    renderForm();
    expect(await screen.findByText("Pending Verification")).toBeInTheDocument();
  });

  it("saves an edited store name back to the seller record", async () => {
    seedSignedInSeller();
    renderForm();
    const nameInput = await screen.findByDisplayValue("Edit Store");
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "Renamed Store");
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(await screen.findByText("Storefront updated.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run src/components/seller/seller-profile-edit-form.test.tsx`
Expected: FAIL — `./seller-profile-edit-form` doesn't exist.

- [ ] **Step 4: Implement**

```tsx
// src/components/seller/seller-profile-edit-form.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/mock-db/auth-context";
import { getSellerByIdOverlay, applyProfileFields, saveSeller } from "@/lib/mock-db/sellers";
import { findTehsil } from "@/data/tehsils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SellerProfileFields, type SellerProfileFieldsValue } from "./seller-profile-fields";
import type { Seller } from "@/types";

function toFieldsValue(seller: Seller): SellerProfileFieldsValue {
  const tehsil = findTehsil(seller.tehsilSlug);
  const locality = tehsil?.localities.find((l) => l.nameEn === seller.localityLabel);
  return {
    storeName: seller.name,
    description: seller.description ?? "",
    storePhone: seller.phone,
    tehsilSlug: seller.tehsilSlug,
    localitySlug: locality?.slug ?? tehsil?.localities[0]?.slug ?? "",
    coordinates: seller.coordinates ?? { lat: 34.5667, lng: 71.9333 },
    avatarUrl: seller.avatarUrl ?? "",
    storefrontBanner: seller.storefrontBanner ?? "",
  };
}

export function SellerProfileEditForm() {
  const t = useTranslations("sellerProfileEdit");
  const { user } = useAuth();
  const [seller, setSeller] = React.useState<Seller | null>(null);
  const [fields, setFields] = React.useState<SellerProfileFieldsValue | null>(null);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    if (!user?.sellerId) return;
    const found = getSellerByIdOverlay(user.sellerId);
    if (found) {
      setSeller(found);
      setFields(toFieldsValue(found));
    }
  }, [user?.sellerId]);

  if (!seller || !fields) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!seller || !fields) return;
    const locality = findTehsil(fields.tehsilSlug)?.localities.find((l) => l.slug === fields.localitySlug);
    const updated = applyProfileFields(seller, {
      storeName: fields.storeName,
      description: fields.description,
      storePhone: fields.storePhone,
      tehsilSlug: fields.tehsilSlug,
      localityLabel: locality?.nameEn ?? seller.localityLabel,
      coordinates: fields.coordinates,
      avatarUrl: fields.avatarUrl || undefined,
      storefrontBanner: fields.storefrontBanner || undefined,
    });
    saveSeller(updated);
    setSeller(updated);
    setSaved(true);
  }

  return (
    <form className="max-w-2xl space-y-6" onSubmit={handleSubmit}>
      <Badge tone={seller.verified ? "green" : "sand"} icon={seller.verified ? "check_circle" : "hourglass_empty"}>
        {seller.verified ? t("verified") : t("pending")}
      </Badge>

      <SellerProfileFields value={fields} onChange={setFields} />

      {saved && <p className="text-xs font-semibold text-brand-700">{t("savedMessage")}</p>}

      <Button type="submit" size="lg">
        {t("saveCta")}
      </Button>
    </form>
  );
}
```

- [ ] **Step 5: Create the page**

```tsx
// src/app/[locale]/seller/dashboard/profile/page.tsx
import { SellerProfileEditForm } from "@/components/seller/seller-profile-edit-form";

export default function SellerDashboardProfilePage() {
  return <SellerProfileEditForm />;
}
```

Note: this page renders inside `seller/dashboard/layout.tsx` (Task 14), which already guards on `useRequireSeller()` before rendering `{children}` — this page itself needs no additional guard.

- [ ] **Step 6: Run it to see it pass**

Run: `npx vitest run src/components/seller/seller-profile-edit-form.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 7: Commit**

```bash
git add src/components/seller/seller-profile-edit-form.tsx src/components/seller/seller-profile-edit-form.test.tsx \
  "src/app/[locale]/seller/dashboard/profile/page.tsx" src/i18n/messages/en.json src/i18n/messages/ur.json
git commit -m "feat: add seller dashboard profile edit page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 16: Seller listings table + dashboard listings page

**Files:**
- Create: `src/components/seller/seller-listings-table.tsx`
- Create: `src/app/[locale]/seller/dashboard/listings/page.tsx`
- Test: `src/components/seller/seller-listings-table.test.tsx`
- Modify: `src/i18n/messages/en.json`, `src/i18n/messages/ur.json`

**Interfaces:**
- Consumes: `useAuth()` (Task 6); `getListingsBySellerOverlay`, `setListingStatus` (Task 3); `Link` from `@/i18n/routing`; `Badge`, `Button`, `Tabs`, `EmptyState`, `Price` from `@/components/ui/*`.
- Produces: `<SellerListingsTable />` — status-filtered list of the signed-in seller's own listings with Edit / Mark Reserved / Mark Sold / Remove actions and an "Add Listing" button.

- [ ] **Step 1: Add the `sellerListings` message namespace**

In `src/i18n/messages/en.json`:

```json
"sellerListings": {
  "activeTab": "Active",
  "reservedTab": "Reserved",
  "soldTab": "Sold",
  "removedTab": "Removed",
  "addListingCta": "Add Listing",
  "emptyTitle": "Nothing here yet",
  "emptyBody": "Listings in this status will show up here.",
  "editCta": "Edit",
  "markReservedCta": "Mark Reserved",
  "markSoldCta": "Mark Sold",
  "removeCta": "Remove"
}
```

In `src/i18n/messages/ur.json`:

```json
"sellerListings": {
  "activeTab": "فعال",
  "reservedTab": "محفوظ شدہ",
  "soldTab": "فروخت شدہ",
  "removedTab": "ہٹائی گئیں",
  "addListingCta": "اشتہار شامل کریں",
  "emptyTitle": "ابھی کچھ نہیں",
  "emptyBody": "اس حالت میں موجود اشیاء یہاں دکھائی دیں گی۔",
  "editCta": "ترمیم کریں",
  "markReservedCta": "محفوظ کریں",
  "markSoldCta": "فروخت شدہ کریں",
  "removeCta": "ہٹا دیں"
}
```

- [ ] **Step 2: Write the failing test**

```tsx
// src/components/seller/seller-listings-table.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { AuthProvider } from "@/lib/mock-db/auth-context";
import { saveListing } from "@/lib/mock-db/listings";
import { SellerListingsTable } from "./seller-listings-table";
import type { Listing } from "@/types";

function seedSignedInSeller() {
  window.localStorage.setItem(
    "mb.users",
    JSON.stringify([{ id: "u1", phone: "+923001234567", password: "password1", role: "seller", displayName: "Store", sellerId: "s1" }])
  );
  window.localStorage.setItem("mb.session", JSON.stringify("u1"));
}

const LISTING: Listing = {
  id: "l1",
  slug: "test-listing",
  title: "Test Listing",
  description: "A listing.",
  price: 1000,
  categorySlug: "electronics",
  subcategorySlug: "electronics-generators",
  tehsilSlug: "batkhela",
  localitySlug: "batkhela-city",
  localityLabel: "Batkhela City & Bazaar",
  images: [],
  contactPhone: "+923001234567",
  sellerId: "s1",
  status: "active",
  createdAt: "2026-09-12T00:00:00.000Z",
};

function renderTable() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AuthProvider>
        <SellerListingsTable />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}

describe("SellerListingsTable", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the seller's active listings by default", async () => {
    seedSignedInSeller();
    saveListing(LISTING);
    renderTable();
    expect(await screen.findByText("Test Listing")).toBeInTheDocument();
  });

  it("shows an empty state on a tab with no listings", async () => {
    seedSignedInSeller();
    saveListing(LISTING);
    renderTable();
    await userEvent.click(await screen.findByRole("tab", { name: "Sold" }));
    expect(await screen.findByText("Nothing here yet")).toBeInTheDocument();
  });

  it("moves a listing to the Sold tab after Mark Sold", async () => {
    seedSignedInSeller();
    saveListing(LISTING);
    renderTable();
    await userEvent.click(await screen.findByRole("button", { name: "Mark Sold" }));
    expect(screen.queryByText("Test Listing")).toBeNull();
    await userEvent.click(screen.getByRole("tab", { name: "Sold" }));
    expect(await screen.findByText("Test Listing")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run src/components/seller/seller-listings-table.test.tsx`
Expected: FAIL — `./seller-listings-table` doesn't exist.

- [ ] **Step 4: Implement**

```tsx
// src/components/seller/seller-listings-table.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { useAuth } from "@/lib/mock-db/auth-context";
import { getListingsBySellerOverlay, setListingStatus } from "@/lib/mock-db/listings";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Price } from "@/components/ui/price";
import type { Listing, ListingStatus, BadgeTone } from "@/types";

const STATUS_TONE: Record<ListingStatus, BadgeTone> = {
  active: "green",
  reserved: "sand",
  sold: "neutral",
  removed: "danger",
};

export function SellerListingsTable() {
  const t = useTranslations("sellerListings");
  const { user } = useAuth();
  const [listings, setListings] = React.useState<Listing[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<ListingStatus>("active");

  const refresh = React.useCallback(() => {
    if (!user?.sellerId) return;
    setListings(getListingsBySellerOverlay(user.sellerId));
  }, [user?.sellerId]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const visible = listings.filter((l) => l.status === statusFilter);

  function handleStatusChange(id: string, status: ListingStatus) {
    setListingStatus(id, status);
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as ListingStatus)}
          tabs={[
            { value: "active", label: t("activeTab") },
            { value: "reserved", label: t("reservedTab") },
            { value: "sold", label: t("soldTab") },
            { value: "removed", label: t("removedTab") },
          ]}
        />
        <Button asChild size="md">
          <Link href="/seller/dashboard/listings/new">{t("addListingCta")}</Link>
        </Button>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon="inventory_2" title={t("emptyTitle")} body={t("emptyBody")} />
      ) : (
        <div className="space-y-2">
          {visible.map((listing) => (
            <div
              key={listing.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-surface-border bg-surface p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-on-surface">{listing.title}</p>
                <div className="mt-1 flex items-center gap-2">
                  <Price value={listing.price} size="sm" />
                  <Badge tone={STATUS_TONE[listing.status]}>{listing.status}</Badge>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button asChild variant="subtle" size="sm">
                  <Link href={`/seller/dashboard/listings/${listing.id}/edit`}>{t("editCta")}</Link>
                </Button>
                {listing.status !== "reserved" && (
                  <Button variant="subtle" size="sm" onClick={() => handleStatusChange(listing.id, "reserved")}>
                    {t("markReservedCta")}
                  </Button>
                )}
                {listing.status !== "sold" && (
                  <Button variant="subtle" size="sm" onClick={() => handleStatusChange(listing.id, "sold")}>
                    {t("markSoldCta")}
                  </Button>
                )}
                {listing.status !== "removed" && (
                  <Button variant="ghost" size="sm" onClick={() => handleStatusChange(listing.id, "removed")}>
                    {t("removeCta")}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

Note: `BadgeTone` is already exported from `src/types/index.ts` (used by `Listing.badge`) — reused here rather than redefining the tone union.

- [ ] **Step 5: Create the page**

```tsx
// src/app/[locale]/seller/dashboard/listings/page.tsx
import { SellerListingsTable } from "@/components/seller/seller-listings-table";

export default function SellerDashboardListingsPage() {
  return <SellerListingsTable />;
}
```

- [ ] **Step 6: Run it to see it pass**

Run: `npx vitest run src/components/seller/seller-listings-table.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 7: Commit**

```bash
git add src/components/seller/seller-listings-table.tsx src/components/seller/seller-listings-table.test.tsx \
  "src/app/[locale]/seller/dashboard/listings/page.tsx" src/i18n/messages/en.json src/i18n/messages/ur.json
git commit -m "feat: add seller dashboard listings table

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 17: Shared listing form (`ListingForm`)

**Files:**
- Create: `src/components/seller/listing-form.tsx`
- Test: `src/components/seller/listing-form.test.tsx`
- Modify: `src/i18n/messages/en.json`, `src/i18n/messages/ur.json`

**Interfaces:**
- Consumes: `CATEGORY_OPTIONS`, `findCategory` from `@/data/categories`; `TEHSIL_OPTIONS`, `findTehsil` from `@/data/tehsils`; `MultiFileUpload` (Task 10); `TehsilSlug` type.
- Produces: `type ListingFormValue = { title: string; description: string; price: string; compareAtPrice: string; categorySlug: string; subcategorySlug: string; tehsilSlug: TehsilSlug; localitySlug: string; images: string[]; contactPhone: string }`, `<ListingForm value={ListingFormValue} onChange={(value: ListingFormValue) => void} onSubmit={(e: React.FormEvent) => void} submitLabel={string} error={string | null=} />`. `price`/`compareAtPrice` stay strings for input binding — Task 18's pages parse them to numbers on submit.

- [ ] **Step 1: Add the `listingForm` message namespace**

In `src/i18n/messages/en.json`:

```json
"listingForm": {
  "titleLabel": "Title",
  "descriptionLabel": "Description",
  "priceLabel": "Price (PKR)",
  "compareAtPriceLabel": "Original Price (PKR)",
  "compareAtPriceHint": "Optional — shown struck through next to the price.",
  "categoryLabel": "Category",
  "subcategoryLabel": "Subcategory",
  "tehsilLabel": "Tehsil",
  "localityLabel": "Locality",
  "contactPhoneLabel": "Contact Number",
  "imagesLabel": "Photos",
  "imagesHint": "Up to 6 photos.",
  "addPhotoCta": "Add Photo"
}
```

In `src/i18n/messages/ur.json`:

```json
"listingForm": {
  "titleLabel": "عنوان",
  "descriptionLabel": "تفصیل",
  "priceLabel": "قیمت (روپے)",
  "compareAtPriceLabel": "اصل قیمت (روپے)",
  "compareAtPriceHint": "اختیاری — قیمت کے ساتھ کٹی ہوئی دکھائی جائے گی۔",
  "categoryLabel": "قسم",
  "subcategoryLabel": "ذیلی قسم",
  "tehsilLabel": "تحصیل",
  "localityLabel": "علاقہ",
  "contactPhoneLabel": "رابطہ نمبر",
  "imagesLabel": "تصاویر",
  "imagesHint": "زیادہ سے زیادہ 6 تصاویر۔",
  "addPhotoCta": "تصویر شامل کریں"
}
```

- [ ] **Step 2: Write the failing test**

```tsx
// src/components/seller/listing-form.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { CATEGORIES } from "@/data/categories";
import { ListingForm, type ListingFormValue } from "./listing-form";

const BASE_VALUE: ListingFormValue = {
  title: "",
  description: "",
  price: "",
  compareAtPrice: "",
  categorySlug: CATEGORIES[0].slug,
  subcategorySlug: CATEGORIES[0].subcategories[0].slug,
  tehsilSlug: "batkhela",
  localitySlug: "batkhela-city",
  images: [],
  contactPhone: "",
};

function Wrapper({ onChange, onSubmit }: { onChange: (v: ListingFormValue) => void; onSubmit: () => void }) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <ListingForm value={BASE_VALUE} onChange={onChange} onSubmit={onSubmit} submitLabel="Save Listing" />
    </NextIntlClientProvider>
  );
}

describe("ListingForm", () => {
  it("reports title changes via onChange", async () => {
    const onChange = vi.fn();
    render(<Wrapper onChange={onChange} onSubmit={() => {}} />);
    await userEvent.type(screen.getByLabelText("Title"), "S");
    expect(onChange).toHaveBeenCalledWith({ ...BASE_VALUE, title: "S" });
  });

  it("resets subcategory when category changes", async () => {
    const onChange = vi.fn();
    render(<Wrapper onChange={onChange} onSubmit={() => {}} />);
    await userEvent.click(screen.getByRole("combobox", { name: "Category" }));
    await userEvent.click(await screen.findByRole("option", { name: CATEGORIES[1].nameEn }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ categorySlug: CATEGORIES[1].slug, subcategorySlug: CATEGORIES[1].subcategories[0].slug })
    );
  });

  it("calls onSubmit when the form is submitted", async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(<Wrapper onChange={() => {}} onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "Save Listing" }));
    expect(onSubmit).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run src/components/seller/listing-form.test.tsx`
Expected: FAIL — `./listing-form` doesn't exist.

- [ ] **Step 4: Implement**

```tsx
// src/components/seller/listing-form.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { MultiFileUpload } from "@/components/ui/multi-file-upload";
import { Button } from "@/components/ui/button";
import { CATEGORY_OPTIONS, findCategory } from "@/data/categories";
import { TEHSIL_OPTIONS, findTehsil } from "@/data/tehsils";
import type { TehsilSlug } from "@/types";

export type ListingFormValue = {
  title: string;
  description: string;
  price: string;
  compareAtPrice: string;
  categorySlug: string;
  subcategorySlug: string;
  tehsilSlug: TehsilSlug;
  localitySlug: string;
  images: string[];
  contactPhone: string;
};

export function ListingForm({
  value,
  onChange,
  onSubmit,
  submitLabel,
  error,
}: {
  value: ListingFormValue;
  onChange: (value: ListingFormValue) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  error?: string | null;
}) {
  const t = useTranslations("listingForm");
  const subcategoryOptions = (findCategory(value.categorySlug)?.subcategories ?? []).map((s) => ({
    value: s.slug,
    label: s.nameEn,
  }));
  const localityOptions = (findTehsil(value.tehsilSlug)?.localities ?? []).map((l) => ({
    value: l.slug,
    label: l.nameEn,
  }));

  return (
    <form className="max-w-2xl space-y-4" onSubmit={onSubmit}>
      <FormField label={t("titleLabel")} htmlFor="lf-title" required>
        <Input id="lf-title" value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} />
      </FormField>

      <FormField label={t("descriptionLabel")} htmlFor="lf-description" required>
        <Textarea
          id="lf-description"
          value={value.description}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("priceLabel")} htmlFor="lf-price" required>
          <Input
            id="lf-price"
            type="number"
            min={0}
            value={value.price}
            onChange={(e) => onChange({ ...value, price: e.target.value })}
          />
        </FormField>
        <FormField label={t("compareAtPriceLabel")} htmlFor="lf-compare-price" hint={t("compareAtPriceHint")}>
          <Input
            id="lf-compare-price"
            type="number"
            min={0}
            value={value.compareAtPrice}
            onChange={(e) => onChange({ ...value, compareAtPrice: e.target.value })}
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("categoryLabel")} htmlFor="lf-category" required>
          <Select
            ariaLabel={t("categoryLabel")}
            value={value.categorySlug}
            onValueChange={(categorySlug) => {
              const nextSubcategories = findCategory(categorySlug)?.subcategories ?? [];
              onChange({ ...value, categorySlug, subcategorySlug: nextSubcategories[0]?.slug ?? "" });
            }}
            options={CATEGORY_OPTIONS}
            className="w-full"
          />
        </FormField>
        <FormField label={t("subcategoryLabel")} htmlFor="lf-subcategory" required>
          <Select
            ariaLabel={t("subcategoryLabel")}
            value={value.subcategorySlug}
            onValueChange={(subcategorySlug) => onChange({ ...value, subcategorySlug })}
            options={subcategoryOptions}
            className="w-full"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label={t("tehsilLabel")} htmlFor="lf-tehsil" required>
          <Select
            ariaLabel={t("tehsilLabel")}
            value={value.tehsilSlug}
            onValueChange={(tehsilSlug) => {
              const nextLocalities = findTehsil(tehsilSlug as TehsilSlug)?.localities ?? [];
              onChange({ ...value, tehsilSlug: tehsilSlug as TehsilSlug, localitySlug: nextLocalities[0]?.slug ?? "" });
            }}
            options={TEHSIL_OPTIONS.filter((o) => o.value !== "all")}
            className="w-full"
          />
        </FormField>
        <FormField label={t("localityLabel")} htmlFor="lf-locality" required>
          <Select
            ariaLabel={t("localityLabel")}
            value={value.localitySlug}
            onValueChange={(localitySlug) => onChange({ ...value, localitySlug })}
            options={localityOptions}
            className="w-full"
          />
        </FormField>
      </div>

      <FormField label={t("contactPhoneLabel")} htmlFor="lf-phone" required>
        <Input
          id="lf-phone"
          leadingIcon="call"
          value={value.contactPhone}
          onChange={(e) => onChange({ ...value, contactPhone: e.target.value })}
        />
      </FormField>

      <FormField label={t("imagesLabel")} hint={t("imagesHint")}>
        <MultiFileUpload
          label={t("addPhotoCta")}
          urls={value.images}
          onAdd={(file) => onChange({ ...value, images: [...value.images, URL.createObjectURL(file)] })}
          onRemove={(index) => onChange({ ...value, images: value.images.filter((_, i) => i !== index) })}
        />
      </FormField>

      {error && (
        <p role="alert" className="text-xs font-semibold text-danger">
          {error}
        </p>
      )}

      <Button type="submit" size="lg">
        {submitLabel}
      </Button>
    </form>
  );
}
```

- [ ] **Step 5: Run it to see it pass**

Run: `npx vitest run src/components/seller/listing-form.test.tsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add src/components/seller/listing-form.tsx src/components/seller/listing-form.test.tsx \
  src/i18n/messages/en.json src/i18n/messages/ur.json
git commit -m "feat: add shared listing create/edit form

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 18: New and edit listing pages

**Files:**
- Create: `src/app/[locale]/seller/dashboard/listings/new/page.tsx`
- Create: `src/app/[locale]/seller/dashboard/listings/[id]/edit/page.tsx`
- Test: `src/app/[locale]/seller/dashboard/listings/new/page.test.tsx`
- Test: `src/app/[locale]/seller/dashboard/listings/[id]/edit/page.test.tsx`
- Modify: `src/i18n/messages/en.json`, `src/i18n/messages/ur.json`

**Interfaces:**
- Consumes: `ListingForm`, `ListingFormValue` (Task 17); `useAuth()` (Task 6); `saveListing`, `createListingId`, `generateListingSlug`, `getListingByIdOverlay` (Task 3); `getSellerByIdOverlay` (Task 2); `CATEGORIES` from `@/data/categories`; `findTehsil` from `@/data/tehsils`; `useRouter` from `@/i18n/routing`; `notFound` from `next/navigation`.
- Produces: two default-exported client page components. Both pages are client components rendered inside `seller/dashboard/layout.tsx` (Task 14), so no additional seller guard is needed here — but the edit page must still check the listing belongs to *this* seller (`listing.sellerId === user.sellerId`), independent of the general seller-role guard.

- [ ] **Step 1: Add the `sellerListingForm` message namespace**

In `src/i18n/messages/en.json`:

```json
"sellerListingForm": {
  "newPageTitle": "Add Listing",
  "editPageTitle": "Edit Listing",
  "createCta": "Publish Listing",
  "saveCta": "Save Changes",
  "invalidPriceError": "Enter a title and a valid price."
}
```

In `src/i18n/messages/ur.json`:

```json
"sellerListingForm": {
  "newPageTitle": "اشتہار شامل کریں",
  "editPageTitle": "اشتہار میں ترمیم کریں",
  "createCta": "اشتہار شائع کریں",
  "saveCta": "تبدیلیاں محفوظ کریں",
  "invalidPriceError": "عنوان اور درست قیمت درج کریں۔"
}
```

- [ ] **Step 2: Write the failing tests**

```tsx
// src/app/[locale]/seller/dashboard/listings/new/page.test.tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { AuthProvider } from "@/lib/mock-db/auth-context";
import { getListingsBySellerOverlay } from "@/lib/mock-db/listings";
import NewListingPage from "./page";

const pushMock = vi.fn();
vi.mock("@/i18n/routing", async () => {
  const actual = await vi.importActual<typeof import("@/i18n/routing")>("@/i18n/routing");
  return { ...actual, useRouter: () => ({ push: pushMock, replace: pushMock }) };
});

function seedSignedInSeller() {
  window.localStorage.setItem(
    "mb.users",
    JSON.stringify([{ id: "u1", phone: "+923001234567", password: "password1", role: "seller", displayName: "Store", sellerId: "s1" }])
  );
  window.localStorage.setItem("mb.session", JSON.stringify("u1"));
}

function renderPage() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AuthProvider>
        <NewListingPage />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}

describe("NewListingPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    pushMock.mockClear();
  });

  it("creates a listing for the signed-in seller and redirects to the listings tab", async () => {
    seedSignedInSeller();
    renderPage();
    await userEvent.type(screen.getByLabelText("Title"), "Second Hand Bicycle");
    await userEvent.type(screen.getByLabelText("Description"), "Lightly used, well maintained.");
    await userEvent.type(screen.getByLabelText("Price (PKR)"), "15000");
    await userEvent.type(screen.getByLabelText("Contact Number"), "3001234567");
    await userEvent.click(screen.getByRole("button", { name: "Publish Listing" }));
    expect(pushMock).toHaveBeenCalledWith("/seller/dashboard/listings");
    expect(getListingsBySellerOverlay("s1").some((l) => l.title === "Second Hand Bicycle")).toBe(true);
  });

  it("rejects an empty title", async () => {
    seedSignedInSeller();
    renderPage();
    await userEvent.type(screen.getByLabelText("Price (PKR)"), "15000");
    await userEvent.click(screen.getByRole("button", { name: "Publish Listing" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/valid price/i);
    expect(pushMock).not.toHaveBeenCalled();
  });
});
```

```tsx
// src/app/[locale]/seller/dashboard/listings/[id]/edit/page.test.tsx
import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { AuthProvider } from "@/lib/mock-db/auth-context";
import { saveListing, getListingByIdOverlay } from "@/lib/mock-db/listings";
import EditListingPage from "./page";
import type { Listing } from "@/types";

const pushMock = vi.fn();
const notFoundMock = vi.fn();
vi.mock("@/i18n/routing", async () => {
  const actual = await vi.importActual<typeof import("@/i18n/routing")>("@/i18n/routing");
  return { ...actual, useRouter: () => ({ push: pushMock, replace: pushMock }) };
});
vi.mock("next/navigation", async () => {
  const actual = await vi.importActual<typeof import("next/navigation")>("next/navigation");
  return { ...actual, notFound: () => notFoundMock() };
});

const OWNED_LISTING: Listing = {
  id: "l_owned",
  slug: "owned-listing",
  title: "Owned Listing",
  description: "Mine.",
  price: 5000,
  categorySlug: "electronics",
  subcategorySlug: "electronics-generators",
  tehsilSlug: "batkhela",
  localitySlug: "batkhela-city",
  localityLabel: "Batkhela City & Bazaar",
  images: [],
  contactPhone: "+923001234567",
  sellerId: "s1",
  status: "active",
  createdAt: "2026-09-12T00:00:00.000Z",
};

function seedSignedInSeller(sellerId: string) {
  window.localStorage.setItem(
    "mb.users",
    JSON.stringify([{ id: "u1", phone: "+923001234567", password: "password1", role: "seller", displayName: "Store", sellerId }])
  );
  window.localStorage.setItem("mb.session", JSON.stringify("u1"));
}

function renderPage(id: string) {
  // EditListingPage unwraps its `params` promise with React.use(), which
  // suspends until the promise settles — even one already created via
  // Promise.resolve() isn't synchronously "settled" from React's
  // perspective, so a Suspense boundary is required here the same way the
  // App Router provides one around every page in production.
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AuthProvider>
        <React.Suspense fallback={null}>
          <EditListingPage params={Promise.resolve({ id })} />
        </React.Suspense>
      </AuthProvider>
    </NextIntlClientProvider>
  );
}

describe("EditListingPage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    pushMock.mockClear();
    notFoundMock.mockClear();
  });

  it("loads and saves changes to the seller's own listing", async () => {
    saveListing(OWNED_LISTING);
    seedSignedInSeller("s1");
    renderPage("l_owned");
    const titleInput = await screen.findByDisplayValue("Owned Listing");
    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, "Renamed Listing");
    await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(pushMock).toHaveBeenCalledWith("/seller/dashboard/listings");
    expect(getListingByIdOverlay("l_owned")?.title).toBe("Renamed Listing");
  });

  it("calls notFound for a listing belonging to a different seller", async () => {
    saveListing(OWNED_LISTING);
    seedSignedInSeller("s_someone_else");
    renderPage("l_owned");
    await vi.waitFor(() => expect(notFoundMock).toHaveBeenCalled());
  });
});
```

- [ ] **Step 3: Run them to see them fail**

Run: `npx vitest run "src/app/[locale]/seller/dashboard/listings/new/page.test.tsx" "src/app/[locale]/seller/dashboard/listings/[id]/edit/page.test.tsx"`
Expected: FAIL — neither page exists yet.

- [ ] **Step 4: Implement the new-listing page**

```tsx
// src/app/[locale]/seller/dashboard/listings/new/page.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/lib/mock-db/auth-context";
import { saveListing, createListingId, generateListingSlug } from "@/lib/mock-db/listings";
import { getSellerByIdOverlay } from "@/lib/mock-db/sellers";
import { CATEGORIES } from "@/data/categories";
import { findTehsil } from "@/data/tehsils";
import { ListingForm, type ListingFormValue } from "@/components/seller/listing-form";

const DEFAULT_CATEGORY = CATEGORIES[0];

const INITIAL_VALUE: ListingFormValue = {
  title: "",
  description: "",
  price: "",
  compareAtPrice: "",
  categorySlug: DEFAULT_CATEGORY.slug,
  subcategorySlug: DEFAULT_CATEGORY.subcategories[0]?.slug ?? "",
  tehsilSlug: "batkhela",
  localitySlug: "batkhela-city",
  images: [],
  contactPhone: "",
};

export default function NewListingPage() {
  const t = useTranslations("sellerListingForm");
  const { user } = useAuth();
  const router = useRouter();
  const [value, setValue] = React.useState<ListingFormValue>(INITIAL_VALUE);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user?.sellerId) return;
    const seller = getSellerByIdOverlay(user.sellerId);
    if (seller) setValue((v) => (v.contactPhone ? v : { ...v, contactPhone: seller.phone }));
  }, [user?.sellerId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(value.price);
    if (!user?.sellerId || !value.title.trim() || Number.isNaN(price) || price <= 0) {
      setError(t("invalidPriceError"));
      return;
    }
    const locality = findTehsil(value.tehsilSlug)?.localities.find((l) => l.slug === value.localitySlug);
    saveListing({
      id: createListingId(),
      slug: generateListingSlug(value.title),
      title: value.title,
      description: value.description,
      price,
      compareAtPrice: value.compareAtPrice ? Number(value.compareAtPrice) : undefined,
      categorySlug: value.categorySlug,
      subcategorySlug: value.subcategorySlug,
      tehsilSlug: value.tehsilSlug,
      localitySlug: value.localitySlug,
      localityLabel: locality?.nameEn ?? "",
      images: value.images,
      contactPhone: value.contactPhone,
      sellerId: user.sellerId,
      status: "active",
      createdAt: new Date().toISOString(),
    });
    router.push("/seller/dashboard/listings");
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-extrabold tracking-tight text-on-surface">{t("newPageTitle")}</h2>
      <ListingForm value={value} onChange={setValue} onSubmit={handleSubmit} submitLabel={t("createCta")} error={error} />
    </div>
  );
}
```

- [ ] **Step 5: Implement the edit-listing page**

```tsx
// src/app/[locale]/seller/dashboard/listings/[id]/edit/page.tsx
"use client";

import * as React from "react";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { useAuth } from "@/lib/mock-db/auth-context";
import { getListingByIdOverlay, saveListing } from "@/lib/mock-db/listings";
import { findTehsil } from "@/data/tehsils";
import { ListingForm, type ListingFormValue } from "@/components/seller/listing-form";
import type { Listing } from "@/types";

function toFormValue(listing: Listing): ListingFormValue {
  return {
    title: listing.title,
    description: listing.description,
    price: String(listing.price),
    compareAtPrice: listing.compareAtPrice ? String(listing.compareAtPrice) : "",
    categorySlug: listing.categorySlug,
    subcategorySlug: listing.subcategorySlug,
    tehsilSlug: listing.tehsilSlug,
    localitySlug: listing.localitySlug,
    images: listing.images,
    contactPhone: listing.contactPhone,
  };
}

export default function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const t = useTranslations("sellerListingForm");
  const { user } = useAuth();
  const router = useRouter();
  const [listing, setListing] = React.useState<Listing | null>(null);
  const [value, setValue] = React.useState<ListingFormValue | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notFoundTriggered, setNotFoundTriggered] = React.useState(false);

  React.useEffect(() => {
    if (!user?.sellerId) return;
    const found = getListingByIdOverlay(id);
    if (!found || found.sellerId !== user.sellerId) {
      setNotFoundTriggered(true);
      return;
    }
    setListing(found);
    setValue(toFormValue(found));
  }, [id, user?.sellerId]);

  if (notFoundTriggered) {
    notFound();
    return null;
  }
  if (!listing || !value) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const price = Number(value!.price);
    if (!value!.title.trim() || Number.isNaN(price) || price <= 0) {
      setError(t("invalidPriceError"));
      return;
    }
    const locality = findTehsil(value!.tehsilSlug)?.localities.find((l) => l.slug === value!.localitySlug);
    saveListing({
      ...listing!,
      title: value!.title,
      description: value!.description,
      price,
      compareAtPrice: value!.compareAtPrice ? Number(value!.compareAtPrice) : undefined,
      categorySlug: value!.categorySlug,
      subcategorySlug: value!.subcategorySlug,
      tehsilSlug: value!.tehsilSlug,
      localitySlug: value!.localitySlug,
      localityLabel: locality?.nameEn ?? listing!.localityLabel,
      images: value!.images,
      contactPhone: value!.contactPhone,
    });
    router.push("/seller/dashboard/listings");
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-extrabold tracking-tight text-on-surface">{t("editPageTitle")}</h2>
      <ListingForm value={value} onChange={setValue} onSubmit={handleSubmit} submitLabel={t("saveCta")} error={error} />
    </div>
  );
}
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `npx vitest run "src/app/[locale]/seller/dashboard/listings/new/page.test.tsx" "src/app/[locale]/seller/dashboard/listings/[id]/edit/page.test.tsx"`
Expected: PASS (4 tests)

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: PASS — no regressions.

- [ ] **Step 8: Commit**

```bash
git add "src/app/[locale]/seller/dashboard/listings/new" "src/app/[locale]/seller/dashboard/listings/[id]" \
  src/i18n/messages/en.json src/i18n/messages/ur.json
git commit -m "feat: add new/edit listing pages with ownership guard

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 19: Public storefront fallback for mock-db-only sellers

**Files:**
- Create: `src/components/marketplace/client-seller-storefront.tsx`
- Test: `src/components/marketplace/client-seller-storefront.test.tsx`
- Modify: `src/app/[locale]/seller/[slug]/page.tsx`
- Modify: `src/i18n/messages/en.json`, `src/i18n/messages/ur.json`

**Interfaces:**
- Consumes: `getSellerBySlugOverlay` (Task 2), `getListingsBySellerOverlay` (Task 3); `SellerStorefront` (existing, unmodified by this task); `EmptyState` from `@/components/ui/empty-state`.
- Produces: `<ClientSellerStorefront slug={string} />`.

A freshly-registered seller (Task 13) exists only in `localStorage`, never in the server-rendered fixtures `getSellerBySlug` reads. `seller/[slug]/page.tsx` still tries the fast server lookup first (fixture storefronts render exactly as before, no behavior change for them) and only falls back to this client component — which re-checks via the mock-db overlay after mount — when that lookup comes back empty, instead of calling `notFound()` immediately.

- [ ] **Step 1: Add the `marketplace.storeNotFound*` keys**

In `src/i18n/messages/en.json`, inside the existing `"marketplace"` object add:

```json
"storeNotFoundTitle": "Store Not Found",
"storeNotFoundBody": "This storefront doesn't exist or hasn't loaded on this device yet."
```

In `src/i18n/messages/ur.json`, inside `"marketplace"` add:

```json
"storeNotFoundTitle": "دکان نہیں ملی",
"storeNotFoundBody": "یہ دکان موجود نہیں یا ابھی اس ڈیوائس پر لوڈ نہیں ہوئی۔"
```

- [ ] **Step 2: Write the failing test**

```tsx
// src/components/marketplace/client-seller-storefront.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { saveSeller } from "@/lib/mock-db/sellers";
import { saveListing } from "@/lib/mock-db/listings";
import { ClientSellerStorefront } from "./client-seller-storefront";
import type { Seller, Listing } from "@/types";

const SELLER: Seller = {
  id: "s_client1",
  slug: "client-only-store",
  name: "Client Only Store",
  initials: "CO",
  tehsilSlug: "batkhela",
  localityLabel: "Batkhela City & Bazaar",
  rating: 0,
  reviewCount: 0,
  verified: false,
  responseMinutes: 30,
  specialty: "General goods",
  statLabel: "Listings",
  statValue: "0",
  phone: "+923001234567",
};

const LISTING: Listing = {
  id: "l_client1",
  slug: "client-only-listing",
  title: "Client Only Listing",
  description: "Created on the client only.",
  price: 2000,
  categorySlug: "electronics",
  subcategorySlug: "electronics-generators",
  tehsilSlug: "batkhela",
  localitySlug: "batkhela-city",
  localityLabel: "Batkhela City & Bazaar",
  images: [],
  contactPhone: "+923001234567",
  sellerId: "s_client1",
  status: "active",
  createdAt: "2026-09-12T00:00:00.000Z",
};

function renderStorefront(slug: string) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ClientSellerStorefront slug={slug} />
    </NextIntlClientProvider>
  );
}

describe("ClientSellerStorefront", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders a mock-db-only seller and its listings after mount", async () => {
    saveSeller(SELLER);
    saveListing(LISTING);
    renderStorefront("client-only-store");
    expect(await screen.findByText("Client Only Store")).toBeInTheDocument();
    expect(await screen.findByText("Client Only Listing")).toBeInTheDocument();
  });

  it("shows a not-found state for an unknown slug", async () => {
    renderStorefront("no-such-store");
    expect(await screen.findByText("Store Not Found")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run it to see it fail**

Run: `npx vitest run src/components/marketplace/client-seller-storefront.test.tsx`
Expected: FAIL — `./client-seller-storefront` doesn't exist.

- [ ] **Step 4: Implement**

```tsx
// src/components/marketplace/client-seller-storefront.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { getSellerBySlugOverlay } from "@/lib/mock-db/sellers";
import { getListingsBySellerOverlay } from "@/lib/mock-db/listings";
import { EmptyState } from "@/components/ui/empty-state";
import { SellerStorefront } from "./seller-storefront";
import type { Seller, Listing } from "@/types";

export function ClientSellerStorefront({ slug }: { slug: string }) {
  const t = useTranslations("marketplace");
  const [state, setState] = React.useState<"loading" | "missing" | "found">("loading");
  const [data, setData] = React.useState<{ seller: Seller; listings: Listing[] } | null>(null);

  React.useEffect(() => {
    const seller = getSellerBySlugOverlay(slug);
    if (!seller) {
      setState("missing");
      return;
    }
    setData({ seller, listings: getListingsBySellerOverlay(seller.id) });
    setState("found");
  }, [slug]);

  if (state === "loading") {
    return <div className="h-40 animate-pulse rounded-xl bg-surface-low" />;
  }
  if (state === "missing" || !data) {
    return <EmptyState icon="storefront" title={t("storeNotFoundTitle")} body={t("storeNotFoundBody")} />;
  }
  return <SellerStorefront seller={data.seller} listings={data.listings} />;
}
```

- [ ] **Step 5: Wire the fallback into the storefront page**

Replace the contents of `src/app/[locale]/seller/[slug]/page.tsx`:

```tsx
// src/app/[locale]/seller/[slug]/page.tsx
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
```

This drops the `notFound()` call for an unknown slug — a slug matching nothing anywhere now shows `ClientSellerStorefront`'s not-found state instead of Next's 404 page, since it might still resolve once the client checks `localStorage`.

- [ ] **Step 6: Run it to see it pass**

Run: `npx vitest run src/components/marketplace/client-seller-storefront.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: PASS — the existing `seller-storefront.test.tsx` (if any) and other marketplace tests are unaffected since fixture-backed storefronts still render server-side exactly as before.

- [ ] **Step 8: Commit**

```bash
git add src/components/marketplace/client-seller-storefront.tsx src/components/marketplace/client-seller-storefront.test.tsx \
  "src/app/[locale]/seller/[slug]/page.tsx" src/i18n/messages/en.json src/i18n/messages/ur.json
git commit -m "feat: fall back to client-side lookup for mock-db-only storefronts

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 20: Public listing detail fallback for mock-db-only listings

**Files:**
- Create: `src/components/marketplace/client-listing-detail.tsx`
- Test: `src/components/marketplace/client-listing-detail.test.tsx`
- Modify: `src/app/[locale]/listing/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getListingBySlugOverlay`, `getListingsBySellerOverlay` (Task 3); `getSellerByIdOverlay` (Task 2); `ListingDetail` (existing, unmodified); `EmptyState`; the same `marketplace.storeNotFoundTitle`/`storeNotFoundBody` keys added in Task 19 (reused here as a generic "not found" message).
- Produces: `<ClientListingDetail slug={string} />`.

Same rationale as Task 19: a dashboard-created listing (Task 18) only exists in `localStorage`, so a buyer following its card link (`ListingCard` already links to `/listing/${listing.slug}`, unchanged) needs this fallback the same way a mock-db-only seller's storefront does.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/marketplace/client-listing-detail.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { saveSeller } from "@/lib/mock-db/sellers";
import { saveListing } from "@/lib/mock-db/listings";
import { ClientListingDetail } from "./client-listing-detail";
import type { Seller, Listing } from "@/types";

const SELLER: Seller = {
  id: "s_ld1",
  slug: "listing-detail-store",
  name: "Listing Detail Store",
  initials: "LD",
  tehsilSlug: "batkhela",
  localityLabel: "Batkhela City & Bazaar",
  rating: 0,
  reviewCount: 0,
  verified: false,
  responseMinutes: 30,
  specialty: "General goods",
  statLabel: "Listings",
  statValue: "0",
  phone: "+923001234567",
};

const LISTING: Listing = {
  id: "l_ld1",
  slug: "client-only-detail-listing",
  title: "Client Only Detail Listing",
  description: "Created on the client only.",
  price: 3000,
  categorySlug: "electronics",
  subcategorySlug: "electronics-generators",
  tehsilSlug: "batkhela",
  localitySlug: "batkhela-city",
  localityLabel: "Batkhela City & Bazaar",
  images: [],
  contactPhone: "+923001234567",
  sellerId: "s_ld1",
  status: "active",
  createdAt: "2026-09-12T00:00:00.000Z",
};

function renderDetail(slug: string) {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <ClientListingDetail slug={slug} />
    </NextIntlClientProvider>
  );
}

describe("ClientListingDetail", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("renders a mock-db-only listing after mount", async () => {
    saveSeller(SELLER);
    saveListing(LISTING);
    renderDetail("client-only-detail-listing");
    expect(await screen.findByText("Client Only Detail Listing")).toBeInTheDocument();
  });

  it("shows a not-found state for an unknown slug", async () => {
    renderDetail("no-such-listing");
    expect(await screen.findByText("Store Not Found")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx vitest run src/components/marketplace/client-listing-detail.test.tsx`
Expected: FAIL — `./client-listing-detail` doesn't exist.

- [ ] **Step 3: Implement**

```tsx
// src/components/marketplace/client-listing-detail.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { getListingBySlugOverlay, getListingsBySellerOverlay } from "@/lib/mock-db/listings";
import { getSellerByIdOverlay } from "@/lib/mock-db/sellers";
import { EmptyState } from "@/components/ui/empty-state";
import { ListingDetail } from "./listing-detail";
import type { Listing, Seller } from "@/types";

export function ClientListingDetail({ slug }: { slug: string }) {
  const t = useTranslations("marketplace");
  const [state, setState] = React.useState<"loading" | "missing" | "found">("loading");
  const [data, setData] = React.useState<{ listing: Listing; seller: Seller | undefined; otherListings: Listing[] } | null>(
    null
  );

  React.useEffect(() => {
    const listing = getListingBySlugOverlay(slug);
    if (!listing) {
      setState("missing");
      return;
    }
    const seller = getSellerByIdOverlay(listing.sellerId);
    const otherListings = seller
      ? getListingsBySellerOverlay(seller.id, { excludeId: listing.id, limit: 5 })
      : [];
    setData({ listing, seller, otherListings });
    setState("found");
  }, [slug]);

  if (state === "loading") {
    return <div className="h-40 animate-pulse rounded-xl bg-surface-low" />;
  }
  if (state === "missing" || !data) {
    return <EmptyState icon="inventory_2" title={t("storeNotFoundTitle")} body={t("storeNotFoundBody")} />;
  }
  return <ListingDetail listing={data.listing} seller={data.seller} otherListings={data.otherListings} />;
}
```

- [ ] **Step 4: Wire the fallback into the listing detail page**

Replace the contents of `src/app/[locale]/listing/[slug]/page.tsx`:

```tsx
// src/app/[locale]/listing/[slug]/page.tsx
import { setRequestLocale } from "next-intl/server";
import { getListingBySlug, getListingsBySeller } from "@/lib/listings";
import { getSellerById } from "@/lib/sellers";
import { ListingDetail } from "@/components/marketplace/listing-detail";
import { ClientListingDetail } from "@/components/marketplace/client-listing-detail";

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const listing = getListingBySlug(slug);

  return (
    <main className="flex-1 w-full max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {listing ? (
        <ListingDetail
          listing={listing}
          seller={getSellerById(listing.sellerId)}
          otherListings={getListingsBySeller(listing.sellerId, { excludeId: listing.id, limit: 5 })}
        />
      ) : (
        <ClientListingDetail slug={slug} />
      )}
    </main>
  );
}
```

- [ ] **Step 5: Run it to see it pass**

Run: `npx vitest run src/components/marketplace/client-listing-detail.test.tsx`
Expected: PASS (2 tests)

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/components/marketplace/client-listing-detail.tsx src/components/marketplace/client-listing-detail.test.tsx \
  "src/app/[locale]/listing/[slug]/page.tsx"
git commit -m "feat: fall back to client-side lookup for mock-db-only listings

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 21: Buyer reviews on the storefront

**Files:**
- Create: `src/components/marketplace/seller-rating-summary.tsx`
- Create: `src/components/marketplace/seller-reviews.tsx`
- Test: `src/components/marketplace/seller-rating-summary.test.tsx`
- Test: `src/components/marketplace/seller-reviews.test.tsx`
- Modify: `src/components/marketplace/seller-storefront.tsx`
- Modify: `src/i18n/messages/en.json`, `src/i18n/messages/ur.json`

**Interfaces:**
- Consumes: `getSellerRatingSummary` (Task 4); `getReviewsForSeller`, `getMyReviewForSeller`, `upsertReview` (Task 4); `useAuth()` (Task 6); `Rating`, `Textarea`, `Button`, `Modal` from `@/components/ui/*`; `Link`, `usePathname` from `@/i18n/routing` (both safe to call without a real Next router — `usePathname()` returns `null` rather than throwing, and `Link` just renders an `<a>`; unlike `useRouter()`, neither needs mocking in tests).
- Produces: `<SellerRatingSummary seller={Seller} />` (drop-in replacement for the static `<Rating>` in the storefront header), `<SellerReviews seller={Seller} />` (the reviews list + gated write form).

- [ ] **Step 1: Add the `reviews` message namespace**

In `src/i18n/messages/en.json`:

```json
"reviews": {
  "title": "Reviews",
  "writeReviewCta": "Write a Review",
  "yourRatingAria": "Your rating",
  "commentPlaceholder": "Share your experience with this seller...",
  "submitReviewCta": "Submit Review",
  "noReviewsYet": "No reviews yet — be the first to leave one.",
  "signInPromptTitle": "Sign In to Review",
  "signInPromptBody": "Create a free account or sign in to rate and review this seller.",
  "signInPromptCta": "Sign In / Create Account"
}
```

In `src/i18n/messages/ur.json`:

```json
"reviews": {
  "title": "جائزے",
  "writeReviewCta": "جائزہ لکھیں",
  "yourRatingAria": "آپ کی درجہ بندی",
  "commentPlaceholder": "اس فروخت کنندہ کے بارے میں اپنا تجربہ بتائیں...",
  "submitReviewCta": "جائزہ جمع کروائیں",
  "noReviewsYet": "ابھی کوئی جائزہ نہیں — پہلا جائزہ آپ کا ہو سکتا ہے۔",
  "signInPromptTitle": "جائزہ دینے کے لیے سائن ان کریں",
  "signInPromptBody": "اس فروخت کنندہ کو ریٹ اور جائزہ دینے کے لیے مفت اکاؤنٹ بنائیں یا سائن ان کریں۔",
  "signInPromptCta": "سائن ان / اکاؤنٹ بنائیں"
}
```

- [ ] **Step 2: Write the failing tests**

```tsx
// src/components/marketplace/seller-rating-summary.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { upsertReview } from "@/lib/mock-db/reviews";
import { SellerRatingSummary } from "./seller-rating-summary";
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
  specialty: "VFD Inverters",
  statLabel: "Deals Done",
  statValue: "142 Systems",
  phone: "+923166441108",
};

describe("SellerRatingSummary", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the seed rating and count with no stored reviews", async () => {
    render(<SellerRatingSummary seller={SELLER} />);
    expect(await screen.findByText("(142)")).toBeInTheDocument();
  });

  it("blends in a stored review after mount", async () => {
    upsertReview({ sellerId: "s1", buyerId: "u1", buyerName: "Bilal", rating: 5, comment: "Great!" });
    render(<SellerRatingSummary seller={SELLER} />);
    expect(await screen.findByText("(143)")).toBeInTheDocument();
  });
});
```

```tsx
// src/components/marketplace/seller-reviews.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { AuthProvider } from "@/lib/mock-db/auth-context";
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
  specialty: "VFD Inverters",
  statLabel: "Deals Done",
  statValue: "142 Systems",
  phone: "+923166441108",
};

function renderReviews() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <AuthProvider>
        <SellerReviews seller={SELLER} />
      </AuthProvider>
    </NextIntlClientProvider>
  );
}

describe("SellerReviews", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("prompts sign-in when a signed-out visitor tries to write a review", async () => {
    renderReviews();
    await userEvent.click(screen.getByRole("button", { name: "Write a Review" }));
    expect(await screen.findByText("Sign In to Review")).toBeInTheDocument();
  });

  it("lets a signed-in customer submit a review, which then appears in the list", async () => {
    window.localStorage.setItem(
      "mb.users",
      JSON.stringify([{ id: "u1", phone: "+923001234567", password: "password1", role: "customer", displayName: "Bilal" }])
    );
    window.localStorage.setItem("mb.session", JSON.stringify("u1"));
    renderReviews();
    await userEvent.click(await screen.findByRole("button", { name: "Write a Review" }));
    await userEvent.type(screen.getByPlaceholderText("Share your experience with this seller..."), "Great seller!");
    await userEvent.click(screen.getByRole("button", { name: "Submit Review" }));
    expect(await screen.findByText("Bilal")).toBeInTheDocument();
    expect(await screen.findByText("Great seller!")).toBeInTheDocument();
  });

  it("hides the write-review button for the seller's own storefront", async () => {
    window.localStorage.setItem(
      "mb.users",
      JSON.stringify([{ id: "u2", phone: "+923166441108", password: "password1", role: "seller", displayName: "Khan Solar", sellerId: "s1" }])
    );
    window.localStorage.setItem("mb.session", JSON.stringify("u2"));
    renderReviews();
    await screen.findByText("Reviews");
    expect(screen.queryByRole("button", { name: "Write a Review" })).toBeNull();
  });
});
```

- [ ] **Step 3: Run them to see them fail**

Run: `npx vitest run src/components/marketplace/seller-rating-summary.test.tsx src/components/marketplace/seller-reviews.test.tsx`
Expected: FAIL — neither component exists.

- [ ] **Step 4: Implement `SellerRatingSummary`**

```tsx
// src/components/marketplace/seller-rating-summary.tsx
"use client";

import * as React from "react";
import { Rating } from "@/components/ui/rating";
import { getSellerRatingSummary } from "@/lib/mock-db/reviews";
import type { Seller } from "@/types";

export function SellerRatingSummary({ seller }: { seller: Seller }) {
  const [summary, setSummary] = React.useState({ rating: seller.rating, reviewCount: seller.reviewCount });

  React.useEffect(() => {
    setSummary(getSellerRatingSummary(seller));
  }, [seller]);

  return <Rating value={summary.rating} count={summary.reviewCount} />;
}
```

- [ ] **Step 5: Implement `SellerReviews`**

```tsx
// src/components/marketplace/seller-reviews.tsx
"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { usePathname, Link } from "@/i18n/routing";
import { useAuth } from "@/lib/mock-db/auth-context";
import { getReviewsForSeller, getMyReviewForSeller, upsertReview } from "@/lib/mock-db/reviews";
import { Rating } from "@/components/ui/rating";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import type { Review, Seller } from "@/types";

export function SellerReviews({ seller }: { seller: Seller }) {
  const t = useTranslations("reviews");
  const { user } = useAuth();
  const pathname = usePathname();
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [showSignInPrompt, setShowSignInPrompt] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState("");

  const refresh = React.useCallback(() => {
    setReviews(getReviewsForSeller(seller.id));
  }, [seller.id]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  const isOwnStore = user?.sellerId === seller.id;

  React.useEffect(() => {
    if (user && !isOwnStore) {
      const mine = getMyReviewForSeller(seller.id, user.id);
      if (mine) {
        setRating(mine.rating);
        setComment(mine.comment);
      }
    }
  }, [user, isOwnStore, seller.id]);

  function handleWriteReviewClick() {
    if (!user) {
      setShowSignInPrompt(true);
      return;
    }
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    upsertReview({ sellerId: seller.id, buyerId: user.id, buyerName: user.displayName, rating, comment });
    setShowForm(false);
    refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold tracking-tight text-on-surface">{t("title")}</h2>
        {user?.role !== "admin" && !isOwnStore && (
          <Button variant="subtle" size="sm" onClick={handleWriteReviewClick}>
            {t("writeReviewCta")}
          </Button>
        )}
      </div>

      {showForm && (
        <form className="space-y-3 rounded-xl border border-surface-border bg-surface-low p-4" onSubmit={handleSubmit}>
          <Rating value={rating} editable onChange={setRating} ariaLabel={t("yourRatingAria")} />
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t("commentPlaceholder")} />
          <Button type="submit" size="sm">
            {t("submitReviewCta")}
          </Button>
        </form>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-on-surface-muted">{t("noReviewsYet")}</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-xl border border-surface-border bg-surface p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-on-surface">{review.buyerName}</p>
                <Rating value={review.rating} />
              </div>
              <p className="mt-1 text-xs text-on-surface-muted">{review.comment}</p>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showSignInPrompt}
        onOpenChange={setShowSignInPrompt}
        title={t("signInPromptTitle")}
        description={t("signInPromptBody")}
      >
        <div className="flex justify-end">
          <Button asChild size="sm">
            <Link href={`/sign-in?next=${encodeURIComponent(pathname ?? "/")}`}>{t("signInPromptCta")}</Link>
          </Button>
        </div>
      </Modal>
    </div>
  );
}
```

- [ ] **Step 6: Run the tests to see them pass**

Run: `npx vitest run src/components/marketplace/seller-rating-summary.test.tsx src/components/marketplace/seller-reviews.test.tsx`
Expected: PASS (5 tests)

- [ ] **Step 7: Wire both into `SellerStorefront`**

In `src/components/marketplace/seller-storefront.tsx`, add imports:

```tsx
import { SellerRatingSummary } from "./seller-rating-summary";
import { SellerReviews } from "./seller-reviews";
```

Replace `<Avatar initials={seller.initials} alt={seller.name} size="lg" />` with:

```tsx
<Avatar initials={seller.initials} src={seller.avatarUrl} alt={seller.name} size="lg" />
```

Replace `<Rating value={seller.rating} count={seller.reviewCount} />` with:

```tsx
<SellerRatingSummary seller={seller} />
```

Immediately below the `<p>` showing `{seller.localityLabel} · {seller.specialty}</p>`, add the seller's bio when present:

```tsx
{seller.description && <p className="mt-1.5 text-sm text-on-surface">{seller.description}</p>}
```

Finally, after the listings `<div className="space-y-3">...</div>` block (still inside the outer `<div className="space-y-6">`), add:

```tsx
<SellerReviews seller={seller} />
```

- [ ] **Step 8: Run the full suite**

Run: `npm test`
Expected: PASS. Check whether a `seller-storefront.test.tsx` already exists; if so, it renders `SellerStorefront` directly and will now also mount `SellerReviews`, which calls `useAuth()` — wrap that test's render in `<AuthProvider>` the same way Task 8 did for `SiteHeader`, and add `window.localStorage.clear()` in a `beforeEach`, if not already present.

- [ ] **Step 9: Commit**

```bash
git add src/components/marketplace/seller-rating-summary.tsx src/components/marketplace/seller-rating-summary.test.tsx \
  src/components/marketplace/seller-reviews.tsx src/components/marketplace/seller-reviews.test.tsx \
  src/components/marketplace/seller-storefront.tsx src/i18n/messages/en.json src/i18n/messages/ur.json
git commit -m "feat: add buyer reviews and rating to the seller storefront

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 22: Final verification pass

**Files:** none (verification only).

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: every test across all 21 prior tasks passes, no regressions in pre-existing tests (`site-header.test.tsx`, `combobox.test.tsx`, `listing-card.test.tsx`, `data.test.ts`, etc.).

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors — in particular, confirm every `Seller`/`Listing`/`User`/`Review` literal introduced across tasks satisfies the Task 1 type definitions.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors — in particular, confirm no new native `<select>` or `<input type="checkbox|radio|range">` slipped in outside `src/components/ui/`, and that `src/components/ui/file-upload.tsx`/`multi-file-upload.tsx` don't import from `@/components/marketplace/*` or `@/data/*` (the `ui/` domain-free rule).

- [ ] **Step 4: Manual smoke test**

Per `CLAUDE.md`, never run `npm run build` while `npm run dev` is running. With `npm run dev` running on port 3200: sign up as a customer, log out, register a new seller via `/sell` (fill the map pin), confirm the dashboard shows a Pending Verification badge, add a listing, confirm it appears on the seller's own public storefront, log in as a different customer and leave a review, confirm the rating/review count update on the storefront.

- [ ] **Step 5: Commit any final fixups**

If steps 1-4 surfaced anything, fix it and commit with a message describing what was wrong — do not silently amend prior commits.















