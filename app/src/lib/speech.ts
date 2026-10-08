"use client";
import type { Lang } from "@/data/taxonomy";
import { useApp } from "@/store/useApp";
import { useByok } from "@/lib/byok";
import { startStreamSpeech, type PcmSink, type SpeechHandle } from "./speech-playback";

/**
 * Web Speech helpers. Every call is guarded: these APIs are absent in some
 * browsers, throw in others, and are silently blocked on iOS until a user
 * gesture has unlocked them.
 */

export const canSpeak = () => typeof window !== "undefined" && ("speechSynthesis" in window || "AudioContext" in window);

export const canListen = () =>
  typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

let unlocked = false;
let context: AudioContext | undefined;
let active: SpeechHandle | undefined;
let queue: { text: string; lang: Lang }[] = [];
let generation = 0;
let naturalRetryAt = 0;
let queuePaused = false;
export type SpeakerVoice = { feminine: boolean; age: "young" | "adult" | "mature" };

/**
 * iOS Safari refuses `speak()` unless it has been called once from inside a
 * user gesture, so the first NPC line of a session would silently never play.
 * Call this from a real tap — enabling the toggle, or the first touch in the
 * conversation — to spend that gesture on a silent utterance.
 */
export function unlockSpeech() {
  if (typeof window === "undefined") return;
  try {
    const Constructor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Constructor) { context ??= new Constructor(); void context.resume().catch(() => {}); }
  } catch { /* Device narration remains available. */ }
  if (unlocked || !("speechSynthesis" in window)) return;
  unlocked = true;
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch {
    unlocked = false;
  }
}

function deviceSpeech(text: string, lang: Lang, speaker: SpeakerVoice | undefined, onStart?: () => void): SpeechHandle {
  let finish!: () => void, paused = false, started = false, elapsed = 0, settled = false;
  const done = new Promise<void>(resolve => { finish = resolve; });
  let utterance: SpeechSynthesisUtterance | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  const end = () => { if (settled) return; settled = true; clearInterval(timer); finish(); };
  const cancel = () => { if (settled) return; if (utterance) { utterance.onstart = utterance.onend = utterance.onerror = null; try { speechSynthesis.cancel(); } catch {} } end(); };
  try {
    if (typeof speechSynthesis === "undefined") throw new Error("No device speech");
    const u = new SpeechSynthesisUtterance(text);
    utterance = u;
    u.lang = lang === "zh" ? "zh-CN" : "en-US";
    u.rate = speaker?.age === "mature" ? .96 : 1.02;
    u.pitch = speaker?.feminine ? 1.04 : speaker?.age === "mature" ? .94 : 1;
    const voices = speechSynthesis.getVoices().filter(v => v.lang.toLowerCase().startsWith(lang));
    u.voice = voices.find(v => v.localService) ?? voices[0] ?? null;
    u.onstart = () => { if (!settled) { started = true; elapsed = 0; onStart?.(); } };
    u.onend = u.onerror = end;
    speechSynthesis.speak(u);
    timer = setInterval(() => { if (!paused) elapsed += 100; if (elapsed > (started ? 45000 : 4000)) cancel(); }, 100);
  } catch { end(); }
  return { done, cancel, pause(v) { paused = v; try { if (v) speechSynthesis.pause(); else speechSynthesis.resume(); } catch {} } };
}

/** A separate audio context ensures narration never pauses the room ambience. */
function pcmSink(audio: AudioContext, onStart?: () => void): PcmSink {
  const nodes = new Set<AudioBufferSourceNode>();
  let next = audio.currentTime + .04, started = false, stopped = false, firstAt: number | undefined;
  let finish: (() => void) | undefined;
  const startTimer = setInterval(() => {
    if (!started && firstAt !== undefined && audio.state === "running" && audio.currentTime >= firstAt) { started = true; onStart?.(); }
  }, 20);
  const cleanup = () => { clearInterval(startTimer); finish?.(); };
  return {
    write(samples) {
      if (stopped) return;
      const buffer = audio.createBuffer(1, samples.length, 24000);
      buffer.copyToChannel(samples as Float32Array<ArrayBuffer>, 0);
      const source = audio.createBufferSource(); source.buffer = buffer; source.connect(audio.destination);
      nodes.add(source); source.onended = () => { nodes.delete(source); source.disconnect(); if (!nodes.size && finish) cleanup(); };
      next = Math.max(next, audio.currentTime + .04);
      firstAt ??= next;
      source.start(next); next += buffer.duration;
    },
    finish() { return new Promise<void>(resolve => { finish = resolve; if (!nodes.size) cleanup(); }); },
    cancel() { stopped = true; for (const node of nodes) { node.onended = null; try { node.stop(); } catch {} node.disconnect(); } nodes.clear(); cleanup(); },
    pause(v) { if (v) void audio.suspend().catch(() => {}); else void audio.resume().catch(() => {}); },
  };
}

/** Read the final, validated line only. Personal-model mode stays on device. */
export function playNpcLine(text: string, lang: Lang, speaker?: SpeakerVoice, onStart?: () => void): SpeechHandle {
  const fallback = () => deviceSpeech(text, lang, speaker, onStart);
  const natural = useApp.getState().settings.voiceEngine !== "system" && !useByok.getState().enabled && text.length <= 500 && context?.state === "running" && Date.now() >= naturalRetryAt;
  const voice = lang === "zh" ? speaker?.feminine ? speaker.age === "young" ? "冰糖" : "茉莉" : speaker?.age === "young" ? "苏打" : "白桦" : speaker?.feminine ? speaker.age === "young" ? "Mia" : "Chloe" : speaker?.age === "young" ? "Milo" : "Dean";
  const handle = natural ? startStreamSpeech({
    fetch: signal => fetch("/api/speech", { method: "POST", headers: { "Content-Type": "application/json", "Accept-Language": lang }, body: JSON.stringify({ text, lang, voice, tone: "neutral", delivery: "pcm" }), signal, cache: "no-store" }),
    sink: pcmSink(context!, onStart),
    fallback: () => { naturalRetryAt = Date.now() + 60_000; return fallback(); },
  }) : fallback();
  const owned: SpeechHandle = { done: handle.done, pause: handle.pause, cancel() { handle.cancel(); if (active === owned) active = undefined; } };
  active = owned;
  void owned.done.then(() => { if (active === owned) active = undefined; });
  return owned;
}

/** Queue completed 2D lines in their original order, one speaker at a time. */
export function speak(text: string, lang: Lang) {
  if (!canSpeak() || !text.trim()) return;
  queue.push({ text, lang });
  if (active) return;
  const owner = generation;
  const next = () => {
    if (owner !== generation) return;
    const line = queue.shift(); if (!line) return;
    const handle = playNpcLine(line.text, line.lang);
    handle.pause(queuePaused);
    void handle.done.then(next);
  };
  next();
}

export const speechBusy = () => !!active || !!queue.length;
export function pauseSpeaking(paused: boolean) { queuePaused = paused; active?.pause(paused); }

/** Stop immediately, abort generation and drop anything queued. */
export function stopSpeaking() {
  generation++; queue = []; queuePaused = false; active?.cancel(); active = undefined;
  try { if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel(); } catch {}
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
