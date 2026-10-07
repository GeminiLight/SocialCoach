import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {test} from 'node:test';

// Resolve the actual lint dependency, including pnpm's patched installation.
const require=createRequire(import.meta.url);
const nextRequire=createRequire(require.resolve('eslint-config-next'));
const pluginRequire=createRequire(nextRequire.resolve('@next/eslint-plugin-next'));
const globRequire=createRequire(pluginRequire.resolve('fast-glob'));
const matchRequire=createRequire(globRequire.resolve('micromatch'));
const braces=matchRequire('braces');

test('lint brace walkers reject excessive string and AST depth before exhausting the stack',()=>{
 const deeplyNested='{'.repeat(4000)+'a,b'+'}'.repeat(4000);
 for(const fn of [braces.compile,braces.expand,braces.stringify]){
  assert.throws(()=>fn(deeplyNested),(error:unknown)=>error instanceof SyntaxError&&/Nesting depth/u.test(error.message));
  let ast:unknown={type:'text',value:'x'};
  for(let i=0;i<4000;i++)ast={type:'root',nodes:[ast]};
  assert.throws(()=>fn(ast),(error:unknown)=>error instanceof SyntaxError&&/Nesting depth/u.test(error.message));
 }
 assert.throws(()=>braces.parse('('.repeat(4000)+'x'+')'.repeat(4000)),SyntaxError);
});
test('the lint patch preserves normal nesting, ranges, quotes and escaped literal braces',()=>{
 assert.deepEqual(braces.expand('packages/{app,{web,cli}}/src/*.{ts,tsx}'),['packages/app/src/*.ts','packages/app/src/*.tsx','packages/web/src/*.ts','packages/web/src/*.tsx','packages/cli/src/*.ts','packages/cli/src/*.tsx']);
 assert.deepEqual(braces.expand('v{1..3}'),['v1','v2','v3']);
 assert.equal(braces.compile('src/{app,features}/**/*.{ts,tsx}'),'src/(app|features)/**/*.(ts|tsx)');
 assert.equal(braces.stringify('"'+ '{'.repeat(200)+'"'),'{'.repeat(200));
 assert.equal(braces.stringify('\\{'.repeat(200)),'{'.repeat(200));
});
