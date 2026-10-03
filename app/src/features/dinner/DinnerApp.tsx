/* eslint-disable react-hooks/immutability -- Three.js cameras, meshes and the room simulation are mutable resources; React renders their separate snapshots. */
'use client';
import Link from 'next/link';
import {useLang} from '@/store/useApp';
import {isReady,useByok,openModelSheet} from '@/lib/byok';
import {DINNER_SAVE_KEY} from './storage';
import {directDinner} from './lib/client';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ArrowRight, ArrowUp, ArrowDown, ArrowLeft, Footprints, Wine, Coffee, Hand, Smartphone, Pause, Play, Eye, EyeOff, Check, CircleHelp, Crosshair, Download, Lightbulb, Maximize, MessageSquare, Mic, Minimize, RotateCcw, Square, Users, Volume2, VolumeX, X } from 'lucide-react';
import { emotions, gestures, pick, scenarios, ui, type Lang, type Scenario } from './lib/content';
import { opening, SaveSchema, scriptedReply, type Message, type Save } from './lib/engine';
import { createWorld, snapshot, roomContext, eventText, standPlayer, walkPlayer, goHome, goNear, inviteNpc, focusConversation, focusPerson, freeLook, type Point, type ViewMode, type RoomSave, type RoomEvent, type RoomContext, distance, PLAYER_HOME } from './lib/room';
import {activeEvent,createDrama,snapshotDrama,syncDrama,stepDrama,readyForChoice,chooseDrama,settleForSpeech,dinnerContext,eventDialogue,actionEvidence,actorBeat,actorActionLabel,type ChoiceId} from './lib/drama';
import { DEFAULT_DINNER_TURNS, MAX_DINNER_TURNS, variants, variantFor, storyScenario, nextDinnerLimit, storyHint, topicLabels, type VariantId } from './lib/story';
import { shouldSubmitReply } from './lib/input';
import { useSpeechInput } from './lib/useSpeechInput';
import type { SpeechNotice } from './lib/speech';
import { Modal } from './components/Modal';
import { RecipientPicker } from './components/RecipientPicker';
import { SpokenLine } from './components/SpokenLine';
import { ConversationHistory } from './components/ConversationHistory';
import { clink, toggleRoom } from './lib/sound';
const DinnerScene=lazy(()=>import('./components/DinnerScene'));
const SAVE_KEY=DINNER_SAVE_KEY;
const speechCopy:Record<SpeechNotice,keyof typeof ui>={ready:'voiceReady',cancelled:'voiceCancelled',limit:'voiceLimit',unsupported:'voiceUnsupported',permission:'voicePermission',microphone:'voiceMicrophone',network:'voiceNetwork',language:'voiceLanguage',empty:'voiceEmpty',unavailable:'voiceUnavailable'};

