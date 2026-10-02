import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SpeechSession, type Recognition, type RecognitionEvent, type SpeechState } from '../../src/features/dinner/lib/speech';

class FakeRecognition implements Recognition {
  lang = ''; continuous = false; interimResults = false; maxAlternatives = 0;
  onstart: Recognition['onstart'] = null; onresult: Recognition['onresult'] = null;
  onerror: Recognition['onerror'] = null; onend: Recognition['onend'] = null;
  starts = 0; stops = 0; aborts = 0;
  start() { this.starts++; this.onstart?.(); }
  stop() { this.stops++; }
  abort() { this.aborts++; }
  results(...parts: [string, boolean][]) { this.onresult?.(event(...parts)); }
}
function event(...parts: [string, boolean][]): RecognitionEvent { return { results: parts.map(([transcript, isFinal]) => ({ isFinal, 0: { transcript } })) }; }
function harness(factory?: () => Recognition | null) {
  const recognition = new FakeRecognition(); let draft = '', state: SpeechState;
  const session = new SpeechSession(next => { state = next; }, text => { draft = text; }, factory ?? (() => recognition));
  return { recognition, session, draft: () => draft, state: () => state! };
}

test('Chinese final results append once, revisions stay outside the saved draft', () => {
  const h = harness(); h.session.start('陈总，', 'zh');
  assert.equal(h.recognition.lang, 'zh-CN');
  h.recognition.results(['我今', false]); assert.equal(h.draft(), ''); assert.equal(h.state().interim, '我今');
  h.recognition.results(['我今天不喝酒。', true], ['我以', false]);
  assert.equal(h.draft(), '陈总，我今天不喝酒。');
  h.recognition.results(['我今天不喝酒。', true], ['我以茶敬您。', true]);
  h.recognition.results(['我今天不喝酒。', true], ['我以茶敬您。', true]);
  assert.equal(h.draft(), '陈总，我今天不喝酒。我以茶敬您。');
  h.recognition.onend?.(); assert.equal(h.state().notice, 'ready'); assert.equal(h.state().interim, '');
});
test('English preserves the typed prefix and spaces separate final segments', () => {
  const h = harness(); h.session.start('Thanks,', 'en');
  assert.equal(h.recognition.lang, 'en-US'); assert.equal(h.recognition.continuous, true); assert.equal(h.recognition.interimResults, true);
  h.recognition.results(['I will have tea.', true], ['Please go ahead.', true]);
  assert.equal(h.draft(), 'Thanks, I will have tea. Please go ahead.'); h.session.dispose();
});
test('stop waits for the final result and never submits it', () => {
  const h = harness(); h.session.start('', 'zh'); h.recognition.results(['未完成', false]);
  h.session.stop(); assert.equal(h.state().phase, 'stopping'); assert.equal(h.recognition.stops, 1); assert.equal(h.recognition.aborts, 0);
  h.recognition.results(['这是完整的话。', true]); h.recognition.onend?.();
  assert.equal(h.draft(), '这是完整的话。'); assert.equal(h.state().phase, 'idle'); assert.equal(h.state().notice, 'ready');
});
test('cancel drops provisional words, preserves confirmed text and invalidates old callbacks', () => {
  const h = harness(); h.session.start('原稿', 'zh'); h.recognition.results(['确认', true], ['半句', false]);
  const lateResult = h.recognition.onresult!, lateEnd = h.recognition.onend!;
  h.session.cancel(); assert.equal(h.recognition.aborts, 1); assert.equal(h.draft(), '原稿确认'); assert.equal(h.state().notice, 'cancelled');
  h.session.start('新的一桌', 'en');
  lateResult(event(['过期语音', true])); lateEnd();
  assert.equal(h.draft(), '原稿确认'); assert.equal(h.state().phase, 'listening'); assert.equal(h.recognition.lang, 'en-US'); h.session.dispose();
});
test('permission, no microphone, network, language and no-speech errors retain final drafts', () => {
  for (const [error, notice] of [['not-allowed','permission'],['service-not-allowed','permission'],['audio-capture','microphone'],['network','network'],['language-not-supported','language'],['no-speech','empty'],['aborted','unavailable']] as const) {
    const h = harness(); h.session.start('已有：', 'zh'); h.recognition.results(['确认。', true], ['半句', false]);
    h.recognition.onerror?.({error}); assert.equal(h.state().notice, notice); assert.equal(h.state().phase, 'idle'); assert.equal(h.state().interim, ''); assert.equal(h.draft(), '已有：确认。'); assert.equal(h.recognition.aborts, 1);
  }
});
test('unsupported and throwing browsers keep typing available without starting a session', () => {
  const unsupported = harness(() => null); unsupported.session.start('保留', 'zh'); assert.equal(unsupported.state().notice, 'unsupported'); assert.equal(unsupported.session.active, false); assert.equal(unsupported.draft(), '');
  const throwing = harness(() => { throw new Error('No service'); }); throwing.session.start('', 'en'); assert.equal(throwing.state().notice, 'unavailable');
  const h = harness(); h.recognition.start = () => { throw new DOMException('Denied', 'NotAllowedError'); }; h.session.start('', 'zh'); assert.equal(h.state().notice, 'permission'); assert.equal(h.session.active, false);
});
test('500 character limit stops recording without overrunning the existing save format', () => {
  const h = harness(); const prefix = '字'.repeat(498); h.session.start(prefix, 'zh'); h.recognition.results(['四个字呀', true]);
  assert.equal(h.draft(), prefix + '四个'); assert.equal(h.draft().length, 500); assert.equal(h.recognition.stops, 1);
  h.recognition.onend?.(); assert.equal(h.state().notice, 'limit');
  h.session.start(h.draft(), 'zh'); assert.equal(h.recognition.starts, 1); assert.equal(h.state().notice, 'limit');
});
test('repeated start clicks do not create multiple microphone sessions; empty end is explicit', () => {
  const h = harness(); h.session.start('', 'en'); h.session.start('other', 'zh'); assert.equal(h.recognition.starts, 1);
  h.recognition.results(['provisional', false]); h.recognition.onend?.(); assert.equal(h.draft(), ''); assert.equal(h.state().notice, 'empty');
});
test('missing start/end events have bounded recovery and release the microphone', t => {
  t.mock.timers.enable({apis:['setTimeout']});
  const starting = harness(); starting.recognition.start = () => {}; starting.session.start('', 'en');
  t.mock.timers.tick(30000); assert.equal(starting.state().notice, 'unavailable'); assert.equal(starting.recognition.aborts, 1);
  const stopping = harness(); stopping.session.start('', 'en'); stopping.recognition.results(['Confirmed.', true]); stopping.session.stop();
  t.mock.timers.tick(4000); assert.equal(stopping.state().phase, 'idle'); assert.equal(stopping.state().notice, 'ready'); assert.equal(stopping.draft(), 'Confirmed.'); assert.equal(stopping.recognition.aborts, 1);
});
