"use client";
import { MotionConfig } from "framer-motion";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { observeArchiveChanges,useApp } from "@/store/useApp";
import { observeByokChanges,useByok } from "@/lib/byok";
import { promptUnavailableSharedModel, refreshModelAccess, syncModelConfiguration, useCanUseModel, useModelAccess } from "@/lib/model-access";
import { ModelSheet } from "./ModelSheet";
import { FeedbackWidget } from "./Feedback";
import { Toaster } from "./ui";
import { trackOpen } from "@/lib/analytics/track";
import { DinnerAnnouncement } from "./DinnerEntry";
import { StorageRecovery } from "./StorageRecovery";
import {SaveNotice} from "./SaveNotice";
import {useInterfaceLang} from '@/lib/ui-language';
import {StartupPlaceholder} from './StartupRecovery';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const hydrated = useApp((s) => s.hydrated);
  const storageIssue = useApp((s) => s.storageIssue);
  const profile = useApp((s) => s.profile);
  const unfinished = useApp(s => s.sessions.some(s => s.status === "active" || s.status === "ended"));
  const settings = useApp((s) => s.settings);
  const router = useRouter();
  const path = usePathname();
  const immersiveReview=useApp(s=>s.sessions.some(session=>path===`/practice/${session.id}`&&session.sceneContext?.kind==='3d'&&(session.status==='ended'||session.status==='assessed')));
  const byok = useByok();
  const dinner = path === "/3d";
  const lang=useInterfaceLang();
  const learning = path === "/learn";
  const challenge = path.startsWith("/challenge/");
  const canUseModel = useCanUseModel();
  const modelAccess = useModelAccess();

  useEffect(()=>{
    if(!hydrated)return;
    document.documentElement.dataset.appReady='true';
    window.dispatchEvent(new Event('socialcoach:ready'));
  },[hydrated]);

  useEffect(() => {
    if (hydrated && byok.hydrated && !storageIssue && !learning && !challenge) promptUnavailableSharedModel();
  }, [hydrated, byok.hydrated, storageIssue, learning, challenge, modelAccess.state, modelAccess.source, modelAccess.issue, modelAccess.epoch]);

  useEffect(() => {
    if (!byok.hydrated || learning) return;
    syncModelConfiguration();
    void refreshModelAccess();
    return useByok.subscribe((next, previous) => {
      if (["enabled", "provider", "baseUrl", "apiKey", "fastModel", "smartModel", "tokenParam", "disableThinking"].some(key => next[key as keyof typeof next] !== previous[key as keyof typeof previous])) {
        syncModelConfiguration();
        void refreshModelAccess();
      }
    });
  }, [byok.hydrated, learning]);

  useEffect(() => {
    if (!hydrated || storageIssue) return;
    if (!profile && path !== "/onboarding" && !dinner && !learning && !challenge && !immersiveReview) router.replace("/onboarding");
  }, [hydrated, storageIssue, profile, path, dinner, learning, challenge, immersiveReview, router]);

  useEffect(() => {
    // Follow the resolved language, not just an explicit choice: before
    // onboarding there is no profile, and the document would keep claiming
    // zh-CN to screen readers and translation prompts on an English browser.
    const pageLang=challenge&&path.endsWith("/en")?"en":challenge?"zh":lang;
    document.documentElement.lang = pageLang === "zh" ? "zh-CN" : "en";
  }, [lang,challenge,path]);

  // An explicit choice pins the palette; "system" removes the attribute so the
  // prefers-color-scheme block takes over again.
  useEffect(() => {
    const t = settings.theme ?? "system";
    if (t === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
  }, [settings.theme]);

  useEffect(()=>observeArchiveChanges(),[]);
  useEffect(()=>observeByokChanges(),[]);

  // Once per day, profile or not; the flag separates visitors from learners.
  useEffect(() => {
    if (hydrated && !storageIssue) trackOpen(!!profile);
  }, [hydrated, storageIssue, profile]);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <MotionConfig reducedMotion="user">
    <div className={dinner ? "sheet sheet-immersive" : "sheet"}>
      {hydrated ? storageIssue ? <><SaveNotice lang={lang}/><StorageRecovery issue={storageIssue} /></> : <><SaveNotice lang={lang}/>{children}</> : challenge ? children : <StartupPlaceholder/>}
      <ModelSheet open={hydrated && !storageIssue && byok.sheetOpen} onClose={byok.closeSheet} lang={lang} />
      {hydrated && !storageIssue && !dinner && <FeedbackWidget />}
      <DinnerAnnouncement enabled={hydrated && !storageIssue && !!profile && path === "/" && canUseModel && !byok.sheetOpen && !unfinished} />
      <Toaster />
    </div>
    </MotionConfig>
  );
}
