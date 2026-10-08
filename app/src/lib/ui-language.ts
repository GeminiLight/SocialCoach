"use client";
import {create} from 'zustand';
import type {Lang} from '@/data/taxonomy';
import {usePathname} from 'next/navigation';
import {useLang} from '@/store/useApp';

/** Active 3D interface language, separate from the language of stored words. */
export const useDinnerUiLanguage=create<{lang:Lang|null}>(()=>({lang:null}));
export function useInterfaceLang(){
  const main=useLang(),scene=useDinnerUiLanguage(s=>s.lang),path=usePathname();
  return path==='/3d'&&scene?scene:main;
}
