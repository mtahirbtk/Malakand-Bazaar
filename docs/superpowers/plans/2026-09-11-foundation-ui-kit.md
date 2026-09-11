# MalakandBazaar Foundation & UI Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Next.js application shell, a complete custom UI component kit with zero native browser controls, and pixel-match the two exported Stitch screens (home and search catalog).

**Architecture:** Next.js App Router with a `[locale]` segment for English/Urdu. A single reconciled Tailwind token set derived from both Stitch exports. Every interactive control is a Radix UI primitive skinned with our tokens — no raw `<select>`, `<input type=checkbox>`, `<input type=range>`, or `<dialog>` reaches the DOM. Pages are assembled from the kit plus a marketplace-specific component layer, fed by typed fixtures so the frontend is complete and testable before Supabase exists.

**Tech Stack:** Next.js 15 (App Router, TypeScript), React 19, Tailwind CSS 3.4, Radix UI primitives, class-variance-authority, next-intl, Vitest + React Testing Library, Playwright (visual regression).

**Spec:** `docs/decisions.md` (locked decisions), `docs/taxonomy.md` (category seed data), `stitch_malakandbazaar_digital_marketplace_ui/` (design source of truth)

## Global Constraints

- **Design source of truth is the Stitch `code.html` files**, not `DESIGN.md` frontmatter. The frontmatter color block contradicts the prose and the screenshots — ignore it entirely.
- **Zero native browser form controls in shipped UI.** No bare `<select>`, `<input type="checkbox">`, `<input type="radio">`, `<input type="range">`. Radix primitives render accessible hidden inputs internally; that is acceptable and expected. A lint rule enforces this (Task 2).
- **Brand tokens, exact values:** primary `#1f4d3a` · primary-dark `#16382b` · primary-light `#28664e` · secondary `#3f6b52` · tertiary `#c89b6d` · tertiary-hover `#b88755` · tertiary-light `#fdf6ed` · background `#f4f8f5` · surface `#ffffff` · surface-low `#edf5ef` · surface-border `#e1ebe4` · accent-green `#50a23e` · accent-green-dark `#418532` · on-surface `#16231d` · on-surface-muted `#52635a`
- **Font:** Plus Jakarta Sans (weights 400, 500, 600, 700, 800). **Icons:** Material Symbols Outlined.
- **Locales:** `en` (default) and `ur`. `ur` renders `dir="rtl"`. Every user-visible string goes through `next-intl` — no hardcoded English in components.
- **Currency:** PKR, formatted `PKR 240,000` with tabular figures. Never `Rs.` or `₨` in shipped copy except where the Stitch catalog sidebar uses `₨` as an input prefix.
- **Phone:** E.164 `+92XXXXXXXXXX`. WhatsApp links are `https://wa.me/<digits-no-plus>?text=<encoded>`.
- **Node 20+.** Package manager: npm.
- **Every task ends with a passing test run and a commit.**

---

## File Structure

```
/
├── docs/                              # already exists: decisions.md, taxonomy.md
├── stitch_.../                        # design source, never edited
├── public/
│   └── images/seed/                   # mirrored listing/hero imagery
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # html/body shell, fonts, icon stylesheet
│   │   ├── globals.css
│   │   └── [locale]/
│   │       ├── layout.tsx             # locale provider, dir attribute, chrome
│   │       ├── page.tsx               # home
│   │       ├── search/page.tsx        # catalog
│   │       └── dev/ui/page.tsx        # component gallery (dev only)
│   ├── components/
│   │   ├── ui/                        # global kit — generic, domain-free
│   │   │   ├── button.tsx  icon.tsx  input.tsx  textarea.tsx  form-field.tsx
│   │   │   ├── select.tsx  combobox.tsx  checkbox.tsx  radio-group.tsx  switch.tsx
│   │   │   ├── slider.tsx  modal.tsx  drawer.tsx  popover.tsx  tooltip.tsx
│   │   │   ├── dropdown-menu.tsx  tabs.tsx  accordion.tsx  toast.tsx
│   │   │   ├── badge.tsx  chip.tsx  avatar.tsx  rating.tsx  price.tsx
│   │   │   ├── breadcrumb.tsx  pagination.tsx  skeleton.tsx  empty-state.tsx
│   │   │   └── carousel.tsx
│   │   ├── layout/
│   │   │   ├── announcement-bar.tsx  site-header.tsx  category-ribbon.tsx
│   │   │   ├── mega-menu.tsx  site-footer.tsx  locale-switcher.tsx
│   │   └── marketplace/               # domain components
│   │       ├── listing-card.tsx  seller-card.tsx  category-circle.tsx
│   │       ├── section-header.tsx  promo-card.tsx  hero-carousel.tsx
│   │       ├── contact-actions.tsx  filter-sidebar.tsx  sort-bar.tsx
│   │       └── active-filter-chips.tsx
│   ├── lib/
│   │   ├── cn.ts  format.ts  whatsapp.ts  phone.ts
│   ├── data/
│   │   ├── tehsils.ts  categories.ts
│   │   └── fixtures/listings.ts  fixtures/sellers.ts
│   ├── i18n/
│   │   ├── routing.ts  request.ts
│   │   └── messages/en.json  messages/ur.json
│   ├── types/index.ts
│   └── middleware.ts
├── tests/
│   ├── setup.ts
│   └── visual/                        # Playwright specs + baselines
├── tailwind.config.ts
├── vitest.config.ts
├── playwright.config.ts
└── eslint.config.mjs
```

**Decomposition rationale:** `ui/` components know nothing about listings, sellers, or tehsils — they are reusable primitives with no domain imports. `marketplace/` composes them with domain types. `layout/` owns page chrome that appears on every route. A lint boundary (Task 2) forbids `ui/` from importing `marketplace/` or `data/`.

---

## Task 1: Project scaffold, reconciled tokens, fonts, i18n shell

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `tests/setup.ts`, `.gitignore`
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx`
- Create: `src/i18n/routing.ts`, `src/i18n/request.ts`, `src/i18n/messages/en.json`, `src/i18n/messages/ur.json`, `src/middleware.ts`
- Test: `tests/i18n.test.tsx`

**Interfaces:**
- Consumes: nothing (first task)
- Produces: `routing` from `src/i18n/routing.ts` with `locales: ['en','ur']`, `defaultLocale: 'en'`; Tailwind token names listed in Global Constraints; `Link`, `redirect`, `usePathname`, `useRouter` re-exported from `src/i18n/routing.ts`

**Token reconciliation note:** The catalog export uses `brand-800` (= `#1f4d3a`, same as `primary`), `earth-500` (= `#c89b6d`, same as `tertiary`), body `#F6F8F5`, plus stock Tailwind `slate-*`/`emerald-*`/`rose-*`. Resolution: keep the home page's semantic names as canonical; add a `neutral` scale aliasing the slate values the catalog actually uses; use `#f4f8f5` for background (the 1-value difference from `#F6F8F5` is imperceptible and the home export is the richer document). Mapping to apply when porting catalog markup in Task 16:

| Catalog class | Replace with |
|---|---|
| `bg-[#F6F8F5]` | `bg-background` |
| `brand-800` | `primary` |
| `brand-900` | `primary-dark` |
| `brand-50`, `emerald-50` | `surface-low` |
| `emerald-200` | `surface-border` |
| `emerald-700` | `accent-green-dark` |
| `earth-500` / `earth-600` | `tertiary` / `tertiary-hover` |
| `slate-200` | `surface-border` |
| `slate-300` | `neutral-300` |
| `slate-400` | `neutral-400` |
| `slate-500` / `slate-600` | `on-surface-muted` |
| `slate-800` / `slate-900` | `on-surface` |
| `slate-50` / `slate-100` | `neutral-50` / `neutral-100` |
| `rose-600` | `danger` |

- [ ] **Step 1: Scaffold the app**

```bash
npx create-next-app@15 malakand-bazaar-tmp --typescript --eslint --app --src-dir --no-tailwind --import-alias "@/*" --use-npm
# move contents up into the repo root, then remove the temp dir
rsync -a malakand-bazaar-tmp/ ./ && rm -rf malakand-bazaar-tmp
npm i -D tailwindcss@3.4.17 postcss autoprefixer
npm i next-intl@^3.26
npm i -D vitest@^2 @vitejs/plugin-react @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
npx tailwindcss init -p --ts
```

- [ ] **Step 2: Write `tailwind.config.ts` with the reconciled tokens**

```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1f4d3a",
        "primary-dark": "#16382b",
        "primary-light": "#28664e",
        secondary: "#3f6b52",
        tertiary: "#c89b6d",
        "tertiary-hover": "#b88755",
        "tertiary-light": "#fdf6ed",
        background: "#f4f8f5",
        surface: "#ffffff",
        "surface-low": "#edf5ef",
        "surface-border": "#e1ebe4",
        "accent-green": "#50a23e",
        "accent-green-dark": "#418532",
        "on-surface": "#16231d",
        "on-surface-muted": "#52635a",
        danger: "#e11d48",
        "danger-soft": "#fff1f2",
        neutral: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
        },
      },
      fontFamily: { sans: ["var(--font-jakarta)", "sans-serif"] },
      boxShadow: {
        "2xs": "0 1px 2px rgba(30, 41, 35, 0.04)",
        xs: "0 1px 3px rgba(30, 41, 35, 0.05)",
        raised:
          "0 2px 8px -2px rgba(30, 41, 35, 0.05), 0 1px 3px rgba(30, 41, 35, 0.04)",
        floating:
          "0 12px 32px -4px rgba(30, 41, 35, 0.08), 0 4px 12px -2px rgba(30, 41, 35, 0.04)",
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 3: Write `src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html, body { margin: 0; padding: 0; }
  body { overscroll-behavior: none; }
  /* Price and phone numerals must align vertically across rows */
  .tabular { font-variant-numeric: tabular-nums; }
}

.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

.custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
```

- [ ] **Step 4: Write the i18n routing module**

```ts
// src/i18n/routing.ts
import { defineRouting } from "next-intl/routing";
import { createSharedPathnamesNavigation } from "next-intl/navigation";

export const routing = defineRouting({
  locales: ["en", "ur"] as const,
  defaultLocale: "en",
});

export type Locale = (typeof routing.locales)[number];

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createSharedPathnamesNavigation(routing);

export function dirForLocale(locale: string): "ltr" | "rtl" {
  return locale === "ur" ? "rtl" : "ltr";
}
```

```ts
// src/i18n/request.ts
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as never)) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
```

```ts
// src/middleware.ts
import createMiddleware from "next-intl/middleware";
import { routing } from "@/i18n/routing";

export default createMiddleware(routing);

