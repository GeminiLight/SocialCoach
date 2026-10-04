import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultShareCard,shareCardText,sharePreparedFile,fitCardText,copyShareText} from '../../src/lib/share-card';

test('a default share has no practice title, learner name, private quote or local report URL',()=>{
 const card=defaultShareCard('zh',2),text=shareCardText(card);
 assert.ok(text.includes('SocialCoach'));assert.ok(!text.includes('http'));assert.equal(card.quote,'');
 assert.equal(defaultShareCard('en',3).quality.includes('3'),true);
 const edited={...card,title:'我想分享的一句',quote:'已删去私人信息的文字'};
 assert.ok(shareCardText(edited).includes(edited.quote));
});
test('unsupported native sharing leaves the prepared file available for download',async()=>{
 const file=new File(['image'],'socialcoach.png',{type:'image/png'});
 assert.equal(await sharePreparedFile(file,{canShare:()=>false}),'unsupported');
});
test('cancel is quiet and genuine share errors remain recoverable',async()=>{
 const file=new File(['image'],'socialcoach.png',{type:'image/png'});
 assert.equal(await sharePreparedFile(file,{canShare:()=>true,share:async()=>{throw new DOMException('cancel','AbortError');}}),'cancelled');
 await assert.rejects(sharePreparedFile(file,{canShare:()=>true,share:async()=>{throw new DOMException('failed','DataError');}}),/failed/);
 let sent:unknown;
 assert.equal(await sharePreparedFile(file,{canShare:()=>true,share:async data=>{sent=data;}}),'shared');
 assert.deepEqual(sent,{files:[file]});
});

test('the image preserves full Chinese passages without truncating or overlapping the next region',()=>{
 const text='把想说的话说出来，面对压力也保留自己的决定。'.repeat(8).slice(0,160);
 const layout=fitCardText(text,{width:868,height:285,size:34,lineRatio:1.4},(value,size)=>Array.from(value).length*size);
 assert.equal(layout.lines.join('').replace(/\s/g,''),text.replace(/\s/g,''));
 assert.ok(layout.height<=285);
 assert.ok(layout.lines.every(line=>Array.from(line).length*layout.size<=868));
 const caption=fitCardText(text.slice(0,140),{width:936,height:170,size:30,lineRatio:1.4},(value,size)=>Array.from(value).length*size);
 assert.equal(caption.lines.join('').replace(/\s/g,''),text.slice(0,140).replace(/\s/g,''));
 assert.ok(caption.height<=170);
});

test('long English words and pasted line breaks fit without dropping text',()=>{
 for(const text of ['a'.repeat(72),'I practiced this conversation before saying it aloud.','话\n'.repeat(36)]){
  const layout=fitCardText(text,{width:936,height:300,size:68,lineRatio:1.35},(value,size)=>value.length*size*.7);
  assert.equal(layout.lines.join('').replace(/\s/g,''),text.replace(/\s/g,''));
  assert.ok(layout.height<=300);
 }
});

test('copying confirms the actual write and gives a bounded fallback when the browser never responds',async()=>{
 let copied='';await copyShareText('SocialCoach', {writeText:async value=>{copied=value;}},20);assert.equal(copied,'SocialCoach');
 await assert.rejects(copyShareText('SocialCoach',undefined,20));
 await assert.rejects(copyShareText('SocialCoach',{writeText:()=>new Promise<void>(()=>{})},20),/unavailable/);
});
