import type {Case,Theory} from '@/data/corpus/types';
import type {Lang} from '@/data/taxonomy';
import {pick} from './i18n';

/** Model-facing source material, after retrieval. Keep every selected source's
 * substantive content and attribution in the requested language. Search tags
 * and the unused translation belong to retrieval, not the evidence prompt.
 */
export function knowledgeContext(kb:{theories:Theory[];cases:Case[]},lang:Lang){
 return [
  ...kb.theories.map(k=>({kind:'theory' as const,id:k.id,title:pick(k.title,lang),source:k.source,principle:pick(k.principle,lang),howTo:k.howTo.map(v=>pick(v,lang))})),
  ...kb.cases.map(k=>({kind:'case' as const,id:k.id,title:pick(k.title,lang),source:k.source,situation:pick(k.situation,lang),whatHappened:pick(k.whatHappened,lang),takeaway:pick(k.takeaway,lang)})),
 ];
}
