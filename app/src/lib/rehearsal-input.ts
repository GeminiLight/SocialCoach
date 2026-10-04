import {z} from 'zod';
import {pick} from './i18n';
import type {Lang} from '@/data/taxonomy';
export const MAX_REHEARSAL_CHARS=8000;
export const REHEARSAL_DRAFT_KEY='socialcoach.rehearsal-brief';
export const RehearsalDescriptionSchema=z.string().trim().min(8).max(MAX_REHEARSAL_CHARS);
export const rehearsalFields={
 who:{zh:'对方与我的关系',en:'People and our relationship'},
 situation:{zh:'发生了什么',en:'What happened'},
 aim:{zh:'我想达成',en:'What I want to achieve'},
 boundary:{zh:'我不愿答应什么',en:'My boundaries'},
 facts:{zh:'已知事实与待确认的事',en:'Known facts and open questions'},
} as const;
export type RehearsalField=keyof typeof rehearsalFields;
export type RehearsalDraft={text:string;fields:Partial<Record<RehearsalField,string>>};
const FieldsSchema=z.object(Object.fromEntries(Object.keys(rehearsalFields).map(k=>[k,z.string().max(MAX_REHEARSAL_CHARS).optional()])));
const DraftSchema=z.object({text:z.string().max(MAX_REHEARSAL_CHARS),fields:FieldsSchema});
export function readRehearsalDraft(raw:string|null,legacy=''):RehearsalDraft{
 try{if(raw){const result=DraftSchema.safeParse(JSON.parse(raw));if(result.success)return result.data as RehearsalDraft;}}catch{}
 return {text:legacy.slice(0,MAX_REHEARSAL_CHARS),fields:{}};
}
export function buildRehearsalDescription(draft:RehearsalDraft,lang:Lang):string{
 return [draft.text.trim(),...Object.entries(rehearsalFields).flatMap(([key,label])=>{
  const text=draft.fields[key as RehearsalField]?.trim();return text?[`${pick(label,lang)}：\n${text}`]:[];
 })].filter(Boolean).join('\n\n');
}
