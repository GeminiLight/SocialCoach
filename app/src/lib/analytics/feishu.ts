import { randomUUID } from "node:crypto";
import { buildVersion, deploymentName, feishuAppConfigured, feishuBaseToken, feishuCall } from "@/lib/feishu";
import type { TrackBatch, TrackEvent } from "./schema";

/**
 * Usage events → a Feishu Base, one table per month.
 *
 * A Base table holds 20,000 records (error 1254103 past that), and a modest
 * hundred practices a day fills one in under two months, so the sink writes to
 * `<prefix>_YYYY_MM` and creates the month's table when it is missing. Pinning
 * `ANALYTICS_FEISHU_TABLE_ID` instead disables rotation, for a Base where the
 * app cannot create tables — the ceiling is then the deployer's to watch.
 *
 * Field names are Chinese to match the feedback table in the same Base; the
 * dashboard is read by the team, not by users.
 */
export const analyticsConfigured = () => feishuAppConfigured() && !!(process.env.ANALYTICS_FEISHU_TABLE_ID || process.env.ANALYTICS_FEISHU_TABLE_PREFIX);

/** Bitable field type codes. */
const TEXT = 1, NUMBER = 2, SELECT = 3, DATE = 5, CHECKBOX = 7;
export const FIELDS: { field_name: string; type: number; property?: Record<string, unknown> }[] = [
  { field_name: "事件", type: SELECT },
  { field_name: "时间", type: DATE, property: { date_formatter: "yyyy/MM/dd HH:mm", auto_fill: false } },
  { field_name: "设备", type: TEXT },
  { field_name: "会话", type: TEXT },
  { field_name: "场景", type: TEXT },
  { field_name: "来源", type: SELECT },
  { field_name: "情境", type: SELECT },
  { field_name: "难度", type: NUMBER, property: { formatter: "0" } },
  { field_name: "限时", type: CHECKBOX },
  { field_name: "结果", type: SELECT },
  { field_name: "回合", type: NUMBER, property: { formatter: "0" } },
  { field_name: "沉默", type: NUMBER, property: { formatter: "0" } },
  { field_name: "时长秒", type: NUMBER, property: { formatter: "0" } },
  { field_name: "星数", type: NUMBER, property: { formatter: "0" } },
  { field_name: "结束方式", type: SELECT },
  { field_name: "语言", type: SELECT },
  { field_name: "平台", type: SELECT },
  { field_name: "版本", type: TEXT },
  // Added 2026-09-10; `ensureFields` adds these to tables created before.
  { field_name: "有档案", type: CHECKBOX },
  { field_name: "设备类型", type: SELECT },
  { field_name: "独立窗口", type: CHECKBOX },
  { field_name: "等待秒", type: NUMBER, property: { formatter: "0" } },
  { field_name: "提示次数", type: NUMBER, property: { formatter: "0" } },
  { field_name: "揭示回合", type: NUMBER, property: { formatter: "0" } },
  { field_name: "自带模型", type: CHECKBOX },
  { field_name: "任务", type: SELECT },
  { field_name: "错误类型", type: SELECT },
  { field_name: "状态码", type: NUMBER, property: { formatter: "0" } },
  { field_name: "序号", type: NUMBER, property: { formatter: "0" } },
  { field_name: "找到模式", type: CHECKBOX },
];

export function toFields(e: TrackEvent, batch: Pick<TrackBatch, "device" | "lang">): Record<string, string | number | boolean> {
  const row: Record<string, string | number | boolean> = {
    "事件": e.name,
    "时间": e.ts,
    "设备": batch.device,
    "语言": batch.lang,
    "平台": deploymentName(),
    "版本": buildVersion(),
  };
  if (e.name === "app_open") Object.assign(row, { "有档案": e.profile, "设备类型": e.ua, "独立窗口": e.standalone });
  if (e.name === "briefing_view") Object.assign(row, { "会话": e.session, "场景": e.scenario, "来源": e.origin });
  if (e.name === "session_start") Object.assign(row, { "会话": e.session, "场景": e.scenario, "来源": e.origin, "情境": e.context, "难度": e.difficulty, "限时": e.timed, "等待秒": e.wait_s });
  if (e.name === "session_end") {
    Object.assign(row, { "会话": e.session, "场景": e.scenario, "结果": e.outcome, "回合": e.turns, "沉默": e.silences, "时长秒": e.duration_s, "结束方式": e.ended_by, "提示次数": e.hints, "自带模型": e.byok });
    if (e.revealed_turn !== undefined) row["揭示回合"] = e.revealed_turn;
  }
  if (e.name === "debrief_view") Object.assign(row, { "会话": e.session, "场景": e.scenario, "星数": e.stars, "结果": e.outcome });
  if (e.name === "reflect") Object.assign(row, { "会话": e.session, "序号": e.index });
  if (e.name === "pattern_view") Object.assign(row, { "找到模式": e.found });
  if (e.name === "api_error") Object.assign(row, { "任务": e.task, "错误类型": e.kind, "状态码": e.status, "自带模型": e.byok });
  return row;
}

