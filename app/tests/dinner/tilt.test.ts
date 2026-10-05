import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_TILT_YAW, screenLean, TiltSession, type TiltSample, type TiltSource } from '../../src/features/dinner/lib/tilt';
import { aimedPerson, GazeRecipient } from '../../src/features/dinner/lib/gazeRecipient';
import { cameraPose } from '../../src/features/dinner/lib/attention';
import { createWorld, snapshot } from '../../src/features/dinner/lib/room';
import { scenarios } from '../../src/features/dinner/lib/content';

function harness(override: Partial<TiltSource> = {}) {
  let read: ((sample: TiltSample) => void) | undefined, listeners = 0, removals = 0;
  const source: TiltSource = { secure: true, supported: true, listen(callback) { read = callback; listeners++; return () => { removals++; }; }, ...override };
  const session = new TiltSession(() => {}, () => source);
  return { session, sample: (beta: number | null, gamma: number | null, angle = 0) => read?.({ beta, gamma, angle }), counts: () => ({ listeners, removals }), late: () => read! };
}

test('screen gravity handles left/right, landscape and upright Euler flips continuously', () => {
  assert.ok(screenLean({ beta: 45, gamma: -20, angle: 0 })! > 0);
  assert.ok(screenLean({ beta: 45, gamma: 20, angle: 0 })! < 0);
  assert.ok(Math.abs(screenLean({ beta: 0, gamma: -90, angle: 90 })!) < 1e-9);
  assert.ok(Math.abs(screenLean({ beta: 0, gamma: 90, angle: 270 })!) < 1e-9);
  // Crossing the upright singularity is a continuous gravity lean, not a raw gamma jump.
  const before = screenLean({ beta: 89, gamma: -90, angle: 0 })!;
  const after = screenLean({ beta: 91, gamma: -90, angle: 0 })!;
  assert.ok(Math.abs(before - after) < .04);
  for (const sample of [{ beta: null, gamma: 10, angle: 0 }, { beta: NaN, gamma: 1, angle: 0 }, { beta: 0, gamma: 0, angle: 0 }]) assert.equal(screenLean(sample), null);
});

test('first sample calibrates current hold, tremors are ignored, extremes bounded and hold centres again', async () => {
  const h = harness(); await h.session.start();
  h.sample(45, -10); assert.equal(h.session.output.yaw, 0);
  h.sample(45, -10.5); assert.equal(h.session.output.yaw, 0);
  h.sample(45, -65); assert.ok(h.session.output.yaw < 0); assert.ok(Math.abs(h.session.output.yaw) <= MAX_TILT_YAW);
  h.sample(45, 45); assert.ok(h.session.output.yaw > 0);
  h.sample(45, -10); assert.equal(h.session.output.yaw, 0);
  h.session.stop(); assert.deepEqual(h.counts(), { listeners: 1, removals: 1 });
});

test('typing, background, new view and screen rotation rebase without changing the room', async () => {
  const h = harness(); await h.session.start(); h.sample(45, 0); h.sample(45, -25); assert.notEqual(h.session.output.yaw, 0);
  h.session.suspend(true); assert.equal(h.session.output.yaw, 0); h.sample(45, 25); assert.equal(h.session.output.yaw, 0);
  h.session.suspend(false); h.sample(45, 25); assert.equal(h.session.output.yaw, 0);
  h.sample(45, -25, 90); assert.equal(h.session.output.yaw, 0);
  h.sample(30, -25, 90); h.session.recenter(); assert.equal(h.session.output.yaw, 0);
  h.sample(30, -25, 90); assert.equal(h.session.output.yaw, 0); h.session.stop();
  for (const scenario of scenarios) {
    const world = createWorld(scenario), before = snapshot(world);
    for (const view of ['first', 'third'] as const) { const base = cameraPose(world, view, 390 / 844); const look = cameraPose(world, view, 390 / 844, MAX_TILT_YAW); assert.deepEqual(look.position, base.position); assert.notDeepEqual(look.target, base.target); }
    assert.deepEqual(snapshot(world), before, 'No NPC / player movement or sensor data in the save');
  }
});

test('permission runs in the click stack; denial, missing hardware and insecure contexts never attach', async () => {
  let calls = 0; const h = harness({ request: () => { calls++; return Promise.resolve('denied'); } });
  const pending = h.session.start(); assert.equal(calls, 1); await pending;
  assert.equal(h.session.status, 'denied'); assert.equal(h.counts().listeners, 0);
  for (const [override, status] of [[{ secure: false }, 'insecure'], [{ supported: false }, 'unavailable']] as const) { const h = harness(override); await h.session.start(); assert.equal(h.session.status, status); assert.equal(h.counts().listeners, 0); }
});

test('late granted permissions and old samples cannot revive a stopped or disposed session', async () => {
  let resolve!: (permission: PermissionState) => void;
  const h = harness({ request: () => new Promise<PermissionState>(r => { resolve = r; }) });
  const start = h.session.start(); h.session.stop(); resolve('granted'); await start; assert.equal(h.counts().listeners, 0); assert.equal(h.session.status, 'off');
  const running = harness(); await running.session.start(); const late = running.late(); running.session.dispose(); late({ beta: 45, gamma: -30, angle: 0 }); assert.equal(running.session.output.yaw, 0); assert.equal(running.counts().removals, 1);
});

test('a device API without useful readings times out and removes its listener', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] }); const h = harness(); await h.session.start(); h.sample(null, null);
  t.mock.timers.tick(8000); assert.equal(h.session.status, 'unavailable'); assert.deepEqual(h.counts(), { listeners: 1, removals: 1 });
});

test('gaze ignores offscreen / ambiguous faces and never changes recipients while sweeping past', () => {
  assert.equal(aimedPerson([{ id: 'left', x: -.3, y: 0, visible: true }, { id: 'centre', x: 0, y: 0, visible: true }, { id: 'behind', x: 0, y: 0, visible: false }]), 'centre');
  assert.equal(aimedPerson([{ id: 'one', x: .01, y: 0, visible: true }, { id: 'two', x: -.01, y: 0, visible: true }]), undefined);
  const gaze = new GazeRecipient();
  for (let i = 0; i < 10; i++) assert.equal(gaze.step('centre', .05, true), undefined);
  for (let i = 0; i < 10; i++) assert.equal(gaze.step('right', .05, true), undefined);
  assert.equal(gaze.step('right', .05, false), undefined);
  let selected: string | undefined; for (let i = 0; i < 15; i++) selected ||= gaze.step('right', .05, true);
  assert.equal(selected, 'right'); assert.equal(gaze.step('right', .05, true), undefined);
  gaze.blocked(); let next: string | undefined; for (let i = 0; i < 15; i++) next ||= gaze.step('right', .05, true); assert.equal(next, 'right');
});
