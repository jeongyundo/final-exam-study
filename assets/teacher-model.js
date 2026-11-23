/* Pure read model. Reading a report never uses the student's storage or writes sync operations. */
(function(global){
'use strict';
const termPrefix='practice_units_final2026_',termPage='units-final2026';
const parse=value=>{try{return typeof value==='string'?JSON.parse(value):value;}catch(_){return null;}};
const time=value=>{if(!value)return 0;if(typeof value==='number')return value;const text=String(value);const n=Date.parse(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(text)?text.replace(' ','T')+'+09:00':text);return Number.isFinite(n)?n:0;};
function homeworkReport(records){
 const sessions=[],days=new Map(),statuses=new Set(['active','completed','stopped','interrupted']),reasons=new Set(['timer','manual','class','unobserved']);
 const stamp=value=>typeof value==='number'&&Number.isFinite(value)&&value>0&&Number.isFinite(new Date(value+9*3600000).getTime())?Math.floor(value):0;
 const bounded=(value,max)=>typeof value==='number'&&Number.isFinite(value)?Math.min(max,Math.max(0,Math.floor(value))):0;
 const sums=['elapsedMs','observedMs','visibleMs','hiddenMs','unobservedMs','tabSwitches','idleNotices','idleWarnings','fullscreenExits'];let latestSync=0;
 for(const [key,record] of Object.entries(records)){
  const match=key.match(/^practice_units_final2026_homework_session_v1_(.+)$/),value=match&&parse(record?.value);
  if(!value||value.version!==1||value.id!==match[1]||value.testMode===true||value.mode==='class'||!statuses.has(value.status))continue;
  const managedTime=value.managedTime===true,durationMs=(managedTime?120:30)*60000;
  const startedAt=stamp(value.startedAt),updatedAt=stamp(value.updatedAt),rawEnd=stamp(value.endedAt);
  if(!startedAt||updatedAt<startedAt)continue;
  const endedAt=rawEnd>=startedAt&&rawEnd<=updatedAt?rawEnd:null,endReason=reasons.has(value.endReason)?value.endReason:null;
  const elapsedMs=bounded(value.elapsedMs,Math.min(durationMs,(endedAt||updatedAt)-startedAt)),observedBudget=bounded(value.observedMs,elapsedMs);
  const visibleMs=bounded(value.visibleMs,observedBudget),hiddenMs=bounded(value.hiddenMs,observedBudget-visibleMs),observedMs=visibleMs+hiddenMs;
  // Completion requires the controller's observed timer event. A closed browser,
  // stale active record or elapsed wall time alone cannot certify 30 minutes.
  const complete=!managedTime&&value.status==='completed'&&endReason==='timer'&&value.durationMs===durationMs&&value.elapsedMs===durationMs&&endedAt===startedAt+durationMs;
  const session={version:1,id:value.id,startedAt,updatedAt,endedAt,status:value.status,endReason,durationMs,managedTime,elapsedMs,observedMs,visibleMs,hiddenMs,unobservedMs:elapsedMs-observedMs,
   tabSwitches:bounded(value.tabSwitches,durationMs),idleNotices:bounded(value.idleNotices,durationMs),idleWarnings:bounded(value.idleWarnings,durationMs),fullscreenExits:bounded(value.fullscreenExits,durationMs),windowed:value.windowed===true,testMode:false,complete,date:new Date(startedAt+9*3600000).toISOString().slice(0,10)};
  sessions.push(session);latestSync=Math.max(latestSync,stamp(time(record.at)));
  if(!days.has(session.date))days.set(session.date,{date:session.date,sessions:0,completedSessions:0,...Object.fromEntries(sums.map(key=>[key,0]))});
  const day=days.get(session.date);day.sessions++;if(complete)day.completedSessions++;for(const key of sums)day[key]+=session[key];
 }
 sessions.sort((a,b)=>b.startedAt-a.startedAt||b.updatedAt-a.updatedAt||a.id.localeCompare(b.id));
 return {homeworkSessions:sessions,homeworkDaily:[...days.values()].sort((a,b)=>b.date.localeCompare(a.date)),homeworkTrackingKnown:sessions.length>0,latestSync};
}
function classify(log){
 const wrong=log.ok===false||(log.ok==null&&Number(log.score)<Number(log.max));
 const evidence=log.evidence,kind=wrong?(evidence||log.answerCorrect===true?'evidence':'answer'):'correct';
 return {kind,corrected:kind==='evidence'&&!!evidence?.selected&&evidence.selectedCorrect!==false&&!!(evidence.hadMistake||evidence.rejected?.length)};
}
function build(records,catalog,history={rows:[],answers:[]}){
 const read=key=>parse(records[key]?.value),game=read('homework_adventure_v1')||{},sets=[],answered=new Set(),remaining=new Map(),activity=new Map(),ridKeys=new Map(),observedIds=new Map();
 const catalogById=new Map(catalog.sets.map(s=>[s.id,s])),storedRuns=[],contexts=new Map(),offsetCandidates=new Map();
 const summaries=new Map();for(const row of history.rows||[]){if(!row.session)continue;if(!summaries.has(row.session))summaries.set(row.session,[]);summaries.get(row.session).push(row);}
 // Keep historical attempts visible without treating an older edition as current progress.
 for(const [key,record] of Object.entries(records)){
  const match=key.match(/^practice_units_final2026_(run|report)_v(\d+)_(.+)$/),value=match&&parse(record.value);if(!value)continue;
  const retry=match[1]==='run'&&match[3].endsWith('_retry'),id=retry?match[3].slice(0,-6):match[3],current=catalogById.get(id),archived=!current||Number(match[2])!==(current.revision||1);
  const set=current||{id,name:id,group:'기말고사 이전 구성',mode:id.includes('-trap-')?'trap':'flow',items:[]};
  const runs=match[1]==='report'?[[value.normal,false],[value.review,true]]:[[value,retry]];
  for(const [run,review] of runs){if(!run)continue;storedRuns.push({run,set,review,archived,record,kind:match[1]});
   if(run.session){const context={set,archived,review};if(!contexts.has(run.session)||!archived)contexts.set(run.session,context);}
   // Only two representations of the same start event can establish a timezone offset.
   // A server receipt timestamp is not the student's answer time.
   if(!run.session||typeof run.startedAt!=='string'||!/(?:Z|[+-]\d\d:\d\d)$/.test(run.startedAt))continue;
   const start=time(run.startedAt);if(!start)continue;
   for(const summary of summaries.get(run.session)||[]){
    if(!/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(summary.startedAt||''))continue;
    const local=time(summary.startedAt);if(!local)continue;const raw=start-local,offset=Math.round(raw/60000)*60000;
    if(Math.abs(offset)>14*3600000||Math.abs(raw-offset)>1000)continue;
    if(!offsetCandidates.has(run.session))offsetCandidates.set(run.session,new Set());offsetCandidates.get(run.session).add(offset);
   }
  }
 }
 const offsets=new Map([...offsetCandidates].filter(([,values])=>values.size===1).map(([session,values])=>[session,[...values][0]]));
 const logTime=(log,session)=>{
  if(Number.isFinite(log.atMs)&&log.atMs>0)return {atMs:log.atMs,timeCorrected:false,explicitTime:true};
  const atMs=time(log.at),offset=atMs&&/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(log.at||'')?offsets.get(session)||0:0;
  return {atMs:atMs?atMs+offset:0,timeCorrected:!!offset,explicitTime:false};
 };
 let latestSync=0,latestAnswer=0;
 const addLog=(log,set,review=false,session='',archived=false)=>{
  session=String(log.session||session||'');const location=[session,log.part,log.qno].join('|');
  if(log.qid)observedIds.set(location,log.qid);
  const item=set.items.find(q=>q.id===log.qid)||(!archived&&!log.qid?set.items.find(q=>q.part===log.part&&q.qi+1===Number(log.qno))||set.items.find(q=>q.part.split(' · ')[0]===String(log.part||'').split(' · ')[0]&&q.qi+1===Number(log.qno)):null);if(!item&&!archived)return;
  const qid=archived?log.qid||observedIds.get(location)||[set.id,log.part,log.qno].join(':'):item.id,q=catalog.questions[qid];
  const timing=logTime(log,session);if(!archived)answered.add(qid);latestAnswer=Math.max(latestAnswer,timing.atMs);
  // The sheet has a rid while run/report copies usually do not. Match the underlying
  // response first, keeping separate sessions and repeated review attempts separate.
  const canonical=[set.id,session,timing.atMs?Math.floor(timing.atMs/1000):String(log.at||''),qid,review?'review':'normal'].join('|');
  const key=log.rid&&ridKeys.get(log.rid)||canonical;if(log.rid)ridKeys.set(log.rid,key);
  const previous=activity.get(key),preferPreviousTime=previous?.explicitTime&&!timing.explicitTime;
  activity.set(key,{...previous,...log,qid,question:archived?log.sent||q?.text||'':q?.text||log.sent||'',setId:set.id,setName:set.name,group:set.group,mode:set.mode,session,review,archived,
   ...timing,...(preferPreviousTime?{atMs:previous.atMs,timeCorrected:previous.timeCorrected,explicitTime:true}:{}),detail:classify(log)});
 };
 for(const set of catalog.sets){
  const content='v'+(set.revision||1)+'_'+set.id,key=termPrefix,report=read(key+'report_'+content)||{},storedNormal=read(key+'run_'+content),storedRetry=read(key+'run_'+content+'_retry'),normalRun=global.HomeworkAttemptState.active(storedNormal,report),retryRun=global.HomeworkAttemptState.active(storedRetry,report),last=read(key+'last_'+content),wrong=read(key+'wrong_'+content)||[],attempts=Number(read(key+'attempts_'+set.id)||0),record=game.records?.[termPage+'|'+content],pending=game.pendingReviews?.[termPage+'|'+content];
  for(const suffix of ['run_'+content,'run_'+content+'_retry','last_'+content,'wrong_'+content,'report_'+content])latestSync=Math.max(latestSync,records[key+suffix]?.at||0);
  if(last){set.items.forEach(q=>answered.add(q.id));latestAnswer=Math.max(latestAnswer,logTime(last,report.normal?.session).atMs);}
  for(const [run,isReview] of [[storedNormal,false],[storedRetry,true],[report.normal,false],[report.review,true]])for(const log of run?.logs||[])addLog(log,set,isReview,run.session);
  const mistakes=wrong.map(w=>{const item=set.items.find(q=>q.pi===w.pi&&q.qi===w.qi);if(!item)return null;const q=catalog.questions[item.id];const detail={...w,qid:item.id,question:q?.text||'',answer:q?.answer,why:q?.why,valid:q?.valid||[],setId:set.id,setName:set.name,group:set.group,mode:set.mode};if(!remaining.has(item.id))remaining.set(item.id,[]);remaining.get(item.id).push(detail);return detail;}).filter(Boolean);
  // A completed wrong answer is visible immediately, before the entire set is finished.
  const addActiveMistake=(qid,detail)=>{const item=set.items.find(q=>q.id===qid);if(!item||mistakes.some(m=>m.qid===qid))return;const q=catalog.questions[qid],entry={...detail,qid,pi:item.pi,qi:item.qi,question:q?.text||'',answer:q?.answer,why:q?.why,valid:q?.valid||[],setId:set.id,setName:set.name,group:set.group,mode:set.mode,provisional:true};mistakes.push(entry);if(!remaining.has(qid))remaining.set(qid,[]);remaining.get(qid).push(entry);};
  for(const log of normalRun?.logs||[]){const detail=classify(log);if(detail.kind!=='correct')addActiveMistake(log.qid,{mistakeKind:detail.kind,correctedAfterExplanation:detail.corrected,timedOut:log.timedOut});}
  if(normalRun?.activeQuestion?.evidence?.failed)addActiveMistake(normalRun.activeQuestion.id,{mistakeKind:'evidence',correctedAfterExplanation:false});
  const waiting=Math.max(mistakes.length,Number(pending?.wrong)||0),active=retryRun||normalRun,completed=!!last,mastered=!!record?.mastered&&!waiting&&!active;
  const state=retryRun?'reviewing':normalRun?'solving':waiting?'review':mastered?'mastered':completed?'finished':'untouched';
  sets.push({...set,content,last,report,attempts,completed,mastered,waiting,state,active,answered:Math.min(set.total,active?.logs?.length||active?.idx||0),mistakes});
 }
 for(const entry of storedRuns.filter(r=>r.archived)){
  latestSync=Math.max(latestSync,time(entry.record.at));
  for(const log of entry.run.logs||[])addLog(log,entry.set,entry.review,entry.run.session,true);
 }
 // Session contexts also identify renamed/retired final-exam sets. Unrelated prior
 // exams remain excluded, even when their sheet rows are available in the account.
 const labels=new Map(sets.map(s=>[s.group+' · '+s.name,s]));
 for(const row of history.answers||[]){const context=contexts.get(row.session),review=context?.review??/\s*\(오답\)\s*$/.test(row.set||''),set=context?.set||labels.get(String(row.set||'').replace(/\s*\(오답\)\s*$/,''));if(!set)continue;const evidenceWrong=/최초 근거 오답|해설 후 정정|근거 시간 초과|근거 찾기 시간 초과/.test(row.answer||'');const log={...row,ok:Number(row.score)>=Number(row.max)};
  const selected=String(row.answer).match(/(?:^|\/)\s*근거\s+([A-Z]\d+:\d+)/)?.[1];
  if(selected||evidenceWrong){
   const group=label=>{const match=String(row.answer).match(new RegExp(label+' 근거 묶음 (\\d+) \\[([^\\]]+)\\]'));if(!match)return null;return {index:Number(match[1])-1,members:match[2].split(',')};};
   const rejectedGroup=group('처음 고른'),first=String(row.answer).match(/최초 근거 오답:\s*([A-Z]\d+:\d+)/)?.[1];
   log.answerCorrect=true;log.evidence={hadMistake:/최초 근거 오답|해설 후 정정/.test(row.answer),selected:selected||null,selectedCorrect:!!selected,selectedGroup:group('선택한'),rejectedGroups:rejectedGroup?[rejectedGroup]:[],rejected:first?[first]:[]};
  }
  addLog(log,set,review,row.session,!!context?.archived);
 }
 const readingKeys=['locate','meaning','role','bridge','check'],readingMap=new Map();
 function addReading(unitId,ref,value,updatedAt,direct=false){
  if(!/^\d+-\d+$/.test(unitId||'')||!/^\w\d+$/.test(ref)||!value?.records||value.version!==1)return;
  const id=unitId+'|'+ref,previous=readingMap.get(id),at=time(updatedAt);
  if(previous&&(previous.direct&&!direct||previous.direct===direct&&previous.updatedAt>at))return;
  const completedSteps=readingKeys.filter(k=>value.records[k]?.done===true).length;
  readingMap.set(id,{unitId,paragraph:Number(ref.slice(1)),completedSteps,totalSteps:5,assistedSteps:readingKeys.filter(k=>value.records[k]?.assisted===true).length,complete:completedSteps===5&&value.stage===6,updatedAt:at,direct});
 }
 for(const [key,record] of Object.entries(records)){
  const match=key.match(/^practice_units_final2026_reading-guide-v1-(\d+-\d+)-([A-Z]\d+)$/);if(match)addReading(match[1],match[2],parse(record.value),record.at,true);
 }
 for(const {run,set,record,kind} of storedRuns){
  if(kind!=='run')continue;const unitId=set.unitId||set.id.match(/^unit(\d)(\d)-/)?.slice(1).join('-');
  for(const [ref,value] of Object.entries(run.readingStates||{}))addReading(unitId,ref,value,record.at);
 }
 const reading=[...readingMap.values()].map(({direct,...value})=>value).sort((a,b)=>a.unitId.localeCompare(b.unitId)||a.paragraph-b.paragraph);
 for(const value of reading)latestSync=Math.max(latestSync,value.updatedAt);
 const studentEvents=[];
 for(const [key,record] of Object.entries(records)){
  const match=key.match(/^practice_units_final2026_homework_event_v1_(.+)$/);if(!match)continue;
  const value=parse(record?.value);if(!value||value.version!==1||value.id!==match[1]||!Number.isFinite(value.at)||value.at<=0||typeof value.kind!=='string'||typeof value.label!=='string')continue;
  studentEvents.push({...value,label:value.label.slice(0,1000),control:String(value.control||'').slice(0,120)});latestSync=Math.max(latestSync,time(record.at));
 }
 studentEvents.sort((a,b)=>b.at-a.at||a.id.localeCompare(b.id));
 const homework=homeworkReport(records);latestSync=Math.max(latestSync,homework.latestSync);
 const allActivity=[...activity.values()].sort((a,b)=>b.atMs-a.atMs),days=new Map(),correctedSessions=new Set();let correctedAnswers=0;
 for(const log of allActivity){
  if(log.timeCorrected){correctedAnswers++;correctedSessions.add(log.session);}
  if(!log.atMs)continue;const date=new Date(log.atMs+9*3600000).toISOString().slice(0,10);
  if(!days.has(date))days.set(date,{date,total:0,normal:0,review:0,correct:0,uniqueQuestions:new Set(),seconds:0});
  const day=days.get(date);day.total++;day[log.review?'review':'normal']++;if(log.detail.kind==='correct')day.correct++;
  day.uniqueQuestions.add(log.qid);const seconds=Number(log.sec);if(Number.isFinite(seconds)&&seconds>0)day.seconds+=seconds;
 }
 const daily=[...days.values()].map(day=>({...day,uniqueQuestions:day.uniqueQuestions.size})).sort((a,b)=>b.date.localeCompare(a.date));
 const modes=Object.fromEntries(['flow','trap'].map(mode=>{const rows=sets.filter(s=>s.mode===mode),finished=rows.filter(s=>s.last&&Number(s.last.max)>0);return [mode,{sets:rows.length,completed:finished.length,mastered:rows.filter(s=>s.mastered).length,score:finished.reduce((n,s)=>n+Number(s.last.score||0),0),max:finished.reduce((n,s)=>n+Number(s.last.max||0),0)}];}));
 const wrongs=[...remaining].map(([qid,contexts])=>({qid,contexts,question:catalog.questions[qid]?.text||'',answer:catalog.questions[qid]?.answer,valid:catalog.questions[qid]?.valid||[],answerWrong:contexts.some(c=>c.mistakeKind!=='evidence'),evidenceWrong:contexts.some(c=>c.mistakeKind==='evidence'),corrected:contexts.some(c=>c.correctedAfterExplanation)}));
 return {studentEvents,totalQuestions:catalog.totalQuestions,uniqueAnswered:answered.size,modes,sets,wrongs,answerWrong:wrongs.filter(w=>w.answerWrong).length,evidenceWrong:wrongs.filter(w=>w.evidenceWrong).length,remaining:wrongs.length,unknownReviewCount:sets.reduce((n,s)=>n+Math.max(0,s.waiting-s.mistakes.length),0),pendingSets:sets.filter(s=>s.waiting).length,latestSync,latestAnswer,activity:allActivity.slice(0,100),activityTotal:allActivity.length,daily,reading,homeworkSessions:homework.homeworkSessions,homeworkDaily:homework.homeworkDaily,homeworkTrackingKnown:homework.homeworkTrackingKnown,timeCorrections:{sessions:correctedSessions.size,answers:correctedAnswers},xp:game.xp||0};
}
global.HomeworkTeacherModel={build,classify,time};
})(typeof window==='undefined'?globalThis:window);
