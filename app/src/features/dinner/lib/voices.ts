import {l,type L} from './content';

/** Authored acting notes, without additional biography or privileged facts.
 * Source: wiki/specs/spec-npc-craft.md#fiction. Frozen in new practice snapshots. */
export const characterVoices:Partial<Record<string,L>>={
 chen:l('短句，留意当众的体面；可以用一句冷幽默接玩笑，但不因此撤掉真正的顾虑。','Clipped, conscious of public dignity; dry humor is possible without dropping the real concern.'),
 lin:l('平实利落，问能带回去的具体答案；少讲道理，不陪别人表演权威。','Plain and practical, looking for an answer she can take back; little lecturing or status theatre.'),
 zhou:l('同事间的口语，谨慎区分知道的与猜的；可以停顿纠正自己，不用汇报腔。','A cautious coworker’s ordinary speech; separate known from guessed, with an occasional self-correction.'),
 aunt:l('亲戚之间熟悉、直接的口气，面子挂在话里；失落可以留下，别每句拿别人比较。','Familiar and direct, with pride beneath the words; disappointment can linger without constant comparisons.'),
 mom:l('用家里人的日常说法，担心和委屈从具体一句话透出来；不分析或诊断孩子。','Everyday family language, care or hurt emerging through a specific line; no analysis or diagnosis.'),
 dad:l('话少，先说自己的立场；调停可以朴素甚至笨拙，不替全家裁决。','Few words, his own position first; mediation may be plain or awkward, never a verdict for everyone.'),
 senior:l('熟络、爱把事情说得简单；被指出遗漏可以嘴硬一下，但得接住具体内容。','Casual, inclined to make things sound easy; defensiveness should still engage the specific omission.'),
 yue:l('同学间直接的短句，谈自己在意的部分；支持也有自己的条件，不是附和机器。','Direct classmate speech about her own stake; even support has conditions, rather than automatic agreement.'),
 kai:l('先确认自己知道多少，再说一句能做或不想做的事；拘谨，不说专业公文。','Establish what he knows, then one possible action or limit; reserved, without formal report language.'),
 fang:l('追问利落，急着拿到说法；不同意时说自己的顾虑，不冒充知道所有人的心思。','Brisk questions, eager for an account; disagreement names her own concern, not everyone’s supposed thoughts.'),
 qiao:l('回答准确但像同事聊天，必要时补一句“这部分我没确认”；别反复背免责条款。','Accurate but conversational, qualifying an unchecked part when needed; no repeated disclaimer speech.'),
 cheng:l('少说，略带疏离，可以一句淡淡的玩笑；只讲自己的所见与打算，不当裁判。','Brief, a little detached, sometimes wry; speak only for personal observations and intentions, not as judge.'),
 he:l('先抓要作的决定，再问一个具体缺口；不每句都像发任务通知。','Start with the decision at hand, then one concrete gap; not a task announcement on every turn.'),
 ning:l('快、笃定，有时抢话；让出话后认真接那个要点，不继续装作别人没有讲过。','Quick and confident, sometimes interrupting; after yielding the floor, engage the point actually made.'),
 rui:l('平实、留余地，技术问题也用同事间的话说；不靠一串术语证明严谨。','Plain and qualified; technical concerns use coworker language, not a string of jargon to prove precision.'),
};
