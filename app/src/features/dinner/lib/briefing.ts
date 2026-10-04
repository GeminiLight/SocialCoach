import {l, type L} from './content';
import {tableEvidence} from './tableEvidence';
import type {VariantId} from './story';

/** Public, original-fiction rehearsal material, shared by UI, director and coach.
 * Version 1 belongs only to newly created practices; old transcripts keep their setting. */
export const BRIEF_VERSION=1 as const;
const fiction={type:'original-fiction' as const,path:'wiki/specs/spec-feedback-refinement.md'};
const roles:Record<VariantId,L>={
 'work-toast':l('负责上线的项目成员','Project member responsible for the launch'),
 'work-deadline':l('负责上线的项目成员','Project member responsible for the launch'),
 'family-introduction':l('被家人介绍相亲对象的成年人','An adult offered a family introduction'),
 'family-privacy':l('工作消息被家人转述的成年人','An adult whose work news was shared by family'),
 'school-credit':l('完成核心代码的队员','Team member who worked on the core code'),
 'school-workload':l('参与下一场展示的队员','Team member preparing the next showcase'),
 'elevator-privacy':l('刚从 HR 办公室出来的部门成员','Department member who just left HR'),
 'elevator-blame':l('参与会议演示的部门成员','Department member involved in the demo'),
 'office-overtime':l('负责主方案的项目成员','Project member responsible for the main proposal'),
 'office-interruption':l('正在讲方案的项目成员','Project member presenting the proposal'),
};
/** Split compound original aims so a started discussion cannot count as attainment. */
export const initialAims:Record<VariantId,L[]>={
 'work-toast':[l('明确保留不喝酒的选择。','Explicitly maintain the choice not to drink alcohol.'),l('把交付范围与未确认条件讲清楚。','State delivery scope and unconfirmed conditions clearly.')],
 'work-deadline':[l('不接下未经验证的上线保证。','Do not accept an unverified launch guarantee.'),l('讲清范围、验收条件与负责人的安排。','Clarify scope, acceptance conditions and ownership.')],
 'family-introduction':[l('明确自己接受与拒绝哪些步骤。','State which steps you accept and decline.'),l('保留自己的决定权，不被默认为接受其他安排。','Keep the decision yours without being assumed to accept other arrangements.')],
 'family-privacy':[l('说清哪些信息可分享、谁有转述许可。','Clarify what may be shared and who has permission.'),l('确认这次未经许可转述的补救方式。','Agree how to address this unpermitted disclosure.')],
 'school-credit':[l('谈成准确的贡献表述。','Agree an accurate credit statement.'),l('确认修改人与一起核对的安排。','Confirm who edits and how everyone reviews it.')],
 'school-workload':[l('讲清新增任务、时间与分工。','Clarify the extra tasks, timing and division.'),l('让每个人亲自确认自己的部分。','Have each person confirm their own part.')],
 'elevator-privacy':[l('保留 HR 私下谈话的信息边界。','Keep the HR conversation private.'),l('把工作安排与离职猜测区分清楚。','Separate work planning from guesses about leaving.')],
 'elevator-blame':[l('明确已知事实、待核对项与责任边界。','Clarify known facts, unchecked items and responsibility.'),l('不接下没有证据的事故归因。','Do not accept an unsupported attribution of the incident.')],
 'office-overtime':[l('明确自己能做与尚未答应的部分。','State what you can do and have not accepted.'),l('确认优先级、负责人和可交范围。','Confirm priorities, owners and deliverable scope.')],
 'office-interruption':[l('拿回一段明确的发言时间。','Secure a clear speaking slot.'),l('讲完关键点并确认下一步。','Finish the key point and confirm a next step.')],
};
const projects:Partial<Record<VariantId,L[]>>={
 'office-interruption':[
  l('演练项目：客服工单流程改版。你的方案是先让两名客服试用一周，再决定是否全组推广。','Rehearsal project: redesigning the support-ticket workflow. Your proposal is a one-week pilot with two agents before deciding on a team-wide rollout.'),
  l('你要讲的风险：自动分派规则尚未核验，可能把工单派给没有对应权限的人。试用也需先确认权限；瑞瑞的数据未核对，不能当成结论。','Your concern: routing rules are unchecked and may assign tickets to agents without the required access. Access must be checked even for the pilot. Rui’s data is unverified and cannot establish a conclusion.'),
 ],
 'office-overtime':[
  l('演练项目：客户回访流程。主方案草稿已有“先试点、再推广”两步；数据摘要尚未核对，主方案可以先按已确认内容整理。','Rehearsal project: a client follow-up workflow. The main draft has two stages, pilot then rollout. The data summary is unchecked; the proposal can be organized using confirmed information.'),
 ],
};
const unknowns:Record<VariantId,L>={
 'work-toast':l('你喝不喝、原因是什么，由你决定；报表范围、上线是否可行、谁接下后续任务均未确认。','Whether you drink and why are your choices. Report scope, launch feasibility and follow-up ownership are unconfirmed.'),
 'work-deadline':l('没有已批准的延期、复测通过结果或报表范围。你可以提出条件，不能把建议说成已获批准。','No delay, passed retest or report scope has been approved. You may propose conditions without treating them as accepted.'),
 'family-introduction':l('你的性别、感情状况与拒绝理由没有预设。看照片、加联系方式、见面分别由你决定。','Your gender, relationship status and reasons are unspecified. Seeing a photo, adding a contact and meeting are separate choices.'),
 'family-privacy':l('具体工作变动、工资与个人情况由你选择是否透露；家人的关心不是转述授权。','You choose whether to disclose the work change, pay or personal details. Family concern is not permission to share.'),
 'school-credit':l('贡献比例、提交次数和导师的决定未设定。文案如何修改、谁确认仍需协商。','Contribution percentages, commit counts and a supervisor’s decision are unspecified. Caption changes and approval still need agreement.'),
 'school-workload':l('各人的空闲时间、已经答应的分工都未知；你可以说明自己的时间与愿意接的部分。','Availability and accepted assignments are unknown. You can state your own time and the work you are willing to take.'),
 'elevator-privacy':l('HR 谈话内容不预设；没有已知的离职或调岗安排，你可以不公开私事。','The HR conversation is unspecified. No departure or transfer is established; you can keep personal matters private.'),
 'elevator-blame':l('账号权限、日志、交接完整性与事故原因均待核对。参与演示不代表你有过错或一定能独立查清。','Access, logs, handoff completeness and the cause are unchecked. Demo participation establishes neither fault nor the ability to investigate alone.'),
 'office-overtime':l('各人的时间、数据结论和三项任务的负责人未确认；愿意讨论不等于答应加班。','Availability, data conclusions and ownership of the three tasks are unconfirmed. Discussing work is not accepting overtime.'),
 'office-interruption':l('权限与数据未核验，何主管没有作决定。默认方案是演练起点，你可修改自己的提议，但不能替别人确认结果。','Access and data are unchecked; He has made no decision. The default is a rehearsal starting point. You may change your proposal without confirming results for others.'),
};
const movement:Record<string,L>={
 work:l('走近人物可以关注并选择回应对象；桌边的动作菜单可以举杯或换茶。在场的人都能听见，举杯不代表喝酒。','Approach a person to focus on and address them. The table’s action menu offers a toast or tea. Everyone can hear; raising a cup does not prove drinking.'),
 family:l('走近人物可以关注并选择回应对象；手机提议出现时，可接、拒绝或先问。在场的人都能听见，走近不产生私聊。','Approach a person to focus on and address them. When the phone is offered, accept, decline or ask first. Everyone can hear; proximity is not privacy.'),
 school:l('走近人物可关注并选择回应对象；查看文案、参与合照都不会自动确认贡献表述。','Approach a person to focus on and address them. Reading a caption or joining a photo does not approve the wording.'),
 elevator:l('可在等候区与轿厢之间移动、开关门、靠近人物。电梯停在本层；关门不代表私聊或逃离谈话。','Move between lobby and cabin, operate the doors and approach people. The lift stays on this floor; closing doors creates neither privacy nor an exit from the exchange.'),
 office:l('可走到白板旁查看资料、靠近人物、抬手请求发言。站到白板旁不会自动改方案，抬手也不代表别人已让出话轮。','Walk to the board to read the brief, approach people or raise a hand to request the floor. Approaching the board does not edit the proposal; a raised hand does not secure the floor.'),
};
export function publicSceneBrief(id:VariantId,version?:typeof BRIEF_VERSION){
 const evidence=tableEvidence[id];
 const unknown=id==='office-interruption'&&version!==BRIEF_VERSION?l('具体方案和风险由你说明；数据、权限和何主管的决定均未确认。','You supply your proposal and risk. Data, access and He’s decision are unconfirmed.'):unknowns[id];
 return {role:roles[id],aims:initialAims[id],lines:[...evidence.lines,...(version===BRIEF_VERSION?projects[id]??[]:[])],unknown,movement:movement[id.split('-')[0]],source:version===BRIEF_VERSION?fiction:evidence.source};
}
