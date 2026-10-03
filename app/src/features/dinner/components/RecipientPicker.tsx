import { pick, ui, type Lang, type Scenario } from '../lib/content';
import {ChevronDown} from 'lucide-react';

export function RecipientPicker({scenario,lang,value,disabled,onChange}:{scenario:Scenario;lang:Lang;value?:string;disabled:boolean;onChange:(id?:string)=>void}) {
  const options=[{id:'',name:ui.wholeTable},...scenario.characters];
  return <label className="dinner-recipient">
    <span className="recipient-caption">{pick(ui.speakTo,lang)}</span>
    <span className="recipient-select"><select name="dinner-recipient" value={value??''} disabled={disabled} onChange={e=>onChange(e.target.value||undefined)} aria-describedby="recipient-audibility">
      {options.map(person=><option key={person.id} value={person.id}>{pick(person.name,lang)}</option>)}
    </select><ChevronDown size={13} aria-hidden="true"/></span>
    <span className="sr-only" id="recipient-audibility">{pick(ui.audibleToTable,lang)}</span>
  </label>;
}
