import type { VariantId } from './story';

/** Narrow guards for cross-opening leakage found in actual model replays.
 * They don't prove factual correctness; ambiguous semantic claims still need transcript review. */
export function sceneFactError(variant:VariantId,spoken:string,playerEvidence:string[]):string|undefined {
 const player=playerEvidence.join('\n');
 if(variant.startsWith('family-')&&!/(?:Mrs?\.?|Ms\.?)\s+[A-Z][a-z]+|[赵张王李刘陈孙周吴郑]阿姨/u.test(player)&&/(?:Mrs?\.?|Ms\.?)\s+[A-Z][a-z]+|[赵张王李刘陈孙周吴郑]阿姨/u.test(spoken))
  return 'The match and introducer are unnamed. Do not invent a named person or an offscreen exchange with them.';
 if(variant.startsWith('school-')&&!/(?:Yue|Kai)\s+[A-Z][a-z]+/u.test(player)&&/(?:Yue|Kai)\s+[A-Z][a-z]+/u.test(spoken))
  return 'Use the supplied character names Yue and Kai; no surname or new identity is established.';
 if(variant==='elevator-privacy'&&!/材料|报告|演示|交接|document|report|demo|handoff/i.test(player)&&/那份(?:材料|报告)|你(?:手上|负责|经手)的.{0,6}(?:材料|报告)|the (?:document|report) (?:you|on your)|your (?:demo|handoff)/i.test(spoken))
  return 'No assigned document, report or demo exists in this HR-privacy opening. Discuss a proposed work update without claiming one already exists.';
 if(variant==='office-interruption'&&!/18[:：]30|六点半|6:30/.test(player)&&/18[:：]30|六点半|6:30/.test(spoken))
  return 'The 18:30 client deadline belongs to the other office opening. It is not an existing fact here.';
 if(variant==='elevator-blame'&&!/(?:我|乔宁|Qiao).{0,12}(?:没权限|无法访问|不能访问|cannot access)/i.test(player)&&/(?:日志|权限).{0,8}(?:碰不到|看不了|没法查)|(?:cannot|can’t|can't) access (?:the )?(?:logs|permissions)/i.test(spoken))
  return 'Log access and permissions are unknown, not proven inaccessible. State the known handoff and an explicitly proposed next check.';
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
