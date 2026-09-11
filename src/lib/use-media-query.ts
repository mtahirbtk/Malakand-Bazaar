"use client";

import * as React from "react";

/**
 * Tracks a CSS media query in JS. Needed wherever a component must pick
 * between two different Radix primitives per breakpoint (e.g. a Drawer on
 * mobile vs an anchored panel on desktop) — those primitives portal to
 * document.body, so a CSS-only "hidden md:block" wrapper has no effect on
 * whether the portaled content actually renders.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}
