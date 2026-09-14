# MalakandBazaar — Production Backend & Integration Plan

Status: proposed · Author: Claude Opus 5 · Date: 2026-09-13

This plan takes the app from "fixtures + `localStorage` mock" to a real,
production-grade marketplace: Postgres schema, an authenticated HTTP API,
server-enforced authorization, and a phase-by-phase front-end swap where every
mock is deleted the moment its real replacement lands.

---

## 0. Where the app actually is today

| Layer | Today | Reality check |
|---|---|---|
| Data | `src/data/fixtures/listings.ts` (15 hard-coded listings), `fixtures/sellers.ts` (5 sellers) | Shipped in the JS bundle. Must go. |
| "Backend" | `src/lib/mock-db/*` → `window.localStorage` | Per-browser. No sharing, no durability. |
| Auth | `mock-db/auth.ts`, plain-text passwords, `mb.session` key | Trivially bypassed from devtools. |
| Route guard | `use-require-seller.ts` — a `useEffect` redirect | Client-side only. The page renders first, then redirects. |
| Search | `src/lib/search.ts` filters the 15-item array in memory | No pagination, no relevance, no index. |
| Views | not tracked | New requirement. |
| Ranking | `sort: "relevant"` returns insertion order | New requirement. |
| Middleware | `next-intl` locale routing only | No auth, no security headers, no CSP. |
| Images | `fileToDataUrl` → base64 into `localStorage` | Will blow the 5 MB quota on the 3rd listing. |
| API routes | none (`src/app/api` does not exist) | Everything below is greenfield. |

Dead links that 404 today and must exist at launch: `/sellers`, `/help`,
`/help/safe-trading`, `/help/verified-sellers`, `/help/livestock-health`,
`/help/vehicle-ncp`, `/legal/privacy`, `/legal/terms`.

---

## 1. Architecture decisions

### 1.1 Runtime

Next.js App Router **Route Handlers** under `src/app/api/**` (Node runtime) are
the backend. No separate service. Server Components call the data layer
directly (`src/server/services/*`) — no HTTP hop for SSR; Client Components
call the same logic over `/api`. One implementation, two entry points.

```
src/server/
  db.ts                 Supabase service-role client (server-only)
  auth/                 jwt.ts · password.ts · session.ts · guard.ts · csrf.ts
  services/             listings.ts · sellers.ts · reviews.ts · views.ts · uploads.ts
  http/                 respond.ts (envelope) · errors.ts · rate-limit.ts · validate.ts
  schemas/              zod request/response schemas (shared with client types)
```

### 1.2 Auth: custom JWT, not Supabase Auth — **deviation from `docs/decisions.md`**

`docs/decisions.md` specifies "Supabase Auth phone provider with phone
confirmations disabled". Supabase's phone provider **requires a configured SMS
provider (Twilio/MessageBird/Vonage) before it can be enabled** — there is no
"phone signup with no SMS vendor" path. The decision as written cannot be
implemented without buying an SMS vendor.

Chosen instead: **our own JWT auth over the `users` table.** It satisfies
"authentication in the backend so no one can bypass", gives a textbook
access/refresh flow, costs nothing, and keeps phone-only signup exactly as
specified. Trade-off accepted: we own password hashing and session rotation
(both standard, both specified below) instead of delegating to Supabase.

Consequence: the browser **never** talks to Supabase. Only our server holds the
service-role key. RLS is enabled with **zero policies** (deny-all) on every
table as defence in depth — if the anon key ever leaked it reads nothing.

### 1.3 Images: Cloudinary, per `docs/decisions.md`

Phase 6 shipped this section as Supabase Storage instead — one vendor rather
than two, and `next/image` already did the resizing/AVIF work Cloudinary was
wanted for. Reverted back to Cloudinary shortly after, on request, exactly
along the seam this section already called out below: only
`src/server/services/uploads.ts`, `src/server/storage.ts` and the
`listing_images.path` prefix (a Cloudinary `public_id` now, same column) changed.

Uploads go through our API (auth + size check; format/EXIF/dimension
verification described below), which returns a **signed set of upload
params** for one Cloudinary `public_id`; the browser POSTs directly to
Cloudinary so image bytes never pass through the serverless function — same
principle as the Storage PUT, different vendor. `allowed_formats` (signed, so
the browser cannot widen it) rejects anything that doesn't decode as one of
the four raster formats; a signed incoming `transformation: "a_exif"` bakes
in EXIF-orientation rotation and, as a re-encode side effect, strips the
original file's metadata. `POST /api/uploads/commit` re-reads the asset's
real width/height/bytes from Cloudinary's Admin API rather than trusting the
browser's upload response, and enforces the size/dimension caps.

Consequence for Storage: the `media` Supabase Storage bucket provisioned in
migration `0018_storage_bucket.sql` is no longer used by the app. Left in
place rather than dropped via a raw `storage.buckets` delete (Supabase
recommends deleting a bucket through the Storage API/dashboard, not SQL) —
it's empty and costs nothing; delete it from the dashboard if you want it
gone.

### 1.4 Everything else

- **DB:** Supabase Postgres. PostGIS for the map radius filter. `pg_cron` for
  the ranking refresh. `citext` for case-insensitive slugs/phones. `pg_trgm` +
  `tsvector` for search.
