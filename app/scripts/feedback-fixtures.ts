/** Synthetic rehearsal transcripts from the Oct 4 audit, not user data.
 * Frozen NPC dialogue tests assessment meaning; it is not a claim about current NPC generations. */
export const feedbackFixtures=[
  {
    "id": "ambiguous-toast",
    "scene": "work",
    "variant": "work-toast",
    "records": [
      {
        "text": "大家一起举杯吧，我先敬陈总。",
        "reply": {
          "speakerId": "chen",
          "text": "行，举杯我认。茶也行，意思到了。喝不喝另说——先坐下，咱把周三的事说清楚。",
          "cue": "陈总举起杯子。",
          "reactions": [
            {
              "characterId": "chen",
              "emotion": "supportive",
              "gesture": "toast"
            },
            {
              "characterId": "lin",
              "emotion": "thinking",
              "gesture": "lean"
            },
            {
              "characterId": "zhou",
              "emotion": "neutral",
              "gesture": "toast"
            }
          ],
          "story": {
            "topic": "toast",
            "beat": "respect"
          },
          "replyTo": "大家一起举杯吧，我先敬陈总",
          "interjection": {
            "speakerId": "lin",
            "text": "周三上线，你们到底能交哪些？报表算不算在内？"
          }
        }
      },
      {
        "text": "陈总，这杯敬您。",
        "reply": {
          "speakerId": "chen",
          "text": "好，这杯我认了，意思到了。坐好——林姐问的正事还没答：周三到底交哪些？",
          "cue": "陈总举起杯子。",
          "reactions": [
            {
              "characterId": "chen",
              "emotion": "supportive",
              "gesture": "toast"
            },
            {
              "characterId": "lin",
              "emotion": "pressing",
              "gesture": "lean"
            },
            {
              "characterId": "zhou",
              "emotion": "thinking",
              "gesture": "idle"
            }
          ],
          "story": {
            "topic": "scope",
            "beat": "bridge"
          },
          "replyTo": "这杯敬您",
          "interjection": {
            "speakerId": "lin",
            "text": "我就一句：新报表周三算不算在内？"
          }
        }
      },
      {
        "text": "我们再敬陈总一杯。",
        "reply": {
          "speakerId": "chen",
          "text": "又敬一杯？面子给足了。可林姐那句话还悬着呢——新报表周三算不算，你得给个话。",
          "cue": "陈总朝你倾身。",
          "reactions": [
            {
              "characterId": "chen",
              "emotion": "pressing",
              "gesture": "lean"
            },
            {
              "characterId": "lin",
              "emotion": "thinking",
              "gesture": "fold"
            },
            {
              "characterId": "zhou",
              "emotion": "neutral",
              "gesture": "idle"
            }
          ],
          "story": {
            "topic": "scope",
            "beat": "bridge"
          },
          "replyTo": "我们再敬陈总一杯",
          "interjection": {
            "speakerId": "zhou",
            "text": "报表范围没确认前，我不能替它签字。"
          }
        }
      },
      {
        "text": "今天大家都举杯，我也举杯。",
        "reply": {
          "speakerId": "chen",
          "text": "举杯就到这，别再绕。林姐要个能带回的话：报表周三不进，主功能带条件上，行不行，你说一句。",
          "cue": "陈总朝你倾身。",
          "reactions": [
            {
              "characterId": "chen",
              "emotion": "pressing",
              "gesture": "lean"
            },
            {
              "characterId": "lin",
              "emotion": "pressing",
              "gesture": "lean"
            },
            {
              "characterId": "zhou",
              "emotion": "neutral",
              "gesture": "idle"
            }
          ],
          "story": {
            "topic": "scope",
            "beat": "bridge"
          },
          "replyTo": "今天大家都举杯，我也举杯。",
          "interjection": {
            "speakerId": "lin",
            "text": "你只要说报表排除，我就能去报周三主功能。"
          }
        }
      }
    ]
  },
  {
    "id": "explicit-drinking",
    "scene": "work",
    "variant": "work-toast",
    "records": [
      {
        "text": "陈总，我原本不打算喝酒，现在决定喝。我把这杯白酒喝完了。",
        "reply": {
          "speakerId": "chen",
          "text": "好！痛快。来，坐。这面子我记下了。林总，他这杯酒都干了，周三上线的事儿，您那边还有啥不放心的？",
          "cue": "陈总点了点头。",
          "reactions": [
            {
              "characterId": "chen",
              "emotion": "supportive",
              "gesture": "nod"
            },
            {
              "characterId": "lin",
              "emotion": "pressing",
              "gesture": "lean"
            },
            {
              "characterId": "zhou",
              "emotion": "neutral",
              "gesture": "idle"
            }
          ],
          "story": {
            "topic": "toast",
            "beat": "bridge"
          },
          "replyTo": "我把这杯白酒喝完了",
          "interjection": {
            "speakerId": "lin",
            "text": "酒我领了。可我周三总得跟客户报个准话——现在这两项测试什么情况？"
          }
        }
      },
      {
        "text": "我又喝完一杯白酒，交付的事还没谈清楚。",
        "reply": {
          "speakerId": "lin",
          "text": "对，酒喝几杯都得谈。我回去要报：周三上线，范围是不是只含已通过的部分？那两项失败的测试怎么跟客户说？",
          "cue": "林姐抱起手臂。",
          "reactions": [
            {
              "characterId": "chen",
              "emotion": "pressing",
              "gesture": "lean"
            },
            {
              "characterId": "lin",
              "emotion": "neutral",
              "gesture": "fold"
            },
            {
              "characterId": "zhou",
              "emotion": "thinking",
              "gesture": "idle"
            }
          ],
          "story": {
            "topic": "scope",
            "beat": "risk"
          },
          "replyTo": "交付的事还没谈清楚",
          "interjection": {
            "speakerId": "zhou",
            "text": "退款回调超时和批量导入权限这两项，我这边还没复测，不能说稳了。"
          }
        }
      }
    ]
  },
  {
    "id": "resolved-boundary",
    "scene": "family",
    "variant": "family-introduction",
    "records": [
      {
        "text": "大姨，我这次不考虑相亲，不看照片，不加联系方式，也不安排见面。请转告介绍人我不考虑。",
        "reply": {
          "speakerId": "aunt",
          "text": "行，我可以帮你转告。不过我就说是“最近忙、暂时不考虑”，还是原话“不考虑相亲”？原话说出去，介绍人那头不好听。",
          "cue": "大姨抱起手臂。",
          "reactions": [
            {
              "characterId": "aunt",
              "emotion": "pressing",
              "gesture": "fold"
            },
            {
              "characterId": "mom",
              "emotion": "thinking",
              "gesture": "idle"
            },
            {
              "characterId": "dad",
              "emotion": "neutral",
              "gesture": "idle"
            }
          ],
          "story": {
            "topic": "introduction",
            "beat": "relay"
          },
          "replyTo": "我这次不考虑相亲",
          "interjection": {
            "speakerId": "mom",
            "text": "孩子说得挺清楚，你就照原话传吧。"
          }
        }
      },
      {
        "text": "妈妈，我知道您担心我。我愿意饭后和您聊近况，但不接受婚恋安排，转述也请先问我。",
        "reply": {
          "speakerId": "mom",
          "text": "行，饭后咱们娘俩单独聊聊，我爱听。可你让我转述先问你——那介绍人再问起，我总不能一句不说吧？",
          "cue": "妈妈朝你倾身。",
          "reactions": [
            {
              "characterId": "mom",
              "emotion": "supportive",
              "gesture": "lean"
            },
            {
              "characterId": "aunt",
              "emotion": "pressing",
              "gesture": "fold"
            },
            {
              "characterId": "dad",
              "emotion": "neutral",
              "gesture": "idle"
            }
          ],
          "story": {
            "topic": "autonomy",
            "beat": "care"
          },
          "replyTo": "我愿意饭后和您聊近况",
          "interjection": {
            "speakerId": "aunt",
            "text": "那我这句到底是传原话还是传“最近忙”？"
          }
        }
      },
      {
        "text": "爸爸，今天先吃饭吧。相亲我已明确拒绝，这件事先到这里。",
        "reply": {
          "speakerId": "dad",
          "text": "行，先吃饭。不过大姨那句话还悬着——传原话还是传“忙”，总得给个准话，不然这事没完。",
          "cue": "爸爸点了点头。",
          "reactions": [
            {
              "characterId": "dad",
              "emotion": "neutral",
              "gesture": "nod"
            },
            {
              "characterId": "aunt",
              "emotion": "pressing",
              "gesture": "fold"
            },
            {
              "characterId": "mom",
              "emotion": "thinking",
              "gesture": "idle"
            }
          ],
          "story": {
            "topic": "autonomy",
            "beat": "relay"
          },
          "replyTo": "爸爸，今天先吃饭吧"
        }
      },
      {
        "text": "这件事不再补充了，今天先吃饭，谢谢大家关心。",
        "reply": {
          "speakerId": "aunt",
          "text": "哎，你这孩子，话没说完就收。那行，我就传“暂不考虑”，怎么样？",
          "cue": "大姨朝你倾身。",
          "reactions": [
            {
              "characterId": "aunt",
              "emotion": "pressing",
              "gesture": "lean"
            },
            {
              "characterId": "mom",
              "emotion": "thinking",
              "gesture": "fold"
            },
            {
              "characterId": "dad",
              "emotion": "supportive",
              "gesture": "nod"
            }
          ],
          "story": {
            "topic": "introduction",
            "beat": "relay"
          },
          "replyTo": "这件事不再补充了",
          "interjection": {
            "speakerId": "dad",
            "text": "原话不是说了“不考虑”吗，就传原话，别改词。"
          }
        }
      }
    ]
  }
] as const;
