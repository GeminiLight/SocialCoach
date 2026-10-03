/** Deterministic checks: provider requests are mocked; no inference calls. */
import assert from 'node:assert/strict';
import { checkModelConnection, modelIssue, readModelFailure, type ModelMetadata } from '../src/lib/model-status';
import { LLMError } from '../src/lib/llm-core';
import { byokError, checkByokConnection } from '../src/lib/llm-client';
import { useByok, type ByokConfig } from '../src/lib/byok';
import { acceptModelCheck, promptUnavailableSharedModel, refreshModelAccess, syncModelConfiguration, useModelAccess, withModelAccess } from '../src/lib/model-access';
import { clearServerObservation, observedServerHealth, observeServerFailure } from '../src/lib/server-model-observation';
import { ApiError, parseRoleplay } from '../src/lib/client-api';

async function main() {
  let checks = 0;
  const check = (name: string) => { checks++; console.log(`PASS ${name}`); };
  const metadata = (error?: unknown): ModelMetadata => ({ list: async () => { if (error) throw error; return { ids: ['m'] }; }, retrieve: async () => ({}) });
  assert.deepEqual(await checkModelConnection(metadata(), ['m', 'm']), { state: 'available' }); check('metadata verifies models without a completion');
  for (const [error, issue] of [[{ status: 401 }, 'credentials'], [{ status: 403 }, 'credentials'], [{ status: 402 }, 'quota'], [{ status: 429, error: { code: 'insufficient_quota' } }, 'quota'], [{ status: 429 }, 'rate_limit']] as const) {
    assert.deepEqual(await checkModelConnection(metadata(error), ['m']), { state: 'unavailable', issue }); check(`classifies ${error.status}/${issue}`);
  }
  for (const error of [{ status: 404 }, { status: 405 }, { status: 500 }, new TypeError('Failed to fetch')]) assert.deepEqual(await checkModelConnection(metadata(error), ['m']), { state: 'unverified' });
  check('unsupported metadata and CORS do not falsely reject a compatible service');
  let aliases = 0;
  assert.equal((await checkModelConnection({ ...metadata(), retrieve: async () => { aliases++; return {}; } }, ['alias', 'alias'])).state, 'available'); assert.equal(aliases, 1); check('aliases resolve once through metadata');
  assert.equal((await checkModelConnection({ ...metadata(), retrieve: async () => { throw { status: 404 }; } }, ['alias'])).state, 'unverified');
  assert.deepEqual(await checkModelConnection({ ...metadata(), retrieve: async () => { throw { status: 404, error: { code: 'model_not_found' } }; } }, ['missing']), { state: 'unavailable', issue: 'model' }); check('missing model differs from unsupported endpoint');
  for (const missing of ['fast', 'smart']) {
    const pair: ModelMetadata = { list: async () => ({ ids: [missing === 'fast' ? 'smart' : 'fast'] }), retrieve: async () => { throw { status: 404, error: { code: 'model_not_found' } }; } };
    assert.deepEqual(await checkModelConnection(pair, ['fast', 'smart']), { state: 'unavailable', issue: 'model' }); check(`${missing} model failure is detected even when the other model is available`);
  }
  const checked: string[] = [];
  const mixed: ModelMetadata = { list: async () => ({ ids: [] }), retrieve: async id => { checked.push(id); throw { status: 404, ...(id === 'smart' ? { error: { code: 'model_not_found' } } : {}) }; } };
  assert.deepEqual(await checkModelConnection(mixed, ['fast', 'smart']), { state: 'unavailable', issue: 'model' }); assert.deepEqual(checked, ['fast', 'smart']); check('an inconclusive fast check cannot hide a confirmed smart failure');
  checked.length = 0;
  assert.deepEqual(await checkModelConnection({ ...mixed, retrieve: async id => { checked.push(id); if (id === 'fast') throw { status: 405 }; return {}; } }, ['fast', 'smart']), { state: 'unverified' }); assert.deepEqual(checked, ['fast', 'smart']); check('both distinct model aliases are checked before returning an inconclusive result');
  checked.length = 0;
  assert.deepEqual(await checkModelConnection({ ...mixed, retrieve: async id => { checked.push(id); throw { status: 404 }; } }, ['fast', 'smart']), { state: 'unverified' }); assert.deepEqual(checked, ['fast', 'smart']); check('unsupported metadata for both models remains unverified without generation');
  assert.equal(modelIssue(new LLMError('Could not parse JSON', 502)), undefined);
  assert.equal(modelIssue(new LLMError('Reply failed validation', 502)), undefined);
  assert.equal(modelIssue(readModelFailure(JSON.stringify({ error: 'Task invalid', status: 502, modelIssue: null }))), undefined);
  assert.equal(modelIssue({ status: 429, message: '今天的共享额度用完了' }), 'quota'); assert(!byokError({ status: 400, error: { message: 'fixture-secret-key', type: 'invalid_request_error' } }).message.includes('fixture-secret-key')); check('task validation differs from credit failure and provider secrets stay private');
  const raw = JSON.stringify({ error: 'Model connection: credentials.', status: 401, modelIssue: 'credentials' });
  assert.deepEqual(readModelFailure(raw), { error: 'Model connection: credentials.', status: 401, modelIssue: 'credentials' });
  assert.equal(parseRoleplay(`@@npc\npartial\n@@error\n${raw}`, ['npc']).error, 'Model connection: credentials.');
  assert.equal(readModelFailure('invalid API key').modelIssue, 'credentials'); check('stream errors retain status and support legacy text');
  clearServerObservation(); observeServerFailure('rate_limit'); assert.equal(observedServerHealth(), undefined);
  observeServerFailure('credentials'); assert.equal(observedServerHealth()?.issue, 'credentials'); clearServerObservation(); check('per-visitor limits cannot disable everyone');
  // The prompt records a reason only; dismissal survives navigation without saving a key.
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  const remembered = new Map<string, string>();
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { getItem: (key: string) => remembered.get(key) ?? null, setItem: (key: string, value: string) => remembered.set(key, value), removeItem: (key: string) => remembered.delete(key) } });
  try {
    useModelAccess.setState({ state: 'available', source: 'server', issue: undefined }); promptUnavailableSharedModel();
    for (const state of ['checking', 'unverified'] as const) { useModelAccess.setState({ state }); assert.equal(promptUnavailableSharedModel(), false); }
    useModelAccess.setState({ state: 'unavailable', source: 'own', issue: 'credentials' }); assert.equal(promptUnavailableSharedModel(), false);
    useModelAccess.setState({ state: 'unavailable', source: 'server', issue: 'credentials' }); assert.equal(promptUnavailableSharedModel(), true); assert.equal(useByok.getState().sheetOpen, true);
    useByok.getState().closeSheet(); assert.equal(promptUnavailableSharedModel(), false); assert.equal(useByok.getState().sheetOpen, false);
    assert.deepEqual([...remembered.values()], ['credentials']); check('confirmed shared failure opens once; uncertain checks and own failures do not');
    useModelAccess.setState({ state: 'available', issue: undefined }); promptUnavailableSharedModel(); assert.equal(remembered.size, 0);
    useModelAccess.setState({ state: 'unavailable', issue: 'credentials' }); assert.equal(promptUnavailableSharedModel(), true); useByok.getState().closeSheet();
    useModelAccess.setState({ state: 'available', issue: undefined }); promptUnavailableSharedModel();
    remembered.set('socialcoach.model-prompt.v1', 'credentials'); useModelAccess.setState({ state: 'unavailable', issue: 'credentials' }); assert.equal(promptUnavailableSharedModel(), false); check('recovery allows a new failure prompt while a tab dismissal survives reload');
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get: () => { throw new Error('Storage blocked'); } });
    useModelAccess.setState({ state: 'available', issue: undefined }); promptUnavailableSharedModel();
    useModelAccess.setState({ state: 'unavailable', issue: 'quota' }); assert.equal(promptUnavailableSharedModel(), true); useByok.getState().closeSheet(); assert.equal(promptUnavailableSharedModel(), false); check('blocked tab storage still permits configuration and deduplicates prompts');
  } finally {
    useByok.getState().closeSheet(); useModelAccess.setState({ state: 'available', issue: undefined }); promptUnavailableSharedModel();
    if (storageDescriptor) Object.defineProperty(globalThis, 'sessionStorage', storageDescriptor); else Reflect.deleteProperty(globalThis, 'sessionStorage');
  }
  const original = globalThis.fetch;
  const calls: string[] = [];
  const metadataFetch: typeof fetch = async (url, init) => { calls.push(`${init?.method ?? 'GET'} ${url}`); return Response.json({ data: [{ id: 'm' }], has_more: false }); };
  globalThis.fetch = metadataFetch;
  const config: ByokConfig = { enabled: true, provider: 'openai', apiKey: 'fixture-not-a-real-key', baseUrl: 'https://fixture.invalid/v1', fastModel: 'm', smartModel: 'm', tokenParam: 'max_tokens' };
  try {
    assert.equal((await checkByokConnection(config)).state, 'available'); assert(calls.length > 0 && calls.every(c => c.startsWith('GET ') && c.endsWith('/models'))); check('connection check sends GET /models only');
    for (const provider of ['openai', 'anthropic'] as const) {
      for (const missing of ['fast', 'smart']) {
        const requests: string[] = [];
        globalThis.fetch = async (url, init) => {
          requests.push(`${init?.method ?? 'GET'} ${url}`);
          if (new URL(String(url)).pathname.endsWith('/models')) return Response.json({ data: [{ id: missing === 'fast' ? 'smart' : 'fast' }], has_more: false });
          return Response.json({ error: { code: 'model_not_found', message: 'model not found' } }, { status: 404 });
        };
        assert.deepEqual(await checkByokConnection({ ...config, provider, fastModel: 'fast', smartModel: 'smart' }), { state: 'unavailable', issue: 'model' });
        assert.equal(requests.length, 2); assert(requests.every(r => r.startsWith('GET '))); assert(requests[1].endsWith(`/models/${missing}`));
      }
      check(`${provider} metadata verifies both fast and smart configuration without inference`);
    }
    globalThis.fetch = metadataFetch;
    useByok.setState({ ...config, hydrated: true }); syncModelConfiguration(); acceptModelCheck({ state: 'available' });
    await assert.rejects(() => withModelAccess('zh', async () => { throw new ApiError('bad key', 401, 'stream', 'credentials'); }), error => error instanceof LLMError && error.message.includes('密钥') && (error as LLMError & { kind: string }).kind === 'stream');
    assert.equal(useModelAccess.getState().issue, 'credentials');
    let generated = 0; await assert.rejects(() => withModelAccess('zh', async () => { generated++; }), /密钥/); assert.equal(generated, 0); check('auth failure blocks the next generation without fallback');
    await refreshModelAccess(true); assert.equal(useModelAccess.getState().state, 'available'); check('explicit free retry restores access');
    let reject!: (e: Error) => void;
    const old = withModelAccess('en', () => new Promise<void>((_, r) => { reject = r; }));
    useByok.setState({ apiKey: 'fixture-new-key' }); syncModelConfiguration(); acceptModelCheck({ state: 'available' }); reject(new LLMError('invalid key', 401)); await assert.rejects(old);
    assert.equal(useModelAccess.getState().state, 'available'); check('old failure cannot disable replacement settings');
    useByok.setState({ apiKey: '', enabled: true }); syncModelConfiguration(); await refreshModelAccess();
    assert.equal(useModelAccess.getState().issue, 'setup'); assert.equal(useModelAccess.getState().source, 'own'); check('incomplete own settings do not fall back to the shared key');
    useByok.setState({ ...config }); syncModelConfiguration(); acceptModelCheck({ state: 'available' });
    await assert.rejects(() => withModelAccess('en', async () => { throw new DOMException('Stop', 'AbortError'); })); assert.equal(useModelAccess.getState().state, 'available'); check('cancellation preserves working access');
    let release!: () => void;
    const success = withModelAccess('en', () => new Promise<void>(r => { release = r; }));
    await assert.rejects(() => withModelAccess('en', async () => { throw new LLMError('no credit', 402); })); release(); await success;
    assert.equal(useModelAccess.getState().issue, 'quota'); check('parallel success cannot erase quota failure');
  } finally { globalThis.fetch = original; }
  console.log(`${checks} checks passed; no paid calls.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