- **Access:** `@supabase/supabase-js` with the service-role key for simple
  CRUD; heavy read paths (search + facets, home payload) are single
  `plpgsql` functions called via `.rpc()` so one network round trip returns
  rows *and* facet counts.
- **Validation:** `zod` on every request body, query string and route param.
  Nothing untyped reaches SQL.
- **Deploy:** Vercel (Node runtime, `iad1`/`fra1` — pick the region nearest the
  Supabase project and pin both).

---

## 2. Complete API surface

Conventions for every endpoint:

- Envelope: `{ ok: true, data, meta? }` / `{ ok: false, error: { code, message, fields? } }`.
- `code` is a stable machine string (`AUTH_INVALID_CREDENTIALS`, `RATE_LIMITED`,
  `VALIDATION_FAILED`, `NOT_FOUND`, `FORBIDDEN`, `CONFLICT`, `INTERNAL`).
- Auth column: `—` public · `U` any signed-in user · `S` seller · `A` admin.
- Every mutating endpoint requires the CSRF header (§3.4) and is rate limited.
- List endpoints take `limit` (default 24, max 60) and either `cursor` (keyset,
  for feeds) or `page` (offset, for the numbered `/search` pager, capped at
  page 100).

### 2.1 Auth & account — `/api/auth/*`

| # | Method | Path | Auth | Purpose |
|---|---|---|---|---|
| 1 | POST | `/api/auth/signup` | — | phone + password + displayName + Turnstile token → user + session |
| 2 | POST | `/api/auth/login` | — | phone + password → access + refresh |
| 3 | POST | `/api/auth/refresh` | cookie | rotate refresh token, issue new access token |
| 4 | POST | `/api/auth/logout` | U | revoke current session |
| 5 | POST | `/api/auth/logout-all` | U | revoke every session in the family |
| 6 | GET | `/api/auth/me` | U | user + role + seller summary (dashboard bootstrap) |
| 7 | PATCH | `/api/auth/me` | U | displayName, recovery_email |
| 8 | POST | `/api/auth/change-password` | U | old + new; revokes all other sessions |
| 9 | GET | `/api/auth/sessions` | U | active devices (UA, last seen, created) |
| 10 | DELETE | `/api/auth/sessions/:id` | U | revoke one device |
| 11 | POST | `/api/auth/phone-available` | — | signup UX check; heavily rate limited, no enumeration signal beyond boolean |
| 12 | DELETE | `/api/auth/me` | U | account deletion (soft: anonymise, unpublish listings) |

Deferred to post-launch (no SMTP at launch, per `decisions.md`):
`POST /api/auth/forgot-password`, `POST /api/auth/reset-password`. The
`recovery_email` column ships now so no migration is needed later.

### 2.2 Reference data — cached hard

| # | Method | Path | Auth | Notes |
|---|---|---|---|---|
| 13 | GET | `/api/categories` | — | full 26 → 444 tree, `Cache-Control: public, s-maxage=86400, stale-while-revalidate` |
| 14 | GET | `/api/categories/:slug` | — | one branch + live listing counts |
| 15 | GET | `/api/tehsils` | — | 3 tehsils + localities |
| 16 | GET | `/api/config` | — | launch thresholds, support phone, feature flags, min app version |

### 2.3 Listings — public read

| # | Method | Path | Auth | Notes |
|---|---|---|---|---|
| 17 | GET | `/api/listings` | — | the browse/search workhorse. Params: `q, category, subcategory, tehsil[], locality, minPrice, maxPrice, verifiedOnly, availability, sellerId, near(lat,lng,km), sort, page\|cursor, limit`. Returns `items[] + facets{category,tehsil,priceBuckets} + total + pageInfo`. Single RPC. |
| 18 | GET | `/api/listings/:slug` | — | detail + seller card + image set. |
| 19 | GET | `/api/listings/:slug/related` | — | same subcategory → same category → same tehsil, ranked, excludes self. |
| 20 | GET | `/api/listings/:slug/seller-others` | — | other live listings from the same seller (detail page rail). |
| 21 | POST | `/api/listings/:id/view` | — | **+1 per landing**, no identity stored. Fire-and-forget, `202`. §5. |
| 22 | POST | `/api/listings/:id/contact-click` | — | `{ channel: "whatsapp" \| "call" \| "copy" }` → seller analytics. No identity. |
| 23 | GET | `/api/listings/suggest` | — | typeahead: titles (trigram) + category names, ≤ 8 rows, 30 ms budget. |
| 24 | GET | `/api/listings/trending` | — | top by 7-day view velocity. |
| 25 | GET | `/api/home` | — | **one** call for the whole homepage: readiness flags, shelves, top sellers, counters. §6. |

### 2.4 Sellers — public read

