import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { GET, POST } from "../src/app/api/feedback/route";

async function main() {
  const envKeys = ["FEEDBACK_FEISHU_APP_ID", "FEEDBACK_FEISHU_APP_SECRET", "FEEDBACK_FEISHU_BASE_TOKEN", "FEEDBACK_FEISHU_TABLE_ID"];
  const saved = envKeys.map(k => process.env[k]);
  const realFetch = globalThis.fetch;
  let writes = 0;
  let fail = false;
  let lastBody: Record<string, unknown> = {};
  const input = { id: randomUUID(), category: "bug", detail: "测试描述", contact: "", tags: ["error"], page: "/practice", lang: "zh" };
  const request = (body: unknown, extra: Record<string, string> = {}) => new Request("https://example.com/api/feedback", { method: "POST", headers: { "Content-Type": "application/json", "x-forwarded-for": "192.0.2.1", ...extra }, body: JSON.stringify(body) });
  try {
    envKeys.forEach(k => delete process.env[k]);
    assert.equal((await GET().json()).available, false);
    assert.equal((await POST(request(input))).status, 503);
    envKeys.forEach(k => process.env[k] = "test-placeholder");
    globalThis.fetch = async (url, init) => {
      if (String(url).includes("tenant_access_token")) return Response.json({ code: 0, tenant_access_token: "mock-secret", expire: 7200 });
      assert.ok(String(url).startsWith("https://open.feishu.cn/open-apis/bitable/v1/"));
      assert.match(String(url), /client_token=/);
      writes++; lastBody = JSON.parse(String(init?.body));
      await new Promise(r => setTimeout(r, 10));
      return Response.json(fail ? { code: 125403, msg: "private upstream details" } : { code: 0, data: { record: { record_id: "rec-test" } } });
    };
    assert.equal((await POST(request({ ...input, transcript: "must never be accepted" }))).status, 400);
    assert.equal((await POST(request({ ...input, detail: "x".repeat(2001) }))).status, 400);
    assert.equal((await POST(request(input, { "sec-fetch-site": "cross-site" }))).status, 403);
    assert.equal((await POST(request({ ...input, detail: "x".repeat(17000) }))).status, 413);
    const pair = await Promise.all([POST(request(input)), POST(request(input))]);
    assert.ok(pair.every(r => r.status === 200)); assert.equal(writes, 1);
    assert.equal((await POST(request(input))).status, 200); assert.equal(writes, 1);
    assert.equal((await POST(request({ ...input, detail: "changed" }))).status, 409);
    const fields = lastBody.fields as Record<string, unknown>;
    assert.equal(fields["页面"], "/practice"); assert.equal(fields["类型"], "遇到故障");
    assert.ok(!JSON.stringify(lastBody).includes("mock-secret"));
    fail = true;
    const failed = { ...input, id: randomUUID() };
    const failure = await POST(request(failed));
    assert.equal(failure.status, 502); assert.deepEqual(await failure.json(), { error: "delivery_failed" });
    fail = false;
    assert.equal((await POST(request(failed))).status, 200);
    await POST(request({ ...input, id: randomUUID() }));
    await POST(request({ ...input, id: randomUUID() }));
    const limited = await POST(request({ ...input, id: randomUUID() }));
    assert.equal(limited.status, 429); assert.equal(limited.headers.get("Retry-After"), "3600");
    console.log("Feedback checks passed: configuration, validation, privacy, duplicate submission, retry, and rate limiting.");
  } finally {
    globalThis.fetch = realFetch;
    envKeys.forEach((k, i) => { if (saved[i] === undefined) delete process.env[k]; else process.env[k] = saved[i]; });
  }
}
void main();