function initial() {
  try { const raw=localStorage.getItem(SAVE_KEY); if(raw){const parsed=JSON.parse(raw);const result=SaveSchema.safeParse(parsed);if(result.success){if(!('maxTurns' in parsed)&&result.data.complete)result.data.maxTurns=Math.max(4,result.data.messages.filter(m=>m.role==='user').length);return { save:result.data,corrupt:null };}return {save:null,corrupt:raw};} } catch { try { const raw=localStorage.getItem(SAVE_KEY); if(raw)return {save:null,corrupt:raw}; } catch { /* storage can be disabled */ } }
  return {save:null,corrupt:null};
}
function download(data:unknown,name:string) { const blob=new Blob([typeof data==='string'?data:JSON.stringify(data,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }

export default function App() {
  const mainLang=useLang();
  const ownModel=useByok(isReady);
  const [boot]=useState(initial);
  const [lang,setLang]=useState<Lang>(boot.save?.lang??mainLang);
  const [scenarioId,setScenarioId]=useState<Scenario['id']>(boot.save?.scenarioId??'work');
  const [variantId,setVariantId]=useState<VariantId>(boot.save?.variantId??variantFor(scenarioId).id);
  const variant=variantFor(scenarioId,variantId);
  const scenario=useMemo(()=>storyScenario(scenarios.find(s=>s.id===scenarioId)!,variantFor(scenarioId,variantId)),[scenarioId,variantId]);
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
  const [draft,setDraft]=useState(boot.save?.draft??'');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [storageError,setStorageError]=useState(false);
  const [corrupt,setCorrupt]=useState<string|null>(boot.corrupt);
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [modal,setModal]=useState<'scenes'|'report'|'history'|'about'|'brief'|null>(null);
  const [suggestionsOpen,setSuggestionsOpen]=useState(false);
  const [viewReset,setViewReset]=useState(0);
  const [fullscreen,setFullscreen]=useState(false);
  const shell=useRef<HTMLDivElement>(null);
  const [nextScene,setNextScene]=useState<Scenario['id']>(scenarioId);
  const [nextVariant,setNextVariant]=useState<VariantId>(variantId);
  const [nextLength,setNextLength]=useState(maxTurns);
  const [serverModel,setServerModel]=useState(false);
  const model=ownModel||serverModel;
  const modelSheetOpen=useByok(s=>s.sheetOpen);
  const [sound,setSound]=useState(false);
  const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  const input=useRef<HTMLTextAreaElement>(null);
  const sending=useRef(false);
  const controller=useRef<AbortController|null>(null);
  const speech=useSpeechInput(lang,scenarioId,started&&!complete&&!busy&&!modal&&!modelSheetOpen&&!corrupt,setDraft);
  const speechIssue=speech.notice&&!['ready','cancelled','limit'].includes(speech.notice);
  const t=(key:keyof typeof ui)=>pick(ui[key],lang);
  const turn=messages.filter(m=>m.role==='user').length;
  const latestNPC=[...messages].reverse().find(m=>m.role==='npc')!;
  const topic=latestNPC.story?.topic??variant.topic;
  const moment=activeEvent(dinner);
  const momentDialogue=started&&!complete&&dinner.choice?eventDialogue(dinner,lang):undefined;
  const showMoment=!!moment&&(dinner.phase!=='settled'||!!dinner.choice)&&started&&!complete;
  const showMomentControls=showMoment&&(dinner.phase==='waiting'||dinner.phase==='reacting');
  const momentChoice=moment?.choices.find(c=>c.id===dinner.choice);
  const currentSpeakerId=momentDialogue?scenario.characters[momentDialogue.speaker].id:latestNPC.speakerId!;
  const speaker=scenario.characters.find(c=>c.id===currentSpeakerId)!;
  const selected=scenario.characters.find(c=>c.id===selectedId);
  const baseReactions=latestNPC.reactions??opening(scenario,lang,variantId).reactions!;
  const reactions=scenario.characters.map((c,i)=>{const r=baseReactions.find(r=>r.characterId===c.id)!;const beat=actorBeat(dinner,i,scenarioId);return {...r,gesture:beat.raise>.25?'toast' as const:moment&&(dinner.phase!=='settled'||turn===0)&&r.gesture==='toast'?'idle' as const:r.gesture};});
  const seated=room.player.seated;
  const hasVisitors=room.npcs.some(n=>!n.seated);
  const attentionFree=room.attention?.mode==='free';
  const attentionPerson=scenario.characters.find(c=>c.id===(room.attention?.mode==='person'?room.attention.characterId:currentSpeakerId))??speaker;
  function updateRoom(state:RoomSave,event:RoomEvent){setRoom(state);setRoomEvent(event);}
  function roomEvidence(context:RoomContext){return `${t(context.posture==='seated'?'seated':'standing')} · ${t(context.zone==='table'?'zoneTable':context.zone==='door'?'zoneDoor':'zoneSide')}`;}
  function explore(action:()=>void){if(corrupt||busy)return;if(!started)setStarted(true);input.current?.blur();action();updateRoom(snapshot(world),world.event);}
  const stopApproach=useCallback(()=>{world.player.path=[];world.player.moving=false;world.destination=null;world.event={key:world.player.seated?'seated':'arrived'};world.revision++;setRoom(snapshot(world));setRoomEvent(world.event);},[world]);
  function act(id:ChoiceId){
    if(corrupt||busy||!started||complete||drama.phase!=='waiting')return;
    input.current?.blur();setSelectedId(null);
    if(!readyForChoice(drama,id,world)){drama.pending=id;if(id==='accept'&&distance(world.player,PLAYER_HOME)<1.2){if(drama.inventory==='glass'||drama.inventory==='tea')drama.inventory='none';goNear(world,scenario.characters[1].id);}else if(id==='accept'&&drama.inventory!=='glass'&&drama.inventory!=='tea')goNear(world,scenario.characters[1].id);else goHome(world);updateRoom(snapshot(world),world.event);}
    else {chooseDrama(drama,id,world,turn);if(id==='ally')focusPerson(world,scenario.characters[2].id);else if(id==='confirm')focusPerson(world,scenario.characters[0].id);if(sound&&(id==='join'||id==='tea'))clink();}
    setDinner(snapshotDrama(drama));
  }
  useEffect(()=>{
    let frame=0,previous=0,since=0,last='';
    const tick=(now:number)=>{const dt=previous?(now-previous)/1000:0;previous=now;if(!busy)syncDrama(drama,scenario,turn,started,complete,{openingEvent:variant.openingEvent??null,requestedEvent:latestNPC.story?.event});if(complete&&drama.pending){drama.pending=undefined;stopApproach();}const waitingOnWords=(busy||!!draft||speech.active)&&drama.phase==='waiting'&&drama.elapsed>=2.2;stepDrama(drama,dt,busy||!!modal||modelSheetOpen||!started||!!corrupt||waitingOnWords||document.hidden||complete);
      if(drama.pending&&!modal&&!busy&&!corrupt&&!complete){if(drama.pending==='accept'&&(drama.inventory==='glass'||drama.inventory==='tea')&&distance(world.player,PLAYER_HOME)<1.2){drama.inventory='none';goNear(world,scenario.characters[1].id);}if(readyForChoice(drama,drama.pending,world)){const pending=drama.pending;stopApproach();chooseDrama(drama,pending,world,turn);if(sound&&(pending==='join'||pending==='tea'))clink();}else if(!world.player.path.length&&!world.player.moving){drama.pending=undefined;}}
      since+=dt;if(since>.15){since=0;const current=JSON.stringify(drama);if(current!==last){last=current;setDinner(snapshotDrama(drama));}}frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);return ()=>cancelAnimationFrame(frame);
  },[drama,scenario,turn,started,complete,modal,modelSheetOpen,busy,corrupt,draft,world,sound,speech.active,stopApproach,variant.openingEvent,latestNPC.story?.event]);
  function stepFromButton(direction:Point){const yaw=world.viewYaw;explore(()=>walkPlayer(world,{x:world.player.x+(-Math.cos(yaw)*direction.x+Math.sin(yaw)*direction.z)*.7,z:world.player.z+(Math.sin(yaw)*direction.x+Math.cos(yaw)*direction.z)*.7}));}
  const directions=[{key:'forward',x:0,z:1,icon:ArrowUp},{key:'left',x:-1,z:0,icon:ArrowLeft},{key:'backward',x:0,z:-1,icon:ArrowDown},{key:'right',x:1,z:0,icon:ArrowRight}] as const;

  useEffect(()=>{let live=true;fetch('/api/health').then(r=>r.json()).then(d=>{if(live)setServerModel(d.serverKey===true&&!d.requireByok);}).catch(()=>{});return ()=>{live=false;};},[]);
  useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)');const change=()=>setReduced(query.matches);query.addEventListener('change',change);return ()=>query.removeEventListener('change',change);},[]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Reflect the result of the device storage write, including denied storage.
  useEffect(()=>{if(corrupt)return;const save:Save={version:1,scenarioId,variantId,maxTurns,targetId,messages,started,complete,lang,draft,view,room,dinner};try {localStorage.setItem(SAVE_KEY,JSON.stringify(save));setStorageError(false);}catch {setStorageError(true);}},[scenarioId,variantId,maxTurns,targetId,messages,started,complete,lang,draft,view,room,dinner,corrupt]);
  useEffect(()=>()=>{controller.current?.abort();void toggleRoom(false);},[]);
  useEffect(()=>{if(started&&seated&&!modal&&!complete&&!busy&&matchMedia('(pointer: fine)').matches)input.current?.focus({preventScroll:true});},[started,seated,modal,complete,busy]);
  useEffect(()=>{const field=input.current;if(!field)return;field.style.height='auto';field.style.height=`${Math.min(112,Math.max(52,field.scrollHeight))}px`;},[draft,started,complete]);
  useEffect(()=>{if(sound&&started&&latestNPC.reactions?.some(r=>r.gesture==='toast'))clink();},[latestNPC,sound,started]);
  useEffect(()=>{const listener=()=>{if(document.hidden&&sound)void toggleRoom(false);else if(sound)void toggleRoom(true);};document.addEventListener('visibilitychange',listener);return ()=>document.removeEventListener('visibilitychange',listener);},[sound]);

  useEffect(()=>{const node=conversation.current;if(!node)return;const observer=new ResizeObserver(()=>setHudHeight(node.getBoundingClientRect().height));observer.observe(node);return ()=>observer.disconnect();},[]);

  useEffect(()=>{const change=()=>setFullscreen(!!document.fullscreenElement);document.addEventListener('fullscreenchange',change);return ()=>document.removeEventListener('fullscreenchange',change);},[]);

  function reset(id:Scenario['id'],storyId:VariantId=variantFor(id).id,length=DEFAULT_DINNER_TURNS) {
    speech.cancel();const nextVariant=variantFor(id,storyId);const next=storyScenario(scenarios.find(s=>s.id===id)!,nextVariant);const nextWorld=createWorld(next);
    setWorld(nextWorld);const nextDrama=createDrama();setDrama(nextDrama);setDinner(snapshotDrama(nextDrama));updateRoom(snapshot(nextWorld),nextWorld.event);
    movementInput.current={x:0,z:0};setScenarioId(id);setVariantId(nextVariant.id);setMaxTurns(length);setTargetId(undefined);setNextScene(id);setNextVariant(nextVariant.id);setNextLength(length);
    setMessages([opening(next,lang,nextVariant.id)]);setStarted(false);setComplete(false);setDraft('');setError(null);setSelectedId(null);setSuggestionsOpen(false);setViewReset(v=>v+1);setModal(null);
  }
  function extendDinner(){if(busy||maxTurns>=MAX_DINNER_TURNS)return;setMaxTurns(nextDinnerLimit(maxTurns));setComplete(false);setStarted(true);setError(null);setModal(null);}
  function switchLanguage() {speech.cancel();const next=lang==='zh'?'en':'zh';setLang(next);if(!turn)setMessages([opening(scenario,next,variantId)]);}
  function exportDinner() {download({version:1,product:'SocialCoach',variantId,maxTurns,targetId,scenario:pick(scenario.title,lang),source:scenario.source,mode:model?'model':'script',lang,messages,view,room,dinner,exportedAt:new Date().toISOString()},`SocialCoach-${scenarioId}-${new Date().toISOString().slice(0,10)}.json`);}
  async function submit(text=draft) {
    const value=text.trim();if(speech.isActive()||sending.current||!value||complete||turn>=maxTurns||!started||corrupt)return;
    speech.cancel();
    const observedRoom=roomContext(world),observedDinner=dinnerContext(drama),heard=momentDialogue?{speakerId:currentSpeakerId,text:momentDialogue.text,cue:momentDialogue.cue}:undefined;sending.current=true;setBusy(true);setError(null);
    controller.current=new AbortController();const timeout=setTimeout(()=>controller.current?.abort(),35000);
    try {
      let reply;
      if(model){reply=await directDinner({scenarioId,variantId,maxTurns,targetId,lang,text:value,history:messages,room:observedRoom,dinner:observedDinner,heard},controller.current.signal);}
      else {await new Promise(resolve=>setTimeout(resolve,reduced?150:750));reply=scriptedReply(scenario,value,turn+1,lang,observedRoom,observedDinner,{history:messages,variantId,maxTurns,targetId});}
      setMessages(previous=>[...previous,{role:'user',text:value,room:observedRoom,dinner:observedDinner,heard,targetId},{role:'npc',speakerId:reply.speakerId,text:reply.text,cue:reply.cue,reactions:reply.reactions,story:reply.story,mode:model?'model':'script'}]);setDraft('');settleForSpeech(drama);setDinner(snapshotDrama(drama));
      if(turn+1>=maxTurns)setComplete(true);
    } catch(e) { if(!controller.current?.signal.aborted||document.contains(shell.current)){setDraft(value);setError(e instanceof Error&&e.name!=='AbortError'?e.message:t('error'));} } finally {clearTimeout(timeout);sending.current=false;setBusy(false);controller.current=null;}
  }
  async function soundToggle(){try{await toggleRoom(!sound);setSound(!sound);}catch{setSound(false);}}

  async function fullscreenToggle(){try{if(document.fullscreenElement)await document.exitFullscreen();else await shell.current?.requestFullscreen();}catch{/* Full-viewport mode still works when fullscreen is unavailable. */}}

  return <div ref={shell} lang={lang==='zh'?'zh-CN':'en'} style={{'--dinner-hud-height':`${hudHeight}px`} as CSSProperties} className={`app-shell ${started?'is-seated':'is-arriving'}`}>
    <main id="main" className="immersive-stage">
      <section className="scene-viewport" aria-label={pick(scenario.room,lang)}>
        <Suspense fallback={<div className="scene-loading" role="status">{t('sceneLoading')}</div>}><DinnerScene scenario={scenario} lang={lang} reactions={reactions} speakerId={currentSpeakerId} drama={drama} hudHeight={hudHeight} line={momentDialogue?.text??latestNPC.text} selectedId={selectedId} onSelect={id=>setSelectedId(current=>current===id?null:id)} reduced={reduced} started={started} viewReset={viewReset} world={world} view={view} input={movementInput} paused={busy||!!modal||modelSheetOpen||!started||!!corrupt} onWorldChange={updateRoom} onAvailability={setSceneReady}/></Suspense>
      </section>
      <div className="cinematic-scrim" aria-hidden="true"/>
      <header className="topbar">
        <Link href="/" className="back-home" aria-label={pick({zh:"返回 SocialCoach 首页",en:"Back to SocialCoach home"},lang)} title={pick({zh:"返回首页",en:"Back to home"},lang)}><ArrowLeft size={19}/></Link>
        <a className="brand" href="#main" aria-label="SocialCoach"><span className="brand-mark"><Users size={19} strokeWidth={1.65}/></span><span><strong>SocialCoach<span className="brand-version">3D</span></strong><small>{t('subtitle')}</small></span></a>
        <nav aria-label={t('navLabel')}>
          <button className="nav-button" onClick={()=>{setNextScene(scenarioId);setNextVariant(variantId);setNextLength([8,12,18].includes(maxTurns)?maxTurns:DEFAULT_DINNER_TURNS);setModal('scenes');}} disabled={busy} aria-label={t('scenes')}><Users size={16}/><span>{t('scenes')}</span></button>
          <button className="nav-button" onClick={()=>setModal('brief')} aria-label={t('tableBrief')}><CircleHelp size={16}/><span>{t('tableBrief')}</span></button>
          <button className="nav-button" onClick={()=>setModal('history')} aria-label={t('recap')}><MessageSquare size={16}/><span>{t('recap')}</span>{turn>0&&<span className="count">{turn}</span>}</button>
        </nav>
        <div className="topbar-tools"><button className="language-button" disabled={busy} onClick={switchLanguage} aria-label={t('switchLanguage')}>{lang==='zh'?'EN':'中'}</button><button className="icon-button fullscreen-button" onClick={()=>void fullscreenToggle()} aria-label={fullscreen?t('exitFullscreen'):t('fullscreen')}>{fullscreen?<Minimize size={18}/>:<Maximize size={18}/>}</button></div>
      </header>
      <div className="scene-context"><p><span className="room-dot"/>{pick(scenario.room,lang)}<time>{scenario.time}</time></p><h1 className="sr-only">{pick(scenario.title,lang)}</h1></div>
      <div className="scene-controls"><div className="view-switch" role="group" aria-label={t('viewMode')}>{(['first','third'] as const).map(mode=><button key={mode} aria-pressed={view===mode} disabled={!sceneReady} onClick={()=>setView(mode)}>{t(mode==='first'?'firstPerson':'thirdPerson')}</button>)}</div><button className="icon-button" onClick={()=>setViewReset(v=>v+1)} aria-label={t('recenter')}><Crosshair size={18}/></button><button className={`icon-button ${sound?'sound-active':''}`} onClick={()=>void soundToggle()} aria-label={sound?t('soundOn'):t('quiet')} aria-pressed={sound}>{sound?<Volume2 size={18}/>:<VolumeX size={18}/>}</button></div>
      {sceneReady&&<button className="attention-control" data-mode={room.attention?.mode??'conversation'} data-target={attentionFree?undefined:attentionPerson.id} disabled={!!corrupt} aria-label={t(attentionFree?'resumeAttention':'enableFreeLook')} onClick={()=>explore(()=>attentionFree?focusConversation(world):freeLook(world))}>{attentionFree?<EyeOff size={15}/>:<Eye size={15}/>}<span>{attentionFree?t('freeLook'):`${t('attentionFollow')} ${pick(attentionPerson.name,lang)}`}</span><small>{t(attentionFree?'resumeShort':'freeShort')}</small></button>}
      {!started&&<span className="look-hint"><span className="desktop-look-hint">{t('lookHint')}</span><span className="mobile-look-hint">{t('mobileLookHint')}</span></span>}
      {sceneReady&&<div className={`world-controls ${seated?'at-seat':'on-foot'}`}>
        <div className="world-status" data-player-x={room.player.x.toFixed(2)} data-player-z={room.player.z.toFixed(2)}><span className="room-dot"/>{roomEvidence(roomContext(world))}</div>
        <button className="explore-button" disabled={!!corrupt} onClick={()=>explore(()=>seated&&!hasVisitors?standPlayer(world):goHome(world))}><Footprints size={15}/>{seated&&!hasVisitors?t('standUp'):t('returnSeat')}</button>
        {!seated&&<div className="movement-pad" role="group" aria-label={t('movement')}>{directions.map(({key,x,z,icon:Icon})=><button key={key} className={`move-${key}`} aria-label={t(key)} onPointerDown={e=>{if(e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);movementInput.current={x,z};}} onPointerUp={()=>{movementInput.current={x:0,z:0};}} onPointerCancel={()=>{movementInput.current={x:0,z:0};}} onBlur={()=>{movementInput.current={x:0,z:0};}} onClick={e=>{if(e.detail===0)stepFromButton({x,z});}}><Icon size={18}/></button>)}</div>}
        <p className="movement-event sr-only" aria-live="polite">{eventText(roomEvent,scenario,lang)}</p>
      </div>}
      {selected&&<div className="character-popover" role="region" aria-label={pick(selected.name,lang)}><button className="icon-button" onClick={()=>setSelectedId(null)} aria-label={t('close')}><X size={17}/></button><strong>{pick(selected.name,lang)}</strong><span>{pick(selected.role,lang)}</span><p>{pick(selected.description,lang)}</p>{sceneReady&&<div className="person-actions"><button disabled={busy} onClick={()=>{setTargetId(selected.id);setSelectedId(null);if(!started)setStarted(true);input.current?.focus({preventScroll:true});}}>{t('speakTo')}<MessageSquare size={14}/></button><button onClick={()=>{explore(()=>focusPerson(world,selected.id));setSelectedId(null);}}>{t('lookAt')}<Crosshair size={14}/></button><button onClick={()=>{explore(()=>goNear(world,selected.id));setSelectedId(null);}}>{t('goNear')}<Footprints size={14}/></button><button onClick={()=>{explore(()=>inviteNpc(world,selected.id,reactions.find(r=>r.characterId===selected.id)?.emotion??'neutral'));setSelectedId(null);}}>{t('invite')}<Users size={14}/></button></div>}</div>}
      <section ref={conversation} className={`conversation ${showMomentControls?'has-moment':''} ${seated?'':'roaming'}`} aria-label={t('conversationLabel')}>
        {(storageError||corrupt)&&<div className="notice" role="status">{corrupt?t('badSave'):t('storageError')}{corrupt&&<button onClick={()=>{download(corrupt,'SocialCoach-original-save.json');setCorrupt(null);reset(scenarioId);}}>{t('downloadSave')}</button>}</div>}
        <div className="dialogue-heading"><div className="speaker-line"><span className="speaker-dot"/><strong>{pick(speaker.name,lang)}</strong><span>{pick(speaker.role,lang)}</span></div><button type="button" className="history-trigger" onClick={()=>setModal('history')}><MessageSquare size={15}/>{t('recap')}{turn>0&&<span>{turn}</span>}</button></div>
        <div className="dialogue" aria-live="polite" aria-atomic="true" key={`${scenarioId}-${turn}-${lang}`}><SpokenLine text={momentDialogue?.text??latestNPC.text} lang={lang} onReadFull={()=>setModal('history')}/><p className="stage-cue">{momentDialogue?.cue??latestNPC.cue}</p></div>
        {showMomentControls&&moment&&<div className={`dinner-moment ${dinner.phase==='waiting'?'is-waiting':'is-resolved'}`} data-event={moment.id} data-phase={dinner.phase} data-pose={dinner.phase!=='reacting'?dinner.phase:dinner.elapsed<.8?'raising':dinner.elapsed<2.5?'holding':'lowering'}>
          {dinner.phase==='waiting'?<><div className="moment-action-row"><div className="moment-actions" role="group" aria-label={pick(moment.title,lang)}>{moment.choices.map(choice=>{const Icon=choice.icon==='glass'?Wine:choice.icon==='tea'?Coffee:choice.icon==='phone'?Smartphone:choice.icon==='people'?Users:Hand;return <button key={choice.id} disabled={busy||!!corrupt||!!dinner.pending} onClick={()=>act(choice.id)}><Icon size={15}/>{pick(choice.cupLabel&&(dinner.inventory==='glass'||dinner.inventory==='tea')?choice.cupLabel:!readyForChoice(drama,choice.id,world)&&choice.movingLabel?choice.movingLabel:choice.label,lang)}</button>;})}</div><button className="icon-button moment-pause" aria-label={t(dinner.paused?'resumeMoment':'pauseMoment')} onClick={()=>{drama.paused=!drama.paused;setDinner(snapshotDrama(drama));}}>{dinner.paused?<Play size={14}/>:<Pause size={14}/>}</button></div><p className={`moment-note ${!dinner.pending&&!dinner.paused?'sr-only':''}`} aria-live="polite">{t(dinner.pending?'momentMoving':dinner.paused?'momentPaused':draft?'momentTyping':dinner.elapsed>=12?'momentNudge':'momentWaiting')}{dinner.pending&&<button onClick={()=>{drama.pending=undefined;stopApproach();setDinner(snapshotDrama(drama));}}>{t('cancelAction')}</button>}</p></>:<p className="moment-receipt" role="status"><Check size={14}/>{momentChoice&&pick(momentChoice.label,lang)}</p>}
        </div>}
        {!started?<div className="take-seat"><p><span>{t('target')}</span>{pick(scenario.goal,lang)}</p><div className="dinner-length" role="group" aria-label={t('practiceLength')}>{[8,12,18].map(n=><button key={n} aria-pressed={maxTurns===n} onClick={()=>setMaxTurns(n)}>{n} {t('turn')}</button>)}</div><button className="primary-button" onClick={()=>setStarted(true)} disabled={!!corrupt}>{t('start')}<ArrowRight size={18}/></button></div>:complete?<div className="take-seat complete-seat"><p><Check size={17}/>{t('finished')}</p><div className="dinner-finish-actions">{maxTurns<MAX_DINNER_TURNS&&<button className="primary-button" onClick={extendDinner}>{t('extendDinner').replace('{n}',String(nextDinnerLimit(maxTurns)-maxTurns))}<ArrowRight size={18}/></button>}<button className="text-button" onClick={()=>setModal('report')}>{t('end')}</button></div></div>:<form className={`reply-form ${draft.length>400?'has-long-draft':''}`} onSubmit={e=>{e.preventDefault();void submit();}}>
          <div className="reply-composer"><RecipientPicker scenario={scenario} lang={lang} value={targetId} disabled={busy} onChange={setTargetId}/><label className="sr-only" htmlFor="reply">{t('type')}</label><div className="input-wrap"><textarea id="reply" ref={input} value={draft} onChange={e=>{if(speech.notice)speech.cancel();setDraft(e.target.value);}} maxLength={500} placeholder={t('placeholder')} disabled={busy} readOnly={speech.active} aria-describedby="voice-status" rows={1} onKeyDown={e=>{if(shouldSubmitReply({...e.nativeEvent,key:e.key,shiftKey:e.shiftKey,ctrlKey:e.ctrlKey,metaKey:e.metaKey},matchMedia('(pointer: fine)').matches)){e.preventDefault();void submit();}}}/><button className={`voice-button ${speech.active?'is-listening':''}`} type="button" disabled={busy||!!corrupt||speech.phase==='stopping'} aria-label={t(speech.active?'voiceStop':'voiceStart')} aria-describedby="voice-status" aria-pressed={speech.active} onClick={()=>{if(speech.phase==='starting')speech.discardInterim();else if(speech.active)speech.stop();else {input.current?.blur();speech.start(draft);}}}>{speech.active?<Square size={16} fill="currentColor"/>:<Mic size={19}/>}</button><button className="primary-button speak-button" disabled={busy||speech.active||!draft.trim()||!!corrupt} type="submit">{busy?<><span className="busy-dot"/><span className="sr-only">{t('thinking')}</span></>:t('send')}</button></div></div>
          <div className="input-meta"><span className="reply-key-hint">{t('replyKeyHint')}</span>{draft.length>400&&<span>{draft.length}/500</span>}</div>
          <div className={`voice-status ${speech.active?'is-listening':''} ${speechIssue?'has-issue':''}`} id="voice-status" data-phase={speech.phase} role={speechIssue?'alert':'status'}><div className="voice-status-line">{speech.active&&<span className="voice-level" aria-hidden="true"><i/><i/><i/></span>}<span>{speech.active?t(speech.phase==='starting'?'voiceStarting':speech.phase==='stopping'?'voiceStopping':'voiceListening'):speech.notice?t(speechCopy[speech.notice]):t('voiceHint')}</span>{speech.active&&<button type="button" className="voice-cancel" aria-label={t('voiceCancel')} onClick={speech.discardInterim}><X size={15}/></button>}</div>{speech.interim&&<p className="voice-interim"><span className="sr-only">{t('voiceInterim')}：</span>{speech.interim}</p>}</div>
          {busy&&<p className="response-status" role="status">{t('thinking')}</p>}{error&&<p className="form-error" role="alert">{error}</p>}
        </form>}
        <div className="table-toolbar"><div className="turn-indicator"><span>{t('turn')} {String(turn).padStart(2,'0')}<i>/{String(maxTurns).padStart(2,'0')}</i></span></div><button className="mode-button" onClick={openModelSheet}><span className={`mode-dot ${model?'live':''}`}/>{model?t('live'):t('demo')}</button>{started&&!complete?<button className="text-button suggestion-toggle" onClick={()=>setSuggestionsOpen(v=>!v)} aria-expanded={suggestionsOpen} aria-controls="suggestions"><Lightbulb size={15}/>{t('needPrompt')}</button>:<span className="short-format">{pick(topicLabels[topic],lang)}</span>}</div>
        {suggestionsOpen&&started&&!complete&&<div className="suggestions" id="suggestions"><div className="suggestions-heading"><span>{t('suggestion')}</span><button className="icon-button" onClick={()=>setSuggestionsOpen(false)} aria-label={t('close')}><X size={16}/></button></div>{storyHint(topic,lang).map((s,i)=><button key={i} onClick={()=>{speech.cancel();setDraft(s);setSuggestionsOpen(false);input.current?.focus({preventScroll:true});}} disabled={busy}>{s}</button>)}</div>}
      </section>
    </main>

    {modal==='history'&&<ConversationHistory messages={messages} records={dinner.records} scenario={scenario} lang={lang} onClose={()=>setModal(null)} onExport={exportDinner} onReview={()=>setModal('report')}/>}
    {modal==='brief'&&<Modal title={t('tableBrief')} lang={lang} onClose={()=>setModal(null)}><p className="brief-scenario-title">{pick(scenario.title,lang)}</p><div className="brief-heading"><span>{t('target')}</span><span>{pick(scenario.category,lang)}</span></div><p className="goal">{pick(scenario.goal,lang)}</p><div className="cast-heading">{t('cast')}<span>3</span></div><div className="cast-list">{scenario.characters.map((c,i)=>{const reaction=reactions.find(r=>r.characterId===c.id);return <article className={`cast-person ${c.id===currentSpeakerId?'cast-active':''}`} key={c.id}><span className={`portrait portrait-${c.palette}`}><span className={`portrait-hair hair-${c.hair}`}/><span className="portrait-head"/><span className="portrait-body"/></span><div className="cast-details"><strong>{pick(c.name,lang)}<small>{pick(c.role,lang)}</small></strong><p>{pick(c.description,lang)}</p><span>{pick(emotions[reaction?.emotion??'neutral'],lang)} · {actorActionLabel(dinner,i,scenarioId,lang)??pick(gestures[reaction?.gesture??'idle'],lang)}</span><button className="text-button" disabled={!sceneReady} onClick={()=>{explore(()=>focusPerson(world,c.id));setSelectedId(c.id);setModal(null);}}>{t('lookAt')}<Crosshair size={14}/></button></div></article>;})}</div><p className="movement-guide">{t('movementAbout')}</p><p className="privacy-note">{t('local')}</p><div className="modal-actions"><button className="text-button" onClick={()=>setModal('about')}>{t('about')}</button>{started&&!complete&&<button className="text-button" disabled={busy||turn===0} onClick={()=>{setComplete(true);setModal('report');}}>{t('end')}</button>}<button className="primary-button" onClick={()=>setModal(null)}>{t('backToTable')}<ArrowRight size={17}/></button></div></Modal>}
    {modal==='about'&&<Modal title={t('aboutTitle')} lang={lang} onClose={()=>setModal(null)}><div className="about-content"><p>{t('aboutBody')}</p><p>{t('movementAbout')}</p><p>{t('voiceAbout')}</p><div className="about-mode"><div><strong>{model?t('live'):t('demo')}</strong><p>{t('modelAbout')}</p></div></div><h3>{t('source')}</h3><p>{t('sourceDetail')}</p><ul>{scenarios.map(s=><li key={s.id}>{pick(s.source.title,lang)}</li>)}</ul><p className="privacy-note">{t('privacyAbout')}</p></div></Modal>}
    {modal==='scenes'&&<Modal title={t('scenes')} lang={lang} onClose={()=>setModal(null)}><div className="scene-picker">{scenarios.map(s=><button className={`scene-choice ${nextScene===s.id?'chosen':''}`} aria-pressed={nextScene===s.id} key={s.id} onClick={()=>{setNextScene(s.id);setNextVariant(variantFor(s.id).id);}}><span className="scene-choice-top">{pick(s.category,lang)}<span>{nextScene===s.id&&<Check size={17}/>}</span></span><strong>{pick(s.room,lang)}</strong></button>)}</div><fieldset className="dinner-story-picker"><legend>{t('chooseOpening')}</legend>{variants.filter(v=>v.scene===nextScene).map(v=><button key={v.id} className="dinner-story-choice" aria-pressed={nextVariant===v.id} onClick={()=>setNextVariant(v.id)}><strong>{pick(v.title,lang)}</strong><span>{pick(v.setup,lang)}</span></button>)}</fieldset><div className="dinner-length" role="group" aria-label={t('practiceLength')}>{[8,12,18].map(n=><button key={n} aria-pressed={nextLength===n} onClick={()=>setNextLength(n)}>{n} {t('turn')}</button>)}</div>{turn>0&&<div className="switch-note"><p>{t('newDinner')}</p><button className="text-button" onClick={exportDinner}><Download size={15}/>{t('download')}</button></div>}<div className="modal-actions">{started&&!complete&&<button className="text-button" onClick={()=>setModal(null)}>{t('continue')}</button>}<button className="primary-button" onClick={()=>reset(nextScene,nextVariant,nextLength)}>{t('newStory')}<ArrowRight size={17}/></button></div></Modal>}
    {modal==='report'&&<Modal title={t('reportTitle')} lang={lang} wide onClose={()=>setModal(null)}><p className="report-intro">{t('reportIntro')}</p>{turn===0?<p className="report-empty">{t('reportEmpty')}</p>:<div className="evidence-list">{messages.flatMap((m,i)=>m.role==='user'?[<article key={i}><span className="evidence-number">{String((i+1)/2).padStart(2,'0')}</span><div><span className="evidence-label">{t('evidence')}</span>{m.heard&&<p className="spatial-evidence">{t('heardBefore')} · {pick(scenario.characters.find(c=>c.id===m.heard!.speakerId)!.name,lang)}：“{m.heard.text}”</p>}<blockquote>“{m.text}”</blockquote>{m.targetId&&<p className="spatial-evidence">{t('speakTo')}：{pick(scenario.characters.find(c=>c.id===m.targetId)!.name,lang)}</p>}{m.room&&<p className="spatial-evidence">{t('roomEvidence')}：{roomEvidence(m.room)}</p>}{m.dinner&&(m.dinner.phase!=='settled'||m.dinner.choice)&&<p className="spatial-evidence">{t('eventEvidence')}：{pick(activeEvent({...drama,active:m.dinner.eventId})!.title,lang)}{m.dinner.choice&&` · ${actionEvidence(m.dinner.previous.find(r=>r.eventId===m.dinner!.eventId&&r.choice===m.dinner!.choice)!,lang).action}`}</p>}<span className="evidence-label">{t('after')} · {pick(scenario.characters.find(c=>c.id===messages[i+1]?.speakerId)!.name,lang)}</span><p>“{messages[i+1]?.text}”</p><p className="stage-cue">{messages[i+1]?.cue}</p><div className="reaction-recap">{messages[i+1]?.reactions?.map(r=><span key={r.characterId}>{pick(scenario.characters.find(c=>c.id===r.characterId)!.name,lang)}：{pick(gestures[r.gesture],lang)}</span>)}</div></div></article>]:[])}</div>}{dinner.records.length>0&&<section className="action-evidence" aria-label={t('actionLog')}><h3>{t('actionLog')}</h3>{dinner.records.map(record=>{const evidence=actionEvidence(record,lang);return <article key={record.eventId}><small>{evidence.title}</small><p><Hand size={14}/>{evidence.action}</p>{evidence.reply&&<><small>{t('actionSaid')} · {pick(scenario.characters[evidence.speaker].name,lang)}</small><blockquote>“{evidence.reply}”</blockquote></>}<span>{evidence.cue}</span></article>;})}</section>}<p className="report-note">{t('reportNote')}</p><div className="modal-actions report-actions"><button className="text-button" onClick={exportDinner}><Download size={16}/>{t('download')}</button>{complete&&maxTurns<MAX_DINNER_TURNS&&<button className="text-button" onClick={extendDinner}>{t('extendDinner').replace('{n}',String(nextDinnerLimit(maxTurns)-maxTurns))}</button>}{complete?<button className="primary-button" onClick={()=>reset(scenarioId,variantId)}><RotateCcw size={16}/>{t('restart')}</button>:<button className="primary-button" onClick={()=>setModal(null)}>{t('continue')}<ArrowRight size={16}/></button>}</div></Modal>}
  </div>;
}
