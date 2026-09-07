"use client";
import { useId } from "react";

/** The approved split heart, using the same geometry as public/icon.svg. */
export function BrandMark({ size = 40 }: { size?: number }) {
  const clip = useId();
  const heart = "M256 396 C196 350 112 300 112 224 A74 74 0 0 1 256 196 A74 74 0 0 1 400 224 C400 300 316 350 256 396 Z";
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden="true" className="shrink-0">
      <rect width="512" height="512" rx="112" fill="var(--paper-deep)" />
      <defs>
        <clipPath id={clip}>
          <rect width="256" height="512" />
        </clipPath>
      </defs>
      <path d={heart} fill="var(--accent)" />
      <path d={heart} fill="var(--ink)" clipPath={`url(#${clip})`} />
      <path
        d="M410 98 C414.7 122.2 421.8 129.3 446 134 C421.8 138.7 414.7 145.8 410 170 C405.3 145.8 398.2 138.7 374 134 C398.2 129.3 405.3 122.2 410 98 Z"
        fill="var(--ink)"
      />
    </svg>
  );
}
