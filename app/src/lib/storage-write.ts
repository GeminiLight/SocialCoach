/** IndexedDB read-write transactions serialize same-origin windows even when
 * Web Locks is absent. The database contains no practice data or credentials;
 * localStorage remains the archive. The callback must stay synchronous. */
export function storageWriteCoordinator<T>(name:string):((work:()=>T)=>Promise<T>)|undefined{
 if(typeof window==='undefined'||typeof document==='undefined'||typeof document.createElement!=='function')return undefined;
 return work=>new Promise<T>((resolve,reject)=>{
  let finished=false,db:IDBDatabase|undefined,tx:IDBTransaction|undefined;
  const finish=(error:unknown,value?:T)=>{if(finished)return;finished=true;clearTimeout(timeout);db?.close();if(error)reject(error);else resolve(value as T);};
  const timeout=setTimeout(()=>{try{tx?.abort();}catch{}finish(new Error('Storage coordination timed out'));},5000);
  try{
   const request=indexedDB.open('socialcoach-write-guard-v1',1);
   request.onupgradeneeded=()=>{request.result.createObjectStore('writes');};
   request.onerror=()=>finish(request.error??new Error('Storage coordination unavailable'));
   request.onblocked=()=>finish(new Error('Storage coordination blocked'));
   request.onsuccess=()=>{
    db=request.result;if(finished){db.close();return;}
    try{
     tx=db.transaction('writes','readwrite');
     let result:T;
     tx.oncomplete=()=>finish(null,result);
     tx.onabort=()=>finish(tx?.error??new Error('Storage coordination aborted'));
     tx.onerror=()=>finish(tx?.error??new Error('Storage coordination failed'));
     // A request keeps this transaction active while its success callback
     // compares and writes the archive. Never await inside this callback.
     tx.objectStore('writes').get(name).onsuccess=()=>{
      if(finished)return;
      try{result=work();}catch(error){tx?.abort();finish(error);}
     };
    }catch(error){finish(error);}
   };
  }catch(error){finish(error);}
 });
}
