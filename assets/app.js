/* 세 페이지의 공통 문제 엔진. 기존 문제와 기록 형식을 유지합니다. */
(function (global) {
'use strict';
function mount(options) {
const localStorage=options.storage||global.localStorage;
const sessionStorage=options.sessionStorage||global.sessionStorage;
const SETS = options.sets;
const untimed=options.testMode===true;
let manualSelection=false, pilotView=null, pilotActive=false;
const guidedActive=()=>!!options.guidedLearning&&!manualSelection;
const setsById=new Map(SETS.map(set=>[set.id,set]));
const setLoads=new Map();
let selectionTicket=0,prefetchTicket=0;
function loadSet(set,background=false){
  if(!set.dataFile||set._loaded)return Promise.resolve(set);
  const apply=()=>{
    const full=global.HOMEWORK_SET_DATA?.[set.id];
    if(!full?.parts?.length)throw new Error('문제 데이터가 없습니다.');
    Object.assign(set,full,{_loaded:true});return set;
  };
  if(global.HOMEWORK_SET_DATA?.[set.id])return Promise.resolve(apply());
  if(setLoads.has(set.dataFile))return setLoads.get(set.dataFile).then(apply);
  const promise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=set.dataFile;script.async=true;script.fetchPriority=background?'low':'high';
    script.onload=()=>resolve();
    script.onerror=()=>{script.remove();setLoads.delete(set.dataFile);reject(new Error('문제 파일을 불러오지 못했습니다.'));};
    document.head.appendChild(script);
  });
  setLoads.set(set.dataFile,promise);return promise.then(apply);
}
const legacySection=set=>set.name.match(/^(기초|기본|하|중|상|유형 심화)/)?.[1]||(/^\d+(~\d+)?문단$/.test(set.name)?'본문':'문제');
function prepareRelated(set){
  const ticket=++prefetchTicket;
  const related=SETS.filter(s=>s.id!==set.id&&s.dataFile&&(set.category?s.category===set.category:s.group===set.group&&(!practice?legacySection(s)===legacySection(set):true)));
  const next=async()=>{
    if(ticket!==prefetchTicket||!$('#scr-q').classList.contains('on'))return;
    const other=related.shift();if(!other)return;
    try{await loadSet(other,true);}catch(_){/* Background failures never interrupt the selected question. */}
    if(ticket===prefetchTicket)global.setTimeout(next,100);
  };
  global.requestAnimationFrame(()=>global.requestAnimationFrame(()=>global.setTimeout(next,250)));
}
const SHEET_URL = String(options.sheetUrl || '').trim();
const PREFIX = options.storagePrefix || 'bib_';
const practice = options.page !== 'legacy';
const escapeHTML = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $ = s => document.querySelector(s);
const shuffle = a => a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(p=>p[1]);
const pad = n => String(n).padStart(2,'0');
const stamp = d => new Date(d.getTime()+9*60*60*1000).toISOString().slice(0,19).replace('T',' ');

/* ---- 기기 코드 / 회차 ---- */
const UID_ALIASES={IQ0VMU:'IQ0VMU',HJ98I1:'IQ0VMU'};
const normalizeUid=u=>UID_ALIASES[u]||u;
function getUid(){
  if(options.uid){const uid=normalizeUid(options.uid);localStorage.setItem('bib_uid',uid);return uid;}
  let u = localStorage.getItem('bib_uid');
  if(!u){ u = Math.random().toString(36).slice(2,8).toUpperCase(); }
  u=normalizeUid(u);
  localStorage.setItem('bib_uid',u);
  return u;
}
const UID = getUid();
$('#uid').textContent = UID;
const attemptsKey = id => PREFIX+'attempts_'+id;
const getAttempts = id => +(localStorage.getItem(attemptsKey(id))||0);

/* ---- 진행 중인 풀이 저장 (세트별) ---- */
const contentKey = id => { const revision=setsById.get(id)?.revision; return (practice?'v'+(revision||1)+'_':revision===2?'v2_':'')+id; };
const runKey = id => PREFIX+'run_'+contentKey(id);
const retryKey = id => runKey(id)+'_retry';
const loadActiveRun = (id,retry=false) => {
  try{return global.HomeworkAttemptState.active(JSON.parse(localStorage.getItem(retry?retryKey(id):runKey(id))||'null'),JSON.parse(localStorage.getItem(PREFIX+'report_'+contentKey(id))||'null'));}catch(_){return null;}
};
const loadRun = id => loadActiveRun(id);
const loadRetry = id => loadActiveRun(id,true);
function saveRun(idx){
  if(!run||run.finished)return;
  const q=run.list[run.idx];
  const activeQuestion=q&&(!q._submitted||q._evidencePhase)?{id:q.id||q.pi+':'+q.qno,
    editorRevision:q.editorRevision,
    remainingMs:run.deadline==null?run.questionRemainingMs:Math.max(0,run.deadline-Date.now()),
    extraSeconds:run.extraSeconds||0,solveLimitSeconds:run.questionLimitSeconds||30,hintUsed:!!q._hintUsed,timeDecision:q._timeDecision||null,elapsedMs:(q._solveElapsedMs||0)+(run.qStart&&!q._evidencePhase&&!q._timeDecision?Math.max(0,Date.now()-run.qStart):0),choiceHelpUsed:!!q._choiceHelpUsed,eliminated:q._eliminated||[],evidence:q._evidencePhase?{...q._evidencePhase,remainingMs:run.deadline==null?q._evidencePhase.remainingMs:Math.max(0,run.deadline-Date.now())}:null}:null;
  localStorage.setItem(run.retry?retryKey(run.set.id):runKey(run.set.id), JSON.stringify({
    attempt:run.attempt, session:run.session, idx:(idx==null?run.idx+(run.list[run.idx]?._submitted&&!run.list[run.idx]?._evidencePhase?1:0):idx),
    order:run.list.map(q=>q.id || q.pi+':'+q.qno), logs:run.logs, startedAt:run.startedAt.toISOString(), studiedRefs:[...(run.studiedRefs||[])], readingStates:run.readingStates||{}, totalRemainingMs:run.totalRemainingMs, totalTimedOut:run.totalTimedOut, questionRemainingMs:run.questionRemainingMs, totalBonusSeconds:run.totalBonusSeconds||0, activeQuestion
  }));
}
const clearRun = id => localStorage.removeItem(runKey(id));
const lastKey = id => PREFIX+'last_'+contentKey(id);
const loadLast = id => { try{ return JSON.parse(localStorage.getItem(lastKey(id))||'null'); }catch(e){ return null; } };
const openKey = PREFIX+'open';
const loadOpen = () => { try{ return JSON.parse(sessionStorage.getItem(openKey)||'{}'); }catch(e){ return {}; } };
const saveOpen = o => { try{ sessionStorage.setItem(openKey, JSON.stringify(o)); }catch(e){} };
const wrongKey = id => PREFIX+'wrong_'+contentKey(id);
const loadWrong = id => { try{ return JSON.parse(localStorage.getItem(wrongKey(id))||'[]'); }catch(e){ return []; } };
const saveWrong = (id,arr) => { try{ arr.length ? localStorage.setItem(wrongKey(id), JSON.stringify(arr)) : localStorage.removeItem(wrongKey(id)); }catch(e){} };
const failureKey=set=>PREFIX+'failures_'+contentKey(set.id);
const questionKey=q=>q.id||q.pi+':'+q.qno;
function baseSolveSeconds(q){
  if(Number.isInteger(q.paragraphCount))return q.paragraphCount>=2?50:30;
  // Older homework labels identify paragraphs; sentence lines and a label such as '2문단' are not two paragraphs.
  const count=text=>Array.from(String(text||'').matchAll(/(\d+)(?:\s*[~∼–·,\-]\s*(\d+))?\s*문단/g)).reduce((n,m)=>n+(m[2]?Math.max(2,Math.abs(+m[2]-m[1])+1):1),0);
  const headings=Array.from(String(q.passage||'').matchAll(/(?:^|\n)\s*\[([^\]]+)\]/g));
  const paragraphs=Math.max(count(q.label),count(q.sourceLabel),headings.reduce((n,m)=>n+count(m[1]),0));
  return paragraphs>=2?50:30;
}
const validCount=n=>Number.isSafeInteger(n)&&n>0?n:0;
function loadFailures(set){try{const data=JSON.parse(localStorage.getItem(failureKey(set))||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch(_){return {};}}
function saveFailures(set,data){try{localStorage.setItem(failureKey(set),JSON.stringify(data));}catch(_){} }
function restoreKnownFailures(set){
  const data=loadFailures(set);let changed=false;
  for(const {pi,qi} of loadWrong(set.id)){
    const q=set.parts[pi]?.items[qi];if(!q)continue;
    const key=q.id||pi+':'+(qi+1);
    if(!validCount(data[key])){data[key]=1;changed=true;}
  }
  if(changed)saveFailures(set,data);
}
function countFailure(q){
  const data=loadFailures(run.set),key=questionKey(q);
  q._failureCount=Math.max(validCount(data[key]),q._failureCount||0)+1;
  data[key]=q._failureCount;saveFailures(run.set,data);
}

/* ---- 학습 모험: 모든 페이지가 공유하는 보상과 필수 복습 ---- */
const game=global.HomeworkGame.create(localStorage);
const gameKey=set=>options.page+'|'+contentKey(set.id);
game.reconcile(options.page,SETS.map(set=>({id:set.id,key:gameKey(set),resetReviewOnRevision:!!set.resetReviewOnRevision})));
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
const adventure=el('section','adventure');adventure.id='game-home';
const loadingStatus=el('p','set-loading-status');loadingStatus.id='set-loading-status';loadingStatus.hidden=true;loadingStatus.setAttribute('role','status');document.body.appendChild(loadingStatus);
const timeBackdrop=el('div','time-backdrop');timeBackdrop.setAttribute('aria-hidden','true');document.body.appendChild(timeBackdrop);
function clearTimeSignal(){delete document.body.dataset.timeStage;}
let homeGameState;
$('#scr-start header').after(adventure);
const helpPanel=el('section','question-help');helpPanel.id='question-help';helpPanel.setAttribute('aria-label','문제 도움');$('#q-body').after(helpPanel);
const tools=el('div','game-tools');tools.id='game-tools';helpPanel.appendChild(tools);
const hintBox=el('div','game-hint');hintBox.id='game-hint';hintBox.hidden=true;helpPanel.appendChild(hintBox);
const effect=el('div','hit-effect');effect.setAttribute('aria-hidden','true');document.body.appendChild(effect);
const rewardBox=el('section','adventure reward-panel');rewardBox.id='game-result';$('#e-wrongs').before(rewardBox);
const outcomeSummary=el('section','result-breakdown');outcomeSummary.id='e-breakdown';outcomeSummary.hidden=true;$('#e-meta').after(outcomeSummary);
const resultReview=el('section','result-review');resultReview.id='e-review';resultReview.hidden=true;
const resultReviewNote=el('p','result-review-note');resultReviewNote.id='e-review-note';
$('#e-retry').type='button';$('#e-retry').setAttribute('aria-describedby','e-review-note');
resultReview.append($('#e-retry'),resultReviewNote);outcomeSummary.after(resultReview);
const nextSetButton=el('button','act primary','다음 세트 풀기');nextSetButton.id='e-next-set';nextSetButton.type='button';
const nextTypeButton=el('button','act ghost','다음 유형 고르기');nextTypeButton.id='e-next-type';nextTypeButton.type='button';
$('#e-home').before(nextSetButton,nextTypeButton);
const guidedContinue=el('button','act primary','다음 학습 계속하기');guidedContinue.id='guided-continue';guidedContinue.type='button';guidedContinue.hidden=true;$('#e-home').before(guidedContinue);
const hardContinue=el('button','act ghost','하드 난이도 도전');hardContinue.id='hard-continue';hardContinue.type='button';hardContinue.hidden=true;guidedContinue.after(hardContinue);
const guidedStatus=el('section','guided-question-status');guidedStatus.id='guided-question-status';guidedStatus.hidden=true;$('#q-body').before(guidedStatus);
const answerDock=el('section','answer-dock');answerDock.id='answer-dock';answerDock.hidden=true;answerDock.setAttribute('aria-label','다음 문제로 이동');$('#q-fb').after(answerDock);
function resetAnswerDock(){const b=$('#q-next');if(b)$('#scr-q>.row-act').appendChild(b);answerDock.hidden=true;answerDock.replaceChildren();document.body.classList.remove('answer-reviewed','passage-review');}
function showAnswerDock(){answerDock.hidden=false;document.body.classList.add('answer-reviewed');answerDock.appendChild($('#q-next'));}
let audioContext=null,hitTimer=null,autoNextTimer=null,cancelAutoNext=null;
let studySession=null,studyQuizPause=null,studyDialog=null,pendingStudyAction=null,studyReturnNoticeUntil=0;
const daily=options.guidedLearning&&!untimed&&global.HomeworkDaily?.create({storage:localStorage,prefix:PREFIX,planFor:date=>options.dailyPlans?.planFor(date)});
const socratic=global.HomeworkSocratic,socraticCourses=options.guidedLearning&&socratic?(global.HomeworkSocraticCourses||[global.HomeworkSocraticContent]).filter(Boolean):[];
const pilots=socraticCourses.map(content=>socratic.create({storage:localStorage,prefix:PREFIX,content,onParagraph:p=>{
 if(!(p>0))return;// concept and application skills are not textbook paragraphs
 const state=studySession?.snapshot();if(state?.active&&state.mode==='homework'&&daily){const today=daily.finishParagraph({id:'unit22-l'+String(p).padStart(2,'0')+'-quick-basic',isQuickPractice:true});checkDailyFinish(today,state);paintHomeworkProgress(state,today);}
}}));
let pilot=pilots[0]||null;
if(pilots.length&&options.questionPatches)void options.questionPatches.refresh().then(records=>{socratic.applyEdits(socraticCourses,records);if(pilotActive)pilotView?.render();});
const pilotState=m=>socratic.read(localStorage,PREFIX,m.content);
// A course already in progress comes first; otherwise the course whose paragraphs the path reaches next.
function pilotFor(setId){return pilots.find(m=>{const s=pilotState(m);return s&&s.screen!=='summary';})||pilots.find(m=>socratic.shouldStart(pilotState(m),setId,m.content))||null;}
function duePilot(){return pilots.find(m=>socratic.summary(pilotState(m)).due.length)||null;}
function startPilot(recall=false,model=pilot){
 if(!model)return;pilot=model;manualSelection=false;if(run){clearInterval(run.timerId);pauseQuestionClock();saveRun();}run=null;
 show('#scr-q');pilotActive=true;document.body.classList.add('socratic-active');guidedStatus.hidden=true;$('#q-fb').replaceChildren();
 pilotView=global.HomeworkSocraticView.mount({root:$('#q-body'),model:pilot,onHome:saveStudyAndHome,onContinue:()=>{saveStudyAndHome();continueStudy(startGuided);}});
 pilot.start();if(recall&&pilot.state()?.screen==='summary')pilot.act({type:'recall'});pilotView.render();paintHomeworkProgress();
}
function renderPilotHome(home,next){
 const course=pilotFor(next?.set.id)||duePilot()||pilots[0];if(!course)return;const s=pilotState(course),m=socratic.summary(s),total=course.content.skills.length,card=el('section','guided-next socratic-home-card');card.id='socratic-home-card';
 card.append(el('small','','새 학습 · 2-2단원 '+(course.content.label||'1~3문단')),el('h3','','질문하며 읽기'),el('p','',m.started?'복습까지 확인한 문단 '+m.paragraphs.length+'/'+m.totalParagraphs+' · 남은 복습 '+m.pendingCount+' · 나중에 기억 확인 '+m.mastered+'/'+total+' · 새 과정 첫 정답 '+m.initialCorrect+'/'+total:'한 가지씩 묻고, 막히면 더 작은 질문으로 도와줘요. 질문 학습 뒤에는 본문 OX를 따로 풀어요.'));
 const row=el('div','intro-practice-actions');const b=el('button','act primary',m.started?'질문 학습 이어 하기':'질문 학습 시작하기');b.id='socratic-launch';b.onclick=()=>continueStudy(()=>startPilot(false,course));row.append(b);
 if(m.due.length){const recall=el('button','act ghost','기억 확인 '+m.due.length+'개');recall.onclick=()=>continueStudy(()=>startPilot(true,course));row.append(recall);}card.append(row);home.append(card);
 const practiceCard=el('section','guided-next');practiceCard.id='intro-ox-practice';
 practiceCard.append(el('small','','2-2단원 · 1~3문단'),el('h3','','본문 OX · 어휘 연습'),el('p','','본문 OX는 질문 학습과 따로 기록해요. 풀던 문제와 오답은 이어서 풀 수 있어요.'));
 const buttons=el('div','intro-practice-actions');
 const choices=[...global.HomeworkSocratic.covers.map((id,i)=>({id,label:i<3?(i+1)+'문단 OX':'1~3문단 묶음 OX'})),...SETS.filter(s=>s.isVocabularyPractice).map(s=>({id:s.id,label:s.name}))];
 for(const choice of choices){const set=setsById.get(choice.id);if(!set)continue;const total=set.parts.reduce((n,p)=>n+p.items.length,0),saved=loadRun(set.id),last=loadLast(set.id),pending=homeGameState.pendingReviews[gameKey(set)];
 const button=el('button','act ghost',choice.label+' · '+total+'문항'+(pending?' · 오답 복습':saved?' · 이어 풀기':last?' · 다시 풀기':''));button.type='button';button.dataset.introSet=set.id;
 button.onclick=()=>continueStudy(()=>{manualSelection=false;start(set,loadRun(set.id));});buttons.append(button);}
 practiceCard.append(buttons);home.append(practiceCard);
}
const dailyText=p=>p.rest?'오늘은 쉬는 날이에요.':p.done?'오늘 숙제 완료 · '+(p.reason==='paragraphs'?'문단 목표 달성':'학습 시간 목표 달성'):
 [p.goal.paragraphs?Math.min(p.paragraphs.length,p.goal.paragraphs)+' / '+p.goal.paragraphs+'문단':'',p.goal.minutes?Math.floor(p.timeMs/60000)+' / '+p.goal.minutes+'분':''].filter(Boolean).join(' 또는 ');
const homeworkCompletionNotices=new Set();
let homeworkCompletionTimer=null;
function notifyHomeworkCompletion(key,message){
 // Goal checks run every second; a dismissed notice must stay dismissed.
 if(homeworkCompletionNotices.has(key))return;
 homeworkCompletionNotices.add(key);
 global.clearTimeout(homeworkCompletionTimer);
 studyCompletion.textContent=message+' 풀던 문제는 계속 풀 수 있어요.';
 studyCompletion.hidden=false;
 homeworkCompletionTimer=global.setTimeout(()=>{studyCompletion.hidden=true;homeworkCompletionTimer=null;},5000);
 daily?.flush();
 logStudentEvent('homework-goal',message);
}
function checkDailyFinish(p,state){
 if(!p||!state?.active||(!p.done&&!p.rest))return;
 // Meeting a daily goal is a milestone, never a quiz/navigation event.
 // Keep the current answer, explanation, timer and review queue in place.
 notifyHomeworkCompletion('daily:'+p.date,p.rest?'오늘은 쉬는 날이에요.':dailyText(p));
}
function logStudentEvent(kind,label,control=''){
 if(untimed)return;
 try{
  const state=studySession?.snapshot(),at=Date.now(),id=global.crypto?.randomUUID?.()||at.toString(36)+'_'+Math.random().toString(36).slice(2);
  const q=run?.list?.[run.idx];
  const today=state?.active&&daily?.snapshot?.(at);
  const remainingMs=today?.goal.minutes?Math.max(0,today.goal.minutes*60000-today.timeMs):state?.remainingMs??null;
  const value={version:1,id,at,kind,label:String(label||'').replace(/\s+/g,' ').slice(0,1000),control:String(control||'').slice(0,120),mode:state?.mode||null,studySession:state?.id||null,remainingMs,fullscreen:!!state?.fullscreen,setId:run?.set?.id||null,qid:q?.id||null,questionIndex:run?run.idx+1:null};
  localStorage.setItem(PREFIX+'homework_event_v1_'+id,JSON.stringify(value));
 }catch(error){console.warn('학생 선택 기록 저장 실패',error);}
}
document.addEventListener('click',event=>{
 if(!event.isTrusted)return;
 const target=event.target.closest?.('button,a,summary,[role="button"],input[type="radio"],input[type="checkbox"]');
 if(target)logStudentEvent('choice',target.getAttribute('aria-label')||target.textContent||target.value,target.id||target.className);
},true);
document.addEventListener('change',event=>{
 const target=event.target;if(event.isTrusted&&target?.tagName==='SELECT')logStudentEvent('choice',target.selectedOptions?.[0]?.textContent,target.id);
},true);
for(const name of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(name,()=>{
 const active=!!(document.fullscreenElement||document.webkitFullscreenElement);
 if(logStudentEvent.lastFullscreen===active)return;logStudentEvent.lastFullscreen=active;
 logStudentEvent(active?'fullscreen-enter':'fullscreen-exit',active?'전체화면 진입':'전체화면 해제');
});
const studyBar=el('section','study-session-bar');studyBar.id='study-session-bar';studyBar.hidden=true;studyBar.setAttribute('aria-label','학습 모드와 숙제 시간');$('.wrap').prepend(studyBar);
const studyLabel=el('strong','study-session-label'),studyClock=el('span','study-session-clock'),studyNotice=el('p','study-session-notice');studyClock.id='study-session-clock';studyClock.setAttribute('role','timer');studyClock.setAttribute('aria-live','off');studyNotice.setAttribute('role','status');
const studyProgress=el('p','study-session-progress');studyProgress.id='study-session-progress';studyProgress.setAttribute('role','status');studyProgress.hidden=true;
const studyCompletion=el('p','study-session-completion');studyCompletion.id='study-session-completion';studyCompletion.setAttribute('role','status');studyCompletion.setAttribute('aria-live','polite');studyCompletion.hidden=true;
const studyExit=el('button','act ghost study-session-exit','숙제 종료');studyExit.type='button';studyExit.id='study-session-end';studyBar.append(studyLabel,studyClock,studyExit,studyProgress,studyCompletion,studyNotice);
function paintHomeworkProgress(state=studySession?.snapshot(),today){
 const active=state?.mode==='homework'&&(state.active||!!state.completedAt);
 if(active&&today===undefined)today=daily?daily.snapshot():undefined;  // 테스트 계정은 daily가 false다
 const lines=[];
 if(active&&today?.goal.paragraphs)lines.push('완료 문단 '+today.paragraphs.length+' / '+today.goal.paragraphs);
 if(active&&pilotActive&&pilot?.state()){const s=pilot.state();const k=s.content.skills[s.index];lines.push(s.mode==='combined'?(s.content.label||'1~3문단')+' 핵심 연결':'질문 학습 · '+(k.place||k.paragraph+'문단'));}
 if(active&&run&&$('#scr-q').classList.contains('on')){
  const q=run.list[run.idx],labels=[...new Set((q?.evidence?.sources||[]).map(source=>source.label).filter(label=>/^\d+문단$/.test(label)))];
  if(labels.length)lines.push((run.retry?'복습 중':q.type==='ox'?'지금 OX':'지금 푸는 문단')+' · '+labels.join(' · '));
 }else if(active&&run&&$('#scr-end').classList.contains('on')&&!run.retry){
  const paragraph=global.HomeworkDaily?.paragraphLabel(run.set.id);
  if(paragraph&&today?.paragraphs.includes(run.set.id))lines.push(paragraph.number+'문단 OX 완료');
 }
 const text=lines.join('  |  ');
 if(studyProgress.textContent!==text)studyProgress.textContent=text;
 studyProgress.hidden=!text;
}
function closeStudyDialog(){if(studyDialog){studyDialog.close();studyDialog.remove();studyDialog=null;}}
function openStudyDialog(kind,title,copy,actions){
 if(studyDialog?.dataset.kind===kind)return;
 closeStudyDialog();const dialog=el('dialog','study-session-dialog');dialog.id='study-session-dialog';dialog.dataset.kind=kind;
 const heading=el('h2','',title);heading.id='study-session-dialog-title';dialog.setAttribute('aria-labelledby',heading.id);dialog.append(heading,el('p','',copy));
 const row=el('div','study-dialog-actions');for(const [label,action,primary] of actions){const b=el('button','act '+(primary?'primary':'ghost'),label);b.type='button';b.onclick=action;row.appendChild(b);}dialog.appendChild(row);dialog.addEventListener('cancel',e=>e.preventDefault());document.body.appendChild(dialog);studyDialog=dialog;dialog.showModal();
}
function pauseStudyQuiz(){
 if(studyQuizPause||!run||!$('#scr-q').classList.contains('on'))return;
 const q=run.list[run.idx];if(!q)return;
 const state={run,q,timer:run.deadline!=null&&!q._timeDecision,auto:false};
 const pause=$('#q-review-pause');if(pause&&pause.getAttribute('aria-pressed')==='false'){pause.click();state.auto=true;}
 if(state.timer){pauseQuestionClock();clearInterval(run.timerId);if(q._evidencePhase&&!q._evidencePhase.paused)q._evidencePhase.remainingMs=run.questionRemainingMs;
  if(!q._evidencePhase&&!q._submitted){q._solveElapsedMs=(q._solveElapsedMs||0)+(run.qStart?Math.max(0,Date.now()-run.qStart):0);run.qStart=null;}run.deadline=null;
 }
 studyQuizPause=state;saveRun();
}
function resumeStudyQuiz(){
 const state=studyQuizPause;studyQuizPause=null;if(!state||run!==state.run||run.list[run.idx]!==state.q||!$('#scr-q').classList.contains('on'))return;
 if(state.timer){if(state.q._evidencePhase)startEvidenceTimer(state.q);else if(!state.q._submitted)startQuestionTimer(state.q);}
 const pause=$('#q-review-pause');if(state.auto&&pause?.getAttribute('aria-pressed')==='true')pause.click();
}
function saveStudyAndHome(){
 ++selectionTicket;loadingStatus.hidden=true;
 if(run&&$('#scr-q').classList.contains('on')){clearInterval(run.timerId);pauseQuestionClock();saveRun();}
 studyQuizPause=null;clearAutoNext();closeStudyDialog();renderStart();show('#scr-start');
}
function finishStudy(){pendingStudyAction=null;saveStudyAndHome();studySession?.end();}
studyExit.onclick=finishStudy;
function studyFullscreenPrompt(failed=false){
 const state=studySession?.snapshot();if(!state)return;
 openStudyDialog(failed?'fullscreen-failed':'fullscreen-return',failed?'전체화면을 열지 못했어요':'전체화면으로 돌아와 주세요',failed?'이 브라우저가 전체화면을 지원하지 않거나 요청을 허용하지 않았어요. 다시 시도하거나 현재 화면에서 숙제를 진행할 수 있어요.':'숙제는 전체화면으로 진행해요. 문제 시간과 자동 이동은 잠시 멈췄고, 숙제는 화면으로 돌아오면 이어져요.',[
  ['전체화면으로 '+(failed?'다시 시도':'돌아가기'),()=>launchStudy('homework',pendingStudyAction),true],
  ...(failed?[['이 화면에서 숙제 시작',()=>launchStudy('homework',pendingStudyAction,true),false]]:[]),
  ['수업으로 시작하기',()=>launchStudy('class',pendingStudyAction||(()=>startGuided())),false],
  ['숙제 종료',finishStudy,false]
 ]);
}
function paintStudySession(state){
 const working=state.mode==='homework'&&state.active&&!state.hidden&&(state.fullscreen||state.windowed)&&$('#scr-q').classList.contains('on');
 const today=daily?.tick?.(working);
 checkDailyFinish(today,state);
 studyBar.hidden=!state.mode;studyBar.dataset.mode=state.mode||'';document.body.classList.toggle('homework-session',state.mode==='homework'&&state.active);
 const completed=!!today?.done||!!state.completedAt;
 studyLabel.textContent=state.mode==='homework'?(completed?'숙제 목표 완료':'숙제 모드'):'수업 모드';
 const remaining=today?Math.max(0,today.goal.minutes*60000-today.timeMs):state.remainingMs;
 const shownMs=completed?(today?.timeMs??state.elapsedMs):remaining;
 const seconds=Math.max(0,completed?Math.floor((shownMs||0)/1000):Math.ceil((shownMs||0)/1000));
 const timerText=pad(Math.floor(seconds/60))+':'+pad(seconds%60);
 studyClock.textContent=state.mode==='homework'?(state.testMode?'테스트 · 시간 제한 없음':completed?'학습 시간 '+timerText:today?(today.goal.minutes?'남은 시간 '+timerText:'문단 목표로 진행 중'):timerText):'숙제 제한·집중 알림 없음';
 if(state.mode!=='homework'||(!completed&&!today?.rest))studyCompletion.hidden=true;
 paintHomeworkProgress(state,today);
 studyExit.hidden=state.mode!=='homework';
 const text=!state.active?'':state.hidden?'다른 탭으로 이동했어요. 숙제 화면으로 돌아와 주세요.':!state.fullscreen&&!state.windowed?'전체화면으로 돌아와 숙제를 이어 가세요.':state.idleLevel==='warning'?'20초 이상 활동이 없어요. 화면을 터치하거나 문제를 계속 풀어 주세요.':state.idleLevel==='notice'?'10초 동안 활동이 없어요. 읽고 있다면 화면을 한 번 터치해 주세요.':Date.now()<studyReturnNoticeUntil?'숙제 화면으로 돌아왔어요. 남은 내용에 다시 집중해 볼까요?':state.windowed?'현재 화면에서 숙제 중 · 전체화면 제한 없이 진행해요.':'';
 if(studyNotice.textContent!==text)studyNotice.textContent=text;studyNotice.hidden=!text;studyBar.dataset.attention=text?'true':'false';
 const blocked=state.mode==='homework'&&state.active&&(state.hidden||!state.fullscreen&&!state.windowed);
 if(blocked){pauseStudyQuiz();if(!state.hidden&&studyDialog?.dataset.kind!=='fullscreen-failed')studyFullscreenPrompt();}
 else{if(studyDialog?.dataset.kind==='fullscreen-return')closeStudyDialog();resumeStudyQuiz();}
}
async function launchStudy(mode,action,allowWindowed=false){
 if(mode==='homework'&&daily){
  const today=daily.snapshot();
  if(today.rest&&!studySession.snapshot().active){openStudyDialog('daily-complete','오늘의 숙제',dailyText(today),[['닫기',closeStudyDialog,true]]);return;}
  void options.dailyPlans?.refresh().then(()=>{if(!studySession.snapshot().active&&$('#scr-start').classList.contains('on'))renderStart();}).catch(()=>{});
 }
 logStudentEvent('mode-choice',mode==='class'?'수업으로 전환 선택':allowWindowed?'현재 화면에서 숙제 계속 선택':'전체화면 숙제 시작·복귀 선택');
 pendingStudyAction=action||pendingStudyAction;closeStudyDialog();
 if(mode==='class'){studySession.startClass();const nextAction=pendingStudyAction;pendingStudyAction=null;if(nextAction)nextAction();return;}
 const result=await studySession.startHomework({allowWindowed});
 if(!result.started){studyFullscreenPrompt(true);return;}
 closeStudyDialog();resumeStudyQuiz();const nextAction=pendingStudyAction;pendingStudyAction=null;if(nextAction)nextAction();
}
function continueStudy(action){
 const state=studySession?.snapshot();
 if(!studySession||state.mode==='class'||state.active||(state.mode==='homework'&&state.completedAt)){action();return;}
 openStudyDialog('choose-mode','어떤 방식으로 시작할까요?','숙제는 전체화면에서 오늘의 목표를 따라 진행해요. 수업은 기존 풀이 방식으로 진행해요.',[['숙제로 시작하기',()=>launchStudy('homework',action),true],['수업으로 시작하기',()=>launchStudy('class',action),false],['학습 현황으로',()=>{closeStudyDialog();renderStart();show('#scr-start');},false]]);
}
function clearAutoNext(){clearInterval(autoNextTimer);autoNextTimer=null;if(cancelAutoNext)cancelAutoNext();cancelAutoNext=null;}
function scheduleNext(ok,rewardSummary){
  clearAutoNext();
  if(untimed){answerDock.appendChild(el('p','manual-next-note','테스트 중 · 시간 제한과 자동 이동이 없어요. 해설을 확인한 뒤 ‘다음’을 누르세요.'));return;}
  const currentRun=run,q=run.list[run.idx],seconds=(q._evidenceResult?.selected?20:ok?5:10)+10*(q._failureCount||0);
  let remainingMs=seconds*1000,endsAt=Date.now()+remainingMs,paused=false,active=true,previous=-1;
  const message=el('div','auto-next-countdown');message.id='auto-next-countdown';
  const line=el('span','auto-next-line');line.setAttribute('role','status');line.setAttribute('aria-live','polite');message.appendChild(line);
  if(rewardSummary)message.appendChild(el('small','auto-next-rewards',rewardSummary));
  const pause=el('button','auto-next-pause','⏸ 해설 읽기 · 멈추기');pause.type='button';pause.id='q-review-pause';pause.setAttribute('aria-pressed','false');message.appendChild(pause);answerDock.appendChild(message);
  const isCurrent=()=>active&&run===currentRun&&run.list[run.idx]===q&&$('#scr-q').classList.contains('on');
  cancelAutoNext=()=>{active=false;pause.disabled=true;};
  const paint=left=>{
    message.classList.toggle('is-paused',paused);pause.setAttribute('aria-pressed',String(paused));
    pause.textContent=paused?'▶ 자동 이동 다시 시작':'⏸ 해설 읽기 · 멈추기';
    if(paused)line.textContent='자동 이동 멈춤 · 천천히 해설을 읽어 보세요.';
    else line.replaceChildren(el('strong','',String(left)),document.createTextNode('초 뒤 '+(run.idx+1===run.list.length?'결과 화면으로':'다음 문제로')+' 이동해요.'));
  };
  const tick=()=>{
    if(!isCurrent()){clearAutoNext();return;}
    const left=Math.max(0,Math.ceil((endsAt-Date.now())/1000));
    if(left!==previous){previous=left;paint(left);}
    if(left===0){clearAutoNext();next();}
  };
  pause.onclick=()=>{
    if(!isCurrent())return;
    if(paused){paused=false;endsAt=Date.now()+remainingMs;previous=-1;autoNextTimer=setInterval(tick,100);tick();}
    else{remainingMs=Math.max(0,endsAt-Date.now());paused=true;clearInterval(autoNextTimer);autoNextTimer=null;paint(Math.ceil(remainingMs/1000));}
  };
  autoNextTimer=setInterval(tick,100);tick();
}

function tone(ok){
  if(!game.state().sound)return;
  try{
    audioContext=audioContext||new (global.AudioContext||global.webkitAudioContext)();void audioContext.resume();
    const now=audioContext.currentTime;
    (ok?[523,659,784]:[220,165]).forEach((hz,i)=>{const o=audioContext.createOscillator(),g=audioContext.createGain();o.connect(g);g.connect(audioContext.destination);o.type='sine';o.frequency.value=hz;g.gain.setValueAtTime(0,now+i*.065);g.gain.linearRampToValueAtTime(.055,now+i*.065+.01);g.gain.exponentialRampToValueAtTime(.001,now+i*.065+.16);o.start(now+i*.065);o.stop(now+i*.065+.18);});
  }catch(_){}
}
function impact(ok,streak,gains){
  clearTimeout(hitTimer);effect.replaceChildren();effect.className='hit-effect '+(ok?'hit-good':'hit-wrong');
  const word=el('strong','hit-word',ok?(streak>=3?streak+' COMBO!':'정답 적중!'):'다시 도전!');if(ok){const detail=[gains.xp?'+'+gains.xp+' XP':'추가 XP 없음',gains.bonus?'💡 힌트권 +1장':'',gains.level?'Lv.'+gains.level+' 레벨 상승!':''].filter(Boolean).join(' · ');word.appendChild(el('small','hit-rewards',detail));}effect.appendChild(word);
  if(ok)for(let i=0;i<12;i++){const spark=el('i','hit-spark');spark.style.setProperty('--angle',(i*30)+'deg');spark.style.setProperty('--distance',(65+i%3*25)+'px');spark.style.setProperty('--color',['#f2b544','#30bfa0','#527fe6'][i%3]);effect.appendChild(spark);}
  void effect.offsetWidth;effect.classList.add('playing');
  $('#q-fb').classList.remove('impact-good','impact-wrong');void $('#q-fb').offsetWidth;$('#q-fb').classList.add(ok?'impact-good':'impact-wrong');
  hitTimer=setTimeout(()=>effect.classList.remove('playing'),850);tone(ok);
}
function chestControl(parent){
  const area=el('div','chest-area');
  const heading=el('strong','chest-heading','🎁 보물상자 열기');
  const help=el('p','chest-help');help.dataset.chestHelp='';
  const button=el('button','chest-button');button.type='button';
  const message=el('p','chest-message');message.setAttribute('role','status');
  function update(){const state=game.state();button.textContent=state.chests?'🎁 상자 1개 열기 · 남은 '+state.chests+'개':'🎁 아직 상자가 없어요';button.disabled=state.chests<1;
    area.classList.toggle('has-chests',state.chests>0);help.textContent=state.chests?'상자가 기다리고 있어요! 지금 열어서 힌트·시간 연장 아이템을 챙기고 출발해요.':options.guidedLearning?'복습 포함 단원·전체 진행률 60%·85%·100%에서 상자를 받아요.':'첫 풀이 60%부터 상자 지급! 해당 세트의 오답 복습까지 마치면 여기서 열 수 있어요.';}
  button.addEventListener('click',()=>{const prize=game.open();if(!prize){update();return;}message.textContent='✨ '+prize.label+' 획득!'+(game.state().chests?' 상자가 더 남았어요. 한 번 더 열어 볼까요?':' 도움 아이템을 챙겼어요. 모험을 이어 가요!');area.classList.remove('chest-open');void area.offsetWidth;area.classList.add('chest-open');tone(true);update();refreshWallet();});
  update();area.append(heading,help,button,message);parent.appendChild(area);
}
function refreshWallet(){
  const state=game.state();document.querySelectorAll('[data-wallet]').forEach(n=>n.textContent='💡 힌트 '+state.hints+' · ⏳ 연장 '+state.time+' · 🎁 상자 '+state.chests);
}
function renderAdventure(){
  const savedReviews=game.state().pendingReviews;
  for(const set of SETS){const wrong=loadWrong(set.id).length;if(wrong&&!savedReviews[gameKey(set)]){const last=loadLast(set.id);game.finish(gameKey(set),{page:options.page,setId:set.id,name:set.group+' · '+set.name,pct:last?.max?last.score/last.max*100:0,wrong});}}
  const state=game.state(),progress=game.progress(SETS.filter(s=>!s.isTypePractice).map(gameKey));adventure.replaceChildren();
  const badge=progress.pct===100?'🏆 만점 도전자 · 이 페이지 완주!':progress.pct>=80?'🏅 실전 준비 달인':progress.pct>=60?'🥈 기본기 탐험가':'🧭 오늘의 한 세트부터';
  adventure.appendChild(el('p','mastery-badge',badge));
  const heading=el('div','adventure-heading');heading.append(el('strong','','독해 모험 · Lv.'+(Math.floor(state.xp/100)+1)),el('span','xp-label',state.xp+' XP'));adventure.appendChild(heading);
  const wallet=el('p','wallet');wallet.dataset.wallet='';adventure.appendChild(wallet);
  const bar=el('div','mastery-track');const fill=el('i');fill.style.width=progress.pct+'%';bar.appendChild(fill);adventure.appendChild(bar);
  adventure.append(el('p','mastery-copy','이 페이지 시험 대비 달성도 '+progress.pct+'% · '+progress.done+'/'+progress.total+'세트 완주'),el('small','game-caption','세트의 모든 문항을 맞히고 오답 복습까지 끝내면 완주! 실제 시험 점수를 예측하는 수치는 아니에요.'));
  const rules=el('details','game-rules'),summary=el('summary','','모험 규칙과 보상');rules.append(summary,el('p','','첫 풀이 60% → 상자 1개 · 80% → 2개 · 100% → 3개. 같은 세트는 이전보다 높은 보상 단계에 도달한 만큼만 추가로 받아요. 해당 세트의 오답을 모두 다시 맞혀야 완주와 상자 보상을 받아요. 다른 세트의 진도와 오답은 각각 따로 보관해요.'),el('p','',untimed?'테스트에서는 시간 제한과 자동 이동 없이 문제와 해설을 확인할 수 있어요.':'첫 정답은 문항마다 10 XP, 3연속 정답마다 힌트권 1장! 같은 문항으로 보상을 반복해서 받지는 못해요. 처음에는 힌트권 2장과 연장권 1장을 드려요. 힌트 사용은 점수를 깎지 않아요. 기본 풀이는 한 문단 30초·두 문단 이상 50초이며, 같은 문항을 틀릴 때마다 다음 풀이에 10초씩 더 드려요. 연장권은 현재 문제에 30초를 더해요.'));adventure.appendChild(rules);
  const sound=el('button','sound-toggle',state.sound?'🔊 효과음 켜짐':'🔇 효과음 꺼짐');sound.type='button';sound.setAttribute('aria-pressed',String(state.sound));sound.onclick=()=>{const enabled=!game.state().sound;game.sound(enabled);sound.textContent=enabled?'🔊 효과음 켜짐':'🔇 효과음 꺼짐';sound.setAttribute('aria-pressed',String(enabled));if(enabled)tone(true);};adventure.appendChild(sound);
  for(const pending of game.reviews(options.page)){const lock=el('div','review-lock');lock.append(el('strong','','🔧 오답 복습이 남아 있어요'),el('p','',pending.name+' · 남은 오답 '+pending.wrong+'문항. 이 세트의 완주와 보상은 복습 후 확정돼요.'));const b=el('button','act primary',pending.name+' · 오답 이어 풀기');b.type='button';b.onclick=()=>openPending(pending.key);lock.appendChild(b);adventure.appendChild(lock);}
  chestControl(adventure);refreshWallet();
}
function openPending(key){
  const pending=key?game.pending(key):game.reviews(options.page)[0];if(!pending)return false;
  const set=SETS.find(s=>s.id===pending.setId);
  if(pending.page!==options.page||!set||pending.key!==gameKey(set))return false;
  if(!loadWrong(set.id).length){ // Older cloud summaries may omit individual answers: review the entire set.
    const all=[];set.parts.forEach((p,pi)=>p.items.forEach((_,qi)=>all.push({pi,qi})));saveWrong(set.id,all);
  }
  start(set,loadRetry(set.id),true);return true;
}
function renderTools(q){
  document.getElementById('time-help')?.remove();
  helpPanel.hidden=true;tools.hidden=true;
  tools.replaceChildren();hintBox.replaceChildren();hintBox.hidden=true;q._hintUsed=false;
  const actions=el('div','tool-actions');
  const hint=el('button','act hint-use',run.retry?'💡 복습 힌트 무료':'💡 힌트 쓰기');hint.type='button';hint.id='use-hint';hint.disabled=!run.retry&&game.state().hints<1;
  hint.onclick=()=>{
    if(!q._restoringHint&&run.deadline!=null&&Date.now()>=run.deadline){timeHelp(q);return;}
    if(q._submitted||q._hintUsed||(!run.retry&&!q._restoringHint&&!game.use('hints')))return;
    q._hintUsed=true;hint.disabled=true;hint.textContent='💡 힌트 사용함';hintBox.hidden=false;
    hintBox.append(el('strong','','무엇을 묻는 문제일까?'),el('p','',global.HomeworkGame.guide(q)));
    const existing=document.querySelectorAll('#q-body .hint');existing.forEach(n=>n.hidden=false);
    const reading=document.querySelector('#q-body .passage, #q-body .lines, #q-body .note, #q-body .sent, #q-body .pairbox .txt');
    if(reading){
      const candidates=Array.from(reading.querySelectorAll('.orig'));
      if(candidates.length){const index=global.HomeworkGame.evidenceIndex(q,candidates.map(n=>n.textContent));if(candidates[index])candidates[index].classList.add('hint-highlight');}
      else{
        // Highlight text nodes only, preserving selectable evidence and line breaks.
        const walker=document.createTreeWalker(reading,NodeFilter.SHOW_TEXT);const nodes=[];let node;
        while((node=walker.nextNode()))if(node.textContent.trim().length>18&&!node.parentElement.closest('b,mark'))nodes.push(node);
        const pieces=nodes.flatMap(n=>(n.textContent.match(/[^.!?。\n]+[.!?。]?/g)||[n.textContent]).map(text=>({node:n,text}))).filter(p=>p.text.trim().length>18&&!/^\[/.test(p.text.trim()));
        const selected=pieces[global.HomeworkGame.evidenceIndex(q,pieces.map(p=>p.text))];
        if(selected){const text=selected.node.textContent,at=text.indexOf(selected.text),fragment=document.createDocumentFragment();fragment.append(document.createTextNode(text.slice(0,at)));fragment.appendChild(el('mark','hint-highlight',selected.text));fragment.append(document.createTextNode(text.slice(at+selected.text.length)));selected.node.replaceWith(fragment);}
      }
      const excerpt=reading.querySelector('.hint-highlight');if(excerpt){hintBox.appendChild(el('strong','hint-reading-title','함께 볼 본문'));const quote=el('blockquote','hint-excerpt');quote.appendChild(el('mark','',excerpt.textContent));hintBox.appendChild(quote);}
      reading.closest('details')?.setAttribute('open','');hintBox.appendChild(el('small','','이 문장과 주장·선지를 비교해 보세요. 본문에도 같은 곳을 형광펜으로 표시했어요.'));
    }
    refreshWallet();const choice=$('#use-choice-help');if(choice)choice.disabled=q._choiceHelpUsed||game.state().hints<1;
  };
  const extend=el('button','act time-use','⏳ 30초 연장');extend.type='button';extend.id='use-time';
  extend.hidden=untimed;
  extend.disabled=game.state().time<1;extend.title='현재 문제의 제한 시간에 30초를 더해요';
  extend.onclick=()=>{
    if((q._submitted&&!q._evidencePhase)||q._evidencePhase?.paused||(!q._timeDecision&&run.deadline==null)||!game.use('time'))return;
    const expired=!!q._timeDecision;q._timeDecision=null;closeTimeDecision();clearTimeSignal();
    if(q._evidencePhase){q._evidencePhase.bonusMs=(q._evidencePhase.bonusMs||0)+30000;q._evidencePhase.remainingMs=(expired?0:Math.max(0,run.deadline-Date.now()))+30000;startEvidenceTimer(q);}
    else{run.extraSeconds=(run.extraSeconds||0)+30;if(expired){run.questionRemainingMs=30000;startQuestionTimer(q);}else{run.deadline+=30000;run.questionRemainingMs=Math.max(0,run.deadline-Date.now());}}
    extend.disabled=game.state().time<1;refreshWallet();saveRun(run.idx);
  };
  const eliminate=el('button','act choice-use','🧩 선지 2개 가리기 · 힌트권 1장');eliminate.type='button';eliminate.id='use-choice-help';eliminate.hidden=q.type!=='mc';
  eliminate.disabled=q._choiceHelpUsed||game.state().hints<1;eliminate.onclick=()=>{if(run.deadline!=null&&Date.now()>=run.deadline){timeHelp(q);return;}if(q._submitted||q._choiceHelpUsed||q.type!=='mc'||!game.use('hints'))return;const wrongs=shuffle(q.options.filter(o=>o!==q.answer));q._eliminated=wrongs.slice(0,2);q._choiceHelpUsed=true;applyChoiceHelp(q);eliminate.disabled=true;eliminate.textContent='🧩 선지 2개를 가렸어요';hint.disabled=q._hintUsed||(!run.retry&&game.state().hints<1);refreshWallet();saveRun(run.idx);document.getElementById('time-help')?.remove();};
  actions.append(hint,extend,eliminate);tools.appendChild(actions);refreshWallet();
}
function placeReadingControl(){
 const reading=$('#q-body .passage, #q-body .lines, #q-body .note');if(!reading)return;
 let button=$('#use-reading-size');if(!button){button=el('button','act reading-size reading-size-inline');button.id='use-reading-size';button.type='button';const paint=()=>{const large=document.body.classList.contains('large-reading');button.textContent=large?'🔎 크기 되돌리기':'🔎 지문 크게 보기';button.setAttribute('aria-pressed',String(large));};button.onclick=()=>{document.body.classList.toggle('large-reading');paint();};paint();}
 let heading=reading.querySelector(':scope>.reading-heading');if(!heading){heading=el('div','reading-heading');const title=reading.querySelector(':scope>b');if(title)heading.appendChild(title);reading.prepend(heading);}heading.appendChild(button);
}
function applyChoiceHelp(q){const valid=new Set((q._eliminated||[]).filter(o=>o!==q.answer));document.querySelectorAll('#q-body .pick').forEach(b=>{if(valid.has(b.textContent)){b.hidden=true;b.dataset.eliminated='true';}});}
function placeAnswerSupport(q){
 const picks=$('#q-body .picks');if(!picks)return;
 const support=el('div','answer-support');support.id='answer-support';
 const hint=$('#use-hint'),choice=$('#use-choice-help');if(hint)support.appendChild(hint);if(q.type==='mc'&&choice)support.appendChild(choice);support.appendChild(hintBox);picks.after(support);
 if(q.type==='ox'){
  const unknown=el('button','pick unknown-pick','? 모름');unknown.type='button';unknown.id='answer-unknown';unknown.title='정답과 해설을 확인하고 오답 복습에 추가해요';
  unknown.onclick=()=>{if(q._submitted||q._timeDecision)return;q._unknown=true;q._picked='?';picks.querySelectorAll('[aria-pressed]').forEach(b=>b.setAttribute('aria-pressed','false'));unknown.setAttribute('aria-pressed','true');submit('unknown');};picks.appendChild(unknown);
 }
}
function closeTimeDecision(){document.getElementById('time-expired-dialog')?.remove();const app=document.getElementById('app');if(app)app.inert=false;$('#q-body').inert=false;}
function timeHelp(q,evidence=false){
 if(untimed||q._evidencePhase?.paused||q._submitted&&!q._evidencePhase)return;
 if(!q._timeDecision){
  clearInterval(run.timerId);clearTimeSignal();run.deadline=null;
  if(evidence)q._evidencePhase.remainingMs=0;
  else{run.questionRemainingMs=0;q._solveElapsedMs=(q._solveElapsedMs||0)+(run.qStart?Math.max(0,Date.now()-run.qStart):0);run.qStart=null;}
  q._timeDecision=evidence?'evidence':'answer';saveRun(run.idx);
 }
 if(document.getElementById('time-expired-dialog'))return;
 const overlay=el('section','time-expired-overlay');overlay.id='time-expired-dialog';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','time-expired-title');
 const state=game.state(),canContinue=state.time>0||state.chests>0;
 const card=el('div','time-expired-card');card.append(el('h2','','시간이 끝났어요'));card.firstChild.id='time-expired-title';
 card.append(el('p','',evidence&&q._evidencePhase.failed?'처음 틀린 근거는 오답으로 기록되어 있어요. '+(canContinue?'시간을 더 받아 근거를 다시 확인할 수 있어요.':'정답 근거와 해설을 확인해 보세요.'):canContinue?'조금 더 풀거나 정답과 해설을 확인할 수 있어요. 아직 채점하지 않았어요.':'사용할 연장권과 상자가 없어요. 정답과 해설을 확인하고 복습에서 다시 도전해요.'));
 const wallet=el('p','expiry-wallet');wallet.dataset.wallet='';card.appendChild(wallet);const actions=el('div','expiry-actions');
 const add=(label,id,action)=>{const b=el('button','act primary',label);b.type='button';b.id=id;b.onclick=action;actions.appendChild(b);return b;};
 if($('#use-time'))$('#use-time').disabled=state.time<1;if(state.time>0)add('⏳ 30초 더 풀기 · 연장권 1장','expiry-extend',()=>$('#use-time').click());
 else card.appendChild(el('p','expiry-empty','사용할 연장권이 없어요.'));
 const hintButton=$('#use-hint');if(state.time>0&&hintButton&&!hintButton.disabled&&!q._hintUsed&&(run.retry||state.hints>0))add('⏳💡 30초 연장 + 힌트 같이 쓰기','expiry-extend-hint',()=>{$('#use-time').click();hintButton.click();});
 if(state.chests>0)add('🎁 상자 열고 아이템 받기','expiry-open-chest',()=>{const prize=game.open();if(prize){closeTimeDecision();$('#use-time').disabled=game.state().time<1;refreshWallet();timeHelp(q,evidence);$('#time-expired-title').after(el('p','journey-earned',prize.label+' 획득!'));}});
 const show=add(evidence?'근거 해설 보기':'정답과 해설 보기','expiry-reveal',()=>{q._timeDecision=null;closeTimeDecision();if(evidence)completeEvidence(q,null);else submit('questionTimeout');});show.className='act ghost';card.appendChild(actions);overlay.appendChild(card);document.body.appendChild(overlay);const app=document.getElementById('app');if(app)app.inert=true;refreshWallet();(actions.querySelector('button')||show).focus();
}

function resultAdventure(total,max,wrong){
  const outcome=game.finish(gameKey(run.set),{page:options.page,setId:run.set.id,name:run.set.group+' · '+run.set.name,pct:max?total/max*100:0,wrong,retry:run.retry,progressRewards:!!options.guidedLearning});
  const pending=game.pending(gameKey(run.set));rewardBox.replaceChildren();
  if(options.guidedLearning){
   const model=learningState(),unit=journeyUnit(model),gains=awardJourneyRewards(model),hard=isHardSet(run.set);
   rewardBox.append(el('h2','',hard?(pending?'하드 도전 · 남은 오답':'하드 구간 클리어!'):pending?'깃발을 세우기 전 · 복습 시간':'⚑ 구간 클리어!'),el('p','',hard?'하드 난이도는 선택 과정이에요. 오답은 여기서 복습하거나 나중에 이어 하고, 다음 단원의 숙제를 먼저 시작해도 돼요.':journeyCheer(model,unit)),el('p','',hard?'하드 진행 '+percent(unit.hard.progress*100):'단원 '+percent(unit.progress*100)+' · 연습 정답률 '+(unit.practiceAccuracy==null?'시작 전':percent(unit.practiceAccuracy))+' · 학습 기준 예상 '+percent(unit.expectedAccuracy)));
   if(gains.length)rewardBox.appendChild(el('p','journey-earned','🎁 '+gains.join(' · ')));
   rewardBox.appendChild(el('small','','단원·전체 코스 각각 복습 포함 60%·85%·100%에서 상자 누적 1·2·3개를 받아요.'));const wallet=el('p','wallet');wallet.dataset.wallet='';rewardBox.appendChild(wallet);chestControl(rewardBox);refreshWallet();return;
  }
  const pct=outcome.pct??pending?.pct??(total/max*100);const tier=pct>=100?3:pct>=80?2:pct>=60?1:0;
  rewardBox.append(el('h2','',pending?'🔒 오답을 수리하고 보물상자 받기':'✨ 세트 클리어!'),el('p','','첫 풀이 정답률 '+Math.round(pct)+'% · 보상 단계 '+tier+'/3'));
  rewardBox.append(el('p','',pending?'남은 오답 '+pending.wrong+'개를 모두 맞히면 보상과 다음 학습이 열려요. 복습 힌트는 무료예요.':outcome.gained?'🎁 보물상자 '+outcome.gained+'개 획득!':tier?'이 세트에서 이미 받은 단계의 상자예요. 더 높은 정답률에 도전해 보세요.':'오답 복습 완료! 첫 풀이 60%부터 보물상자를 받을 수 있어요.'));
  const wallet=el('p','wallet');wallet.dataset.wallet='';rewardBox.appendChild(wallet);chestControl(rewardBox);refreshWallet();
  const following=followingSet();
  $('#e-again').disabled=!!pending;nextSetButton.disabled=!!pending||!following;nextTypeButton.disabled=!!pending;
  nextSetButton.textContent=following&&following.level==='심화'&&run.set.level==='기본'?'심화 5지선다 도전':'다음 세트 풀기';
}
function followingSet(){
  const set=run.set,similar=SETS.filter(s=>(s.category||s.group)===(set.category||set.group)&&s.level===set.level),i=similar.findIndex(s=>s.id===set.id);return similar[i+1]||(set.level==='기본'?SETS.find(s=>s.category===set.category&&s.level==='심화'&&(!options.units||s.unitId===set.unitId&&s.unitType==='advanced')):null)||null;
}
nextSetButton.onclick=()=>{if(game.pending(gameKey(run.set))){openPending(gameKey(run.set));return;}const set=followingSet();if(set)start(set,loadRun(set.id));};
nextTypeButton.onclick=()=>{
  if(game.pending(gameKey(run.set))){openPending(gameKey(run.set));return;}
  if(options.units){goUnit(selectedUnit);return;}
  if(options.categories){const at=options.categories.indexOf(run.set.category);practiceFilter.category=options.categories[(at+1)%options.categories.length];sessionStorage.setItem(filterKey,JSON.stringify(practiceFilter));}
  renderStart();show('#scr-start');(options.categories?$('#practice-filters'):$('#sets')).scrollIntoView({block:'start'});
};

/* ---- 페이지별 전송 큐 ---- */
const sync = global.HomeworkSync.create({ storage:localStorage, key:PREFIX+'queue', sheetUrl:SHEET_URL, uid:UID, normalizeUid, onChange:updateSync });
const readQ = () => sync.readRows();
const enqueue = payload => sync.enqueue(payload);
const flush = () => sync.flush();
function updateSync(){
  const state=sync.state();
  document.querySelectorAll('.syncbox').forEach(el=>{
    el.textContent=state.storageError || (!state.configured
      ? '시트 연결 전입니다. 풀이 기록은 이 기기에 보관됩니다.'+(state.pending?' · 보관 중 '+state.pending+'건':'')
      : state.pending ? '전송 대기 '+state.pending+'건 · 연결되면 자동으로 다시 보냅니다.' : '기록이 모두 전송되었습니다.');
    el.classList.toggle('pending',state.pending>0 || !!state.storageError);
  });
}

/* ---- 두 기기에서 같은 회차 기록 불러오기 ---- */
let cloudHistoryLoading=false;
async function loadCloudHistory(){
  if(cloudHistoryLoading || !options.history || !global.HomeworkSync.isEndpoint(SHEET_URL)) return;
  cloudHistoryLoading=true;
  try{
    const url=new URL(SHEET_URL); url.searchParams.set('action','history'); url.searchParams.set('uid',UID);
    const response=await fetch(url.toString());
    const data=await response.json();
    if(!data || data.ok!==true || !Array.isArray(data.rows)) return;
    const setsByLabel=new Map(SETS.map(set=>[set.group+' · '+set.name,set]));
    let changed=false;
    const cloudCounts=new Map();
    const cloudLatestNewer=new Set();
    const uniqueRows=new Map();
    data.rows.forEach(row=>{
      if(String(row.set||'').includes('(오답)')) return;
      uniqueRows.set([row.session,row.set,row.attempt].join('|'),row);
    });
    const latestRows=new Map();
    uniqueRows.forEach(row=>{
      const set=setsByLabel.get(String(row.set||''));
      if(!set) return;
      cloudCounts.set(set.id,(cloudCounts.get(set.id)||0)+1);
      const score=Number(row.score), max=Number(row.max);
      if(!Number.isFinite(score)||!Number.isFinite(max)) return;
      const endedAt=String(row.endedAt||'');
      const current=loadLast(set.id);
      const parsed=Date.parse(endedAt);
      const currentParsed=current&&current.at ? Date.parse(String(current.at).replace(' ','T')) : -1;
      if(!current || (Number.isFinite(parsed)&&parsed>currentParsed)){
        cloudLatestNewer.add(set.id);
        try{ localStorage.setItem(lastKey(set.id),JSON.stringify({score,max,at:endedAt})); changed=true; }catch(e){}
      }
      const previous=latestRows.get(set.id);
      if(!previous || parsed>Date.parse(String(previous.endedAt||''))) latestRows.set(set.id,row);
    });
    cloudCounts.forEach((count,id)=>{ if(count>getAttempts(id)){ try{ localStorage.setItem(attemptsKey(id),String(count)); changed=true; }catch(e){} } });
    latestRows.forEach((row,id)=>{
      const set=SETS.find(s=>s.id===id);
      if(!set || !cloudLatestNewer.has(id)) return;
      const wrong=[]; const seen=new Set(); let matchedAnswers=0;
      (data.answers||[]).forEach(answer=>{
        if(answer.session!==row.session || answer.set!==row.set) return;
        matchedAnswers++;
        if(Number(answer.score)>=Number(answer.max)) return;
        const pi=set.parts.findIndex(part=>part.name===answer.part), qi=Number(answer.qno)-1;
        if(pi<0 || qi<0 || qi>=set.parts[pi].items.length) return;
        const key=pi+':'+qi; if(!seen.has(key)){ seen.add(key); wrong.push({pi,qi}); }
      });
      if(matchedAnswers){ saveWrong(id,wrong); changed=true; }
    });
    if(changed && $('#scr-start').classList.contains('on')) renderStart();
  }catch(e){ /* 기록 서버가 아직 새 버전이 아니면 다음 시작 때 다시 시도 */ }
  finally{ cloudHistoryLoading=false; }
}

/* ---- 시작 화면 ---- */
function show(id){ if(pilotActive){pilotView?.destroy();pilotView=null;pilotActive=false;document.body.classList.remove('socratic-active');}closeTimeDecision();clearAutoNext();resetAnswerDock();document.getElementById('time-help')?.remove();document.body.classList.remove('quick-comparison');clearTimeSignal();++prefetchTicket;clearAutoNext();effect.classList.remove('playing');clearTimeout(hitTimer);document.body.classList.remove('split-question');document.body.classList.toggle('units-home',!!options.units&&id==='#scr-start');document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on')); $(id).classList.add('on'); paintHomeworkProgress(); window.scrollTo(0,0); }
function renderStart(){
  renderAdventure();
  homeGameState=game.state();
  document.body.classList.toggle('guided-study',guidedActive());adventure.hidden=guidedActive();$('.page-nav').hidden=guidedActive();
  if(guidedActive()){renderGuidedHome();return;}
  if(options.units){renderUnitStart();if(options.testMode&&manualSelection){const back=el('button','act ghost','자동 학습 화면으로');back.id='test-close-library';back.onclick=()=>{manualSelection=false;renderStart();};$('#sets').prepend(back);}return;}
  if(options.startLayout==='sets'){
    const box=$('#sets');box.replaceChildren();
    const heading=document.createElement('h2');heading.textContent='고급 혼합 · 30문항';box.appendChild(heading);
    const tiles=document.createElement('div');tiles.className='tiles';
    SETS.forEach(set=>tiles.appendChild(makeSetCard(set)));box.appendChild(tiles);
    return;
  }
  if(practice){ renderPracticeStart(); return; }
  $('#sets').innerHTML = '';
  const cats = [];
  const topCategory = set => set.cat==='비유법' ? '개념어' : set.cat.replace(/^(\d+단원) 지문$/, '$1');
  SETS.forEach(set=>{
    const category=topCategory(set);
    let c=cats.find(x=>x.name===category); if(!c){ c={name:category, groups:[]}; cats.push(c); }
    let g=c.groups.find(x=>x.name===set.group); if(!g){ g={name:set.group, sets:[]}; c.groups.push(g); } g.sets.push(set);
  });
  const categoryOrder=['1단원','2단원','3단원','4단원','5단원','개념어'];
  cats.sort((a,b)=>{
    const ai=categoryOrder.indexOf(a.name),bi=categoryOrder.indexOf(b.name);
    return (ai<0?categoryOrder.length:ai)-(bi<0?categoryOrder.length:bi);
  });
  cats.forEach(c=>{
  const cbox=document.createElement('div'); cbox.className='cat'; cbox.innerHTML='<h2>'+c.name+'</h2>';
  c.groups.forEach(g=>{
    const box=document.createElement('div'); box.className='grp';
    box.innerHTML='<h3>'+g.name+'</h3>';
    const chapOf = set => /^\d+(~\d+)?문단$/.test(set.name) ? '본문' : /^기초/.test(set.name) ? '기초' : /^기본/.test(set.name) ? '기본'
                       : /^하/.test(set.name) ? '하' : /^중/.test(set.name) ? '중' : /^상/.test(set.name) ? '상' : /^유형 심화/.test(set.name) ? '유형 심화' : '문제';
    const ORDER=['본문','기초','기본','하','중','상','유형 심화','문제'];
    const chaps={}; g.sets.forEach(set=>{ (chaps[chapOf(set)]=chaps[chapOf(set)]||[]).push(set); });
    const opened=loadOpen();
    ORDER.filter(k=>chaps[k]).forEach(k=>{
      const list=chaps[k];
      const ch=document.createElement('div'); ch.className='chap'; const key=g.name+'|'+k;
      if(opened[key]) ch.classList.add('open');
      let sc=0, mx=0, done=0; list.forEach(set=>{ const r=loadLast(set.id); if(r){ sc+=r.score; mx+=r.max; done++; } });
      const pct = mx ? Math.round(sc/mx*100) : null;
      const btn=document.createElement('button'); btn.type='button'; btn.className='chap-btn';
      btn.innerHTML='<span class="arrow">▶</span><span class="nm">'+k+'</span><span class="cnt">'+list.length+'세트'+(done?' · '+done+'개 풀었음':'')+'</span>'
        +'<span class="acc '+(pct==null?'':(pct>=85?'good':(pct<65?'bad':'')))+'">'+(pct==null?'미풀이':'정답률 '+pct+'%')+'</span>';
      btn.addEventListener('click', ()=>{ ch.classList.toggle('open'); const o=loadOpen(); o[key]=ch.classList.contains('open'); saveOpen(o); });
      const body=document.createElement('div'); body.className='chap-body';
      const tiles=document.createElement('div'); tiles.className='tiles'; body.appendChild(tiles);
      ch.append(btn, body); box.appendChild(ch);
    list.forEach(set=>{
    tiles.appendChild(makeSetCard(set));
    });
    });
    cbox.appendChild(box);
  });
  $('#sets').appendChild(cbox);
  });
}

function learningState(){return global.HomeworkLearningPath.build({sets:SETS,units:options.units||[],storage:localStorage,prefix:PREFIX,page:options.page});}
function startGuided(){if(diagnosisPending()){startDiagnosis(diagnosisLeft()[0].id,'ten');return;}const model=learningState(),target=model.next;const chosen=pilotFor(target?.set.id);if(chosen){startPilot(false,chosen);return;}const due=duePilot();if(due){startPilot(true,due);return;}if(!target){renderStart();show('#scr-start');return;}manualSelection=false;document.body.classList.add('guided-study');if(target.kind==='review'){if(target.pending&&openPending(target.pending.key))return;start(target.set,target.retry,true);}else start(target.set,target.normal);}
function isHardSet(set){return !!set&&global.HomeworkLearningPath.isHardSet(set);}
function startHard(unitId){
 const unit=learningState().steps.find(u=>u.id===unitId),target=unit?.hard?.next;
 if(!unit?.hard?.unlocked||!target){renderStart();show('#scr-start');return;}
 manualSelection=false;document.body.classList.add('guided-study');
 if(target.kind==='review'){if(target.pending&&openPending(gameKey(target.set)))return;start(target.set,target.retry,true);}else start(target.set,target.normal);
}
function percent(value){return (Math.floor(value*10+1e-7)/10).toLocaleString('ko-KR',{maximumFractionDigits:1})+'%';}
function journeyUnit(model,set=run?.set){return model.steps.find(u=>u.id===set?.unitId)||model.current;}
function journeyChapter(unit,set=run?.set){return unit.chapters.find(c=>c.id===set?.readingBlock)||unit.chapters.find(c=>!c.done)||unit.chapters.at(-1);}
function journeyCheer(model,unit=journeyUnit(model)){
 if(model.phase==='supplement')return '본문 깃발을 모두 세웠어요! 이제 단원별 보충과 남은 복습으로 24문항 중 20문항 목표를 향해 마무리해요.';
 const done=unit.chapters.filter(c=>c.done).length,current=journeyChapter(unit);
 if(unit.done)return unit.id+'단원 본문 클리어! 4문항 중 3문항 목표에 한 걸음 가까워졌어요. 다음 월드로 출발해요!';
 if(model.next?.kind==='review')return '틀린 부분까지 바로잡는 중이에요. 복습을 마친 내용만 깃발에 반영돼요. 이번 구간도 끝낼 수 있어요!';
 return (current?.progress?'이번 '+(current.index+1)+'챕터 '+percent(current.progress*100)+'까지 왔어요. ':'첫 구간부터 한 걸음씩 시작해요. ')+(done?'챕터 '+done+'개를 마쳤고 ':'')+'이 단원은 '+(4-done)+'챕터 남았어요. 4문항 중 3문항을 노려 봐요!';
}
function awardJourneyRewards(model){
 if(!options.guidedLearning)return [];
 const earned=[];for(const unit of model.steps.filter(u=>u.ready)){const reward=game.stage('journey:'+options.page+':unit:'+unit.id,unit.progress);if(reward.gained)earned.push(unit.id+'단원 '+percent(unit.progress*100)+' · 상자 +'+reward.gained);}
 const globalReward=game.stage('journey:'+options.page+':all',model.progress);if(globalReward.gained)earned.push('전체 코스 '+percent(model.progress*100)+' · 상자 +'+globalReward.gained);
 return earned;
}
function renderStageMap(model,home){
 const unit=model.current,map=el('section','stage-map');map.id='stage-map';
 map.append(el('small','world-caption','WORLD '+(model.steps.indexOf(unit)+1)+' · '+unit.id+'단원'),el('h2','',model.phase==='supplement'?'마지막 코스 · 단원별 보충 자료':unit.ready?'네 개의 챕터를 따라 출발!':'다음 월드 준비 중'));
 const road=el('ol','stage-road');
 const active=unit.chapters.find(c=>!c.done);
 for(const chapter of unit.chapters){const node=el('li','stage-node'+(chapter.done?' cleared':chapter===active&&unit.ready?' active':' locked'));node.dataset.chapter=chapter.id;node.dataset.chapterState=chapter.done?'cleared':chapter===active&&unit.ready?'current':'waiting';
  const marker=el('div','stage-marker',chapter.done?'⚑':String(chapter.index+1));marker.setAttribute('aria-hidden','true');
  node.append(marker,el('small','stage-label','CHAPTER '+(chapter.index+1)),el('strong','',chapter.title),el('span','stage-state',chapter.done?'복습까지 클리어':chapter.ready?percent(chapter.progress*100)+' 진행':'자료 준비 중'));
  const bar=el('progress');bar.max=1;bar.value=chapter.progress;bar.setAttribute('aria-label',(chapter.index+1)+'챕터 진행률');node.appendChild(bar);road.appendChild(node);
 }
 map.appendChild(road);home.appendChild(map);
}
/* ---- 진단 셋트(시범): 단원 자료에 진단 문장 묶음이 있을 때만 보입니다. 셋트는 학습 경로 챕터를 따르고, 규칙은 assets/diagnosis.js. ---- */
const diagnosisUnit=options.units?.find(u=>u.diagnosis),diagnosisMeta=diagnosisUnit?.diagnosis,diagnosisPool=diagnosisMeta&&{id:diagnosisMeta.setId,dataFile:diagnosisMeta.dataFile};
const diagnosisGroups=diagnosisMeta?.groups||[],diagnosisKey=PREFIX+'diagnosisSets_'+(diagnosisPool?.id||'');
const diagnosisSetId=(gid,mode)=>global.HomeworkDiagnosis.setId(diagnosisPool.id,gid,mode);
function loadDiagnosis(){let v={};try{v=JSON.parse(localStorage.getItem(diagnosisKey)||'{}')||{};}catch(_){}v.groups=v.groups||{};return v;}
function saveDiagnosis(value){try{localStorage.setItem(diagnosisKey,JSON.stringify(value));}catch(_){}}
const diagnosisGroup=(state,gid)=>state.groups[gid]||{};
const saveDiagnosisGroup=(state,gid,patch)=>saveDiagnosis({...state,groups:{...state.groups,[gid]:{...diagnosisGroup(state,gid),...patch}}});
async function startDiagnosis(gid,mode){
 try{await loadSet(diagnosisPool);}catch(_){loadingStatus.textContent='진단 문제를 불러오지 못했어요. 다시 눌러 주세요.';loadingStatus.hidden=false;return;}
 const D=global.HomeworkDiagnosis,state=loadDiagnosis(),g=diagnosisGroup(state,gid),saved=g.current?.[mode],resume=saved&&loadRun(diagnosisSetId(gid,mode));
 // 새 판은 모든 셋트에서 지난번에 놓친 함정을 먼저 낸다.
 const missed=Object.values(state.groups).flatMap(x=>D.missedTwists(x.last));
 const plan=resume?saved:mode==='ten'?D.session(diagnosisPool,{group:gid,seen:state.seen,missed}):D.review(diagnosisPool,g.last,{seen:state.seen});
 if(!plan)return;
 if(!resume){clearRun(diagnosisSetId(gid,mode));saveDiagnosisGroup(state,gid,{current:{...g.current,[mode]:plan}});}
 manualSelection=false;start(D.build(diagnosisPool,plan),resume||null);
}
// 답할 때마다: 틀리면 판 끝에 다시 풀 문장을 붙이고, 함정마다 갈래 확인 문장을 바로 다음에 낸다. 이어 풀기를 위해 판을 저장한다.
function diagnosisOnAnswer(q,ok){
 const plan=run.set.diagnosisPlan,state=loadDiagnosis(),{redo,insert}=global.HomeworkDiagnosis.onAnswer(diagnosisPool,plan,q,ok,{seen:state.seen});
 if(redo)run.list.push({...redo,qno:run.list.length+1,max:1});
 if(insert.length)run.list.splice(run.idx+1,0,...insert.map((x,k)=>({...x,qno:run.list.length+k+1,max:1})));
 saveDiagnosisGroup(state,plan.group,{current:{...diagnosisGroup(state,plan.group).current,[plan.mode]:plan}});
}
// 숙제로 정한 날부터, 셋트를 모두 한 판씩 마칠 때까지 '오늘의 숙제'로 먼저 낸다.
const koreaDay=()=>global.HomeworkDaily?.day(Date.now())||new Date(Date.now()+9*3600000).toISOString().slice(0,10);
function diagnosisLeft(){const from=diagnosisMeta?.homeworkFrom,state=loadDiagnosis();return diagnosisGroups.filter(g=>!(diagnosisGroup(state,g.id).doneDays||[]).some(d=>d>=from));}
function diagnosisPending(){const from=diagnosisMeta?.homeworkFrom;return !!(diagnosisPool&&global.HomeworkDiagnosis&&diagnosisGroups.length&&from&&koreaDay()>=from&&diagnosisLeft().length);}
function renderDiagnosisHomework(home){
 const left=diagnosisLeft(),next=left[0],card=el('section','guided-next diagnosis-homework');card.id='diagnosis-homework';
 card.append(el('small','','선생님이 정한 숙제'),el('h3','',diagnosisUnit.id+'단원 · 진단 '+diagnosisGroups.length+'셋트'),
  el('p','','셋트마다 그 부분 내용을 물어요. 틀리면 확인 문제가 나오고, 틀린 문제는 끝에서 맞힐 때까지 다시 풀어요. '+diagnosisGroups.length+'셋트를 모두 마치면 숙제 끝이에요.'),
  el('p','diagnosis-line',diagnosisGroups.map(g=>g.name+' '+g.count+'문제'+(left.includes(g)?'':' ✓')).join(' · ')));
 const label=loadRun(diagnosisSetId(next.id,'ten'))?'숙제 이어 하기 · '+next.name:(left.length<diagnosisGroups.length?'다음 셋트 · ':'숙제로 시작하기 · ')+next.name;
 const b=el('button','act primary',label);b.type='button';b.id='diagnosis-homework-start';b.onclick=()=>launchStudy('homework',()=>startDiagnosis(next.id,'ten'));
 card.appendChild(b);home.appendChild(card);
}
function renderDiagnosisCard(home){
 if(!diagnosisPool||!global.HomeworkDiagnosis||!diagnosisGroups.length)return;
 const state=loadDiagnosis(),card=el('section','hard-course unlocked diagnosis-course');card.id='diagnosis-course';
 card.append(el('small','','시범 · 진단 셋트'),el('h3','',diagnosisUnit.id+'단원 · 왜 틀리는지 알아보기'),el('p','','학습 경로 셋트마다 그 부분 내용을 물어요. 틀리면 그 문장에 든 함정마다 확인 문제가 나와요. 갈래를 모두 맞히면 +1로 만회하고, 틀린 문제는 판 끝에서 맞힐 때까지 다시 풀어요.'));
 for(const g of diagnosisGroups){
  const s=diagnosisGroup(state,g.id),last=s.last,row=el('div','diagnosis-set');row.dataset.group=g.id;
  row.appendChild(el('p','diagnosis-line',g.name+' · '+g.count+'문제'+(last?' · 지난 판 '+last.max+'점 중 '+last.got+'점':'')));
  const add=(label,id,mode)=>{const b=el('button','act ghost',label);b.type='button';b.id=id;b.onclick=()=>continueStudy(()=>startDiagnosis(g.id,mode));row.appendChild(b);};
  const resumeTen=s.current?.ten&&loadRun(diagnosisSetId(g.id,'ten')),resumeReview=s.current?.review&&loadRun(diagnosisSetId(g.id,'review')),misses=last?last.slots.filter(x=>!x.first).length:0;
  add(resumeTen?'이어 풀기':'풀기','diagnosis-start-'+g.id,'ten');
  if(resumeReview||misses)add(resumeReview?'복습 이어 풀기':'틀린 '+misses+'문제 다른 유형으로 복습','diagnosis-review-'+g.id,'review');
  card.appendChild(row);
 }
 home.appendChild(card);
}
function paintDiagnosisResult(){
 const D=global.HomeworkDiagnosis,plan=run.set.diagnosisPlan,gid=plan.group,result=D.score(plan,run.logs),state=loadDiagnosis(),g=diagnosisGroup(state,gid),wasPending=diagnosisPending();
 const seen=[...new Set([...(state.seen||[]),...run.logs.map(l=>String(l.qid||'').replace(/#다시\d+$/,'')).filter(Boolean)])],current={...g.current};delete current[plan.mode];
 const doneDays=plan.mode==='ten'?[...new Set([...(g.doneDays||[]),koreaDay()])]:g.doneDays||[];
 saveDiagnosis({...state,seen,groups:{...state.groups,[gid]:{...g,current,doneDays,last:{...result,mode:plan.mode,group:gid,at:Date.now()}}}});
 const meta=diagnosisGroups.find(x=>x.id===gid),name=meta?meta.name+' · ':'',box=el('section','hard-course unlocked diagnosis-result');box.id='diagnosis-result';
 box.append(el('small','',name+(plan.mode==='ten'?'셋트 결과':'다른 유형 복습 결과')),el('h3','',result.max+'점 중 '+result.got+'점'));
 const list=el('ul');D.describe(result).forEach(t=>list.appendChild(el('li','',t)));box.appendChild(list);
 const left=diagnosisPending()?diagnosisLeft():[],misses=result.slots.filter(s=>!s.first).length;
 if(wasPending&&!left.length)box.appendChild(el('p','diagnosis-line','오늘 숙제 끝! '+diagnosisGroups.length+'셋트를 모두 마쳤어요.'));
 const add=(label,id,group,mode,primary)=>{const b=el('button','act '+(primary?'primary':'ghost'),label);b.type='button';b.id=id;b.onclick=()=>continueStudy(()=>startDiagnosis(group,mode));box.appendChild(b);};
 if(left.length)add('다음 셋트 · '+left[0].name+' →','diagnosis-next-set',left[0].id,'ten',true);
 if(misses)add('틀린 '+misses+'문제 다른 유형으로 복습'+(left.length?'':' →'),'diagnosis-review-now',gid,'review',!left.length);
 add('이 셋트 새로 풀기','diagnosis-next-ten',gid,'ten',!left.length&&!misses);
 $('#e-rows').replaceChildren();
 logStudentEvent('diagnosis',name+(plan.mode==='ten'?'셋트':'복습')+' · '+result.max+'점 중 '+result.got+'점 · '+D.describe(result).join(' · '));
 $('#scr-end .result').before(box);
}
function renderHardCourses(model,home){
 const courses=model.steps.filter(u=>u.hard?.sets.length&&(u.hard.unlocked||u.id===model.current.id));if(!courses.length)return;
 const section=el('section','hard-courses');section.id='hard-courses';section.setAttribute('aria-label','선택형 하드 난이도');
 for(const unit of courses){const hard=unit.hard,card=el('div','hard-course'+(hard.unlocked?' unlocked':''));card.dataset.hardUnit=unit.id;
  card.append(el('small','',hard.unlocked?'HARD · 선택 도전':'HARD · 잠김'),el('h3','',unit.id+'단원 하드 난이도'),el('p','',hard.unlocked?'기본 4챕터 완료! 심화 5지선다에 도전할 수 있어요. 하드를 마치지 않아도 다음 단원의 숙제를 할 수 있어요.':'기본 4챕터와 그 오답 복습을 마치면 열려요. 먼저 문단별 기본 문제를 차례로 풀어요.'));
  if(hard.unlocked){card.appendChild(el('span','hard-progress','하드 '+percent(hard.progress*100)+(hard.done?' · 복습까지 완료':' 진행')));if(hard.next){const button=el('button','act ghost',unit.id+'단원 하드 '+(hard.next.kind==='new'?'도전하기':hard.next.kind==='review'?'복습하기':'이어서 하기'));button.type='button';button.dataset.hardStart=unit.id;button.onclick=()=>continueStudy(()=>startHard(unit.id));card.appendChild(button);}}
  else {const locked=el('button','act ghost','기본 4챕터 완료 후 해금');locked.type='button';locked.disabled=true;card.appendChild(locked);}section.appendChild(card);
 }home.appendChild(section);
}
function renderGuidedHome(){
 document.body.classList.add('units-home');
 const model=learningState(),current=model.current,next=model.next,box=$('#sets');const gains=awardJourneyRewards(model);box.replaceChildren();$('#practice-links').hidden=true;$('#practice-filters').hidden=true;
 $('#page-title').textContent='기말고사 깨부수기';$('#page-intro').textContent='한 챕터씩 깃발을 세워요. 본문 모험과 마지막 복습으로 24문항 중 20문항을 노려 봐요!';
 const home=el('section','guided-home');home.id='guided-home';
 if(daily){const today=daily.snapshot(),card=el('section','guided-next');card.id='daily-homework-goal';card.append(el('h3','','오늘의 숙제 · '+today.date),el('p','',dailyText(today)));home.appendChild(card);}
 if(diagnosisPending())renderDiagnosisHomework(home);
 const ladder=el('ol','exam-ladder');model.steps.forEach((step,i)=>{const item=el('li','exam-step'+(step.id===current.id?' current':'')+(step.done?' done':''));item.dataset.examStep=step.id;if(step.id===current.id)item.setAttribute('aria-current','step');item.append(el('span','step-number',String(i+1)),el('strong','',step.id+'단원'),el('small','',step.done?'본문 클리어':step.ready?(step.id===current.id?'모험 중':'다음 월드'):'준비 중'));ladder.appendChild(item);});home.appendChild(ladder);
 renderPilotHome(home,model.next);
 renderStageMap(model,home);
 const stats=el('div','journey-stats');
 const values=[['progress','이 단원 진행',percent(current.progress*100),'복습까지 확인한 내용'],['accuracy','연습 첫 정답률',current.practiceAccuracy==null?'—':percent(current.practiceAccuracy),current.practiceAccuracy==null?'첫 구간을 풀면 표시돼요':'실제 첫 풀이 기록 · 복습 점수 제외'],['estimate','학습 기준 예상',percent(current.expectedAccuracy),'단원 완주 목표 3/4 · 진행률 환산']];
 for(const [key,title,value,note] of values){const card=el('div','journey-stat');card.dataset.journeyMetric=key;card.append(el('small','',title),el('strong','',value),el('span','',note));stats.appendChild(card);}home.appendChild(stats);
 const overall=el('section','journey-overall');overall.append(el('strong','','전체 '+model.chaptersDone+' / 24챕터 클리어'),el('span','','남은 '+(24-model.chaptersDone)+'챕터 · 마지막 단원별 보충 '+model.steps.filter(u=>u.supplementDone).length+' / 6코스'),el('p','','전체 코스 '+percent(model.progress*100)+' · 학습 기준 예상 '+percent(model.expectedAccuracy)+' · 최종 목표 20/24'));
 overall.appendChild(el('small','estimate-note','예상치는 학습 진도를 목표 정답률에 환산한 동기부여 지표이며, 실제 시험 성적을 확정하지 않아요.'));home.appendChild(overall);
 const cheer=el('p','journey-cheer',journeyCheer(model,current));cheer.setAttribute('role','status');home.appendChild(cheer);
 if(gains.length)home.appendChild(el('p','journey-earned','🎁 '+gains.join(' · ')));
 if(game.state().chests)chestControl(home);
 if(next){const card=el('section','guided-next'),chapter=journeyChapter(current,next.set);card.append(el('small','',next.kind==='review'?'깃발을 세우기 전 · 필수 복습':model.phase==='supplement'?'마지막 코스 · '+current.id+'단원 보충 자료':next.kind==='resume'?'풀던 구간부터 이어가요':'자동으로 정한 다음 구간'),el('h3','',(course=>course?(course.content.label||'1~3문단')+' · 질문하며 읽기':next.set.name.replace(/\s*10문제/,' 연습'))(pilotFor(next.set.id))),el('p','',model.phase==='supplement'?'본문 밖 개념을 따로 정리하는 시간이에요.':(chapter.index+1)+'챕터 · '+chapter.title));
  const list=el('ul','guided-knowledge');global.HomeworkLearningPath.knowledge(next.set,next.kind).forEach(text=>list.appendChild(el('li','',text)));card.append(el('h4','','시작 전에 알아두기'),list);
  const actions=el('div','study-start-actions');actions.id='study-start-actions';
  const button=el('button','act primary','숙제로 시작하기');button.id='guided-start';button.type='button';button.onclick=()=>launchStudy('homework',startGuided);
  const classButton=el('button','act ghost','수업으로 시작하기');classButton.id='guided-class-start';classButton.type='button';classButton.onclick=()=>launchStudy('class',startGuided);
  actions.append(button,classButton);card.append(actions,el('p','study-mode-guide',daily?'오늘의 문단 목표 또는 학습 시간 목표를 채우면 알려 드려요. 풀던 문제는 계속 풀 수 있어요.':'숙제: 전체화면 · 30분 달성 안내 · 탭 이동 알림 / 수업: 숙제용 제한 없이 진행'));home.appendChild(card);
 }else home.appendChild(el('p','guided-complete',model.phase==='complete'?'본문과 보충 복습까지 완주! 이제 24문항 중 20문항 목표에 도전해 봐요.':'다음 '+current.id+'단원 자료를 준비 중이에요. 준비되면 모험이 자동으로 이어집니다.'));
 renderHardCourses(model,home);
 renderDiagnosisCard(home);
 const rewards=el('details','journey-rules');rewards.append(el('summary','','상자와 예상 정답률은 어떻게 올라가나요?'),el('p','','현재 단원과 전체 코스 각각 복습 포함 진행률 60%에서 상자 누적 1개, 85%에서 2개, 100%에서 3개를 받아요. 새 단계에 오른 만큼만 지급해요. 정답률은 단계 전에도 조금씩 표시돼요.'),el('p','','단원 예상치는 본문 진도를 3/4(75%) 목표에 연속 환산해요. 전체는 일곱 단원의 본문으로 18/24, 마지막 보충과 복습으로 2/24를 더해 20/24 목표에 도달하는 학습 지표예요. 실제 연습 정답률은 별도로 표시해요.'));home.appendChild(rewards);
 const supplements=el('details','supplement-world');supplements.id='supplement-world';supplements.append(el('summary','','맨 마지막 코스 · 단원별 보충 자료'),el('p','','본문 일곱 월드를 먼저 지나고 비판적 읽기·인문·예술 개념과 남겨 둔 유형 복습을 차례로 정리해요. 기존 기록은 유지됩니다.'));
 for(const u of model.steps){const row=el('p');row.append(el('strong','',u.id+'단원 보충 자료'),el('span','',u.ready?(u.supplementDone?' · 복습 완료':' · 본문 코스 뒤에 공부해요'):' · 자료 준비 중'));supplements.appendChild(row);}home.appendChild(supplements);
 if(options.testMode){const manual=el('button','act ghost','문제를 골라서 테스트');manual.id='test-open-library';manual.type='button';manual.onclick=()=>{manualSelection=true;renderStart();};home.appendChild(manual);}
 if(!game.state().chests)chestControl(home);box.appendChild(home);
}
function paintGuidedStatus(){guidedStatus.hidden=!guidedActive();if(!guidedActive())return;const model=learningState(),s=journeyUnit(model),chapter=journeyChapter(s),hard=isHardSet(run.set);const gains=awardJourneyRewards(model);
 guidedStatus.replaceChildren(el('strong','',s.id+'단원 · '+(hard?'하드 난이도 · 선택 도전':model.phase==='supplement'?'보충 자료':(chapter.index+1)+'챕터 '+percent(chapter.progress*100))),el('span','',hard?'하드를 끝내지 않아도 다음 단원의 기본 숙제를 할 수 있어요.':'단원 '+percent(s.progress*100)+' · 연습 정답률 '+(s.practiceAccuracy==null?'시작 전':percent(s.practiceAccuracy))+' · 학습 기준 예상 '+percent(s.expectedAccuracy)));
 const wallet=el('small','chapter-wallet');wallet.dataset.wallet='';guidedStatus.appendChild(wallet);refreshWallet();
 if(gains.length){const note=el('p','journey-earned','🎁 '+gains.join(' · '));$('#q-fb').appendChild(note);refreshWallet();}
 if(run?.list[run.idx]?._submitted&&!run.list[run.idx]?._evidencePhase){$('#q-fb').appendChild(el('p','journey-cheer',journeyCheer(model,s)));}
}
function paintGuidedContinuation(){
 guidedContinue.hidden=!guidedActive();hardContinue.hidden=true;if(!guidedActive())return;
 const model=learningState(),target=model.next,unit=journeyUnit(model),hard=unit.hard;
 guidedContinue.textContent=target?(target.set.unitId!==run.set.unitId?target.set.unitId+'단원 숙제 시작하기':target.kind==='review'?'필수 복습하고 계속하기':model.phase==='supplement'?'단원 보충 자료 이어 하기':'다음 구간 계속하기'):'학습 현황으로';guidedContinue.onclick=()=>continueStudy(startGuided);
 if(hard?.unlocked&&hard.next&&!(hard.next.kind==='review'&&hard.next.set.id===run.set.id)){
  hardContinue.hidden=false;hardContinue.textContent=unit.id+'단원 하드 '+(isHardSet(run.set)?'계속하기':'도전하기')+' · 선택';hardContinue.onclick=()=>continueStudy(()=>startHard(unit.id));
 }
}

function makeSetCard(set){
    const total = set.parts.reduce((a,p)=>a+p.items.length,0);
    const saved = loadRun(set.id);
    const pending=homeGameState.pendingReviews[gameKey(set)];
    const card = document.createElement('div');
    card.className = 'set' + (saved ? ' live' : '');
    const main = document.createElement('button'); main.type='button'; main.className='set-main';
    main.dataset.setId=set.id;
    main.innerHTML = '<div><div class="t">'+set.name+'</div><div class="d">'+total+'문항 · '+set.desc+'</div></div>'+
      (pending ? '<div class="n"><b>오답 '+pending.wrong+'개</b>복습 이어 풀기</div>' : saved
        ? '<div class="n"><b>'+saved.idx+' / '+total+'</b>이어서 풀기</div>'
        : (function(){ const r=loadLast(set.id); return '<div class="n"><b>'+getAttempts(set.id)+'</b>번 풀었음'+(r?' · 지난 '+r.score+'/'+r.max:'')+'</div>'; })());
    main.addEventListener('click', ()=> start(set, saved));
    if(homeGameState.records[gameKey(set)]?.mastered)main.appendChild(el('span','set-mastered','✓ 오답까지 완주'));
    card.appendChild(main);
    if(pending)return card;
    if(saved){
      const nb = document.createElement('button'); nb.type='button'; nb.className='set-new';
      const label = (saved.attempt+1)+'회차 풀기 시작';
      nb.textContent = label;
      nb.addEventListener('click', ()=>{
        if(nb.dataset.armed){ clearRun(set.id); start(set); }
        else { nb.dataset.armed='1'; nb.textContent='풀던 것은 지워집니다. 한 번 더 누르세요'; setTimeout(()=>{ delete nb.dataset.armed; nb.textContent=label; }, 3000); }
      });
      card.appendChild(nb);
    }else{
      const nb = document.createElement('button'); nb.type='button'; nb.className='set-new';
      nb.textContent = (getAttempts(set.id)+1)+'회차 풀기 시작';
      nb.addEventListener('click', ()=> start(set));
      card.appendChild(nb);
    }
    const wl = loadWrong(set.id);
    if(wl.length && !saved){
      const rb = document.createElement('button'); rb.type='button'; rb.className='set-new retry';
      rb.textContent = '오답 '+wl.length+'개 다시 풀기';
      rb.addEventListener('click', ()=> start(set, null, true));
      card.appendChild(rb);
    }
    return card;
}
const filterKey=PREFIX+'filters';
const unitKey=PREFIX+'selected_unit';
let selectedUnit=options.units?.find(u=>u.id===sessionStorage.getItem(unitKey))?.id||(options.units?.length===1?options.units[0].id:null);
const modeKey=PREFIX+'practice_mode';
let unitPracticeMode=new URLSearchParams(location.search).get('mode')||sessionStorage.getItem(modeKey)||'flow';
if(!['flow','trap'].includes(unitPracticeMode))unitPracticeMode='flow';
function goUnit(id){
  if(run&&$('#scr-q').classList.contains('on')){clearInterval(run.timerId);pauseQuestionClock();saveRun();}
  selectedUnit=options.units.some(u=>u.id===id)?id:(options.units.length===1?options.units[0].id:null);
  if(selectedUnit)sessionStorage.setItem(unitKey,selectedUnit);else sessionStorage.removeItem(unitKey);
  renderStart();show('#scr-start');
}
function renderUnitStart(){
  document.body.classList.add('units-page');document.body.classList.toggle('units-home',$('#scr-start').classList.contains('on'));
  const nav=$('.page-nav');nav.replaceChildren();nav.classList.add('unit-nav');nav.setAttribute('aria-label','단원 선택');
  const home=el('button','unit-nav-home','전체 단원');home.type='button';home.onclick=()=>goUnit(null);home.setAttribute('aria-pressed',String(!selectedUnit));if(options.units.length>1)nav.appendChild(home);
  options.units.forEach(u=>{const button=el('button','',u.id+'단원');button.type='button';button.dataset.unit=u.id;button.setAttribute('aria-pressed',String(selectedUnit===u.id));button.onclick=()=>goUnit(u.id);nav.appendChild(button);});
  $('#practice-links').hidden=true;$('#practice-filters').hidden=true;
  const box=$('#sets');box.replaceChildren();
  const chapter=options.units.find(u=>u.id===selectedUnit);
  if(!chapter){
    $('#page-title').textContent='단원별 학습';$('#page-intro').textContent='단원을 고르면 개념어부터 본문·기본·심화 문제까지 이어서 풀 수 있어요.';
    const grid=el('div','unit-grid');
    options.units.forEach(u=>{const card=el('button','unit-card');card.type='button';card.dataset.openUnit=u.id;
      card.append(el('strong','unit-number',u.id+'단원'),el('span','unit-name',u.title),el('span','unit-readings',u.readings.length?u.readings.join(' / '):'개념어 · 자료 수집과 정보 전달 글쓰기'),el('span','unit-count',u.questionCount+'문항'+(u.relatedCount?' · 연결 문제 '+u.relatedCount+'문항':'')));
      card.onclick=()=>goUnit(u.id);grid.appendChild(card);});box.appendChild(grid);return;
  }
  $('#page-title').textContent=chapter.id+'단원 · '+chapter.title;
  $('#page-intro').textContent=chapter.readings.length?chapter.readings.join(' / '):'정보 수집·선별부터 조직과 표현까지 함께 확인해요.';
  if(chapter.readingGroups){renderFinalStudy(chapter,box);return;}
  const notes=el('section','unit-concepts');notes.setAttribute('aria-label',chapter.id+'단원 개념어');notes.appendChild(el('h2','','개념어 먼저 보기'));
  chapter.concepts.forEach((concept,i)=>{const detail=el('details','unit-concept');if(i===0)detail.open=true;detail.append(el('summary','',concept.title),el('p','',concept.text));notes.appendChild(detail);});box.appendChild(notes);
  const own=SETS.filter(s=>s.unitId===chapter.id),related=SETS.filter(s=>s.unitId!==chapter.id&&s.chapterIds?.includes(chapter.id));
  for(const type of ['concept','reading','basic','advanced','challenge']){
    const sets=own.filter(s=>s.unitType===type);if(!sets.length)continue;
    const section=el('section','unit-section');section.dataset.unitSection=type;section.appendChild(el('h2','',global.HomeworkUnitSets.sectionLabels[type]));
    const groups=new Map();sets.forEach(s=>{const label=s.group.replace(/^\d-\d단원 · /,'');if(!groups.has(label))groups.set(label,[]);groups.get(label).push(s);});
    for(const [label,sets] of groups){const details=el('details','unit-set-group');
      details.appendChild(el('summary','',label+' · '+sets.reduce((n,s)=>n+s.parts.reduce((m,p)=>m+p.items.length,0),0)+'문항'));
      const tiles=el('div','tiles');sets.forEach(s=>tiles.appendChild(makeSetCard(s)));details.appendChild(tiles);section.appendChild(details);
    }box.appendChild(section);
  }
  if(related.length){const section=el('section','unit-section unit-related');section.append(el('h2','','다른 단원과 연결해서 풀기'),el('p','','이 단원을 함께 쓰는 문제예요. 어느 단원에서 열어도 풀이 기록은 하나로 이어집니다.'));const tiles=el('div','tiles');related.forEach(s=>tiles.appendChild(makeSetCard(s)));section.appendChild(tiles);box.appendChild(section);}
}
function renderFinalStudy(chapter,box){
  const modes=el('nav','study-modes');modes.setAttribute('aria-label','연습 방법');
  for(const [value,label] of [['flow','문단 흐름별'],['trap','선지 변형 유형별']]){const b=el('button','',label);b.type='button';b.dataset.studyMode=value;b.setAttribute('aria-pressed',String(unitPracticeMode===value));b.onclick=()=>{unitPracticeMode=value;sessionStorage.setItem(modeKey,value);renderStart();};modes.appendChild(b);}box.appendChild(modes);
  if(unitPracticeMode!=='flow'){
    const title='선지 변형 유형별 연습';box.append(el('h2','study-view-title',title),el('p','study-view-intro',chapter.id+'단원 문제를 같은 유형끼리 모아 풀어요. 기본 OX와 심화 5지선다를 고르세요.'));
    const relevant=SETS.filter(s=>s.unitId===chapter.id&&s.isTypePractice&&s.practiceMode===unitPracticeMode),categories=[...new Set(relevant.map(s=>s.practiceCategory))];
    for(const category of categories){const d=el('details','unit-type-group');d.dataset.typeCategory=category;const list=relevant.filter(s=>s.practiceCategory===category);d.appendChild(el('summary','',category+' · '+list.reduce((n,s)=>n+s.parts.reduce((m,p)=>m+p.items.length,0),0)+'문항'));const tiles=el('div','tiles');list.forEach(s=>tiles.appendChild(makeSetCard(s)));d.appendChild(tiles);box.appendChild(d);}return;
  }
  const concepts=el('details','study-concept-notes');concepts.appendChild(el('summary','','개념어와 읽기 기준 먼저 보기'));
  chapter.concepts.forEach(c=>{const d=el('details','unit-concept');d.append(el('summary','',c.title),el('p','',c.text));concepts.appendChild(d);});box.appendChild(concepts);
  const conceptSets=SETS.filter(s=>s.unitId===chapter.id&&!s.isTypePractice&&s.unitType==='concept'),practice=el('details','unit-type-group');practice.appendChild(el('summary','','개념어 연습 · 기본 OX / 심화 5지선다'));const conceptTiles=el('div','tiles');conceptSets.forEach(s=>conceptTiles.appendChild(makeSetCard(s)));practice.appendChild(conceptTiles);box.appendChild(practice);
  const own=SETS.filter(s=>s.unitId===chapter.id&&!s.isTypePractice);
  chapter.readingGroups.forEach((group,index)=>{
    const section=el('section','unit-flow-block');section.dataset.readingBlock=group.id;section.append(el('h2','',(index+1)+'. '+group.title),el('p','unit-flow-summary',group.summary));
    for(const chunk of group.chunks){const sets=own.filter(s=>s.readingBlock===group.id&&s.readingChunk===chunk.id&&!s.isQuickPractice);const d=el('details','unit-flow-chunk');d.dataset.readingChunk=chunk.id;const count=level=>sets.filter(s=>s.level===level).reduce((n,s)=>n+s.parts.reduce((m,p)=>m+p.items.length,0),0);d.appendChild(el('summary','',chunk.label+' · '+chunk.title+' · 기본 '+count('기본')+' / 심화 '+count('심화')));
      const quick=own.filter(s=>s.isQuickPractice&&s.readingChunk===chunk.id);if(quick.length){d.appendChild(el('p','quick-menu-note','먼저 짧게 비교해 보기 · 문단마다 10문제'));const qt=el('div','tiles quick-tiles');quick.forEach(s=>qt.appendChild(makeSetCard(s)));d.appendChild(qt);}
      const reading=el('details','flow-reading');reading.appendChild(el('summary','','본문 먼저 읽기 · '+chunk.label));for(const source of chunk.passages){const block=el('section','flow-reading-source');block.append(el('h4','',source.label),el('p','serif',source.text));reading.appendChild(block);}d.appendChild(reading);
      const tiles=el('div','tiles');sets.forEach(s=>tiles.appendChild(makeSetCard(s)));d.appendChild(tiles);section.appendChild(d);
    }
    const application=own.filter(s=>s.readingBlock===group.id&&s.readingChunk==='apply');if(application.length){const d=el('details','unit-flow-chunk');d.appendChild(el('summary','','웹 인터랙티브의 새 예시로 적용하기'));const tiles=el('div','tiles');application.forEach(s=>tiles.appendChild(makeSetCard(s)));d.appendChild(tiles);section.appendChild(d);}
    const examples=own.filter(s=>s.readingBlock===group.id&&s.readingChunk==='examples');if(examples.length){const d=el('details','unit-flow-chunk');d.dataset.examplePractice='true';d.appendChild(el('summary','','어려운 소재 · 쉬운 예시로 OX 풀기'));const tiles=el('div','tiles');examples.forEach(s=>tiles.appendChild(makeSetCard(s)));d.appendChild(tiles);section.appendChild(d);}
    box.appendChild(section);
  });
}
let practiceFilter={category:options.categories?.[0],level:'all'};
try{ const saved=JSON.parse(sessionStorage.getItem(filterKey)||'null');
  if(saved && options.categories?.includes(saved.category) && ['all','기본','심화'].includes(saved.level)) practiceFilter=saved;
}catch(_){}
function renderPracticeStart(){
  const filters=$('#practice-filters'); filters.hidden=false; filters.replaceChildren();
  const types=document.createElement('div');types.className='category-pills';types.setAttribute('aria-label','유형 선택');
  options.categories.forEach(category=>{
    const button=document.createElement('button');button.type='button';button.textContent=category;
    button.setAttribute('aria-pressed',String(practiceFilter.category===category));
    button.addEventListener('click',()=>{practiceFilter.category=category;sessionStorage.setItem(filterKey,JSON.stringify(practiceFilter));renderStart();});types.appendChild(button);
  });
  const levels=document.createElement('div');levels.className='level-tabs';levels.setAttribute('aria-label','난이도 선택');
  [['all','모두'],['기본','기본 OX'],['심화','심화 5지선다']].forEach(([value,label])=>{
    const button=document.createElement('button');button.type='button';button.textContent=label;button.setAttribute('aria-pressed',String(practiceFilter.level===value));
    button.addEventListener('click',()=>{practiceFilter.level=value;sessionStorage.setItem(filterKey,JSON.stringify(practiceFilter));renderStart();});levels.appendChild(button);
  });
  filters.append(types,levels);
  const box=$('#sets');box.replaceChildren();
  const selected=SETS.filter(set=>set.category===practiceFilter.category);
  const total=selected.reduce((sum,set)=>sum+set.parts.reduce((n,p)=>n+p.items.length,0),0);
  const heading=document.createElement('h2');heading.className='practice-heading';heading.textContent=practiceFilter.category+' · '+total+'문항';box.appendChild(heading);
  ['기본','심화'].forEach(level=>{
    if(practiceFilter.level!=='all' && practiceFilter.level!==level)return;
    const group=document.createElement('section');group.className='grp practice-group';
    const title=document.createElement('h3');title.textContent=level==='기본'?'기본 · OX':'심화 · 내신 5지선다';
    const tiles=document.createElement('div');tiles.className='tiles';
    selected.filter(set=>set.level===level).forEach(set=>tiles.appendChild(makeSetCard(set)));
    group.append(title,tiles);box.appendChild(group);
  });
}

/* ---- 풀이 상태 ---- */
let run = null;   // {set, attempt, session, list, idx, startedAt, logs, qStart, timerId}

function balanceAnswerPositions(items){
  const groups=new Map();
  items.forEach(q=>{
    if(q.fixedOptionOrder||!Array.isArray(q.options)||q.options.length<2)return;
    const answerIndex=q.options.indexOf(q.answer);
    if(answerIndex<0)return;
    const n=q.options.length;
    if(!groups.has(n))groups.set(n,[]);
    groups.get(n).push(q);
  });
  groups.forEach((questions,n)=>{
    const slots=[];
    while(slots.length<questions.length)slots.push(...Array.from({length:n},(_,i)=>i));
    const shuffledQuestions=shuffle(questions), shuffledSlots=shuffle(slots).slice(0,questions.length);
    shuffledQuestions.forEach((q,i)=>{
      const answer=q.answer, distractors=shuffle(q.options.filter(x=>x!==answer));
      const result=[];result[shuffledSlots[i]]=answer;
      let d=0;for(let j=0;j<n;j++)if(result[j]===undefined)result[j]=distractors[d++];
      q.options=result;
    });
  });
}

function start(set, saved, retry, questionRecords){
  if(options.guidedLearning&&!options.testMode&&isHardSet(set)&&!learningState().steps.find(u=>u.id===set.unitId)?.hard?.unlocked){renderStart();show('#scr-start');return;}
  const ticket=++selectionTicket;
  ++prefetchTicket;
  const latest=options.questionPatches&&questionRecords===undefined?options.questionPatches.refresh():null;
  if(set.dataFile&&!set._loaded){
    loadingStatus.textContent=set.group+' · '+set.name+' 불러오는 중…';loadingStatus.hidden=false;
    return Promise.all([loadSet(set),latest||questionRecords]).then(([,records])=>{
      if(ticket===selectionTicket){loadingStatus.hidden=true;return start(set,saved,retry,records);}
    }).catch(()=>{
      if(ticket===selectionTicket){loadingStatus.textContent='문제를 불러오지 못했어요. 같은 세트를 다시 눌러 주세요.';}
    });
  }
  if(latest){
    loadingStatus.textContent='최신 문항을 확인하는 중…';loadingStatus.hidden=false;
    return latest.then(records=>{
      if(ticket===selectionTicket)return start(set,saved,retry,records);
    });
  }
  loadingStatus.hidden=true;
  if(options.units){unitPracticeMode=set.practiceMode||'flow';sessionStorage.setItem(modeKey,unitPracticeMode);}
  if(options.units&&!set.chapterIds?.includes(selectedUnit)){selectedUnit=set.unitId;sessionStorage.setItem(unitKey,selectedUnit);renderStart();}
  clearAutoNext();
  if(!retry&&game.pending(gameKey(set))){openPending(gameKey(set));return;}
  restoreKnownFailures(set);
  if(retry && !saved)saved=loadRetry(set.id);
  if(run){clearInterval(run.timerId);pauseQuestionClock();}
  let list = [];
  set.parts.forEach((p,pi)=> p.items.forEach((original,qi)=>{
    const it=questionRecords?global.HomeworkQuestionPatches.apply(original,questionRecords[original.id]):original;
    list.push({...it, options:it.options?[...it.options]:it.options, part:p.name, pi, qno:qi+1, max: it.type==='vocabMatch'?it.words.length:(it.type==='both'?2:(it.type==='pair'?3:1))});
  }));
  if(retry){ const w=new Set(loadWrong(set.id).map(x=>x.pi+':'+x.qi)); list=list.filter(q=>w.has(q.pi+':'+(q.qno-1))); if(!list.length){ renderStart(); show('#scr-start'); return; } }
  if(saved?.order){
    const byId=new Map(list.map(q=>[q.id || q.pi+':'+q.qno,q]));
    if(saved.order.length===list.length && new Set(saved.order).size===list.length && saved.order.every(id=>byId.has(id))) list=saved.order.map(id=>byId.get(id));
  }else if(set.shuffleWithinParts){const parts=new Map();for(const q of list){if(!parts.has(q.pi))parts.set(q.pi,[]);parts.get(q.pi).push(q);}list=[...parts.values()].flatMap(questions=>shuffle(questions));}
  else if(set.shuffleQuestions){ list=shuffle(list); }
  balanceAnswerPositions(list);
  let attempt, session, idx=0, logs=[], startedAt=new Date();
  if(saved){
    attempt=saved.attempt; session=saved.session; idx=Math.min(saved.idx, list.length);
    logs=saved.logs||[]; startedAt=new Date(saved.startedAt);
  }else{
    attempt = getAttempts(set.id)+1;
    localStorage.setItem(attemptsKey(set.id), attempt);
    session = Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  }
  run = {set, attempt, session, list, idx, startedAt, logs, studiedRefs:new Set(saved?.studiedRefs||[]),readingStates:saved?.readingStates||{},qStart:null, timerId:null, retry:!!retry,
    resumeQuestion:saved?.activeQuestion||null, extraSeconds:saved?.activeQuestion?.extraSeconds||0,
    totalRemainingMs:null, totalStartedAt:null, totalTimedOut:false, questionStartedAt:null, questionRemainingMs:saved?.activeQuestion?.remainingMs??30000};
  show('#scr-q');
  if(run.idx >= run.list.length) finish(); else{renderQ();if(!saved)saveRun(run.idx);}
  prepareRelated(set);
}

function tokens(t){ return (t||'').replace(/[‘’“”'"()\[\]『』「」.,?!·…:;→=/]/g,' ').split(/\s+/).filter(w=>w.length>=2).map(w=>w.replace(/(은|는|이|가|을|를|의|에|에서|으로|로|과|와|도|만|이다|였다|이었다|했다|한다|다)$/,'')).filter(w=>w.length>=2); }
function focusIndex(q, sentences){
  const quoted = [...(q.why||'').matchAll(/[‘“]([^’”]+)[’”]/g)].map(m=>m[1]);
  const keywords = tokens((q.changed||'')+' '+(q.sent||'')+' '+(q.why||''));
  const scores=sentences.map(s=>quoted.reduce((n,t)=>n+(s.includes(t)?20+t.length:0),0)
    +keywords.reduce((n,w)=>n+(s.includes(w)?w.length:0),0));
  const best=Math.max(...scores);
  return best>0 ? scores.indexOf(best) : (sentences.length===1?0:-1);
}
function arrangeShortComparison(q,body){
  if(!q.shortComparison)return;document.body.classList.add('quick-comparison');
  const grid=el('div','quick-comparison-grid'),left=el('section','quick-source'),right=el('section','quick-information');right.appendChild(el('strong','quick-label',q.progressiveComparison?q.progressiveStep+'/5단계 · '+q.progressiveLabel:'비교할 정보'));if(q.synthesis)right.classList.add('synthesis-question');left.setAttribute('aria-label','핵심 문장 또는 지문');left.tabIndex=0;
  for(const node of [...body.children]){if(node.matches('.passage'))left.appendChild(node);else if(node.matches('.ask,.claim,.picks'))right.appendChild(node);}
  grid.append(left,right);body.appendChild(grid);
}
function renderQ(){
  paintHomeworkProgress();
  closeTimeDecision();clearAutoNext();resetAnswerDock();
  document.body.classList.remove('split-question','evidence-stage','evidence-reviewed','quick-comparison');
  paintGuidedStatus();
  clearTimeSignal();
  clearAutoNext();
  const q = run.list[run.idx];
  clearInterval(run.timerId); run.deadline=null;
  $('#q-timer').className='timer';
  const restored=run.resumeQuestion?.id===(q.id||q.pi+':'+q.qno)&&run.resumeQuestion.editorRevision===q.editorRevision?run.resumeQuestion:null;
  run.resumeQuestion=null;
  q._failureCount=validCount(loadFailures(run.set)[questionKey(q)]);
  const expectedLimit=baseSolveSeconds(q)+q._failureCount*10;
  const previousLimit=restored?(restored.solveLimitSeconds||30):expectedLimit;
  const addedSeconds=Math.max(0,expectedLimit-previousLimit);
  run.questionLimitSeconds=previousLimit+addedSeconds;
  run.extraSeconds=restored?.extraSeconds||0;run.questionRemainingMs=restored?.remainingMs!=null?restored.remainingMs+addedSeconds*1000:run.questionLimitSeconds*1000;
  q._timeDecision=restored?.timeDecision||null;q._solveElapsedMs=restored?.elapsedMs||0;q._unknown=false;q._choiceHelpUsed=!!restored?.choiceHelpUsed;q._eliminated=restored?.eliminated||[];q._dismissedHelp={};q._submitted=false;q._timedOut=false;q._evidencePhase=null;q._evidenceResult=null;q._answerSeconds=null;
  const previousWrong=run.retry?loadWrong(run.set.id).find(w=>w.pi===q.pi&&w.qi===q.qno-1):null;
  q._evidenceOnlyReview=previousWrong?.mistakeKind==='evidence'&&requiresEvidence(q);

  const prev = run.idx>0 ? run.list[run.idx-1] : null;
  const samePassage = prev && ((q.passage && q.passage===prev.passage) || (q.lines && prev.lines && JSON.stringify(q.lines)===JSON.stringify(prev.lines)));
  const evidenceMode = /^(기초|본문설명|유형 심화)/.test(run.set.name) && q.type==='ox';
  q._evi = null; q._eviFocus = -1;
  const total = run.list.length;
  $('#q-part').textContent = run.set.group+' · '+(q.readingLabel?q.readingLabel+' · '+run.set.level:run.set.name)+' — '+q.part;
  $('#q-cnt').textContent = (run.idx+1)+' / '+total;
  $('#q-prog').style.width = (run.idx/total*100)+'%';
  if(run.set.diagnosisPlan){const mains=run.list.filter(x=>!x.chainOf&&!x.redoOf),at=mains.findIndex(x=>x.id===(q.chainOf||q.id));
   $('#q-cnt').textContent=q.redoOf?'오답 다시 풀기 · 남은 '+run.list.slice(run.idx).filter(x=>x.redoOf).length+'문제':(at+1)+' / '+mains.length+(q.chainOf?' · 확인 문제':'');
   $('#q-prog').style.width=((q.redoOf?mains.length:at)/mains.length*100)+'%';}
  $('#q-fb').className='fb'; $('#q-fb').textContent='';
  $('#q-check').style.display='none'; $('#q-next').style.display='none';
  $('#q-check').disabled = true;

  const body = $('#q-body'); body.innerHTML='';
  if(q.sourceLabel){const source=document.createElement('p');source.className='source-label';source.textContent=q.sourceLabel;body.appendChild(source);}
  if(previousWrong?.mistakeKind){const prior=el('aside','review-origin');prior.append(el('strong','','지난 풀이의 오답 원인'),global.HomeworkResults.badges({kind:previousWrong.mistakeKind,corrected:previousWrong.correctedAfterExplanation,timedOut:previousWrong.timedOut}));body.appendChild(prior);}

  if(run.idx===0 || (prev && prev.part!==q.part)){
    const ph=document.createElement('div'); ph.className='phase';
    if(/^어휘/.test(q.part)) ph.innerHTML='<b>어휘</b>이 문단에 나오는 낱말의 뜻을 먼저 확인합니다.';
    else if(/^공부/.test(q.part)) ph.innerHTML='<b>공부</b>원문과 쉬운 풀이를 읽고 확인 문제를 풉니다. 끝나면 바로 시험으로 넘어갑니다.';
    
    else if(/^시험/.test(q.part)) ph.innerHTML='<b>시험</b>형광펜으로 표시한 중요한 내용을 읽고 답을 고르세요.';
    if(ph.innerHTML) body.appendChild(ph);
  }
  renderTools(q);
  if(q.type==='vocabMatch'){ renderVocab(q, body); return; }
  if(samePassage && q.referenceMode!=='optional'){ const sm=document.createElement('div'); sm.className='same'; sm.textContent='같은 지문입니다 — 다시 읽지 않아도 됩니다'; body.appendChild(sm); }
  if(q.lines){
    const bx=document.createElement('div'); bx.className='lines'+(run.set.revision===2?' unnumbered':''); bx.innerHTML='<b>'+(q.label||'지문')+' — 원문과 쉬운 풀이</b>';
    const NO='①②③④⑤';
    const fi = (q.focus>=0 && q.focus<q.lines.length) ? q.focus : focusIndex(q, q.lines.map(l=>l.s+' '+l.e)); q._eviFocus = fi;
    q.lines.forEach((ln,i)=>{ const d=document.createElement('div');
      d.className='ln'+(evidenceMode ? ' pick' : (fi<0||isMediumPlusSet(run.set)?'':(i===fi?' focus':' dim')));
      if(evidenceMode){ d.addEventListener('click', ()=>{ bx.querySelectorAll('.ln').forEach(x=>x.classList.remove('chosen')); d.classList.add('chosen'); q._evi=i; unlockPicks(); }); }
      const a=document.createElement('span'); a.className='no'; a.textContent=ln.no||NO[i]||(i+1);
      const o=document.createElement('span'); o.className='orig'; o.textContent=ln.s;
      const e=document.createElement('div'); e.className='easy'; e.textContent=ln.e;
      d.append(a,o,e); bx.appendChild(d); });
    body.appendChild(bx);
  }
  if(q.passage){
    const pg=el('div','passage serif');pg.appendChild(el('b','',q.synthesis?'문단 전체':q.shortComparison?'핵심 문장':'지문'));
    const groups=[];let group=null;
    String(q.passage).split(/\n+/).filter(line=>line.trim()).forEach(line=>{
      const head=line.match(/^\[([^\]]+)\]\s*/);
      if(head||!group){group={label:head?head[1]:'',paragraphs:[]};groups.push(group);}
      const text=head?line.slice(head[0].length):line;
      if(text.trim())group.paragraphs.push(text);
    });
    const autoFocus=evidenceMode||(!q.disableAutoFocus&&!isMediumPlusSet(run.set));
    const sentences=autoFocus?groups.flatMap(g=>g.paragraphs.flatMap(text=>text.split(/(?<=[.?!”’])[^\S\n]+(?=\S)/))):[];
    const fi=autoFocus?(q.focus>=0&&q.focus<sentences.length?q.focus:focusIndex(q,sentences)):-1;q._eviFocus=fi;let index=0;
    groups.forEach(g=>{
      const section=el('section','reading-source');if(g.label)section.appendChild(el('b','reading-label',g.label));
      g.paragraphs.forEach(text=>{
        const paragraph=el('p','reading-paragraph');
        if(!autoFocus){paragraph.textContent=text;section.appendChild(paragraph);return;}
        text.split(/(?<=[.?!”’])[^\S\n]+(?=\S)/).forEach((sentence,n,all)=>{
          const at=index++;
          if(evidenceMode){const span=el('span','sn',sentence);span.onclick=()=>{pg.querySelectorAll('.sn').forEach(x=>x.classList.remove('chosen'));span.classList.add('chosen');q._evi=at;unlockPicks();};paragraph.appendChild(span);}
          else paragraph.appendChild(at===fi&&!isMediumPlusSet(run.set)&&!q.disableAutoFocus?el('mark','',sentence):document.createTextNode(sentence));
          if(n<all.length-1)paragraph.appendChild(document.createTextNode(' '));
        });section.appendChild(paragraph);
      });pg.appendChild(section);
    });
    if(q.referenceMode==='optional'){const details=el('details','reference');details.append(el('summary','','지문 펼쳐보기'),pg);body.appendChild(details);}else body.appendChild(pg);
  }
  if(evidenceMode){ const ev=document.createElement('div'); ev.className='evi'; ev.textContent='O·X를 바로 고르세요. 필요하면 지문에서 답의 근거가 되는 문장을 눌러 표시할 수 있어요.'; body.appendChild(ev); }
  if(q.note){
    const nt=el('div','note structured-reading');nt.appendChild(el('b','',q.noteLabel||'설명'));
    String(q.note).split(/\n\s*\n/).filter(Boolean).forEach(block=>{
      const section=el('section','reading-source');block.split(/\n/).filter(line=>line.trim()).forEach(line=>{
        if(/^\[(?:자료|보기)/.test(line))section.appendChild(el('b','reading-label',line));
        else section.appendChild(el('p','reading-paragraph',line));
      });nt.appendChild(section);
    });body.appendChild(nt);
  }
  if(q.sent){ const sent = document.createElement('p'); sent.className='sent serif'; sent.textContent=q.sent; body.appendChild(sent); }

  q._submitted=false;
  q._picked=null; q._t=null; q._v=null; q._tA=null; q._vA=null; q._tB=null; q._vB=null;

  if(q.type==='pair'){
    const mk=(lbl,txt,key)=>{
      const b=document.createElement('div'); b.className='pairbox';
      b.innerHTML='<div class="lbl">'+lbl+'</div><div class="txt">'+txt+'</div>';
      b.appendChild(dragBlock(q, key, key==='A'?q.aTenor:q.bTenor, key==='A'?q.aVehicle:q.bVehicle)); return b;
    };
    const a=document.createElement('div'); a.className='ask';
    a.textContent='두 문장에서 원관념과 보조관념을 각각 찾으세요';
    body.appendChild(a);
    body.appendChild(mk('① '+q.aType, q.a, 'A'));
    body.appendChild(mk('② '+q.bType, q.b, 'B'));
    const a2=document.createElement('div'); a2.className='ask';
    a2.textContent='①과 ②의 원관념·보조관념이 서로 같은가? (같으면 O, 다르면 X)';
    body.appendChild(a2);
    body.appendChild(pickRow(['O','X'], v=>{ q._picked=v; checkReady(q); }, true));
    $('#q-check').style.display='';
  }else if(q.type==='mc'){
    if(q.hint){ const h=document.createElement('div'); h.className='hint'; h.hidden=true; h.innerHTML='<b>힌트</b>'; h.appendChild(document.createTextNode(q.hint)); body.appendChild(h); }
    const row = pickRow(q.options, v=>{ q._picked=v; submit(); });
    row.classList.add('col'); if(practice)row.classList.add('numbered'); body.appendChild(row);
  }else if(q.type==='choice' || q.type==='ox'){
    if(q.type==='ox'){
      const a=document.createElement('div'); a.className='ask'; a.textContent=q.ask||'이렇게 바꾸어도 원관념과 보조관념이 그대로인가?'; body.appendChild(a);
      const c=document.createElement('div'); c.className='claim serif'; c.textContent=q.changed; body.appendChild(c);
      if(q.hint){ const h=document.createElement('div'); h.className='hint'; h.hidden=true; h.innerHTML='<b>힌트</b>'; h.appendChild(document.createTextNode(q.hint)); body.appendChild(h); }
    }
    const pr = pickRow(q.type==='ox'?['O','X']:['직유','은유'], v=>{ q._picked=v; submit(); });
    // O·X answers are always available; selecting evidence is optional.
    body.appendChild(pr);
  }else{
    if(q.type==='both'){
      const a=document.createElement('div'); a.className='ask'; a.textContent='비유의 종류'; body.appendChild(a);
      body.appendChild(pickRow(['직유','은유'], v=>{ q._picked=v; checkReady(q); }, true));
      const a2=document.createElement('div'); a2.className='ask'; a2.textContent='원관념과 보조관념'; body.appendChild(a2);
    }else{
      const a=document.createElement('div'); a.className='ask'; a.textContent='조각을 누른 뒤, 들어갈 칸을 누르세요'; body.appendChild(a);
    }
    body.appendChild(dragBlock(q));
    $('#q-check').style.display='';
  }

  arrangeQuestionReading(q,body);
  arrangeShortComparison(q,body);
  placeReadingControl();placeAnswerSupport(q);
  if(q.highlightEvidence)markReadingEvidence(q);
  applyChoiceHelp(q);
  if(restored?.hintUsed){q._restoringHint=true;$('#use-hint').disabled=false;$('#use-hint').click();q._restoringHint=false;}
  // An evidence stage means the problem answer was already correct, even if its wording was edited.
  if(restored?.evidence){
    q._picked=q.answer;
    if(requiresEvidence(q))beginEvidence(q,restored.evidence.answerSeconds,restored.evidence);
    else{
      const previous=restored.evidence,failed=!!previous.failed||!!previous.rejected?.length;
      q._answerSeconds=previous.answerSeconds||0;
      q._evidenceResult={retired:true,ok:!failed,hadMistake:failed,selected:null,selectedCorrect:false,rejected:previous.rejected||[],rejectedGroups:previous.rejectedGroups||[],failureCounted:previous.failureCounted===true,sec:0};
      submit('evidenceDone');
    }
  }
  else if(q._evidenceOnlyReview){q._picked=q.answer;beginEvidence(q,0);}
  else startQuestionTimer(q);
}

// Keep the source beside the five choices, including the evidence selection stage.
function arrangeQuestionReading(q,body){
  if(!['mc','ox'].includes(q.type)||q.shortComparison)return;
  const children=Array.from(body.children);
  const readings=children.filter(node=>node.matches('.passage, .lines, .note, .reference'));
  if(!readings.length)return;
  const context=el('div','question-context');
  const reading=el('section','question-reading');reading.setAttribute('aria-label','지문과 자료');reading.tabIndex=0;
  const question=el('section','question-answer');question.setAttribute('aria-label','문제와 선지');
  children.forEach(node=>{
    if(readings.includes(node))reading.appendChild(node);
    else if(node.matches('.source-label, .review-origin, .phase, .same'))context.appendChild(node);
    else question.appendChild(node);
  });
  body.append(context,reading,question);
  document.body.classList.add('split-question');
}

// Solving starts at 30/50 seconds, with 10 more per previous wrong answer. Reading vocabulary
// cards happens before the answer phase and starts the clock only after the begin button.
$('#time-limit-state').textContent='항상 적용';
function isMediumPlusSet(set){return set.timedMode==='overall'||/^(중|상|유형 심화)/.test(set.name||'');}
function pauseQuestionClock(){
  clearTimeSignal();
  if(run&&run.deadline!=null){run.questionRemainingMs=Math.max(0,run.deadline-Date.now());run.questionStartedAt=null;}
}
function startQuestionTimer(q){
  clearInterval(run.timerId);if(q._timeDecision){run.qStart=null;run.deadline=null;$('#q-timer').textContent='0';timeHelp(q);return;}run.qStart=Date.now();
  if(untimed){run.deadline=null;run.questionRemainingMs=null;$('#q-timer').hidden=true;$('#q-timer').textContent='';clearTimeSignal();return;}
  const timer=$('#q-timer');timer.hidden=false;timer.style.visibility='visible';timer.removeAttribute('aria-hidden');timer.className='timer';
  run.deadline=Date.now()+Math.max(0,run.questionRemainingMs??run.questionLimitSeconds*1000);
  let previousLeft=-1;
  const tick=()=>{
    if(run.list[run.idx]!==q||q._submitted)return;
    const left=Math.max(0,Math.ceil((run.deadline-Date.now())/1000));
    if(left!==previousLeft){previousLeft=left;timer.textContent=String(left);timer.setAttribute('aria-label','남은 시간 '+left+'초');}
    const stage=left===0?'':left<=3?'deep-red':left<=5?'red':left<=10?'yellow':'';
    if(stage)document.body.dataset.timeStage=stage;else clearTimeSignal();
    if(left===0)timeHelp(q);
  };
  run.timerId=setInterval(tick,100);tick();
}

// Select one of three or four contiguous evidence groups; authored sentence IDs remain the grading source.
function requiresEvidence(q){return (q.requiresEvidence||['development','traps'].includes(options.page))&&q.evidence?.valid?.length>0;}
function evidenceGroupButtons(){return Array.from(document.querySelectorAll('#q-body button.evidence-group'));}
function drawEvidenceGroup(q,button,group,highlight=false){
  button.replaceChildren();button.dataset.evidenceGroupId=group.id;button.dataset.evidenceMembers=group.members.map(s=>s.id).join(' ');
  button.appendChild(el('span','evidence-group-number',['①','②','③','④'][group.index]||String(group.index+1)));
  const content=el('span','evidence-group-content');let part=null,last='';
  for(const sentence of group.members){
    const key=sentence.sourceId+':'+sentence.paragraph;
    if(key!==last){part=el('span','evidence-group-part');part.appendChild(el('span','evidence-group-source',sentence.sourceLabel));content.appendChild(part);last=key;}
    const text=el('span','evidence-group-text');text.dataset.sentenceId=sentence.id;
    if(highlight&&q.evidence.valid.some(id=>sentence.id===id||sentence.memberIds?.includes(id)))text.appendChild(el('mark','evidence-highlight',sentence.text));else text.textContent=sentence.text;
    part.append(text,document.createTextNode(' '));
  }
  button.appendChild(content);
  button.classList.toggle('evidence-correct',highlight&&!!global.HomeworkEvidenceGroups.supportingId(group,q.evidence.valid));
}
function beginEvidence(q,answerSeconds,saved){
  clearInterval(run.timerId);clearAutoNext();clearTimeSignal();
  document.body.classList.add('evidence-stage');
  q._submitted=true;q._answerSeconds=answerSeconds;
  const allSentences=q.evidence.sources.flatMap(source=>source.sentences),helper=global.HomeworkEvidenceGroups;
  q._evidenceGroups=helper.build(q.evidence.sources);
  const rejected=[...new Set((saved?.rejected||[]).map(id=>allSentences.find(s=>s.id===id||s.memberIds?.includes(id))?.id).filter(id=>id&&!q.evidence.valid.includes(id)))];
  const rejectedGroups=helper.rejectedGroups(q._evidenceGroups,saved,q.evidence.valid);
  q._evidencePhase={remainingMs:saved?.remainingMs??30000,bonusMs:saved?.bonusMs||0,picked:q._picked,answerSeconds,rejected,rejectedGroups,paused:saved?.paused===true,failed:!!saved?.failed||!!saved?.rejected?.length||!!saved?.rejectedGroups?.length,failureCounted:saved?.failureCounted===true};
  if(q._evidencePhase.failed&&!q._evidencePhase.failureCounted){countFailure(q);q._evidencePhase.failureCounted=true;}
  $('#q-next').style.display='none';$('#q-check').style.display='none';
  if($('#answer-support'))$('#answer-support').hidden=true;tools.querySelectorAll('button').forEach(b=>b.disabled=true);if($('#use-reading-size'))$('#use-reading-size').disabled=false;hintBox.hidden=true;
  const body=$('#q-body'),reading=body.querySelector('.passage');
  if(q._evidenceOnlyReview)body.querySelectorAll('.picks, .ask, .claim').forEach(n=>n.remove());
  else body.querySelectorAll('.picks, .ask, .claim, .sent').forEach(n=>n.hidden=true);
  body.querySelectorAll('.hint').forEach(n=>n.hidden=true);
  body.querySelectorAll('button').forEach(b=>b.disabled=true);
  const task=el('section','evidence-task');task.id='evidence-task';
  task.append(el('strong','',q._evidenceOnlyReview?'근거 묶음만 다시 골라요':'✓ 답을 맞혔어요! 이제 근거 묶음 고르기'),el('p','',q._evidenceOnlyReview?'문제 답은 지난 정답을 유지해요. 아래 묶음 중 근거가 들어 있는 것을 하나 고르세요.':'이어지는 문장들을 묶었어요. 정답의 근거가 들어 있는 묶음을 하나 고르세요. 여러 묶음에 근거가 있으면 어느 하나만 골라도 통과해요.'));
  const claim=q.type==='ox'?q.changed:q.answer;task.appendChild(el('p',q._evidenceOnlyReview?'evidence-claim evidence-preserved-answer':'evidence-claim',(q._evidenceOnlyReview?'이전에 맞힌 문제 답: ':'판단한 내용: ')+claim));
  if(q.type==='ox'&&q.answer==='X')task.appendChild(el('small','','X로 판단한 이유를 보여 주는 근거가 있는 묶음을 고르세요.'));
  const status=el('p','evidence-status',untimed?'시간 제한 없이 근거가 들어 있는 묶음 하나를 고르세요.':'새로 30초! 근거가 들어 있는 묶음 하나를 고르면 통과해요.');status.id='evidence-status';status.setAttribute('role','status');task.appendChild(status);
  const answerPane=body.querySelector('.question-answer');if(answerPane)answerPane.prepend(task);else reading.before(task);
  reading.replaceChildren(el('b','','근거 묶음 '+q._evidenceGroups.length+'개 · 하나를 골라 주세요'));reading.classList.add('evidence-reading');
  const readingPane=body.querySelector('.question-reading');if(readingPane)readingPane.scrollTop=0;
  const choices=el('div','evidence-groups');reading.appendChild(choices);
  for(const group of q._evidenceGroups){
    const button=el('button','evidence-sentence evidence-group');button.type='button';drawEvidenceGroup(q,button,group);
    const wasRejected=rejectedGroups.some(g=>g.id===group.id);button.classList.toggle('evidence-rejected',wasRejected);button.disabled=q._evidencePhase.paused||wasRejected;
    button.onclick=()=>{
      if(!q._evidencePhase||q._evidencePhase.paused||run.list[run.idx]!==q)return;
      if(q._timeDecision)return;if(run.deadline!=null&&Date.now()>=run.deadline){timeHelp(q,true);return;}
      const selected=helper.supportingId(group,q.evidence.valid);
      if(selected){completeEvidence(q,selected,helper.snapshot(group));return;}
      const rejectedId=group.members[0].id;q._evidencePhase.rejected.push(rejectedId);q._evidencePhase.rejectedGroups.push(helper.snapshot(group));q._evidencePhase.failed=true;
      if(!q._evidencePhase.failureCounted){countFailure(q);q._evidencePhase.failureCounted=true;}
      button.classList.add('evidence-rejected');button.disabled=true;tone(false);pauseEvidence(q);showEvidenceExplanation(q,rejectedId);saveRun(run.idx);
    };
    choices.appendChild(button);
  }
  placeReadingControl();
  const fb=$('#q-fb');fb.className='fb';fb.textContent='';
  if(saved)status.textContent=untimed?'테스트 중 · 시간 제한 없이 근거 묶음을 이어 고르세요.':'남은 시간부터 이어 풀어요. 근거가 있는 묶음 하나를 고르세요.';
  if(q._evidencePhase.paused){status.textContent='근거 오답으로 기록했어요. 시간은 멈췄으니 해설을 읽고 다시 고르세요. 다시 맞혀도 이번 문항의 오답 기록은 유지돼요.';showEvidenceExplanation(q,rejected.at(-1));}
  startEvidenceTimer(q);if(q._evidencePhase)saveRun(run.idx);
  if(!saved){tone(true);task.classList.add('evidence-enter');}
  task.tabIndex=-1;task.focus({preventScroll:true});(q._evidencePhase?.paused?$('#evidence-explanation'):task).scrollIntoView({block:'start',behavior:'instant'});
}
function startEvidenceTimer(q){
  document.getElementById('time-help')?.remove();clearInterval(run.timerId);clearTimeSignal();
  const phase=q._evidencePhase;if(!phase)return;if(q._timeDecision){run.deadline=null;$('#q-timer').textContent='0';timeHelp(q,true);return;}const extend=$('#use-time');if(extend)extend.disabled=untimed||phase.paused||game.state().time<1;
  if(untimed){phase.startedAt=phase.startedAt||Date.now();run.deadline=null;$('#q-timer').hidden=true;$('#q-timer').textContent='';return;}
  run.deadline=phase.paused?null:Date.now()+phase.remainingMs;
  const currentRun=run,timer=$('#q-timer');timer.hidden=false;timer.style.visibility='visible';timer.className='timer evidence-timer';
  timer.classList.toggle('evidence-clock-paused',phase.paused);
  let previous=-1;
  const tick=()=>{
    if(run!==currentRun||run.list[run.idx]!==q||!q._evidencePhase)return;
    const left=Math.max(0,Math.ceil((phase.paused?phase.remainingMs:run.deadline-Date.now())/1000));
    if(left!==previous){previous=left;timer.textContent=String(left);timer.setAttribute('aria-label',(phase.paused?'근거 해설 읽기 · 시간 멈춤 · ':'근거 찾기 ')+ '남은 시간 '+left+'초');}
    if(phase.paused){clearTimeSignal();return;}
    const stage=left===0?'':left<=3?'deep-red':left<=5?'red':left<=10?'yellow':'';
    if(stage)document.body.dataset.timeStage=stage;else clearTimeSignal();
    if(left===0)timeHelp(q,true);
  };
  if(!phase.paused)run.timerId=setInterval(tick,100);tick();
}
function pauseEvidence(q){
  const phase=q._evidencePhase;if(!phase||phase.paused)return;
  phase.remainingMs=untimed?null:Math.max(0,run.deadline-Date.now());phase.paused=true;
  run.questionRemainingMs=phase.remainingMs;
  startEvidenceTimer(q);
  document.querySelectorAll('#q-body .evidence-sentence').forEach(button=>button.disabled=true);
  $('#evidence-status').textContent='근거 오답으로 기록했어요. 시간은 멈췄으니 해설을 읽고 다시 고르세요. 다시 맞혀도 이번 문항의 오답 기록은 유지돼요.';
}
function resumeEvidence(q){
  const phase=q._evidencePhase;if(!phase||!phase.paused||run.list[run.idx]!==q)return;
  phase.paused=false;
  $('#evidence-explanation')?.remove();document.body.classList.remove('passage-review');
  const readingPane=$('#q-body .question-reading, #q-body .quick-source');if(readingPane)readingPane.scrollTop=0;
  evidenceGroupButtons().forEach(button=>{
    const group=q._evidenceGroups.find(g=>g.id===button.dataset.evidenceGroupId);drawEvidenceGroup(q,button,group);
    button.classList.remove('evidence-chosen');button.removeAttribute('aria-label');button.disabled=phase.rejectedGroups.some(g=>g.id===group.id);
  });
  $('#evidence-status').textContent=untimed?'정답 표시를 숨겼어요. 근거가 들어 있는 묶음을 다시 고르세요.':'남은 시간부터 다시 시작했어요. 근거가 들어 있는 묶음을 하나 고르세요.';
  startEvidenceTimer(q);saveRun(run.idx);
  const task=$('#evidence-task');task.focus({preventScroll:true});task.scrollIntoView({block:'start',behavior:'instant'});
}
function completeEvidence(q,selected,selectedGroup){
  if(!q._evidencePhase||q._evidencePhase.paused)return;document.getElementById('time-help')?.remove();
  const phase=q._evidencePhase;
  q._evidenceResult={ok:!!selected&&!phase.failed,selectedCorrect:!!selected,hadMistake:phase.failed,failureCounted:phase.failureCounted,selected:selected||null,selectedGroup:selectedGroup||null,rejectedGroups:[...(phase.rejectedGroups||[])],sec:untimed?Math.max(0,(Date.now()-(phase.startedAt||Date.now()))/1000):Math.max(0,Math.round((30000+(phase.bonusMs||0)-Math.max(0,run.deadline-Date.now()))/10)/100),rejected:[...phase.rejected]};
  q._evidencePhase=null;document.body.classList.add('evidence-reviewed');clearInterval(run.timerId);clearTimeSignal();run.deadline=null;$('#q-timer').classList.remove('evidence-timer');
  q._submitted=false;submit('evidenceDone');
}
function paintEvidenceResult(q){
  const result=q._evidenceResult,task=$('#evidence-task');
  if(task)task.remove();
  const readingTitle=$('#q-body .evidence-reading>.reading-heading>b, #q-body .evidence-reading>b');if(readingTitle)readingTitle.textContent='정답의 근거';
  evidenceGroupButtons().forEach(button=>{
    button.disabled=true;const group=q._evidenceGroups.find(g=>g.id===button.dataset.evidenceGroupId);
    if(result.selectedGroup?.id===group.id||!result.selectedGroup&&result.selected&&global.HomeworkEvidenceGroups.contains(group,result.selected)){button.classList.add('evidence-chosen');button.setAttribute('aria-label','내가 고른 근거 묶음 '+(group.index+1));}
  });
  showEvidenceExplanation(q,result.rejected.at(-1),result.selected);
}
function markReadingEvidence(q){
  if(!q.evidence?.valid?.length)return;
  const reading=$('#q-body .passage, #q-body .note');if(!reading)return;
  reading.querySelectorAll('.hint-highlight').forEach(node=>node.replaceWith(document.createTextNode(node.textContent)));
  const valid=q.focusQuotes||q.evidence.sources.flatMap(source=>source.sentences).filter(s=>q.evidence.valid.includes(s.id));
  // Match complete, authored source sentences, never keywords or the entire paragraph.
  reading.querySelectorAll('.reading-paragraph').forEach(paragraph=>{
    const text=paragraph.textContent,matches=[];
    valid.forEach(sentence=>{let at=text.indexOf(sentence.text);while(at>=0){matches.push({at,end:at+sentence.text.length,id:sentence.id});at=text.indexOf(sentence.text,at+sentence.text.length);}});
    if(!matches.length)return;
    paragraph.replaceChildren();let offset=0;
    matches.sort((a,b)=>a.at-b.at).forEach(match=>{
      if(match.at<offset)return;
      paragraph.appendChild(document.createTextNode(text.slice(offset,match.at)));
      const mark=el('mark','evidence-highlight',text.slice(match.at,match.end));mark.dataset.evidenceId=match.id;paragraph.appendChild(mark);offset=match.end;
    });
    paragraph.appendChild(document.createTextNode(text.slice(offset)));
  });
  return reading;
}
function paintAnswerEvidence(q){
  const reading=markReadingEvidence(q);if(!reading)return;
  reading.classList.add('answer-evidence-reading');
  showEvidenceExplanation(q);
  const pane=$('#q-body .question-reading, #q-body .quick-source');if(pane)pane.scrollTop=0;
}
function conciseExplanation(text){
  return String(text||'').split(/\s*근거\s*[:：]/)[0].replace(/\s*\d+(?:[~∼–-]\d+)?문단 안의 문장만을 근거로 판단합니다\.?/g,'').replace(/\s*다른 문단의 내용은 필요하지 않습니다\.?/g,'').trim();
}
function showEvidenceExplanation(q,rejectedId,selectedId){
  const all=q.evidence.sources.flatMap(source=>source.sentences);
  const rejected=all.find(s=>s.id===rejectedId),correct=all.find(s=>s.id===(selectedId||q.evidence.valid[0]));
  if(!correct)return;
  evidenceGroupButtons().forEach(button=>{const group=q._evidenceGroups.find(g=>g.id===button.dataset.evidenceGroupId);drawEvidenceGroup(q,button,group,true);if(global.HomeworkEvidenceGroups.supportingId(group,q.evidence.valid))button.setAttribute('aria-label','정답 근거가 포함된 묶음 '+(group.index+1));});
  const groupHistory=q._evidencePhase?.rejectedGroups||q._evidenceResult?.rejectedGroups||[];
  const rejectedGroup=[...groupHistory].reverse().find(g=>g.members?.includes(rejectedId));
  const rejectedText=rejectedGroup?rejectedGroup.members.map(id=>all.find(s=>s.id===id)?.text||id).join(' '):rejected?.text;
  $('#evidence-explanation')?.remove();
  const reading=$('#q-body .passage, #q-body .note');
  const panel=el('section','evidence-explanation'+(reading?' passage-explanation':''));panel.id='evidence-explanation';panel.setAttribute('aria-label','지문 안의 근거와 해설');panel.setAttribute('aria-live','polite');
  if(reading){
    document.body.classList.add('passage-review');
    if(!q._evidencePhase){const fb=$('#q-fb');fb.classList.add('compact-feedback');panel.classList.add(fb.classList.contains('ok')?'ok':'no');const verdict=fb.querySelector('.feedback-verdict');if(verdict)panel.appendChild(verdict);}
  }
  if(rejectedText){
    const wrong=el('div','evidence-reject-explanation');
    wrong.append(el('strong','',rejectedGroup?'왜 고른 묶음은 근거가 아닐까?':'왜 고른 문장은 근거가 아닐까?'));
    const topics=[...new Set((rejectedGroup?.members||[rejectedId]).map(id=>all.find(s=>s.id===id)?.topic).filter(Boolean))];
    wrong.appendChild(el('p','evidence-selected-topic','고른 부분의 내용: '+(topics.length?topics.join(' '):rejectedText)));
    wrong.appendChild(el('p','','이 문제의 ‘'+q.evidence.title+'’는 지문에서 형광펜으로 표시한 문장을 근거로 판단해야 해요.'));
    panel.appendChild(wrong);
  }
  const right=el('div','evidence-correct-explanation');right.appendChild(el('strong','',reading?'형광펜 문장이 근거예요':'근거와 해설'));
  // The source is already highlighted above; quote it only when there is no passage to annotate.
  if(!reading){const quote=el('blockquote','evidence-correct-quote');quote.textContent=correct.text;right.appendChild(quote);}
  right.appendChild(el('p','evidence-reason',conciseExplanation(q.evidence.explanation)));
  if(q.evidence.valid.length>1&&q._evidencePhase)right.appendChild(el('small','','형광펜 근거가 들어 있는 묶음 중 하나만 골라도 통과해요.'));
  if(q._evidencePhase?.paused){const back=el('button','act ghost evidence-return','해설 다 봤어요 · 다시 고르기');back.type='button';back.id='evidence-resume';back.onclick=()=>resumeEvidence(q);right.appendChild(back);}
  panel.appendChild(right);
  if(reading){
    const mark=Array.from(reading.querySelectorAll('mark[data-evidence-id],mark.evidence-highlight')).find(node=>node.dataset.evidenceId===correct.id)||reading.querySelector('mark.evidence-highlight');
    const paragraph=mark?.closest('.reading-paragraph, .evidence-group');
    if(paragraph)paragraph.after(panel);else reading.appendChild(panel);
  }else $('#q-fb').appendChild(panel);
  if(rejected&&q._evidencePhase)panel.scrollIntoView({block:'nearest',behavior:'instant'});
}
function scrollToAnswerExplanation(){
  const panel=$('#evidence-explanation');
  if(!panel){$('#q-fb').scrollIntoView({block:'nearest',behavior:'instant'});return;}
  const reading=panel.closest('.passage,.note'),anchor=reading?.querySelector('mark[data-evidence-id],mark.evidence-highlight');
  const first=anchor?.getBoundingClientRect(),last=panel.getBoundingClientRect();
  // Show the source and its annotation together when they fit; otherwise prioritize the explanation.
  if(first&&last.bottom-first.top<window.innerHeight-48)anchor.scrollIntoView({block:'start',behavior:'instant'});
  else panel.scrollIntoView({block:'nearest',behavior:'instant'});
}

function renderVocab(q, body){
  clearInterval(run.timerId);
  $('#q-timer').style.visibility='hidden';
  const intro=document.createElement('div'); intro.className='vocab-intro';
  const title=document.createElement('h2'); title.textContent='낱말 '+q.words.length+'개, 한 번에 익히기'; intro.appendChild(title);
  q.words.forEach(w=>{
    const card=document.createElement('div'); card.className='vocab-card';
    const word=document.createElement('strong'); word.textContent=w.word;
    const meaning=document.createElement('span'); meaning.textContent=w.meaning;
    card.append(word,meaning); intro.appendChild(card);
  });
  const begin=document.createElement('button'); begin.type='button'; begin.className='act primary'; begin.textContent='다 읽었어요 · 한 번에 맞추기';
  intro.appendChild(begin); body.appendChild(intro);
  begin.addEventListener('click',()=>{
    intro.remove();
    const title=document.createElement('p'); title.className='sent'; title.textContent=q.sent;
    const guide=document.createElement('p'); guide.textContent='낱말을 누르고 알맞은 뜻 칸을 누르세요. 다시 누르면 옮길 수 있어요.';
    const progress=document.createElement('p'); progress.className='vocab-progress'; progress.setAttribute('aria-live','polite');
    const board=document.createElement('div'); board.className='vocab-board';
    const pool=document.createElement('div'); pool.className='pool'; pool.setAttribute('aria-label','낱말 모음');
    const zones=document.createElement('div'); zones.className='zones vocab-zones';
    let selected=null; q._matches=Array(q.words.length).fill(null); q._submitted=false;
    const chips=q.words.map((w,i)=>{
      const chip=document.createElement('button'); chip.type='button'; chip.className='chip'; chip.textContent=w.word;
      chip.dataset.word=i; chip.setAttribute('aria-pressed','false');
      chip.addEventListener('click',e=>{
        e.stopPropagation(); if(q._submitted)return;
        const next=selected===chip?null:chip;
        chips.forEach(c=>{c.classList.remove('sel');c.setAttribute('aria-pressed','false');});
        selected=next; if(selected){selected.classList.add('sel');selected.setAttribute('aria-pressed','true');}
      }); return chip;
    });
    function refresh(){
      q._matches=q.words.map((w,i)=>{
        const chip=zones.querySelector('[data-slot="'+i+'"] .chip'); return chip?Number(chip.dataset.word):null;
      });
      const count=q._matches.filter(i=>i!==null).length;
      progress.textContent=count+' / '+q.words.length+'개 연결'; $('#q-check').disabled=count!==q.words.length;
    }
    function place(target){
      if(!selected||q._submitted)return;
      const old=target.querySelector('.chip'); if(target!==pool&&old)pool.appendChild(old);
      target.appendChild(selected);selected.classList.remove('sel');selected.setAttribute('aria-pressed','false');selected=null;refresh();
    }
    shuffle(chips).forEach(c=>pool.appendChild(c));
    pool.addEventListener('click',()=>place(pool));
    shuffle(q.words.map((w,i)=>({w,i}))).forEach(({w,i})=>{
      const zone=document.createElement('div');zone.className='zone';zone.dataset.slot=i;
      const label=document.createElement('button');label.type='button';label.className='vocab-target';label.textContent=w.meaning;label.setAttribute('aria-label',w.meaning+' — 이 뜻에 넣기');
      zone.appendChild(label);zone.addEventListener('click',()=>place(zone));zones.appendChild(zone);
    });
    board.append(pool,zones);body.append(title,guide,progress,board);refresh();
    $('#q-check').style.display='';startQuestionTimer(q);
  });
}

function unlockPicks(){ const pr=document.querySelector('#q-body .picks'); if(pr) pr.classList.remove('locked'); }
function pickRow(values, onPick, keepEnabled){
  const d=document.createElement('div'); d.className='picks';
  values.forEach(v=>{
    const b=document.createElement('button'); b.type='button'; b.className='pick'; b.textContent=v; b.setAttribute('aria-pressed','false');
    b.addEventListener('click', ()=>{
      d.querySelectorAll('.pick').forEach(o=>o.setAttribute('aria-pressed','false'));
      b.setAttribute('aria-pressed','true');
      if(!keepEnabled) d.querySelectorAll('.pick').forEach(o=>o.disabled=true);
      onPick(v);
    });
    d.appendChild(b);
  });
  return d;
}

let selChip=null;
function dragBlock(q, key, tenor, vehicle){
  key = key || '';
  if(tenor===undefined){ tenor=q.tenor; vehicle=q.vehicle; }
  const wrap=document.createElement('div');
  const pool=document.createElement('div'); pool.className='pool';
  const zones=document.createElement('div'); zones.className='zones';
  const mk=(role,label)=>{ const z=document.createElement('div'); z.className='zone'; z.dataset.role=role; z.innerHTML='<b>'+label+'</b>'; return z; };
  const zt=mk('tenor','원관념'), zv=mk('vehicle','보조관념');
  zones.append(zt,zv);
  shuffle([[tenor,'tenor'],[vehicle,'vehicle']]).forEach(p=>{
    const c=document.createElement('span'); c.className='chip serif'; c.textContent=p[0]; c.dataset.role=p[1]; c.tabIndex=0;
    c.addEventListener('click', e=>{ e.stopPropagation(); if(selChip) selChip.classList.remove('sel'); selChip=(selChip===c)?null:c; if(selChip) selChip.classList.add('sel'); });
    pool.appendChild(c);
  });
  [zt,zv,pool].forEach(z=> z.addEventListener('click', ()=>{
    if(!selChip) return;
    if(z.classList.contains('zone')){ const old=z.querySelector('.chip'); if(old) pool.appendChild(old); }
    z.appendChild(selChip); selChip.classList.remove('sel'); selChip=null;
    q['_t'+key] = zt.querySelector('.chip'); q['_v'+key] = zv.querySelector('.chip');
    checkReady(q);
  }));
  wrap.append(pool,zones);
  return wrap;
}
function checkReady(q){
  const dragDone = q.type==='pair' ? (!!q._tA && !!q._vA && !!q._tB && !!q._vB) : (!!q._t && !!q._v);
  const pickDone = (q.type==='both'||q.type==='pair') ? !!q._picked : true;
  $('#q-check').disabled = !(dragDone && pickDone);
}

/* ---- 채점 + 기록 ---- */
function submit(forceTimeout){
  const q = run.list[run.idx];
  if(q._submitted||q._timeDecision)return;document.getElementById('time-help')?.remove();
  if(forceTimeout!=='questionTimeout'&&forceTimeout!==true&&run.deadline!=null&&Date.now()>=run.deadline){q._unknown=false;timeHelp(q);return;}
  const timedOut=forceTimeout===true||forceTimeout==='questionTimeout'||run.deadline!=null&&Date.now()>=run.deadline;
  pauseQuestionClock();
  if(!timedOut && q.type==='vocabMatch' && (!q._matches || q._matches.some(i=>i===null)))return;
  q._timedOut=timedOut;
  q._submitted=true;
  clearInterval(run.timerId);
  const sec=(q._answerSeconds??Math.round(((q._solveElapsedMs||0)+(run.qStart?Math.max(0,Date.now()-run.qStart):0))/10)/100)+(q._evidenceResult?.sec||0);
  const now = new Date();

  let score=0, answerText='', msg='';
  const dragOK = () => q._t && q._v && q._t.dataset.role==='tenor' && q._v.dataset.role==='vehicle';
  const dragTxt = () => '원관념 '+(q._t?q._t.textContent:'—')+' / 보조관념 '+(q._v?q._v.textContent:'—');

  if(timedOut){
    const allowedSeconds=run.questionLimitSeconds+(run.extraSeconds||0);
    score=0;answerText='시간 초과 ('+allowedSeconds+'초)';
    msg=allowedSeconds+'초 동안 답하지 않아 오답 처리되었습니다.<br>'+(q.type==='vocabMatch'
      ?q.words.map(w=>w.word+' — '+w.meaning).join('<br>'):'정답 '+escapeHTML(q.answer)+' — '+escapeHTML(q.summaryWhy||q.why||''));
    $('#q-timer').textContent='0';
  }else if(q.type==='vocabMatch'){
    score=q._matches.reduce((n,word,slot)=>n+(q.words[word].meaning===q.words[slot].meaning?1:0),0);
    answerText=q._matches.map((word,slot)=>q.words[word].word+' → '+q.words[slot].meaning).join(' / ');
    msg=score+' / '+q.words.length+'개 정답<br>'+q.words.map(w=>w.word+' — '+w.meaning).join('<br>');
    document.querySelectorAll('.vocab-target').forEach(b=>b.disabled=true);
  }else if(q.type==='pair'){
    const ok=(t,v)=> !!t && !!v && t.dataset.role==='tenor' && v.dataset.role==='vehicle';
    const A=ok(q._tA,q._vA), B=ok(q._tB,q._vB), C=q._picked===q.answer;
    score=(A?1:0)+(B?1:0)+(C?1:0);
    answerText='①'+(q._tA?q._tA.textContent:'—')+'/'+(q._vA?q._vA.textContent:'—')+
               ' ②'+(q._tB?q._tB.textContent:'—')+'/'+(q._vB?q._vB.textContent:'—')+' 판단'+q._picked;
    msg='① '+(A?'○':'×')+' 원관념 '+q.aTenor+' · 보조관념 '+q.aVehicle+
        ' / ② '+(B?'○':'×')+' 원관념 '+q.bTenor+' · 보조관념 '+q.bVehicle+
        ' / 판단 '+(C?'○':'×')+' 정답 '+q.answer+' — '+q.why;
  }else if(q.type==='choice'||q.type==='ox'||q.type==='mc'){
    score = q._picked===q.answer ? 1:0; answerText=q._unknown?'? (모름 · 답 확인)':q._picked;
    msg = '정답 '+escapeHTML(q.answer)+' — '+escapeHTML(q.summaryWhy||q.why);
    if(q._evi!=null){
      const NO='①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯';
      const lab = i => (q.lines && q.lines[i] && q.lines[i].no) ? q.lines[i].no : (NO[i]||(i+1));
      const eviOK = q._eviFocus<0 || q._evi===q._eviFocus;
      answerText += ' / 근거:'+lab(q._evi)+(q._eviFocus>=0 ? (eviOK?'○':'×(정답 '+lab(q._eviFocus)+')') : '');
      if(q._eviFocus>=0) msg = (eviOK ? '근거 문장을 바르게 골랐습니다. ' : '근거는 '+lab(q._eviFocus)+'번 문장입니다. ') + msg;
    }
  }else if(q.type==='drag'){
    score = dragOK()?1:0; answerText=dragTxt();
    msg = '원관념 '+q.tenor+' · 보조관념 '+q.vehicle;
  }else{
    const a = q._picked===q.answer, b = dragOK();
    score = (a?1:0)+(b?1:0); answerText = q._picked+' / '+dragTxt();
    msg = '비유의 종류 '+(a?'○':'×')+' — 정답 '+q.answer+' · '+q.why+' / 원관념·보조관념 '+(b?'○':'×')+' — 원관념 '+q.tenor+' · 보조관념 '+q.vehicle;
  }
  if(score===q.max&&!q._evidenceResult&&requiresEvidence(q)){beginEvidence(q,sec);return;}
  const evidenceResult=q._evidenceResult;
  if(evidenceResult?.retired){
    answerText+=' / 기본 근거 선택 단계 종료'+(evidenceResult.hadMistake?' · 최초 근거 오답 유지':' · 이전 문제 답 정답 유지');
    if(!evidenceResult.ok)score=0;
    msg=(evidenceResult.hadMistake?'이전에 틀린 근거는 오답으로 유지하고 기본 OX로 복습합니다. ':'이전에 맞힌 문제 답을 유지했습니다. 기본 OX의 근거 선택 단계는 종료되었습니다. ')+'<br>'+msg;
  }else if(evidenceResult){
    const selectedSentence=q.evidence.sources.flatMap(source=>source.sentences).find(s=>s.id===evidenceResult.selected);
    answerText+=' / 근거 '+(evidenceResult.selectedCorrect?evidenceResult.selected+' '+selectedSentence.text+(evidenceResult.hadMistake?' (해설 후 정정 · 최초 근거 오답 유지)':''):'시간 초과');
    if(evidenceResult.selectedGroup)answerText+=' / 선택한 근거 묶음 '+(evidenceResult.selectedGroup.index+1)+' ['+evidenceResult.selectedGroup.members.join(',')+']';
    if(evidenceResult.rejectedGroups?.length){const first=evidenceResult.rejectedGroups[0];answerText+=' / 처음 고른 근거 묶음 '+(first.index+1)+' ['+first.members.join(',')+']';}
    if(evidenceResult.rejected.length){const firstWrong=q.evidence.sources.flatMap(source=>source.sentences).find(s=>s.id===evidenceResult.rejected[0]);answerText+=' / 최초 근거 오답: '+evidenceResult.rejected[0]+' '+(firstWrong?.text||'');}
    if(!evidenceResult.ok)score=0;
    msg=(evidenceResult.ok?'근거 문장도 처음에 바르게 찾았습니다. ':evidenceResult.selectedCorrect?'근거는 바로잡았지만 처음 선택이 틀렸으므로 이번 문항은 오답으로 기록됩니다. 정답 점수·XP·콤보 보상은 없고 필수 복습에서 다시 확인해요. ':'근거 선택 시간이 끝났어요. 문제 답은 맞혔고, 근거는 오답 복습에서 다시 확인해요. ')+'<br>'+msg;
  }
  if(q._evidenceOnlyReview)answerText='문제 답 이전 정답 유지 · 근거만 복습 / '+answerText;
  const ok = score===q.max;
  if(run.set.diagnosisPlan&&diagnosisPool?._loaded)diagnosisOnAnswer(q,ok);
  if(!ok&&!evidenceResult?.failureCounted)countFailure(q);
  const streak=ok?run.logs.reduce((n,l)=>l.ok?n+1:0,0)+1:0;
  const beforeXp=game.state().xp;
  const prize=game.answer(options.questionRewardScope||gameKey(run.set),q.id||q.pi+':'+q.qno,ok,streak,run.retry);

  const newLevel=Math.floor(game.state().xp/100)+1,oldLevel=Math.floor(beforeXp/100)+1;
  const fb=$('#q-fb'); fb.className='fb '+(ok?'ok':'no');
  const verdict=evidenceResult&&!evidenceResult.ok?(evidenceResult.retired?'이전 근거 오답 유지':evidenceResult.selectedCorrect?'근거 오답 · 해설 후 정정':'근거 찾기 시간 초과'):timedOut?'시간 초과 · 오답':q._unknown?'모름 · 정답과 해설 확인':ok?'맞았습니다':score>0?'일부 맞았습니다':'틀렸습니다';
  fb.replaceChildren(el('b','feedback-verdict',verdict));
  const answerLabel=value=>q.type==='mc'?(['①','②','③','④','⑤'][q.options.indexOf(value)]||value):value;
  if(['ox','mc','choice'].includes(q.type))fb.appendChild(el('p','feedback-answer','내 선택: '+(q._unknown?'? 모름':timedOut?'시간 초과':answerLabel(q._picked)||'—')+' · 정답: '+answerLabel(q.answer)));
  if(evidenceResult&&!evidenceResult.ok)fb.appendChild(el('p','feedback-notice',evidenceResult.selectedCorrect?'근거는 바로잡았지만 최초 오답은 유지돼요. 근거만 다시 복습합니다.':evidenceResult.retired?'이전 근거 오답을 기본 OX로 다시 복습합니다.':'문제 답은 맞혔고, 근거는 다시 복습합니다.'));
  $('#q-timer').hidden=true;$('#q-timer').textContent='';$('#q-timer').removeAttribute('aria-label');


  const rewards=el('div','answer-reward');
  if(ok){
    rewards.appendChild(el('strong','reward-heading','이번 정답 보상'));
    const chips=el('div','reward-chips');chips.appendChild(el('span','combo-chip',streak+' COMBO'));
    chips.appendChild(el('span','xp-chip',prize.xp?'+'+prize.xp+' XP':'추가 XP 없음'));
    if(prize.bonus)chips.appendChild(el('span','hint-chip','💡 힌트권 +1장'));
    if(newLevel>oldLevel)chips.appendChild(el('span','level-chip','🎉 레벨 상승! Lv.'+newLevel));
    rewards.appendChild(chips);
    if(!prize.xp)rewards.appendChild(el('small','reward-note',run.retry?'오답 복습에는 XP·연속 정답 아이템 보상이 없어요. 힌트는 무료예요.':'이미 첫 정답 XP를 받은 문항이에요. XP는 문항마다 한 번 지급돼요.'));
    if(streak%3===0&&!prize.bonus&&!run.retry)rewards.appendChild(el('small','reward-note','이 문항의 연속 정답 힌트권은 이미 받았어요.'));
    else if(!prize.bonus&&!run.retry)rewards.appendChild(el('small','reward-note',(3-streak%3)+'개 더 연속으로 맞히면 힌트권 1장! 같은 문항 보상은 한 번만 지급돼요.'));
    const meter=tools.querySelector('.combo-meter');if(meter)meter.textContent=streak+' COMBO'+(prize.bonus?' · 💡 힌트권 1장 획득!':'');
  }else{rewards.textContent='COMBO 초기화 · 이 문제는 필수 복습에 추가됐어요.';const meter=tools.querySelector('.combo-meter');if(meter)meter.textContent='0 COMBO · 다음 정답부터 다시 시작!';}
  // The single explanation is inserted before rewards below.
  impact(ok,streak,{...prize,level:newLevel>oldLevel?newLevel:null});
  helpPanel.hidden=true;hintBox.hidden=true;if($('#answer-support'))$('#answer-support').hidden=true;tools.querySelectorAll('button').forEach(b=>b.disabled=true);refreshWallet();
  document.querySelectorAll('#q-body .pick').forEach(button=>{if(button.textContent===q.answer)button.classList.add('answer-correct');else if(button.textContent===q._picked||q._unknown&&button.id==='answer-unknown')button.classList.add('answer-wrong');});
  document.querySelectorAll('#q-body [data-eliminated]').forEach(b=>b.hidden=false);
  if(q._unknown){$('#answer-unknown').textContent='? 모름 · 내 선택';$('#answer-unknown').classList.add('answer-unknown-selected');}
  document.querySelectorAll('#q-body .picks, #q-body .sent, #q-body .claim, #q-body .ask').forEach(n=>n.hidden=false);
  global.HomeworkReview.paint(q,$('#q-body'));
  if(evidenceResult&&!evidenceResult.retired)paintEvidenceResult(q);
  else if(q.evidence?.valid?.length)paintAnswerEvidence(q);
  else{const explanation=el('div','feedback-explanation');explanation.innerHTML=['ox','mc','choice'].includes(q.type)?escapeHTML(conciseExplanation(q.summaryWhy||q.why)):msg;fb.appendChild(explanation);}
  fb.appendChild(rewards);fb.appendChild(el('small','sec','풀이 시간 '+sec.toFixed(1)+'초'));
  document.querySelectorAll('#q-body button').forEach(b=>b.disabled=true);if($('#use-reading-size'))$('#use-reading-size').disabled=false;
  document.querySelectorAll('#q-body .chip, #q-body .zone').forEach(e=>e.style.pointerEvents='none');
  $('#q-check').style.display='none'; $('#q-next').style.display='';
  $('#q-next').textContent = run.idx+1===run.list.length ? '결과 보기 →' : '다음 문제로 →';showAnswerDock();
  $('#q-next').focus({preventScroll:true});
  scrollToAnswerExplanation();

  const log = {kind:'answer', uid:UID, session:run.session, set:run.set.group+' · '+run.set.name+(run.retry?' (오답)':''), attempt:run.attempt,
               part:q.part, qno:q.qno, qid:q.id, type:q.type, answer:answerText, correctAnswer: q.type==='drag' ? '원관념 '+q.tenor+' / 보조관념 '+q.vehicle
                 : q.type==='both' ? q.answer+' / 원관념 '+q.tenor+' / 보조관념 '+q.vehicle
                 : q.type==='pair' ? '①'+q.aTenor+'/'+q.aVehicle+' ②'+q.bTenor+'/'+q.bVehicle+' 판단'+q.answer
                 : q.answer,
               score, max:q.max, sec, timedOut, hinted:!!q._hintUsed||!!q._choiceHelpUsed, answerCorrect:!timedOut&&(q.type==='ox'||q.type==='mc')?q._picked===q.answer:undefined, problemAnswer:q._unknown?'모름':q._picked||undefined, unknown:!!q._unknown,reviewMode:q._evidenceOnlyReview?'evidence-only':run.retry?'full':undefined, evidence:evidenceResult||undefined, at:stamp(now),atMs:now.getTime()};
  run.logs.push({...log, sent:q.sent||q.changed||q.a||'', why:q.why||'', ok});
  saveRun(run.idx+1);
  paintGuidedStatus();
  enqueue(log);
  const rewardSummary=ok?streak+' COMBO · '+(prize.xp?'+'+prize.xp+' XP':'추가 XP 없음')+(prize.bonus?' · 힌트권 +1장':'')+(newLevel>oldLevel?' · Lv.'+newLevel+' 상승!':''):'COMBO 초기화 · 획득 XP 없음';
  scheduleNext(ok,rewardSummary);
}

function next(){
  if(!run||run.finished)return;
  if(run.list[run.idx]?._evidencePhase||run.list[run.idx]?._timeDecision)return;
  clearAutoNext();
  run.idx++;
  if(run.idx < run.list.length) renderQ(); else finish();
}

function finish(){
  if(!run||run.finished)return;
  run.finished=true;
  clearAutoNext();
  clearInterval(run.timerId);
  if(!run.retry) clearRun(run.set.id);
  else localStorage.removeItem(retryKey(run.set.id));
  const endAt = new Date();
  // 오답 목록: 전체 풀이면 새로 만들고, 오답 풀이면 그중 아직 틀린 것만 남김
  const findQuestion=l=>run.list.find(q=>l.qid?q.id===l.qid:q.part===l.part&&q.qno===l.qno);
  const wrongNow = run.logs.filter(l=>!l.ok).map(l=>{const detail=global.HomeworkResults.classify(l);return {pi:findQuestion(l).pi,qi:l.qno-1,mistakeKind:detail.kind,correctedAfterExplanation:detail.corrected,timedOut:detail.timedOut};});
  saveWrong(run.set.id, wrongNow);
  // 진단 10문제는 한 문제에 1점: 처음에 맞히거나, 이어 나온 같은 유형 새 문제로 만회하면 1점.
  const diag=run.set.diagnosisPlan&&global.HomeworkDiagnosis?global.HomeworkDiagnosis.score(run.set.diagnosisPlan,run.logs):null;
  const total = diag?diag.got:run.logs.reduce((a,l)=>a+l.score,0);
  const max = diag?diag.max:run.list.reduce((a,q)=>a+q.max,0);
  if(!run.retry){ try{ localStorage.setItem(lastKey(run.set.id), JSON.stringify({score:total, max, at:stamp(endAt)})); }catch(e){} }
  if(options.units){
    // Keep the completed attempt available to the teacher after the in-progress run is removed.
    const reportKey=PREFIX+'report_'+contentKey(run.set.id);let report={};try{report=JSON.parse(localStorage.getItem(reportKey)||'{}');}catch(_){}
    const compact=run.logs.map(log=>({qid:log.qid,part:log.part,qno:log.qno,type:log.type,score:log.score,max:log.max,ok:log.ok,answerCorrect:log.answerCorrect,problemAnswer:log.problemAnswer,unknown:log.unknown,answer:log.answer,correctAnswer:log.correctAnswer,evidence:log.evidence,timedOut:log.timedOut,hinted:log.hinted,sec:log.sec,reviewMode:log.reviewMode,at:log.at,atMs:log.atMs}));
    const attemptReport={attempt:run.attempt,session:run.session,score:total,max,startedAt:run.startedAt.toISOString(),endedAt:stamp(endAt),logs:compact};
    report[run.retry?'review':'normal']=attemptReport;
    if(!run.retry)delete report.review;
    localStorage.setItem(reportKey,JSON.stringify(report));
  }
  const wrongN = run.logs.filter(l=>!l.ok).length;
  const dur = Math.round((endAt-run.startedAt)/1000);
  const parts = run.set.parts.map((p,pi)=>{
    const ls = run.logs.filter(l=>l.part===p.name);
    return {name:p.name, got:ls.reduce((a,l)=>a+l.score,0), max:ls.reduce((a,l)=>a+l.max,0)};
  }).filter(p=>p.max>0);

  $('#e-title').textContent = run.set.group+' · '+run.set.name+(run.retry?' — 오답 다시 풀기':'');
  $('#e-retry').style.display = wrongNow.length ? '' : 'none';
  $('#e-retry').textContent = '바로 복습하기 · '+wrongNow.length+'문항 →';
  resultReview.hidden=!wrongNow.length;
  if(diag){$('#e-retry').style.display='none';resultReview.hidden=true;}$('#e-again').hidden=!!diag;
  resultReviewNote.textContent='방금 틀린 문제만 다시 풀어요. 근거만 틀렸다면 근거 선택부터 시작해요.';
  $('#e-sub').textContent = run.attempt+'번째 풀이 · '+stamp(run.startedAt).slice(0,16)+' 시작';
  $('#e-score').textContent = total; $('#e-max').textContent = ' / '+max;
  $('#e-meta').textContent = '틀린 문항 '+wrongN+'개 · 총 '+Math.floor(dur/60)+'분 '+(dur%60)+'초 · 문항당 평균 '+(dur/run.list.length).toFixed(1)+'초';
  $('#e-rows').innerHTML = parts.map(p=>'<div class="row"><span class="nm">'+p.name+'</span><span class="track"><span class="fill" style="width:'+(p.got/p.max*100)+'%"></span></span><span class="val">'+p.got+'/'+p.max+'</span></div>').join('');
  global.HomeworkResults.render({logs:run.logs,summary:outcomeSummary,wrongs:$('#e-wrongs'),findQuestion,classified:!!options.units||['development','traps'].includes(options.page)});
  document.getElementById('diagnosis-result')?.remove();if(diag&&!run.retry&&diagnosisPool?._loaded)paintDiagnosisResult();

  enqueue({kind:'summary', uid:UID, session:run.session, set:run.set.group+' · '+run.set.name+(run.retry?' (오답)':''), attempt:run.attempt,
           score:total, max, wrong:wrongN, sec:dur, startedAt:stamp(run.startedAt), endedAt:stamp(endAt),
           parts: parts.map(p=>p.name.split(' ')[0]+' '+p.got+'/'+p.max).join(', ')});
  resultAdventure(total,max,wrongNow.length);
  paintGuidedContinuation();
  updateSync();
  const state=studySession?.snapshot();
  const today=daily&&state?.active&&!run.retry?daily.finishParagraph(run.set):null;
  show('#scr-end');
  checkDailyFinish(today,state);
}

$('#q-check').addEventListener('click', submit);
$('#q-next').addEventListener('click', next);
let quitTimer=null;
$('#q-quit').addEventListener('click', ()=>{
  const b=$('#q-quit');
  if(b.dataset.armed){
    clearTimeout(quitTimer); delete b.dataset.armed; b.classList.remove('warn'); b.textContent='그만두기';
    clearInterval(run.timerId);pauseQuestionClock();saveRun();renderStart();show('#scr-start');
  }else{
    b.dataset.armed='1'; b.classList.add('warn'); b.textContent='여기까지 저장됩니다. 한 번 더 누르면 나갑니다';
    quitTimer=setTimeout(()=>{ delete b.dataset.armed; b.classList.remove('warn'); b.textContent='그만두기'; }, 4000);
  }
});
$('#e-home').addEventListener('click', ()=>{ renderStart(); show('#scr-start'); });
$('#e-resend').addEventListener('click', ()=>{ flush(); });
$('#diag').addEventListener('click', async ()=>{
  const out=$('#diag-out');out.style.display='block';out.textContent='연결을 확인하고 있습니다…';
  if(!global.HomeworkSync.isEndpoint(SHEET_URL)){
    out.textContent='아직 시트가 연결되지 않았습니다. 지금 푼 기록은 이 기기에 보관됩니다.\n보관 중: '+readQ().length+'건';return;
  }
  const lines=['전송 대기: '+readQ().length+'건'];
  try{ const response=await fetch(SHEET_URL);const text=(await response.text()).trim();
    lines.push(/^ok(?:\s|$)/.test(text)?'기록 서버 연결 정상':'서버 응답을 확인하지 못했습니다. 배포 주소와 접근 권한을 확인해 주세요.');
  }catch(error){lines.push('서버에 연결하지 못했습니다: '+error.message);}
  try{ const response=await fetch(SHEET_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify({kind:'batch',rows:[{kind:'test',rid:'test-'+Date.now()}]})});
    const text=(await response.text()).trim();lines.push(/^ok(?:\s|$)/.test(text)?'기록 전송 경로 정상 · 점검용 기록은 시트에 남지 않습니다.':'기록 수신을 확인하지 못했습니다. 배포 설정을 확인해 주세요.');
  }catch(error){lines.push('전송 경로를 확인하지 못했습니다: '+error.message);}
  out.textContent=lines.join('\n');void flush();
});
$('#e-again').addEventListener('click', ()=> start(run.set));
$('#e-retry').addEventListener('click', ()=> start(run.set, null, true));
document.addEventListener('click', e=>{ if(!e.target.closest('.chip')&&!e.target.closest('.zone')&&!e.target.closest('.pool')&&selChip){ selChip.classList.remove('sel'); selChip=null; } });

global.addEventListener('pagehide',()=>{
  if(run && $('#scr-q').classList.contains('on')){pauseQuestionClock();saveRun();}
});
if(options.guidedLearning&&global.HomeworkStudySession){
 if(daily)global.addEventListener('pagehide',event=>{
  if(event.isTrusted)daily.tick(false);
  daily.flush();
 });
 studySession=global.HomeworkStudySession.create({window:global,document,storage:sessionStorage,key:PREFIX+'study_session_'+UID,testMode:untimed,managedTime:!!daily,onRecord:record=>{localStorage.setItem(PREFIX+'homework_session_v1_'+record.id,JSON.stringify(record));},onChange:paintStudySession,onAlert:event=>{logStudentEvent(event.reason,({'hidden':'다른 탭·앱으로 이동','returned':'숙제 화면 복귀','idle-notice':'10초 무활동 알림','idle-warning':'20초 무활동 경고','fullscreen-exit':'전체화면 해제 알림'})[event.reason]||event.reason);if(event.reason==='returned')studyReturnNoticeUntil=Date.now()+5000;},onComplete:state=>{
  notifyHomeworkCompletion('session:'+state.startedAt,'30분 숙제 목표를 채웠어요.');
 }});
 paintStudySession(studySession.snapshot());
 document.addEventListener('click',event=>{if(event.target.closest?.('#student-logout'))studySession.end();},true);
}
renderStart();
if(options.units){nextTypeButton.textContent='단원 문제 고르기';$('#e-home').textContent=guidedActive()?'학습 현황':'단원으로';}
updateSync();
loadCloudHistory();
flush();
if(new URLSearchParams(location.search).get('review')==='1')openPending();
return { start, loadSet, renderStart, goUnit:options.units?goUnit:undefined, getRun:()=>run, sets:SETS, sync, game, storagePrefix:PREFIX, page:options.page };
}
global.HomeworkApp={mount};
})(window);
