import { L } from './taxonomy';
import type { VideoLesson } from './video-lessons';
import media from './social-science-media.json';

// Transcripts and timing come from the frozen H films. Quotes reference the film,
// not a learner. Source and limitation notes distinguish data, theory and fiction.
type ConceptContent = Omit<VideoLesson, 'video'> & { asset: keyof typeof media };
const CONTENT: ConceptContent[] = [
  {
    "asset": "transparency",
    "title": {
      "zh": "透明度错觉",
      "en": "The illusion of transparency"
    },
    "synopsis": {
      "zh": "声音在抖，就等于对面全看出来了吗？从一次演讲实验，分清感受与判断。",
      "en": "Does a shaky voice mean everyone can see your nerves? A speech experiment separates what you feel from what others perceive."
    },
    "skills": [
      "identifying-emotions",
      "examining-bias",
      "stress-management"
    ],
    "keywords": [
      "透明度错觉",
      "紧张",
      "演讲",
      "Gilovich",
      "Savitsky",
      "transparency",
      "anxiety",
      "speech"
    ],
    "source": {
      "label": {
        "zh": "Savitsky 与 Gilovich，2003",
        "en": "Savitsky & Gilovich, 2003"
      },
      "href": "https://doi.org/10.1016/S0022-1031(03)00056-8",
      "provenance": {
        "zh": "SocialCoach 原创科普动画，据《The illusion of transparency and the alleviation of speech anxiety》；片头办公室情境为虚构，H 旁白由 Breeze TTS 2 合成。",
        "en": "An original SocialCoach explainer based on The illusion of transparency and the alleviation of speech anxiety. The opening office situation is fictional. H narration is synthesized with Breeze TTS 2."
      }
    },
    "boundary": {
      "zh": "研究一是40名美国大学生的三分钟演讲，不能直接推广到所有人和所有对话。别人也会看出一些紧张。研究二的改善是当场测量，长期能否保持，作者没有下结论。片头的项目情境为原创虚构。",
      "en": "Study 1 involved 40 US college students giving three-minute speeches; it does not establish a rule for every person or conversation. Others did detect some anxiety. Study 2 measured an immediate improvement, with persistence over time unknown. The opening project scenario is original fiction."
    },
    "id": "video-transparency",
    "kind": "concept",
    "chapters": [
      {
        "at": 0.35,
        "title": {
          "zh": "心里的紧张",
          "en": "Feeling nervous"
        }
      },
      {
        "at": 14.597,
        "title": {
          "zh": "什么是透明度错觉",
          "en": "The transparency illusion"
        }
      },
      {
        "at": 21.437,
        "title": {
          "zh": "演讲实验",
          "en": "The speech experiment"
        }
      },
      {
        "at": 64.04,
        "title": {
          "zh": "研究的边界",
          "en": "Limits of the study"
        }
      }
    ],
    "transcript": [
      {
        "from": 0.35,
        "to": 3.631,
        "text": {
          "zh": "你把这句话，在心里默念了第五遍：",
          "en": "You have rehearsed this sentence in your head for the fifth time:"
        }
      },
      {
        "from": 4.081,
        "to": 7.034,
        "text": {
          "zh": "“组长，下个月那个项目，我想先不接。”",
          "en": "‘Team lead, I would rather not take on that project next month.’"
        }
      },
      {
        "from": 7.734,
        "to": 13.597,
        "text": {
          "zh": "终于说出口了。声音在抖，脸在发烫，你觉得对面全看出来了。",
          "en": "You finally say it. Your voice shakes, your face feels hot, and you think the other person sees it all."
        }
      },
      {
        "from": 14.597,
        "to": 20.337,
        "text": {
          "zh": "社会心理学管这叫“透明度错觉”：人往往高估，别人能看穿自己内心的程度。",
          "en": "Social psychologists call this the illusion of transparency: we tend to overestimate how well others can read our inner state."
        }
      },
      {
        "from": 21.437,
        "to": 26.747,
        "text": {
          "zh": "2003年有个实验：大学生两两一组，轮流上台，临时讲三分钟。",
          "en": "In a 2003 experiment, college students worked in pairs and took turns giving an impromptu three-minute speech."
        }
      },
      {
        "from": 27.147,
        "to": 32.141,
        "text": {
          "zh": "讲完一问，多数人觉得，自己比搭档显得更紧张。",
          "en": "Afterward, most thought they had looked more nervous than their partner."
        }
      },
      {
        "from": 32.541,
        "to": 36.124,
        "text": {
          "zh": "可在搭档眼里，他们平均没自己以为的那么紧张。",
          "en": "But their partners, on average, saw less nervousness than they expected."
        }
      },
      {
        "from": 36.874,
        "to": 44.066,
        "text": {
          "zh": "研究者的解释是：你拿心里的紧张当起点，去猜别人看到多少，再往回调整，可总是调整得不够。",
          "en": "The researchers’ explanation is that you start from the nerves you feel, then adjust your guess about what others see—but not enough."
        }
      },
      {
        "from": 44.716,
        "to": 49.393,
        "text": {
          "zh": "这不是说紧张藏得住。搭档也看出了一些，只是没那么多。",
          "en": "That does not mean nervousness stays hidden. Their partners noticed some of it, just less than they thought."
        }
      },
      {
        "from": 50.143,
        "to": 58.597,
        "text": {
          "zh": "同一篇论文还发现：开讲前先听人讲过这个错觉的人，旁观者觉得他们更从容，讲得也更好；",
          "en": "The same paper found that observers rated speakers who had learned about this illusion beforehand as more composed and effective."
        }
      },
      {
        "from": 58.947,
        "to": 63.49,
        "text": {
          "zh": "只被安慰一句“别在意别人怎么看”的，没有这个效果。",
          "en": "Simply telling speakers not to worry about what others thought did not have that effect."
        }
      },
      {
        "from": 64.04,
        "to": 68.392,
        "text": {
          "zh": "不过这是实验室里当场测的，能持续多久，作者也说还不知道。",
          "en": "But this was measured immediately in a lab. The authors said they did not know how long it would last."
        }
      },
      {
        "from": 69.242,
        "to": 72.929,
        "text": {
          "zh": "所以下回声音一抖，先别认定对面全看见了。",
          "en": "So the next time your voice shakes, do not immediately assume the other person sees it all."
        }
      },
      {
        "from": 73.529,
        "to": 79.22,
        "text": {
          "zh": "你会直接说一句“我有点紧张”，还是装作没事，硬着头皮说完？评论区说说。",
          "en": "Would you say, ‘I’m a little nervous,’ or carry on and act as though nothing happened? Share your thoughts."
        }
      },
      {
        "from": 80.32,
        "to": 81.602,
        "text": {
          "zh": "想说的话，说出来。",
          "en": "Say the thing you have been not saying."
        }
      }
    ],
    "takeaways": [
      {
        "at": 14.597,
        "title": {
          "zh": "区分感觉和判断",
          "en": "Separate feeling from inference"
        },
        "quote": {
          "zh": "社会心理学管这叫“透明度错觉”：人往往高估，别人能看穿自己内心的程度。",
          "en": "Social psychologists call this the illusion of transparency: we tend to overestimate how well others can read our inner state."
        },
        "explanation": {
          "zh": "错觉指高估别人看穿内心的程度，不是说紧张本身是假的。",
          "en": "The illusion is overestimating how clearly others can read you, not imagining the anxiety itself."
        }
      },
      {
        "at": 32.541,
        "title": {
          "zh": "看研究实际比较了什么",
          "en": "Notice the actual comparison"
        },
        "quote": {
          "zh": "可在搭档眼里，他们平均没自己以为的那么紧张。",
          "en": "But their partners, on average, saw less nervousness than they expected."
        },
        "explanation": {
          "zh": "研究一比较本人估计和搭档评分，平均存在差距；并没有证明别人完全看不出。",
          "en": "Study 1 compared self-estimates with partners’ ratings and found an average gap. It did not show that anxiety was invisible."
        }
      },
      {
        "at": 64.04,
        "title": {
          "zh": "即时效果不等于长期改变",
          "en": "An immediate effect is not a lasting one"
        },
        "quote": {
          "zh": "不过这是实验室里当场测的，能持续多久，作者也说还不知道。",
          "en": "But this was measured immediately in a lab. The authors said they did not know how long it would last."
        },
        "explanation": {
          "zh": "同篇论文的干预实验测的是当场演讲表现，不能据此承诺长期改善。",
          "en": "The intervention in the same paper measured immediate speech performance, not guaranteed long-term improvement."
        }
      }
    ]
  },
  {
    "asset": "weak-ties",
    "title": {
      "zh": "弱关系的力量",
      "en": "The strength of weak ties"
    },
    "synopsis": {
      "zh": "好久没联系的人，为什么会带来新消息？看关系怎样连接不同圈子。",
      "en": "Why might someone you rarely see bring you new information? See how relationships connect different circles."
    },
    "skills": [
      "building-relationships",
      "perspective-taking",
      "examining-bias"
    ],
    "keywords": [
      "弱关系",
      "格兰诺维特",
      "求职",
      "社会网络",
      "Granovetter",
      "weak ties",
      "networks",
      "jobs"
    ],
    "source": {
      "label": {
        "zh": "Granovetter，1973",
        "en": "Granovetter, 1973"
      },
      "href": "https://www.cs.cmu.edu/~jure/pub/papers/granovetter73ties.pdf",
      "provenance": {
        "zh": "SocialCoach 原创科普动画，据《The Strength of Weak Ties》，尤其 p.1371 与脚注16、18。找工作的开场为原创虚构。H 旁白由 Breeze TTS 2 合成。",
        "en": "An original SocialCoach explainer based on The Strength of Weak Ties, especially p.1371 and footnotes 16 and 18. The opening job-search story is fictional. H narration is synthesized with Breeze TTS 2."
      }
    },
    "boundary": {
      "zh": "282人的总样本中，随机抽出100人面访；片中54人只是其中通过熟人找到工作、回答见面频率问题的分析子样本。它是特定美国郊区的访谈关联，不是因果实验。弱关系未必是桥；文中的桥结论依赖网络假设。",
      "en": "From a total sample of 282, 100 were randomly selected for interviews. The 54 shown here are the subset who found work through contacts and answered the meeting-frequency question. This is an interview association in one US suburb, not a causal experiment. Weak ties are not necessarily bridges; the bridge argument depends on the paper’s network assumptions."
    },
    "id": "video-weak-ties",
    "kind": "concept",
    "chapters": [
      {
        "at": 0.35,
        "title": {
          "zh": "久未联系的人",
          "en": "A distant contact"
        }
      },
      {
        "at": 16.559,
        "title": {
          "zh": "弱关系是什么",
          "en": "What weak ties mean"
        }
      },
      {
        "at": 26.608,
        "title": {
          "zh": "54人的访谈子样本",
          "en": "The 54-person subset"
        }
      },
      {
        "at": 51.567,
        "title": {
          "zh": "关联和局限",
          "en": "Association and limits"
        }
      }
    ],
    "transcript": [
      {
        "from": 0.35,
        "to": 4.318,
        "text": {
          "zh": "找工作的第二个月，你投了四十份简历，一封回音都没有。",
          "en": "In your second month of job hunting, you have sent forty applications without a single reply."
        }
      },
      {
        "from": 4.818,
        "to": 11.487,
        "text": {
          "zh": "最后帮上忙的，是三年没说过话的大学室友，随手转来一句：“我们组在招人。”",
          "en": "The person who finally helps is a college roommate you have not spoken to for three years: ‘Our team is hiring.’"
        }
      },
      {
        "from": 12.287,
        "to": 15.659,
        "text": {
          "zh": "天天一起吃饭的好朋友，反而没帮上。为什么？",
          "en": "The close friend you eat with every day could not help. Why?"
        }
      },
      {
        "from": 16.559,
        "to": 20.609,
        "text": {
          "zh": "社会学家格兰诺维特，管这叫“弱关系的力量”。",
          "en": "Sociologist Mark Granovetter called this the strength of weak ties."
        }
      },
      {
        "from": 21.509,
        "to": 26.208,
        "text": {
          "zh": "他访谈过美国波士顿郊区，一批刚换工作的白领。",
          "en": "He interviewed a group of people in professional, technical and managerial jobs who had recently changed jobs in a Boston suburb."
        }
      },
      {
        "from": 26.608,
        "to": 32.009,
        "text": {
          "zh": "靠熟人介绍找到工作的五十四个人里，和那位介绍人“经常见面”的，不到两成。",
          "en": "Among the 54 who found work through a contact, fewer than one in five saw that contact frequently."
        }
      },
      {
        "from": 32.359,
        "to": 36.93,
        "text": {
          "zh": "大多数只是偶尔见，还有将近三成，一年最多见一次。",
          "en": "Most saw them occasionally, and nearly three in ten saw them at most once a year."
        }
      },
      {
        "from": 37.73,
        "to": 44.015,
        "text": {
          "zh": "他的解释是：好朋友之间，认识的人差不多，听到的消息也差不多。",
          "en": "His explanation was that close friends tend to know similar people and hear similar information."
        }
      },
      {
        "from": 44.415,
        "to": 50.767,
        "text": {
          "zh": "关系浅的人，站在另一个圈子里，像一座桥，能把圈外的消息递过来。",
          "en": "A weaker connection belongs to another circle and can act like a bridge, bringing information from outside yours."
        }
      },
      {
        "from": 51.567,
        "to": 57.68,
        "text": {
          "zh": "当然，这是半个世纪前的小样本，而且是访谈里的关联，不是实验。",
          "en": "Of course, this is a small sample from half a century ago, showing an interview association, not an experiment."
        }
      },
      {
        "from": 58.08,
        "to": 65.346,
        "text": {
          "zh": "作者自己也提过一个质疑：人本来就是泛泛之交多，这个比例能说明多少，他在文中也没有下定论。",
          "en": "The author himself raised an objection: people have more acquaintances to begin with, so what does this proportion establish? He left that unsettled here."
        }
      },
      {
        "from": 66.046,
        "to": 73.954,
        "text": {
          "zh": "所以别把它听成“熟人比朋友有用”。好朋友也许更愿意帮你，弱关系更可能知道你不知道的事。",
          "en": "So do not read this as saying acquaintances are more useful than friends. Close friends may be more willing to help; weaker ties may know something you do not."
        }
      },
      {
        "from": 74.854,
        "to": 83.531,
        "text": {
          "zh": "你上一条真正改变计划的消息，是谁告诉你的？好朋友，还是好久没联系的人？评论区说说。",
          "en": "Who brought you the last piece of news that really changed your plans—a close friend, or someone you had not contacted in a long time?"
        }
      },
      {
        "from": 84.531,
        "to": 86.366,
        "text": {
          "zh": "好久不见，也可以打个招呼。",
          "en": "You can say hello, even after a long time."
        }
      }
    ],
    "takeaways": [
      {
        "at": 26.608,
        "title": {
          "zh": "54人不是整个研究",
          "en": "54 is not the whole study"
        },
        "quote": {
          "zh": "靠熟人介绍找到工作的五十四个人里，和那位介绍人“经常见面”的，不到两成。",
          "en": "Among the 54 who found work through a contact, fewer than one in five saw that contact frequently."
        },
        "explanation": {
          "zh": "见面频率的问题只问了面访者。经常、偶尔、很少的比例是16.7%、55.6%、27.8%。",
          "en": "Only interviewees were asked about meeting frequency. Frequent, occasional and rare contact accounted for 16.7%, 55.6% and 27.8%."
        }
      },
      {
        "at": 44.415,
        "title": {
          "zh": "连接圈子的理论解释",
          "en": "The network explanation"
        },
        "quote": {
          "zh": "关系浅的人，站在另一个圈子里，像一座桥，能把圈外的消息递过来。",
          "en": "A weaker connection belongs to another circle and can act like a bridge, bringing information from outside yours."
        },
        "explanation": {
          "zh": "跨圈子的信息是作者的理论论证，不是这54人的比例单独证明的；关系浅也不自动构成桥。",
          "en": "Information crossing social circles is the paper’s theoretical argument, not something the percentages alone establish. A weak tie is not automatically a bridge."
        }
      },
      {
        "at": 58.08,
        "title": {
          "zh": "保留作者自己的质疑",
          "en": "Keep the author’s own caveat"
        },
        "quote": {
          "zh": "作者自己也提过一个质疑：人本来就是泛泛之交多，这个比例能说明多少，他在文中也没有下定论。",
          "en": "The author himself raised an objection: people have more acquaintances to begin with, so what does this proportion establish? He left that unsettled here."
        },
        "explanation": {
          "zh": "泛泛之交本来就多，是作者在脚注18提出的基线问题。这篇文章没有给它定论。",
          "en": "Footnote 18 raises the baseline objection that people may simply have more acquaintances. This article does not settle it."
        }
      }
    ]
  },
  {
    "asset": "front-back-stage",
    "title": {
      "zh": "前台与后台",
      "en": "Front stage and backstage"
    },
    "synopsis": {
      "zh": "领导一走，茶水间又热闹了。用舞台剖面看看戈夫曼说的前台与后台。",
      "en": "The boss leaves and the break room comes alive. A stage cutaway explores Goffman’s front and back regions."
    },
    "skills": [
      "social-norms",
      "reflecting-on-role",
      "perspective-taking"
    ],
    "keywords": [
      "前台",
      "后台",
      "戈夫曼",
      "拟剧论",
      "Goffman",
      "backstage",
      "front stage",
      "dramaturgy"
    ],
    "source": {
      "label": {
        "zh": "戈夫曼，1959",
        "en": "Goffman, 1959"
      },
      "href": "https://www.people.iup.edu/sherwood/Courses/ENGL480S06/Documents/goffman-front_and_back_regions.pdf",
      "provenance": {
        "zh": "SocialCoach 原创科普动画。据《日常生活中的自我呈现》第三章读本节选，重印pp.50–57；办公室为原创虚构，船厂和旅馆据书中描写作示意。H 旁白由 Breeze TTS 2 合成。",
        "en": "An original SocialCoach explainer based on a chapter-three reader excerpt of The Presentation of Self in Everyday Life, reprint pp.50–57. The office is fictional; the shipyard and hotel illustrate the book’s accounts. H narration is synthesized with Breeze TTS 2."
      }
    },
    "boundary": {
      "zh": "材料是二十世纪中叶的少数个案与转引记录，不是实验或统计规律。“表演”是分析比喻，不等于虚伪；后台相对某场表演而言，也不等于真实的自我。茶水间可以是另一场表演的前台，是本片从定义作的推论。",
      "en": "These are a few mid-twentieth-century cases and quoted accounts, not experiments or statistical laws. Performance is an analytical metaphor, not a judgment of hypocrisy. Backstage is relative to a particular performance, not the true self. The break room becoming another front region is this film’s inference from the definition."
    },
    "id": "video-front-back-stage",
    "kind": "concept",
    "chapters": [
      {
        "at": 0.35,
        "title": {
          "zh": "领导走过来了",
          "en": "The boss approaches"
        }
      },
      {
        "at": 12.706,
        "title": {
          "zh": "前台与后台",
          "en": "Front and back regions"
        }
      },
      {
        "at": 37.148,
        "title": {
          "zh": "船厂与旅馆",
          "en": "The shipyard and hotel"
        }
      },
      {
        "at": 73.516,
        "title": {
          "zh": "相对某一场表演",
          "en": "Relative to a performance"
        }
      }
    ],
    "transcript": [
      {
        "from": 0.35,
        "to": 3.288,
        "text": {
          "zh": "下午三点，领导从走廊那头走过来。",
          "en": "At three in the afternoon, the boss approaches from the other end of the corridor."
        }
      },
      {
        "from": 3.788,
        "to": 7.055,
        "text": {
          "zh": "一整排屏幕，同时切回了表格。",
          "en": "A whole row of screens switches back to spreadsheets at once."
        }
      },
      {
        "from": 7.555,
        "to": 11.806,
        "text": {
          "zh": "等他进了电梯，有人伸了个懒腰，茶水间又热闹起来。",
          "en": "Once the boss enters the elevator, someone stretches and the break room comes alive again."
        }
      },
      {
        "from": 12.706,
        "to": 16.924,
        "text": {
          "zh": "社会学家戈夫曼，管这叫“前台”和“后台”。",
          "en": "Sociologist Erving Goffman called these front and back regions."
        }
      },
      {
        "from": 17.424,
        "to": 24.98,
        "text": {
          "zh": "他在1959年的书里写：人在别人面前，会把一部分事放大，把可能拆台的那部分压下去。",
          "en": "In his 1959 book, he wrote that in front of others, we highlight some things and suppress what might undermine the impression."
        }
      },
      {
        "from": 25.48,
        "to": 30.73,
        "text": {
          "zh": "放大的，出现在前台；压下去的，就在后台露面。",
          "en": "What is highlighted appears front stage; what is suppressed emerges backstage."
        }
      },
      {
        "from": 31.23,
        "to": 36.248,
        "text": {
          "zh": "在后台，人可以放松，卸下门面，不用再念台词。",
          "en": "Backstage, performers can relax, drop their front and stop reciting their lines."
        }
      },
      {
        "from": 37.148,
        "to": 44.356,
        "text": {
          "zh": "他引过一份船厂的记录：听说工头要来，工人赶紧找事做，一颗早就拧紧的螺栓，又被拧了一遍。",
          "en": "He quoted a shipyard account: hearing the foreman was coming, workers found things to do—even tightening an already-tight bolt again."
        }
      },
      {
        "from": 45.256,
        "to": 49.178,
        "text": {
          "zh": "他还仔细写过苏格兰设得兰岛上，一家旅馆的厨房。",
          "en": "He also described the kitchen of a hotel in Scotland’s Shetland Islands in detail."
        }
      },
      {
        "from": 49.678,
        "to": 55.213,
        "text": {
          "zh": "客人用过、压变了形的黄油，在厨房里重新搓好，再端出去。",
          "en": "Butter guests had used and pressed out of shape was reshaped in the kitchen and served again."
        }
      },
      {
        "from": 55.713,
        "to": 65.653,
        "text": {
          "zh": "女服务员想让厨房门开着，好端盘子；经理想关上，免得客人看见里面。几乎没有哪天，这扇门不被摔上又推开。",
          "en": "The waitresses wanted the kitchen door open to carry plates; the manager wanted it shut to hide the kitchen. Almost every day, it was slammed shut and pushed open again."
        }
      },
      {
        "from": 66.553,
        "to": 73.016,
        "text": {
          "zh": "要说明的是，这是七十多年前一家旅馆的观察，不是实验，也没有统计数据。",
          "en": "Remember, this is an observation of one hotel over seventy years ago, not an experiment, with no statistical data."
        }
      },
      {
        "from": 73.516,
        "to": 77.667,
        "text": {
          "zh": "他也没把后台说成“真实的你”。后台是相对某一场表演来说的。",
          "en": "He did not define backstage as the real you. It is backstage relative to a particular performance."
        }
      },
      {
        "from": 78.167,
        "to": 83.249,
        "text": {
          "zh": "按这个定义，换个场合，茶水间也可能是另一场表演的前台。",
          "en": "By that definition, in another setting the break room could be the front stage of another performance."
        }
      },
      {
        "from": 84.149,
        "to": 86.491,
        "text": {
          "zh": "你的后台在哪里？评论区说说。",
          "en": "Where is your backstage? Share your thoughts."
        }
      },
      {
        "from": 86.991,
        "to": 88.859,
        "text": {
          "zh": "给自己，留一块后台。",
          "en": "Leave yourself a little backstage space."
        }
      }
    ],
    "takeaways": [
      {
        "at": 17.424,
        "title": {
          "zh": "谁在看，改变了呈现",
          "en": "The audience shapes the presentation"
        },
        "quote": {
          "zh": "他在1959年的书里写：人在别人面前，会把一部分事放大，把可能拆台的那部分压下去。",
          "en": "In his 1959 book, he wrote that in front of others, we highlight some things and suppress what might undermine the impression."
        },
        "explanation": {
          "zh": "据节选重印p.53，表演突出一部分、压下一部分；这是理解互动的框架。",
          "en": "On reader p.53, a performance highlights some aspects and suppresses others. This is a framework for understanding interaction."
        }
      },
      {
        "at": 55.713,
        "title": {
          "zh": "一扇门，也在划分区域",
          "en": "A door separates regions"
        },
        "quote": {
          "zh": "女服务员想让厨房门开着，好端盘子；经理想关上，免得客人看见里面。几乎没有哪天，这扇门不被摔上又推开。",
          "en": "The waitresses wanted the kitchen door open to carry plates; the manager wanted it shut to hide the kitchen. Almost every day, it was slammed shut and pushed open again."
        },
        "explanation": {
          "zh": "厨房门的争执来自书中设得兰旅馆的描写（重印p.56），画面是示意，不是今天旅馆的调查。",
          "en": "The kitchen-door dispute comes from the book’s Shetland hotel account, reader p.56. The animation illustrates that account; it is not a survey of hotels today."
        }
      },
      {
        "at": 73.516,
        "title": {
          "zh": "后台不等于真实的你",
          "en": "Backstage is not the true self"
        },
        "quote": {
          "zh": "他也没把后台说成“真实的你”。后台是相对某一场表演来说的。",
          "en": "He did not define backstage as the real you. It is backstage relative to a particular performance."
        },
        "explanation": {
          "zh": "区域相对某一场表演定义。换一组观众，同一地方也可能成为前台。",
          "en": "The region is defined relative to a performance. With a different audience, the same place can become a front region."
        }
      }
    ]
  },
  {
    "asset": "self-fulfilling-prophecy",
    "title": {
      "zh": "自我实现的预言",
      "en": "Self-fulfilling prophecy"
    },
    "synopsis": {
      "zh": "一家银行为什么会被传言“说倒”？从默顿编的故事，看判断、行动和制度怎样连在一起。",
      "en": "How can a rumor help bring a bank down? Merton’s invented story connects beliefs, actions and institutions."
    },
    "skills": [
      "examining-bias",
      "analyzing-consequences",
      "social-norms"
    ],
    "keywords": [
      "自我实现的预言",
      "默顿",
      "制度",
      "偏见",
      "Merton",
      "self-fulfilling",
      "prophecy",
      "institutions"
    ],
    "source": {
      "label": {
        "zh": "默顿，1948",
        "en": "Merton, 1948"
      },
      "href": "https://entrepreneurscommunicate.pbworks.com/f/Merton.%2BSelf%2BFulfilling%2BProfecy.pdf",
      "provenance": {
        "zh": "SocialCoach 原创科普动画，据《The Self-Fulfilling Prophecy》，《The Antioch Review》8(2)，193–210。银行是默顿编的故事；数字引用其文章，非本片新研究。H 旁白由 Breeze TTS 2 合成。",
        "en": "An original SocialCoach explainer based on The Self-Fulfilling Prophecy, The Antioch Review 8(2), 193–210. The bank is Merton’s invented story. Figures are cited from his essay, not new research. H narration is synthesized with Breeze TTS 2."
      }
    },
    "boundary": {
      "zh": "“最后国民银行”是默顿的寓言，不是真实银行案例。文章是理论论述，635、2,276和28是作者用来比较的年均停业数字，文中没有注明底层数据来源；不能据此前后比较识别存款保险单独的因果效果。“制度拿掉恐慌理由”是默顿的解释。",
      "en": "The Last National Bank is Merton’s parable, not a real bank case. This is a theoretical essay. Its annual suspension figures—635, 2,276 and 28—have no underlying data citation in the essay. The before-and-after comparison does not identify the separate causal effect of deposit insurance. Removing the reason for panic is Merton’s interpretation."
    },
    "id": "video-self-fulfilling-prophecy",
    "kind": "concept",
    "chapters": [
      {
        "at": 0.35,
        "title": {
          "zh": "默顿编的银行故事",
          "en": "Merton’s invented bank"
        }
      },
      {
        "at": 21.229,
        "title": {
          "zh": "判断怎样成真",
          "en": "How a belief becomes true"
        }
      },
      {
        "at": 37.251,
        "title": {
          "zh": "排斥的循环",
          "en": "The exclusion cycle"
        }
      },
      {
        "at": 53.754,
        "title": {
          "zh": "制度与历史数字",
          "en": "Institutions and historical figures"
        }
      }
    ],
    "transcript": [
      {
        "from": 0.35,
        "to": 4.534,
        "text": {
          "zh": "一九三二年的一个星期三，一家银行门口突然排起长队。",
          "en": "On a Wednesday in 1932, a long line suddenly forms outside a bank."
        }
      },
      {
        "from": 5.034,
        "to": 8.237,
        "text": {
          "zh": "行长有点纳闷：银行的家底明明还算稳当。",
          "en": "The bank manager is puzzled: the bank’s finances still seem sound."
        }
      },
      {
        "from": 8.737,
        "to": 12.498,
        "text": {
          "zh": "可传言说它要倒了。信的人越多，取钱的队越长。",
          "en": "But a rumor says it will fail. The more people believe it, the longer the withdrawal queue grows."
        }
      },
      {
        "from": 12.998,
        "to": 15.149,
        "text": {
          "zh": "到了星期四，它真的倒了。",
          "en": "By Thursday, it really has failed."
        }
      },
      {
        "from": 16.049,
        "to": 20.729,
        "text": {
          "zh": "这家“最后国民银行”，是社会学家默顿1948年编的一个故事。",
          "en": "This Last National Bank is a story sociologist Robert Merton invented in 1948."
        }
      },
      {
        "from": 21.229,
        "to": 25.106,
        "text": {
          "zh": "他用它讲一个概念：自我实现的预言。",
          "en": "He used it to explain a concept: the self-fulfilling prophecy."
        }
      },
      {
        "from": 26.006,
        "to": 31.564,
        "text": {
          "zh": "一个本来错误的判断，引出了新的行动，最后让自己成了真。",
          "en": "An initially false belief brings about new actions that eventually make it true."
        }
      },
      {
        "from": 32.064,
        "to": 36.351,
        "text": {
          "zh": "比如认定自己会挂科的学生，光顾着担心，最后真考砸了。",
          "en": "For example, a student convinced of failing an exam becomes so preoccupied with worry that they actually fail."
        }
      },
      {
        "from": 37.251,
        "to": 47.769,
        "text": {
          "zh": "默顿最想讲的是美国的种族偏见：工会把黑人工人挡在门外，他们只好去罢工的厂里顶班，这又成了不收他们的理由。",
          "en": "Merton’s main concern was racial prejudice in the US: unions excluded Black workers, who then filled jobs during strikes, reinforcing the excuse for excluding them."
        }
      },
      {
        "from": 48.669,
        "to": 53.254,
        "text": {
          "zh": "怎么打破？他不太指望劝说和宣传，更看重制度。",
          "en": "How can the cycle be broken? He placed less hope in persuasion and propaganda, and more in institutions."
        }
      },
      {
        "from": 53.754,
        "to": 58.833,
        "text": {
          "zh": "二十年代，美国平均每年六百多家银行停业；大萧条前后，每年两千多家。",
          "en": "In the 1920s, over six hundred US banks suspended operations each year on average; around the Great Depression, over two thousand did."
        }
      },
      {
        "from": 59.333,
        "to": 64.552,
        "text": {
          "zh": "有了存款保险等银行立法后的十二年，平均每年二十八家。",
          "en": "In the twelve years after deposit insurance and other banking legislation, the annual average was twenty-eight."
        }
      },
      {
        "from": 65.052,
        "to": 69.818,
        "text": {
          "zh": "他的意思是，储户不再挤兑，是因为制度拿掉了恐慌的理由。",
          "en": "His point was that depositors stopped rushing to withdraw because institutions removed their reason for panic."
        }
      },
      {
        "from": 70.718,
        "to": 77.13,
        "text": {
          "zh": "不过这是一篇论述，数字只用来说明观点；他自己也说，恐慌未必就此根除。",
          "en": "But this is an essay using figures to illustrate an argument. He also said panic might not have been fully eliminated."
        }
      },
      {
        "from": 78.03,
        "to": 83.565,
        "text": {
          "zh": "你见过哪件事，是大家都信它会发生，它才真的发生了？评论区说说。",
          "en": "Have you seen something happen because everyone believed it would? Share your thoughts."
        }
      },
      {
        "from": 84.065,
        "to": 85.894,
        "text": {
          "zh": "信什么，也会改变什么。",
          "en": "What people believe can also change what happens."
        }
      }
    ],
    "takeaways": [
      {
        "at": 16.049,
        "title": {
          "zh": "先辨认故事与事实",
          "en": "Distinguish a story from a real case"
        },
        "quote": {
          "zh": "这家“最后国民银行”，是社会学家默顿1948年编的一个故事。",
          "en": "This Last National Bank is a story sociologist Robert Merton invented in 1948."
        },
        "explanation": {
          "zh": "原文在p.195称其为社会学寓言；动画从开头注明这是默顿编的故事。",
          "en": "On p.195 the author calls it a sociological parable. The film labels it as his invented story from the opening."
        }
      },
      {
        "at": 26.006,
        "title": {
          "zh": "行动是循环中的一环",
          "en": "Actions are part of the loop"
        },
        "quote": {
          "zh": "一个本来错误的判断，引出了新的行动，最后让自己成了真。",
          "en": "An initially false belief brings about new actions that eventually make it true."
        },
        "explanation": {
          "zh": "概念说的是错误判断引出行动，行动又改变情境；不是单靠相信就能实现愿望。",
          "en": "The concept describes a false definition prompting actions that change the situation. Belief alone does not make a wish come true."
        }
      },
      {
        "at": 65.052,
        "title": {
          "zh": "保留作者归因与证据边界",
          "en": "Keep the interpretation and evidence distinct"
        },
        "quote": {
          "zh": "他的意思是，储户不再挤兑，是因为制度拿掉了恐慌的理由。",
          "en": "His point was that depositors stopped rushing to withdraw because institutions removed their reason for panic."
        },
        "explanation": {
          "zh": "“他的意思是”指默顿的制度解释。文章没有用实验或控制比较验证存款保险的独立效果。",
          "en": "‘His point’ identifies Merton’s institutional interpretation. The essay does not experimentally or through a controlled comparison test the separate effect of deposit insurance."
        }
      }
    ]
  },
  {
    "asset": "schelling-neighbors",
    "title": {
      "zh": "一点偏好，一片分隔",
      "en": "Small preferences, large divisions"
    },
    "synopsis": {
      "zh": "只想有一半邻居和自己相似，为什么会越来越分开？跟着谢林的一次棋盘推演，看个体偏好如何累积。",
      "en": "Why might wanting just half your neighbors to be similar lead to separation? Follow one of Schelling’s checkerboard exercises."
    },
    "skills": [
      "examining-bias",
      "analyzing-consequences",
      "perspective-taking"
    ],
    "keywords": [
      "谢林",
      "隔离模型",
      "社会学",
      "棋盘",
      "Schelling",
      "segregation",
      "neighbors",
      "preferences"
    ],
    "source": {
      "label": {
        "zh": "谢林，1971",
        "en": "Schelling, 1971"
      },
      "href": "https://www.stat.berkeley.edu/~aldous/157/Papers/Schelling_Seg_Models.pdf",
      "provenance": {
        "zh": "SocialCoach 原创科普动画，据《Dynamic Models of Segregation》，143–186页。原文数字取自Figure 9；运动棋盘是另行编程的规则示意，非原图复刻。办公室开场为虚构。H 旁白由 Breeze TTS 2 合成。",
        "en": "An original SocialCoach explainer based on Dynamic Models of Segregation, pp.143–186. Reported figures come from Figure 9. The moving board is a separate coded illustration of the rules, not a reproduction. The office opening is fictional. H narration is synthesized with Breeze TTS 2."
      }
    },
    "boundary": {
      "zh": "这是人工棋盘模型，不是真实居民调查。五分之四、一成到四成来自Figure 9那一次推演；移动顺序和条件会改变结果。片中动态棋盘是自制示意，不能拿它冒充原文数字。现实隔离还涉及排斥、收入等因素，宏观格局也不能直接说明每个人的动机。",
      "en": "This is an artificial checkerboard model, not a survey of residents. The four-fifths and roughly 10%-to-40% figures refer to the Figure 9 exercise; move order and assumptions affect outcomes. The moving board is our own illustration, not the source of those reported figures. Real segregation also involves exclusion and income, and aggregate patterns do not directly reveal each individual’s motives."
    },
    "id": "video-schelling-neighbors",
    "kind": "concept",
    "chapters": [
      {
        "at": 0.35,
        "title": {
          "zh": "工位为什么分开",
          "en": "Separated desks"
        }
      },
      {
        "at": 13.514,
        "title": {
          "zh": "谢林的棋盘",
          "en": "Schelling’s board"
        }
      },
      {
        "at": 27.614,
        "title": {
          "zh": "移动与连锁反应",
          "en": "Moving and cascading"
        }
      },
      {
        "at": 51.19,
        "title": {
          "zh": "模型的边界",
          "en": "Limits of the model"
        }
      }
    ],
    "transcript": [
      {
        "from": 0.35,
        "to": 2.429,
        "text": {
          "zh": "公司搬进新楼，工位随便坐。",
          "en": "The company moves to a new building, with everyone free to choose a desk."
        }
      },
      {
        "from": 2.929,
        "to": 6.877,
        "text": {
          "zh": "每个人只有一个小要求：身边至少一半是自己部门的人。",
          "en": "Each person has just one small preference: at least half the people nearby should be in their department."
        }
      },
      {
        "from": 7.377,
        "to": 10.363,
        "text": {
          "zh": "一个月后，整层楼分成了两块。",
          "en": "A month later, the whole floor has split into two sections."
        }
      },
      {
        "from": 10.863,
        "to": 12.614,
        "text": {
          "zh": "可没有谁想要这样的结果。",
          "en": "Yet nobody had wanted that outcome."
        }
      },
      {
        "from": 13.514,
        "to": 17.466,
        "text": {
          "zh": "经济学家谢林，1971年用一块棋盘推演过这件事。",
          "en": "In 1971, economist Thomas Schelling explored this kind of process on a checkerboard."
        }
      },
      {
        "from": 18.366,
        "to": 23.138,
        "text": {
          "zh": "两种棋子数量相同，随机撒在格子里，留些空格。",
          "en": "Equal numbers of two types of tokens are placed randomly, with some spaces left empty."
        }
      },
      {
        "from": 23.638,
        "to": 27.114,
        "text": {
          "zh": "一开始，每颗棋子身边，同类大约占一半。",
          "en": "At the start, roughly half of each token’s neighbors are the same type."
        }
      },
      {
        "from": 27.614,
        "to": 32.435,
        "text": {
          "zh": "规则只有一条：身边同类不到一半，就搬到最近的满意空格。",
          "en": "There is one rule: if fewer than half your neighbors are the same type, move to the nearest satisfactory vacancy."
        }
      },
      {
        "from": 32.935,
        "to": 36.788,
        "text": {
          "zh": "有人搬走，别人又不满意了；一轮轮搬下去，直到人人满意。",
          "en": "One move leaves someone else dissatisfied. Moves continue round after round until everyone is satisfied."
        }
      },
      {
        "from": 37.688,
        "to": 44.88,
        "text": {
          "zh": "在其中一次推演里，身边同类变成了五分之四以上；周围一个异类都没有的，从一成左右涨到四成左右。",
          "en": "In one exercise, the proportion of same-type neighbors rose above four-fifths. Tokens with no unlike neighbors rose from roughly one in ten to four in ten."
        }
      },
      {
        "from": 45.38,
        "to": 50.29,
        "text": {
          "zh": "要求降到三分之一，只会轻微分开；到一半，就分得很明显。",
          "en": "Requiring one-third produced only mild separation; at one-half, the separation was striking."
        }
      },
      {
        "from": 51.19,
        "to": 58.912,
        "text": {
          "zh": "这是他用手在棋盘上摆出来的，次数不多。他自己说，这些数字只属于这块人工棋盘。",
          "en": "He moved the pieces by hand, and there were not many runs. He said the figures applied only to this artificial checkerboard."
        }
      },
      {
        "from": 59.412,
        "to": 66.147,
        "text": {
          "zh": "他最关心的是美国按肤色的居住隔离；现实里还有排斥和收入差距，模型有意没放进去。",
          "en": "His main concern was racial residential segregation in the US. Real life also involves exclusion and income differences, which the model deliberately leaves out."
        }
      },
      {
        "from": 67.047,
        "to": 72.083,
        "text": {
          "zh": "但它提醒我们：整体分得很开，推不出每个人都很排外。",
          "en": "But it reminds us that a sharply divided overall pattern does not establish that every individual is strongly exclusionary."
        }
      },
      {
        "from": 72.983,
        "to": 78.82,
        "text": {
          "zh": "你身边，有没有这种“自然就分开了”的格局？评论区说说。",
          "en": "Have you seen a situation that seemed to separate naturally like this? Share your thoughts."
        }
      },
      {
        "from": 79.32,
        "to": 81.109,
        "text": {
          "zh": "一点点偏好，也会堆成一大片。",
          "en": "Small preferences can accumulate into a much larger pattern."
        }
      }
    ],
    "takeaways": [
      {
        "at": 27.614,
        "title": {
          "zh": "先把模型规则说清楚",
          "en": "Make the model’s rule explicit"
        },
        "quote": {
          "zh": "规则只有一条：身边同类不到一半，就搬到最近的满意空格。",
          "en": "There is one rule: if fewer than half your neighbors are the same type, move to the nearest satisfactory vacancy."
        },
        "explanation": {
          "zh": "两类棋子、空格、邻居比例和搬动条件都属于模型设定，不是对真实居民行为的测量。",
          "en": "The two types of tokens, vacancies, neighbor proportions and moving rule are assumptions, not measurements of residents’ behavior."
        }
      },
      {
        "at": 37.688,
        "title": {
          "zh": "把数字限定到那次推演",
          "en": "Tie the figures to that exercise"
        },
        "quote": {
          "zh": "在其中一次推演里，身边同类变成了五分之四以上；周围一个异类都没有的，从一成左右涨到四成左右。",
          "en": "In one exercise, the proportion of same-type neighbors rose above four-fifths. Tokens with no unlike neighbors rose from roughly one in ten to four in ten."
        },
        "explanation": {
          "zh": "原文Figure 9里，没有异类邻居的棋子由138颗中的13颗变成54颗。示意动画另行运行，图表数字来自原文。",
          "en": "In Figure 9, tokens with no unlike neighbor rose from 13 to 54 out of 138. The animation is run separately; the reported chart figures come from the paper."
        }
      },
      {
        "at": 67.047,
        "title": {
          "zh": "整体格局不能代替个体动机",
          "en": "A pattern does not identify each motive"
        },
        "quote": {
          "zh": "但它提醒我们：整体分得很开，推不出每个人都很排外。",
          "en": "But it reminds us that a sharply divided overall pattern does not establish that every individual is strongly exclusionary."
        },
        "explanation": {
          "zh": "模型展示一种可能的形成过程；现实还需要考虑排斥和收入差距，不能凭格局反推人人都排外。",
          "en": "The model shows a possible process. Real contexts also involve exclusion and income, so the pattern alone cannot establish that everyone is exclusionary."
        }
      }
    ]
  }
];

export const SOCIAL_SCIENCE_LESSONS: VideoLesson[] = CONTENT.map(({ asset, ...content }) => ({
  ...content,
  video: {
    src: media[asset].src, poster: media[asset].poster, cover: media[asset].cover, seconds: media[asset].seconds,
    captions: [
      { lang: 'zh', src: `/videos/learning/social-science/${asset}.zh.vtt`, label: L('中文', 'Chinese') },
      { lang: 'en', src: `/videos/learning/social-science/${asset}.en.vtt`, label: L('English', 'English') },
    ],
  },
}));
