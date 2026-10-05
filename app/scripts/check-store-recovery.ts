/** Deterministic persistence/report checks. Run from app/: npx tsx scripts/check-store-recovery.ts */
import assert from "node:assert/strict";
import { scenarioById } from "../src/data/corpus";
import { buildSession } from "../src/lib/session-utils";
import type { Report } from "../src/lib/types";

const entries = new Map<string, string>([["socialcoach.v1", "{broken"]]);
let denied = process.argv.includes("--unavailable");
const storage = {
  getItem: (key: string) => {
    if (denied) throw new DOMException("Storage denied", "SecurityError");
    return entries.get(key) ?? null;
  },
  setItem: (key: string, value: string) => { entries.set(key, value); },
  removeItem: (key: string) => { entries.delete(key); },
  clear: () => entries.clear(),
  key: (i: number) => [...entries.keys()][i] ?? null,
  get length() { return entries.size; },
};
Object.defineProperty(globalThis, "window", { value: globalThis, configurable: true });
Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
let failures = 0;
function check(name: string, run: () => void) {
  try { run(); console.log(`PASS ${name}`); }
  catch (error) { failures++; console.error(`FAIL ${name}: ${error instanceof Error ? error.message : error}`); }
}

async function main() {
  const { useApp } = await import("../src/store/useApp");
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  check("failed storage presents recovery instead of a blank screen", () => {
    assert.equal(useApp.getState().hydrated, true);
    assert.equal(useApp.getState().storageIssue, denied ? "unavailable" : "unreadable");
  });
  useApp.getState().setLang("en");
  check("unreadable raw backup is not overwritten by initialization or UI choices", () => assert.equal(entries.get("socialcoach.v1"), "{broken"));

  denied = false;
  storage.removeItem("socialcoach.v1");
  await useApp.persist.rehydrate();
  check("read retries can recover when storage is repaired or reallowed", () => assert.equal(useApp.getState().storageIssue, null));
  const sc = scenarioById("declining-extra-hours")!;
  const session = { ...buildSession(sc, "arena", "zh"), id: "store-review", status: "ended" as const };
  const report: Report = { scoringVersion: 2, stars: 2, outcome: "partial", verdict: "", summary: "", strengths: [], weaknesses: [], alternatives: [],
    knowledge: { theoryIds: [], caseIds: [], whyThis: "" }, reflectionQuestions: [], nextStep: "", deltas: { communication: .2 } };
  const prepare = () => useApp.setState({ sessions: [session], proficiency: { communication: 2 }, practiceDays: [], profile: null });
  prepare();
  useApp.getState().applyReport(session.id, report);
  check("a report without quoted ratings cannot apply a model-proposed reward", () => {
    assert.equal(useApp.getState().proficiency.communication, 2);
    assert.equal(useApp.getState().sessions[0].status, "assessed");
  });
  useApp.getState().applyReport(session.id, report);
  check("the same unobserved report cannot alter proficiency", () => assert.equal(useApp.getState().proficiency.communication, 2));
  prepare();
  useApp.getState().applyReport("missing-session", report);
  check("a late report for a missing session cannot alter practice history", () => {
    assert.equal(useApp.getState().proficiency.communication, 2);
    assert.deepEqual(useApp.getState().practiceDays, []);
  });
  prepare();
  useApp.setState({ sessions: [{ ...session, status: "active" }] });
  useApp.getState().applyReport(session.id, report);
  check("a late report cannot assess an active conversation", () => assert.equal(useApp.getState().sessions[0].status, "active"));
  process.exitCode = failures ? 1 : 0;
}
void main();
