import test from 'node:test';
import assert from 'node:assert/strict';
import { scenarios } from '../../src/features/dinner/lib/content';
import { enterFullscreen, exitFullscreen, fullscreenElement, fullscreenSupported, onFullscreenChange } from '../../src/features/dinner/lib/fullscreen';

test('switching scenes evicts only the previous room and cast, never shared or reused assets', async () => {
  const { retainSceneAssets, sceneAssetNames, assetUrl } = await import('../../src/features/dinner/components/SceneAssets');
  const cleared: string[] = [];
  const clear = (url: string) => { cleared.push(url); };
  const work = scenarios.find(s => s.id === 'work')!, family = scenarios.find(s => s.id === 'family')!;
  retainSceneAssets([...sceneAssetNames(work), 'props', 'player'], clear);
  assert.deepEqual(cleared, [], 'the first scene has nothing to evict');
  retainSceneAssets(sceneAssetNames(work), clear);
  assert.deepEqual(cleared, [], 'a remount of the same scene keeps its assets');
  retainSceneAssets(sceneAssetNames(family), clear);
  const shared = new Set(sceneAssetNames(family));
  const expected = sceneAssetNames(work).filter(name => !shared.has(name)).map(assetUrl);
  assert.deepEqual(cleared.sort(), expected.sort());
  for (const url of cleared) assert.ok(!/\/(props|player|hand-grip|hand-open)\.glb$/.test(url));
});

test('fullscreen is offered only where an element can enter it, including the WebKit prefix', async () => {
  assert.equal(fullscreenSupported({} as Element), false, 'iPhone Safari: no element fullscreen, so no button');
  assert.equal(fullscreenSupported(null), false);
  let entered = 0;
  const webkit = { webkitRequestFullscreen: () => { entered++; } } as unknown as Element;
  assert.equal(fullscreenSupported(webkit), true);
  await enterFullscreen(webkit); assert.equal(entered, 1);
  let exited = 0;
  const doc = { fullscreenElement: null, webkitFullscreenElement: webkit, webkitExitFullscreen: () => { exited++; },
    listeners: new Map<string, () => void>(),
    addEventListener(name: string, fn: () => void) { this.listeners.set(name, fn); },
    removeEventListener(name: string) { this.listeners.delete(name); } };
  assert.equal(fullscreenElement(doc as unknown as Document), webkit);
  await exitFullscreen(doc as unknown as Document); assert.equal(exited, 1);
  const stop = onFullscreenChange(() => {}, doc as unknown as Document);
  assert.deepEqual([...doc.listeners.keys()].sort(), ['fullscreenchange', 'webkitfullscreenchange']);
  stop(); assert.equal(doc.listeners.size, 0);
});
