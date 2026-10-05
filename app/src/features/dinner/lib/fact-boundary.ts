import type { VariantId } from './story';

/** Narrow guards for cross-opening leakage found in actual model replays.
 * They don't prove factual correctness; ambiguous semantic claims still need transcript review. */
export function sceneFactError(variant:VariantId,spoken:string,playerEvidence:string[]):string|undefined {
 const player=playerEvidence.join('\n');
 if(variant.startsWith('family-')){
  const names=/(?:Mrs?\.?|Ms\.?)\s+[A-Z][a-z]+|[赵张王李刘陈孙周吴郑](?:阿)?姨/gu;
  const normalize=(name:string)=>name.replace('阿姨','姨').replace(/\./g,'').replace(/\s+/g,' ').toLowerCase();
  const supplied=new Set([...player.matchAll(names)].map(m=>normalize(m[0])));
  if([...spoken.matchAll(names)].some(m=>!supplied.has(normalize(m[0]))))return 'This named match or introducer was not supplied. Use only the provided person; do not invent another name or an offscreen exchange.';
 }
 if(variant.startsWith('school-')&&!/(?:Yue|Kai)\s+[A-Z][a-z]+/u.test(player)&&/(?:Yue|Kai)\s+[A-Z][a-z]+/u.test(spoken))
  return 'Use the supplied character names Yue and Kai; no surname or new identity is established.';
 if(variant==='elevator-privacy'&&!/材料|报告|演示|交接|document|report|demo|handoff/i.test(player)&&/那份(?:材料|报告)|你(?:手上|负责|经手)的.{0,6}(?:材料|报告)|the (?:document|report) (?:you|on your)|your (?:demo|handoff)/i.test(spoken))
  return 'No assigned document, report or demo exists in this HR-privacy opening. Discuss a proposed work update without claiming one already exists.';
 if(variant==='office-interruption'&&!/18[:：]30|六点半|6:30/.test(player)&&/18[:：]30|六点半|6:30/.test(spoken))
  return 'The 18:30 client deadline belongs to the other office opening. It is not an existing fact here.';
 const asserted=(pattern:RegExp,words=spoken)=>[...words.matchAll(pattern)].some(match=>{
  const before=words.slice(0,match.index).split(/[。！？.!?\n]/).at(-1)??'',after=words.slice(match.index+match[0].length);
  return !/(?:如果|假如|假设|若|提议|建议|并非|不是|没有说|不要说|别说|不确定|\bif\b|\bwhether\b|\bpropose\b|\bsuggest\b|\bnot saying\b|\bdon['’]t say\b|\bdo not say\b)/i.test(before)&&!/^[^。！.!\n]{0,4}(?:吗|么|呢)?\s*[？?]|^(?:吗|么)/.test(after);
 });
 const elapsedSlot=/(?:一分钟|发言时间|你的时间)(?:已经|也|就)?(?:到了|过了|结束了|用完了)|(?:your|the|that) (?:minute|speaking time) (?:is|has run) (?:up|over|out)|(?:minute|time)['’]s up/gi;
 if(variant==='office-interruption'&&asserted(elapsedSlot)&&!asserted(elapsedSlot,player))
  return 'No elapsed speaking time is observed. A one-minute slot does not expire merely because one exchange occurred. Answer the point or explicitly propose changing the slot, without claiming its time ran out.';
 const logRestriction=/(?:日志|权限).{0,12}(?:碰不到|看不了|没法查|查不了|拿不到|没权限(?:看|查)?|没后台)|(?:没有|没|无)(?:查)?日志(?:的)?(?:访问)?权限|(?:不是我|我不|我没).{0,8}(?:登得了后台|能登后台|后台权限)|(?:cannot|can’t|can't) access (?:the )?(?:logs|permissions)|(?:have|has) no access to (?:the )?logs/gi;
 if(variant==='elevator-blame'&&!/(?:乔宁|程悦|Qiao|Cheng).{0,12}(?:没权限|没有权限|没有日志权限|无法访问|不能访问|cannot access|no access)/i.test(player)&&asserted(logRestriction))
  return 'Log access and permissions are unknown, not proven inaccessible. State the known handoff and an explicitly proposed next check.';
 if(variant==='elevator-blame'&&!/(?:今晚|今天|tonight|today).{0,16}(?:必须|要|due|deadline).{0,10}(?:报告|上报|report)|(?:报告|上报|report).{0,16}(?:今晚|今天|tonight|today)/i.test(player)&&asserted(/(?:报告|上报).{0,8}(?:今晚|今天).{0,6}(?:必须|就要|要|得)|(?:今晚|今天).{0,8}(?:必须|得|要).{0,8}(?:上报|报告)|(?:report|reporting).{0,16}(?:due tonight|due today|must go|deadline)/gi))
  return 'No report deadline is established in this opening. You may explicitly propose a reporting time, not invent an existing deadline as pressure.';
 if(!/(?:明早|明天|tomorrow).{0,8}(?:才|only|排得上)/i.test(player)&&asserted(/(?:明早|明天).{0,5}才排得上|(?:only available|only have time).{0,8}tomorrow/gi))
  return 'Availability is unconfirmed. Offer a future checking time as a proposal; do not invent a calendar restriction.';
 if(variant.startsWith('office-')&&!/上周的表|last week.{0,4}(?:table|sheet)/i.test(player)&&/上周的表|last week.{0,4}(?:table|sheet)/i.test(spoken))
  return 'No last-week source sheet is established. Rui’s data source and validation result remain unknown; do not invent provenance.';
 if(variant.startsWith('office-')&&!/已经核|已核对|核过了|核对过了|already checked|already verified/i.test(player)&&/核过一部分|查过一部分|部分(?:已|已经)(?:核|查)|I(?:'ve| have) (?:already )?(?:checked|verified) (?:some|part)|(?:partly|partially) (?:checked|verified)/i.test(spoken))
  return 'Office data is still unchecked. Do not invent a partial verification offscreen. Offer a next check whose result remains unknown.';
 if(variant==='office-overtime'&&!/(?:我(?:来|接|负责|承担)(?:这段|这部分|主方案)?排版|排版(?:归我|我(?:接|来|负责)))/.test(player)&&/排版.{0,5}算你(?:一句准话|答应了|接下了)(?!吗|么)/.test(spoken))
  return 'The player discussed layout but has not accepted the assignment. Keep that part explicitly unconfirmed; ask rather than recording acceptance.';
 const qnaClaim=spoken.match(/你(?:(?:明确|已经)(?:答应|接下|承诺)|(?:答应|接下|承诺)的)[^。！？\n]{0,40}答辩/)?.[0];
 if(variant==='school-workload'&&qnaClaim&&!/(?:不是|不包括|没有|没答应|未答应).{0,5}答辩/.test(qnaClaim)&&!/(?:我|本人)(?:愿意|可以|能)?(?:接|负责|答应|承担)[^。！？\n]{0,8}答辩/.test(player))
  return 'The player has not accepted Q&A preparation. An invitation or discussion of a smaller task is not acceptance; ask or name it as unconfirmed.';
 return undefined;
}
