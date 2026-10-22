'use client';
import {useEffect} from 'react';
import {useParams,useRouter} from 'next/navigation';
import {useApp} from '@/store/useApp';
import {keyTurnCheckpoint,validKeyTurnAttempt} from '@/lib/key-turn';
import {KeyTurnPractice} from '@/components/practice/KeyTurnPractice';

export default function KeyTurnPage(){
 const {id,attemptId}=useParams<{id:string;attemptId:string}>(),router=useRouter();
 const session=useApp(s=>s.sessions.find(x=>x.id===id)),hydrated=useApp(s=>s.hydrated);
 const attempt=session?.keyTurnAttempts?.find(a=>a.id===attemptId);
 const valid=session&&attempt&&keyTurnCheckpoint(session)&&validKeyTurnAttempt(session,attempt);
 useEffect(()=>{if(hydrated&&!valid)router.replace(session?`/practice/${encodeURIComponent(id)}`:'/');},[hydrated,valid,session,id,router]);
 if(!session||!attempt||!valid)return null;
 return <KeyTurnPractice key={attempt.id} session={session} attempt={attempt}/>;
}
