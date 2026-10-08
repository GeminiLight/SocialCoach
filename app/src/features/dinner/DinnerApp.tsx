'use client';
import {track} from '@/lib/analytics/track';
import {captureDinnerContent} from "./lib/review";
import type {DinnerContent} from "./lib/content-snapshot";
/* eslint-disable react-hooks/immutability -- Three.js cameras, meshes and the room simulation are mutable resources; React renders their separate snapshots. */

import Link from 'next/link';
import {useApp,useLang} from '@/store/useApp';
import {useRouter} from 'next/navigation';
import {useByok,openModelSheet} from '@/lib/byok';
import {useCanUseModel} from '@/lib/model-access';
import {ModelAccessNotice} from '@/components/ModelAccessNotice';
import {SlowModelNotice} from '@/components/SlowModelNotice';
import {M} from '@/lib/model-copy';
import {useDinnerUiLanguage} from '@/lib/ui-language';
import {createDinnerStorage,DINNER_SAVE_KEY,type DinnerSaveIssue} from './storage';
import {createSaveScheduler} from './lib/saveScheduler';
import {directDinner} from './lib/client';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowRight, ArrowLeft, Footprints, Wine, Coffee, Hand, Smartphone, Pause, Play, Eye, EyeOff, Check, CircleHelp, Crosshair, Download, Lightbulb, Maximize, MessageSquare, Mic, Minimize, Square, SwitchCamera, Users, Volume2, VolumeX, X, MoreHorizontal, Undo2, DoorOpen, Presentation, Languages } from 'lucide-react';
import { pick, scenarios, ui, type Lang, type Scenario } from './lib/content';
import { opening, SaveSchema, type Message, type Save } from './lib/engine';
import { createWorld, snapshot, roomContext, eventText, standPlayer, walkPlayer, goHome, goNear, inviteNpc, focusConversation, focusPerson, freeLook, type Point, type ViewMode, type RoomSave, type RoomEvent, type RoomContext, operateLift, distance, PLAYER_HOME } from './lib/room';
import {activeEvent,createDrama,snapshotDrama,dramaUiKey,syncDrama,stepDrama,readyForChoice,choiceDestination,chooseDrama,settleForSpeech,dinnerContext,eventDialogue,actorBeat,type ChoiceId} from './lib/drama';
import { DEFAULT_DINNER_TURNS, MAX_DINNER_TURNS, variants, variantFor, storyScenario, nextDinnerLimit, storyHint, topicLabels, type VariantId } from './lib/story';
import { shouldSubmitReply } from './lib/input';
import { useSpeechInput } from './lib/useSpeechInput';
import type { SpeechNotice } from './lib/speech';
import { Modal } from './components/Modal';
import { RecipientPicker } from './components/RecipientPicker';
import {MovementJoystick} from './components/MovementJoystick';
import { SpokenLine } from './components/SpokenLine';
import { ConversationHistory } from './components/ConversationHistory';
import {DinnerReviewEntry} from './components/DinnerReviewEntry';
import { clink, toggleRoom } from './lib/sound';
import {useDinnerPlayback} from './lib/useDinnerPlayback';
import {unlockSpeech} from '@/lib/speech';
import {tableEvidence} from './lib/tableEvidence';
import {BRIEF_VERSION,publicSceneBrief} from './lib/briefing';
import {SceneBrief} from './components/SceneBrief';
import {useTiltLook} from './lib/useTiltLook';
const DinnerScene=lazy(()=>import('./components/DinnerScene'));
const SAVE_KEY=DINNER_SAVE_KEY;
const speechCopy:Record<SpeechNotice,keyof typeof ui>={ready:'voiceReady',editing:'voiceEditing',cancelled:'voiceCancelled',limit:'voiceLimit',unsupported:'voiceUnsupported',permission:'voicePermission',microphone:'voiceMicrophone',network:'voiceNetwork',language:'voiceLanguage',empty:'voiceEmpty',unavailable:'voiceUnavailable'};

function requestedScene(){if(typeof window==='undefined')return;const id=new URLSearchParams(window.location.search).get('scene');return scenarios.find(s=>s.id===id)?.id;}
function readInitial() {
  try { const raw=localStorage.getItem(SAVE_KEY); if(raw){const parsed=JSON.parse(raw);const result=SaveSchema.safeParse(parsed);if(result.success){if(!('maxTurns' in parsed)&&result.data.complete)result.data.maxTurns=Math.max(4,result.data.messages.filter(m=>m.role==='user').length);return { save:result.data,corrupt:null };}return {save:null,corrupt:raw};} } catch { try { const raw=localStorage.getItem(SAVE_KEY); if(raw)return {save:null,corrupt:raw}; } catch { /* storage can be disabled */ } }
  return {save:null,corrupt:null};
}
function requestedOpening(){const id=requestedScene();if(!id)return;const raw=new URLSearchParams(window.location.search).get('opening');return variants.find(v=>v.scene===id&&v.id===raw)?.id;}
function freshRequest(){return !!requestedScene()&&new URLSearchParams(window.location.search).get('restart')==='1';}
function initial(lang:Lang){
  const existing=readInitial();if(existing.corrupt||!freshRequest())return existing;
  const id=requestedScene()!,variant=variantFor(id,requestedOpening());const scene=storyScenario(scenarios.find(s=>s.id===id)!,variant);
  return {save:SaveSchema.parse({version:1,contentSnapshot:captureDinnerContent(id,variant.id,DEFAULT_DINNER_TURNS,BRIEF_VERSION),briefVersion:BRIEF_VERSION,scenarioId:id,variantId:variant.id,messages:[opening(scene,lang,variant.id)],started:false,complete:false,lang,draft:''}),corrupt:null};
}
function download(data:unknown,name:string) { const blob=new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }

