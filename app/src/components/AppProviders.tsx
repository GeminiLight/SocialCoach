"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/store/useApp";
import { Toaster } from "./ui";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const hydrated = useApp((s) => s.hydrated);
  const profile = useApp((s) => s.profile);
  const router = useRouter();
  const path = usePathname();

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
    <div className="app-col">
      {hydrated ? children : <div className="min-h-dvh" />}
      <Toaster />
    </div>
  );
}
