import { FAST_MODEL, SMART_MODEL, hasServerCredential,serverRequiresByok, serverModelMetadata } from "./llm";
import { checkModelConnection, type ModelCheck } from "./model-status";
import { clearServerObservation, observedServerHealth } from "./server-model-observation";

let cached: { check: ModelCheck; at: number } | undefined;
let pending: Promise<ModelCheck> | undefined;

export async function serverModelHealth(fresh = false): Promise<ModelCheck> {
  if (fresh) { cached = undefined; clearServerObservation(); }
  if (!hasServerCredential() || serverRequiresByok()) return { state: "unavailable", issue: "setup" };
  const observed = observedServerHealth();
  if (observed) return observed;
  if (cached && Date.now() - cached.at < 120_000) return cached.check;
  if (!pending) pending = checkModelConnection(serverModelMetadata(), [FAST_MODEL, SMART_MODEL])
    .then(check => { cached = { check, at: Date.now() }; return check; })
    .finally(() => { pending = undefined; });
  return pending;
}
