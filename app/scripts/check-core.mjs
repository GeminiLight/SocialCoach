import {spawnSync} from 'node:child_process';
const scripts=['check-corpus.ts','check-pattern-guard.ts','check-practice-policy.ts','check-roleplay-output.ts','check-roleplay-facts.ts','check-store-recovery.ts','check-debrief-assistant.ts','check-practice-continuation.ts','check-model-availability.ts'];
for(const script of scripts){const result=spawnSync('pnpm',['exec','tsx',`scripts/${script}`],{stdio:'inherit'});if(result.status!==0)process.exit(result.status??1);}
const denied=spawnSync('pnpm',['exec','tsx','scripts/check-store-recovery.ts','--unavailable'],{stdio:'inherit'});process.exit(denied.status??1);
