"use client";
import { clsx } from "clsx";
import { todayKey, useLang } from "@/store/useApp";
import { t } from "@/lib/i18n";

const WEEKS = 26;
const PHONE_WEEKS = 12;

/** Columns are weeks, rows Monday–Sunday. Future days remain unpainted. */
export function Footprint({ days, className }: { days: string[]; className?: string }) {
  const lang = useLang();
  const set = new Set(days);
  const today = new Date();
  const current = todayKey(today);
  const start = new Date(today);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - (WEEKS - 1) * 7);
  const cols = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = new Date(start);
      date.setDate(start.getDate() + w * 7 + d);
      const key = todayKey(date);
      return { date, key, on: set.has(key), future: key > current };
    }),
  );
  return (
    <div className={clsx("flex flex-col gap-3", className)}>
      <div
        className="grid grid-cols-12 lg:grid-cols-[repeat(26,minmax(0,1fr))] gap-1"
        role="img"
        aria-label={t(lang, "pg_calendar_label", { n: set.size })}
      >
        {cols.map((col, w) => {
          const monthStart = col.find((cell) => cell.date.getDate() === 1);
          const nextHasMonth = cols[w + 1]?.some((cell) => cell.date.getDate() === 1);
          const label = monthStart ?? (!nextHasMonth && (w === 0 || w === WEEKS - PHONE_WEEKS) ? col[0] : null);
          return (
            <div key={col[0].key} className={clsx("min-w-0 flex flex-col gap-1", w < WEEKS - PHONE_WEEKS && "hidden lg:flex")}>
              <span
                className={clsx(
                  "h-5 text-[10px] text-ink-3 whitespace-nowrap num",
                  !monthStart && w === WEEKS - PHONE_WEEKS && "lg:invisible",
                )}
              >
                {label?.date.toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US", { month: "short" })}
              </span>
              {col.map((cell) => (
                <span
                  key={cell.key}
                  title={`${cell.key}${cell.on ? ` · ${t(lang, "pg_calendar_done")}` : ""}`}
                  className={clsx(
                    "h-3.5 rounded-[3px] border",
                    cell.on ? "bg-moss border-moss" : cell.future ? "border-transparent" : "bg-paper-deep border-transparent",
                    cell.key === current && "outline outline-1 outline-offset-2 outline-ink-3",
                  )}
                />
              ))}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-ink-3">
        <span>
          <span className="lg:hidden">{t(lang, "pg_weeks", { n: PHONE_WEEKS })}</span>
          <span className="hidden lg:inline">{t(lang, "pg_weeks", { n: WEEKS })}</span>
        </span>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-moss" />
            {t(lang, "pg_calendar_done")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm border border-ink-3" />
            {t(lang, "pg_calendar_today")}
          </span>
        </div>
      </div>
    </div>
  );
}
