import { FAST_MODEL, SMART_MODEL, hasServerCredential,serverRequiresByok, serverModelMetadata } from "./llm";
import { checkModelConnection, type ModelCheck } from "./model-status";
import { clearServerObservation, observedServerHealth } from "./server-model-observation";
import {sharedBudgetHealth} from './shared-budget';

let cached: { check: ModelCheck; at: number } | undefined;
let pending: Promise<ModelCheck> | undefined;

export async function serverModelHealth(fresh = false): Promise<ModelCheck> {
  if (fresh) { cached = undefined; clearServerObservation(); }
  if (!hasServerCredential() || serverRequiresByok()) return { state: "unavailable", issue: "setup" };
  const budget=await sharedBudgetHealth();
  if(budget?.state==='unavailable')return budget;
  const details=budget?{resetAt:budget.resetAt,budgetRemaining:budget.budgetRemaining,budgetLimit:budget.budgetLimit}:{};
  const observed = observedServerHealth();
  if (observed) return {...observed,...details};
  if (cached && Date.now() - cached.at < 120_000) return {...cached.check,...details};
  if (!pending) pending = checkModelConnection(serverModelMetadata(), [FAST_MODEL, SMART_MODEL])
    .then(check => { cached = { check, at: Date.now() }; return check; })
    .finally(() => { pending = undefined; });
  return {...await pending,...details};
}
