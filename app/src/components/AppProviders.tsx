"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/store/useApp";
import { isReady, useByok } from "@/lib/byok";
import { ModelSheet } from "./ModelSheet";
import { Toaster } from "./ui";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const hydrated = useApp((s) => s.hydrated);
  const profile = useApp((s) => s.profile);
  const router = useRouter();
  const path = usePathname();
  const byok = useByok();
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
    if (profile?.lang) document.documentElement.lang = profile.lang === "zh" ? "zh-CN" : "en";
  }, [profile?.lang]);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <div className="sheet">
      {hydrated ? children : <div className="min-h-dvh" />}
      {/* One instance for the whole app. `forced` has nothing to fall back on,
          so it cannot be dismissed until it works. */}
      <ModelSheet open={hydrated && (forced || byok.sheetOpen)} onClose={byok.closeSheet} forced={forced} />
      <Toaster />
    </div>
  );
}
