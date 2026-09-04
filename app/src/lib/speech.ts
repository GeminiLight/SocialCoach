"use client";
import type { Lang } from "@/data/taxonomy";

/**
 * Web Speech helpers. Every call is guarded: these APIs are absent in some
 * browsers, throw in others, and are silently blocked on iOS until a user
 * gesture has unlocked them.
 */

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

export const canListen = () =>
  typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

let unlocked = false;

/**
 * iOS Safari refuses `speak()` unless it has been called once from inside a
 * user gesture, so the first NPC line of a session would silently never play.
 * Call this from a real tap — enabling the toggle, or the first touch in the
 * conversation — to spend that gesture on a silent utterance.
 */
export function unlockSpeech() {
  if (unlocked || !canSpeak()) return;
  unlocked = true;
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch {
    unlocked = false;
  }
}

/** Queue a line. Lines queued in order are read in order. */
export function speak(text: string, lang: Lang) {
  if (!canSpeak() || !text.trim()) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "zh" ? "zh-CN" : "en-US";
    u.rate = 1.02;
    speechSynthesis.speak(u);
  } catch {}
}

/** Stop immediately and drop anything queued. */
export function stopSpeaking() {
  if (!canSpeak()) return;
  try {
    speechSynthesis.cancel();
  } catch {}
}

/** What a SpeechRecognition failure means, in words the learner can act on. */
export function recognitionError(code: string | undefined, lang: Lang): string | null {
  const zh: Record<string, string> = {
    "not-allowed": "麦克风未授权",
    "service-not-allowed": "麦克风未授权",
    "no-speech": "没听到声音",
    "audio-capture": "找不到麦克风",
    network: "识别服务连不上",
  };
  const en: Record<string, string> = {
    "not-allowed": "Microphone not allowed",
    "service-not-allowed": "Microphone not allowed",
    "no-speech": "Didn't hear anything",
    "audio-capture": "No microphone found",
    network: "Speech service unreachable",
  };
  // The learner pressed stop; that is not a failure.
  if (code === "aborted") return null;
  const table = lang === "en" ? en : zh;
  return table[code ?? ""] ?? (lang === "en" ? "Speech recognition failed" : "识别失败");
}
