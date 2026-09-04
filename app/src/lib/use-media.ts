"use client";
import { useEffect, useState } from "react";

/**
 * Match a media query from JS. Starts at `false` so server render and first
 * client paint agree; the real value arrives in the effect.
 *
 * Layout is CSS-only wherever possible — reach for this only when the
 * difference between phone and desktop can't be expressed in a class
 * (animation variants, which item counts as "selected").
 */
export function useMedia(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatches(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);
  return matches;
}

/** The `lg` breakpoint: nav rail, two-pane layouts, centered dialogs. */
export const useIsDesktop = () => useMedia("(min-width: 64rem)");
