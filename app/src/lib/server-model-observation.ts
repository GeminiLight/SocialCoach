import type { ModelCheck, ModelIssue } from "./model-status";

// Best-effort, per-instance memory only. Browser failures also update that device.
let observation: { check: ModelCheck; at: number } | undefined;
export function clearServerObservation() { observation = undefined; }
export function observeServerFailure(issue?: ModelIssue) {
  if (issue === "rate_limit") return; // Per-visitor limits must not disable everyone.
  if (issue) observation = { check: { state: "unavailable", issue }, at: Date.now() };
}
export function observedServerHealth(): ModelCheck | undefined {
  if (observation && Date.now() - observation.at < 120_000) return observation.check;
}
