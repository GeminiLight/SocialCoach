"use client";
import { create } from "zustand";
import { useByok, isReady, type ByokConfig } from "./byok";
import { checkByokConnection } from "./llm-client";
import { LLMError } from "./llm-core";
import { isModelIssue, modelIssue, type ModelCheck } from "./model-status";
import { modelMessage } from "./model-copy";
import type { Lang } from "@/data/taxonomy";

type Access = { state: ModelCheck["state"] | "checking"; issue?: ModelCheck["issue"];resetAt?:number;budgetRemaining?:number;budgetLimit?:number; source: "server" | "own"; epoch: number };
export const useModelAccess = create<Access>(() => ({ state: "checking", source: "server", epoch: 0 }));
export const useCanUseModel = () => useModelAccess(s => s.state === "available" || s.state === "unverified");
let configuration: string | undefined;
let pending: Promise<void> | undefined;
const PROMPT_KEY = "socialcoach.model-prompt.v1";
let promptedSharedIssue: string | undefined;

/** A dismissible setup prompt, once per shared failure in this browser tab. */
export function promptUnavailableSharedModel(): boolean {
  const access = useModelAccess.getState();
  if (access.state === "available") {
    promptedSharedIssue = undefined;
    try { sessionStorage.removeItem(PROMPT_KEY); } catch {}
    return false;
  }
  if (access.source !== "server" || access.state !== "unavailable") return false;
  const issue = access.issue ?? "setup";
  let remembered = promptedSharedIssue;
  try { remembered = sessionStorage.getItem(PROMPT_KEY) ?? remembered; } catch {}
  if (remembered === issue) return false;
  promptedSharedIssue = issue;
  try { sessionStorage.setItem(PROMPT_KEY, issue); } catch {}
  if (!useByok.getState().sheetOpen) useByok.getState().openSheet();
  return true;
}

// The identity is private, transient and never logged or persisted.
function identity(c: ByokConfig) { return JSON.stringify([c.enabled, c.provider, c.baseUrl, c.apiKey, c.fastModel, c.smartModel, c.tokenParam, !!c.disableThinking]); }
export function syncModelConfiguration() {
  useByok.getState().synchronize();
  const c = useByok.getState();
  const key = identity(c);
  if (key === configuration) return;
  configuration = key;
  pending = undefined;
  useModelAccess.setState(s => ({ state: "checking", issue: undefined,resetAt:undefined,budgetRemaining:undefined,budgetLimit:undefined, source: c.enabled ? "own" : "server", epoch: s.epoch + 1 }));
}

export async function refreshModelAccess(retry = false) {
  syncModelConfiguration();
  if (pending) return pending;
  const c = useByok.getState();
  const epoch = useModelAccess.getState().epoch;
  const work = async () => {
    let check: ModelCheck;
    if (c.enabled) check = isReady(c) ? await checkByokConnection(c) : { state: "unavailable", issue: "setup" };
    else {
      try {
        const response = await fetch(`/api/health${retry ? "?retry=1" : ""}`, { cache: "no-store", signal: AbortSignal.timeout(25_000) });
        if (!response.ok) throw new Error("health");
        const h = await response.json();
        check = ["available", "unverified", "unavailable"].includes(h.state)
          ? { state: h.state, issue: isModelIssue(h.issue) ? h.issue : undefined,...(Number.isFinite(h.resetAt)?{resetAt:h.resetAt}:{}),...(Number.isFinite(h.budgetRemaining)?{budgetRemaining:h.budgetRemaining}:{}),...(Number.isFinite(h.budgetLimit)?{budgetLimit:h.budgetLimit}:{}) }
          : { state: h.serverKey && !h.requireByok ? "unverified" : "unavailable", issue: h.serverKey && !h.requireByok ? undefined : "setup" };
      } catch { check = { state: "unverified" }; }
    }
    if (useModelAccess.getState().epoch === epoch && useModelAccess.getState().state === "checking") useModelAccess.setState(check);
  };
  // An explicit retry may clear a previous failure. Automatic navigation cannot.
  if (retry) useModelAccess.setState({ state: "checking", issue: undefined });
  pending = work().finally(() => { if (useModelAccess.getState().epoch === epoch) pending = undefined; });
  return pending;
}

export function acceptModelCheck(check: ModelCheck) {
  syncModelConfiguration();
  useModelAccess.setState(check);
}

/** All real model calls share this guard, including the 3D practice. */
export async function withModelAccess<T>(lang: Lang, run: () => Promise<T>): Promise<T> {
  syncModelConfiguration();
  const requestEpoch = useModelAccess.getState().epoch;
  if (useModelAccess.getState().state === "checking") await refreshModelAccess();
  const before = useModelAccess.getState();
  if (before.epoch !== requestEpoch) throw new DOMException("Model settings changed", "AbortError");
  if (before.state === "unavailable") throw new LLMError(modelMessage(before.issue ?? "setup", lang,before.resetAt), 503, false, before.issue ?? "setup");
  try {
    const result = await run();
    // A successful parallel task must not erase another task's later failure.
    if (useModelAccess.getState().epoch === before.epoch && useModelAccess.getState().state !== "unavailable") useModelAccess.setState({ state: "available", issue: undefined });
    return result;
  } catch (error) {
    if ((error as Error)?.name === "AbortError" || (error as { error?: { type?: string } })?.error?.type === "aborted") throw error;
    const issue = modelIssue(error);
    if (issue) {
      if (useModelAccess.getState().epoch === before.epoch) useModelAccess.setState({ state: "unavailable", issue,resetAt:(error as {retryAt?:number}).retryAt });
      const kind = (error as { kind?: string })?.kind;
      const safeKind = kind === "stream" || kind === "network" || kind === "http" ? kind : issue === "network" ? "network" : "http";
      throw Object.assign(new LLMError(modelMessage(issue, lang,(error as {retryAt?:number}).retryAt), (error as { status?: number })?.status ?? 503, false, issue), { kind: safeKind });
    }
    throw error;
  }
}