| # | Method | Path | Auth | Notes |
|---|---|---|---|---|
| 26 | GET | `/api/sellers` | — | directory (`/sellers` page). Sort default `rating` (Bayesian, §7), filters: tehsil, category, verified, `q`. Paginated. |
| 27 | GET | `/api/sellers/:slug` | — | storefront header + stats (listing count, rating, member since, response time). |
| 28 | GET | `/api/sellers/:slug/listings` | — | paginated, status filter, seller-scoped sort. |
| 29 | GET | `/api/sellers/:slug/reviews` | — | paginated, newest first, rating histogram in `meta`. |
| 30 | GET | `/api/sellers/top` | — | homepage widget; rating-ranked, gated by readiness threshold. |

### 2.5 Reviews & ratings

| # | Method | Path | Auth | Notes |
|---|---|---|---|---|
| 31 | POST | `/api/sellers/:id/reviews` | U | 1–5 + comment. One per (buyer, seller) — `409 CONFLICT` on repeat. Self-review rejected. |
| 32 | PATCH | `/api/reviews/:id` | U | own review only. |
| 33 | DELETE | `/api/reviews/:id` | U/A | own, or admin moderation. |
| 34 | GET | `/api/me/reviews` | U | reviews I wrote (account page). |

### 2.6 Favourites (saved listings)

| # | Method | Path | Auth | Notes |
|---|---|---|---|---|
| 35 | GET | `/api/me/favorites` | U | paginated, joins live listing data. |
| 36 | POST | `/api/me/favorites` | U | `{ listingId }`, idempotent. |
| 37 | DELETE | `/api/me/favorites/:listingId` | U | |

### 2.7 Trust & safety

| # | Method | Path | Auth | Notes |
|---|---|---|---|---|
| 38 | POST | `/api/reports` | — / U | report a listing, seller or review. Reason enum drawn from the "Prohibited" list in `docs/taxonomy.md`. Anonymous allowed, rate limited by IP hash. |

### 2.8 Seller workspace — `/api/seller/*` (role `seller`)

| # | Method | Path | Auth | Notes |
|---|---|---|---|---|
| 39 | POST | `/api/seller/register` | U or — | become a seller: creates the seller row, promotes `users.role`, re-issues the access token with the new role. Works both for a signed-in customer and a fresh signup in one call. |
| 40 | GET | `/api/seller/me` | S | my profile (private fields included). |
| 41 | PATCH | `/api/seller/me` | S | name, description, phone, tehsil, locality, coordinates, avatar, banner. Slug is **not** user-editable after creation (link stability). |
| 42 | GET | `/api/seller/listings` | S | my listings; filters status/moderation, search, sort, paginated. |
| 43 | POST | `/api/seller/listings` | S | create. Server owns slug, `created_at`, `status`, `moderation_status`. |
| 44 | GET | `/api/seller/listings/:id` | S | ownership-checked fetch for the edit form. |
| 45 | PATCH | `/api/seller/listings/:id` | S | update; re-enters moderation if title/description/price changed materially. |
| 46 | PATCH | `/api/seller/listings/:id/status` | S | `active \| reserved \| sold \| removed`. |
| 47 | DELETE | `/api/seller/listings/:id` | S | soft delete (`removed` + `deleted_at`), keeps analytics history. |
| 48 | POST | `/api/seller/listings/:id/images/reorder` | S | `{ ids: [] }` → sort order. |
| 49 | DELETE | `/api/seller/listings/:id/images/:imageId` | S | |
| 50 | GET | `/api/seller/analytics` | S | views + contact clicks by day (30/90 d), per-listing table, totals. Pure aggregates, zero buyer identity. |
| 51 | POST | `/api/uploads/sign` | U | `{ kind: "listing"\|"avatar"\|"banner", contentType, size }` → signed PUT URL + object path. Enforces ≤ 5 MB, `image/jpeg\|png\|webp\|avif`. |
| 52 | POST | `/api/uploads/commit` | U | verifies the object exists, reads dimensions, records `listing_images` / profile path. Orphans are swept nightly. |

### 2.9 Admin — `/api/admin/*` (role `admin`)

| # | Method | Path | Notes |
|---|---|---|---|
| 53 | GET | `/api/admin/stats` | users, sellers, listings by status, reports open, views today |
| 54 | GET | `/api/admin/listings` | moderation queue (`pending` first) |
| 55 | PATCH | `/api/admin/listings/:id/moderate` | `approve \| reject(reason) \| takedown` |
| 56 | GET | `/api/admin/sellers` | directory + verification state |
| 57 | PATCH | `/api/admin/sellers/:id/verify` | grant / revoke the Verified badge |
| 58 | GET | `/api/admin/reports` · 59 `PATCH /api/admin/reports/:id` | triage queue |
| 60 | GET | `/api/admin/users` · 61 `PATCH /api/admin/users/:id` | suspend / restore / change role |
| 62 | GET | `/api/admin/audit-log` | every privileged action, immutable |

### 2.10 System & SEO (not under `/api`)

| # | Path | Notes |
|---|---|---|
| 63 | `GET /api/health` | DB ping + build SHA; uptime monitor target |
| 64 | `GET /robots.txt` | generated; blocks `/seller/dashboard`, `/api`, `/sign-in` |
| 65 | `GET /sitemap.xml` + `/sitemaps/listings-[n].xml` | paged, 50 k URLs per file, from the DB |
| 66 | `GET /opengraph-image` per listing/seller route | dynamic OG cards |
| 67 | `GET /manifest.webmanifest` | PWA basics |

