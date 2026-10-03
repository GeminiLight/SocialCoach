'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { DINNER_LAUNCH_KEY } from "@/features/dinner/storage";
import { Component, useEffect, type ReactNode } from 'react';
import { useLang } from '@/store/useApp';
import { pick } from '@/lib/i18n';

const copy = {
  loading: { zh: '正在准备现场…', en: 'Preparing the scene…' },
  failed: { zh: '现场暂时没能打开。', en: 'The scene could not open.' },
  retry: { zh: '重新打开', en: 'Try again' },
  home: { zh: '返回 SocialCoach', en: 'Back to SocialCoach' },
};
function Loading() {
  const lang = useLang();
  return <div className="grid min-h-dvh place-content-center gap-4 text-center" role="status"><p>{pick(copy.loading, lang)}</p><Link href="/" className="press min-h-11 text-[13px] text-ink-3">{pick(copy.home, lang)}</Link></div>;
}
const DinnerApp = dynamic(() => {
  // Only after entering /3d: fetch the renderer alongside the UI, avoiding a
  // second download waterfall. The scene boundary handles its loading failure.
  void import('@/features/dinner/components/DinnerScene').catch(()=>{});
  return import('@/features/dinner/DinnerApp');
}, { ssr: false, loading: Loading });
class DinnerBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
export function DinnerClient() {
  const lang = useLang();
  useEffect(()=>{try {localStorage.setItem(DINNER_LAUNCH_KEY,"seen");} catch {}},[]);
  return <div className="dinner-experience"><DinnerBoundary fallback={<div className="grid min-h-dvh place-content-center gap-4 text-center"><p role="alert">{pick(copy.failed, lang)}</p><button onClick={() => window.location.reload()} className="min-h-11">{pick(copy.retry, lang)}</button><Link href="/" className="min-h-11">{pick(copy.home, lang)}</Link></div>}><DinnerApp /></DinnerBoundary></div>;
}
