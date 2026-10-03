import { pick, type Lang } from './content';
import type { VariantId } from './story';

type Pressure = { id:string; when:string; move:string };
type Arc = { voices:string; pressures:Pressure[]; landing:string };

/** Authored fiction. These are conditional opportunities, not new facts or a timed script.
 * Source: wiki/specs/spec-scene-craft.md#fiction. Internal direction is not player feedback. */
export const sceneArcs:Record<VariantId,Arc>={
 'work-toast':{
  voices:'Chen uses clipped public challenges, protecting face. Lin asks what she can actually take back to the client. Zhou is careful about what testing can verify, not a cheerleader.',
  pressures:[
   {id:'respect',when:'The player refuses or jokes about the drink without addressing the public toast.',move:'Chen can separate the drink from a visible acknowledgment of the guest. Ask for respect, not an invented obligation to drink. Driving or health restrictions close alcohol pressure.'},
   {id:'bridge',when:'The player proposes tea or acknowledges the guest.',move:'Let that specific gesture count; Chen need not like it. Lin may bridge: thanks are fine, but what does Wednesday actually include? Do not call the launch agreed.'},
   {id:'risk',when:'The player discusses failing tests or refuses an unconditional date.',move:'Chen wants a client-facing answer; Lin wants a usable scope; Zhou can identify unchecked tests. The choice is a conditional delivery statement versus an unsupported promise, not another toast.'},
   {id:'message',when:'There is a concrete proposed scope or check time.',move:'Test the wording that will be taken back to the client. Each owner confirms their own part. A check time is not a promise that tests pass. If talks fail, name the still-disputed promise without forcing acceptance.'},
  ],landing:'A drink boundary may hold while delivery remains disputed. A conditional plan still needs real verification. Returning to the toast must retain the earlier refusal.',
 },
 'work-deadline':{
  voices:'Chen is reluctant to retract a public guarantee. Lin distinguishes a useful partial launch from vague reassurance. Zhou will not sign for engineering fixes.',
  pressures:[
   {id:'guarantee',when:'The player challenges the guaranteed date.',move:'Chen presses on what to tell Lin now, rather than demanding the same yes again. The player can maintain, qualify, or refuse the guarantee.'},
   {id:'scope',when:'The player suggests partial scope or asks what the client needs.',move:'Lin can ask which original functions are in the proposed first delivery and where the unscoped report goes. Do not invent a new client need or a verified feature list.'},
   {id:'ownership',when:'A test check, reduced scope or new date is proposed.',move:'Zhou can distinguish checking test results from fixing everything. Chen can ask who will communicate the uncertainty. Availability is not already established.'},
   {id:'record',when:'The player asks to settle the promise or report the plan.',move:'Make the peak the exact conditional statement Chen will own in front of Lin. No one can promise another person’s acceptance. A refusal leaves an unresolved date, not a magically cancelled project.'},
  ],landing:'Preserve which parts are agreed, which need checking, and who explicitly accepted a next step. Courtesy alone does not retract Chen’s guarantee.',
 },
 'family-introduction':{
  voices:'Aunt speaks through family comparisons and concern about relaying the reply. Mom wants involvement and may feel shut out. Dad wants a meal without a fight, but is not automatically the player’s advocate.',
  pressures:[
   {id:'permission',when:'The player declines the introduction or asks what is being proposed.',move:'Separate looking, adding a contact and meeting. Aunt may resist a refusal once, but cannot turn a categorical no into consent to a smaller step.'},
   {id:'relay',when:'The player has stated a clear choice.',move:'The consequential question is what Aunt will tell the introducer: the actual refusal, or a misleading “busy for now.” The player can challenge the wording. Do not invent an appointment.'},
   {id:'care',when:'The player asks about Mom’s concern or makes a harsh remark.',move:'Mom may talk about feeling excluded, without claiming a new private fact or revealing all motives unearned. Let the player distinguish sharing their life from permitting arrangements; an apology repairs tone only.'},
   {id:'future',when:'The refusal and reply wording are clear.',move:'Explore how another future suggestion will be handled, as a proposal. Dad may offer only his own reminder. Do not restart photo pressure or pretend all relatives agreed.'},
  ],landing:'Family can remain disappointed while the refusal stands. A warm conversation afterward does not undo it. If the player changes their mind, update only the newly authorized step.',
 },
 'family-privacy':{
  voices:'Aunt treats questions as closeness, Mom defends sharing as care, Dad wants less conflict and must distinguish mediation from speaking for the player.',
  pressures:[
   {id:'audience',when:'The player refuses to disclose details publicly.',move:'Aunt can ask what may be said instead. Do not demand a salary again or treat refusal as proof of job trouble. A joke need not reveal anything.'},
   {id:'disclosure',when:'The player addresses Mom’s sharing without permission.',move:'Mom may explain why she shared “work changed,” but must not invent what the change was. The player can request a repair without supplying more private information.'},
   {id:'correction',when:'The player asks for a correction or a boundary.',move:'Discuss an actual proposed message to Aunt: what is known, what is private, what should stop being repeated. A correction must not broadcast extra details or claim unknown group posts.'},
   {id:'care-channel',when:'The immediate disclosure is acknowledged or still disputed.',move:'If the player wants to continue, Mom can negotiate how to receive future updates and permission before forwarding. Dad can help only with his own actions. Keep care distinct from unrestricted sharing.'},
  ],landing:'A disclosure cannot be undone by deleting the past. A future permission rule or a specific correction is a partial improvement; discomfort may remain.',
 },
 'school-credit':{
  voices:'Xu protects his leadership label and favors a short caption. Yue cares about identifiable design credit, not a generic thank-you. Kai can check code records but cannot confirm every contribution.',
  pressures:[
   {id:'label',when:'The player challenges “execution” or asks to see the caption.',move:'Xu can defend leading the team without claiming to have coded or designed. Use the exact opening draft if asked. The player can name missing work without erasing Xu’s actual contribution.'},
   {id:'authors',when:'A replacement caption is proposed.',move:'Let Yue or Kai object to one concrete omission or ask to verify their own part. Do not add a second agreeing voice merely to congratulate the player.'},
   {id:'publication',when:'The player asks to hold publication or obtain approval.',move:'Xu may want a prompt post, but has not posted yet. The choice is a named contribution draft with individual review versus the old general label. Agreeing to a photo never approves the text.'},
   {id:'signoff',when:'Editing and review have been proposed.',move:'Ask who edits, who checks, and what happens if one person objects. Each person accepts only their own task. “Everyone agrees” needs actual agreement; unresolved wording remains unpublished.'},
  ],landing:'Accurate wording can be accepted while the publication process is unresolved. Returning to the caption must retain the latest actual draft and separate approval from a proposal.',
 },
 'school-workload':{
  voices:'Xu wants Friday’s showcase covered with little coordination. Yue protects design time and quality. Kai protects reliable code/demo work and will not absorb all leftovers.',
  pressures:[
   {id:'bundle',when:'The player refuses or questions the bundled tasks.',move:'Xu can press on which part the player will take, without pretending the player agreed to all three. Demo, poster and Q&A are distinct.'},
   {id:'capacity',when:'The player proposes a division or asks for help.',move:'Yue and Kai confirm their own capacity only when asked; they may offer a limited part or ask what scope is intended. Do not invent exams or schedules to manufacture obstacles.'},
   {id:'gap',when:'There is a partial division.',move:'Name the actual unclaimed work. Xu can choose to own a piece, seek an explicitly proposed smaller scope, or leave the gap unresolved. The player need not rescue every gap.'},
   {id:'handoff',when:'Owners have individually accepted parts.',move:'Test how their pieces fit Friday’s showcase: what is handed over, to whom, when it is checked. A new check time is a proposal, not an offscreen commitment.'},
  ],landing:'A feasible division or an explicit remaining gap is more meaningful than universal praise. If the player yields, retain exactly the tasks they accepted, not an invented guarantee of completion.',
 },
 'elevator-privacy':{
  voices:'Fang asks briskly as a manager and dislikes being left with uncertainty. Qiao knows no HR contents. Cheng wants no rumor attributed to them and avoids taking sides.',
  pressures:[
   {id:'guess',when:'The player declines, deflects, or jokes about HR.',move:'Fang may ask what can be confirmed for work planning. No answer does not prove resignation; a joke is not notice. Opening or closing the door does not remove the audience.'},
   {id:'need',when:'The player asks why Fang needs to know.',move:'Separate a legitimate proposed staffing discussion from curiosity. Fang can specify a planning concern as a concern, not invent an announced departure or deadline.'},
   {id:'audience',when:'The player addresses another listener or asks to stop guessing.',move:'Cheng can refuse to repeat a rumor or Qiao can state that they know no contents, speaking only for themselves. Do not let them verify employment status or become a coach.'},
   {id:'channel',when:'The player proposes a private/formal future update.',move:'Negotiate what work information would be shared, through what channel, under what actual condition. A future update need not reveal the HR talk now. Fang need not be pleased, but should stop reasking the same private question.'},
  ],landing:'Privacy may be preserved with work planning still open. Walking away is not agreement or actual departure from employment; no countdown or automatic floor arrival.',
 },
 'elevator-blame':{
  voices:'Fang wants a reportable account and resists an empty “not my fault.” Qiao protects the accuracy of their own handoff. Cheng wants no unsupported attribution attached to their name.',
  pressures:[
   {id:'attribution',when:'The player denies fault or questions the cause.',move:'Fang can ask for report wording now. There is a failed demo, not a verified handoff fault. A refusal needs no invented missing artifact to discredit it.'},
   {id:'handoff',when:'The player asks Qiao about evidence.',move:'Qiao can confirm the link and account instructions were sent; completeness, permissions and logs remain unchecked. They may object to being assigned the whole investigation.'},
   {id:'interim',when:'The player proposes an interim account or a check.',move:'The choice is “account could not open, cause unchecked” versus an unsupported blame statement. Fang may ask who can do the next check. Do not change “unchecked” into “resolved.”'},
   {id:'correction',when:'The player requests responsibility for reporting or later correction.',move:'Make Fang own only wording they actually accept. Propose how checked evidence would update it; do not fabricate a posted report, a culprit or a recovered account.'},
  ],landing:'An accurate interim account is progress even before the cause is known. If the player admits a personal omission, distinguish that admission from proving the entire incident’s cause.',
 },
 'office-overtime':{
  voices:'He wants a usable client delivery, not a motivational speech. Ning cares about a workable layout handoff. Rui distinguishes data checked from merely supplied.',
  pressures:[
   {id:'favor',when:'The player refuses, agrees vaguely, or asks about the three tasks.',move:'Separate data, layout and review. He can ask which part is feasible; “sure” to a vague bundle merits a scope clarification, not invented overtime consent.'},
   {id:'priority',when:'The player questions feasibility or proposes a smaller deliverable.',move:'He chooses priorities relative to the supplied email: main proposal and data summary. Do not add slides, attachments or new client requirements. The player can accept a part without accepting all.'},
   {id:'quality',when:'Owners or a handoff are proposed.',move:'Rui may flag unchecked data, Ning may ask when she receives it. Neither becomes automatically available or agrees for another person. Keep verified and provisional data separate.'},
   {id:'send',when:'A feasible plan or an unresolved gap is identified.',move:'The consequential choice is what He can send as confirmed and what remains pending at 18:30. Check actual owners and final review. Do not advance the clock or invent that the client has accepted a reduced scope.'},
  ],landing:'A deadline is not removed by a polite refusal. A partial plan leaves a visible gap or a conditional delivery, and He must own any client-facing compromise he accepts.',
 },
 'office-interruption':{
  voices:'Ning compresses others’ explanations and defends her own approach. He wants a short, decision-relevant point. Rui is careful about unverified data and can disagree on a limited factual claim.',
  pressures:[
   {id:'floor',when:'The player requests speaking time or challenges the interruption.',move:'He or Ning can ask how much time and what decision it informs. Raising a hand is a request, not approval. Give an actual accepted bounded slot when earned; do not continue interrupting forever.'},
   {id:'point',when:'A speaking slot is accepted or the player gives the key point.',move:'Respond to the specific risk/proposal the player supplies. Do not invent the player’s design. Ning can challenge one implication instead of saying “I already know” again.'},
   {id:'uncertainty',when:'The player discusses evidence or asks Rui.',move:'Rui distinguishes unchecked data from a verified conclusion. Missing evidence can lead to a proposed check or reversible decision, not an invented validation or an automatic ban on speaking.'},
   {id:'decision',when:'The relevant point is heard and alternatives are stated.',move:'He can choose, conditionally try, or defer a specific proposal within his authority. Check whether the player’s concern remains unanswered; do not mistake speaking time for adoption of their plan.'},
  ],landing:'Being heard is one win; adopting the proposal is a separate decision. Preserve both. A repaired interruption does not reset on every turn; a rejected proposal can still be examined.',
 },
};

export function isArcBeat(variant:VariantId,beat:string) {
 return sceneArcs[variant].pressures.some(p=>p.id===beat);
}

export function arcDirection(variant:VariantId,lang:Lang) {
 const arc=sceneArcs[variant];
 return `SCENE-SPECIFIC PLAY (authored fiction, not additional facts):
Voices: ${arc.voices}
Conditional developments: ${JSON.stringify(arc.pressures)}
Landing: ${arc.landing}
Choose at most ONE applicable development after answering the current player. These are opportunities, not a required order. Follow the player's alternate goal or return to an earlier unresolved point. Do not play an inapplicable development to fill time. Use story.beat only when you actually play that development; it describes the reply, not success, consent or a score. Previous beats are in history.story. A repeated beat needs a new concrete issue; don't repeat its earlier demand. An old save without beats has no missing turns: infer only from its real dialogue.
${pick({zh:'中文口吻：陈总短促、林姐务实，小周谨慎；亲戚有口头话，同学别说公文，办公室别说酒桌话。不用“我理解你的感受”“建立一个机制”等助理腔。',en:'Speak in the selected character’s register. Family sounds like family, students like students. Avoid assistant phrases such as “I understand your feelings” or “establish a mechanism.”'},lang)}`;
}
