# Listing Detail Page + Seller Storefront — Design

## Context

`ListingCard` on the home page used to carry a WhatsApp/call button directly
on the card. Per updated direction, the card is now a plain link (no
buttons, hover-scale not hover-border) and all contact/detail happens on a
dedicated listing detail page, which also links out to the seller's
storefront (all their other listings). Neither page exists yet — this spec
covers both.

No backend exists. All data — listings, sellers, categories, tehsils —
lives in static fixtures under `src/data/fixtures/`. This feature reads
from those same fixtures; it does not introduce a data layer beyond a thin
lookup module.

## Routes

- `src/app/[locale]/listing/[slug]/page.tsx` — listing detail.
- `src/app/[locale]/seller/[slug]/page.tsx` — seller storefront.

Both are async server components (`setRequestLocale`, matching
`src/app/[locale]/page.tsx`'s existing pattern), each resolving its slug
through the new data-access helpers below and calling `notFound()` (from
`next/navigation`) on a miss. Each renders a client component that holds
the interactive parts (gallery, phone reveal).

next-intl's `createSharedPathnamesNavigation` means no routing.ts changes
are needed for the new paths.

## Data-access layer

New `src/lib/listings.ts`:
- `getListingBySlug(slug: string): Listing | undefined`
- `getListingsBySeller(sellerId: string, options?: { excludeId?: string; limit?: number }): Listing[]`

New `src/lib/sellers.ts`:
- `getSellerBySlug(slug: string): Seller | undefined`
- `getSellerById(id: string): Seller | undefined`

These wrap `LISTINGS`/`SELLERS` from `src/data/fixtures/*`. Pages and
components import from `lib/listings`/`lib/sellers`, never the fixture
arrays directly — isolates "where data comes from" so a future real API
swap touches these two files, not every page/component.

## Components

### `ImageGallery` (new, client) — `src/components/marketplace/image-gallery.tsx`

Purpose-built, not a reuse of `ui/carousel.tsx`: that component is shaped
for the autoplaying hero (uncontrolled internal index, always-on timer) —
wrong fit for a product gallery, which needs manual thumbnail-driven
navigation and no autoplay. `ImageGallery` is its own component:

- Main image + a thumbnail row underneath (click a thumbnail → sets active
  index). Falls back to the existing icon-tile treatment when `images` is
  empty, matching `ListingCard`'s current fallback.
- **Desktop** (`(hover: hover)` media query): hovering the main image shows
  a zoomed lens that follows the cursor — plain CSS `background-image` +
  `background-position` driven by mouse coordinates, no library.
- **Mobile**: tapping the main image opens `Lightbox` (below) at the
  current index.

### `Lightbox` (new, client) — `src/components/ui/lightbox.tsx`

Fullscreen image viewer built directly on `@radix-ui/react-dialog`
(already a dependency, same primitive `Drawer` wraps) rather than
stretching `Drawer` to fit — `Drawer`'s side panels aren't fullscreen.
Dark overlay, image centered, prev/next arrows + swipe, close button.
Shared by `ImageGallery` (mobile tap-to-zoom).

### `PhoneReveal` (new, client) — `src/components/marketplace/phone-reveal.tsx`

Props: `phone`, `listingTitle` (or `sellerName` for the storefront header).
Renders a masked number (e.g. `0316 6XX XXXX` — first 4 and last 4 digits
visible) behind a "Show Number" button. On click, flips `revealed` state
and renders the existing `ContactActions` (WhatsApp + Call) in its place —
that component already exists and is otherwise now unused since its
removal from `ListingCard`.

### Listing detail content — `src/components/marketplace/listing-detail.tsx` (client)

Props: `listing`, `seller`, `otherListings` (already resolved server-side
and passed down, so the client component does no data fetching itself).
Layout: `ImageGallery`, title, `Price`, badge, description, `PhoneReveal`,
a meta row (locality, category, posted date via existing `formatDate`-style
helpers if present, else a simple `Intl.DateTimeFormat`), then a "More from
this seller" strip of up to 5 `ListingCard`s with a link to the full
storefront.

### Seller storefront content — `src/components/marketplace/seller-storefront.tsx` (client or server —
server is fine here, nothing interactive except `PhoneReveal`, so
`PhoneReveal` is the only client leaf)

Seller profile header (`Avatar`, `Rating`, verified `Badge`, specialty,
locality, `PhoneReveal` with the seller's phone) reusing the same
sub-pieces `SellerCard` already uses, then a full grid of that seller's
listings via `ListingCard` (no limit, unlike the "more from this seller"
strip on the detail page).

## Home page tie-in

`SellerCard`'s "Visit Store" button currently opens WhatsApp directly.
Repointed to `Link href={`/seller/${seller.slug}`}` now that a storefront
page exists — the button's own label already says "Visit Store", so this
is the button finally doing what it says rather than a behavior change
users would notice as new.

## Error handling

- Unknown listing slug → `notFound()` → the existing Next.js not-found
  page (framework default unless the repo already has a custom one; not
  introducing one here since none exists in `src/app/[locale]/` today).
- Unknown seller slug → same.
- Listing with no images → `ImageGallery` falls back to the icon tile
  (same fallback `ListingCard` already uses), no magnifier/lightbox shown.
- Seller with zero other listings → "More from this seller" strip is
  omitted entirely rather than rendered empty.

## Testing

- `src/lib/listings.test.ts`, `src/lib/sellers.test.ts` — unit tests for
  the lookup helpers (found/not-found cases, `excludeId`/`limit`).
- `src/app/[locale]/listing/[slug]/page.test.tsx` (or a render test on
  `listing-detail.tsx` directly, matching how `home.test.tsx` tests
  `HomeContent` rather than `page.tsx`) — renders title, price, masked
  phone, reveal-on-click, "more from this seller" links.
- Same shape for the storefront page/component.
- `listing-card.test.tsx` and `tests/home.test.tsx` were already updated in
  the prior (bounded) pass to expect the card as a plain link to
  `/listing/[slug]` — no further change needed there.

## Out of scope

- Real backend/API — fixtures only, as today.
- Reviews/ratings input, messaging inbox, saved listings — none of that
  exists yet and isn't asked for here.
- Map/coordinates display — `Listing.coordinates` exists on the type but
  isn't rendered anywhere today; not adding a map for this pass.