export default function App() {
  const mainLang=useLang();
  const router=useRouter();
  const enteredAt=useRef(0);
  useEffect(()=>{enteredAt.current=Date.now();},[]);
  const seenStages=useRef(new Set<string>());
  const [openingReview,setOpeningReview]=useState(false);
  const [reviewError,setReviewError]=useState(false);
  const reviewRequest=useRef(false);
  const reviewGeneration=useRef(0);
  const model=useCanUseModel();
  const [boot]=useState(()=>initial(mainLang));
  const [reviewSessionId,setReviewSessionId]=useState(boot.save?.reviewSessionId);
  const [practiceId,setPracticeId]=useState(()=>boot.save?.practiceId??crypto.randomUUID());
  const [briefVersion,setBriefVersion]=useState<typeof BRIEF_VERSION|undefined>(()=>boot.save?boot.save.briefVersion:BRIEF_VERSION);
  const [lang,setLang]=useState<Lang>(boot.save?.lang??mainLang);
  useEffect(()=>{useDinnerUiLanguage.setState({lang});return()=>useDinnerUiLanguage.setState({lang:null});},[lang]);
  const [scenarioId,setScenarioId]=useState<Scenario['id']>(boot.save?.scenarioId??'work');
  const [variantId,setVariantId]=useState<VariantId>(boot.save?.variantId??variantFor(scenarioId).id);
  const variant=variantFor(scenarioId,variantId);
  const [contentSnapshot,setContentSnapshot]=useState<DinnerContent|undefined>(()=>boot.save?boot.save.contentSnapshot:captureDinnerContent(scenarioId,variantId,DEFAULT_DINNER_TURNS,BRIEF_VERSION));
  const scenario=useMemo(()=>{
   const current=storyScenario(scenarios.find(s=>s.id===scenarioId)!,variantFor(scenarioId,variantId));
   if(!contentSnapshot)return current;
   return {...current,title:contentSnapshot.direction.title,goal:contentSnapshot.direction.goal,characters:current.characters.map(c=>{const frozen=contentSnapshot.direction.cast.find(x=>x.id===c.id)!;return {...c,name:frozen.name,role:frozen.role,description:frozen.description};})};
  },[scenarioId,variantId,contentSnapshot]);
  const [maxTurns,setMaxTurns]=useState(boot.save?.maxTurns??DEFAULT_DINNER_TURNS);
  const [targetId,setTargetId]=useState<string|undefined>(boot.save?.targetId);
  const [view,setView]=useState<ViewMode>(boot.save?.view??'first');
  const [world,setWorld]=useState(()=>createWorld(scenario,boot.save?.room));
  const [drama,setDrama]=useState(()=>createDrama(boot.save?.dinner));
  const [dinner,setDinner]=useState(()=>snapshotDrama(drama));
  const [room,setRoom]=useState(()=>snapshot(world));
  const [roomEvent,setRoomEvent]=useState<RoomEvent>(world.event);
  const [sceneReady,setSceneReady]=useState(false);
  const movementInput=useRef<Point>({x:0,z:0});
  const conversation=useRef<HTMLElement>(null);
  const [hudHeight,setHudHeight]=useState(300);
  const [messages,setMessages]=useState<Message[]>(boot.save?.messages??[opening(scenario,lang,variantId)]);
  const [started,setStarted]=useState(boot.save?.started??false);
  const [complete,setComplete]=useState(boot.save?.complete??false);
  const [continuedAtTurn,setContinuedAtTurn]=useState(boot.save?.continuedAtTurn);
  const [draft,setDraft]=useState(boot.save?.draft??'');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [saveIssue,setSaveIssue]=useState<DinnerSaveIssue|null>(null);
  const [downloadedSave,setDownloadedSave]=useState(false);
  const storageError=saveIssue!==null;
  const [corrupt,setCorrupt]=useState<string|null>(boot.corrupt);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [modal,setModal]=useState<'scenes'|'report'|'history'|'about'|'brief'|'evidence'|'controls'|null>(()=>requestedScene()&&!freshRequest()?'scenes':null);
  const [walkingOpen,setWalkingOpen]=useState(false);
  const [actionsFor,setActionsFor]=useState<string|null>(null);
  const [suggestionsOpen,setSuggestionsOpen]=useState(false);
  const [viewReset,setViewReset]=useState(0);
  const [fullscreen,setFullscreen]=useState(false);
  const shell=useRef<HTMLDivElement>(null);
  const [nextScene,setNextScene]=useState<Scenario['id']>(()=>requestedScene()??scenarioId);
  const [nextVariant,setNextVariant]=useState<VariantId>(()=>requestedScene()?variantFor(requestedScene()!,requestedOpening()).id:variantId);
  const [nextLength,setNextLength]=useState(maxTurns);
  const modelSheetOpen=useByok(s=>s.sheetOpen);
  const [sound,setSound]=useState(false);
  const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [gazeEnabled,setGazeEnabled]=useState(false);
  const enableGaze=useCallback(()=>setGazeEnabled(true),[setGazeEnabled]);
  const tilt=useTiltLook(!!modal||modelSheetOpen||!started||!!corrupt||reduced,`${scenarioId}:${view}:${viewReset}`,enableGaze);
  const gazeRecipient=useCallback((id:string)=>setTargetId(id),[setTargetId]);
  const input=useRef<HTMLTextAreaElement>(null);
  const sending=useRef(false);
  const controller=useRef<AbortController|null>(null);
  const saveScheduler=useMemo(()=>createSaveScheduler(),[]);
  const saveStorage=useMemo(()=>createDinnerStorage(setSaveIssue),[]);
  useEffect(()=>{saveStorage.start();return()=>{saveScheduler.flush();saveStorage.dispose();};},[saveStorage,saveScheduler]);
  const currentSave=useCallback(():Save=>({version:1,briefVersion,contentSnapshot,practiceId,reviewSessionId,scenarioId,variantId,maxTurns,continuedAtTurn,targetId,messages,started,complete,lang,draft,view,room:snapshot(world),dinner:snapshotDrama(drama)}),[briefVersion,contentSnapshot,practiceId,reviewSessionId,scenarioId,variantId,maxTurns,continuedAtTurn,targetId,messages,started,complete,lang,draft,view,world,drama]);
  const durableFields=useRef<unknown[]>([]);
  const speech=useSpeechInput(lang,scenarioId,model&&started&&!complete&&!busy&&!modal&&!modelSheetOpen&&!corrupt&&!storageError,setDraft);
  const speechIssue=speech.notice&&!['ready','editing','cancelled','limit'].includes(speech.notice);
  const t=(key:keyof typeof ui)=>pick(ui[key],lang);
  const viewToggleLabel=`${t(view==='first'?'firstPerson':'thirdPerson')} · ${t(view==='first'?'switchToThirdPerson':'switchToFirstPerson')}`;
  const turn=messages.filter(m=>m.role==='user').length;
  const latestNPC=[...messages].reverse().find(m=>m.role==='npc')!;
  const closing=continuedAtTurn!==turn?latestNPC.closure:undefined;
  const topic=latestNPC.story?.topic??variant.topic;
  const moment=activeEvent(dinner);
  const momentDialogue=started&&!complete&&dinner.choice?eventDialogue(dinner,lang):undefined;
  const showMoment=!!moment&&(dinner.phase!=='settled'||!!dinner.choice)&&started&&!complete;
  const showMomentControls=showMoment&&(dinner.phase==='waiting'||dinner.phase==='reacting');
  const actionsOpen=!!moment&&actionsFor===moment.id&&dinner.phase==='waiting';
  const momentChoice=moment?.choices.find(c=>c.id===dinner.choice);
  const dialogueSpeakerId=momentDialogue?scenario.characters[momentDialogue.speaker].id:latestNPC.speakerId!;
  const playback=useDinnerPlayback(started&&!complete?momentDialogue?{role:'npc',speakerId:dialogueSpeakerId,text:momentDialogue.text}:latestNPC:undefined,sound,busy||!!modal||modelSheetOpen||!started||!!corrupt||storageError,speech.active||busy);
  const currentSpeakerId=playback.beat?.speakerId??dialogueSpeakerId;
  const speaker=scenario.characters.find(c=>c.id===dialogueSpeakerId)!;
  const evidence=tableEvidence[variant.id];
  const brief=contentSnapshot?{...publicSceneBrief(variant.id,briefVersion),...contentSnapshot.direction.brief,aims:contentSnapshot.publicScenario.objectives}:publicSceneBrief(variant.id,briefVersion);
  const selected=scenario.characters.find(c=>c.id===selectedId);
  const baseReactions=latestNPC.reactions??opening(scenario,lang,variantId).reactions!;
  const reactions=scenario.characters.map((c,i)=>{const r=baseReactions.find(r=>r.characterId===c.id)!;const beat=actorBeat(dinner,i,scenarioId);return {...r,gesture:beat.raise>.25?'toast' as const:moment&&(dinner.phase!=='settled'||turn===0)&&r.gesture==='toast'?'idle' as const:r.gesture};});
  const seated=room.player.seated;
  const attentionFree=room.attention?.mode==='free';
  const followingSpeaker=(room.attention?.mode??'conversation')==='conversation';
  const attentionPerson=scenario.characters.find(c=>c.id===(room.attention?.mode==='person'?room.attention.characterId:currentSpeakerId))??speaker;
  const gazePerson=scenario.characters.find(c=>c.id===targetId);
  function updateRoom(state:RoomSave,event:RoomEvent){setRoom(state);setRoomEvent(event);}
  function roomEvidence(context:RoomContext){const keys={table:'zoneTable',side:'zoneSide',door:'zoneDoor',lobby:'zoneLobby',cabin:'zoneCabin',desk:'zoneDesk',board:'zoneBoard'} as const;return `${t(context.posture==='seated'?'seated':'standing')} · ${t(keys[context.zone])}`;}
  function explore(action:()=>void){if(corrupt||storageError)return;if(!started)setStarted(true);input.current?.blur();action();updateRoom(snapshot(world),world.event);}
  const stopApproach=useCallback(()=>{world.pendingLift=undefined;world.player.path=[];world.player.moving=false;world.destination=null;world.event={key:world.player.seated?'seated':'arrived'};world.revision++;setRoom(snapshot(world));setRoomEvent(world.event);},[world]);
  function act(id:ChoiceId){
    if(corrupt||storageError||busy||!started||complete||drama.phase!=='waiting')return;
    setActionsFor(null);
    input.current?.blur();setSelectedId(null);
    if(!readyForChoice(drama,id,world)){drama.pending=id;const destination=choiceDestination(id,world);if(destination){if(id==='inspect')goHome(world);else walkPlayer(world,destination);}else if(id==='accept'&&distance(world.player,PLAYER_HOME)<1.2){if(drama.inventory==='glass'||drama.inventory==='tea')drama.inventory='none';goNear(world,scenario.characters[1].id);}else if(id==='accept'&&drama.inventory!=='glass'&&drama.inventory!=='tea')goNear(world,scenario.characters[1].id);else goHome(world);updateRoom(snapshot(world),world.event);}
    else {chooseDrama(drama,id,world,turn);if(id==='inspect')setModal('evidence');if(id==='ally')focusPerson(world,scenario.characters[2].id);else if(id==='confirm')focusPerson(world,scenario.characters[0].id);if(sound&&(id==='join'||id==='tea'))clink();}
    setDinner(snapshotDrama(drama));
  }
  useEffect(()=>{
    if(complete&&drama.pending){const frame=requestAnimationFrame(()=>{drama.pending=undefined;stopApproach();});return()=>cancelAnimationFrame(frame);}
    if(!started||complete||modal||modelSheetOpen||corrupt||storageError)return;
    let frame=0,previous=0,since=0,last='';
    const tick=(now:number)=>{const dt=previous?(now-previous)/1000:0;previous=now;if(!busy)syncDrama(drama,scenario,turn,started,complete,{openingEvent:variant.openingEvent??null,requestedEvent:latestNPC.story?.event});if(complete&&drama.pending){drama.pending=undefined;stopApproach();}stepDrama(drama,dt,!!modal||modelSheetOpen||!started||!!corrupt||document.hidden||complete||!sceneReady);
      if(drama.pending&&!modal&&!busy&&!corrupt&&!complete){if(drama.pending==='accept'&&(drama.inventory==='glass'||drama.inventory==='tea')&&distance(world.player,PLAYER_HOME)<1.2){drama.inventory='none';goNear(world,scenario.characters[1].id);}if(readyForChoice(drama,drama.pending,world)){const pending=drama.pending;stopApproach();chooseDrama(drama,pending,world,turn);if(pending==='inspect')setModal('evidence');if(sound&&(pending==='join'||pending==='tea'))clink();}else if(!world.player.path.length&&!world.player.moving){drama.pending=undefined;}}
      since+=dt;if(since>.15){since=0;const current=dramaUiKey(drama,scenarioId);if(current!==last){last=current;setDinner(snapshotDrama(drama));}}frame=requestAnimationFrame(tick);};
    const visibility=()=>{cancelAnimationFrame(frame);previous=0;if(!document.hidden)frame=requestAnimationFrame(tick);};
    document.addEventListener('visibilitychange',visibility);visibility();
    return ()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility);};
  },[drama,scenario,scenarioId,turn,started,complete,modal,modelSheetOpen,busy,corrupt,world,sound,stopApproach,variant.openingEvent,latestNPC.story?.event,sceneReady,storageError]);
  useEffect(()=>{const url=new URL(window.location.href);if(url.searchParams.has('scene')){for(const key of ['scene','opening','restart'])url.searchParams.delete(key);window.history.replaceState(null,'',url.pathname+url.search+url.hash);}},[]);
  useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)');const change=()=>setReduced(query.matches);query.addEventListener('change',change);return ()=>query.removeEventListener('change',change);},[]);
  useEffect(()=>{
    if(corrupt){saveScheduler.cancel();return;}
    const fields=[scenarioId,variantId,maxTurns,targetId,messages,started,complete,lang,draft,view,reviewSessionId,practiceId,continuedAtTurn,briefVersion,contentSnapshot];
    const urgent=fields.some((value,index)=>value!==durableFields.current[index]);durableFields.current=fields;
    saveScheduler.request(()=>{void saveStorage.save(JSON.stringify(currentSave()));},urgent);
  },[scenarioId,variantId,maxTurns,targetId,messages,started,complete,lang,draft,view,room,dinner,corrupt,world,drama,saveScheduler,saveStorage,currentSave,reviewSessionId,practiceId,continuedAtTurn,briefVersion,contentSnapshot]);
  useEffect(()=>{const flush=()=>saveScheduler.flush();const hidden=()=>{if(document.hidden)flush();};window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',hidden);return()=>{flush();saveScheduler.cancel();window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',hidden);};},[saveScheduler]);
  useEffect(()=>()=>{reviewGeneration.current++;controller.current?.abort();void toggleRoom(false);},[]);
  useEffect(()=>{if(started&&seated&&!modal&&!complete&&!busy&&!gazeEnabled&&matchMedia('(pointer: fine)').matches)input.current?.focus({preventScroll:true});},[started,seated,modal,complete,busy,gazeEnabled]);
  useEffect(()=>{
    const field=input.current;if(!field)return;
    const grow=()=>{field.style.height='auto';const minimum=matchMedia('(min-width: 601px)').matches?44:52;field.style.height=`${Math.min(112,Math.max(minimum,field.scrollHeight))}px`;};
    grow();let width=field.clientWidth;
    const observer=new ResizeObserver(()=>{if(field.clientWidth!==width){width=field.clientWidth;grow();}});
    observer.observe(field);return ()=>observer.disconnect();
  },[draft,started,complete]);
  useEffect(()=>{const listener=()=>{if(document.hidden&&sound)void toggleRoom(false);else if(sound)void toggleRoom(true);};document.addEventListener('visibilitychange',listener);return ()=>document.removeEventListener('visibilitychange',listener);},[sound]);

  useEffect(()=>{const node=conversation.current;if(!node)return;const observer=new ResizeObserver(()=>setHudHeight(node.getBoundingClientRect().height));observer.observe(node);return ()=>observer.disconnect();},[]);

  useEffect(()=>{const change=()=>setFullscreen(!!document.fullscreenElement);document.addEventListener('fullscreenchange',change);return ()=>document.removeEventListener('fullscreenchange',change);},[]);

  useEffect(()=>{
    const stage=sceneReady?(turn?'first_reply':started?'started':'loaded'):undefined;
    if(!stage)return;
    const key=practiceId+':'+stage;if(seenStages.current.has(key))return;seenStages.current.add(key);
    track({name:'practice_stage',ts:Date.now(),mode:'3d',practice:practiceId,scenario:`3d-${variantId}`,stage,duration_ms:Math.min(300000,Date.now()-enteredAt.current),turns:turn,byok:!!useByok.getState().enabled});
  },[sceneReady,started,turn,practiceId,variantId]);

  function reset(id:Scenario['id'],storyId:VariantId=variantFor(id).id,length=DEFAULT_DINNER_TURNS) {
    track({name:"practice_stage",ts:Date.now(),mode:"3d",practice:practiceId,scenario:`3d-${variantId}`,stage:"restart",duration_ms:0,turns:turn,byok:!!useByok.getState().enabled});enteredAt.current=Date.now();
    setPracticeId(crypto.randomUUID());setBriefVersion(BRIEF_VERSION);setContentSnapshot(captureDinnerContent(id,storyId,length,BRIEF_VERSION));
    reviewGeneration.current++;reviewRequest.current=false;setOpeningReview(false);speech.cancel();setReviewSessionId(undefined);setReviewError(false);const nextVariant=variantFor(id,storyId);const next=storyScenario(scenarios.find(s=>s.id===id)!,nextVariant);const nextWorld=createWorld(next);
    setWorld(nextWorld);const nextDrama=createDrama();setDrama(nextDrama);setDinner(snapshotDrama(nextDrama));updateRoom(snapshot(nextWorld),nextWorld.event);
    movementInput.current={x:0,z:0};setScenarioId(id);setVariantId(nextVariant.id);setMaxTurns(length);setTargetId(undefined);setNextScene(id);setNextVariant(nextVariant.id);setNextLength(length);
    setMessages([opening(next,lang,nextVariant.id)]);setStarted(false);setComplete(false);setContinuedAtTurn(undefined);setDraft('');setError(null);setSelectedId(null);setSuggestionsOpen(false);setWalkingOpen(false);setActionsFor(null);setViewReset(v=>v+1);setModal(null);
  }
  function closeReview(next:'history'|null=null){reviewGeneration.current++;reviewRequest.current=false;setOpeningReview(false);setModal(next);}
  function extendDinner(){if(storageError||busy||turn>=maxTurns&&maxTurns>=MAX_DINNER_TURNS)return;if(turn>=maxTurns)setMaxTurns(nextDinnerLimit(maxTurns));setContinuedAtTurn(turn);setComplete(false);setStarted(true);setError(null);closeReview();}
  function switchLanguage() {speech.cancel();const next=lang==='zh'?'en':'zh';setLang(next);if(!turn)setMessages([contentSnapshot?{...opening(scenario,next,variantId),speakerId:contentSnapshot.publicScenario.opening.characterId,text:pick(contentSnapshot.publicScenario.opening.text,next)}:opening(scenario,next,variantId)]);}
  function exportDinner() {download({version:1,briefVersion,contentSnapshot,product:'SocialCoach',variantId,maxTurns,continuedAtTurn,targetId,scenario:pick(scenario.title,lang),source:scenario.source,mode:'model',lang,messages,view,room,dinner,exportedAt:new Date().toISOString()},`SocialCoach-${scenarioId}-${new Date().toISOString().slice(0,10)}.json`);}
  async function submit(text=draft) {
    const value=text.trim();if(!model||storageError||speech.isActive()||sending.current||!value||complete||turn>=maxTurns||!started||corrupt)return;
    sending.current=true;
    if(!await saveStorage.save(JSON.stringify(currentSave()))){sending.current=false;return;}
    speech.cancel();
    const observedRoom=roomContext(world),observedDinner=dinnerContext(drama),heard=momentDialogue?{speakerId:currentSpeakerId,text:momentDialogue.text,cue:momentDialogue.cue}:undefined;sending.current=true;setBusy(true);setError(null);
    controller.current=new AbortController();const timeout=setTimeout(()=>controller.current?.abort(),35000);
    try {
      const reply=await directDinner({briefVersion,contentSnapshot,scenarioId,variantId,maxTurns,targetId,lang,text:value,history:messages,room:observedRoom,dinner:observedDinner,heard},controller.current.signal);
      setReviewSessionId(undefined);setMessages(previous=>[...previous,{role:'user',text:value,room:observedRoom,dinner:observedDinner,heard,targetId},{role:'npc',speakerId:reply.speakerId,text:reply.text,cue:reply.cue,reactions:reply.reactions,story:reply.story,interjection:reply.interjection,closure:reply.closure,mode:'model'}]);setDraft('');settleForSpeech(drama);setDinner(snapshotDrama(drama));
      if(reply.closure||turn+1>=maxTurns)setComplete(true);
    } catch(e) { if(!controller.current?.signal.aborted||document.contains(shell.current)){setDraft(value);setError(e instanceof Error&&e.name!=='AbortError'?e.message:t('error'));} } finally {clearTimeout(timeout);sending.current=false;setBusy(false);controller.current=null;}
  }
  async function openReview(){
    if(!turn||busy||corrupt||storageError||reviewRequest.current)return;
    const generation=++reviewGeneration.current;
    speech.cancel();reviewRequest.current=true;setOpeningReview(true);setReviewError(false);
    const save:Save={version:1,briefVersion,contentSnapshot,practiceId,scenarioId,variantId,maxTurns,continuedAtTurn,targetId,messages,started,complete,lang,draft,view,room:snapshot(world),dinner:snapshotDrama(drama)};
    try{
      const {buildDinnerReview,matchesDinnerReview}=await import('./lib/review');
      if(generation!==reviewGeneration.current)return;
      const store=useApp.getState();const cached=store.sessions.find(s=>s.id===reviewSessionId);
      const session=cached&&matchesDinnerReview(cached,save)?cached:buildDinnerReview(save,crypto.randomUUID());
      if(!await saveStorage.save(JSON.stringify({...save,complete:true,reviewSessionId:session.id}))||generation!==reviewGeneration.current){setReviewError(true);return;}
      setReviewSessionId(session.id);
      if(session!==cached)store.addSession(session);
      store.setLang(lang);setComplete(true);
      saveScheduler.cancel();
      if(document.fullscreenElement)await document.exitFullscreen().catch(()=>{});
      if(generation!==reviewGeneration.current)return;
      track({name:"practice_stage",ts:Date.now(),mode:"3d",practice:practiceId,scenario:`3d-${variantId}`,stage:"review",duration_ms:Math.min(300000,Date.now()-enteredAt.current),turns:turn,byok:!!useByok.getState().enabled});
      router.push(`/practice/${session.id}`);
    }catch{if(generation===reviewGeneration.current)setReviewError(true);}finally{if(generation===reviewGeneration.current){reviewRequest.current=false;setOpeningReview(false);}}
  }
  async function soundToggle(){if(!sound)unlockSpeech();try{await toggleRoom(!sound);setSound(!sound);}catch{setSound(false);}}

  async function fullscreenToggle(){try{if(document.fullscreenElement)await document.exitFullscreen();else await shell.current?.requestFullscreen();}catch{/* Full-viewport mode still works when fullscreen is unavailable. */}}

  return <div ref={shell} lang={lang==='zh'?'zh-CN':'en'} style={{'--dinner-hud-height':`${hudHeight}px`} as CSSProperties} className={`app-shell ${started?'is-seated':'is-arriving'}`}>
    <main id="main" className="immersive-stage">
      <section className="scene-viewport" aria-label={pick(scenario.room,lang)}>
        <Suspense fallback={<div className="scene-loading" role="status">{t('sceneLoading')}</div>}><DinnerScene key={scenarioId} scenario={scenario} lang={lang} reactions={reactions} speakerId={currentSpeakerId} drama={drama} hudHeight={hudHeight} line={playback.beat?.text??momentDialogue?.text??latestNPC.text} speaking={playback.speaking} selectedId={selectedId} onEvidence={()=>setModal('evidence')} onSelect={id=>setSelectedId(current=>current===id?null:id)} reduced={reduced} started={started} viewReset={viewReset} world={world} view={view} input={movementInput} tilt={tilt.output} gazeEnabled={gazeEnabled} gazeActive={started&&!complete&&!busy&&!speech.active&&!draft.trim()} onGazeRecipient={gazeRecipient} paused={!!modal||modelSheetOpen||!started||!!corrupt||storageError} onWorldChange={updateRoom} onAvailability={setSceneReady}/></Suspense>
      </section>
      {gazeEnabled&&started&&!complete&&!modal&&!modelSheetOpen&&!busy&&!speech.active&&!draft.trim()&&<span className="dinner-gaze-reticle" aria-hidden="true"/>}
      <header className="topbar">
        <Link href="/" className="back-home" aria-label={pick({zh:"返回 SocialCoach 首页",en:"Back to SocialCoach home"},lang)} title={pick({zh:"返回首页",en:"Back to home"},lang)}><ArrowLeft size={19}/></Link>
        <a className="brand" href="#main" aria-label="SocialCoach"><span className="brand-mark"><Users size={19} strokeWidth={1.65}/></span><span><strong>SocialCoach<span className="brand-version">3D</span></strong><small>{t('subtitle')}</small></span></a>
        <nav aria-label={t('navLabel')}>
          <button className="icon-button view-toggle" data-view={view} disabled={!sceneReady} onClick={()=>setView(current=>current==='first'?'third':'first')} aria-label={viewToggleLabel} title={viewToggleLabel}><SwitchCamera size={18} aria-hidden="true"/></button>
          <button className="icon-button history-button" onClick={()=>setModal('history')} aria-label={t('recap')} title={t('recap')}><MessageSquare size={18}/>{turn>0&&<span className="history-count">{turn}</span>}</button>
          <button className="icon-button more-button" onClick={()=>setModal('controls')} aria-label={t('more')} title={t('more')} aria-haspopup="dialog"><MoreHorizontal size={21}/></button>
        </nav>
      </header>
      <div className="scene-context"><p><span className="room-dot"/>{pick(scenario.room,lang)}<time>{scenario.time}</time></p><h1 className="sr-only">{pick(scenario.title,lang)}</h1>{sceneReady&&<span className="attention-status" data-mode={gazeEnabled?'aim':room.attention?.mode??'conversation'} data-target={gazeEnabled?targetId:attentionFree?undefined:attentionPerson.id}>{gazeEnabled?<Crosshair size={12}/>:attentionFree?<EyeOff size={12}/>:<Eye size={12}/>} {gazeEnabled?`${t('speakTo')} ${pick(gazePerson?.name??ui.wholeTable,lang)}`:attentionFree?t('freeLook'):`${t('attentionFollow')} ${pick(attentionPerson.name,lang)}`}</span>}</div>
      {sceneReady&&!complete&&<div className={`exploration ${walkingOpen?'is-open':''}`} data-player-x={room.player.x.toFixed(2)} data-player-z={room.player.z.toFixed(2)}>
        <button className="exploration-toggle" disabled={!!corrupt||storageError} aria-expanded={walkingOpen} aria-controls="movement-dock" onClick={()=>{if(!walkingOpen)explore(()=>{if(seated)standPlayer(world);});setWalkingOpen(v=>!v);}} aria-label={t(walkingOpen?'hideMovement':seated?'standUp':'movement')}><Footprints size={16}/>{t('walkShort')}</button>
        {walkingOpen&&!modal&&!selected&&!modelSheetOpen&&<div className="movement-dock" id="movement-dock">
          <div className="movement-dock-heading"><span>{roomEvidence(roomContext(world))}</span><button className="icon-button" aria-label={t('hideMovement')} onClick={()=>setWalkingOpen(false)}><X size={16}/></button></div>
          <p className="movement-purpose">{pick(brief.movement,lang)}</p><p className="movement-result" role="status">{eventText(roomEvent,scenario,lang)}</p><MovementJoystick inputRef={movementInput} lang={lang}/>
          <button className="movement-return" onClick={()=>{explore(()=>goHome(world));setWalkingOpen(false);}}><Undo2 size={14}/>{t(scenario.space==='elevator'?'returnLobby':'returnSeat')}</button>
          {scenario.space==='elevator'&&world.lift&&<button className="movement-place" onClick={()=>{if(world.pendingLift)stopApproach();else explore(()=>operateLift(world,world.lift!.target==='open'?'closed':'open'));}}><DoorOpen size={14}/>{t(world.pendingLift?'cancelAction':world.lift.target==='open'?'liftCloseShort':'liftOpenShort')}</button>}
          {scenario.space==='office'&&<button className="movement-place" onClick={()=>{explore(()=>walkPlayer(world,{x:4.4,z:-2.4}));setWalkingOpen(false);}}><Presentation size={14}/>{t('officeBoard')}</button>}
        </div>}
        {scenario.space==='elevator'&&world.lift&&<p className="sr-only" role="status">{t(world.pendingLift?'liftApproach':world.lift.blocked?'liftSafety':world.lift.openness>=1?'liftOpened':world.lift.openness<=0?'liftClosed':world.lift.target==='open'?'liftOpening':'liftClosing')}</p>}
        <p className="movement-event sr-only" aria-live="polite">{eventText(roomEvent,scenario,lang)}</p>
      </div>}
      {selected&&<div className="character-popover" role="region" aria-label={pick(selected.name,lang)}><button className="icon-button" onClick={()=>setSelectedId(null)} aria-label={t('close')}><X size={17}/></button><strong>{pick(selected.name,lang)}</strong><span>{pick(selected.role,lang)}</span><p>{pick(selected.description,lang)}</p>{sceneReady&&<div className="person-actions"><button disabled={busy||!model} onClick={()=>{setGazeEnabled(false);setTargetId(selected.id);setSelectedId(null);if(!started)setStarted(true);input.current?.focus({preventScroll:true});}}>{t('speakTo')}<MessageSquare size={14}/></button><button onClick={()=>{explore(()=>focusPerson(world,selected.id));setSelectedId(null);}}>{t('lookAt')}<Crosshair size={14}/></button><button onClick={()=>{explore(()=>goNear(world,selected.id));setSelectedId(null);}}>{t('goNear')}<Footprints size={14}/></button><button onClick={()=>{explore(()=>inviteNpc(world,selected.id,reactions.find(r=>r.characterId===selected.id)?.emotion??'neutral'));setSelectedId(null);}}>{t('invite')}<Users size={14}/></button></div>}</div>}
      <section ref={conversation} className={`conversation ${actionsOpen?'has-moment':''} ${seated?'':'roaming'}`} aria-label={t('conversationLabel')}>
        {(storageError||corrupt)&&<div className="notice" role="status">{corrupt?t('badSave'):saveIssue==='conflict'?t('saveConflict'):t('storageError')}{corrupt?<button onClick={()=>{download(corrupt,'SocialCoach-original-save.json');setCorrupt(null);reset(scenarioId);}}>{t('downloadSave')}</button>:<><button onClick={()=>{download(currentSave(),'SocialCoach-3D-window.json');setDownloadedSave(true);}}>{t('downloadWindow')}</button>{saveIssue==='conflict'?<button disabled={!downloadedSave} onClick={()=>window.location.reload()}>{t('reloadSave')}</button>:<button onClick={()=>{saveStorage.retry();void saveStorage.save(JSON.stringify(currentSave()));}}>{t('retrySave')}</button>}</>}</div>}
        <div className="dialogue-heading"><div className="speaker-line"><span className="speaker-dot"/><strong>{pick(speaker.name,lang)}</strong><span>{pick(speaker.role,lang)}</span></div><div className="dialogue-tools">{showMomentControls&&moment&&dinner.phase==='waiting'&&<button type="button" className="moment-trigger" onClick={()=>setActionsFor(actionsOpen?null:moment.id)} aria-expanded={actionsOpen} aria-controls="scene-action-choices" title={pick(moment.title,lang)}><Hand size={15}/>{t('sceneActions')}</button>}<button type="button" className="evidence-trigger" onClick={()=>setModal('evidence')} title={pick(evidence.title,lang)}><Smartphone size={14}/>{t('evidenceShort')}</button></div></div>
        <div className="dialogue" aria-live="polite" aria-atomic="true" key={`${scenarioId}-${turn}-${lang}`}><SpokenLine text={momentDialogue?.text??latestNPC.text} lang={lang} onReadFull={()=>setModal('history')}/><p className="stage-cue">{momentDialogue?.cue??latestNPC.cue}</p>{!momentDialogue&&latestNPC.interjection&&<div className={`table-interjection ${playback.index===1&&playback.speaking?'is-speaking':''}`}><span>{t('interjection')} · {pick(scenario.characters.find(c=>c.id===latestNPC.interjection!.speakerId)!.name,lang)}</span><p>{latestNPC.interjection.text}</p></div>}{!started&&<p className="opening-pressure">{pick(evidence.pressure,lang)}</p>}</div>
        {showMomentControls&&moment&&<div className={`dinner-moment ${dinner.phase==='waiting'?'is-waiting':'is-resolved'}`} data-event={moment.id} data-phase={dinner.phase} data-pose={dinner.phase!=='reacting'?dinner.phase:dinner.elapsed<.8?'raising':dinner.elapsed<2.5?'holding':'lowering'}>
          {dinner.phase==='waiting'?<>{actionsOpen&&<div className="moment-action-row" id="scene-action-choices"><div className="moment-actions" role="group" aria-label={pick(moment.title,lang)}>{moment.choices.map(choice=>{const Icon=choice.icon==='glass'?Wine:choice.icon==='tea'?Coffee:choice.icon==='phone'?Smartphone:choice.icon==='people'?Users:Hand;return <button key={choice.id} disabled={storageError||busy||!!corrupt||!!dinner.pending} title={!readyForChoice(drama,choice.id,world)&&choice.movingLabel?pick(choice.movingLabel,lang):undefined} onClick={()=>act(choice.id)}><Icon size={15}/>{pick(choice.cupLabel&&(dinner.inventory==='glass'||dinner.inventory==='tea')?choice.cupLabel:choice.label,lang)}</button>;})}</div><button className="icon-button moment-pause" aria-label={t(dinner.paused?'resumeMoment':'pauseMoment')} onClick={()=>{drama.paused=!drama.paused;setDinner(snapshotDrama(drama));}}>{dinner.paused?<Play size={14}/>:<Pause size={14}/>}</button></div>}<p className={`moment-note ${!dinner.pending&&!dinner.paused?'sr-only':''}`} aria-live="polite">{t(dinner.pending?'momentMoving':dinner.paused?'momentPaused':draft?'momentTyping':dinner.elapsed>=12?'momentNudge':'momentWaiting')}{dinner.pending&&<button onClick={()=>{drama.pending=undefined;stopApproach();setDinner(snapshotDrama(drama));}}>{t('cancelAction')}</button>}</p></>:<p className="moment-receipt" role="status"><Check size={14}/>{momentChoice&&pick(momentChoice.label,lang)}</p>}
        </div>}
        <ModelAccessNotice lang={lang}/>
        {!started?<div className="take-seat"><p><span>{t('target')}</span>{pick(scenario.goal,lang)}</p><button className="text-button opening-brief-link" onClick={()=>setModal('brief')}>{pick(brief.role,lang)} · {t('tableBrief')}</button><span className="opening-length">{maxTurns} {t('turn')} · {t('canContinue')}</span><button className="primary-button" onClick={()=>{unlockSpeech();setStarted(true);}} disabled={!!corrupt||storageError||!model}>{t('start')}<ArrowRight size={18}/></button></div>:complete?<div className="take-seat complete-seat"><p><Check size={17}/>{t(closing?'naturalPause':'finished')}</p><div className="dinner-finish-actions">{(turn<maxTurns||maxTurns<MAX_DINNER_TURNS)&&<button className="primary-button" disabled={!model} onClick={extendDinner}>{turn<maxTurns?t('continue'):t('extendDinner').replace('{n}',String(nextDinnerLimit(maxTurns)-maxTurns))}<ArrowRight size={18}/></button>}<button className="text-button" onClick={()=>setModal('report')}>{t('end')}</button></div></div>:<form className={`reply-form ${draft.length>400?'has-long-draft':''}`} onSubmit={e=>{e.preventDefault();void submit();}}>
          <div className="reply-composer"><RecipientPicker scenario={scenario} lang={lang} value={targetId} disabled={busy||storageError} automatic={gazeEnabled} onChange={id=>{setGazeEnabled(false);setTargetId(id);}}/><label className="sr-only" htmlFor="reply">{t('type')}</label><div className="input-wrap"><textarea id="reply" ref={input} value={draft} onFocus={speech.edit} onChange={e=>{if(speech.isActive()||speech.notice)speech.cancel();setDraft(e.target.value);}} maxLength={500} placeholder={t('placeholder')} disabled={busy} aria-describedby="voice-status" rows={1} onKeyDown={e=>{if(shouldSubmitReply({...e.nativeEvent,key:e.key,shiftKey:e.shiftKey,ctrlKey:e.ctrlKey,metaKey:e.metaKey},matchMedia('(pointer: fine)').matches)){e.preventDefault();void submit();}}}/><button className={`voice-button ${speech.active?'is-listening':''}`} type="button" disabled={!model||storageError||busy||!!corrupt||speech.phase==='stopping'} aria-label={t(speech.active?'voiceStop':'voiceStart')} aria-describedby="voice-status" title={t('voiceHint')} aria-pressed={speech.active} onClick={()=>{if(speech.phase==='starting')speech.discardInterim();else if(speech.active)speech.stop();else {input.current?.blur();speech.start(draft);}}}>{speech.active?<Square size={16} fill="currentColor"/>:<Mic size={19}/>}</button><button className="primary-button speak-button" disabled={!model||storageError||busy||speech.active||!draft.trim()||!!corrupt} type="submit">{busy?<><span className="busy-dot"/><span className="sr-only">{t('thinking')}</span></>:t('send')}</button></div></div>
          <div className="input-meta"><span className="reply-key-hint">{t('replyKeyHint')}</span>{draft.length>400&&<span>{draft.length}/500</span>}</div>
          <div className={`voice-status ${speech.active?'is-listening':''} ${speechIssue?'has-issue':''} ${!speech.active&&!speech.notice?'sr-only':''}`} id="voice-status" data-phase={speech.phase} role={speechIssue?'alert':'status'}><div className="voice-status-line">{speech.active&&<span className="voice-level" aria-hidden="true"><i/><i/><i/></span>}<span>{speech.active?t(speech.phase==='starting'?'voiceStarting':speech.phase==='stopping'?'voiceStopping':'voiceListening'):speech.notice?t(speechCopy[speech.notice]):t('voiceHint')}</span>{speech.active&&<button type="button" className="voice-cancel" aria-label={t('voiceCancel')} onClick={speech.discardInterim}><X size={15}/></button>}</div>{speech.interim&&<p className="voice-interim"><span className="sr-only">{t('voiceInterim')}：</span>{speech.interim}</p>}</div>
          {busy&&<><p className="response-status" role="status">{t('thinking')}</p><SlowModelNotice lang={lang} /></>}{error&&<p className="form-error" role="alert">{error}</p>}
        </form>}
        <div className="table-toolbar">{started&&turn>0&&<button className="text-button" disabled={busy} onClick={()=>setModal('report')}>{t('reviewShort')}</button>}<div className="turn-indicator"><span>{t('turn')} {String(turn).padStart(2,'0')}<i>/{String(maxTurns).padStart(2,'0')}</i></span></div><span className="mode-status"><span className={`mode-dot ${model?'live':''}`}/>{model?t('live'):pick(M.title,lang)}</span>{started&&!complete?<button className="text-button suggestion-toggle" onClick={()=>setSuggestionsOpen(v=>!v)} aria-expanded={suggestionsOpen} aria-controls="suggestions" title={t('needPrompt')}><Lightbulb size={15}/>{t('hintShort')}</button>:<span className="short-format">{pick(topicLabels[topic],lang)}</span>}</div>
        {suggestionsOpen&&started&&!complete&&<div className="suggestions" id="suggestions"><div className="suggestions-heading"><span>{t('suggestion')}</span><button className="icon-button" onClick={()=>setSuggestionsOpen(false)} aria-label={t('close')}><X size={16}/></button></div>{storyHint(topic,lang,scenario).map((s,i)=><button key={i} onClick={()=>{speech.cancel();setDraft(s);setSuggestionsOpen(false);input.current?.focus({preventScroll:true});}} disabled={busy}>{s}</button>)}</div>}
      </section>
    </main>

    {modal==='controls'&&<Modal title={t('sceneOptions')} lang={lang} className="modal-scene-options" onClose={()=>setModal(null)}>
      <div className="scene-options-links">
        <button disabled={busy} onClick={()=>{setNextScene(scenarioId);setNextVariant(variantId);setNextLength([8,12,18].includes(maxTurns)?maxTurns:DEFAULT_DINNER_TURNS);setModal('scenes');}}><Users size={17}/>{t('scenes')}<ArrowRight size={15}/></button>
        <button onClick={()=>setModal('brief')}><CircleHelp size={17}/>{t('tableBrief')}<ArrowRight size={15}/></button>
      </div>
      <div className="scene-preferences">
        <button role="switch" aria-checked={sound} onClick={()=>void soundToggle()}>{sound?<Volume2 size={17}/>:<VolumeX size={17}/>}<span>{t('soundSetting')}</span><span className="preference-switch" aria-hidden="true"/></button>
        <button role="switch" aria-checked={followingSpeaker} disabled={!sceneReady||!!corrupt} onClick={()=>{if(followingSpeaker)freeLook(world);else focusConversation(world);updateRoom(snapshot(world),world.event);}}>{followingSpeaker?<Eye size={17}/>:<EyeOff size={17}/>}<span>{t('followSetting')}</span><span className="preference-switch" aria-hidden="true"/></button>
        <button role="switch" aria-checked={tilt.enabled} disabled={!sceneReady||!!corrupt||reduced} aria-describedby="tilt-status" onClick={tilt.toggle}><Smartphone size={17}/><span>{t('tiltSetting')}</span><span className="preference-switch" aria-hidden="true"/></button>
        <button role="switch" aria-checked={gazeEnabled} disabled={!sceneReady||!!corrupt} aria-describedby="gaze-guide" onClick={()=>setGazeEnabled(v=>!v)}><Crosshair size={17}/><span>{t('gazeSetting')}</span><span className="preference-switch" aria-hidden="true"/></button>
      </div>
      <p className="scene-options-guide" id="tilt-status" role="status">{reduced?t('tiltReduced'):t(({off:'tiltHint',requesting:'tiltRequesting',calibrating:'tiltCalibrating',active:'tiltActive',denied:'tiltDenied',unavailable:'tiltUnavailable',insecure:'tiltInsecure'} as const)[tilt.status])}</p>
      <p className="scene-options-guide" id="gaze-guide">{t('gazeHint')}</p>
      <div className="scene-options-links">
        <button disabled={!sceneReady} onClick={()=>{tilt.recenter();setViewReset(v=>v+1);setModal(null);}}><Crosshair size={17}/>{t('recenter')}</button>
        <button disabled={busy} onClick={switchLanguage} aria-label={t('switchLanguage')}><Languages size={17}/>{t('languageSetting')}<small>{pick({zh:'English',en:'中文'},lang)}</small></button>
        <button onClick={()=>{setModal(null);void fullscreenToggle();}}>{fullscreen?<Minimize size={17}/>:<Maximize size={17}/>}<span>{t(fullscreen?'exitFullscreen':'fullscreen')}</span></button>
        <button onClick={()=>{setModal(null);openModelSheet();}}><span className={`mode-dot ${model?'live':''}`}/><span>{pick(M.title,lang)}</span><ArrowRight size={15}/></button>
      </div>
      <p className="scene-options-guide">{t('mobileLookHint')}</p>
      {started&&!complete&&turn>0&&<button className="scene-finish-link" disabled={busy} onClick={()=>{setComplete(true);setModal('report');}}>{t('end')}<ArrowRight size={15}/></button>}
    </Modal>}
    {modal==='history'&&<ConversationHistory messages={messages} records={dinner.records} scenario={scenario} lang={lang} onClose={()=>setModal(null)} onExport={exportDinner} onReview={()=>setModal('report')}/>}
    {(modal==='brief'||modal==='evidence')&&<Modal title={t('tableBrief')} lang={lang} onClose={()=>setModal(null)}><SceneBrief scenario={scenario} variantId={variantId} version={briefVersion} snapshot={contentSnapshot?.publicScenario} briefSnapshot={contentSnapshot?.direction.brief} lang={lang}/><div className="modal-actions"><button className="primary-button" onClick={()=>setModal(null)}>{t('backToTable')}<ArrowRight size={17}/></button></div></Modal>}
    {modal==='about'&&<Modal title={t('aboutTitle')} lang={lang} onClose={()=>setModal(null)}><div className="about-content"><p>{t('aboutBody')}</p><p>{scenario.space?pick({zh:'拖动或用方向键环顾，WASD、点击空地或摇杆走动。走向人物会持续关注 TA；自由环顾后可恢复关注发言人。在场的人都能听见，走近不等于私下说。人物保持自己的位置，不会跟着你走。电梯停在本层，可开关门；办公室可走到白板旁、查看资料。',en:'Drag or use arrow keys to look; WASD, the floor or joystick to walk. Walking over keeps attention on that person. Resume speaker attention after free look. Everyone nearby can hear; walking closer is not private. People stay in place. The elevator remains on this floor with working doors; the office has a whiteboard and readable notes.'},lang):t('movementAbout')}</p><p>{t('voiceAbout')}</p><p>{t('voiceOutputAbout')}</p><div className="about-mode"><div><strong>{model?t('live'):pick(M.title,lang)}</strong><p>{t('modelAbout')}</p></div></div><h3>{t('source')}</h3><p>{t('sourceDetail')}</p><ul>{scenarios.map(s=><li key={s.id}>{pick(s.source.title,lang)}</li>)}</ul><p className="privacy-note">{t('privacyAbout')}</p></div></Modal>}
    {modal==='scenes'&&<Modal title={t('scenes')} lang={lang} onClose={()=>setModal(null)}><div className="scene-picker">{scenarios.map(s=><button className={`scene-choice ${nextScene===s.id?'chosen':''}`} aria-pressed={nextScene===s.id} key={s.id} onClick={()=>{setNextScene(s.id);setNextVariant(variantFor(s.id).id);}}><span className="scene-choice-top">{pick(s.category,lang)}<span>{nextScene===s.id&&<Check size={17}/>}</span></span><strong>{pick(s.room,lang)}</strong></button>)}</div><fieldset className="dinner-story-picker"><legend>{t('chooseOpening')}</legend>{variants.filter(v=>v.scene===nextScene).map(v=><button key={v.id} className="dinner-story-choice" aria-pressed={nextVariant===v.id} onClick={()=>setNextVariant(v.id)}><strong>{pick(v.title,lang)}</strong><span>{pick(tableEvidence[v.id].pressure,lang)}</span></button>)}</fieldset><div className="dinner-length" role="group" aria-label={t('practiceLength')}>{[8,12,18].map(n=><button key={n} aria-pressed={nextLength===n} onClick={()=>setNextLength(n)}>{n} {t('turn')}</button>)}</div>{turn>0&&<div className="switch-note"><p>{t('newDinner')}</p><button className="text-button" onClick={exportDinner}><Download size={15}/>{t('download')}</button></div>}<div className="modal-actions">{started&&!complete&&<button className="text-button" onClick={()=>setModal(null)}>{t('continue')}</button>}<button className="primary-button" onClick={()=>reset(nextScene,nextVariant,nextLength)}>{t('newStory')}<ArrowRight size={17}/></button></div></Modal>}
    {modal==='report'&&<DinnerReviewEntry lang={lang} scenario={scenario} messages={messages} complete={complete} hasReview={!!reviewSessionId} opening={openingReview} error={reviewError} onClose={()=>closeReview()} onReview={()=>void openReview()} onHistory={()=>closeReview('history')} onExport={exportDinner} onExtend={complete&&(turn<maxTurns||maxTurns<MAX_DINNER_TURNS)?extendDinner:undefined} onRestart={()=>reset(scenarioId,variantId)}/>}

  </div>;
}
