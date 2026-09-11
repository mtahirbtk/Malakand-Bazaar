# Malakand Bazaar — Project Rules

## Autonomy

- Act autonomously on routine work: reading files, running builds/tests/lints,
  searching code, git status/diff/log, installing declared deps — do these
  without stopping to ask.
- Don't re-ask for something already decided earlier in this project's
  history (this file, prior commits, prior conversation).
- Still confirm before: force-push, `git reset --hard`, deleting files/branches,
  publishing/deploying, rotating or exposing secrets, or anything else hard to
  reverse or outward-facing. These aren't friction — they're the cases where a
  wrong guess costs real damage.

Note: full "skip every permission prompt, always" is a Claude Code app-level
setting (`bypassPermissions` mode / `--dangerously-skip-permissions`), not
something a project file can grant. This file sets working conventions, not
security policy — see the session for why.

## Conventions

**Stack:** Next.js 15 (App Router, TS) · Tailwind 3.4 · Radix UI primitives ·
next-intl (en default, ur RTL) · Vitest + Testing Library · Playwright.

**Commands:** `npm run dev` (pinned to port 3200 — 3000 is taken by another
project) · `npm test` · `npm run lint` · `npm run build`.

**Never run `npm run build` while `npm run dev` is running.** Both write
`.next/`, and the running server ends up serving a manifest pointing at files
the other process replaced. The symptom is a page that loads as unstyled HTML
with 400s on the CSS. Recovery:

```bash
lsof -ti :3200 | xargs kill -9
rm -rf .next
npm run dev
```

Note that `pkill -f "next dev"` does NOT match the server — Next renames the
process to `next-server`. Kill by port.

**Colour:** never pick a green by eye. `docs/palette.md` assigns every tone a
role, and `/dev/ui` renders the live palette with contrast ratios. The dark
forest green `brand-800` is reserved for primary CTAs, prices and page titles.
`brand-600` is the default answer for anything interactive.

**No native form controls** outside `src/components/ui/`. ESLint enforces it.

**Design source of truth** is the Stitch `code.html` files, not `DESIGN.md`'s
frontmatter (which contradicts its own prose). See `docs/decisions.md`.
