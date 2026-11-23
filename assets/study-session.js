/*
 * HomeworkStudySession: a local study-session controller, independent of quiz timers.
 * create({window, document, storage, key, testMode, now, onChange, onAlert, onComplete, onRecord})
 *   startHomework({allowWindowed:false}) -> Promise<{started,state}>
 *   startClass(), requestFullscreen() -> Promise<boolean>, activity(), snapshot(),
 *   evaluate(now?), stop(), end(), dispose().
 * onChange/onComplete receive a detached snapshot. onAlert receives that snapshot
 * plus {reason,level}. active means homework monitoring is running; class is inactive.
 * pending means a new homework session is awaiting fullscreen or explicit windowed
 * consent. dispose removes listeners without deleting a session saved for reload.
 * initialState({now,mode,testMode,windowed}) and evaluateState(state,now) are pure;
 * evaluateState returns {state,alerts:[{reason,level}],completed}.
 * onRecord receives an epoch-timestamped, detached session record every 10 seconds
 * and at start/alerts/end/pagehide. Test accounts do not emit records. Observation
 * counts only callback intervals <=5 seconds; reload and lifecycle gaps are unknown.
 * Expiry across an unobserved boundary is interrupted/unobserved, not completed/timer.
 */
(function(global){
'use strict';
const DURATION_MS=30*60*1000,NOTICE_MS=10000,WARNING_MS=20000,REPEAT_MS=20000,RECORD_INTERVAL_MS=10000,OBSERVATION_GAP_MS=5000;
const copy=value=>({...value});
function initialState({now=Date.now(),mode='homework',testMode=false,windowed=false}={}){
 const active=mode==='homework';
 return {version:1,mode,active,testMode:!!testMode,windowed:!!windowed,pending:false,
  startedAt:active?now:null,deadline:active&&!testMode?now+DURATION_MS:null,
  remainingMs:active&&!testMode?DURATION_MS:null,elapsedMs:0,lastActivityAt:now,
  idleMs:0,idleLevel:'active',idleNoticeSent:false,idleWarningStep:0,
  hidden:false,fullscreen:false,fullscreenSupported:false,fullscreenRequested:false,
  fullscreenError:null,attention:null,completedAt:null};
}
function evaluateState(input,now=Date.now()){
 const state=copy(input),alerts=[];
 if(!state.active||state.mode!=='homework')return {state,alerts,completed:false};
 state.elapsedMs=Math.max(0,now-state.startedAt);
 state.remainingMs=state.deadline==null?null:Math.max(0,state.deadline-now);
 state.idleMs=Math.max(0,now-state.lastActivityAt);
 if(state.deadline!=null&&now>=state.deadline){
  Object.assign(state,{active:false,pending:false,remainingMs:0,completedAt:now,attention:null,idleLevel:'active'});
  return {state,alerts,completed:true};
 }
 state.idleLevel=state.idleMs>=WARNING_MS?'warning':state.idleMs>=NOTICE_MS?'notice':'active';
 // A hidden page or fullscreen guard already has its own warning. Do not stack alarms.
 if(state.hidden||state.attention==='fullscreen')return {state,alerts,completed:false};
 if(state.idleMs>=WARNING_MS){
  const step=1+Math.floor((state.idleMs-WARNING_MS)/REPEAT_MS);
  if(step>(state.idleWarningStep||0)){
   state.idleWarningStep=step;state.idleNoticeSent=true;
   alerts.push({reason:'idle-warning',level:'warning'});
  }
 }else if(state.idleMs>=NOTICE_MS&&!state.idleNoticeSent){
  state.idleNoticeSent=true;alerts.push({reason:'idle-notice',level:'notice'});
 }
 return {state,alerts,completed:false};
}
function create(options={}){
 const win=options.window||global,doc=options.document||win.document;
 const storage=options.storage||win.localStorage,key=options.key||'homework_study_session_v1';
 const clock=options.now||(()=>Date.now()),testMode=!!options.testMode;
 const managedTime=!!options.managedTime, observationLimit=managedTime?120*60000:DURATION_MS;
 const onChange=options.onChange||(()=>{}),onAlert=options.onAlert||(()=>{}),onComplete=options.onComplete||(()=>{}),onRecord=options.onRecord||(()=>{});
 const schedule=(fn,ms)=>win.setTimeout?win.setTimeout(fn,ms):setTimeout(fn,ms);
 const unschedule=id=>win.clearTimeout?win.clearTimeout(id):clearTimeout(id);
 let disposed=false,generation=0,ownedFullscreen=false,requestingFullscreen=false,audio=null,lastPersistAt=0;
 let titleBeforeAlert=null,lastAlertTitle=null,fullscreenWait=null;
 let telemetry=null,observationAt=null,observationHidden=false,observationSuspended=false,deadlineObserved=false,lastRecordAt=null,restoredSession=null;
 const listeners=[];
 const fullscreenElement=()=>doc.fullscreenElement||doc.webkitFullscreenElement||null;
 const isFullscreen=()=>!!fullscreenElement();
 const fullscreenMethod=()=>doc.documentElement?.requestFullscreen||doc.documentElement?.webkitRequestFullscreen;
 const hidden=()=>doc.hidden===true||doc.visibilityState==='hidden';
 const supported=()=>!!fullscreenMethod()&&doc.fullscreenEnabled!==false&&doc.webkitFullscreenEnabled!==false;
 let state=initialState({now:clock(),mode:null,testMode});
 try{
  const saved=JSON.parse(storage?.getItem(key)||'null');
  if(saved?.version===1&&saved.mode==='homework'&&saved.active&&Number.isFinite(saved.startedAt)&&
   (saved.deadline===null||Number.isFinite(saved.deadline))){
   const now=clock();
   state={...initialState({now,mode:'homework',testMode,windowed:!!saved.windowed}),
    startedAt:saved.startedAt,deadline:testMode||managedTime?null:(saved.deadline??saved.startedAt+DURATION_MS)};
   restoredSession=saved;
  }
 }catch(_){}
 function syncEnvironment(){
  state.hidden=hidden();state.fullscreen=isFullscreen();state.fullscreenSupported=supported();
  state.fullscreenRequested=ownedFullscreen;
  state.attention=state.active?(state.hidden?'hidden':!state.windowed&&!state.fullscreen?'fullscreen':null):null;
 }
 syncEnvironment();
 const newId=()=>String(win.crypto?.randomUUID?.()||('study_'+clock().toString(36)+'_'+Math.random().toString(36).slice(2)));
 function beginRecord(saved=null){
  if(testMode){telemetry=null;return;}
  const now=clock(),old=saved?.telemetry||{},elapsed=Math.max(0,Math.min(observationLimit,now-state.startedAt));
  const count=value=>Number.isFinite(value)&&value>=0?value:0;
  const visibleMs=Math.min(elapsed,count(old.visibleMs)),hiddenMs=Math.min(elapsed-visibleMs,count(old.hiddenMs));
  telemetry={version:1,id:typeof saved?.id==='string'?saved.id:typeof old.id==='string'?old.id:newId(),startedAt:state.startedAt,updatedAt:now,endedAt:null,status:'active',endReason:null,
   durationMs:observationLimit,managedTime,elapsedMs:elapsed,observedMs:visibleMs+hiddenMs,visibleMs,hiddenMs,unobservedMs:elapsed-visibleMs-hiddenMs,
   tabSwitches:Math.floor(count(old.tabSwitches)),idleNotices:Math.floor(count(old.idleNotices)),idleWarnings:Math.floor(count(old.idleWarnings)),fullscreenExits:Math.floor(count(old.fullscreenExits)),windowed:state.windowed,testMode:false};
  state.id=telemetry.id;observationAt=now;observationHidden=state.hidden;observationSuspended=false;deadlineObserved=false;lastRecordAt=null;
 }
 if(state.active)beginRecord(restoredSession);
 function recordSnapshot(now=clock()){
  if(!telemetry)return null;
  const end=telemetry.endedAt??now,elapsedMs=Math.max(0,Math.min(observationLimit,end-telemetry.startedAt));
  const visibleMs=Math.min(elapsedMs,telemetry.visibleMs),hiddenMs=Math.min(elapsedMs-visibleMs,telemetry.hiddenMs),observedMs=visibleMs+hiddenMs;
  return {...telemetry,elapsedMs,observedMs,visibleMs,hiddenMs,unobservedMs:Math.max(0,elapsedMs-observedMs),windowed:state.windowed};
 }
 function observe(now=clock()){
  if(!telemetry||telemetry.status!=='active')return;
  const previous=observationAt,interval=previous==null?Infinity:now-previous,deadline=state.deadline??telemetry.startedAt+observationLimit;
  if(!observationSuspended&&interval>=0&&interval<=OBSERVATION_GAP_MS){
   const amount=Math.max(0,Math.min(now,deadline)-Math.max(previous,telemetry.startedAt));
   telemetry[observationHidden?'hiddenMs':'visibleMs']+=amount;
   if(previous<deadline&&now>=deadline)deadlineObserved=true;
  }
  observationAt=now;observationHidden=state.hidden;
 }
 function publishRecord(force=false,now=clock()){
  if(disposed||!telemetry||testMode||(!force&&lastRecordAt!==null&&now-lastRecordAt<RECORD_INTERVAL_MS))return;
  telemetry.updatedAt=now;telemetry=recordSnapshot(now);lastRecordAt=now;persist(true);
  // A failing observer must not interrupt the quiz or its clock.
  try{onRecord({...telemetry});}catch(_){}
 }
 function endRecord(status,reason,now=clock()){
  if(!telemetry||telemetry.status!=='active')return;
  observe(now);telemetry.status=status;telemetry.endReason=reason;
  telemetry.endedAt=status==='completed'||status==='interrupted'?state.deadline??now:now;
  publishRecord(true,now);
 }
 function snapshot(){
  const result=copy(state),now=clock();
  if(result.active){result.elapsedMs=Math.max(0,now-result.startedAt);result.remainingMs=result.deadline==null?null:Math.max(0,result.deadline-now);result.idleMs=Math.max(0,now-result.lastActivityAt);}
  return result;
 }
 function notify(){if(!disposed)onChange(snapshot());}
 function persist(force=false){
  const now=clock();if(!force&&now-lastPersistAt<5000)return;lastPersistAt=now;
  try{if(state.active&&state.mode==='homework')storage?.setItem(key,JSON.stringify({version:1,mode:'homework',active:true,startedAt:state.startedAt,deadline:state.deadline,windowed:state.windowed,id:telemetry?.id,telemetry:recordSnapshot()}));else storage?.removeItem(key);}catch(_){}
 }
 function clearTitle(){
  if(lastAlertTitle!==null&&doc.title===lastAlertTitle)doc.title=titleBeforeAlert;
  lastAlertTitle=null;titleBeforeAlert=null;
 }
 function setTitle(message){
  if(titleBeforeAlert===null)titleBeforeAlert=doc.title||'';
  lastAlertTitle='⚠ '+message+' · '+titleBeforeAlert;doc.title=lastAlertTitle;
 }
 function unlockAudio(){
  try{
   const Audio=win.AudioContext||win.webkitAudioContext;
   if(!audio&&Audio)audio=new Audio();
   const resumed=audio?.resume?.();if(resumed?.catch)resumed.catch(()=>{});
  }catch(_){}
 }
 function beep(level){
  if(!audio||audio.state==='closed')return;
  try{
   const at=audio.currentTime,count=level==='warning'?2:1;
   for(let i=0;i<count;i++){
    const oscillator=audio.createOscillator(),gain=audio.createGain(),start=at+i*.19;
    oscillator.type='sine';oscillator.frequency.setValueAtTime(level==='warning'?720:520,start);
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.12,start+.015);gain.gain.exponentialRampToValueAtTime(.001,start+.13);
    oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(start);oscillator.stop(start+.15);
    oscillator.onended=()=>{try{oscillator.disconnect();gain.disconnect();}catch(_){}};
   }
  }catch(_){}
 }
 function alert(reason,level='warning'){
  if(disposed||!state.active)return;
  const metric={'hidden':'tabSwitches','idle-notice':'idleNotices','idle-warning':'idleWarnings','fullscreen-exit':'fullscreenExits'}[reason];
  if(telemetry&&metric){observe();telemetry[metric]++;publishRecord(true);}
  if(reason==='hidden')setTitle('숙제 화면으로 돌아와 주세요');
  else if(reason==='fullscreen-exit')setTitle('전체화면으로 돌아와 주세요');
  else if(reason.startsWith('idle-'))setTitle('숙제에 집중해 주세요');
  if(reason!=='idle-notice'&&reason!=='idle-warning')beep(level);
  onAlert({...snapshot(),reason,level});
 }
 function evaluate(now=clock()){
  if(disposed)return snapshot();
  observe(now);
  const result=evaluateState(state,now);state=result.state;
  if(result.completed){endRecord(deadlineObserved?'completed':'interrupted',deadlineObserved?'timer':'unobserved',now);persist(true);clearTitle();notify();onComplete(snapshot());return snapshot();}
  for(const item of result.alerts)alert(item.reason,item.level);
  if(state.active)publishRecord(false,now);
  notify();return snapshot();
 }
 function resetActivity(now=clock()){
  Object.assign(state,{lastActivityAt:now,idleMs:0,idleLevel:'active',idleNoticeSent:false,idleWarningStep:0});
 }
 function activity(){
  if(disposed||!state.active||state.mode!=='homework'||hidden())return;
  if(state.deadline!=null&&clock()>=state.deadline){evaluate();return;}
  observe();publishRecord();
  const changed=state.idleLevel!=='active'||state.idleNoticeSent||state.idleWarningStep>0;
  resetActivity();if(!state.attention)clearTitle();if(changed)notify();
 }
 function exitOwnedFullscreen(){
  if(!ownedFullscreen)return;
  ownedFullscreen=false;state.fullscreenRequested=false;
  if(fullscreenElement()!==doc.documentElement)return;
  try{const exit=doc.exitFullscreen||doc.webkitExitFullscreen;const result=exit?.call(doc);if(result?.catch)result.catch(()=>{});}catch(_){}
 }
 function resolveFullscreenWait(value){
  if(!fullscreenWait)return;const waiting=fullscreenWait;fullscreenWait=null;unschedule(waiting.timer);waiting.resolve(value);
 }
 async function requestFullscreen(){
  if(disposed)return false;
  unlockAudio();const ticket=generation;
  if(isFullscreen()){state.fullscreenError=null;syncEnvironment();notify();return true;}
  const request=fullscreenMethod();
  if(!supported()){
   state.fullscreenError='이 브라우저에서는 전체화면을 사용할 수 없어요.';syncEnvironment();notify();return false;
  }
  requestingFullscreen=true;state.fullscreenError=null;
  try{
   // Invoke in the click handler's synchronous stack before any await.
   const result=request.call(doc.documentElement);
   await result;
   if(!isFullscreen()&&result==null){
    await new Promise(resolve=>{fullscreenWait={resolve,timer:schedule(()=>resolveFullscreenWait(false),1500)};});
   }
   if(fullscreenElement()===doc.documentElement)ownedFullscreen=true;
   if(disposed||ticket!==generation){exitOwnedFullscreen();return false;}
   if(!isFullscreen())throw new Error('fullscreen-not-entered');
   state.fullscreenError=null;syncEnvironment();notify();return true;
  }catch(_){
   if(!disposed&&ticket===generation){state.fullscreenError='전체화면이 허용되지 않았어요. 다시 시도하거나 현재 화면에서 시작해 주세요.';syncEnvironment();notify();}
   return false;
  }finally{requestingFullscreen=false;}
 }
 async function startHomework({allowWindowed=false}={}){
  if(disposed)return {started:false,state:snapshot()};
  const ticket=++generation,wasActive=state.active&&state.mode==='homework';
  unlockAudio();
  // A retry resumes the same absolute deadline; it never grants another 30 minutes.
  if(!wasActive){state=initialState({now:clock(),mode:null,testMode});state.pending=true;syncEnvironment();}
  if(allowWindowed){state.windowed=true;state.fullscreenError=null;}
  else {
   const entered=await requestFullscreen();
   if(disposed||ticket!==generation)return {started:false,state:snapshot()};
   if(!entered){state.pending=true;syncEnvironment();if(wasActive)evaluate();else notify();return {started:false,state:snapshot()};}
  }
  if(disposed||ticket!==generation)return {started:false,state:snapshot()};
  if(wasActive){state.pending=false;if(!allowWindowed)state.windowed=false;resetActivity();syncEnvironment();persist(true);evaluate();if(state.active)publishRecord(true);}
  else {
   state=initialState({now:clock(),testMode,windowed:allowWindowed});if(managedTime){state.deadline=null;state.remainingMs=null;}syncEnvironment();beginRecord();persist(true);publishRecord(true);clearTitle();notify();
  }
  return {started:state.active,state:snapshot()};
 }
 function stop(mode=null){
  generation++;resolveFullscreenWait(false);
  endRecord('stopped',mode==='class'?'class':'manual');
  state=initialState({now:clock(),mode,testMode});exitOwnedFullscreen();syncEnvironment();persist(true);clearTitle();notify();return snapshot();
 }
 function startClass(){return stop('class');}
 function visibilityChanged(){
  if(disposed)return;observe();const wasHidden=state.hidden;syncEnvironment();observationHidden=state.hidden;
  if(!state.active)return;
  // An overdue session completes before a return warning or an idle reminder can fire.
  if(state.deadline!=null&&clock()>=state.deadline){evaluate();return;}
  if(state.hidden&&!wasHidden){alert('hidden');notify();}
  else if(!state.hidden&&wasHidden){resetActivity();clearTitle();syncEnvironment();alert('returned');notify();}
 }
 function fullscreenChanged(){
  if(disposed)return;observe();const wasFullscreen=state.fullscreen;
  if(fullscreenElement()!==doc.documentElement)ownedFullscreen=false;
  syncEnvironment();
  if(state.fullscreen){resolveFullscreenWait(true);state.fullscreenError=null;if(!state.hidden)clearTitle();}
  else if(wasFullscreen&&state.active&&!state.hidden&&!state.windowed&&!requestingFullscreen){alert('fullscreen-exit');}
  notify();
 }
 function listen(target,type,handler,settings){
  if(!target?.addEventListener)return;target.addEventListener(type,handler,settings);listeners.push(()=>target.removeEventListener(type,handler,settings));
 }
 const trustedActivity=event=>{if(event.isTrusted===true)activity();};
 for(const type of ['pointermove','pointerdown','keydown','scroll','touchstart','touchmove'])listen(doc,type,trustedActivity,{capture:true,passive:true});
 listen(doc,'visibilitychange',visibilityChanged);listen(doc,'fullscreenchange',fullscreenChanged);listen(doc,'webkitfullscreenchange',fullscreenChanged);
 listen(win,'pagehide',event=>{
  if(disposed||!state.active)return;observe();
  if(state.deadline!=null&&clock()>=state.deadline)evaluate();else publishRecord(true);
  // The account's Sync button dispatches pagehide solely to flush saved work.
  // Only the browser's real lifecycle event suspends observation until pageshow.
  if(event.isTrusted===false)return;
  observationSuspended=true;observationAt=null;
 });
 listen(win,'pageshow',()=>{
  if(disposed||!state.active)return;const returned=observationSuspended;
  observationSuspended=false;observationAt=clock();syncEnvironment();observationHidden=state.hidden;
  if(returned&&!state.hidden){resetActivity();clearTitle();}evaluate();
  if(returned&&state.active&&!state.hidden){alert('returned');notify();}
 });
 const timer=win.setInterval(()=>{if(state.active)evaluate();},1000);
 function dispose(){
  if(disposed)return;if(state.active){observe();publishRecord(true);}disposed=true;generation++;win.clearInterval(timer);resolveFullscreenWait(false);
  for(const remove of listeners)remove();clearTitle();
  try{const result=audio?.close?.();if(result?.catch)result.catch(()=>{});}catch(_){}
 }
 // Notify after create returns, so callers can safely assign the controller first.
 const initialTimer=schedule(()=>{if(!disposed){if(state.active)evaluate();else notify();}},0);
 return {startHomework,startClass,requestFullscreen,activity,snapshot,evaluate,stop:()=>stop(),end:()=>stop(),dispose:()=>{unschedule(initialTimer);dispose();}};
}
global.HomeworkStudySession={DURATION_MS,NOTICE_MS,WARNING_MS,REPEAT_MS,RECORD_INTERVAL_MS,OBSERVATION_GAP_MS,initialState,evaluateState,create};
})(typeof window==='undefined'?globalThis:window);