**67 endpoints total.** Nothing in this list is optional-for-a-marketplace
except the deferred password-reset pair and the OG image route.

---

## 3. Authentication & authorization design

### 3.1 Credentials

- Phone is the identity, stored E.164 in a `citext` unique column.
  `src/lib/phone.ts` already normalises `03001234567` → `+923001234567`; that
  same normaliser runs **server-side** before every lookup and insert.
- Password: **Argon2id** via `@node-rs/argon2` (prebuilt binaries, no build
  step) — `m=19456 KiB, t=2, p=1` (OWASP 2024 baseline). Minimum 8 characters
  per `decisions.md`, no composition rules.
- Login is constant-time-ish: an unknown phone still runs a dummy verify so
  timing doesn't leak registration state.
- Throttling: 5 failed attempts per phone in 15 min → `locked_until` +15 min,
  exponential thereafter. Separately, 20 attempts/IP-hash/15 min.
- **Cloudflare Turnstile** on signup and seller registration (free, per
  `decisions.md`).

### 3.2 Tokens

| Token | Form | TTL | Storage | Rotation |
|---|---|---|---|---|
| Access | JWT HS256 (`jose`), claims `sub, role, sid, sellerId, iat, exp, iss, aud` | **15 min** | `mb_at` cookie: `HttpOnly; Secure; SameSite=Lax; Path=/` | re-minted on refresh |
| Refresh | 256-bit opaque random, **SHA-256 hash stored** (never the plaintext) | **30 days** | `mb_rt` cookie: `HttpOnly; Secure; SameSite=Strict; Path=/api/auth` | rotated on every use |

Refresh rotation with **reuse detection**: each session row carries a
`family_id`. Using a refresh token marks it `replaced_by`; presenting an
already-replaced token revokes the **entire family** and forces re-login. That
is the standard containment for a stolen refresh token.

The access token is deliberately short so a role change (customer → seller,
admin suspension) takes effect within 15 minutes; privileged endpoints
additionally re-read `users.status` from the DB, so a ban is instant.

Why a cookie and not `localStorage`: `localStorage` is readable by any XSS.
`HttpOnly` is not.

### 3.3 Enforcement — two independent layers

1. **`src/middleware.ts`** (edge): verifies the access JWT signature and
   expiry, then gates route *prefixes* — `/seller/dashboard/**` needs role
   `seller`, `/admin/**` needs `admin`, `/account/**` needs any user.
   Unauthenticated → `307` to `/{locale}/sign-in?next=…`. This kills the
   current flash-then-redirect behaviour of `use-require-seller.ts`.
2. **`requireUser()` / `requireSeller()` / `requireAdmin()`** inside **every**
   handler and every Server Component data call. Middleware is UX, not a
   security boundary — a direct `fetch` to `/api/seller/listings` is checked in
   the handler regardless.

Ownership is checked in SQL, not in JS: every seller-scoped mutation carries
`AND seller_id = $currentSellerId` in its `WHERE` clause, so an IDOR attempt
updates zero rows rather than being caught by a forgotten `if`.

### 3.4 CSRF, XSS and headers (the middleware the request asks for)

- **CSRF:** double-submit. A non-`HttpOnly` `mb_csrf` cookie is set at session
  start; every `POST/PATCH/PUT/DELETE` must echo it in `X-CSRF-Token`, and the
  `Origin` header must match the configured host. Requests failing either get
  `403 CSRF_FAILED`. (`SameSite` alone is not enough — it's a defence, not the
  defence.)
- **CSP** (nonce-based, set in middleware, nonce threaded through the root
  layout):
  `default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob: https://<project>.supabase.co; connect-src 'self' https://<project>.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'; upgrade-insecure-requests`
- Plus `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `X-Frame-Options: DENY`, `Permissions-Policy: geolocation=(self), camera=(), microphone=()`,
  `Cross-Origin-Opener-Policy: same-origin`.
- **Stored-XSS:** all user text (titles, descriptions, reviews, store bios) is
  rendered as React text nodes — never `dangerouslySetInnerHTML`. On write it
  is additionally stripped of control characters and zero-width/bidi-override
  codepoints (an RTL app is a bidi-spoofing target) and length-capped. An
  ESLint rule bans `dangerouslySetInnerHTML` repo-wide.
- **Open redirect:** the `?next=` parameter is validated as a same-origin,
  locale-prefixed path before any redirect.
- **Rate limiting:** Postgres token bucket (`fn_rate_limit(key, limit, window)`,
  one `INSERT … ON CONFLICT` round trip). Buckets: auth 10/min/IP, write
  30/min/user, view-ping 60/min/IP, read 300/min/IP. `429` + `Retry-After`.
- **Logging:** structured request log with `requestId`, never a password, token,
  full phone or precise IP — IPs are stored only as
  `sha256(ip + rotating_daily_salt)`.

---

## 4. Database schema

Extensions: `citext`, `pg_trgm`, `postgis`, `pgcrypto`, `pg_cron`.
RLS **enabled with no policies** on every table; the service role is the only
reader/writer.

### 4.1 Tables

```sql
-- identity ------------------------------------------------------------------
users(
  id uuid pk default gen_random_uuid(),
  phone citext unique not null,              -- E.164
  password_hash text not null,
  role user_role not null default 'customer',-- customer|seller|admin
  display_name text not null,
  recovery_email citext,                     -- optional, unverified
  status user_status not null default 'active', -- active|suspended|deleted
  failed_login_count int not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
)

