# MalakandBazaar — Colour Roles

The problem this solves: `#1f4d3a` was doing nine jobs at once — headings,
icons, buttons, borders, active states, prices, focus rings, checkboxes,
pagination. When everything is the strongest colour, nothing reads as
important. The fix is a tonal ramp of one hue with strict role assignment,
so hierarchy comes from tone.

## The ramp

| Tone | Hex | Contrast on white | Where it is allowed |
|---|---|---|---|
| `brand-50` | `#f0f9f5` | — | tinted section surfaces, dropdown hover rows |
| `brand-100` | `#def2e8` | — | selected row fills, soft badge fills, avatar grounds |
| `brand-200` | `#bce1d0` | — | borders of selected elements, dividers on tinted ground |
| `brand-300` | `#8ec7af` | 1.92:1 | resting control borders, decorative icons |
| `brand-400` | `#59ab89` | 2.76:1 | hover borders |
| `brand-500` | `#3d8f6e` | 3.92:1 | **UI only** — slider track fill, chevrons, accents. Never body text. |
| `brand-600` | `#2d7659` | 5.46:1 | **the workhorse** — icons, links, active states, checkbox and radio fills, current page, active tab, focus rings |
| `brand-700` | `#255f48` | 7.48:1 | section headings, dialog titles, emphasis text |
| `brand-800` | `#1f4d3a` | 9.63:1 | **reserved** — primary CTA fill, page-level headings, price anchors. Nothing else. |
| `brand-900` | `#133426` | 13.58:1 | text on tinted brand grounds |

## Accent roles

- **`accent-green-dark` `#418532`** — WhatsApp and direct-contact actions only.
  Restricting it is what makes it mean "contact the seller". Note the fill is
  the *dark* tone: white on `accent-green #50a23e` is 3.19:1 and fails WCAG AA,
  so `#50a23e` is decoration and hover only, never a ground for small text.
- **`tertiary` `#c89b6d` (sand)** — the sharp warm accent that breaks up the
  green: price emphasis, featured and premium badges, star ratings.
  **Never white text on sand** — 2.51:1, a clear failure. Use `on-surface`
  (6.47:1) on sand grounds, or the darker `#875520` when white text is needed
  (6.27:1).
- **`on-surface` / `on-surface-muted`** — all body copy and labels. Body text is
  not green. This single rule removes most of the perceived heaviness.

## Rules

1. If an element is not a primary action, a page heading, or a price, it does
   not get `brand-800`.
2. Interactive affordances are `brand-600`. That is the default answer.
3. Tinted grounds (`brand-50`, `brand-100`) carry far more of the brand than
   saturated fills do, at a fraction of the visual weight.
4. Any new colour pairing gets its contrast checked before it ships. AA for
   small text is 4.5:1; 3.0:1 is acceptable only for large text and UI shapes.
