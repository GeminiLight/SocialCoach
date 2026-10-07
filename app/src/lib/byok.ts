"use client";
import { create } from "zustand";
import type { Provider, TokenParam } from "./llm-core";

/**
 * The learner's own model credentials.
 *
 * Deliberately NOT part of the main app store. That store is persisted as one
 * blob and `settings/page.tsx` exports a hand-built subset of it to a file — a
 * credential living there would be one careless line away from ending up in a
 * downloaded JSON. Separate key, separate lifecycle.
 *
 * Nothing here is ever sent to our server: when this is enabled the browser
 * calls the provider directly (see `llm-client.ts`).
 */
export interface ByokConfig {
  enabled: boolean;
  provider: Provider;
  baseUrl: string;
  apiKey: string;
  fastModel: string;
  smartModel: string;
  tokenParam: TokenParam;
  /** Opt-in for compatible endpoints that support thinking:{type:"disabled"}. */
  disableThinking?: boolean;
}

const EMPTY: ByokConfig = {
  enabled: false,
  provider: "anthropic",
  baseUrl: "",
  apiKey: "",
  fastModel: "",
  smartModel: "",
  tokenParam: "max_tokens",
  disableThinking: false,
};

interface ByokState extends ByokConfig {
  hydrated: boolean;
  /** Transient: whether the model sheet is showing. Never persisted. */
  sheetOpen: boolean;
  revision: number;
  set: (patch: Partial<ByokConfig>, expectedRevision?: number) => boolean;
  clear: () => void;
  synchronize: () => void;
  openSheet: () => void;
  closeSheet: () => void;
}

export const STORAGE_KEY = "socialcoach.llm.v1";

function configuration(value:unknown):ByokConfig{
  const c=value as Partial<ByokConfig>|null;
  if(!c||!['anthropic','openai'].includes(c.provider??''))return {...EMPTY};
  const string=(value:unknown)=>typeof value==='string'?value:'';
  return {enabled:c.enabled===true,provider:c.provider!,baseUrl:string(c.baseUrl),apiKey:string(c.apiKey),fastModel:string(c.fastModel),smartModel:string(c.smartModel),tokenParam:c.tokenParam==='max_completion_tokens'?'max_completion_tokens':'max_tokens',disableThinking:c.disableThinking===true};
}
function readConfiguration(){
  const raw=typeof localStorage==='undefined'?null:localStorage.getItem(STORAGE_KEY);
  let config={...EMPTY};
  if(raw){
    // An unreadable personal-model record requires an explicit choice; it must
    // not spend the shared pool while the learner believes BYOK is selected.
    config={...EMPTY,enabled:true};
    try{const stored=JSON.parse(raw);if(stored?.version===0&&typeof stored.state?.enabled==='boolean'&&['anthropic','openai'].includes(stored.state?.provider))config=configuration(stored.state);}catch{/* Keep original bytes until an explicit save or clear. */}
  }
  return {raw,config};
}
let previousRaw:string|null=null;
let initial={...EMPTY};
try{const saved=readConfiguration();previousRaw=saved.raw;initial=saved.config;}catch{/* Saving will report unavailable device storage. */}

/** Only explicit configuration actions write credentials. Opening/closing UI
 * never persists an old snapshot; every writer compares its hydrated version. */
export const useByok=create<ByokState>((set,get)=>({
  ...initial,hydrated:typeof window!=='undefined'||typeof localStorage!=='undefined',sheetOpen:false,revision:0,
  synchronize:()=>{
    let saved:ReturnType<typeof readConfiguration>;
    try{saved=readConfiguration();}catch{return;}
    if(saved.raw===previousRaw){if(!get().hydrated)set({hydrated:true});return;}
    previousRaw=saved.raw;
    set({...saved.config,hydrated:true,sheetOpen:false,revision:get().revision+1});
  },
  set:(patch,expectedRevision)=>{
    try{
      const saved=readConfiguration();
      if(saved.raw!==previousRaw){get().synchronize();return false;}
      if(expectedRevision!==undefined&&expectedRevision!==get().revision)return false;
      const config=configuration({...get(),...patch});
      const raw=JSON.stringify({state:config,version:0,revision:crypto.randomUUID()});
      localStorage.setItem(STORAGE_KEY,raw);previousRaw=raw;
      set({...config,revision:get().revision+1});return true;
    }catch{return false;}
  },
  clear:()=>{
    localStorage.removeItem(STORAGE_KEY);previousRaw=null;
    set({...EMPTY,sheetOpen:false,revision:get().revision+1});
  },
  openSheet:()=>{get().synchronize();set({sheetOpen:true});},
  closeSheet:()=>set({sheetOpen:false}),
}));

export function observeByokChanges(){
  useByok.getState().synchronize();
  const changed=(event:StorageEvent)=>{if(event.key===STORAGE_KEY||event.key===null)useByok.getState().synchronize();};
  window.addEventListener('storage',changed);
  return()=>window.removeEventListener('storage',changed);
}

/** Usable only when switched on and actually filled in. */
export function isReady(c: ByokConfig): boolean {
  return c.enabled && !!c.apiKey.trim() && !!c.fastModel.trim() && !!c.smartModel.trim();
}

/** Open the model sheet from anywhere — onboarding, a slow wait, settings. */
export const openModelSheet = () => useByok.getState().openSheet();

/** Read the config outside React (client-api needs it per call). */
export const byokConfig = (): ByokConfig | null => {
  useByok.getState().synchronize();
  const s = useByok.getState();
  return isReady(s) ? s : null;
};

/** `sk-ant-api03-…9f2a` — enough to recognise, not enough to leak. */
export function maskKey(key: string): string {
  const k = key.trim();
  if (k.length <= 12) return "•".repeat(Math.max(4, k.length));
  return `${k.slice(0, 8)}…${k.slice(-4)}`;
}
