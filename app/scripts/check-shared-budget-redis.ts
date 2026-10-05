/** Optional integration: isolated Redis container only, never a production DB. */
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {RESERVE_SCRIPT} from '../src/lib/shared-budget';
const exec=promisify(execFile),container=process.env.QUALITY_REDIS_CONTAINER??'socialcoach-quality-redis';
const key='socialcoach:{quality-integration}';
async function command(...args:string[]){const result=await exec('docker',['exec',container,'redis-cli','--json',...args]);return JSON.parse(result.stdout);}
async function main(){
 await command('DEL',key+':active');
 const time=await command('TIME') as string[],day=Math.floor(Number(time[0])/86400);await command('DEL',key+':day:'+day,key+':day:'+day+':cap');
 const reserve=(id:string)=>command('EVAL',RESERVE_SCRIPT,'1',key,'100','500','2',id);
 const values=await Promise.all(Array.from({length:12},(_,i)=>reserve('request-'+i)));
 assert.equal(values.filter(v=>v===1).length,2);assert.equal(values.filter(v=>v===-1).length,10);
 assert.equal(await command('GET',key+':day:'+day),'200');
 await command('DEL',key+':active');assert.equal(await reserve('next-window-a'),1);assert.equal(await reserve('next-window-b'),1);
 await command('DEL',key+':active');assert.equal(await reserve('after-app-restart'),1);assert.equal(await reserve('past-hard-budget'),0);
 assert.equal(await command('GET',key+':day:'+day),'500');
 assert.equal(await command('EVAL',RESERVE_SCRIPT,'1',key,'100','1000','8','misconfigured-instance'),0);
 console.log('PASS 12 concurrent reservations: 2 accepted, 10 refused; application restarts retain usage; daily ceiling cannot be exceeded or raised by a differently configured instance.');
}
void main();
