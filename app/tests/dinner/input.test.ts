import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shouldSubmitReply } from '../../src/features/dinner/lib/input';

const enter = { key: 'Enter', shiftKey: false, ctrlKey: false, metaKey: false, isComposing: false };
test('desktop Enter sends but Shift+Enter keeps a line break', () => {
  assert.equal(shouldSubmitReply(enter, true), true);
  assert.equal(shouldSubmitReply({ ...enter, shiftKey: true }, true), false);
});
test('confirming Chinese composition never sends, including legacy composition events', () => {
  assert.equal(shouldSubmitReply({ ...enter, isComposing: true, ctrlKey: true }, true), false);
  assert.equal(shouldSubmitReply({ ...enter, keyCode: 229 }, true), false);
});
test('mobile return keeps a line break; explicit keyboard shortcut still sends', () => {
  assert.equal(shouldSubmitReply(enter, false), false);
  assert.equal(shouldSubmitReply({ ...enter, metaKey: true }, false), true);
});
