# Auth flow, seller onboarding, seller dashboard, buyer reviews — design

Status: approved by user 2026-09-12. Implementation phased per section below.

## Context

Repo has zero auth/backend today. Home, listing-detail, and seller-storefront
pages all render from static arrays in `src/data/fixtures/`
(`SELLERS`, `LISTINGS`, taxonomy, tehsils). `src/types/index.ts` has no
`User` or `Review` type. The header ([site-header.tsx](../../../src/components/layout/site-header.tsx))
already links to `/sign-in` ("Sign In / Join") and `/sell` ("Become a Seller")
— routes that don't exist yet. This design fills those in, plus everything
behind them.

Per user decision: **mock-only persistence**, no Supabase this round —
`localStorage`, matching how the rest of the app already runs on fixtures.
Real backend is a future swap, not part of this work.

## A. Mock persistence layer

New `src/lib/mock-db/`:

- `store.ts` — thin `localStorage` wrapper, one JSON blob per key
  (`mb.users`, `mb.sellers`, `mb.listings`, `mb.reviews`, `mb.session`),
  SSR-safe (no-ops on the server, hydrates on mount).
- Runtime data **overlays** fixtures rather than replacing them: reads are
  `[...FIXTURE_SELLERS, ...storedSellers]`, so existing demo storefronts keep
  working untouched.
- `auth-context.tsx` — `AuthProvider` (mounted in `[locale]/layout.tsx`) +
  `useAuth()` exposing `{ user, login, signupCustomer, registerSeller, logout }`.
  Session is just a stored user id; password is a plain-text mock (comment
  says as much) — never a real security boundary.
- `useSellerListings(sellerId)`, `useReviews(sellerId)` — small hooks over
  the store for the dashboard/storefront to consume.

New/changed types in `src/types/index.ts`:

```ts
export type UserRole = "customer" | "seller" | "admin";

export type User = {
  id: string;
  phone: string; // E.164, +92XXXXXXXXXX — the login identity
  password: string; // mock only, plain text
  role: UserRole;
  displayName: string;
  sellerId?: string; // present when role === "seller"
};

export type Review = {
  id: string;
  sellerId: string;
  buyerId: string;
  buyerName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
};

// Listing: add "removed" — decisions.md names Sold/Reserved/Removed as the
// three manual seller actions; only "removed" was missing from the enum.
export type ListingStatus = "active" | "reserved" | "sold" | "removed";

// Seller: add fields the registration form now collects.
export type Seller = {
  // ...existing fields
  description: string;
  avatarUrl?: string;
};
```

Testing: `mock-db` gets unit tests against a fake `localStorage` (vitest
already configures jsdom) — seed/overlay merge, login/logout, signup
creating a `User` + linked `Seller`.

## B. Auth screens & routing

- `/[locale]/sign-in` — one page, two tabs: **Sign In** and **Create
  Account**. Both take phone (fixed `+92` prefix, matches decisions.md) +
  password. Sign In checks against stored users; Create Account makes a
  `role:"customer"` user. Redirect: seller → `/seller/dashboard/listings`,
  customer/admin → the page they came from (`?next=`) or home.
- `/[locale]/sell` — seller registration. If already signed in as a
  customer, phone is prefilled and read-only and the password field is
  skipped ("upgrade this account to a seller"); otherwise it's a fresh
  phone+password+profile form. Fields: store name, description, phone
  (store contact, prefilled from login phone but editable — decisions.md
  keeps them separate), tehsil → locality (existing cascading selects),
  map pin (section below), avatar (optional, local file preview via
  `URL.createObjectURL`, no real upload), banner (optional, same). Submits
  to `registerSeller()`, which creates `Seller{verified:false}` +
  `User{role:"seller"}`, then redirects to the dashboard with a
  "Pending verification" banner.
- Header: `AuthProvider`-aware — logged out keeps today's Sign In / Become a
  Seller; logged in shows an avatar dropdown (`Avatar` + `DropdownMenu`,
  already in the UI kit) with My Storefront (sellers, → `/seller/[slug]`) /
  Home and Logout. No account-settings page this round.
- Route guard: a small `RequireSeller` wrapper (or a `useEffect` redirect in
  each dashboard page) sends unauthenticated or non-seller visitors to
  `/sign-in?next=<path>`.
