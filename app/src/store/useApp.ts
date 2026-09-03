"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ContextId, Lang, SkillId } from "@/data/taxonomy";
import type { Scenario } from "@/data/corpus/types";
import type { ChatMessage, Profile, Proficiency, Reflection, Report, Session } from "@/lib/types";

export interface Settings {
  tts: boolean;
}

interface AppState {
  hydrated: boolean;
  profile: Profile | null;
  proficiency: Proficiency;
  sessions: Session[];
  customScenarios: Scenario[];
  bookmarks: string[];
  /** ISO dates (YYYY-MM-DD) with at least one completed practice */
  practiceDays: string[];
  /** Today's scheduled session id */
  todaySessionId: string | null;
  todayDate: string | null;
  settings: Settings;

  setHydrated: () => void;
  setProfile: (p: Profile) => void;
  updateProfile: (p: Partial<Profile>) => void;
  setLang: (l: Lang) => void;
  setProficiency: (p: Proficiency) => void;
  addSession: (s: Session) => void;
  removeSession: (id: string) => void;
  /** Drop briefing-stage sessions older than a day and active sessions the learner never spoke in. */
  pruneSessions: () => void;
  updateSession: (id: string, patch: Partial<Session> | ((s: Session) => Partial<Session>)) => void;
  appendMessage: (id: string, m: ChatMessage) => void;
  updateLastNpc: (id: string, text: string, characterId: string, messageId: string) => void;
  applyReport: (id: string, report: Report) => void;
  addReflection: (id: string, r: Reflection) => void;
  updateReflection: (id: string, idx: number, patch: Partial<Reflection>) => void;
  addCustomScenario: (s: Scenario) => void;
  toggleBookmark: (id: string) => void;
  setToday: (sessionId: string | null) => void;
  setSettings: (s: Partial<Settings>) => void;
  reset: () => void;
}

export const todayKey = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const initial = {
  hydrated: false,
  profile: null,
  proficiency: {},
  sessions: [],
  customScenarios: [],
  bookmarks: [],
  practiceDays: [],
  todaySessionId: null,
  todayDate: null,
  settings: { tts: false },
};

export const useApp = create<AppState>()(
  persist(
    (set) => ({
      ...initial,
      setHydrated: () => set({ hydrated: true }),
      setProfile: (profile) => set({ profile }),
      updateProfile: (p) => set((s) => ({ profile: s.profile ? { ...s.profile, ...p } : s.profile })),
      setLang: (lang) => set((s) => ({ profile: s.profile ? { ...s.profile, lang } : s.profile })),
      setProficiency: (proficiency) => set({ proficiency }),
      addSession: (session) => set((s) => ({ sessions: [session, ...s.sessions] })),
      removeSession: (id) => set((s) => ({ sessions: s.sessions.filter((x) => x.id !== id), todaySessionId: s.todaySessionId === id ? null : s.todaySessionId })),
      pruneSessions: () =>
        set((s) => {
          const dayAgo = Date.now() - 24 * 3600 * 1000;
          return {
            sessions: s.sessions.filter((x) => {
              if (x.id === s.todaySessionId) return true;
              if (x.status === "briefing" && x.startedAt < dayAgo) return false;
              if (x.status === "active" && x.startedAt < dayAgo && !x.messages.some((m) => m.role === "learner")) return false;
              return true;
            }),
          };
        }),
      updateSession: (id, patch) =>
        set((s) => ({
          sessions: s.sessions.map((x) => (x.id === id ? { ...x, ...(typeof patch === "function" ? patch(x) : patch) } : x)),
        })),
      appendMessage: (id, m) =>
        set((s) => ({ sessions: s.sessions.map((x) => (x.id === id && !x.messages.some((y) => y.id === m.id) ? { ...x, messages: [...x.messages, m] } : x)) })),
      updateLastNpc: (id, text, characterId, messageId) =>
        set((s) => ({
          sessions: s.sessions.map((x) => {
            if (x.id !== id) return x;
            const msgs = [...x.messages];
            const i = msgs.findIndex((m) => m.id === messageId);
            if (i === -1) msgs.push({ id: messageId, role: "npc", characterId, text, ts: Date.now() });
            else msgs[i] = { ...msgs[i], text, characterId };
            return { ...x, messages: msgs };
          }),
        })),
      applyReport: (id, report) =>
        set((s) => {
          const prof = { ...s.proficiency };
          const sess = s.sessions.find((x) => x.id === id);
          const allowed = new Set<SkillId>([...(s.profile?.goals ?? []), ...(sess?.scenario.skills ?? [])]);
          for (const [k, v] of Object.entries(report.deltas)) {
            const key = k as SkillId;
            if (!allowed.has(key)) continue;
            const cur = prof[key] ?? 2.5;
            prof[key] = Math.min(5, Math.max(1, +(cur + (v ?? 0)).toFixed(2)));
          }
          const day = todayKey();
          return {
            proficiency: prof,
            practiceDays: s.practiceDays.includes(day) ? s.practiceDays : [...s.practiceDays, day],
            sessions: s.sessions.map((x) => (x.id === id ? { ...x, report, status: "assessed", outcome: report.outcome } : x)),
          };
        }),
      addReflection: (id, r) => set((s) => ({ sessions: s.sessions.map((x) => (x.id === id ? { ...x, reflections: [...x.reflections, r] } : x)) })),
      updateReflection: (id, idx, patch) =>
        set((s) => ({
          sessions: s.sessions.map((x) => (x.id === id ? { ...x, reflections: x.reflections.map((r, i) => (i === idx ? { ...r, ...patch } : r)) } : x)),
        })),
      addCustomScenario: (sc) => set((s) => ({ customScenarios: [sc, ...s.customScenarios.filter((x) => x.id !== sc.id)] })),
      toggleBookmark: (id) => set((s) => ({ bookmarks: s.bookmarks.includes(id) ? s.bookmarks.filter((b) => b !== id) : [...s.bookmarks, id] })),
      setToday: (todaySessionId) => set({ todaySessionId, todayDate: todayKey() }),
      setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      reset: () => set({ ...initial, hydrated: true }),
    }),
    {
      name: "socialcoach.v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        profile: s.profile,
        proficiency: s.proficiency,
        sessions: s.sessions.slice(0, 200),
        customScenarios: s.customScenarios,
        bookmarks: s.bookmarks,
        practiceDays: s.practiceDays,
        todaySessionId: s.todaySessionId,
        todayDate: s.todayDate,
        settings: s.settings,
      }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);

/** Consecutive-day streak ending today or yesterday. */
export function computeStreak(days: string[]): number {
  if (!days.length) return 0;
  const set = new Set(days);
  const d = new Date();
  let k = todayKey(d);
  if (!set.has(k)) {
    d.setDate(d.getDate() - 1);
    k = todayKey(d);
    if (!set.has(k)) return 0;
  }
  let n = 0;
  while (set.has(todayKey(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export const useLang = (): Lang => useApp((s) => s.profile?.lang ?? (typeof navigator !== "undefined" && !navigator.language.startsWith("zh") ? "en" : "zh"));
export const useGoals = (): SkillId[] => useApp((s) => s.profile?.goals ?? []);
export const useContexts = (): ContextId[] => useApp((s) => s.profile?.contexts ?? []);
