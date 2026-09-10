#!/usr/bin/env node
/**
 * Cloudflare DNS as code, for tianfuwang.tech.
 *
 *   node scripts/dns-sync.mjs            # plan only, changes nothing
 *   node scripts/dns-sync.mjs --apply    # make the plan true
 *
 * The token comes from the environment or from `.cloudflare` in the repo root
 * (gitignored, one line: CLOUDFLARE_API_TOKEN=...). It needs Zone:DNS:Edit on
 * this zone and nothing else. Never pass it on the command line — argv is
 * visible to every other process on the machine.
 *
 * Two safety properties, both deliberate:
 *
 * 1. **It only ever touches names listed in RECORDS.** Anything else in the
 *    zone is reported and left alone. A sync tool that deletes what it does not
 *    recognise is a tool that eventually deletes your MX records.
 *
 * 2. **The apex is refused unless `--allow-apex` is passed.** `tianfuwang.tech`
 *    currently serves a GitHub Pages site (Fastly behind Cloudflare), and
 *    Vercel's own setup instructions tell you to point the apex A record at
 *    76.76.21.21 — which would take that site down. The guard exists because
 *    the wrong move here is the one being actively recommended.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ZONE = "tianfuwang.tech";
const API = "https://api.cloudflare.com/client/v4";

/**
 * The desired state. `proxied: false` matters for anything pointing at Vercel:
 * Cloudflare's proxy in front of Vercel means two CDNs, two caches and a
 * certificate each side has to agree about. DNS-only is the supported shape.
 */
const RECORDS = [
  // { type: "CNAME", name: "socialcoach", content: "cname.vercel-dns.com", proxied: false, comment: "SocialCoach app on Vercel" },
];

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const ALLOW_APEX = args.has("--allow-apex");

function token() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN.trim();
  try {
    const m = readFileSync(join(ROOT, ".cloudflare"), "utf8").match(/CLOUDFLARE_API_TOKEN\s*=\s*(\S+)/);
    if (m) return m[1];
  } catch {}
  console.error(
    "No token. Create a scoped one at\n" +
      "  https://dash.cloudflare.com/profile/api-tokens  →  Edit zone DNS  →  Zone: " + ZONE + "\n" +
      "then put it in " + join(ROOT, ".cloudflare") + " as\n" +
      "  CLOUDFLARE_API_TOKEN=...\n" +
      "That file is gitignored. Do not paste the token into a chat or an argv.",
  );
  process.exit(2);
}

const T = token();

async function cf(path, init = {}) {
  const res = await fetch(API + path, {
    ...init,
    headers: { Authorization: `Bearer ${T}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!body?.success) {
    const msg = (body?.errors ?? []).map((e) => `${e.code} ${e.message}`).join("; ") || `HTTP ${res.status}`;
    throw new Error(`${init.method ?? "GET"} ${path} → ${msg}`);
  }
  return body.result;
}

const fqdn = (name) => (name === "@" || name === ZONE ? ZONE : `${name}.${ZONE}`);
const same = (live, want) =>
  live.type === want.type &&
  live.content === want.content &&
  Boolean(live.proxied) === Boolean(want.proxied) &&
  (want.ttl === undefined || live.ttl === want.ttl);

async function main() {
  const zones = await cf(`/zones?name=${ZONE}`);
  if (!zones.length) throw new Error(`zone ${ZONE} not found — is the token scoped to it?`);
  const zone = zones[0];
  console.log(`zone ${zone.name}  ${zone.id}  (plan only — pass --apply to change anything)`.replace(" (plan only — pass --apply to change anything)", APPLY ? "" : "  [plan only]"));

  const live = await cf(`/zones/${zone.id}/dns_records?per_page=200`);
  const managed = new Set(RECORDS.map((r) => fqdn(r.name)));

  if (RECORDS.length === 0) {
    console.log("\nRECORDS is empty; nothing declared to manage yet. Current zone:\n");
    for (const r of live.sort((a, b) => a.name.localeCompare(b.name))) {
      console.log(`  ${r.type.padEnd(6)} ${r.name.padEnd(34)} ${String(r.content).slice(0, 46).padEnd(46)} ${r.proxied ? "proxied" : "dns-only"}`);
    }
    return;
  }

  const plan = [];
  for (const want of RECORDS) {
    const name = fqdn(want.name);
    if (name === ZONE && !ALLOW_APEX) {
      console.error(
        `\nREFUSING the apex record for ${ZONE}.\n` +
          `  It currently serves a GitHub Pages site; repointing it takes that site offline.\n` +
          `  If that is genuinely what you want, re-run with --allow-apex.`,
      );
      process.exit(3);
    }
    const existing = live.filter((r) => r.name === name && r.type === want.type);
    if (existing.length === 0) plan.push({ op: "create", want, name });
    else if (existing.length > 1) plan.push({ op: "conflict", want, name, existing });
    else if (!same(existing[0], want)) plan.push({ op: "update", want, name, live: existing[0] });
    else plan.push({ op: "ok", want, name, live: existing[0] });
  }

  console.log("");
  for (const p of plan) {
    const tag = { ok: "  ok    ", create: "+ create", update: "~ update", conflict: "! several" }[p.op];
    console.log(`${tag} ${p.want.type.padEnd(6)} ${p.name.padEnd(34)} → ${p.want.content}${p.want.proxied ? "  proxied" : "  dns-only"}`);
    if (p.op === "update") console.log(`           was: ${p.live.content}${p.live.proxied ? "  proxied" : "  dns-only"}`);
    if (p.op === "conflict") for (const e of p.existing) console.log(`           existing: ${e.content}${e.proxied ? "  proxied" : "  dns-only"}`);
  }

  const untouched = live.filter((r) => !managed.has(r.name));
  if (untouched.length) console.log(`\n${untouched.length} record(s) outside RECORDS, left alone: ${[...new Set(untouched.map((r) => r.name))].join(", ")}`);

  const todo = plan.filter((p) => p.op === "create" || p.op === "update");
  if (plan.some((p) => p.op === "conflict")) {
    console.error("\nSeveral records share a name and type. Resolve that by hand first; guessing which to keep is not this script's call.");
    process.exit(4);
  }
  if (!todo.length) return console.log("\nNothing to do.");
  if (!APPLY) return console.log(`\n${todo.length} change(s) planned. Re-run with --apply to make them.`);

  for (const p of todo) {
    const payload = { type: p.want.type, name: p.name, content: p.want.content, proxied: !!p.want.proxied, ttl: p.want.ttl ?? 1, comment: p.want.comment };
    if (p.op === "create") await cf(`/zones/${zone.id}/dns_records`, { method: "POST", body: JSON.stringify(payload) });
    else await cf(`/zones/${zone.id}/dns_records/${p.live.id}`, { method: "PATCH", body: JSON.stringify(payload) });
    console.log(`  ${p.op}d ${p.want.type} ${p.name}`);
  }
  console.log("\nDone. Cloudflare serves the change immediately; a resolver that already cached the old answer will lag by its TTL.");
}

main().catch((e) => {
  console.error(`\n${e.message}`);
  process.exit(1);
});
