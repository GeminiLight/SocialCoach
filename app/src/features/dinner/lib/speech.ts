export type SpeechNotice = 'ready' | 'editing' | 'cancelled' | 'limit' | 'unsupported' | 'permission' | 'microphone' | 'network' | 'language' | 'empty' | 'unavailable';
export type SpeechState = { phase: 'idle' | 'starting' | 'listening' | 'stopping'; interim: string; notice: SpeechNotice | null };
export type RecognitionResult = { isFinal: boolean; readonly [index: number]: { transcript: string } };
export type RecognitionEvent = { results: ArrayLike<RecognitionResult> };
export interface Recognition {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
export const idleSpeech: SpeechState = { phase: 'idle', interim: '', notice: null };

export function browserRecognition(): Recognition | null {
  const browser = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
  return Constructor ? new Constructor() : null;
}

function errorNotice(error: string): SpeechNotice {
  if (error === 'not-allowed' || error === 'service-not-allowed') return 'permission';
  if (error === 'audio-capture') return 'microphone';
  if (error === 'network') return 'network';
  if (error === 'language-not-supported') return 'language';
  if (error === 'no-speech') return 'empty';
  return 'unavailable';
}

// One explicit click owns one recognition session. Late callbacks cannot write into a later draft.
export class SpeechSession {
  state: SpeechState = idleSpeech;
  private recognition: Recognition | null = null;
  private generation = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private finalText = '';
  private confirmedDraft = '';
  private language: 'zh' | 'en' = 'zh';
  constructor(private publish: (state: SpeechState) => void, private writeDraft: (draft: string) => void, private factory = browserRecognition, private limit = 500) {}
  get active() { return this.state.phase !== 'idle'; }
  private update(state: SpeechState) { this.state = state; this.publish(state); }
  private clearTimer() { clearTimeout(this.timer); this.timer = undefined; }
  private append(base: string, words: string) {
    const separator = base && words && this.language === 'en' && !/\s$/.test(base) ? ' ' : '';
    return (base + separator + words).slice(0, this.limit);
  }
  // Only an explicit stop/edit adopts provisional words; errors and cancellation discard them.
  private finish(abort: boolean, editing = false) {
    const draft = this.append(this.confirmedDraft, this.state.interim);
    const hasWords = !!(this.finalText || this.state.interim);
    const notice = draft.length >= this.limit ? 'limit' : editing ? 'editing' : this.state.notice ?? (hasWords ? 'ready' : 'empty');
    this.detach(abort);
    this.writeDraft(draft);
    this.update({ ...idleSpeech, notice });
  }
  private detach(abort: boolean) {
    this.clearTimer(); this.generation++;
    const recognition = this.recognition; this.recognition = null;
    if (!recognition) return;
    recognition.onstart = recognition.onresult = recognition.onerror = recognition.onend = null;
    if (abort) { try { recognition.abort(); } catch { /* already ended */ } }
  }
  start(base: string, lang: 'zh' | 'en') {
    if (this.active) return;
    if (base.length >= this.limit) { this.update({ ...idleSpeech, notice: 'limit' }); return; }
    let recognition: Recognition | null;
    try { recognition = this.factory(); } catch { this.update({ ...idleSpeech, notice: 'unavailable' }); return; }
    if (!recognition) { this.update({ ...idleSpeech, notice: 'unsupported' }); return; }
    this.recognition = recognition; this.finalText = ''; this.confirmedDraft = base; this.language = lang;
    const generation = ++this.generation;
    const current = () => generation === this.generation && recognition === this.recognition;
    recognition.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
    recognition.continuous = true; recognition.interimResults = true; recognition.maxAlternatives = 1;
    recognition.onstart = () => { if (current() && this.state.phase === 'starting') { this.clearTimer(); this.update({ ...this.state, phase: 'listening' }); } };
    recognition.onresult = event => {
      if (!current()) return;
      const final: string[] = [], interim: string[] = [];
      // Results contain the whole session, including previously final segments.
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i], text = result[0]?.transcript.trim();
        if (text) (result.isFinal ? final : interim).push(text);
      }
      this.finalText = final.join(lang === 'zh' ? '' : ' ');
      const separator = base && this.finalText && lang === 'en' && !/\s$/.test(base) ? ' ' : '';
      const next = base + separator + this.finalText;
      this.confirmedDraft = next.slice(0, this.limit);
      if (this.finalText) this.writeDraft(this.confirmedDraft);
      this.update({ ...this.state, interim: interim.join(lang === 'zh' ? '' : ' ').slice(0, this.limit) });
      if (next.length >= this.limit) { this.update({ ...this.state, notice: 'limit', interim: '' }); this.stop(); }
    };
    recognition.onerror = event => {
      if (!current()) return;
      const notice = errorNotice(event.error); this.detach(true); this.update({ ...idleSpeech, notice });
    };
    recognition.onend = () => {
      if (!current()) return;
      if (this.state.phase === 'stopping') { this.finish(false); return; }
      const notice = this.state.notice ?? (this.finalText ? 'ready' : 'empty');
      this.detach(false); this.update({ ...idleSpeech, notice });
    };
    this.update({ ...idleSpeech, phase: 'starting' });
    this.timer = setTimeout(() => { if (current()) { this.detach(true); this.update({ ...idleSpeech, notice: 'unavailable' }); } }, 30000);
    try { recognition.start(); } catch (error) {
      const notice = error instanceof DOMException && error.name === 'NotAllowedError' ? 'permission' : 'unavailable';
      this.detach(true); this.update({ ...idleSpeech, notice });
    }
  }
  stop() {
    if (!this.recognition || this.state.phase === 'stopping') return;
    this.clearTimer(); this.update({ ...this.state, phase: 'stopping' });
    const generation = this.generation;
    // Browsers that fail to emit end must still release the input and microphone.
    this.timer = setTimeout(() => { if (generation === this.generation) this.finish(true); }, 4000);
    try { this.recognition.stop(); } catch { this.finish(true); }
  }
  edit() { if (this.active) this.finish(true, true); }
  cancel(silent = false) {
    const active = this.active; this.detach(true);
    this.update({ ...idleSpeech, notice: active && !silent ? 'cancelled' : null });
  }
  dispose() { this.detach(true); }
}
