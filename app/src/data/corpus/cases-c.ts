import { L } from "../taxonomy";
import type { Case } from "./types";
import { SOURCES } from "./sources";

/** Original teaching illustrations, not case reports or quotes from the sources. */
export const CASES_C: Case[] = [
  {
    id: "case-news-follow-up",
    title: L("示例：把话题留在朋友的好消息上", "Illustration: Staying With a Friend’s Good News"),
    source: SOURCES.goodNews,
    situation: L(
      "教学示例：朋友展览入选，小林正因自己的投稿落选而低落。",
      "Teaching illustration: A friend’s exhibition entry succeeds while Lin is disappointed by a rejection.",
    ),
    whatHappened: L(
      "小林承认自己今天情绪不高，但追问朋友最想展示哪幅作品。朋友仍有些拘谨，直到小林顺着画中细节继续问，才愿意多说。两人约定周末看展。",
      "Lin acknowledges a difficult mood, then asks which piece the friend most wants to show. The friend stays cautious until Lin follows up on a detail in the painting. They arrange a weekend visit.",
    ),
    takeaway: L(
      "这则示例练的是持续关注：表达自己的情绪后，仍把空间还给分享者。",
      "This illustration practises sustained interest: acknowledge your mood, then return space to the speaker.",
    ),
    competencies: ["social-awareness", "relationship-skills"],
    skills: ["empathy", "building-relationships"],
    context: "friendship",
    keywords: ["好消息", "展览", "祝贺", "good news", "celebration"],
  },
  {
    id: "case-budget-packages",
    title: L("示例：住近一点，还是少住一晚", "Illustration: A Closer Hotel or a Shorter Stay"),
    source: SOURCES.options,
    situation: L(
      "教学示例：两位朋友的旅行预算相差一倍，双方都不想直接取消。",
      "Teaching illustration: Two friends have very different travel budgets but do not want to cancel outright.",
    ),
    whatHappened: L(
      "预算较少的一方提出市区住两晚或海边住一晚，两套都在自己的上限内。朋友还想加一天，但比较后发现最在意的是日出，于是选一晚，并先算清交通费。",
      "One offers two nights in town or one by the sea, both within budget. The friend still wants an extra day, but comparison reveals sunrise matters most. They choose one night after checking travel costs.",
    ),
    takeaway: L(
      "这则示例中的方案同时覆盖时间、体验和花费；不是把同一个要求换两种说法。",
      "The packages in this illustration vary time, experience, and cost, rather than restating the same demand.",
    ),
    competencies: ["responsible-decision-making", "relationship-skills"],
    skills: ["problem-solving", "analyzing-consequences"],
    context: "friendship",
    keywords: ["预算", "旅行", "方案", "budget", "travel", "options"],
  },
  {
    id: "case-secret-repair",
    title: L("示例：先补救，不索要原谅", "Illustration: Repair Without Demanding Forgiveness"),
    source: SOURCES.apology,
    situation: L(
      "教学示例：阿宁未经允许把朋友的搬家计划告诉了别人。",
      "Teaching illustration: Ning shares a friend’s moving plans without permission.",
    ),
    whatHappened: L(
      "阿宁说清告诉了谁，承认没有先问，并询问是否可以私下要求对方停止转述。朋友同意这项处理，但说暂时不想聊天。阿宁接受边界，没有再发长消息求安慰。",
      "Ning names the recipient, owns not asking, and requests permission to ask that person to stop sharing. The friend agrees but wants space. Ning respects this instead of sending long messages seeking reassurance.",
    ),
    takeaway: L(
      "这则示例把成功放在承担责任和落实同意的补救上，而非让受伤的人马上恢复亲密。",
      "Success in this illustration means ownership and an agreed repair, not immediate restored closeness.",
    ),
    competencies: ["responsible-decision-making", "relationship-skills"],
    skills: ["reflecting-on-role", "ethical-responsibility"],
    context: "friendship",
    keywords: ["秘密", "道歉", "补救", "apology", "privacy", "repair"],
  },
  {
    id: "case-access-facts",
    title: L("示例：欢迎你之后，还要核实入口", "Illustration: Welcome Needs Verified Access"),
    source: SOURCES.access,
    situation: L(
      "教学示例：读书会主办人邀请一位使用轮椅的参与者，却只了解正门台阶。",
      "Teaching illustration: A reading-group host invites a wheelchair user but knows only about the front steps.",
    ),
    whatHappened: L(
      "参与者列出入口、通道和洗手间需要核实。主办人没有保证全部满足，而是约好第二天向场地确认并发照片。核实后发现洗手间不合适，双方讨论线上参与，对方保留选择。",
      "The participant identifies entry, route, and toilet questions. The host promises to check and send photos tomorrow, not that everything works. The toilet proves unsuitable; they discuss joining online, leaving the choice to the participant.",
    ),
    takeaway: L(
      "这则示例要求信息准确、及时，不能用热情替代可参与的条件。",
      "This illustration values accurate, timely information; enthusiasm does not replace access.",
    ),
    competencies: ["social-awareness", "responsible-decision-making"],
    skills: ["sense-of-belonging", "ethical-responsibility"],
    context: "party",
    keywords: ["无障碍", "核实", "活动", "accessibility", "venue", "participation"],
  },
  {
    id: "case-name-note",
    title: L("示例：请把这个读法记在名单旁", "Illustration: Put the Pronunciation Beside My Name"),
    source: SOURCES.identity,
    situation: L(
      "教学示例：成人课程老师为方便记忆，擅自给学生取了昵称。",
      "Teaching illustration: An adult-course teacher assigns a student a nickname for convenience.",
    ),
    whatHappened: L(
      "学生说明想使用全名，慢慢读了一遍。老师说自己记性不好，学生提议在名单旁标注读法。老师记下后复述；学生纠正一个音节，没有被要求解释名字背后的家庭经历。",
      "The student asks to use the full name and says it slowly. When the teacher cites poor memory, the student suggests a roster note. The teacher repeats it; the student corrects one syllable without explaining family history.",
    ),
    takeaway: L(
      "这则示例把尊重称呼落实为一个小动作；个人身份不是获得尊重前必须交出的说明材料。",
      "This illustration turns respectful address into a practical action, without making personal history a prerequisite.",
    ),
    competencies: ["self-awareness", "relationship-skills"],
    skills: ["social-cultural-identity", "cultural-competence", "standing-up"],
    context: "education",
    keywords: ["姓名", "称呼", "文化", "name", "pronunciation", "identity"],
  },
  {
    id: "case-room-rotation",
    title: L("示例：先约定公平是什么意思", "Illustration: Agree What Fair Allocation Means"),
    source: SOURCES.criteria,
    situation: L(
      "教学示例：社区棋友群和读书会争用每周五的活动室。",
      "Teaching illustration: A chess club and reading group both need the community room on Fridays.",
    ),
    whatHappened: L(
      "双方先列出每月必须全员到场的次数，再比较平均轮换和固定双周两种规则。棋友群担心临时反悔，于是共同写下取消期限，交管理员确认，尚未确认前保留原预约。",
      "They list required full-group meetings and compare rotating slots with fixed alternate weeks. The chess club worries about late changes, so they add a cancellation deadline and seek administrator approval without voiding existing bookings.",
    ),
    takeaway: L(
      "这则示例先讨论共同标准，再比较安排，并区分建议与已获得授权的决定。",
      "This illustration separates shared criteria, proposed arrangements, and authorized decisions.",
    ),
    competencies: ["responsible-decision-making", "relationship-skills"],
    skills: ["ethical-responsibility", "teamwork", "problem-solving"],
    context: "public",
    keywords: ["社区", "公平", "轮换", "community", "fairness", "criteria"],
  },
];
