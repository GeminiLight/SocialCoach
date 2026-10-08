"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ContextId, Lang, SkillId } from "@/data/taxonomy";
import type { Scenario } from "@/data/corpus/types";
import type { ChatMessage, Profile, Proficiency, Reflection, Report, Session } from "@/lib/types";
import type { PatternResult } from "@/lib/tasks/types";
import { DEVICE_KEY, OPEN_DAY_KEY } from "@/lib/analytics/keys";
import {parseArchive} from '@/lib/archive';
import {estimateProficiency} from '@/lib/proficiency';
import {createArchiveStorage,type SaveIssue} from './archive-storage';

export type Theme = "system" | "light" | "dark";

export interface Settings {
  tts: boolean;
  /** Natural streaming voice with a bounded wait; system voice needs no speech service. */
  voiceEngine?: "natural" | "system";
  /** "system" follows the OS; the other two pin it. */
  theme?: Theme;
  /** The learner has been told that voice input uploads audio to their browser's vendor. */
  voiceNoticeSeen?: boolean;
  /**
   * Which figure the learner's own avatar draws. Everyone plays a character
   * called 「你」, so seeding from the name alone would hand every user the
   * same one; this makes it theirs, and re-rollable.
   */
  avatarSeed?: number;
  /** Validated versioned portrait; independent of the learner’s display name. */
  avatarPortrait?: string;
  /** Cropped, re-encoded raster data; stays on this device and out of model inputs. */
  avatarImage?:string;
  /**
   * Default for new scenes: replies on the clock. Real conversations do not
   * wait fifteen seconds for an answer, and neither, with this on, does the
   * simulation. Off unless the learner asks for it — it is a harder mode.
   */
  timed?: boolean;
  /** How long the other side waits before they carry on, in seconds. */
  patience?: Patience;
  /**
   * Anonymous usage events (which scenario, how long, how it ended; never
   * what was said) to the team's table. Undefined means on; the switch in
   * Settings is the way out, and About says what leaves the device.
   */
  telemetry?: boolean;
}

export type Patience = 10 | 15 | 20;
export const DEFAULT_PATIENCE: Patience = 15;
export const PATIENCE_OPTIONS: readonly Patience[] = [10, 15, 20];

interface AppState {
  hydrated: boolean;
  /** Read failures are shown before practice; the unreadable bytes stay intact. */
  storageIssue: "unreadable" | "unavailable" | null;
  /** In-memory onboarding choice, shared with global dialogs. */
  saveIssue:SaveIssue|null;
  retrySave:()=>void;
  restoreArchive:(archive:ReturnType<typeof parseArchive>,replace:boolean)=>Promise<boolean>;
  onboardingLang: Lang | undefined;
  profile: Profile | null;
  /**
   * The cross-session habit, cached with the session ids it was read from so it
   * only re-runs when there is genuinely new material. It is a model call over
   * the whole history, and it should not fire on every visit to Growth.
   */
  patternInsight: { result: PatternResult; from: string[]; at: number } | null;
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
  setPatternInsight: (result: PatternResult, from: string[]) => void;
  reset: () => void;
}

export const todayKey = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const initial = {
  hydrated: false,
  storageIssue: null,
  saveIssue:null,
  onboardingLang: undefined as Lang | undefined,
  profile: null,
  proficiency: {},
  sessions: [],
  customScenarios: [],
  bookmarks: [],
  practiceDays: [],
  todaySessionId: null,
  todayDate: null,
  patternInsight: null,
  // Voice on by default: an NPC that speaks changes the felt stakes of a scene
  // more than any visual does, and a setting nobody finds is a setting nobody uses.
  settings: { tts: true },
};

const archiveStorage=createArchiveStorage(issue=>{
 queueMicrotask(()=>{if(useApp.getState().saveIssue!==issue)useApp.setState({saveIssue:issue});});
});
const appStorage=createJSONStorage(()=>{
 if(typeof window==='undefined')throw new Error('Browser storage is not available during server rendering.');
 return archiveStorage;
});