export const monthOf = (ts: number) => {
  const d = new Date(ts);
  return `${d.getUTCFullYear()}_${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};
export const tableNameFor = (month: string) => `${process.env.ANALYTICS_FEISHU_TABLE_PREFIX || "events"}_${month}`;

const app = () => encodeURIComponent(feishuBaseToken());

/** name → table_id, refreshed every ten minutes so a table created elsewhere is found. */
let tables: { at: number; byName: Map<string, string> } | undefined;
const TABLES_TTL = 600_000;

export async function listTables(): Promise<Map<string, string>> {
  if (tables && Date.now() - tables.at < TABLES_TTL) return tables.byName;
  const byName = new Map<string, string>();
  let pageToken = "";
  for (let i = 0; i < 5; i++) {
    const q = new URLSearchParams({ page_size: "100", ...(pageToken ? { page_token: pageToken } : {}) });
    const data = await feishuCall<{ items?: { table_id: string; name: string }[]; has_more?: boolean; page_token?: string }>("analytics_tables", `/bitable/v1/apps/${app()}/tables?${q}`);
    for (const t of data.items ?? []) byName.set(t.name, t.table_id);
    if (!data.has_more || !data.page_token) break;
    pageToken = data.page_token;
  }
  tables = { at: Date.now(), byName };
  return byName;
}

/**
 * A table made by an earlier build lacks the columns added since. Writing a
 * field Feishu does not know fails the whole batch, so before the first write
 * to any table in this process its columns are compared with FIELDS and the
 * missing ones created. Once per table per process — fields do not disappear.
 */
const ensured = new Map<string, Promise<void>>();

export function ensureFields(tableId: string): Promise<void> {
  let p = ensured.get(tableId);
  if (!p) {
    p = (async () => {
      const t = encodeURIComponent(tableId);
      const have = new Set<string>();
      let pageToken = "";
      for (let i = 0; i < 5; i++) {
        const q = new URLSearchParams({ page_size: "100", ...(pageToken ? { page_token: pageToken } : {}) });
        const data = await feishuCall<{ items?: { field_name: string }[]; has_more?: boolean; page_token?: string }>("analytics_fields", `/bitable/v1/apps/${app()}/tables/${t}/fields?${q}`);
        for (const f of data.items ?? []) have.add(f.field_name);
        if (!data.has_more || !data.page_token) break;
        pageToken = data.page_token;
      }
      // A few at a time: twelve sequential cross-border calls once blew the
      // function's time budget on Vercel and took the batch down with them;
      // all at once risks Feishu's write-conflict error on the same table.
      const missing = FIELDS.filter((f) => !have.has(f.field_name));
      for (let i = 0; i < missing.length; i += 4) {
        await Promise.all(missing.slice(i, i + 4).map((f) => feishuCall("analytics_add_field", `/bitable/v1/apps/${app()}/tables/${t}/fields`, { method: "POST", body: JSON.stringify(f) })));
      }
    })();
    ensured.set(tableId, p);
    p.catch(() => ensured.delete(tableId));
  }
  return p;
}

/** Create-if-missing is guarded per name so concurrent batches at a month boundary make one table, not two. */
const creating = new Map<string, Promise<string>>();

export async function resolveTable(month: string): Promise<string> {
  const pinned = process.env.ANALYTICS_FEISHU_TABLE_ID;
  if (pinned) {
    await ensureFields(pinned);
    return pinned;
  }
  const name = tableNameFor(month);
  const known = (await listTables()).get(name);
  if (known) {
    await ensureFields(known);
    return known;
  }
  let pending = creating.get(name);
  if (!pending) {
    pending = (async () => {
      const data = await feishuCall<{ table_id?: string }>("analytics_create_table", `/bitable/v1/apps/${app()}/tables`, {
        method: "POST",
        body: JSON.stringify({ table: { name, default_view_name: "全部事件", fields: FIELDS } }),
      });
      if (!data.table_id) throw new Error("analytics_create_table_failed");
      tables?.byName.set(name, data.table_id);
      // Born with the full column set; nothing to compare.
      ensured.set(data.table_id, Promise.resolve());
      return data.table_id;
    })();
    creating.set(name, pending);
    pending.finally(() => creating.delete(name));
  }
  return pending;
}

/**
 * Write one client flush. Events are grouped by month (a flush that straddles
 * midnight on the first is the only case with two groups), and the batch id is
 * Feishu's idempotency key, so a beacon the browser retried lands once.
 */
export async function deliverEvents(batch: TrackBatch): Promise<void> {
  const groups = new Map<string, TrackEvent[]>();
  for (const e of batch.events) {
    const m = monthOf(e.ts);
    groups.set(m, [...(groups.get(m) ?? []), e]);
  }
  let first = true;
  for (const [month, events] of groups) {
    const table = encodeURIComponent(await resolveTable(month));
    const token = first ? batch.id : randomUUID();
    first = false;
    await feishuCall("analytics_write", `/bitable/v1/apps/${app()}/tables/${table}/records/batch_create?client_token=${encodeURIComponent(token)}`, {
      method: "POST",
      body: JSON.stringify({ records: events.map((e) => ({ fields: toFields(e, batch) })) }),
    });
  }
}
