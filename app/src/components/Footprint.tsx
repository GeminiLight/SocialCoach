"use client";
import { clsx } from "clsx";
import { todayKey } from "@/store/useApp";

/** Half a year is drawn; a phone only has room for the recent 12 weeks of it. */
const WEEKS = 26;
const PHONE_WEEKS = 12;

/**
 * Practice days as ink filling cells on paper — the same device the objective
 * progress uses during a conversation, applied to the calendar. Columns are
 * weeks, rows are weekdays, most recent week on the right.
 */
export function Footprint({ days, className }: { days: string[]; className?: string }) {
  const set = new Set(days);
  const today = new Date();
  // start on the Monday of the week that is WEEKS-1 weeks back
  const start = new Date(today);
  const dow = (start.getDay() + 6) % 7; // Monday = 0
  start.setDate(start.getDate() - dow - (WEEKS - 1) * 7);

  const cols: { key: string; on: boolean; future: boolean }[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const col: { key: string; on: boolean; future: boolean }[] = [];
    for (let d = 0; d < 7; d++) {
      const cell = new Date(start);
      cell.setDate(start.getDate() + w * 7 + d);
      const key = todayKey(cell);
      col.push({ key, on: set.has(key), future: cell > today });
    }
    cols.push(col);
  }

  return (
    <div className={clsx("flex justify-end gap-[3px] lg:gap-1", className)} role="img" aria-label={`${set.size} practice days`}>
      {cols.map((col, w) => (
        <div key={w} className={clsx("flex flex-col gap-[3px] lg:gap-1", w < WEEKS - PHONE_WEEKS && "hidden lg:flex")}>
          {col.map((cell) => (
            <span
              key={cell.key}
              title={cell.key}
              className={clsx(
                "h-3 w-3 lg:h-3.5 lg:w-3.5 rounded-[3px] border transition-colors",
                // An empty grid should be a quiet substrate, not the loudest thing
                // on the page: only practised days carry ink.
                cell.on ? "bg-ink border-ink" : cell.future ? "border-transparent bg-transparent" : "bg-paper-deep border-transparent",
              )}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