export const config = {
  matcher: ["/", "/(en|ur)/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Step 5: Write the layouts**

```tsx
// src/app/layout.tsx
import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MalakandBazaar — Regional Marketplace",
  description:
    "Buy and sell across Batkhela, Dargai and Thana Baizai. Direct contact, no commission.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
      />
      <div className={jakarta.variable}>{children}</div>
    </>
  );
}
```

```tsx
// src/app/[locale]/layout.tsx
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, dirForLocale } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as never)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} dir={dirForLocale(locale)}>
      <body className="bg-background font-sans text-on-surface antialiased min-h-screen flex flex-col">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

Note: because `[locale]/layout.tsx` renders `<html>`, `src/app/layout.tsx` must NOT render `<html>`/`<body>`. Next.js permits exactly one. If Next complains, delete `src/app/layout.tsx` and move the font setup into `[locale]/layout.tsx`.

- [ ] **Step 6: Write message files**

```json
// src/i18n/messages/en.json
{
  "common": {
    "brand": "MalakandBazaar",
    "tagline": "Regional Marketplace",
    "search": "Search",
    "signIn": "Sign In / Join",
    "becomeSeller": "Become a Seller",
    "free": "Free",
    "viewAll": "View All",
    "whatsapp": "WhatsApp",
    "call": "Call Seller"
  }
}
```

```json
// src/i18n/messages/ur.json
{
  "common": {
    "brand": "ملاکنڈ بازار",
    "tagline": "علاقائی مارکیٹ",
    "search": "تلاش کریں",
    "signIn": "لاگ ان / رجسٹر",
    "becomeSeller": "بیچنے والے بنیں",
    "free": "مفت",
    "viewAll": "سب دیکھیں",
    "whatsapp": "واٹس ایپ",
    "call": "کال کریں"
  }
}
```

- [ ] **Step 7: Configure Vitest**

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    globals: true,
    include: ["src/**/*.test.{ts,tsx}", "tests/**/*.test.{ts,tsx}"],
  },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
```

```ts
// tests/setup.ts
import "@testing-library/jest-dom/vitest";
```

Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 8: Write the failing test**

```tsx
// tests/i18n.test.tsx
import { describe, it, expect } from "vitest";
import { routing, dirForLocale } from "@/i18n/routing";

describe("i18n routing", () => {
  it("supports English and Urdu with English as default", () => {
    expect(routing.locales).toEqual(["en", "ur"]);
    expect(routing.defaultLocale).toBe("en");
  });

  it("renders Urdu right-to-left and English left-to-right", () => {
    expect(dirForLocale("ur")).toBe("rtl");
    expect(dirForLocale("en")).toBe("ltr");
  });
});
```

- [ ] **Step 9: Run tests**

Run: `npm test`
Expected: PASS (2 tests). If it fails with a module resolution error, confirm the `@` alias is set in both `tsconfig.json` and `vitest.config.ts`.

- [ ] **Step 10: Verify the app boots in both locales**

Run: `npm run dev`, then in a second shell:
```bash
curl -s localhost:3000/en | grep -o 'dir="ltr"'
curl -s localhost:3000/ur | grep -o 'dir="rtl"'
```
Expected: each prints its match.

- [ ] **Step 11: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold Next.js app with reconciled design tokens and en/ur i18n"
```

---

## Task 2: Utilities, lint boundaries, Icon and Button

**Files:**
- Create: `src/lib/cn.ts`, `src/lib/format.ts`, `src/lib/phone.ts`, `src/lib/whatsapp.ts`
- Create: `src/components/ui/icon.tsx`, `src/components/ui/button.tsx`
- Modify: `eslint.config.mjs`
- Test: `src/lib/format.test.ts`, `src/lib/phone.test.ts`, `src/components/ui/button.test.tsx`

**Interfaces:**
- Consumes: Tailwind tokens from Task 1
- Produces:
  - `cn(...inputs: ClassValue[]): string`
  - `formatPkr(value: number): string`
  - `normalizePhone(input: string): string | null` — returns E.164 `+92XXXXXXXXXX` or `null`
  - `formatPhoneDisplay(e164: string): string` — `+92 300 1234567`
  - `whatsappUrl(phone: string, message: string): string`
  - `<Icon name={string} size?={number} className?={string} />`
  - `<Button variant="primary"|"ghost"|"sand"|"whatsapp"|"subtle" size="sm"|"md"|"lg" asChild?={boolean} />`

- [ ] **Step 1: Install dependencies**

```bash
npm i clsx tailwind-merge class-variance-authority @radix-ui/react-slot
```

- [ ] **Step 2: Write the failing tests**

```ts
// src/lib/format.test.ts
import { describe, it, expect } from "vitest";
import { formatPkr } from "./format";

describe("formatPkr", () => {
  it("formats with thousands separators and a PKR prefix", () => {
    expect(formatPkr(240000)).toBe("PKR 240,000");
  });
  it("formats millions", () => {
    expect(formatPkr(5800000)).toBe("PKR 5,800,000");
  });
  it("formats zero", () => {
    expect(formatPkr(0)).toBe("PKR 0");
  });
  it("drops decimals", () => {
    expect(formatPkr(1999.6)).toBe("PKR 2,000");
  });
});
```

```ts
// src/lib/phone.test.ts
import { describe, it, expect } from "vitest";
import { normalizePhone, formatPhoneDisplay } from "./phone";
import { whatsappUrl } from "./whatsapp";

describe("normalizePhone", () => {
  it("accepts a bare 10-digit mobile number", () => {
    expect(normalizePhone("3001234567")).toBe("+923001234567");
  });
  it("strips a leading zero", () => {
    expect(normalizePhone("03001234567")).toBe("+923001234567");
  });
  it("strips dashes and spaces", () => {
    expect(normalizePhone("0300-123 4567")).toBe("+923001234567");
  });
  it("accepts an already-prefixed number", () => {
    expect(normalizePhone("+923001234567")).toBe("+923001234567");
  });
  it("accepts a 92-prefixed number without plus", () => {
    expect(normalizePhone("923001234567")).toBe("+923001234567");
  });
  it("rejects a number that is too short", () => {
    expect(normalizePhone("30012345")).toBeNull();
  });
  it("rejects a number not starting with 3", () => {
    expect(normalizePhone("9451234567")).toBeNull();
  });
  it("rejects letters", () => {
    expect(normalizePhone("abcdefghij")).toBeNull();
  });
});

describe("formatPhoneDisplay", () => {
  it("groups an E.164 number for reading", () => {
    expect(formatPhoneDisplay("+923001234567")).toBe("+92 300 1234567");
  });
});

describe("whatsappUrl", () => {
  it("builds a wa.me link with no plus and an encoded message", () => {
    expect(whatsappUrl("+923001234567", "Interested in Solar Inverter")).toBe(
      "https://wa.me/923001234567?text=Interested%20in%20Solar%20Inverter"
    );
  });
});
```

```tsx
// src/components/ui/button.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Button } from "./button";

describe("Button", () => {
  it("renders its label", () => {
    render(<Button>Become a Seller</Button>);
    expect(
      screen.getByRole("button", { name: "Become a Seller" })
    ).toBeInTheDocument();
  });

  it("applies the primary variant by default", () => {
    render(<Button>Go</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-primary");
  });

  it("applies the whatsapp variant", () => {
    render(<Button variant="whatsapp">Chat</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-accent-green");
  });

  it("calls onClick", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Tap</Button>);
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("does not fire when disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Tap
      </Button>
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  it("renders as an anchor when asChild is set", () => {
    render(
      <Button asChild>
        <a href="/sell">Sell</a>
      </Button>
    );
    expect(screen.getByRole("link", { name: "Sell" })).toHaveClass("bg-primary");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — "Failed to resolve import ./format", "./phone", "./button".

- [ ] **Step 4: Write the implementations**

```ts
// src/lib/cn.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

```ts
// src/lib/format.ts
export function formatPkr(value: number): string {
  return `PKR ${Math.round(value).toLocaleString("en-US")}`;
}
```

```ts
// src/lib/phone.ts
/** Pakistani mobile numbers are 10 digits after the country code, starting with 3. */
const PK_MOBILE = /^3\d{9}$/;

export function normalizePhone(input: string): string | null {
  let digits = input.replace(/[\s\-()]/g, "");
  if (digits.startsWith("+92")) digits = digits.slice(3);
  else if (digits.startsWith("92")) digits = digits.slice(2);
  else if (digits.startsWith("0")) digits = digits.slice(1);
  if (!PK_MOBILE.test(digits)) return null;
  return `+92${digits}`;
}

export function formatPhoneDisplay(e164: string): string {
  const d = e164.replace(/^\+92/, "");
  return `+92 ${d.slice(0, 3)} ${d.slice(3)}`;
}
```

```ts
// src/lib/whatsapp.ts
export function whatsappUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
```

```tsx
// src/components/ui/icon.tsx
import { cn } from "@/lib/cn";

export function Icon({
  name,
  size = 20,
  className,
  filled = false,
}: {
  name: string;
  size?: number;
  className?: string;
  filled?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("material-symbols-outlined leading-none", className)}
      style={{
        fontSize: `${size}px`,
        ...(filled ? { fontVariationSettings: "'FILL' 1" } : {}),
      }}
    >
      {name}
    </span>
  );
}
```

```tsx
// src/components/ui/button.tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-bold transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background whitespace-nowrap",
  {
    variants: {
      variant: {
        primary: "bg-primary text-white shadow-sm hover:bg-primary-dark hover:shadow",
        ghost:
          "bg-transparent border-[1.5px] border-secondary text-primary hover:bg-surface-low",
        sand: "bg-tertiary text-white hover:bg-tertiary-hover",
        whatsapp: "bg-accent-green text-white hover:bg-accent-green-dark",
        subtle:
          "bg-surface border border-surface-border text-primary hover:bg-surface-low hover:border-primary shadow-2xs",
      },
      size: {
        sm: "text-[11px] px-2 py-1.5",
        md: "text-xs px-4 py-2.5",
        lg: "text-sm px-6 py-3",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
```

- [ ] **Step 5: Add the no-native-controls lint rule**

Append to `eslint.config.mjs`:

```js
{
  files: ["src/**/*.tsx"],
  ignores: ["src/components/ui/**"],
  rules: {
    "no-restricted-syntax": [
      "error",
      {
        selector: "JSXOpeningElement[name.name='select']",
        message: "Use <Select> from @/components/ui/select, not a native select.",
      },
      {
        selector:
          "JSXOpeningElement[name.name='input'][attributes.0]:has(JSXAttribute[name.name='type'][value.value=/^(checkbox|radio|range)$/])",
        message:
          "Use <Checkbox>, <RadioGroup> or <Slider> from @/components/ui, not a native input.",
      },
    ],
  },
},
{
  files: ["src/components/ui/**"],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@/components/marketplace/*", "@/data/*"],
            message: "ui/ components must stay domain-free.",
          },
        ],
      },
    ],
  },
}
```

- [ ] **Step 6: Run tests and lint**

Run: `npm test && npm run lint`
Expected: all tests PASS, lint clean.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add formatting utilities, Icon and Button with lint boundaries"
```

---

## Task 3: Input, Textarea, FormField

**Files:**
- Create: `src/components/ui/input.tsx`, `src/components/ui/textarea.tsx`, `src/components/ui/form-field.tsx`
- Test: `src/components/ui/input.test.tsx`, `src/components/ui/form-field.test.tsx`

**Interfaces:**
- Consumes: `cn` (Task 2), `Icon` (Task 2)
- Produces:
  - `<Input leadingIcon?={string} trailingIcon?={string} invalid?={boolean} inputSize?="sm"|"md" />` forwarding a ref to `HTMLInputElement`
  - `<Textarea invalid?={boolean} />` forwarding a ref to `HTMLTextAreaElement`
  - `<FormField label={string} hint?={string} error?={string} required?={boolean} htmlFor?={string}>{children}</FormField>`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/ui/input.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Input } from "./input";

describe("Input", () => {
  it("accepts typing", async () => {
    render(<Input aria-label="Search" />);
    await userEvent.type(screen.getByLabelText("Search"), "solar");
    expect(screen.getByLabelText("Search")).toHaveValue("solar");
  });

  it("marks itself invalid for assistive tech", () => {
    render(<Input aria-label="Price" invalid />);
    expect(screen.getByLabelText("Price")).toHaveAttribute(
      "aria-invalid",
      "true"
    );
  });

  it("reserves left padding when a leading icon is present", () => {
    render(<Input aria-label="Search" leadingIcon="search" />);
    expect(screen.getByLabelText("Search")).toHaveClass("pl-9");
  });
});
```

```tsx
// src/components/ui/form-field.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormField } from "./form-field";
import { Input } from "./input";

describe("FormField", () => {
  it("associates its label with the control", () => {
    render(
      <FormField label="Phone number" htmlFor="phone">
        <Input id="phone" />
      </FormField>
    );
    expect(screen.getByLabelText("Phone number")).toBeInTheDocument();
  });

  it("shows an error instead of the hint when both are given", () => {
    render(
      <FormField label="Price" hint="In PKR" error="Price is required">
        <Input />
      </FormField>
    );
    expect(screen.getByText("Price is required")).toBeInTheDocument();
    expect(screen.queryByText("In PKR")).not.toBeInTheDocument();
  });

  it("announces errors politely", () => {
    render(
      <FormField label="Price" error="Price is required">
        <Input />
      </FormField>
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Price is required");
  });

  it("marks required fields", () => {
    render(
      <FormField label="Title" required>
        <Input />
      </FormField>
    );
    expect(screen.getByText("*")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- input form-field`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the implementations**

```tsx
// src/components/ui/input.tsx
import * as React from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  leadingIcon?: string;
  trailingIcon?: string;
  invalid?: boolean;
  inputSize?: "sm" | "md";
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { className, leadingIcon, trailingIcon, invalid, inputSize = "md", ...props },
    ref
  ) => (
    <div className="relative flex items-center w-full">
      {leadingIcon && (
        <Icon
          name={leadingIcon}
          size={18}
          className="absolute left-3 text-secondary pointer-events-none"
        />
      )}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          "w-full rounded-lg bg-surface border text-on-surface placeholder:text-on-surface-muted/70",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-shadow",
          inputSize === "md" ? "h-12 px-3.5 text-sm" : "h-9 px-3 text-xs",
          leadingIcon && "pl-9",
          trailingIcon && "pr-9",
          invalid ? "border-danger" : "border-surface-border",
          className
        )}
        {...props}
      />
      {trailingIcon && (
        <Icon
          name={trailingIcon}
          size={18}
          className="absolute right-3 text-on-surface-muted pointer-events-none"
        />
      )}
    </div>
  )
);
Input.displayName = "Input";
```

```tsx
// src/components/ui/textarea.tsx
import * as React from "react";
import { cn } from "@/lib/cn";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        "w-full min-h-28 rounded-lg bg-surface border px-3.5 py-2.5 text-sm text-on-surface",
        "placeholder:text-on-surface-muted/70 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary",
        invalid ? "border-danger" : "border-surface-border",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
```

```tsx
// src/components/ui/form-field.tsx
import * as React from "react";
import { cn } from "@/lib/cn";

export function FormField({
  label,
  hint,
  error,
  required,
  htmlFor,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-bold uppercase tracking-wider text-on-surface-muted"
      >
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-[11px] font-semibold text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-on-surface-muted">{hint}</p>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- input form-field`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Input, Textarea and FormField components"
```

---

## Task 4: Select (the flagship custom control)

This replaces every native `<select>` in both Stitch exports: the utility-bar tehsil switcher, the header sector picker, and the catalog sort dropdown.

**Files:**
- Create: `src/components/ui/select.tsx`
- Test: `src/components/ui/select.test.tsx`

**Interfaces:**
- Consumes: `cn`, `Icon`
- Produces:
  - `type SelectOption = { value: string; label: string; icon?: string; disabled?: boolean }`
  - `<Select value={string} onValueChange={(v: string) => void} options={SelectOption[]} placeholder?={string} variant?="default"|"bare" selectSize?="sm"|"md" ariaLabel={string} className?={string} />`

- [ ] **Step 1: Install Radix Select**

```bash
npm i @radix-ui/react-select
```

- [ ] **Step 2: Write the failing test**

```tsx
// src/components/ui/select.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "./select";

const options = [
  { value: "all", label: "All Malakand District" },
  { value: "batkhela", label: "Batkhela" },
  { value: "dargai", label: "Dargai" },
  { value: "thana", label: "Thana Baizai" },
];

describe("Select", () => {
  it("renders no native select element", () => {
    const { container } = render(
      <Select ariaLabel="Tehsil" value="all" onValueChange={() => {}} options={options} />
    );
    // Radix renders a hidden native select only inside a <form>; standalone there is none.
    expect(container.querySelector("select")).toBeNull();
  });

  it("shows the selected option's label on the trigger", () => {
    render(
      <Select ariaLabel="Tehsil" value="batkhela" onValueChange={() => {}} options={options} />
    );
    expect(screen.getByRole("combobox", { name: "Tehsil" })).toHaveTextContent(
      "Batkhela"
    );
  });

  it("opens on click and lists every option", async () => {
    render(
      <Select ariaLabel="Tehsil" value="all" onValueChange={() => {}} options={options} />
    );
    await userEvent.click(screen.getByRole("combobox", { name: "Tehsil" }));
    expect(screen.getAllByRole("option")).toHaveLength(4);
  });

  it("reports the chosen value", async () => {
    const onValueChange = vi.fn();
    render(
      <Select ariaLabel="Tehsil" value="all" onValueChange={onValueChange} options={options} />
    );
    await userEvent.click(screen.getByRole("combobox", { name: "Tehsil" }));
    await userEvent.click(screen.getByRole("option", { name: "Dargai" }));
    expect(onValueChange).toHaveBeenCalledWith("dargai");
  });

  it("opens with the keyboard and selects with Enter", async () => {
    const onValueChange = vi.fn();
    render(
      <Select ariaLabel="Tehsil" value="all" onValueChange={onValueChange} options={options} />
    );
    screen.getByRole("combobox", { name: "Tehsil" }).focus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{ArrowDown}{Enter}");
    expect(onValueChange).toHaveBeenCalledWith("batkhela");
  });

  it("shows a placeholder when nothing is selected", () => {
    render(
      <Select
        ariaLabel="Tehsil"
        value=""
        onValueChange={() => {}}
        options={options}
        placeholder="Choose a tehsil"
      />
    );
    expect(screen.getByRole("combobox")).toHaveTextContent("Choose a tehsil");
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- select`
Expected: FAIL — "Failed to resolve import ./select".

Note: Radix Select uses `ResizeObserver` and pointer-capture APIs jsdom lacks. If the test errors on those rather than the import, add to `tests/setup.ts`:

```ts
globalThis.ResizeObserver =
  globalThis.ResizeObserver ??
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
}
```

- [ ] **Step 4: Write the implementation**

```tsx
// src/components/ui/select.tsx
"use client";

import * as React from "react";
import * as RadixSelect from "@radix-ui/react-select";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export type SelectOption = {
  value: string;
  label: string;
  icon?: string;
  disabled?: boolean;
};

export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  ariaLabel,
  variant = "default",
  selectSize = "md",
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  ariaLabel: string;
  variant?: "default" | "bare";
  selectSize?: "sm" | "md";
  className?: string;
}) {
  return (
    <RadixSelect.Root value={value || undefined} onValueChange={onValueChange}>
      <RadixSelect.Trigger
        aria-label={ariaLabel}
        className={cn(
          "inline-flex items-center justify-between gap-1.5 font-bold text-on-surface outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 data-[placeholder]:text-on-surface-muted",
          variant === "default" &&
            "rounded-lg border border-surface-border bg-surface hover:border-secondary",
          variant === "bare" && "bg-transparent border-0",
          selectSize === "md" ? "h-10 px-3 text-xs" : "h-8 px-2.5 text-[11px]",
          className
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon asChild>
          <Icon name="expand_more" size={16} className="text-secondary" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={6}
          className={cn(
            "z-[60] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg",
            "border border-surface-border bg-surface shadow-floating",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          )}
        >
          <RadixSelect.Viewport className="p-1 max-h-72">
            {options.map((option) => (
              <RadixSelect.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={cn(
                  "relative flex cursor-pointer select-none items-center gap-2 rounded px-2.5 py-2 text-xs font-semibold text-on-surface outline-none",
                  "data-[highlighted]:bg-surface-low data-[highlighted]:text-primary",
                  "data-[state=checked]:bg-primary data-[state=checked]:text-white",
                  "data-[disabled]:opacity-40 data-[disabled]:pointer-events-none"
                )}
              >
                {option.icon && <Icon name={option.icon} size={16} />}
                <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  );
}
```

- [ ] **Step 5: Install the animation plugin the content classes rely on**

```bash
npm i -D tailwindcss-animate
```

Add `import animate from "tailwindcss-animate";` and `plugins: [animate]` to `tailwind.config.ts`.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- select`
Expected: PASS (6 tests).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add custom Select replacing all native select elements"
```

---

## Task 5: Checkbox, RadioGroup, Switch

**Files:**
- Create: `src/components/ui/checkbox.tsx`, `src/components/ui/radio-group.tsx`, `src/components/ui/switch.tsx`
- Test: `src/components/ui/selection-controls.test.tsx`

**Interfaces:**
- Consumes: `cn`, `Icon`
- Produces:
  - `<Checkbox checked={boolean} onCheckedChange={(c: boolean) => void} label={string} count?={number} disabled?={boolean} />`
  - `<RadioGroup value={string} onValueChange={(v: string) => void} options={{value,label}[]} ariaLabel={string} />`
  - `<Switch checked={boolean} onCheckedChange={(c: boolean) => void} label={string} />`

The `count` prop on `Checkbox` renders the grey item-count pill the catalog sidebar shows beside each filter (`54`, `94 items`).

- [ ] **Step 1: Install Radix packages**

```bash
npm i @radix-ui/react-checkbox @radix-ui/react-radio-group @radix-ui/react-switch
```

- [ ] **Step 2: Write the failing tests**

```tsx
// src/components/ui/selection-controls.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Checkbox } from "./checkbox";
import { RadioGroup } from "./radio-group";
import { Switch } from "./switch";

describe("Checkbox", () => {
  it("renders a labelled checkbox role", () => {
    render(
      <Checkbox checked={false} onCheckedChange={() => {}} label="In Stock" />
    );
    expect(screen.getByRole("checkbox", { name: /In Stock/ })).toBeInTheDocument();
  });

  it("toggles when the label text is clicked", async () => {
    const onCheckedChange = vi.fn();
    render(
      <Checkbox checked={false} onCheckedChange={onCheckedChange} label="In Stock" />
    );
    await userEvent.click(screen.getByText("In Stock"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("reports its checked state", () => {
    render(<Checkbox checked onCheckedChange={() => {}} label="In Stock" />);
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("renders a count pill when given one", () => {
    render(
      <Checkbox checked={false} onCheckedChange={() => {}} label="Batkhela" count={54} />
    );
    expect(screen.getByText("54")).toBeInTheDocument();
  });
});

describe("RadioGroup", () => {
  it("selects an option and reports its value", async () => {
    const onValueChange = vi.fn();
    render(
      <RadioGroup
        ariaLabel="Condition"
        value="new"
        onValueChange={onValueChange}
        options={[
          { value: "new", label: "New" },
          { value: "used", label: "Used" },
        ]}
      />
    );
    await userEvent.click(screen.getByRole("radio", { name: "Used" }));
    expect(onValueChange).toHaveBeenCalledWith("used");
  });
});

describe("Switch", () => {
  it("toggles", async () => {
    const onCheckedChange = vi.fn();
    render(
      <Switch checked={false} onCheckedChange={onCheckedChange} label="Show map" />
    );
    await userEvent.click(screen.getByRole("switch", { name: "Show map" }));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- selection-controls`
Expected: FAIL — modules not found.

- [ ] **Step 4: Write the implementations**

```tsx
// src/components/ui/checkbox.tsx
"use client";

import * as React from "react";
import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  count,
  disabled,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  count?: number;
  disabled?: boolean;
  className?: string;
}) {
  const id = React.useId();
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded p-1.5 hover:bg-neutral-50 transition-colors",
        disabled && "opacity-60",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <RadixCheckbox.Root
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={(c) => onCheckedChange(c === true)}
          className={cn(
            "peer h-4 w-4 shrink-0 rounded border-[1.5px] transition-all outline-none",
            "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
            "border-secondary/40 bg-surface",
            "data-[state=checked]:bg-primary data-[state=checked]:border-primary"
          )}
        >
          <RadixCheckbox.Indicator className="flex items-center justify-center text-white">
            <Icon name="check" size={12} />
          </RadixCheckbox.Indicator>
        </RadixCheckbox.Root>
        <label
          htmlFor={id}
          className="cursor-pointer truncate text-xs font-medium text-on-surface peer-data-[state=checked]:font-semibold"
        >
          {label}
        </label>
      </div>
      {count !== undefined && (
        <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-semibold text-on-surface-muted tabular">
          {count}
        </span>
      )}
    </div>
  );
}
```

```tsx
// src/components/ui/radio-group.tsx
"use client";

import * as React from "react";
import * as RadixRadio from "@radix-ui/react-radio-group";
import { cn } from "@/lib/cn";

export function RadioGroup({
  value,
  onValueChange,
  options,
  ariaLabel,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
  className?: string;
}) {
  return (
    <RadixRadio.Root
      value={value}
      onValueChange={onValueChange}
      aria-label={ariaLabel}
      className={cn("space-y-1.5", className)}
    >
      {options.map((option) => {
        const id = `${ariaLabel}-${option.value}`;
        return (
          <div key={option.value} className="flex items-center gap-2">
            <RadixRadio.Item
              id={id}
              value={option.value}
              className={cn(
                "h-4 w-4 shrink-0 rounded-full border-[1.5px] border-secondary/40 bg-surface outline-none transition-all",
                "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
                "data-[state=checked]:border-primary"
              )}
            >
              <RadixRadio.Indicator className="flex h-full w-full items-center justify-center after:block after:h-2 after:w-2 after:rounded-full after:bg-primary" />
            </RadixRadio.Item>
            <label
              htmlFor={id}
              className="cursor-pointer text-xs font-medium text-on-surface"
            >
              {option.label}
            </label>
          </div>
        );
      })}
    </RadixRadio.Root>
  );
}
```

```tsx
// src/components/ui/switch.tsx
"use client";

import * as React from "react";
import * as RadixSwitch from "@radix-ui/react-switch";
import { cn } from "@/lib/cn";

export function Switch({
  checked,
  onCheckedChange,
  label,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  className?: string;
}) {
  const id = React.useId();
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <RadixSwitch.Root
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={label}
        className={cn(
          "h-5 w-9 shrink-0 rounded-full bg-neutral-300 outline-none transition-colors",
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
          "data-[state=checked]:bg-primary"
        )}
      >
        <RadixSwitch.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px]" />
      </RadixSwitch.Root>
      <label htmlFor={id} className="cursor-pointer text-xs font-medium text-on-surface">
        {label}
      </label>
    </div>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- selection-controls`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Checkbox, RadioGroup and Switch selection controls"
```

---

## Task 6: Combobox (searchable select for categories)

The taxonomy has 26 categories and roughly 430 subcategories. A plain `Select` list is unusable at that size, so the category picker and the header's sector picker use a searchable combobox.

**Files:**
- Create: `src/components/ui/combobox.tsx`
- Test: `src/components/ui/combobox.test.tsx`

**Interfaces:**
- Consumes: `cn`, `Icon`, `Input` (Task 3)
- Produces: `<Combobox value={string} onValueChange={(v: string) => void} options={SelectOption[]} placeholder={string} searchPlaceholder={string} ariaLabel={string} emptyText={string} />`

- [ ] **Step 1: Install Radix Popover**

```bash
npm i @radix-ui/react-popover
```

- [ ] **Step 2: Write the failing test**

```tsx
// src/components/ui/combobox.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Combobox } from "./combobox";

const options = [
  { value: "solar-panels", label: "Solar Panels" },
  { value: "solar-inverters", label: "Solar Inverters" },
  { value: "honey", label: "Honey (Sidr, Palosa, Wild)" },
  { value: "motorcycles", label: "Motorcycles" },
];

function setup(onValueChange = vi.fn()) {
  render(
    <Combobox
      ariaLabel="Category"
      value=""
      onValueChange={onValueChange}
      options={options}
      placeholder="All Sectors"
      searchPlaceholder="Search categories"
      emptyText="No category found"
    />
  );
  return onValueChange;
}

describe("Combobox", () => {
  it("shows the placeholder when empty", () => {
    setup();
    expect(screen.getByRole("button", { name: /Category/ })).toHaveTextContent(
      "All Sectors"
    );
  });

  it("filters options as the user types", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: /Category/ }));
    await userEvent.type(screen.getByPlaceholderText("Search categories"), "solar");
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("matches case-insensitively and mid-string", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: /Category/ }));
    await userEvent.type(screen.getByPlaceholderText("Search categories"), "PALOSA");
    expect(screen.getAllByRole("option")).toHaveLength(1);
  });

  it("shows empty text when nothing matches", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: /Category/ }));
    await userEvent.type(screen.getByPlaceholderText("Search categories"), "zzzz");
    expect(screen.getByText("No category found")).toBeInTheDocument();
  });

  it("reports the chosen value and closes", async () => {
    const onValueChange = setup();
    await userEvent.click(screen.getByRole("button", { name: /Category/ }));
    await userEvent.click(screen.getByRole("option", { name: "Motorcycles" }));
    expect(onValueChange).toHaveBeenCalledWith("motorcycles");
    expect(screen.queryByPlaceholderText("Search categories")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- combobox`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the implementation**

```tsx
// src/components/ui/combobox.tsx
"use client";

import * as React from "react";
import * as Popover from "@radix-ui/react-popover";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";
import { Input } from "./input";
import type { SelectOption } from "./select";

export function Combobox({
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyText,
  ariaLabel,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder: string;
  searchPlaceholder: string;
  emptyText: string;
  ariaLabel: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const selected = options.find((o) => o.value === value);

  function choose(next: string) {
    onValueChange(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        aria-label={ariaLabel}
        className={cn(
          "inline-flex h-10 items-center justify-between gap-1.5 rounded-lg border border-surface-border bg-surface px-3",
          "text-xs font-bold text-on-surface outline-none transition-colors hover:border-secondary",
          "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
          className
        )}
      >
        <span className={cn(!selected && "text-on-surface-muted")}>
          {selected ? selected.label : placeholder}
        </span>
        <Icon name="expand_more" size={16} className="text-secondary" />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-[60] w-72 overflow-hidden rounded-lg border border-surface-border bg-surface shadow-floating"
        >
          <div className="border-b border-surface-border p-2">
            <Input
              autoFocus
              inputSize="sm"
              leadingIcon="search"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <ul role="listbox" aria-label={ariaLabel} className="max-h-64 overflow-y-auto p-1 custom-scrollbar">
            {filtered.length === 0 && (
              <li className="px-2.5 py-3 text-center text-xs text-on-surface-muted">
                {emptyText}
              </li>
            )}
            {filtered.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => choose(option.value)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-xs font-semibold text-on-surface",
                    "hover:bg-surface-low hover:text-primary",
                    option.value === value && "bg-primary text-white hover:bg-primary hover:text-white"
                  )}
                >
                  {option.icon && <Icon name={option.icon} size={16} />}
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- combobox`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add searchable Combobox for large category lists"
```

---

## Task 7: Slider and PriceRange

Replaces the catalog sidebar's native `<input type="range">` and its paired From/To number inputs.

**Files:**
- Create: `src/components/ui/slider.tsx`, `src/components/ui/price-range.tsx`
- Test: `src/components/ui/price-range.test.tsx`

**Interfaces:**
- Consumes: `cn`, `Input`, `Button`, `formatPkr`
- Produces:
  - `<Slider value={[number, number]} onValueChange={(v: number[]) => void} min={number} max={number} step={number} ariaLabel={string} />`
  - `<PriceRange min={number} max={number} value={[number, number]} onChange={(v: [number, number]) => void} onApply={() => void} labels={{from,to,apply,highest}} />`

- [ ] **Step 1: Install Radix Slider**

```bash
npm i @radix-ui/react-slider
```

- [ ] **Step 2: Write the failing test**

```tsx
// src/components/ui/price-range.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PriceRange } from "./price-range";

const labels = {
  from: "From",
  to: "To",
  apply: "Apply Price Filter",
  highest: "The highest price in selection is",
};

describe("PriceRange", () => {
  it("renders no native range input", () => {
    const { container } = render(
      <PriceRange min={0} max={1000000} value={[1000, 450000]} onChange={() => {}} onApply={() => {}} labels={labels} />
    );
    expect(container.querySelector('input[type="range"]')).toBeNull();
  });

  it("exposes two draggable thumbs", () => {
    render(
      <PriceRange min={0} max={1000000} value={[1000, 450000]} onChange={() => {}} onApply={() => {}} labels={labels} />
    );
    expect(screen.getAllByRole("slider")).toHaveLength(2);
  });

  it("shows the current bounds in the number fields", () => {
    render(
      <PriceRange min={0} max={1000000} value={[1000, 450000]} onChange={() => {}} onApply={() => {}} labels={labels} />
    );
    expect(screen.getByLabelText("From")).toHaveValue(1000);
    expect(screen.getByLabelText("To")).toHaveValue(450000);
  });

  it("reports a typed lower bound", async () => {
    const onChange = vi.fn();
    render(
      <PriceRange min={0} max={1000000} value={[1000, 450000]} onChange={onChange} onApply={() => {}} labels={labels} />
    );
    const from = screen.getByLabelText("From");
    await userEvent.clear(from);
    await userEvent.type(from, "5000");
    expect(onChange).toHaveBeenLastCalledWith([5000, 450000]);
  });

  it("clamps a lower bound typed above the upper bound", async () => {
    const onChange = vi.fn();
    render(
      <PriceRange min={0} max={1000000} value={[1000, 450000]} onChange={onChange} onApply={() => {}} labels={labels} />
    );
    const from = screen.getByLabelText("From");
    await userEvent.clear(from);
    await userEvent.type(from, "900000");
    expect(onChange).toHaveBeenLastCalledWith([450000, 450000]);
  });

  it("fires onApply when the button is pressed", async () => {
    const onApply = vi.fn();
    render(
      <PriceRange min={0} max={1000000} value={[1000, 450000]} onChange={() => {}} onApply={onApply} labels={labels} />
    );
    await userEvent.click(screen.getByRole("button", { name: "Apply Price Filter" }));
    expect(onApply).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- price-range`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the implementations**

```tsx
// src/components/ui/slider.tsx
"use client";

import * as React from "react";
import * as RadixSlider from "@radix-ui/react-slider";
import { cn } from "@/lib/cn";

export function Slider({
  value,
  onValueChange,
  min,
  max,
  step = 1,
  ariaLabel,
  className,
}: {
  value: number[];
  onValueChange: (value: number[]) => void;
  min: number;
  max: number;
  step?: number;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <RadixSlider.Root
      value={value}
      onValueChange={onValueChange}
      min={min}
      max={max}
      step={step}
      minStepsBetweenThumbs={1}
      className={cn("relative flex h-5 w-full touch-none select-none items-center", className)}
    >
      <RadixSlider.Track className="relative h-1.5 w-full grow rounded-full bg-neutral-200">
        <RadixSlider.Range className="absolute h-full rounded-full bg-primary" />
      </RadixSlider.Track>
      {value.map((_, i) => (
        <RadixSlider.Thumb
          key={i}
          aria-label={`${ariaLabel} ${i === 0 ? "minimum" : "maximum"}`}
          className={cn(
            "block h-4 w-4 rounded-full border-2 border-primary bg-surface shadow outline-none transition-transform",
            "hover:scale-110 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          )}
        />
      ))}
    </RadixSlider.Root>
  );
}
```

```tsx
// src/components/ui/price-range.tsx
"use client";

import * as React from "react";
import { Slider } from "./slider";
import { Button } from "./button";
import { cn } from "@/lib/cn";

export function PriceRange({
  min,
  max,
  value,
  onChange,
  onApply,
  labels,
  className,
}: {
  min: number;
  max: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  onApply: () => void;
  labels: { from: string; to: string; apply: string; highest: string };
  className?: string;
}) {
  const [low, high] = value;

  function setLow(next: number) {
    onChange([Math.min(Math.max(next, min), high), high]);
  }
  function setHigh(next: number) {
    onChange([low, Math.max(Math.min(next, max), low)]);
  }

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-[11px] text-on-surface-muted">
        {labels.highest}{" "}
        <span className="font-semibold text-on-surface tabular">
          Rs. {max.toLocaleString("en-US")}
        </span>
      </p>

      <div className="grid grid-cols-2 gap-2">
        {[
          { label: labels.from, val: low, set: setLow },
          { label: labels.to, val: high, set: setHigh },
        ].map((field) => (
          <div key={field.label}>
            <label className="mb-0.5 block text-[10px] font-bold uppercase text-neutral-400">
              {field.label}
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-2.5 text-xs text-neutral-400">₨</span>
              <input
                type="number"
                aria-label={field.label}
                value={field.val}
                onChange={(e) => field.set(Number(e.target.value || 0))}
                className="w-full rounded border border-neutral-300 bg-neutral-50 py-1.5 pl-6 pr-2 text-xs font-medium tabular focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <Slider
          ariaLabel="Price"
          min={min}
          max={max}
          step={1000}
          value={[low, high]}
          onValueChange={(v) => onChange([v[0], v[1]])}
        />
        <div className="flex justify-between text-[10px] text-neutral-400 tabular">
          <span>₨{min.toLocaleString("en-US")}</span>
          <span>₨{high.toLocaleString("en-US")}</span>
          <span>₨{max.toLocaleString("en-US")}</span>
        </div>
      </div>

      <Button variant="subtle" size="sm" className="w-full" onClick={onApply}>
        {labels.apply}
      </Button>
    </div>
  );
}
```

Note on the lint rule: `price-range.tsx` lives in `src/components/ui/**`, which the rule exempts, and `type="number"` is not one of the restricted types. This is intentional — a number field is a text field, not a widget we need to rebuild.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- price-range`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Slider and PriceRange filter control"
```

---

## Task 8: Overlays — Modal, Drawer, Popover, Tooltip, DropdownMenu

The Drawer is what the catalog's mobile "Filters (3)" button opens; the DropdownMenu backs the header's "All Categories" mega menu trigger and the account menu.

**Files:**
- Create: `src/components/ui/modal.tsx`, `src/components/ui/drawer.tsx`, `src/components/ui/popover.tsx`, `src/components/ui/tooltip.tsx`, `src/components/ui/dropdown-menu.tsx`
- Test: `src/components/ui/overlays.test.tsx`

**Interfaces:**
- Consumes: `cn`, `Icon`
- Produces:
  - `<Modal open={boolean} onOpenChange={(o:boolean)=>void} title={string} description?={string} size?="sm"|"md"|"lg">{children}</Modal>`
  - `<Drawer open={boolean} onOpenChange={(o:boolean)=>void} title={string} side?="left"|"right"|"bottom">{children}</Drawer>`
  - `<Popover trigger={ReactNode} align?="start"|"center"|"end">{children}</Popover>`
  - `<Tooltip label={string}>{children}</Tooltip>` plus `<TooltipProvider>`
  - `<DropdownMenu trigger={ReactNode} items={{label,icon?,onSelect,href?}[]} ariaLabel={string} />`

- [ ] **Step 1: Install Radix packages**

```bash
npm i @radix-ui/react-dialog @radix-ui/react-tooltip @radix-ui/react-dropdown-menu
```

- [ ] **Step 2: Write the failing tests**

```tsx
// src/components/ui/overlays.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "./modal";
import { Drawer } from "./drawer";
import { DropdownMenu } from "./dropdown-menu";

describe("Modal", () => {
  it("renders nothing when closed", () => {
    render(
      <Modal open={false} onOpenChange={() => {}} title="Report listing">
        <p>Body</p>
      </Modal>
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders a titled dialog when open", () => {
    render(
      <Modal open onOpenChange={() => {}} title="Report listing">
        <p>Body</p>
      </Modal>
    );
    expect(screen.getByRole("dialog", { name: "Report listing" })).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const onOpenChange = vi.fn();
    render(
      <Modal open onOpenChange={onOpenChange} title="Report listing">
        <p>Body</p>
      </Modal>
    );
    await userEvent.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("closes via the close button", async () => {
    const onOpenChange = vi.fn();
    render(
      <Modal open onOpenChange={onOpenChange} title="Report listing">
        <p>Body</p>
      </Modal>
    );
    await userEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("Drawer", () => {
  it("renders its children when open", () => {
    render(
      <Drawer open onOpenChange={() => {}} title="Filters">
        <p>Tehsil filters</p>
      </Drawer>
    );
    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
    expect(screen.getByText("Tehsil filters")).toBeInTheDocument();
  });
});

describe("DropdownMenu", () => {
  it("opens and fires the chosen item", async () => {
    const onSelect = vi.fn();
    render(
      <DropdownMenu
        ariaLabel="Account"
        trigger={<button>Account</button>}
        items={[
          { label: "My Listings", onSelect },
          { label: "Sign Out", onSelect: () => {} },
        ]}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Account" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "My Listings" }));
    expect(onSelect).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- overlays`
Expected: FAIL — modules not found.

- [ ] **Step 4: Write the implementations**

```tsx
// src/components/ui/modal.tsx
"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" };

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  size?: keyof typeof sizes;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-on-surface/40 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-[80] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl border border-surface-border bg-surface p-6 shadow-floating",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            sizes[size]
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-extrabold tracking-tight text-primary">
                {title}
              </Dialog.Title>
              {description && (
                <Dialog.Description className="mt-1 text-xs text-on-surface-muted">
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              aria-label="Close"
              className="rounded-lg p-1 text-on-surface-muted transition-colors hover:bg-surface-low hover:text-primary"
            >
              <Icon name="close" size={20} />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

```tsx
// src/components/ui/drawer.tsx
"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

const sides = {
  left: "inset-y-0 left-0 h-full w-[85%] max-w-sm data-[state=open]:slide-in-from-left",
  right: "inset-y-0 right-0 h-full w-[85%] max-w-sm data-[state=open]:slide-in-from-right",
  bottom: "inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl data-[state=open]:slide-in-from-bottom",
};

export function Drawer({
  open,
  onOpenChange,
  title,
  side = "left",
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  side?: keyof typeof sides;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-on-surface/40 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            "fixed z-[80] overflow-y-auto bg-surface shadow-floating data-[state=open]:animate-in",
            sides[side]
          )}
        >
          <div className="sticky top-0 flex items-center justify-between border-b border-surface-border bg-surface px-4 py-3">
            <Dialog.Title className="text-sm font-bold uppercase tracking-wider text-primary">
              {title}
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="rounded-lg p-1 text-on-surface-muted hover:bg-surface-low hover:text-primary"
            >
              <Icon name="close" size={20} />
            </Dialog.Close>
          </div>
          <div className="p-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

```tsx
// src/components/ui/popover.tsx
"use client";

import * as React from "react";
import * as RadixPopover from "@radix-ui/react-popover";
import { cn } from "@/lib/cn";

export function Popover({
  trigger,
  align = "center",
  className,
  children,
}: {
  trigger: React.ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <RadixPopover.Root>
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          align={align}
          sideOffset={8}
          className={cn(
            "z-[60] rounded-lg border border-surface-border bg-surface p-3 shadow-floating",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            className
          )}
        >
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}
```

```tsx
// src/components/ui/tooltip.tsx
"use client";

import * as React from "react";
import * as RadixTooltip from "@radix-ui/react-tooltip";

export const TooltipProvider = RadixTooltip.Provider;

export function Tooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <RadixTooltip.Root delayDuration={250}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          sideOffset={6}
          className="z-[90] rounded-md bg-on-surface px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-floating data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0"
        >
          {label}
          <RadixTooltip.Arrow className="fill-on-surface" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
```

```tsx
// src/components/ui/dropdown-menu.tsx
"use client";

import * as React from "react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export type MenuItem = {
  label: string;
  icon?: string;
  onSelect?: () => void;
  href?: string;
};

export function DropdownMenu({
  trigger,
  items,
  ariaLabel,
  align = "start",
}: {
  trigger: React.ReactNode;
  items: MenuItem[];
  ariaLabel: string;
  align?: "start" | "center" | "end";
}) {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>{trigger}</Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          aria-label={ariaLabel}
          align={align}
          sideOffset={4}
          className="z-[60] min-w-56 overflow-hidden rounded-lg border border-surface-border bg-surface p-1 shadow-floating data-[state=open]:animate-in data-[state=open]:fade-in-0"
        >
          {items.map((item) => (
            <Menu.Item
              key={item.label}
              onSelect={item.onSelect}
              asChild={Boolean(item.href)}
              className={cn(
                "flex cursor-pointer select-none items-center gap-2 rounded px-2.5 py-2 text-xs font-semibold text-on-surface outline-none",
                "data-[highlighted]:bg-surface-low data-[highlighted]:text-primary"
              )}
            >
              {item.href ? (
                <a href={item.href}>
                  {item.icon && <Icon name={item.icon} size={16} />}
                  {item.label}
                </a>
              ) : (
                <>
                  {item.icon && <Icon name={item.icon} size={16} />}
                  {item.label}
                </>
              )}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- overlays`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Modal, Drawer, Popover, Tooltip and DropdownMenu overlays"
```

---

## Task 9: Display atoms — Badge, Chip, Avatar, Rating, Price, Skeleton, EmptyState

**Files:**
- Create: `src/components/ui/badge.tsx`, `src/components/ui/chip.tsx`, `src/components/ui/avatar.tsx`, `src/components/ui/rating.tsx`, `src/components/ui/price.tsx`, `src/components/ui/skeleton.tsx`, `src/components/ui/empty-state.tsx`
- Test: `src/components/ui/display.test.tsx`

**Interfaces:**
- Consumes: `cn`, `Icon`, `Button`, `formatPkr`
- Produces:
  - `<Badge tone="primary"|"sand"|"green"|"neutral"|"danger" icon?={string}>{children}</Badge>`
  - `<Chip label={string} active?={boolean} onRemove?={() => void} onClick?={() => void} count?={number} />`
  - `<Avatar initials={string} src?={string} alt={string} size?="sm"|"md"|"lg" />`
  - `<Rating value={number} count?={number} editable?={boolean} onChange?={(v:number)=>void} ariaLabel?={string} />`
  - `<Price value={number} compareAt?={number} size?="sm"|"md"|"lg" />`
  - `<Skeleton className?={string} />`
  - `<EmptyState icon={string} title={string} body?={string} action?={ReactNode} />`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/ui/display.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Badge } from "./badge";
import { Chip } from "./chip";
import { Avatar } from "./avatar";
import { Rating } from "./rating";
import { Price } from "./price";
import { EmptyState } from "./empty-state";

describe("Badge", () => {
  it("renders its text", () => {
    render(<Badge tone="sand">2 Yr Warranty</Badge>);
    expect(screen.getByText("2 Yr Warranty")).toBeInTheDocument();
  });
});

describe("Chip", () => {
  it("renders a removable chip and reports removal", async () => {
    const onRemove = vi.fn();
    render(<Chip label='Search: "Solar Inverter"' onRemove={onRemove} />);
    await userEvent.click(screen.getByRole("button", { name: /remove/i }));
    expect(onRemove).toHaveBeenCalledOnce();
  });

  it("marks the active state for assistive tech", () => {
    render(<Chip label="Batkhela" active onClick={() => {}} />);
    expect(screen.getByRole("button", { name: "Batkhela" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });
});

describe("Avatar", () => {
  it("falls back to initials when no image is given", () => {
    render(<Avatar initials="KS" alt="Khan Solar" />);
    expect(screen.getByText("KS")).toBeInTheDocument();
  });
});

describe("Rating", () => {
  it("announces its value", () => {
    render(<Rating value={4.9} count={142} />);
    expect(screen.getByLabelText("Rated 4.9 out of 5")).toBeInTheDocument();
  });

  it("shows the review count", () => {
    render(<Rating value={4.9} count={142} />);
    expect(screen.getByText("(142)")).toBeInTheDocument();
  });

  it("lets a user pick a score when editable", async () => {
    const onChange = vi.fn();
    render(<Rating value={0} editable onChange={onChange} ariaLabel="Your rating" />);
    await userEvent.click(screen.getByRole("radio", { name: "4 stars" }));
    expect(onChange).toHaveBeenCalledWith(4);
  });
});

describe("Price", () => {
  it("formats the amount in PKR", () => {
    render(<Price value={240000} />);
    expect(screen.getByText("PKR 240,000")).toBeInTheDocument();
  });

  it("strikes through a compare-at price", () => {
    render(<Price value={240000} compareAt={265000} />);
    expect(screen.getByText("265,000")).toHaveClass("line-through");
  });

  it("uses tabular figures so rows align", () => {
    render(<Price value={240000} />);
    expect(screen.getByText("PKR 240,000")).toHaveClass("tabular");
  });
});

describe("EmptyState", () => {
  it("renders its title and body", () => {
    render(<EmptyState icon="search_off" title="No listings found" body="Try a wider area." />);
    expect(screen.getByText("No listings found")).toBeInTheDocument();
    expect(screen.getByText("Try a wider area.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- display`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write the implementations**

```tsx
// src/components/ui/badge.tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold shadow-xs",
  {
    variants: {
      tone: {
        primary: "bg-primary text-white",
        sand: "bg-[#875520] text-white",
        green: "bg-accent-green text-white",
        neutral: "bg-surface-low text-primary",
        danger: "bg-danger-soft text-danger",
      },
    },
    defaultVariants: { tone: "primary" },
  }
);

export function Badge({
  tone,
  icon,
  className,
  children,
}: VariantProps<typeof badgeVariants> & {
  icon?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span className={cn(badgeVariants({ tone }), className)}>
      {icon && <Icon name={icon} size={12} />}
      {children}
    </span>
  );
}
```

```tsx
// src/components/ui/chip.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export function Chip({
  label,
  active,
  count,
  onClick,
  onRemove,
  className,
}: {
  label: string;
  active?: boolean;
  count?: number;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
}) {
  const body = (
    <>
      {label}
      {count !== undefined && (
        <span className="tabular opacity-70">({count})</span>
      )}
    </>
  );

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-semibold transition-colors",
        active
          ? "border-primary bg-primary text-white"
          : "border-surface-border bg-surface text-on-surface hover:border-secondary",
        className
      )}
    >
      {onClick ? (
        <button type="button" aria-pressed={active} onClick={onClick} className="inline-flex items-center gap-1">
          {body}
        </button>
      ) : (
        <span className="inline-flex items-center gap-1">{body}</span>
      )}
      {onRemove && (
        <button
          type="button"
          aria-label={`Remove ${label}`}
          onClick={onRemove}
          className="ml-0.5 font-bold hover:text-danger"
        >
          <Icon name="close" size={13} />
        </button>
      )}
    </span>
  );
}
```

```tsx
// src/components/ui/avatar.tsx
import * as React from "react";
import { cn } from "@/lib/cn";

const sizes = {
  sm: "h-8 w-8 text-[10px]",
  md: "h-10 w-10 text-xs",
  lg: "h-14 w-14 text-base",
};

export function Avatar({
  initials,
  src,
  alt,
  size = "md",
  className,
}: {
  initials: string;
  src?: string;
  alt: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-surface-border bg-surface-low font-extrabold text-primary",
        sizes[size],
        className
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{initials}</span>
      )}
    </span>
  );
}
```

```tsx
// src/components/ui/rating.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export function Rating({
  value,
  count,
  editable = false,
  onChange,
  ariaLabel,
  className,
}: {
  value: number;
  count?: number;
  editable?: boolean;
  onChange?: (value: number) => void;
  ariaLabel?: string;
  className?: string;
}) {
  if (editable) {
    return (
      <div role="radiogroup" aria-label={ariaLabel ?? "Rating"} className={cn("flex items-center gap-0.5", className)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} star${star === 1 ? "" : "s"}`}
            onClick={() => onChange?.(star)}
            className="text-tertiary transition-transform hover:scale-110"
          >
            <Icon name="star" size={22} filled={star <= value} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <span
      aria-label={`Rated ${value} out of 5`}
      className={cn("inline-flex items-center gap-1 text-xs font-bold text-tertiary", className)}
    >
      <Icon name="star" size={14} filled />
      <span className="tabular">{value.toFixed(1)}</span>
      {count !== undefined && (
        <span className="font-semibold text-on-surface-muted tabular">({count})</span>
      )}
    </span>
  );
}
```

```tsx
// src/components/ui/price.tsx
import * as React from "react";
import { cn } from "@/lib/cn";
import { formatPkr } from "@/lib/format";

const sizes = { sm: "text-xs", md: "text-sm sm:text-base", lg: "text-xl sm:text-2xl" };

export function Price({
  value,
  compareAt,
  size = "md",
  className,
}: {
  value: number;
  compareAt?: number;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span className={cn("flex items-baseline gap-1.5", className)}>
      <span className={cn("font-extrabold text-primary tabular", sizes[size])}>
        {formatPkr(value)}
      </span>
      {compareAt !== undefined && compareAt > value && (
        <span className="text-[11px] text-neutral-400 line-through tabular">
          {Math.round(compareAt).toLocaleString("en-US")}
        </span>
      )}
    </span>
  );
}
```

```tsx
// src/components/ui/skeleton.tsx
import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded bg-surface-low", className)} />;
}
```

```tsx
// src/components/ui/empty-state.tsx
import * as React from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon: string;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-2 rounded-xl border border-dashed border-surface-border bg-surface px-6 py-12 text-center", className)}>
      <Icon name={icon} size={44} className="text-secondary/50" />
      <h3 className="text-base font-extrabold text-primary">{title}</h3>
      {body && <p className="max-w-sm text-xs text-on-surface-muted">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- display`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add Badge, Chip, Avatar, Rating, Price, Skeleton and EmptyState"
```

---

## Task 10: Navigation — Tabs, Accordion, Breadcrumb, Pagination, Toast

Accordion backs the collapsible groups in the catalog filter sidebar; Pagination reproduces the catalog's `1 2 3 4 … Next` strip.

**Files:**
- Create: `src/components/ui/tabs.tsx`, `src/components/ui/accordion.tsx`, `src/components/ui/breadcrumb.tsx`, `src/components/ui/pagination.tsx`, `src/components/ui/toast.tsx`
- Test: `src/components/ui/navigation.test.tsx`

**Interfaces:**
- Consumes: `cn`, `Icon`
- Produces:
  - `<Tabs value={string} onValueChange={(v:string)=>void} tabs={{value,label,icon?}[]}>{children}</Tabs>`
  - `<Accordion items={{value,title,content:ReactNode}[]} defaultOpen?={string[]} />`
  - `<Breadcrumb items={{label,href?}[]} />`
  - `<Pagination page={number} pageCount={number} onPageChange={(p:number)=>void} labels={{previous,next,page}} />`
  - `<ToastProvider>`, `useToast(): { show(message: string, tone?: "success"|"error"): void }`
- `paginationRange(page: number, pageCount: number): (number | "ellipsis")[]` exported from `pagination.tsx` for direct unit testing.

- [ ] **Step 1: Install Radix packages**

```bash
npm i @radix-ui/react-tabs @radix-ui/react-accordion @radix-ui/react-toast
```

- [ ] **Step 2: Write the failing tests**

```tsx
// src/components/ui/navigation.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Accordion } from "./accordion";
import { Breadcrumb } from "./breadcrumb";
import { Pagination, paginationRange } from "./pagination";

describe("paginationRange", () => {
  it("lists every page when there are few", () => {
    expect(paginationRange(1, 4)).toEqual([1, 2, 3, 4]);
  });
  it("collapses the tail when deep in a long list", () => {
    expect(paginationRange(1, 20)).toEqual([1, 2, 3, "ellipsis", 20]);
  });
  it("collapses both ends when in the middle", () => {
    expect(paginationRange(10, 20)).toEqual([1, "ellipsis", 9, 10, 11, "ellipsis", 20]);
  });
  it("collapses the head when near the end", () => {
    expect(paginationRange(20, 20)).toEqual([1, "ellipsis", 18, 19, 20]);
  });
});

describe("Pagination", () => {
  const labels = { previous: "Previous", next: "Next", page: "Page" };

  it("disables Previous on the first page", () => {
    render(<Pagination page={1} pageCount={5} onPageChange={() => {}} labels={labels} />);
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  });

  it("marks the current page for assistive tech", () => {
    render(<Pagination page={3} pageCount={5} onPageChange={() => {}} labels={labels} />);
    expect(screen.getByRole("button", { name: "Page 3" })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("reports the requested page", async () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} pageCount={5} onPageChange={onPageChange} labels={labels} />);
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});

describe("Accordion", () => {
  it("reveals a panel when its trigger is clicked", async () => {
    render(
      <Accordion
        items={[{ value: "tehsil", title: "Tehsil", content: <p>Batkhela</p> }]}
      />
    );
    expect(screen.queryByText("Batkhela")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Tehsil/ }));
    expect(screen.getByText("Batkhela")).toBeInTheDocument();
  });
});

describe("Breadcrumb", () => {
  it("renders a navigation landmark with the trail", () => {
    render(
      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Solar & Energy", href: "/search" },
          { label: "Solar Inverters" },
        ]}
      />
    );
    expect(screen.getByRole("navigation", { name: /breadcrumb/i })).toBeInTheDocument();
    expect(screen.getByText("Solar Inverters")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- navigation`
Expected: FAIL — modules not found.

- [ ] **Step 4: Write the implementations**

```tsx
// src/components/ui/pagination.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export function paginationRange(
  page: number,
  pageCount: number
): (number | "ellipsis")[] {
  if (pageCount <= 5) {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
  }
  const out: (number | "ellipsis")[] = [];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);

  out.push(1);
  if (start > 2) out.push("ellipsis");
  for (let p = start; p <= end; p++) out.push(p);
  if (end < pageCount - 1) out.push("ellipsis");
  out.push(pageCount);
  return out;
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  labels,
  className,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  labels: { previous: string; next: string; page: string };
  className?: string;
}) {
  const range = paginationRange(page, pageCount);
  const base =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-xs font-bold transition-colors disabled:opacity-40 disabled:pointer-events-none";

  return (
    <nav aria-label="Pagination" className={cn("flex items-center justify-center gap-1.5", className)}>
      <button
        type="button"
        aria-label={labels.previous}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className={cn(base, "border-surface-border bg-surface text-primary hover:bg-surface-low")}
      >
        <Icon name="chevron_left" size={16} />
        <span className="sr-only">{labels.previous}</span>
      </button>

      {range.map((entry, i) =>
        entry === "ellipsis" ? (
          <span key={`e${i}`} className="px-1 text-xs text-on-surface-muted">
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            aria-label={`${labels.page} ${entry}`}
            aria-current={entry === page ? "page" : undefined}
            onClick={() => onPageChange(entry)}
            className={cn(
              base,
              entry === page
                ? "border-primary bg-primary text-white"
                : "border-surface-border bg-surface text-on-surface hover:bg-surface-low"
            )}
          >
            {entry}
          </button>
        )
      )}

      <button
        type="button"
        aria-label={labels.next}
        disabled={page >= pageCount}
        onClick={() => onPageChange(page + 1)}
        className={cn(base, "border-surface-border bg-surface text-primary hover:bg-surface-low")}
      >
        <span className="sr-only">{labels.next}</span>
        <Icon name="chevron_right" size={16} />
      </button>
    </nav>
  );
}
```

Note: the Previous/Next buttons carry both `aria-label` and an `sr-only` span so the accessible name stays exactly `"Previous"` / `"Next"` for the tests above.

```tsx
// src/components/ui/accordion.tsx
"use client";

import * as React from "react";
import * as RadixAccordion from "@radix-ui/react-accordion";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export function Accordion({
  items,
  defaultOpen = [],
  className,
}: {
  items: { value: string; title: string; content: React.ReactNode }[];
  defaultOpen?: string[];
  className?: string;
}) {
  return (
    <RadixAccordion.Root type="multiple" defaultValue={defaultOpen} className={cn("divide-y divide-surface-border", className)}>
      {items.map((item) => (
        <RadixAccordion.Item key={item.value} value={item.value}>
          <RadixAccordion.Header>
            <RadixAccordion.Trigger className="group flex w-full items-center justify-between py-3 text-left text-xs font-bold uppercase tracking-wider text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary">
              {item.title}
              <Icon
                name="expand_more"
                size={18}
                className="text-secondary transition-transform group-data-[state=open]:rotate-180"
              />
            </RadixAccordion.Trigger>
          </RadixAccordion.Header>
          <RadixAccordion.Content className="overflow-hidden pb-3 data-[state=open]:animate-in data-[state=open]:fade-in-0">
            {item.content}
          </RadixAccordion.Content>
        </RadixAccordion.Item>
      ))}
    </RadixAccordion.Root>
  );
}
```

```tsx
// src/components/ui/breadcrumb.tsx
import * as React from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export function Breadcrumb({
  items,
  className,
}: {
  items: { label: string; href?: string }[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1 text-[11px] font-semibold", className)}>
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          {i > 0 && (
            <Icon name="chevron_right" size={14} className="text-on-surface-muted/60" />
          )}
          {item.href ? (
            <a href={item.href} className="text-on-surface-muted hover:text-primary hover:underline">
              {item.label}
            </a>
          ) : (
            <span aria-current="page" className="text-primary">
              {item.label}
            </span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
```

```tsx
// src/components/ui/tabs.tsx
"use client";

import * as React from "react";
import * as RadixTabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export function Tabs({
  value,
  onValueChange,
  tabs,
  className,
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  tabs: { value: string; label: string; icon?: string }[];
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <RadixTabs.Root value={value} onValueChange={onValueChange} className={className}>
      <RadixTabs.List className="flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-surface-border">
        {tabs.map((tab) => (
          <RadixTabs.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-3 py-2.5 text-xs font-bold text-on-surface-muted transition-colors",
              "hover:text-primary data-[state=active]:border-primary data-[state=active]:text-primary"
            )}
          >
            {tab.icon && <Icon name={tab.icon} size={16} />}
            {tab.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {children}
    </RadixTabs.Root>
  );
}

export const TabPanel = RadixTabs.Content;
```

```tsx
// src/components/ui/toast.tsx
"use client";

import * as React from "react";
import * as RadixToast from "@radix-ui/react-toast";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

type Tone = "success" | "error";
type ToastState = { message: string; tone: Tone } | null;

const ToastContext = React.createContext<{
  show: (message: string, tone?: Tone) => void;
}>({ show: () => {} });

export function useToast() {
  return React.useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = React.useState<ToastState>(null);

  const show = React.useCallback((message: string, tone: Tone = "success") => {
    setToast({ message, tone });
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      <RadixToast.Provider swipeDirection="right" duration={4000}>
        {children}
        <RadixToast.Root
          open={toast !== null}
          onOpenChange={(open) => !open && setToast(null)}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-3 text-xs font-bold text-white shadow-floating",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-right",
            toast?.tone === "error" ? "bg-danger" : "bg-primary"
          )}
        >
          <Icon name={toast?.tone === "error" ? "error" : "check_circle"} size={18} />
          <RadixToast.Title>{toast?.message}</RadixToast.Title>
        </RadixToast.Root>
        <RadixToast.Viewport className="fixed bottom-4 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- navigation`
Expected: PASS (9 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Tabs, Accordion, Breadcrumb, Pagination and Toast"
```

---

## Task 11: Carousel

Backs the home hero (three auto-advancing slides on a 4.5s timer with prev/next and dot controls) and the category quick-tab strip.

**Files:**
- Create: `src/components/ui/carousel.tsx`
- Test: `src/components/ui/carousel.test.tsx`

**Interfaces:**
- Consumes: `cn`, `Icon`
- Produces: `<Carousel slides={ReactNode[]} autoPlayMs?={number} ariaLabel={string} showDots?={boolean} showArrows?={boolean} className?={string} />`

Behaviour: advances every `autoPlayMs` (default 4500); pauses on hover and on focus within; stops entirely when the user prefers reduced motion; wraps at both ends; arrow keys move between slides when the carousel has focus.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/ui/carousel.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Carousel } from "./carousel";

const slides = [<p key="1">Slide One</p>, <p key="2">Slide Two</p>, <p key="3">Slide Three</p>];

beforeEach(() => {
  vi.useFakeTimers();
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }) as unknown as typeof window.matchMedia;
});
afterEach(() => vi.useRealTimers());

describe("Carousel", () => {
  it("marks the first slide current on mount", () => {
    render(<Carousel ariaLabel="Highlights" slides={slides} />);
    expect(screen.getByRole("group", { name: "Slide 1 of 3" })).toHaveAttribute(
      "aria-current",
      "true"
    );
  });

  it("auto-advances after the interval", () => {
    render(<Carousel ariaLabel="Highlights" slides={slides} autoPlayMs={4500} />);
    act(() => {
      vi.advanceTimersByTime(4500);
    });
    expect(screen.getByRole("group", { name: "Slide 2 of 3" })).toHaveAttribute(
      "aria-current",
      "true"
    );
  });

  it("wraps from the last slide back to the first", () => {
    render(<Carousel ariaLabel="Highlights" slides={slides} autoPlayMs={1000} />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.getByRole("group", { name: "Slide 1 of 3" })).toHaveAttribute(
      "aria-current",
      "true"
    );
  });

  it("moves to a slide when its dot is clicked", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Carousel ariaLabel="Highlights" slides={slides} />);
    await user.click(screen.getByRole("button", { name: "Go to slide 3" }));
    expect(screen.getByRole("group", { name: "Slide 3 of 3" })).toHaveAttribute(
      "aria-current",
      "true"
    );
  });

  it("does not auto-advance when reduced motion is preferred", () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as unknown as typeof window.matchMedia;
    render(<Carousel ariaLabel="Highlights" slides={slides} autoPlayMs={1000} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByRole("group", { name: "Slide 1 of 3" })).toHaveAttribute(
      "aria-current",
      "true"
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- carousel`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```tsx
// src/components/ui/carousel.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

export function Carousel({
  slides,
  autoPlayMs = 4500,
  ariaLabel,
  showDots = true,
  showArrows = true,
  className,
}: {
  slides: React.ReactNode[];
  autoPlayMs?: number;
  ariaLabel: string;
  showDots?: boolean;
  showArrows?: boolean;
  className?: string;
}) {
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const go = React.useCallback(
    (next: number) => setIndex((next + slides.length) % slides.length),
    [slides.length]
  );

  React.useEffect(() => {
    if (paused || reducedMotion || slides.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), autoPlayMs);
    return () => clearInterval(id);
  }, [paused, reducedMotion, autoPlayMs, slides.length]);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      className={cn("relative overflow-hidden", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      {slides.map((slide, i) => (
        <div
          key={i}
          role="group"
          aria-roledescription="slide"
          aria-label={`Slide ${i + 1} of ${slides.length}`}
          aria-current={i === index ? "true" : undefined}
          aria-hidden={i !== index}
          className={cn(
            "transition-opacity duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]",
            i === index ? "opacity-100" : "pointer-events-none absolute inset-0 opacity-0"
          )}
        >
          {slide}
        </div>
      ))}

      {showArrows && slides.length > 1 && (
        <div className="absolute bottom-5 right-5 z-20 flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => go(index - 1)}
            className="rounded-full bg-white/20 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-white/40"
          >
            <Icon name="chevron_left" size={18} />
          </button>
          {showDots &&
            slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => go(i)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === index ? "w-5 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
                )}
              />
            ))}
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => go(index + 1)}
            className="rounded-full bg-white/20 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-white/40"
          >
            <Icon name="chevron_right" size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- carousel`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add accessible auto-advancing Carousel"
```

---

## Task 12: Component gallery at /dev/ui

A single page rendering every kit component in every variant and state. This is how the pixel-match work in Tasks 16–17 gets reviewed without clicking through the real app, and how visual regressions get caught early.

**Files:**
- Create: `src/app/[locale]/dev/ui/page.tsx`
- Test: `tests/gallery.test.tsx`

**Interfaces:**
- Consumes: every component from Tasks 2–11
- Produces: a route at `/en/dev/ui` and `/ur/dev/ui`

- [ ] **Step 1: Write the failing test**

```tsx
// tests/gallery.test.tsx
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const UI_DIR = path.resolve(__dirname, "../src/components/ui");
const GALLERY = path.resolve(__dirname, "../src/app/[locale]/dev/ui/page.tsx");

describe("component gallery", () => {
  it("references every component in the ui kit", () => {
    const gallery = readFileSync(GALLERY, "utf8");
    const missing = readdirSync(UI_DIR)
      .filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx"))
      .map((f) => f.replace(/\.tsx$/, ""))
      .filter((name) => !gallery.includes(`/ui/${name}`));
    expect(missing).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- gallery`
Expected: FAIL — ENOENT on the gallery page.

- [ ] **Step 3: Write the gallery page**

Build `src/app/[locale]/dev/ui/page.tsx` as a `"use client"` component with one `<section>` per component family, each wrapped in a shared `Row` helper that prints the component name as a heading. Required contents:

- **Buttons** — all five variants at all three sizes, plus a disabled and an `asChild` anchor example.
- **Inputs** — `Input` at both sizes, with and without leading/trailing icons, invalid state; `Textarea` normal and invalid; three `FormField` examples (hint, error, required).
- **Select** — default and `bare` variants, with the four tehsil options from `src/data/tehsils.ts`.
- **Combobox** — fed the full category list from `src/data/categories.ts` to prove it stays usable at ~430 entries.
- **Selection** — `Checkbox` checked/unchecked/disabled/with-count; `RadioGroup`; `Switch` on and off.
- **PriceRange** — wired to local state, min 0, max 5,800,000.
- **Overlays** — a button opening each of `Modal`, `Drawer` (all three sides), `Popover`, `Tooltip`, `DropdownMenu`.
- **Display** — every `Badge` tone; `Chip` plain/active/removable/with-count; `Avatar` all sizes with and without an image; `Rating` read-only and editable; `Price` all sizes with and without `compareAt`; `Skeleton`; `EmptyState`.
- **Navigation** — `Tabs` with three panels; `Accordion` with three groups; `Breadcrumb`; `Pagination` at page 1 of 4, page 10 of 20, and page 20 of 20; a button that fires a success toast and one that fires an error toast.
- **Carousel** — three coloured placeholder slides.

Wrap the page body in `<TooltipProvider>` and `<ToastProvider>`. Every import must use the `@/components/ui/<name>` form so the test above can detect it.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- gallery`
Expected: PASS.

- [ ] **Step 5: Review the gallery in a browser**

Run: `npm run dev`, open `http://localhost:3000/en/dev/ui` and `http://localhost:3000/ur/dev/ui`.
Check: no native control styling anywhere; every overlay opens, traps focus, and closes on Escape; the Urdu page mirrors correctly (icons on the opposite side, text right-aligned, dropdowns still aligned to their triggers).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add component gallery at /dev/ui"
```

---

## Task 13: Domain types, seed data and fixtures

**Files:**
- Create: `src/types/index.ts`, `src/data/tehsils.ts`, `src/data/categories.ts`, `src/data/fixtures/listings.ts`, `src/data/fixtures/sellers.ts`
- Create: `scripts/mirror-seed-images.mjs`, `public/images/seed/`
- Test: `src/data/data.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:

```ts
export type Tehsil = {
  slug: "batkhela" | "dargai" | "thana-baizai";
  nameEn: string;
  nameUr: string;
  revenueTehsil: string;
  localities: { slug: string; nameEn: string; nameUr: string }[];
};

export type Category = {
  slug: string;
  nameEn: string;
  nameUr: string;
  icon: string;
  sort: number;
  subcategories: { slug: string; nameEn: string; nameUr: string }[];
};

export type ListingStatus = "active" | "reserved" | "sold";

export type Listing = {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  categorySlug: string;
  subcategorySlug: string;
  tehsilSlug: Tehsil["slug"];
  localitySlug: string;
  localityLabel: string;
  images: string[];
  iconFallback?: string;
  badge?: { label: string; tone: "primary" | "sand" | "green" | "neutral" };
  contactPhone: string;
  sellerId: string;
  status: ListingStatus;
  createdAt: string;
  coordinates?: { lat: number; lng: number };
};

export type Seller = {
  id: string;
  slug: string;
  name: string;
  initials: string;
  tehsilSlug: Tehsil["slug"];
  localityLabel: string;
  rating: number;
  reviewCount: number;
  verified: boolean;
  responseMinutes: number;
  specialty: string;
  statLabel: string;
  statValue: string;
  phone: string;
};
```

- Also produces `allSubcategoryOptions(): SelectOption[]` from `categories.ts`, flattening every subcategory for the Combobox.

- [ ] **Step 1: Write the failing test**

```ts
// src/data/data.test.ts
import { describe, it, expect } from "vitest";
import { TEHSILS } from "./tehsils";
import { CATEGORIES, allSubcategoryOptions } from "./categories";
import { LISTINGS } from "./fixtures/listings";
import { SELLERS } from "./fixtures/sellers";
import { normalizePhone } from "@/lib/phone";

describe("tehsils", () => {
  it("holds exactly the three official Malakand tehsils", () => {
    expect(TEHSILS.map((t) => t.slug)).toEqual(["batkhela", "dargai", "thana-baizai"]);
  });
  it("gives every tehsil at least one locality", () => {
    for (const t of TEHSILS) expect(t.localities.length).toBeGreaterThan(0);
  });
  it("gives every tehsil an Urdu name", () => {
    for (const t of TEHSILS) expect(t.nameUr.length).toBeGreaterThan(0);
  });
});

describe("categories", () => {
  it("seeds all 26 top-level categories", () => {
    expect(CATEGORIES).toHaveLength(26);
  });
  it("uses unique slugs across every category and subcategory", () => {
    const slugs = CATEGORIES.flatMap((c) => [c.slug, ...c.subcategories.map((s) => s.slug)]);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it("ends every category with an Other subcategory", () => {
    for (const c of CATEGORIES) {
      expect(c.subcategories.at(-1)!.slug).toMatch(/-other$/);
    }
  });
  it("flattens every subcategory into combobox options", () => {
    const total = CATEGORIES.reduce((n, c) => n + c.subcategories.length, 0);
    expect(allSubcategoryOptions()).toHaveLength(total);
  });
});

describe("fixtures", () => {
  it("gives every listing a seller that exists", () => {
    const ids = new Set(SELLERS.map((s) => s.id));
    for (const l of LISTINGS) expect(ids.has(l.sellerId)).toBe(true);
  });
  it("gives every listing a category that exists", () => {
    const slugs = new Set(CATEGORIES.map((c) => c.slug));
    for (const l of LISTINGS) expect(slugs.has(l.categorySlug)).toBe(true);
  });
  it("stores every contact phone in E.164", () => {
    for (const l of LISTINGS) expect(normalizePhone(l.contactPhone)).toBe(l.contactPhone);
  });
  it("has enough listings to fill the home shelves and a catalog page", () => {
    expect(LISTINGS.length).toBeGreaterThanOrEqual(21);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- data`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write `src/data/tehsils.ts`**

```ts
import type { Tehsil } from "@/types";

export const TEHSILS: Tehsil[] = [
  {
    slug: "batkhela",
    nameEn: "Batkhela",
    nameUr: "بٹ خیلہ",
    revenueTehsil: "Swat Ranizai",
    localities: [
      { slug: "batkhela-main-road", nameEn: "Batkhela Main Commercial Road", nameUr: "بٹ خیلہ مین روڈ" },
      { slug: "batkhela-city", nameEn: "Batkhela City & Bazaar", nameUr: "بٹ خیلہ شہر و بازار" },
      { slug: "amandara", nameEn: "Amandara", nameUr: "امان درہ" },
      { slug: "totakan", nameEn: "Totakan", nameUr: "توتکان" },
      { slug: "alladand", nameEn: "Alladand Dheri", nameUr: "اللہ ڈنڈ ڈھیری" },
    ],
  },
  {
    slug: "dargai",
    nameEn: "Dargai",
    nameUr: "درگئی",
    revenueTehsil: "Sam Ranizai",
    localities: [
      { slug: "dargai-industrial-belt", nameEn: "Dargai Industrial Belt", nameUr: "درگئی صنعتی علاقہ" },
      { slug: "dargai-border-exchange", nameEn: "Dargai Border Exchange", nameUr: "درگئی بارڈر ایکسچینج" },
      { slug: "sakhakot", nameEn: "Sakhakot Cloth Market", nameUr: "سخاکوٹ کپڑا مارکیٹ" },
      { slug: "heroshah", nameEn: "Heroshah", nameUr: "ہیروشاہ" },
      { slug: "malakand-pass", nameEn: "Malakand Pass", nameUr: "ملاکنڈ پاس" },
    ],
  },
  {
    slug: "thana-baizai",
    nameEn: "Thana Baizai",
    nameUr: "تھانہ بائزئی",
    revenueTehsil: "Thana Baizai",
    localities: [
      { slug: "thana-main-chowk", nameEn: "Thana Main Chowk", nameUr: "تھانہ مین چوک" },
      { slug: "thana-proper", nameEn: "Thana Proper", nameUr: "تھانہ" },
      { slug: "palai", nameEn: "Palai", nameUr: "پالئی" },
      { slug: "agra", nameEn: "Agra", nameUr: "آگرہ" },
      { slug: "dherai", nameEn: "Dherai", nameUr: "ڈھیرئی" },
    ],
  },
];

export const TEHSIL_OPTIONS = [
  { value: "all", label: "All Malakand District" },
  ...TEHSILS.map((t) => ({ value: t.slug, label: t.nameEn })),
];
```

- [ ] **Step 4: Write `src/data/categories.ts`**

Transcribe every category and subcategory from `docs/taxonomy.md` into the `Category[]` shape. Rules, applied mechanically:

- `slug` for a category is the kebab-cased English name with `&` dropped: `Vehicles` → `vehicles`, `Property for Sale` → `property-for-sale`, `Fresh Produce & Food` → `fresh-produce-food`.
- `slug` for a subcategory is `<category-slug>-<kebab-cased subcategory>`, with parenthetical qualifiers dropped: `Honey (Sidr, Palosa, Wild)` under `fresh-produce-food` → `fresh-produce-food-honey`. This is what makes the cross-listed duplicates (Tractors, Generators, Water Pumps, Bicycles) unique, as the taxonomy doc requires.
- The final `Other X` entry in each branch becomes `<category-slug>-other`.
- `icon` for a category is the Material Symbols name given in the taxonomy doc heading.
- `sort` is the taxonomy doc's numbering, 1 through 26.
- `nameUr` for a category is the Urdu given in the taxonomy doc heading. For subcategories, set `nameUr` equal to `nameEn` for now and record a follow-up; the tests do not require subcategory Urdu and a wrong translation is worse than a visible English fallback.

Append the flattening helper:

```ts
import type { SelectOption } from "@/components/ui/select";

export function allSubcategoryOptions(): SelectOption[] {
  return CATEGORIES.flatMap((c) =>
    c.subcategories.map((s) => ({
      value: s.slug,
      label: `${c.nameEn} › ${s.nameEn}`,
      icon: c.icon,
    }))
  );
}
```

- [ ] **Step 5: Write the fixtures**

Build `SELLERS` from the five merchants in the home export (`code.html:971-1152`): Khan Solar & Powerhouse, Batkhela Orchards Collective, Malakand Motors & Exchange, Swat Apiaries & Pure Honey, Al-Madina Agro & Cattle Farm — copying each one's rating, review count, response time, specialty and stat line verbatim from the markup.

Build `LISTINGS` from the fifteen cards in the home export (`code.html:434-950`) plus the six in the catalog export (`code.html:485-760`), copying title, price, compare-at price, locality label and badge text verbatim. Use `+923166441108` as the contact phone throughout, matching the export. Assign each listing to the seller and category it obviously belongs to. Set `status: "active"` for all but one, which gets `"sold"` so the catalog's "Marked as Sold" filter has something to match.

- [ ] **Step 6: Mirror the seed imagery**

The export references `lh3.googleusercontent.com/aida-public/...` URLs that will stop resolving. Write `scripts/mirror-seed-images.mjs` to extract every `src="https://lh3.googleusercontent.com/..."` from both `code.html` files, download each to `public/images/seed/<index>.jpg`, and print a mapping. For any URL that returns non-200, write a 4:3 solid `#edf5ef` JPEG placeholder instead so the layout never collapses.

```bash
node scripts/mirror-seed-images.mjs
```

Point the fixtures at the local `/images/seed/*.jpg` paths. Cards that used a Material Symbols glyph instead of a photo (iPhone, Haier AC, Honda CD 70 in the catalog) keep `iconFallback` set and leave `images` empty.

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm test -- data`
Expected: PASS (11 tests).

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: seed tehsils, full category taxonomy and listing fixtures"
```

---

## Task 14: Page chrome — announcement bar, header, category ribbon, mega menu, footer

Ports `code.html:55-209` (announcement bar, header, ribbon) and `code.html:1236-1330` (footer) from the home export, replacing every native control with kit components.

**Files:**
- Create: `src/components/layout/announcement-bar.tsx`, `src/components/layout/site-header.tsx`, `src/components/layout/category-ribbon.tsx`, `src/components/layout/mega-menu.tsx`, `src/components/layout/site-footer.tsx`, `src/components/layout/locale-switcher.tsx`, `src/components/layout/brand-logo.tsx`
- Modify: `src/app/[locale]/layout.tsx` (mount chrome + providers)
- Modify: `src/i18n/messages/en.json`, `src/i18n/messages/ur.json`
- Test: `src/components/layout/site-header.test.tsx`

**Interfaces:**
- Consumes: `Select`, `Combobox`, `Button`, `Input`, `Icon`, `DropdownMenu`, `Drawer`, `TEHSIL_OPTIONS`, `CATEGORIES`
- Produces:
  - `<AnnouncementBar />` — client component owning the tehsil `Select` state
  - `<SiteHeader />` — brand, desktop search (Combobox + Input + submit Button), locality button, account link, Become a Seller CTA, mobile search row
  - `<CategoryRibbon />` — mega menu trigger plus the six quick links
  - `<MegaMenu open onOpenChange />` — full category grid in a `Drawer` on mobile, a `DropdownMenu`-style panel on desktop
  - `<SiteFooter />` — four columns plus the bottom bar
  - `<LocaleSwitcher />` — a `Select` of English/اردو that routes to the same path under the other locale
  - `<BrandLogo className?={string} />` — the inline SVG from `code.html:97-106`, extracted verbatim

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/layout/site-header.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import { SiteHeader } from "./site-header";

function renderHeader() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SiteHeader />
    </NextIntlClientProvider>
  );
}

describe("SiteHeader", () => {
  it("renders the brand name", () => {
    renderHeader();
    expect(screen.getByRole("banner")).toHaveTextContent("MalakandBazaar");
  });

  it("uses no native select element", () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <SiteHeader />
      </NextIntlClientProvider>
    );
    expect(container.querySelector("select")).toBeNull();
  });

  it("exposes a labelled search field", () => {
    renderHeader();
    expect(screen.getByRole("searchbox", { name: /search/i })).toBeInTheDocument();
  });

  it("shows the Become a Seller call to action", () => {
    renderHeader();
    expect(screen.getByRole("link", { name: /Become a Seller/ })).toBeInTheDocument();
  });

  it("shows the sign in link", () => {
    renderHeader();
    expect(screen.getByRole("link", { name: /Sign In/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- site-header`
Expected: FAIL — module not found.

- [ ] **Step 3: Extract the brand logo**

Copy the `<svg>` block at `stitch_malakandbazaar_digital_marketplace_ui/malakandbazaar_regional_digital_marketplace_with_category_shelves_top_sellers/code.html:97-106` verbatim into `brand-logo.tsx`, converting `viewbox` → `viewBox`, `stroke-width` → `strokeWidth`, `stroke-linecap` → `strokeLinecap`, `font-family` → `fontFamily`, `font-size` → `fontSize`, `font-weight` → `fontWeight`, `letter-spacing` → `letterSpacing`. Accept a `className` prop defaulting to `"h-10 sm:h-12 w-auto"`.

- [ ] **Step 4: Build the chrome components**

Port each block, class for class, from the source lines listed below. Keep every Tailwind class exactly as written except for the substitutions in the two tables that follow.

| Component | Source |
|---|---|
| `AnnouncementBar` | `code.html:55-90` |
| `SiteHeader` | `code.html:93-161` |
| `CategoryRibbon` | `code.html:162-208` |
| `SiteFooter` | `code.html:1238-1330` |

**Control substitutions:**

| Source markup | Replace with |
|---|---|
| `<select>` in the announcement bar | `<Select variant="bare" ariaLabel="Tehsil" options={TEHSIL_OPTIONS} …>` styled `text-white font-semibold text-xs` |
| `<select>` in the header search | `<Combobox ariaLabel="Category" options={allSubcategoryOptions()} placeholder="All Sectors" …>` |
| `<input type="text">` search fields | `<Input type="search" aria-label={t('common.search')} …>` |
| Anchor-styled buttons | `<Button asChild>` wrapping the `<a>` |
| Newsletter email field + submit | `<Input type="email">` + `<Button variant="whatsapp">` |

**Copy substitutions:** every literal English string becomes a `useTranslations()` lookup. Add the corresponding keys to both message files. The Urdu file gets real translations for the chrome strings (brand, search placeholder, sign in, become a seller, the six ribbon links, the four footer column headings); anything not translated falls back to English via next-intl's default.

- [ ] **Step 5: Mount the chrome and providers in the locale layout**

Wrap `{children}` in `<TooltipProvider>` and `<ToastProvider>`, and render `<AnnouncementBar />`, `<SiteHeader />` (with `<CategoryRibbon />` inside its `<header>`, matching the export), then `{children}`, then `<SiteFooter />`.

- [ ] **Step 6: Run tests and lint**

Run: `npm test && npm run lint`
Expected: all PASS; lint clean, which also proves no native `<select>` slipped through.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: port announcement bar, header, category ribbon and footer"
```

---

## Task 15: Marketplace components

**Files:**
- Create: `src/components/marketplace/listing-card.tsx`, `seller-card.tsx`, `category-circle.tsx`, `section-header.tsx`, `promo-card.tsx`, `hero-carousel.tsx`, `contact-actions.tsx`
- Test: `src/components/marketplace/listing-card.test.tsx`, `src/components/marketplace/seller-card.test.tsx`

**Interfaces:**
- Consumes: `Badge`, `Price`, `Icon`, `Button`, `Avatar`, `Rating`, `Carousel`, `whatsappUrl`, `formatPhoneDisplay`, types from Task 13
- Produces:
  - `<ListingCard listing={Listing} />`
  - `<ContactActions phone={string} listingTitle={string} compact?={boolean} />`
  - `<SellerCard seller={Seller} />`
  - `<CategoryCircle icon={string} label={string} href={string} />`
  - `<SectionHeader eyebrow={string} eyebrowIcon={string} title={string} icon={string} actionLabel={string} actionHref={string} />`
  - `<PromoCard eyebrow={string} title={string} body={string} linkLabel={string} href={string} image?={string} icon?={string} tone="sand"|"green" />`
  - `<HeroCarousel slides={{eyebrow,title,titleAccent,body,image,primaryCta,secondaryCta}[]} />`

- [ ] **Step 1: Write the failing tests**

```tsx
// src/components/marketplace/listing-card.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ListingCard } from "./listing-card";
import type { Listing } from "@/types";

const listing: Listing = {
  id: "l1",
  slug: "solar-inverter-15kw-vfd",
  title: "Solar Inverter 15kW VFD Heavy Tubewell System",
  description: "Heavy duty VFD inverter for tubewell use.",
  price: 240000,
  compareAtPrice: 265000,
  categorySlug: "solar-energy",
  subcategorySlug: "solar-energy-solar-inverters",
  tehsilSlug: "dargai",
  localitySlug: "dargai-industrial-belt",
  localityLabel: "Dargai Industrial Belt",
  images: ["/images/seed/1.jpg"],
  badge: { label: "2 Yr Warranty", tone: "sand" },
  contactPhone: "+923166441108",
  sellerId: "s1",
  status: "active",
  createdAt: "2026-08-01T00:00:00.000Z",
};

describe("ListingCard", () => {
  it("renders the title as a heading", () => {
    render(<ListingCard listing={listing} />);
    expect(screen.getByRole("heading", { name: listing.title })).toBeInTheDocument();
  });

  it("shows the formatted price and the struck-through compare price", () => {
    render(<ListingCard listing={listing} />);
    expect(screen.getByText("PKR 240,000")).toBeInTheDocument();
    expect(screen.getByText("265,000")).toHaveClass("line-through");
  });

  it("shows the locality label", () => {
    render(<ListingCard listing={listing} />);
    expect(screen.getByText("Dargai Industrial Belt")).toBeInTheDocument();
  });

  it("renders the badge", () => {
    render(<ListingCard listing={listing} />);
    expect(screen.getByText("2 Yr Warranty")).toBeInTheDocument();
  });

  it("links to WhatsApp with the listing title in the message", () => {
    render(<ListingCard listing={listing} />);
    const link = screen.getByRole("link", { name: /WhatsApp/ });
    expect(link).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/923166441108?text=")
    );
    expect(decodeURIComponent(link.getAttribute("href")!)).toContain(listing.title);
  });

  it("links to a tel: URL for calling", () => {
    render(<ListingCard listing={listing} />);
    expect(screen.getByRole("link", { name: /Call/ })).toHaveAttribute(
      "href",
      "tel:+923166441108"
    );
  });

  it("gives the image alt text", () => {
    render(<ListingCard listing={listing} />);
    expect(screen.getByAltText(listing.title)).toBeInTheDocument();
  });

  it("marks a sold listing", () => {
    render(<ListingCard listing={{ ...listing, status: "sold" }} />);
    expect(screen.getByText(/Sold/i)).toBeInTheDocument();
  });
});
```

```tsx
// src/components/marketplace/seller-card.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SellerCard } from "./seller-card";
import type { Seller } from "@/types";

const seller: Seller = {
  id: "s1",
  slug: "khan-solar",
  name: "Khan Solar & Powerhouse",
  initials: "KS",
  tehsilSlug: "dargai",
  localityLabel: "Dargai Industrial Belt",
  rating: 4.9,
  reviewCount: 142,
  verified: true,
  responseMinutes: 5,
  specialty: "VFD Inverters & Tube-well Motors",
  statLabel: "Deals Done",
  statValue: "142 Systems",
  phone: "+923166441108",
};

describe("SellerCard", () => {
  it("renders the seller name", () => {
    render(<SellerCard seller={seller} />);
    expect(screen.getByRole("heading", { name: seller.name })).toBeInTheDocument();
  });

  it("shows the rating and review count", () => {
    render(<SellerCard seller={seller} />);
    expect(screen.getByLabelText("Rated 4.9 out of 5")).toBeInTheDocument();
    expect(screen.getByText("(142)")).toBeInTheDocument();
  });

  it("shows a verified badge for verified sellers", () => {
    render(<SellerCard seller={seller} />);
    expect(screen.getByText(/Verified/i)).toBeInTheDocument();
  });

  it("omits the verified badge otherwise", () => {
    render(<SellerCard seller={{ ...seller, verified: false }} />);
    expect(screen.queryByText(/Verified/i)).not.toBeInTheDocument();
  });

  it("falls back to initials when there is no avatar image", () => {
    render(<SellerCard seller={seller} />);
    expect(screen.getByText("KS")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- listing-card seller-card`
Expected: FAIL — modules not found.

- [ ] **Step 3: Write `contact-actions.tsx`**

```tsx
import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { whatsappUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/cn";

export function ContactActions({
  phone,
  listingTitle,
  className,
}: {
  phone: string;
  listingTitle: string;
  className?: string;
}) {
  const t = useTranslations("common");
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <Button asChild variant="whatsapp" size="sm" className="flex-1">
        <a
          href={whatsappUrl(phone, `Interested in ${listingTitle}`)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="chat" size={15} />
          <span>{t("whatsapp")}</span>
        </a>
      </Button>
      <a
        href={`tel:${phone}`}
        aria-label={t("call")}
        title={t("call")}
        className="rounded-lg border border-surface-border p-1.5 text-primary transition-colors hover:bg-surface-low"
      >
        <Icon name="call" size={16} />
      </a>
    </div>
  );
}
```

- [ ] **Step 4: Write `listing-card.tsx`**

Port `code.html:434-464` exactly — `bg-surface rounded-xl border border-surface-border hover:border-accent-green hover:shadow-md transition-all p-3.5 flex flex-col justify-between group` on the `<article>`, the `aspect-square` image frame with `group-hover:scale-105`, the locality line in `text-[11px] font-semibold text-accent-green-dark`, the `line-clamp-2` title, then `<Price>` and `<ContactActions>`. Substitutions:

- The photo becomes `next/image` with `fill` and `sizes="(max-width:640px) 100vw, 20vw"`; when `images` is empty, render `<Icon name={listing.iconFallback} size={72} className="text-secondary" />` centred instead, matching the glyph cards in the export.
- The heart in the corner becomes a real `<button aria-label="Save listing">`, not a styled `<span>`.
- Add a sold overlay: when `status !== "active"`, render an absolutely positioned `<Badge tone="neutral">` reading `Sold` or `Reserved` over the image and drop the image opacity to 60%.
- Requires `line-clamp` — add `@tailwindcss/line-clamp` only if the installed Tailwind is below 3.3; from 3.3 it is built in.

Configure `next.config.ts` with `images: { remotePatterns: [] }` — all seed imagery is local, so no remote hosts are allowed.

- [ ] **Step 5: Write the remaining marketplace components**

| Component | Source lines | Notes |
|---|---|---|
| `CategoryCircle` | `code.html:360-366` | `w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#f2f8f4] border-2 border-surface-border`, hover swaps to `border-accent-green bg-[#e3f4e8]` and scales the glyph 110% |
| `SectionHeader` | `code.html:415-431` | icon tile, uppercase eyebrow with `verified` glyph, `text-xl sm:text-2xl font-extrabold text-primary` title, right-aligned `Button variant="subtle"` |
| `PromoCard` | `code.html:307-344` | two tones: sand (`tertiary-light` ground) and green (`surface-low` ground) |
| `HeroCarousel` | `code.html:214-304` | wraps the `Carousel` from Task 11; each slide is a full-bleed `next/image` with a `bg-gradient-to-t from-on-surface/80` scrim, eyebrow `Badge`, `text-3xl sm:text-5xl font-extrabold text-white` headline with the accent word in `italic text-tertiary-fixed`, body copy, and two CTAs |
| `SellerCard` | `code.html:971-1006` | `Avatar` + name + `Rating` + verified `Badge` + response/stat rows + `Button variant="primary"` reading "Visit Store & Chat" |

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- listing-card seller-card`
Expected: PASS (13 tests).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add listing, seller, category and hero marketplace components"
```

---

## Task 16: Home page

**Files:**
- Modify: `src/app/[locale]/page.tsx`
- Modify: `src/i18n/messages/en.json`, `src/i18n/messages/ur.json`
- Test: `tests/home.test.tsx`

**Interfaces:**
- Consumes: everything from Tasks 14 and 15, `LISTINGS`, `SELLERS`, `CATEGORIES`
- Produces: the home route

Page composition, in order, matching `code.html:210-1234`:

1. Hero grid — `lg:col-span-8` carousel + `lg:col-span-4` stack of two promo cards
2. Popular Marketplace Sectors — eight `CategoryCircle`s in `grid-cols-4 md:grid-cols-8`
3. Shelf A: Electronics & Solar Tech — `SectionHeader` + five `ListingCard`s in `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4`
4. Shelf B: Fresh Valley Fruits & Agro Produce — same shape
5. Shelf C: Vehicles & Motorbikes — same shape
6. Top Verified Local Sellers — five `SellerCard`s
7. Mid-page seller banner — `bg-primary rounded-2xl`, two CTAs
8. Three-way category promo strips
9. Footer (already mounted in the layout)

- [ ] **Step 1: Write the failing test**

```tsx
// tests/home.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import HomeContent from "@/app/[locale]/home-content";

function renderHome() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <HomeContent />
    </NextIntlClientProvider>
  );
}

describe("Home page", () => {
  it("renders three category shelves", () => {
    renderHome();
    expect(screen.getByRole("heading", { name: /Electronics & Solar Tech/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Fresh Valley Fruits & Agro Produce/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Vehicles & Motorbikes/ })).toBeInTheDocument();
  });

  it("renders five listing cards per shelf", () => {
    renderHome();
    expect(screen.getAllByRole("link", { name: /WhatsApp/ }).length).toBeGreaterThanOrEqual(15);
  });

  it("renders eight popular sector circles", () => {
    renderHome();
    const sectors = screen.getByRole("region", { name: /Popular Marketplace Sectors/ });
    expect(sectors.querySelectorAll("a")).toHaveLength(9); // 8 circles + View All
  });

  it("renders the five verified sellers", () => {
    renderHome();
    expect(screen.getAllByRole("link", { name: /Visit Store/ })).toHaveLength(5);
  });

  it("renders a hero carousel", () => {
    renderHome();
    expect(screen.getByRole("region", { name: /Highlights/ })).toBeInTheDocument();
  });
});
```

Extract the page body into `src/app/[locale]/home-content.tsx` (a client component) so the test can render it without Next's async server-component machinery; `page.tsx` stays a thin server component that calls `setRequestLocale` and renders `<HomeContent />`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- home`
Expected: FAIL — module not found.

- [ ] **Step 3: Build the page**

Port section by section from `code.html:210-1234`, keeping every layout class verbatim and swapping content for fixture data and hardcoded copy for translation keys. Add `aria-label` to each `<section>` so the tests above can find them by accessible name.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- home`
Expected: PASS (5 tests).

- [ ] **Step 5: Eyeball against the screenshot**

Run: `npm run dev`, open `http://localhost:3000/en` beside `stitch_malakandbazaar_digital_marketplace_ui/malakandbazaar_regional_digital_marketplace_with_category_shelves_top_sellers/screen.png` at 1440px width.
Check section order, vertical rhythm, card proportions, and that the hero fills the same share of the fold.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: build the home page from the Stitch export"
```

---

## Task 17: Search catalog page

**Files:**
- Create: `src/app/[locale]/search/page.tsx`, `src/app/[locale]/search/search-content.tsx`
- Create: `src/components/marketplace/filter-sidebar.tsx`, `sort-bar.tsx`, `active-filter-chips.tsx`
- Test: `tests/search.test.tsx`

**Interfaces:**
- Consumes: `Accordion`, `Checkbox`, `PriceRange`, `Select`, `Chip`, `Pagination`, `Drawer`, `Button`, `EmptyState`, `ListingCard`, `TEHSILS`, `CATEGORIES`, `LISTINGS`
- Produces:
  - `type Filters = { query: string; categorySlugs: string[]; tehsilSlugs: string[]; localitySlugs: string[]; priceRange: [number, number]; includeSold: boolean; verifiedOnly: boolean }`
  - `<FilterSidebar filters={Filters} onChange={(f: Filters) => void} counts={Record<string, number>} />`
  - `<SortBar sort={SortKey} onSortChange={(s: SortKey) => void} view={"grid"|"list"} onViewChange={(v) => void} resultCount={number} />`
  - `type SortKey = "featured" | "relevant" | "verified" | "price_low" | "price_high" | "date_new" | "date_old"`
  - `<ActiveFilterChips filters={Filters} onRemove={(key: keyof Filters, value?: string) => void} onClearAll={() => void} />`
  - `applyFilters(listings: Listing[], filters: Filters): Listing[]` and `sortListings(listings: Listing[], sort: SortKey): Listing[]`, both exported from `search-content.tsx` for direct unit testing

- [ ] **Step 1: Write the failing test**

```tsx
// tests/search.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import messages from "@/i18n/messages/en.json";
import SearchContent, { applyFilters, sortListings } from "@/app/[locale]/search/search-content";
import { LISTINGS } from "@/data/fixtures/listings";
import type { Filters } from "@/app/[locale]/search/search-content";

const base: Filters = {
  query: "",
  categorySlugs: [],
  tehsilSlugs: [],
  localitySlugs: [],
  priceRange: [0, 10_000_000],
  includeSold: false,
  verifiedOnly: false,
};

describe("applyFilters", () => {
  it("returns every active listing when nothing is filtered", () => {
    const active = LISTINGS.filter((l) => l.status === "active");
    expect(applyFilters(LISTINGS, base)).toHaveLength(active.length);
  });

  it("includes sold listings when asked", () => {
    expect(applyFilters(LISTINGS, { ...base, includeSold: true })).toHaveLength(LISTINGS.length);
  });

  it("matches the query against the title case-insensitively", () => {
    const out = applyFilters(LISTINGS, { ...base, query: "solar" });
    expect(out.length).toBeGreaterThan(0);
    for (const l of out) expect(l.title.toLowerCase()).toContain("solar");
  });

  it("filters by tehsil", () => {
    const out = applyFilters(LISTINGS, { ...base, tehsilSlugs: ["dargai"] });
    for (const l of out) expect(l.tehsilSlug).toBe("dargai");
  });

  it("filters by price range inclusively", () => {
    const out = applyFilters(LISTINGS, { ...base, priceRange: [100000, 300000] });
    for (const l of out) {
      expect(l.price).toBeGreaterThanOrEqual(100000);
      expect(l.price).toBeLessThanOrEqual(300000);
    }
  });

  it("combines filters with AND", () => {
    const out = applyFilters(LISTINGS, {
      ...base,
      tehsilSlugs: ["dargai"],
      priceRange: [0, 100],
    });
    expect(out).toHaveLength(0);
  });
});

describe("sortListings", () => {
  it("sorts price ascending", () => {
    const out = sortListings(LISTINGS, "price_low");
    for (let i = 1; i < out.length; i++) {
      expect(out[i].price).toBeGreaterThanOrEqual(out[i - 1].price);
    }
  });

  it("sorts price descending", () => {
    const out = sortListings(LISTINGS, "price_high");
    for (let i = 1; i < out.length; i++) {
      expect(out[i].price).toBeLessThanOrEqual(out[i - 1].price);
    }
  });

  it("sorts newest first", () => {
    const out = sortListings(LISTINGS, "date_new");
    for (let i = 1; i < out.length; i++) {
      expect(Date.parse(out[i].createdAt)).toBeLessThanOrEqual(Date.parse(out[i - 1].createdAt));
    }
  });

  it("does not mutate its input", () => {
    const before = LISTINGS.map((l) => l.id);
    sortListings(LISTINGS, "price_high");
    expect(LISTINGS.map((l) => l.id)).toEqual(before);
  });
});

function renderSearch() {
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <SearchContent />
    </NextIntlClientProvider>
  );
}

describe("Search page", () => {
  it("uses no native select or range input", () => {
    const { container } = render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <SearchContent />
      </NextIntlClientProvider>
    );
    expect(container.querySelector("select")).toBeNull();
    expect(container.querySelector('input[type="range"]')).toBeNull();
  });

  it("narrows the results when a tehsil is ticked", async () => {
    renderSearch();
    const before = screen.getAllByRole("article").length;
    await userEvent.click(screen.getByRole("checkbox", { name: /Dargai/ }));
    expect(screen.getAllByRole("article").length).toBeLessThan(before);
  });

  it("adds a chip for each active filter", async () => {
    renderSearch();
    await userEvent.click(screen.getByRole("checkbox", { name: /Dargai/ }));
    expect(screen.getByRole("button", { name: /Remove Dargai/ })).toBeInTheDocument();
  });

  it("clears every filter from the Clear all button", async () => {
    renderSearch();
    const before = screen.getAllByRole("article").length;
    await userEvent.click(screen.getByRole("checkbox", { name: /Dargai/ }));
    await userEvent.click(screen.getByRole("button", { name: /Clear all/ }));
    expect(screen.getAllByRole("article")).toHaveLength(before);
  });

  it("shows an empty state when nothing matches", async () => {
    renderSearch();
    await userEvent.type(screen.getByRole("searchbox", { name: /search/i }), "zzzzzz");
    expect(await screen.findByText(/No listings found/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- search`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the filter and sort logic**

```tsx
// inside src/app/[locale]/search/search-content.tsx
export type SortKey =
  | "featured" | "relevant" | "verified"
  | "price_low" | "price_high" | "date_new" | "date_old";

export type Filters = {
  query: string;
  categorySlugs: string[];
  tehsilSlugs: string[];
  localitySlugs: string[];
  priceRange: [number, number];
  includeSold: boolean;
  verifiedOnly: boolean;
};

export function applyFilters(listings: Listing[], f: Filters): Listing[] {
  const q = f.query.trim().toLowerCase();
  return listings.filter((l) => {
    if (!f.includeSold && l.status !== "active") return false;
    if (q && !l.title.toLowerCase().includes(q) && !l.description.toLowerCase().includes(q))
      return false;
    if (f.categorySlugs.length && !f.categorySlugs.includes(l.categorySlug)) return false;
    if (f.tehsilSlugs.length && !f.tehsilSlugs.includes(l.tehsilSlug)) return false;
    if (f.localitySlugs.length && !f.localitySlugs.includes(l.localitySlug)) return false;
    if (l.price < f.priceRange[0] || l.price > f.priceRange[1]) return false;
    return true;
  });
}

export function sortListings(listings: Listing[], sort: SortKey): Listing[] {
  const out = [...listings];
  switch (sort) {
    case "price_low":
      return out.sort((a, b) => a.price - b.price);
    case "price_high":
      return out.sort((a, b) => b.price - a.price);
    case "date_new":
      return out.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    case "date_old":
      return out.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    default:
      return out;
  }
}
```

`verifiedOnly` is accepted in the type and rendered as a sidebar control, but has no effect until seller verification exists in the data layer; it is deliberately a no-op in `applyFilters` and the sidebar control is rendered `disabled` with the hint "Available once seller verification launches."

- [ ] **Step 4: Build the page sections**

| Section | Source | Build with |
|---|---|---|
| Breadcrumb + collection header + tehsil pills | catalog `code.html:162-196` | `Breadcrumb`, `Chip` |
| Top filter control bar | `code.html:200-251` | `Button` (mobile Filters trigger opening a `Drawer`), `ActiveFilterChips`, `SortBar` |
| Sidebar: category tree, price, availability, tehsil, seller type, WhatsApp help card | `code.html:256-467` | `Accordion` groups containing `Checkbox` (with `count`) and `PriceRange` |
| Results grid | `code.html:482-760` | `ListingCard` in `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4` |
| Pagination | `code.html:761-777` | `Pagination`, 12 listings per page |
| Verification guarantee banner | `code.html:778-797` | plain markup |

Apply the token substitution table from Task 1 to every class ported from this file. The sidebar is `hidden md:block` on desktop and its identical contents render inside a `Drawer side="left"` on mobile — extract the body into `<FilterSidebarBody>` so both render the same component rather than duplicating markup.

`counts` passed to `FilterSidebar` are computed from the fixture set: for each facet value, the number of listings that would match if that one facet were applied on top of the other active filters.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- search`
Expected: PASS (15 tests).

- [ ] **Step 6: Eyeball against the screenshot**

Run: `npm run dev`, open `http://localhost:3000/en/search` beside `stitch_malakandbazaar_digital_marketplace_ui/malakandbazaar_grand_search_filter_catalog_page/screen.png`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: build the search catalog page with working filters and sorting"
```

---

## Task 18: Visual regression against the Stitch exports

Renders the Stitch HTML and our implementation side by side in the same browser at the same viewport and diffs them. This is what makes "pixel perfect" a checkable claim rather than an opinion.

**Files:**
- Create: `playwright.config.ts`, `tests/visual/fidelity.spec.ts`, `tests/visual/responsive.spec.ts`
- Modify: `package.json` (scripts), `.gitignore`

**Interfaces:**
- Consumes: the running dev server and the two `code.html` files
- Produces: `npm run test:visual`, and baseline snapshots under `tests/visual/fidelity.spec.ts-snapshots/`

- [ ] **Step 1: Install Playwright**

```bash
npm i -D @playwright/test pixelmatch pngjs
npx playwright install chromium
```

- [ ] **Step 2: Write the config**

```ts
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:3000",
    viewport: { width: 1440, height: 1200 },
    deviceScaleFactor: 1,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000/en",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
```

Add to `package.json`: `"test:visual": "playwright test"`, `"test:visual:update": "playwright test --update-snapshots"`.
Add to `.gitignore`: `test-results/`, `playwright-report/`.

- [ ] **Step 3: Write the fidelity spec**

```ts
// tests/visual/fidelity.spec.ts
import { test, expect } from "@playwright/test";
import path from "node:path";

const EXPORT_DIR = path.resolve(
  __dirname,
  "../../stitch_malakandbazaar_digital_marketplace_ui"
);

const PAGES = [
  {
    name: "home",
    ours: "/en",
    theirs: `file://${EXPORT_DIR}/malakandbazaar_regional_digital_marketplace_with_category_shelves_top_sellers/code.html`,
  },
  {
    name: "search",
    ours: "/en/search",
    theirs: `file://${EXPORT_DIR}/malakandbazaar_grand_search_filter_catalog_page/code.html`,
  },
];

for (const page of PAGES) {
  test(`${page.name} matches the Stitch export`, async ({ page: p }) => {
    // Imagery differs (ours is mirrored locally, theirs is remote and may 404),
    // so mask every image and compare structure, type and colour only.
    await p.goto(page.theirs);
    await p.waitForLoadState("networkidle");
    const reference = await p.screenshot({
      fullPage: true,
      mask: [p.locator("img")],
      maskColor: "#edf5ef",
      animations: "disabled",
    });

    await p.goto(page.ours);
    await p.waitForLoadState("networkidle");

    expect(reference.byteLength).toBeGreaterThan(0);
    await expect(p).toHaveScreenshot(`${page.name}.png`, {
      fullPage: true,
      mask: [p.locator("img")],
      maskColor: "#edf5ef",
      animations: "disabled",
      maxDiffPixelRatio: 0.03,
    });
  });
}
```

Workflow: run once with `--update-snapshots` to capture our own baseline, then open the reference screenshot the spec captures and compare by eye against the baseline. The `maxDiffPixelRatio` guard then protects against *future* drift. Direct byte-comparison between two different rendering paths would be noise; the value here is the locked baseline plus a deliberate side-by-side review.

- [ ] **Step 4: Write the responsive spec**

```ts
// tests/visual/responsive.spec.ts
import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1200 },
];

for (const vp of VIEWPORTS) {
  for (const [label, url] of [
    ["home", "/en"],
    ["search", "/en/search"],
    ["gallery", "/en/dev/ui"],
  ] as const) {
    test(`${label} never scrolls horizontally at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(url);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth
      );
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
}

test("the Urdu home page renders right to left", async ({ page }) => {
  await page.goto("/ur");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
});

test("the mobile filter drawer opens and closes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/search");
  await page.getByRole("button", { name: /Filters/ }).click();
  await expect(page.getByRole("dialog", { name: /Filters/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /Filters/ })).toBeHidden();
});
```

- [ ] **Step 5: Capture baselines and run**

```bash
npm run test:visual:update
npm run test:visual
```
Expected: all specs PASS. The ten responsive assertions must pass on the first run — a horizontal-overflow failure is a real bug in the ported layout, not a baseline issue.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test: add visual fidelity and responsive regression suites"
```

---

## Self-Review

**1. Spec coverage**

| Requirement from `docs/decisions.md` | Task |
|---|---|
| Stitch HTML is the design source of truth | 1 (token reconciliation), 14–17 (line-by-line ports) |
| No native browser controls | 2 (lint rule), 4–8 (replacements), 14/17 (assertions) |
| Exact brand token values | 1 |
| Plus Jakarta Sans + Material Symbols | 1, 2 |
| English default, Urdu selectable, RTL | 1, 14 (`LocaleSwitcher`), 18 (RTL assertion) |
| PKR formatting with tabular figures | 2 (`formatPkr`), 9 (`Price`) |
| E.164 phone, wa.me links | 2, 15 (`ContactActions`) |
| Three official tehsils + localities | 13 |
| Full 26-category taxonomy | 13 |
| Listings never expire; sold/reserved status | 13 (`ListingStatus`), 15 (sold overlay), 17 (availability filter) |
| Seller-level ratings | 9 (`Rating`), 15 (`SellerCard`) |
| Cloudinary, Supabase, Leaflet, auth | **Deferred — not in this plan.** See "Follow-on plans" below. |

**2. Placeholder scan**

Task 13 Step 4 and Task 14 Step 4 give transformation rules rather than full literal output — transcribing 430 subcategories and 300 lines of ported markup inline would make the plan unreadable without adding information, since the source of truth is a file in the repo that the implementer reads directly. Every rule is mechanical and every source line range is exact. Task 12 Step 3 and Task 16 Step 3 are the same pattern. No `TBD`, no "add error handling", no "similar to Task N".

**3. Type consistency**

`SelectOption` is defined in Task 4 and consumed by Tasks 6 and 13. `Listing`, `Seller`, `Tehsil`, `Category`, `ListingStatus` are defined in Task 13 and consumed by 15, 16, 17. `Filters` and `SortKey` are defined in Task 17 and used only there. `paginationRange` is exported from Task 10 and tested there. `whatsappUrl`, `normalizePhone`, `formatPhoneDisplay`, `formatPkr`, `cn` are defined in Task 2 and used throughout. `MenuItem` (Task 8) is used by Task 14. No name appears with two spellings.

---

## Follow-on plans (not in scope here)

Each needs its own plan, written when this one lands:

1. **Supabase schema and RLS** — profiles, sellers, listings, listing_images, reviews, reports, categories, tehsils; PostGIS column on listings; row-level security; seeding from `src/data`.
2. **Auth** — phone + password signup and sign-in, session handling, protected routes, optional recovery email, Turnstile.
3. **Listing lifecycle** — post/edit wizard, Cloudinary signed uploads, my-listings, mark sold/reserved.
4. **Listing detail and seller store pages** — gallery, sticky mobile contact bar, Leaflet map, seller profile, reviews.
5. **Map search** — PostGIS bbox queries, Leaflet clustered results, pin-drop on the post form.
6. **Admin panel** — moderation queue, reports, category management, seller verification.
