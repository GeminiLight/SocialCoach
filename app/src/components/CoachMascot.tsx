import Image from "next/image";
import { clsx } from "clsx";

/** The same coach at every touchpoint. Decorative where the adjacent label names it. */
export function CoachMascot({
  variant = "figure", className, preload = false, sizes,
}: {
  variant?: "figure" | "portrait";
  className?: string;
  preload?: boolean;
  sizes?: string;
}) {
  return (
    <span className={clsx("coach-mascot", `coach-mascot-${variant}`, className)} aria-hidden="true">
      <Image
        src="/images/coach/socialcoach-cat.webp"
        alt=""
        width={1024}
        height={1536}
        preload={preload}
        sizes={sizes ?? (variant === "portrait" ? "80px" : "(min-width: 1024px) 300px, 156px")}
      />
    </span>
  );
}