export const useApp = create<AppState>()(
  persist(
    (set,get) => ({
      ...initial,
      setHydrated: () => set({ hydrated: true, storageIssue: null }),
      retrySave:()=>{archiveStorage.retry();set({saveIssue:null});},
      restoreArchive:async(archive,replace)=>{if(replace)archiveStorage.reset(true);set({...archive,sessions:archive.sessions as Session[],proficiency:estimateProficiency(archive.sessions as Session[],archive.proficiency),hydrated:true,storageIssue:null});await archiveStorage.settled();await Promise.resolve();return get().saveIssue===null;},
      setProfile: (profile) => set({ profile }),
      updateProfile: (p) => set((s) => ({ profile: s.profile ? { ...s.profile, ...p } : s.profile })),
      setLang: (lang) => set((s) => ({ onboardingLang: lang, profile: s.profile ? { ...s.profile, lang } : s.profile })),
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
          const sess=s.sessions.find(x=>x.id===id);
          if(!sess||sess.status!=='ended'||sess.report)return s;
          const creditedReport={...report};
          const reviewed=s.sessions.map(x=>x.id===id?{...x,report:creditedReport,status:'assessed' as const}:x);
          const prof=estimateProficiency(reviewed,s.proficiency);
          // Changes are derived from verified recent observations. A model's
          // proposed reward cannot alter ability, including on legacy reports.
          creditedReport.deltas=Object.fromEntries(Object.entries(prof).filter(([k,v])=>v!==s.proficiency[k as SkillId]).map(([k,v])=>[k,+((v??2.5)-(s.proficiency[k as SkillId]??2.5)).toFixed(2)]));
          const day = todayKey();
          return {
            proficiency: prof,
            practiceDays: s.practiceDays.includes(day) ? s.practiceDays : [...s.practiceDays, day],
            sessions: s.sessions.map((x) => (x.id === id ? { ...x, report:creditedReport, status: "assessed", outcome: report.outcome } : x)),
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
      setPatternInsight: (result, from) => set({ patternInsight: { result, from, at: Date.now() } }),
      reset: () => {
        archiveStorage.reset(true);
        try {
          // Clear only this app's tab state, including unsent practice drafts.
          for (const key of Object.keys(sessionStorage)) {
            if (key === "socialcoach.rehearsal-draft" || key === "socialcoach.rehearsal-brief" || key === "socialcoach.arena.location" || key.startsWith("socialcoach.draft.")) sessionStorage.removeItem(key);
          }
        } catch {}
        // The analytics device id goes with everything else: a reset learner is a new device.
        try { localStorage.removeItem(DEVICE_KEY); localStorage.removeItem(OPEN_DAY_KEY); } catch {}
        set({ ...initial, hydrated: true });
      },
    }),
    {
      name: "socialcoach.v1",
      storage: appStorage,
      partialize: (s) => ({
        profile: s.profile,
        onboardingLang:s.onboardingLang,
        proficiency: s.proficiency,
        sessions: s.sessions,
        customScenarios: s.customScenarios,
        bookmarks: s.bookmarks,
        practiceDays: s.practiceDays,
        todaySessionId: s.todaySessionId,
        todayDate: s.todayDate,
        settings: s.settings,
        // This list is an allow-list on purpose — it is why a BYOK key can never
        // end up in here. New state therefore has to be added deliberately, and
        // this one has to be, or the cross-session read re-runs a smart-model
        // call on every visit to Growth, which is what caching it prevents.
        patternInsight: s.patternInsight,
      }),
      merge:(persisted,current)=>{
        if(persisted===undefined)return current;
        const archive=parseArchive(persisted);
        return {...current,...archive,proficiency:estimateProficiency(archive.sessions as Session[],archive.proficiency)} as AppState;
      },
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          // Initial hydration can fail before the exported store is assigned.
          queueMicrotask(() => useApp.setState({ hydrated: true, storageIssue: error instanceof SyntaxError ? "unreadable" : "unavailable" }));
          return;
        }
        archiveStorage.reset();
        state?.setHydrated();
      },
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

export const useLang = (): Lang => useApp((s) => s.profile?.lang ?? s.onboardingLang ?? (typeof navigator !== "undefined" && !navigator.language.startsWith("zh") ? "en" : "zh"));
export const useGoals = (): SkillId[] => useApp((s) => s.profile?.goals ?? []);
export const useContexts = (): ContextId[] => useApp((s) => s.profile?.contexts ?? []);

/** Other windows may publish new records; retain unsaved local work on conflict. */
export function observeArchiveChanges(){
 const listener=(event:StorageEvent)=>{
  if(event.key!=='socialcoach.v1'||!archiveStorage.changed(event.newValue))return;
  if(archiveStorage.dirty()||useApp.getState().saveIssue||!archiveStorage.acceptsRemote(event.oldValue)){useApp.setState({saveIssue:'conflict'});return;}
  void useApp.persist.rehydrate();
 };
 window.addEventListener('storage',listener);
 return ()=>window.removeEventListener('storage',listener);
}
