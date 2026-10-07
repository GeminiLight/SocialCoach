import assert from 'node:assert/strict';
import {test} from 'node:test';
import * as storageModule from '../../src/features/dinner/storage';

test('an old 3D writer cannot overwrite a saved draft or resurrect a deleted record',async()=>{
 const entries=new Map<string,string>([[storageModule.DINNER_SAVE_KEY,'old']]);
 const storage={getItem:(key:string)=>entries.get(key)??null,setItem:(key:string,value:string)=>entries.set(key,value),removeItem:(key:string)=>entries.delete(key)};
 const create=(storageModule as unknown as {createDinnerStorage?:(notify:(issue:string|null)=>void,storage:()=>Storage)=>{save:(value:string)=>Promise<boolean>;dispose:()=>void}}).createDinnerStorage;
 assert.equal(typeof create,'function','3D saves need a guarded writer');
 const issues:(string|null)[]=[],a=create!(x=>issues.push(x),()=>storage as unknown as Storage),b=create!(()=>{},()=>storage as unknown as Storage);
 assert.equal(await b.save('new draft'),true);
 assert.equal(await a.save('old view and draft'),false);
 assert.equal(entries.get(storageModule.DINNER_SAVE_KEY),'new draft');
 assert.equal(issues.at(-1),'conflict');
 b.dispose();a.dispose();
 const old=create!(()=>{},()=>storage as unknown as Storage);
 entries.delete(storageModule.DINNER_SAVE_KEY);
 assert.equal(await old.save('resurrected'),false);
 assert.equal(entries.has(storageModule.DINNER_SAVE_KEY),false);
 old.dispose();
});
