import { pick, ui, type Lang, type Scenario } from '../lib/content';

export function RecipientPicker({scenario,lang,value,disabled,onChange}:{scenario:Scenario;lang:Lang;value?:string;disabled:boolean;onChange:(id?:string)=>void}) {
  const options=[{id:'',name:ui.wholeTable},...scenario.characters];
  return <fieldset className="dinner-recipient" disabled={disabled}>
    <legend className="sr-only">{pick(ui.speakTo,lang)}</legend>
    <span className="recipient-caption" aria-hidden="true">{pick(ui.speakTo,lang)}</span>
    <div className="recipient-options">
      {options.map(person=><label key={person.id} className="recipient-option">
        <input type="radio" name="dinner-recipient" value={person.id} checked={(value??'')===person.id} onChange={()=>onChange(person.id||undefined)}/>
        <span>{pick(person.name,lang)}</span>
      </label>)}
    </div>
    <span className="sr-only">{pick(ui.audibleToTable,lang)}</span>
  </fieldset>;
}
