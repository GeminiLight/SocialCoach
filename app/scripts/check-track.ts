import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { GET, POST } from "../src/app/api/track/route";

/**
 * Exercises /api/track against a mocked Feishu: configuration, strict schema,
 * privacy, monthly table rotation, idempotency key, failure tolerance and the
 * rate window. No network. Run: npx tsx scripts/check-track.ts
 */
async function main() {
  const envKeys = ["FEEDBACK_FEISHU_APP_ID", "FEEDBACK_FEISHU_APP_SECRET", "FEEDBACK_FEISHU_BASE_TOKEN", "ANALYTICS_FEISHU_TABLE_PREFIX", "ANALYTICS_FEISHU_TABLE_ID"];
  const saved = envKeys.map((k) => process.env[k]);
  const realFetch = globalThis.fetch;
  const realError = console.error;
  let lists = 0, creates = 0, writes = 0, fail = false;
  const tables: { table_id: string; name: string }[] = [];
  const fieldsOf: Record<string, string[]> = {};
  let fieldAdds = 0;
  const written: { url: string; body: { records: { fields: Record<string, unknown> }[] } }[] = [];
  const ts = Date.UTC(2026, 8, 10, 12, 0, 0);
  const batch = (events: unknown[], extra: Record<string, unknown> = {}) => ({ id: randomUUID(), device: randomUUID(), lang: "zh", events, ...extra });
  const start = { name: "session_start", ts, session: "abc123def456", scenario: "neighbor-noise", origin: "arena", context: "community", difficulty: 2, timed: true, wait_s: 12 };
  const end = { name: "session_end", ts: ts + 90_000, session: "abc123def456", scenario: "neighbor-noise", outcome: "partial", turns: 5, silences: 1, duration_s: 90, ended_by: "engine", hints: 1, revealed_turn: 3, byok: false };
  const open = { name: "app_open", ts, profile: true, ua: "mobile", standalone: false };
  const others = [
    { name: "onboarding_done", ts },
    { name: "briefing_view", ts, session: "abc123def456", scenario: "neighbor-noise", origin: "arena" },
    { name: "debrief_view", ts, session: "abc123def456", scenario: "neighbor-noise", stars: 2, outcome: "partial" },
    { name: "reflect", ts, session: "abc123def456", index: 0 },
    { name: "pattern_view", ts, found: false },
    { name: "api_error", ts, task: "roleplay", kind: "http", status: 429, byok: false },
  ];
  const request = (body: unknown, extra: Record<string, string> = {}, ip = "192.0.2.1") =>
    new Request("https://example.com/api/track", { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": ip, ...extra }, body: typeof body === "string" ? body : JSON.stringify(body) });
  const settle = () => new Promise((r) => setTimeout(r, 30));
  try {
    console.error = () => {};
    envKeys.forEach((k) => delete process.env[k]);
    assert.equal((await GET().json()).available, false);
    assert.equal((await POST(request(batch([start])))).status, 204, "unconfigured: accept and drop");

    process.env.FEEDBACK_FEISHU_APP_ID = "app"; process.env.FEEDBACK_FEISHU_APP_SECRET = "secret-value"; process.env.FEEDBACK_FEISHU_BASE_TOKEN = "base";
    process.env.ANALYTICS_FEISHU_TABLE_PREFIX = "events";
    globalThis.fetch = async (url, init) => {
      const u = String(url);
      if (u.includes("tenant_access_token")) return Response.json({ code: 0, tenant_access_token: "mock-token", expire: 7200 });
      assert.ok(u.startsWith("https://open.feishu.cn/open-apis/bitable/v1/apps/base/tables"));
      assert.equal((init?.headers as Record<string, string>).Authorization, "Bearer mock-token");
      if (/\/tables\?/.test(u)) { lists++; return Response.json({ code: 0, data: { items: tables, has_more: false } }); }
      if (/\/tables$/.test(u)) {
        creates++;
        const body = JSON.parse(String(init?.body));
        const t = { table_id: `tbl${creates}`, name: body.table.name };
        tables.push(t);
        fieldsOf[t.table_id] = body.table.fields.map((f: { field_name: string }) => f.field_name);
        return Response.json({ code: 0, data: { table_id: t.table_id } });
      }
      const fm = u.match(/\/tables\/([^/]+)\/fields(\?|$)/);
      if (fm && init?.method !== "POST") return Response.json({ code: 0, data: { items: (fieldsOf[fm[1]] ?? []).map((n) => ({ field_name: n })), has_more: false } });
      if (fm) { fieldAdds++; fieldsOf[fm[1]].push(JSON.parse(String(init?.body)).field_name); return Response.json({ code: 0, data: { field: {} } }); }
      if (/batch_create/.test(u)) {
        writes++;
        written.push({ url: u, body: JSON.parse(String(init?.body)) });
        return Response.json(fail ? { code: 1254103, msg: "private upstream details" } : { code: 0, data: { records: [] } });
      }
      throw new Error("unexpected " + u);
    };
    assert.equal((await GET().json()).available, true);

    // schema: strict, bounded, metadata only
    assert.equal((await POST(request(batch([{ ...start, transcript: "never" }])))).status, 400);
    assert.equal((await POST(request(batch([{ ...start, scenario: "Hello world" }])))).status, 400);
    assert.equal((await POST(request(batch([start], { name: "小周" })))).status, 400);
    assert.equal((await POST(request(batch(Array(21).fill(start))))).status, 400);
    assert.equal((await POST(request(batch([])))).status, 400);
    assert.equal((await POST(request("{not json"))).status, 400);
    assert.equal((await POST(request(batch([start]), { "sec-fetch-site": "cross-site" }))).status, 403);
    assert.equal((await POST(request(batch([start]), { "Content-Type": "text/plain" }))).status, 415);
    assert.equal((await POST(request(batch([{ ...start, scenario: "x".repeat(17000) }])))).status, 413);
    assert.equal((await POST(request(batch([{ name: "app_open", ts }])))).status, 400, "app_open needs profile/ua/standalone now");
    assert.equal((await POST(request(batch([{ ...end, revealed_turn: 0 }])))).status, 400);
    assert.equal((await POST(request(batch([{ name: "api_error", ts, task: "roleplay", kind: "http", status: 429, byok: false, message: "leak" }])))).status, 400);
    assert.equal(writes, 0, "nothing invalid reaches the sink");

    // first write of the month creates the table, later ones find it in the cache
    const b1 = batch([start, end]);
    assert.equal((await POST(request(b1))).status, 202);
    await settle();
    assert.equal(creates, 1); assert.equal(writes, 1); assert.equal(tables[0].name, "events_2026_09");
    assert.match(written[0].url, /tables\/tbl1\/records\/batch_create\?client_token=/);
    assert.ok(written[0].url.endsWith(encodeURIComponent(b1.id)), "the batch id is the idempotency key");
    const rows = written[0].body.records.map((r) => r.fields);
    assert.equal(rows.length, 2);
    assert.equal(rows[0]["事件"], "session_start"); assert.equal(rows[0]["场景"], "neighbor-noise"); assert.equal(rows[0]["限时"], true); assert.equal(rows[0]["时间"], ts);
    assert.equal(rows[1]["事件"], "session_end"); assert.equal(rows[1]["时长秒"], 90); assert.equal(rows[1]["结束方式"], "engine"); assert.equal(rows[1]["设备"], b1.device);
    assert.equal(rows[0]["等待秒"], 12); assert.equal(rows[1]["提示次数"], 1); assert.equal(rows[1]["揭示回合"], 3); assert.equal(rows[1]["自带模型"], false);
    assert.equal(fieldAdds, 0, "a table born with the full column set is not reconciled");
    // every other event shape lands, with its own columns
    assert.equal((await POST(request(batch([open, ...others])))).status, 202);
    await settle();
    const all = written.at(-1)!.body.records.map((r) => r.fields);
    assert.equal(all.length, 7);
    assert.equal(all[0]["有档案"], true); assert.equal(all[0]["设备类型"], "mobile");
    assert.equal(all[2]["事件"], "briefing_view"); assert.equal(all[2]["来源"], "arena");
    assert.equal(all[4]["序号"], 0); assert.equal(all[5]["找到模式"], false);
    assert.equal(all[6]["任务"], "roleplay"); assert.equal(all[6]["状态码"], 429); assert.equal(all[6]["错误类型"], "http");
    assert.ok(!("message" in all[6]));
    assert.ok(!JSON.stringify(written).includes("secret-value") && !JSON.stringify(written).includes("mock-token"));
    assert.equal((await POST(request(batch([{ ...open, ts: ts + 1 }])))).status, 202);
    await settle();
    assert.equal(creates, 1); assert.equal(lists, 1); assert.equal(writes, 3);

    // a new month gets its own table; a flush across the boundary writes to both
    const oct = Date.UTC(2026, 9, 1, 0, 0, 1);
    assert.equal((await POST(request(batch([{ ...open, ts: ts + 2 }, { ...open, ts: oct }])))).status, 202);
    await settle();
    assert.equal(creates, 2); assert.equal(tables[1].name, "events_2026_10"); assert.equal(writes, 5);

    // the sink failing never fails the request, and never leaks upstream text
    fail = true;
    assert.equal((await POST(request(batch([start])))).status, 202);
    fail = false;

    // a pinned table skips discovery, and one made by an older build is given the columns it lacks first
    process.env.ANALYTICS_FEISHU_TABLE_ID = "tblpinned";
    fieldsOf.tblpinned = ["事件", "时间", "设备", "会话", "场景", "来源", "情境", "难度", "限时", "结果", "回合", "沉默", "时长秒", "星数", "结束方式", "语言", "平台", "版本"];
    assert.equal((await POST(request(batch([start])))).status, 202);
    await settle();
    assert.match(written.at(-1)!.url, /tables\/tblpinned\//); assert.equal(creates, 2);
    assert.equal(fieldAdds, 12, "the twelve newer columns were added"); assert.ok(fieldsOf.tblpinned.includes("等待秒"));
    assert.equal((await POST(request(batch([start])))).status, 202);
    await settle();
    assert.equal(fieldAdds, 12, "reconciled once per process");
    delete process.env.ANALYTICS_FEISHU_TABLE_ID;

    // rate window per address
    let limited: Response | undefined;
    for (let i = 0; i < 260; i++) {
      const r = await POST(request(batch([open]), {}, "198.51.100.7"));
      if (r.status === 429) { limited = r; break; }
    }
    assert.ok(limited, "the per-address window closes"); assert.equal(limited!.headers.get("Retry-After"), "3600");
    console.log("Track checks passed: configuration, strict schema (10 events), privacy, monthly tables, column reconciliation, idempotency, failure tolerance, pinned table, rate limiting.");
  } finally {
    globalThis.fetch = realFetch;
    console.error = realError;
    envKeys.forEach((k, i) => { if (saved[i] === undefined) delete process.env[k]; else process.env[k] = saved[i]; });
  }
}
void main();
