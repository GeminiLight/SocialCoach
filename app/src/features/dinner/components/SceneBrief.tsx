import {pick,l,type Lang,type Scenario} from '../lib/content';
import {publicSceneBrief, type BRIEF_VERSION} from '../lib/briefing';
import type {VariantId} from '../lib/story';

const copy={role:l('我的身份','My role'),goal:l('这一局想练什么','Practice aim'),facts:l('现在知道的事','Known at the opening'),unknown:l('还没确认 / 可以自己决定','Unconfirmed / Your choices'),cast:l('在场的人','People here'),move:l('走动能做什么','What movement enables'),fiction:l('原创虚构演练。之后的变化与承诺以实际对话为准。','Original fictional rehearsal. Later changes and commitments come from the actual conversation.')};
export function SceneBrief({scenario,variantId,version,lang}:{scenario:Scenario;variantId:VariantId;version?:typeof BRIEF_VERSION;lang:Lang}){
 const brief=publicSceneBrief(variantId,version);
 return <div className="public-scene-brief">
  <p className="evidence-context">{pick(scenario.title,lang)}</p>
  <section className="brief-player"><h3>{pick(copy.role,lang)}</h3><p>{pick(brief.role,lang)}</p><h3>{pick(copy.goal,lang)}</h3><ol className="list-decimal pl-5">{brief.aims.map((aim,i)=><li key={i}>{pick(aim,lang)}</li>)}</ol></section>
  <section><h3>{pick(copy.facts,lang)}</h3><ol className="table-evidence-lines">{brief.lines.map((line,i)=><li key={i}>{pick(line,lang)}</li>)}</ol></section>
  <section><h3>{pick(copy.unknown,lang)}</h3><p>{pick(brief.unknown,lang)}</p></section>
  <section><h3>{pick(copy.cast,lang)}</h3><dl className="brief-people">{scenario.characters.map(c=><div key={c.id}><dt>{pick(c.name,lang)}<span>{pick(c.role,lang)}</span></dt><dd>{pick(c.description,lang)}</dd></div>)}</dl></section>
  <section><h3>{pick(copy.move,lang)}</h3><p>{pick(brief.movement,lang)}</p></section>
  <p className="privacy-note">{pick(copy.fiction,lang)}</p>
 </div>;
}