- No Turnstile (nothing behind it to protect in a mock), no forgot-password
  (decisions.md: not built), no email/OTP anywhere.

## C. Map pin picker

`location-map.tsx` today is a read-only Google `output=embed` iframe —
fine for display, but an iframe can't report drag events back to the page,
so it can't serve as a picker. Decisions.md already commits the stack to
**Leaflet + OpenStreetMap** for map queries; this adds the actual
dependency (`leaflet`, `react-leaflet`) for the one interactive use so far:

- `map-pin-picker.tsx` (new, client-only, dynamic-imported to avoid SSR
  issues with Leaflet's `window` access) — OSM tile layer, one draggable
  marker, defaults to the chosen locality's approximate center, emits
  `{ lat, lng }` on drag-end. Used only in the seller registration/profile
  form.
- The read-only `LocationMap` (storefront/listing display) is unchanged.

## D. Seller dashboard

Shell at `/[locale]/seller/dashboard/*`, guarded, tab nav (Listings /
Profile), reusing existing `Tabs` component.

- **Profile tab** — the same field set as `/sell`'s form, prefilled from
  the seller's current record, saves in place. Shows a
  Pending-verification / Verified `Badge` next to the store name.
- **Listings tab** — the seller's own listings only
  (`getListingsBySeller` already exists), status-filter tabs (Active /
  Reserved / Sold / Removed), each row: thumbnail, title, price, status
  `Badge`, actions (Edit, Mark Reserved, Mark Sold, Remove — a `Dropdown
  Menu` or inline buttons). "Add Listing" button.
- **New/Edit listing** — `/[locale]/seller/dashboard/listings/new` and
  `/[locale]/seller/dashboard/listings/[id]/edit`, one form: title,
  description, price, compareAtPrice (optional), category → subcategory
  (existing cascading pattern from the header's taxonomy), tehsil →
  locality, images (multi, local-preview-only, matches avatar/banner
  approach), contact phone (prefilled from the seller's store phone).
  Create/update writes to the mock store; edit loads the existing row and
  404s (`notFound()`) if it isn't this seller's.

## E. Buyer reviews

On `SellerStorefront` ([seller-storefront.tsx](../../../src/components/marketplace/seller-storefront.tsx)):

- New Reviews section under the listings grid: existing `Rating` summary
  (already shown in the header block) stays; below the listings, a review
  list (reviewer display name, `Rating` (read-only), date, comment) plus a
  "Write a Review" button.
- Logged out → button opens a `Modal` prompting Sign In / Create Account,
  returning to the same storefront (`?next=`) after.
- Logged in as customer → button reveals an inline form: `Rating`
  (`editable`) + `Textarea` comment + submit. On submit: append `Review`,
  recompute `seller.rating` (average) and `reviewCount` in the mock store,
  storefront re-renders with the new totals.
- Logged in as the seller themself, or as `admin` → button hidden (can't
  review your own store).
- One review per buyer per seller — resubmitting edits their existing
  review instead of adding a second.

## Error handling

- Login/signup: inline `FormField` errors (wrong phone/password format,
  phone already registered, password too short — decisions.md's ≥8 chars,
  no other composition rules).
- Seller registration / listing forms: required-field validation inline;
  no cross-field validation beyond what the types demand.
- Route guards redirect rather than error-page — a logged-out visitor
  hitting `/seller/dashboard/*` directly just lands on `/sign-in`.

## Testing

Vitest + Testing Library, matching existing `*.test.tsx` conventions
throughout `src/components`:
- `mock-db` unit tests (store, auth-context reducer logic).
- Sign-in/sign-up form tests: validation, successful login redirect,
  duplicate-phone rejection.
- Seller registration: required fields, pending-verification state on the
  created seller.
- Dashboard: listing status transitions, edit-guard (can't edit another
  seller's listing).
- Reviews: gated to signed-in customers, aggregate rating recompute,
  one-review-per-buyer overwrite.

## Out of scope (unchanged from decisions.md)

Real Supabase wiring, email/OTP, password reset, admin verification UI,
Cloudinary uploads, transactional email, account-settings page.
