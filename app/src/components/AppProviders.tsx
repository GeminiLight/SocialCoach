"use client";
import { MotionConfig } from "framer-motion";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp, useLang } from "@/store/useApp";
import { isReady, useByok } from "@/lib/byok";
import { ModelSheet } from "./ModelSheet";
import { FeedbackWidget } from "./Feedback";
import { Toaster } from "./ui";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const hydrated = useApp((s) => s.hydrated);
  const profile = useApp((s) => s.profile);
  const settings = useApp((s) => s.settings);
  const router = useRouter();
  const path = usePathname();
  const byok = useByok();
  const lang = useLang();
  const [needsModel, setNeedsModel] = useState(false);
  const forced = needsModel && !isReady(byok);

  // Does this deployment have a model of its own? Booleans only.
  useEffect(() => {
    let live = true;
    fetch("/api/health")
      .then((r) => r.json())
      .then((h: { serverKey?: boolean; requireByok?: boolean }) => {
        if (live) setNeedsModel(!h.serverKey || !!h.requireByok);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!profile && path !== "/onboarding") router.replace("/onboarding");
    if (profile && path === "/onboarding") router.replace("/");
  }, [hydrated, profile, path, router]);

  useEffect(() => {
    // Follow the resolved language, not just an explicit choice: before
    // onboarding there is no profile, and the document would keep claiming
    // zh-CN to screen readers and translation prompts on an English browser.
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang]);

  // An explicit choice pins the palette; "system" removes the attribute so the
  // prefers-color-scheme block takes over again.
  useEffect(() => {
    const t = settings.theme ?? "system";
    if (t === "system") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
  }, [settings.theme]);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <MotionConfig reducedMotion="user">
    <div className="sheet">
      {hydrated ? children : <div className="min-h-dvh" />}
      {/* One instance for the whole app. `forced` has nothing to fall back on,
          so it cannot be dismissed until it works. */}
      <ModelSheet open={hydrated && (forced || byok.sheetOpen)} onClose={byok.closeSheet} forced={forced} />
      {hydrated && <FeedbackWidget />}
      <Toaster />
    </div>
    </MotionConfig>
  );
}
