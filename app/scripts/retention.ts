import { feishuBaseToken, feishuCall, feishuAppConfigured } from "../src/lib/feishu";
import { tableNameFor } from "../src/lib/analytics/feishu";

/**
 * Cohort retention from the Feishu event tables.
 *
 *   npx tsx scripts/retention.ts [--days 30] [--tz Asia/Shanghai] [--csv]
 *
 * Reads `app_open`, `onboarding_done` and `session_start` rows from every
 * `<prefix>_YYYY_MM` table (or the pinned table), buckets them into device-days
 * in the given time zone, and prints two things.
 *
 * The funnel: devices that opened at all, that finished onboarding, that
 * entered a scene — the drop-offs a launch post has to be judged by.
 *
 * Learner cohorts, by the day a device first opened with a profile (or
 * finished onboarding): how many were back on day +1 and day +7 (visit
 * retention), and how many started another practice within seven days
 * (practice retention — the number that says whether an "I have a
 * conversation tomorrow" learner became a "I want to get better" one).
 * Visitors who never made a profile are in the funnel and out of the cohorts.
 *
 * Needs the same FEEDBACK_FEISHU_* credentials as the server plus read access
 * to the Base (bitable:app or base:record:retrieve).
 */
const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const DAYS = Number(arg("days", "30"));
const TZ = arg("tz", "Asia/Shanghai");
const CSV = process.argv.includes("--csv");
const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const dayOf = (ts: number) => dayFmt.format(new Date(ts));
const shift = (day: string, n: number) => dayOf(Date.parse(`${day}T12:00:00Z`) + n * 86_400_000);

type Row = { 事件?: string; 时间?: number; 设备?: string | { text?: string }[]; 有档案?: boolean };
const text = (v: Row["设备"]) => (Array.isArray(v) ? v.map((x) => x.text ?? "").join("") : v ?? "");

async function tableIds(): Promise<string[]> {
  if (process.env.ANALYTICS_FEISHU_TABLE_ID) return [process.env.ANALYTICS_FEISHU_TABLE_ID];
  const app = encodeURIComponent(feishuBaseToken());
  const data = await feishuCall<{ items?: { table_id: string; name: string }[] }>("tables", `/bitable/v1/apps/${app}/tables?page_size=100`);
  const prefix = tableNameFor("").slice(0, -1);
  return (data.items ?? []).filter((t) => t.name.startsWith(prefix)).sort((a, b) => a.name.localeCompare(b.name)).map((t) => t.table_id);
}

async function* rows(table: string): AsyncGenerator<Row> {
  const app = encodeURIComponent(feishuBaseToken());
  let pageToken = "";
  for (;;) {
    const q = new URLSearchParams({ page_size: "500", ...(pageToken ? { page_token: pageToken } : {}) });
    const data = await feishuCall<{ items?: { fields: Row }[]; has_more?: boolean; page_token?: string }>("search", `/bitable/v1/apps/${app}/tables/${encodeURIComponent(table)}/records/search?${q}`, {
      method: "POST",
      body: JSON.stringify({ field_names: ["事件", "时间", "设备", "有档案"], filter: { conjunction: "or", conditions: ["app_open", "onboarding_done", "session_start"].map((v) => ({ field_name: "事件", operator: "is", value: [v] })) } }),
      timeoutMs: 20_000,
    });
    for (const it of data.items ?? []) yield it.fields;
    if (!data.has_more || !data.page_token) return;
    pageToken = data.page_token;
  }
}

async function main() {
  if (!feishuAppConfigured()) throw new Error("FEEDBACK_FEISHU_APP_ID / APP_SECRET / BASE_TOKEN are required");
  const visits = new Map<string, Set<string>>();   // every open, profile or not
  const opens = new Map<string, Set<string>>();    // opens as a learner (rows before the flag existed count as learners)
  const practices = new Map<string, Set<string>>();
  const onboarded = new Set<string>();
  const add = (m: Map<string, Set<string>>, device: string, day: string) => m.set(device, (m.get(device) ?? new Set()).add(day));
  for (const table of await tableIds()) {
    for await (const r of rows(table)) {
      const device = text(r.设备);
      if (!device || typeof r.时间 !== "number") continue;
      const day = dayOf(r.时间);
      if (r.事件 === "session_start") add(practices, device, day);
      else if (r.事件 === "onboarding_done") { onboarded.add(device); add(opens, device, day); }
      else if (r.事件 === "app_open") { add(visits, device, day); if (r.有档案 !== false) add(opens, device, day); }
    }
  }
  const since = shift(dayOf(Date.now()), -DAYS);
  const recent = (m: Map<string, Set<string>>) => [...m].filter(([, days]) => [...days].some((d) => d >= since)).length;
  if (!CSV) {
    console.log(`Funnel, devices active in the last ${DAYS} days (${TZ}): opened ${recent(visits)} · finished onboarding ${[...onboarded].filter((d) => [...(opens.get(d) ?? [])].some((x) => x >= since)).length} · entered a scene ${recent(practices)}`);
    console.log("");
  }
  const first = new Map<string, string>();
  for (const [device, days] of opens) first.set(device, [...days].sort()[0]);
  const cohorts = new Map<string, { n: number; d1: number; d7: number; p7: number }>();
  for (const [device, day] of first) {
    const c = cohorts.get(day) ?? { n: 0, d1: 0, d7: 0, p7: 0 };
    c.n++;
    const days = opens.get(device)!;
    if (days.has(shift(day, 1))) c.d1++;
    if (days.has(shift(day, 7))) c.d7++;
    const later = [...(practices.get(device) ?? [])].some((d) => d > day && d <= shift(day, 7));
    if (later) c.p7++;
    cohorts.set(day, c);
  }
  const list = [...cohorts].filter(([day]) => day >= since).sort();
  const pct = (a: number, b: number) => (b ? `${Math.round((100 * a) / b)}%` : "—");
  if (CSV) {
    console.log("day,new_devices,d1,d7,practice_7d");
    for (const [day, c] of list) console.log([day, c.n, c.d1, c.d7, c.p7].join(","));
    return;
  }
  console.log(`Cohorts by first-seen day (${TZ}), last ${DAYS} days. Devices: ${first.size}; device-days: ${[...opens.values()].reduce((a, s) => a + s.size, 0)}.`);
  console.log("day         new   T+1      T+7      practice≤7d");
  const tot = { n: 0, d1: 0, d7: 0, p7: 0 };
  for (const [day, c] of list) {
    console.log(`${day}  ${String(c.n).padStart(4)}  ${pct(c.d1, c.n).padStart(4)} (${c.d1})  ${pct(c.d7, c.n).padStart(4)} (${c.d7})  ${pct(c.p7, c.n).padStart(4)} (${c.p7})`);
    tot.n += c.n; tot.d1 += c.d1; tot.d7 += c.d7; tot.p7 += c.p7;
  }
  console.log(`all         ${String(tot.n).padStart(4)}  ${pct(tot.d1, tot.n).padStart(4)} (${tot.d1})  ${pct(tot.d7, tot.n).padStart(4)} (${tot.d7})  ${pct(tot.p7, tot.n).padStart(4)} (${tot.p7})`);
  console.log("T+1 / T+7 count devices seen again on exactly that day; cohorts younger than 7 days cannot have T+7 yet.");
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