sessions(
  id uuid pk, user_id uuid fk→users on delete cascade,
  family_id uuid not null,
  refresh_hash bytea unique not null,        -- sha256(plaintext)
  user_agent text, ip_hash text,
  created_at timestamptz, last_used_at timestamptz,
  expires_at timestamptz not null,
  revoked_at timestamptz, replaced_by uuid
)

-- taxonomy (seeded from src/data/*, single source of truth moves to the DB) --
categories(slug citext pk, parent_slug citext fk→categories, name_en, name_ur,
           icon text, sort int, is_active bool default true)
tehsils(slug citext pk, name_en, name_ur, revenue_tehsil text, sort int)
localities(slug citext pk, tehsil_slug citext fk→tehsils, name_en, name_ur, sort int)

-- marketplace ---------------------------------------------------------------
sellers(
  id uuid pk, user_id uuid unique fk→users,
  slug citext unique not null,
  name text not null, description text,
  phone text not null,                       -- store contact, separate from login
  tehsil_slug citext fk, locality_slug citext fk, locality_label text,
  coordinates geography(Point,4326),
  avatar_path text, banner_path text,
  verified bool default false, verified_at timestamptz,
  rating_avg numeric(3,2) default 0,         -- maintained by trigger
  rating_count int default 0,
  rating_score double precision default 0,   -- Bayesian, §7 — the sort key
  listing_count int default 0,
  view_count bigint default 0,
  response_minutes int default 30,
  status seller_status default 'active',
  created_at, updated_at
)

listings(
  id uuid pk, slug citext unique not null,
  seller_id uuid fk→sellers on delete cascade,
  title text not null, description text not null,
  price numeric(12,2) not null check (price > 0),
  compare_at_price numeric(12,2),
  category_slug citext fk, subcategory_slug citext fk,
  tehsil_slug citext fk, locality_slug citext fk, locality_label text,
  coordinates geography(Point,4326),
  status listing_status default 'active',     -- active|reserved|sold|removed
  moderation_status moderation_status default 'approved', -- pending|approved|rejected
  rejection_reason text,
  view_count bigint default 0,
  contact_count bigint default 0,
  rank_score double precision default 0,      -- §6 — the default sort key
  attributes jsonb default '{}'::jsonb,       -- per decisions.md, unused for now
  search_vector tsvector generated always as (
    setweight(to_tsvector('simple', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(locality_label,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(description,'')), 'C')) stored,
  published_at timestamptz, deleted_at timestamptz,
  created_at, updated_at
)

listing_images(id uuid pk, listing_id uuid fk on delete cascade,
               path text not null, width int, height int, sort int default 0,
               created_at)

reviews(id uuid pk, seller_id uuid fk, buyer_id uuid fk→users,
        rating smallint check (rating between 1 and 5), comment text,
        status review_status default 'visible',
        created_at, updated_at,
        unique(seller_id, buyer_id))

favorites(user_id uuid, listing_id uuid, created_at, primary key(user_id, listing_id))

-- analytics (no personal data anywhere in here) ------------------------------
listing_view_daily(listing_id uuid, day date, views int default 0,
                   primary key(listing_id, day))
listing_contact_daily(listing_id uuid, day date, channel contact_channel,
                      count int default 0, primary key(listing_id, day, channel))
seller_view_daily(seller_id uuid, day date, views int default 0,
                  primary key(seller_id, day))

-- ops -----------------------------------------------------------------------
reports(id uuid pk, reporter_id uuid null, target_type report_target,
        target_id uuid, reason report_reason, note text,
        status report_status default 'open', resolved_by uuid, resolved_at,
        created_at)
rate_limits(key text pk, window_start timestamptz, count int)
audit_log(id bigserial pk, actor_id uuid, action text, target_type text,
          target_id uuid, meta jsonb, created_at)
settings(key text pk, value jsonb, updated_at)   -- launch thresholds, flags
```

### 4.2 Indexes (the thing that makes it fast)

```sql
-- the default browse path: one index serves it
create index on listings (status, moderation_status, rank_score desc, id desc)
  where deleted_at is null;
create index on listings (category_slug, status, rank_score desc, id desc)
  where deleted_at is null;
create index on listings (subcategory_slug, status, rank_score desc, id desc)
  where deleted_at is null;
create index on listings (tehsil_slug, status, rank_score desc, id desc)
  where deleted_at is null;
create index on listings (seller_id, created_at desc);
create index on listings (price) where status = 'active';
create index on listings using gin (search_vector);
create index on listings using gin (title gin_trgm_ops);   -- typeahead
create index on listings using gist (coordinates);          -- near-me
create index on listings (created_at desc) where status = 'active';

create index on sellers (rating_score desc, rating_count desc)
  where status = 'active';
create index on sellers using gist (coordinates);
create index on reviews (seller_id, created_at desc) where status = 'visible';
create index on listing_view_daily (day desc);
create index on favorites (user_id, created_at desc);
create index on sessions (user_id) where revoked_at is null;
create index on sessions (expires_at);
```

### 4.3 Functions & triggers

| Object | Job |
|---|---|
| `fn_rank_score(views bigint, created_at timestamptz)` | `(views + 1) / power(hours_since + 2, 1.4)` — views lift, age decays. §6 |
| `fn_bump_view(listing_id uuid)` | atomic `view_count + 1`, recompute `rank_score`, upsert `listing_view_daily` — one statement |
| `fn_refresh_rank_scores()` | `pg_cron` every 10 min: recompute `rank_score` for every active listing so age decay actually moves |
| `trg_reviews_aggregate` | on review insert/update/delete → recompute `sellers.rating_avg`, `rating_count`, `rating_score` |
| `trg_listing_count` | keeps `sellers.listing_count` accurate |
| `trg_updated_at` | generic `updated_at` stamp |
| `fn_unique_slug(base text, table regclass)` | server-side slug generation with collision suffix |
| `fn_search_listings(...)` | the §2.3-17 workhorse: rows + facet counts + total in **one** call |
| `fn_home_payload(locale text)` | the §2.3-25 homepage: every shelf, top sellers and readiness flag in **one** call |
| `fn_rate_limit(key, limit, window)` | token bucket |
| `fn_sweep()` | nightly: expired sessions, orphaned uploads, stale rate-limit rows, view-daily rows > 400 d |

### 4.4 Migrations

Plain SQL files in `supabase/migrations/NNNN_name.sql`, applied with the
Supabase CLI, committed to git. Seed script
`supabase/seed/001_taxonomy.sql` is **generated** from `docs/taxonomy.md` and
`src/data/tehsils.ts` by extending `scripts/generate-categories.mjs` — so the
26/444 taxonomy stays authored in markdown and lands in Postgres. This is seed
*reference* data, not dummy content.

---

## 5. View tracking (requirement: count every landing, store nothing personal)

- `POST /api/listings/:id/view` fires from the detail page on mount
  (`keepalive`, no await, no UI dependency) and from the server render as a
  fallback for JS-off clients.
- Handler: bot-UA filter → `fn_bump_view()` → `202 Accepted`. One statement,
  no read-modify-write, no row lock held across a round trip.
- **Nothing about the viewer is written.** No user id, no IP, no cookie, no
  fingerprint. The only rows produced are a counter increment and a
  `(listing_id, day, count)` aggregate.
- IP is used *transiently* for rate limiting (hashed with a daily rotating
  salt, never stored) purely to stop a script inflating a listing to the top.
  That is the one guard; a genuine repeat visit still counts every time, as
  specified.
- `seller_view_daily` gets the same treatment for storefront landings.

---

## 6. Ranking & the "empty until real" homepage

### 6.1 Default order

`rank_score = (view_count + 1) / (hours_since_published + 2)^1.4`

So: views push a listing up; nothing floats at the top purely because it was
posted last. A brand-new listing starts at ~0.4 and needs a handful of views to
hold position — exactly the requested behaviour. The exponent lives in
`settings` and is tunable without a deploy.

`rank_score` is a stored column with an index, refreshed on every view and by
`pg_cron` every 10 minutes, so ordering is a plain index scan — no per-request
math, no sort of the whole table.

Explicit user sorts (`price_asc`, `price_desc`, `newest`, `oldest`) override
it; `relevance` becomes `ts_rank_cd(search_vector, query) * 0.7 + normalised
rank_score * 0.3` when `q` is present.

### 6.2 Top sellers

`rating_score = (C·m + Σratings) / (C + n)` with `m` = platform mean rating,
`C` = 5 (prior weight, in `settings`). One 5★ review scores below a 4.6★ with
40 reviews — correct, and it removes the gaming incentive. Ties break on
`rating_count desc`. Sellers with `listing_count = 0` are excluded from the
homepage widget.

### 6.3 Launch readiness gates — no empty shelves, no fake shelves

`GET /api/home` returns a `readiness` block computed from thresholds in
`settings`:

| Section | Shows only when |
|---|---|
| Category shelf | ≥ 8 active approved listings in that category |
| Top sellers | ≥ 4 active sellers with ≥ 1 review each |
| Trending | ≥ 20 listings have ≥ 1 view in the last 7 days |
| Hero promo tiles | always (they are brand content, not listings) |

Below a threshold the section is **not rendered at all** — no skeletons
pretending, no placeholder cards. The homepage falls back to a real,
honestly-worded launch state ("Malakand's marketplace is opening — list the
first item in your category") plus the category grid, which is genuine
navigation and valid with zero listings. `/search` with no results gets the
same treatment via the existing `EmptyState` component.

---

## 7. Loaders

Two components, both in `src/components/ui/`, both built from the existing
`BrandLogo` mark:

- **`<Spinner size="sm|md|lg" />`** — the small-task loader. The logo mark at
  reduced opacity inside a `conic-gradient` ring that sweeps (`brand-600`
  → transparent), masked to a 2px annulus, `1.1 s` linear rotation. Used inside
  buttons (with `aria-busy`), in table rows, beside inline actions.
- **`<FullscreenLoader label? />`** — the overlay. `backdrop-blur-sm` over
  `background/80`, centred 96px medallion: logo mark in a `brand-50` disc, a
  `brand-200` track ring, and a `brand-600` arc sweeping over it, with a second
  slower counter-rotating arc in `tertiary` for depth, plus a soft pulsing
  halo. Optional label underneath in `on-surface-muted`. Rendered through a
  portal, `role="status"` + `aria-live="polite"`, focus trapped, `Esc`
  disabled. Honours `prefers-reduced-motion` (arc stops, opacity pulse only).

Colours are strictly from `docs/palette.md` — `brand-600` for the active arc
(it is an interactive-state affordance, the default answer), `brand-800` never
used here.

Used with: route-level `loading.tsx` for every segment, `Suspense` boundaries
with real content-shaped skeletons on the search grid and detail page, and a
global `useNavigationLoader` that shows the fullscreen loader for cross-page
transitions over 300 ms.

---

## 8. Dummy / development data removal

Deleted outright (each in the phase that replaces it, never before):

- `src/data/fixtures/listings.ts`, `src/data/fixtures/sellers.ts`, `src/data/data.test.ts`
- `src/lib/mock-db/**` (10 files + tests), `src/lib/listings.ts`, `src/lib/sellers.ts`,
  `src/lib/search.ts` (logic moves into SQL), `src/lib/file-to-data-url.ts`
- `public/images/seed/solar-inverter.jpg`, `hilux.jpg`, `honda-cd70.jpg`
  (fake product photos). `hero-1/2/3.jpg` are real regional photography and
  stay — they move to `public/images/hero/`.
- `docs/screenshots/**` (18 development screenshots)
- Fixture-derived copy: the `SHELF_A/B/C_IDS` arrays, the hard-coded
  `statLabel`/`statValue`/`specialty` seller card strings ("142 Systems",
  "Deals Done"), `PHONE = "+923166441108"` in fixtures.
- `/dev/ui` gallery: kept as a file, but the route returns `notFound()` unless
  `NODE_ENV === "development"`, so it does not exist in production.

Kept: `stitch_malakandbazaar_digital_marketplace_ui/` (design source of truth
per `CLAUDE.md`, never bundled), `docs/*.md`.

Enforcement so it cannot creep back: a CI grep gate failing the build on
`fixtures/`, `mock-db`, `localStorage` in `src/`, `TODO`/`FIXME`/`lorem`, and
any `/images/seed/` reference; plus `no-restricted-imports` in ESLint.

---

## 9. Phases

Each phase is independently shippable, ends green (`npm test`, `npm run lint`,
`npm run build`), and deletes the mock it replaced.

### Phase 0 — Prerequisites *(blocked on you, ~10 min)*
Create the Supabase project and hand over `NEXT_PUBLIC_SITE_URL`,
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, plus a Cloudflare Turnstile
site/secret key pair. **This is the only thing I cannot do myself.** Everything
downstream is written against a local `supabase start` in the meantime.

### Phase 1 — Foundation
Deps (`@supabase/supabase-js`, `zod`, `jose`, `@node-rs/argon2`, `supabase` CLI).
Migrations 0001–0008 (all of §4). Taxonomy seed generated from `docs/taxonomy.md`.
`src/server/{db,http,schemas}`, response envelope, error taxonomy, zod helpers,
rate limiter, request logging, `GET /api/health`, security-header +
CSP-nonce middleware composed with the existing `next-intl` middleware.
*Done when:* migrations apply clean twice, `/api/health` returns `200`,
`securityheaders.com` grade A on a preview deploy.

### Phase 2 — Auth (endpoints 1–12, 39)
Argon2 hashing, JWT mint/verify, refresh rotation with reuse detection, CSRF,
Turnstile, login throttle. Middleware route gating. Front end: rebuild
`sign-in-form.tsx` as a real sign-in/sign-up pair, replace `AuthProvider` with
a server-session-backed provider (`/api/auth/me` + refresh-on-401 fetch
wrapper), replace `useRequireSeller` with middleware + server guards, wire
`seller-registration-form.tsx` to `POST /api/seller/register`.
**Deletes:** `mock-db/auth.ts`, `auth-context.tsx` (rewritten), `use-require-seller.ts`.
*Done when:* a signed-out `curl` to every protected route returns `401/307`,
devtools cannot forge a seller session, and refresh-token reuse revokes the family.

### Phase 3 — Loaders & shell
`Spinner`, `FullscreenLoader`, `loading.tsx` for every segment, skeletons,
`error.tsx` boundaries, global fetch-error toasts, the real `not-found.tsx`
(kills the soft-404 noted in `decisions.md`).
*Done when:* every route transition and every async action has a loading state,
axe reports no `aria-live` violations.

### Phase 4 — Listings read + search (17–20, 23, 13–16)
`fn_search_listings` with facets, keyset + offset pagination, typeahead.
Front end: `/search` becomes server-rendered with URL-driven filter state
(shareable/bookmarkable, currently it is not), `/listing/[slug]` server-rendered
with real `notFound()` and JSON-LD `Product`.
**Deletes:** `src/lib/search.ts`, `src/lib/listings.ts`, listing fixtures.
*Done when:* p95 `/api/listings` < 120 ms on 10 k seeded rows, every filter
combination hits an index (`EXPLAIN` checked).

### Phase 5 — Views, ranking, homepage (21–22, 24–25)
View ping, `fn_bump_view`, `rank_score`, `pg_cron` refresh, trending,
`fn_home_payload`, readiness thresholds, honest empty state.
**Deletes:** `home-content.tsx` fixture imports and the shelf ID arrays.
*Done when:* a fresh DB renders a homepage with zero listing cards and no
broken layout; after seeding, view counts demonstrably reorder the grid.

### Phase 6 — Seller workspace (40–52)
Listing CRUD with ownership enforced in SQL, status transitions, Supabase
Storage upload pipeline (signed PUT, MIME + magic-byte validation, EXIF strip,
orphan sweep), multi-image reorder, profile edit, analytics dashboard
(views/contacts charts — no buyer identity).
**Deletes:** `mock-db/listings.ts`, `mock-db/sellers.ts`, `file-to-data-url.ts`,
base64-in-localStorage image handling.
*Done when:* a seller can complete post → edit → mark sold end to end, and
seller B gets `404` on every one of seller A's object ids.

### Phase 7 — Reviews, ratings, sellers directory (26–37)
Review write/edit/delete, rating triggers, Bayesian `rating_score`, top-seller
widget, the missing `/sellers` page, favourites + `/account` pages.
**Deletes:** `mock-db/reviews.ts`, seller fixtures.
*Done when:* rating aggregates match a brute-force recount after 1 000 random
review operations.

### Phase 8 — Trust, safety, admin (38, 53–62)
Report flow, moderation queue, `/admin` (behind `requireAdmin`), seller
verification, user suspension, audit log, prohibited-category keyword flagging
at post time from `docs/taxonomy.md`.
*Done when:* a reported listing can be taken down and the action appears in the
audit log with actor and reason.

### Phase 9 — Launch hardening
SEO (`robots.txt`, paged `sitemap.xml`, JSON-LD `Product`/`LocalBusiness`/
`BreadcrumbList`, OG images, hreflang `en`/`ur`), the 8 missing legal/help
pages with real content, caching (`s-maxage` + `stale-while-revalidate` on
public reads, ISR on listing detail), N+1 audit, `EXPLAIN ANALYZE` on every
query, k6 load test, dependency + secret scan, full dummy-data purge gate,
backup/restore rehearsal, Vercel + Supabase production config, deploy.
*Done when:* Lighthouse ≥ 90 on all four, the CI purge gate passes, and a
staging restore-from-backup succeeds.

---

## 10. Performance budget

| Path | Budget | How |
|---|---|---|
| `GET /api/listings` (p95) | 120 ms | one RPC, index-only scan, facets in the same call |
| `GET /api/listings/:slug` | 60 ms | PK/slug unique index, ISR 60 s |
| `GET /api/home` | 150 ms | one RPC, `s-maxage=60` at the edge |
| `POST /api/listings/:id/view` | 25 ms | single UPDATE, fire-and-forget |
| Homepage LCP | < 2.0 s on 3G Fast | server-rendered, `next/image` AVIF, font `display:swap` |
| Payload | < 180 KB JS on first load | fixtures deleted, no client-side data layer |

No endpoint returns an unbounded list. No endpoint issues a query in a loop.
Every list response carries `pageInfo { nextCursor, hasMore, total? }`.

---

## 11. Testing

- **Unit (vitest):** phone normalisation, JWT mint/verify/expiry, password
  hash/verify, rank/Bayesian formulae, zod schemas, CSRF check.
- **Integration:** every endpoint against a real local Postgres — happy path,
  validation failure, authz failure (wrong role, wrong owner), rate limit.
- **Security regression suite:** signed-out access to each protected route,
  IDOR across two sellers, refresh-token replay, CSRF omission, XSS payload
  round-trip through title/description/review, open-redirect via `?next=`.
- **E2E (Playwright):** signup → become seller → post listing with images →
  buyer views it (count increments) → buyer reviews → seller sees analytics,
  in both `en` and `ur` (RTL).
- **Load (k6):** 10 k listings, 200 rps browse, 50 rps view pings.

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| Supabase Auth deviation | documented in §1.2; the flow is standard and fully tested |
| Cold-start on serverless + Postgres | Supabase **transaction-mode pooler** (port 6543), keep-warm on `/api/health`, single region pinned to the DB |
| Hot-row contention on `view_count` for a viral listing | single-statement increment, no transaction held; if it ever bites, switch to a sharded counter table — schema noted |
| pg_cron unavailable on the chosen Supabase tier | fall back to a Vercel Cron hitting an authenticated `/api/internal/refresh-ranks` |
| "Launch in a day" vs 9 phases | phases 1–6 are the launchable core; 7–9 can ship in the days after, but **§8 dummy-data removal is not optional** and completes with phase 6 |

---

## 13. The one thing I need from you

Supabase project URL + service-role key, and a Cloudflare Turnstile key pair.
Until then Phase 1 runs against a local `supabase start`, and everything is
written, migrated and tested locally.
