"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
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
}

const EMPTY: ByokConfig = {
  enabled: false,
  provider: "anthropic",
  baseUrl: "",
  apiKey: "",
  fastModel: "",
  smartModel: "",
  tokenParam: "max_tokens",
};

interface ByokState extends ByokConfig {
  hydrated: boolean;
  /** Transient: whether the model sheet is showing. Never persisted. */
  sheetOpen: boolean;
  set: (patch: Partial<ByokConfig>) => void;
  clear: () => void;
  openSheet: () => void;
  closeSheet: () => void;
}

export const STORAGE_KEY = "socialcoach.llm.v1";

export const useByok = create<ByokState>()(
  persist(
    (set) => ({
      ...EMPTY,
      hydrated: false,
      sheetOpen: false,
      set: (patch) => set(patch),
      clear: () => set({ ...EMPTY }),
      openSheet: () => set({ sheetOpen: true }),
      closeSheet: () => set({ sheetOpen: false }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        enabled: s.enabled,
        provider: s.provider,
        baseUrl: s.baseUrl,
        apiKey: s.apiKey,
        fastModel: s.fastModel,
        smartModel: s.smartModel,
        tokenParam: s.tokenParam,
      }),
      onRehydrateStorage: () => (state) => state && (state.hydrated = true),
    },
  ),
);

/** Usable only when switched on and actually filled in. */
export function isReady(c: ByokConfig): boolean {
  return c.enabled && !!c.apiKey.trim() && !!c.fastModel.trim() && !!c.smartModel.trim();
}

/** Open the model sheet from anywhere — onboarding, a slow wait, settings. */
export const openModelSheet = () => useByok.getState().openSheet();

/** Read the config outside React (client-api needs it per call). */
export const byokConfig = (): ByokConfig | null => {
  const s = useByok.getState();
  return isReady(s) ? s : null;
};

/** `sk-ant-api03-…9f2a` — enough to recognise, not enough to leak. */
export function maskKey(key: string): string {
  const k = key.trim();
  if (k.length <= 12) return "•".repeat(Math.max(4, k.length));
  return `${k.slice(0, 8)}…${k.slice(-4)}`;
}
