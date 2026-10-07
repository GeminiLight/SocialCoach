import {readFile} from 'node:fs/promises';
import {decodeBackup} from '../../../app/src/lib/backup';
async function main(){
 const archive=JSON.parse(await readFile(new URL('./synthetic-archive.json',import.meta.url),'utf8'));
 const clean=await decodeBackup(JSON.stringify(archive));
 let corruptDinnerFailure='';
 try{await decodeBackup(JSON.stringify({...archive,dinner3d:{unreadable:'{broken-json'}}));}catch(e){corruptDinnerFailure=(e as Error).message;}
 console.log(JSON.stringify({case:'healthy main archive with exported unreadable dinner wrapper',main_sessions_restorable:clean.archive.sessions.length,when_unreadable_dinner_exported:corruptDinnerFailure}));
}
void main();
