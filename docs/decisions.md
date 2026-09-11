# MalakandBazaar — Locked Decisions

## Design
- **Source of truth: the Stitch `code.html` files**, not `DESIGN.md` frontmatter.
  The frontmatter color block contradicts both the prose and the screenshots — ignore it.
  Keep DESIGN.md prose for elevation, shadow, radius and component rules.
- Stitch export is a mockup. Overall look must match it; small deviations allowed
  where the mockup is impractical or incomplete.
- **No native browser controls.** Every form control is a custom component:
  select, multi-select, combobox, checkbox, radio, switch, slider, file upload,
  date picker, tooltip, modal, drawer, toast, tabs, accordion, pagination.
  Build the global UI kit first; all pages consume it.

## Tokens (from `code.html` tailwind.config)
primary `#1f4d3a` · primary-dark `#16382b` · primary-light `#28664e` ·
secondary `#3f6b52` · tertiary `#c89b6d` · tertiary-hover `#b88755` ·
tertiary-light `#fdf6ed` · background `#f4f8f5` · surface `#ffffff` ·
surface-low `#edf5ef` · surface-border `#e1ebe4` · accent-green `#50a23e` ·
accent-green-dark `#418532` · on-surface `#16231d` · on-surface-muted `#52635a`
Font: Plus Jakarta Sans. Icons: Material Symbols Outlined.

## Stack
- Next.js (App Router, TypeScript), Tailwind v3.4 (config ported 1:1 from Stitch).
- Supabase: Postgres + Auth + RLS. PostGIS enabled for map queries.
- Cloudinary for listing images. Signed uploads from server action; store `public_id`.
- Leaflet + OpenStreetMap for maps (no Google Maps billing).
- No transactional email at launch. SMTP wired only if/when password
  reset via optional recovery email is built.

## Data model
- **No per-category attribute schema.** Listing = title, description, price,
  category, subcategory, tehsil, location point, images, contact phone.
  Sellers put specifics in the description.
- A nullable `attributes jsonb` column ships on `listings` anyway — zero cost now,
  avoids a migration if structured fields are ever wanted.
- **Listings never expire.** Seller marks Sold / Reserved / Removed manually.
- Ratings and reviews attach to the **seller**, not the listing.
- `role` enum (`customer` | `seller` | `admin`) exists from day one; admin panel
  is built later.

## Auth
- **Phone number + password only.** No email, no OTP, no verification of any kind.
  Signup form is two fields: `+92` phone, password.
- Supabase Auth phone provider with phone confirmations **disabled** — no SMS
  provider configured, no SMS cost. Session issued immediately on signup.
- Phone stored E.164 (`+923XXXXXXXXX`). Input renders a fixed `+92` prefix;
  user types `3001234567`. Normaliser strips leading `0`, spaces, dashes.
  Unique index on `phone`.
- **Optional, unverified `recovery_email` on the profile.** Not asked at signup;
  offered in profile settings. It is the only possible password-reset channel —
  without it a forgotten password means a permanently lost account.
- Cloudflare Turnstile on the signup form. Free, no vendor cost, slows bulk
  registration now that nothing else gates account creation.
- Password policy: minimum 8 characters, no composition rules. Strict rules
  increase forgetting, and forgetting is unrecoverable here.
- Listing contact phone is a **separate field** from the login phone, prefilled
  from it — a seller may publish a shop number different from their own.
- Customers browse freely; account required only to rate or review.

## Tehsils (official)
Per KP Local Government Department, Malakand District has **three** tehsil
local governments:

| Tehsil (LG name) | Revenue tehsil | Notes |
|---|---|---|
| Batkhela | Swat Ranizai | District HQ; main bazaar |
| Dargai | Sam Ranizai | Largest by area; industrial belt |
| Thana Baizai | Thana Baizai | Carved out of Swat Ranizai |

Second level (market / locality) is a free-ish lookup list per tehsil, seeded with
the places the mockup already names: Batkhela Main Road, Sakhakot Cloth Market,
Totakan, Thana Main Chowk, Dargai Industrial Belt, Dargai Border Exchange,
Alladand, Palai, Agra, Heroshah, Amandara, Chakdara (adjoining), Malakand Pass.
Adjust with local input.

Source: https://lgkp.gov.pk/page/city-tehsil-local-governments

## Localisation
- English default, Urdu selectable. RTL wired in from the start (`next-intl` + `dir`).
- Urdu UI font: Noto Sans Arabic (legible at small sizes). Nastaliq reserved for
  display headings only if it survives testing.

## Not now
Admin panel · payments · chat/messaging · listing boosts · SMS ·
transactional email · password reset.
