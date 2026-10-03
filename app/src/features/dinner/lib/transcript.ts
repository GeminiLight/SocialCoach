import type { Message } from './engine';
import { actionEvidence, type Drama } from './drama';
import type { Lang, Scenario } from './content';

export type TranscriptLine={id:string;turn:number;role:'user'|'npc'|'action';text:string;speakerId?:string;targetId?:string;cue?:string};

/** Reconstruct what was actually said, including the opening and legacy interjections. */
export function dinnerTranscript(messages:Message[],records:Drama['records'],scenario:Scenario,lang:Lang):TranscriptLine[] {
  const lines:TranscriptLine[]=[];
  messages.forEach((message,index)=>{
    const turn=Math.ceil(index/2);
    if(message.heard&&(message.heard.text!==messages[index-1]?.text||message.heard.speakerId!==messages[index-1]?.speakerId))lines.push({id:`heard-${index}`,turn,role:'npc',...message.heard});
    lines.push({id:`message-${index}`,turn,role:message.role,text:message.text,speakerId:message.speakerId,targetId:message.targetId,cue:message.cue});
    if(message.interjection)lines.push({id:`interjection-${index}`,turn,role:'npc',...message.interjection});
    if(message.role==='npc')for(const record of records.filter(r=>r.turn===turn)){
      const evidence=actionEvidence(record,lang);
      lines.push({id:`action-${record.eventId}`,turn,role:'action',text:evidence.action,cue:evidence.cue});
      if(evidence.reply&&evidence.reply!==messages[index+1]?.heard?.text)lines.push({id:`action-reply-${record.eventId}`,turn,role:'npc',speakerId:scenario.characters[evidence.speaker].id,text:evidence.reply,cue:evidence.cue});
    }
  });
  return lines;
}
