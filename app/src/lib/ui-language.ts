"use client";
import {create} from 'zustand';
import type {Lang} from '@/data/taxonomy';
import {usePathname} from 'next/navigation';
import {useLang} from '@/store/useApp';

/** Active 3D interface language, separate from the language of stored words. */
export const useDinnerUiLanguage=create<{lang:Lang|null}>(()=>({lang:null}));
export function useInterfaceLang(){
  const main=useLang(),scene=useDinnerUiLanguage(s=>s.lang),path=usePathname();
  // Public invites render before local archive hydration. Their URL is the
  // stable language source on both server and client, including shared UI.
  const challengeLang=path.match(/^\/challenge\/[^/]+\/[^/]+\/(zh|en)$/)?.[1] as Lang|undefined;
  if(challengeLang)return challengeLang;
  return path==='/3d'&&scene?scene:main;
}
