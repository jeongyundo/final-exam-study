/* The student follows one curriculum. All counts use existing saved attempts. */
(function(global){
'use strict';
const steps=['2-2','3-1','3-2','5-2','6-1','6-2'];
const size=set=>set.parts.reduce((n,p)=>n+p.items.length,0);
// Hard mode contains the original textbook sets; type practice only repeats their questions.
// Concept sets, including their advanced questions, remain in the final supplement.
const isHardSet=set=>!set.isTypePractice&&set.unitType!=='concept'&&(set.unitType==='advanced'||set.level==='심화');
function unitOrder(own,unit){
 const result=[],seen=new Set(),append=selected=>{for(const set of selected)if(!seen.has(set.id)){seen.add(set.id);result.push(set);}};
 for(const group of unit?.readingGroups||[]){
  for(const chunk of group.chunks||[]){
   // Read every individual paragraph before attempting the chunk's combined basic set.
   for(const ref of chunk.refs||[])append(own.filter(s=>s.isQuickPractice&&s.readingBlock===group.id&&s.readingChunk===chunk.id&&s.id.includes(ref.toLowerCase())));
   append(own.filter(s=>s.isQuickPractice&&s.readingBlock===group.id&&s.readingChunk===chunk.id));
   append(own.filter(s=>!s.isQuickPractice&&s.readingBlock===group.id&&s.readingChunk===chunk.id));
  }
  append(own.filter(s=>s.readingBlock===group.id&&['apply','examples'].includes(s.readingChunk)));
  append(own.filter(s=>s.readingBlock===group.id));
 }
 append(own);return result;
}
function order(sets,units){
 const result=[];
 for(const id of steps){
  const unit=units.find(u=>u.id===id);if(!unit)continue;
  const own=sets.filter(s=>s.unitId===id&&!s.isTypePractice&&!s.isVocabularyPractice&&s.unitType!=='concept'&&!isHardSet(s));
  result.push(...unitOrder(own,unit));
 }
 // All six basic textbook courses come first, followed by each unit's existing supplements.
 for(const id of steps)result.push(...sets.filter(s=>s.unitId===id&&!s.isTypePractice&&s.unitType==='concept'));
 return result;
}
// Saved work or reviews later in the curriculum must not skip an earlier unfinished paragraph.
function nextState(ordered,enabled=true){
 const state=enabled?ordered.find(s=>!s.done):null;if(!state)return null;
 const kind=state.reviewTotal>0||state.retry?'review':state.normal?'resume':'new';
 const solved=state.normal?Math.max(Number(state.normal.idx)||0,state.normal.logs?.length||0):0;
 return {...state,kind,remaining:kind==='review'?state.reviewLeft:Math.max(0,state.total-solved)};
}
function build({sets,units,storage,prefix,page}){
 const read=key=>{try{return JSON.parse(storage.getItem(key)||'null');}catch(_){return null;}},game=read('homework_adventure_v1')||{},path=order(sets,units);
 const states=sets.map(set=>{const key='v'+(set.revision||1)+'_'+set.id,last=read(prefix+'last_'+key),report=read(prefix+'report_'+key),normal=global.HomeworkAttemptState.active(read(prefix+'run_'+key),report),retry=global.HomeworkAttemptState.active(read(prefix+'run_'+key+'_retry'),report),wrong=read(prefix+'wrong_'+key)||[],pending=game.pendingReviews?.[page+'|'+key];const total=size(set),logs=normal?.logs||report?.normal?.logs||[];
  const answered=last?total:Math.min(total,Math.max(new Set(logs.map(l=>l.qid||l.part+':'+l.qno)).size,Number(normal?.idx)||0));
  const reviewTotal=wrong.length||Number(pending?.wrong)||0,reviewLeft=Math.max(0,reviewTotal-(retry?.logs||[]).filter(l=>l.ok).length);
  const mastered=Math.min(total,Math.max(0,last?total-reviewTotal:logs.filter(l=>l.ok).length)+(retry?.logs||[]).filter(l=>l.ok).length);
  return {set,last,normal,retry,wrong,pending,total,answered,mastered,correct:last?Math.min(total,Number(last.score)||0):logs.filter(l=>l.ok).length,reviewTotal,reviewLeft,done:!!last&&!reviewTotal&&!retry&&!normal};
 });
 const fraction=own=>{if(!own.length)return 0;const total=own.reduce((n,s)=>n+s.total,0),raw=total?own.reduce((n,s)=>n+s.mastered,0)/total:0;return own.every(s=>s.done)?1:Math.min(.999,raw);};
 const byId=new Map(states.map(s=>[s.set.id,s])),ladder=steps.map(id=>{
  const unit=units.find(u=>u.id===id),own=path.filter(s=>s.unitId===id&&s.unitType!=='concept').map(s=>byId.get(s.id)),supplements=path.filter(s=>s.unitId===id&&s.unitType==='concept').map(s=>byId.get(s.id));
  const total=own.reduce((n,s)=>n+s.total,0),answered=own.reduce((n,s)=>n+s.answered,0),correct=own.reduce((n,s)=>n+s.correct,0),ready=total>0;
  const groups=unit?.readingGroups||Array.from({length:4},(_,i)=>({id:'preparing-'+i,title:'챕터 '+(i+1)+' 자료 준비 중',chunks:[]}));
  const chapters=groups.map((g,index)=>{const selected=own.filter(s=>s.set.readingBlock===g.id),progress=fraction(selected);return {id:g.id,title:g.title,summary:g.summary||'',index,ready:!!selected.length,progress,done:!!selected.length&&selected.every(s=>s.done),segments:g.chunks||[],sets:selected};});
  const done=ready&&chapters.length===4&&chapters.every(c=>c.done)&&own.every(s=>s.done),progress=chapters.reduce((n,c)=>n+c.progress,0)/4;
  const hardSets=unitOrder(sets.filter(s=>s.unitId===id&&isHardSet(s)),unit).map(s=>byId.get(s.id));
  const hard={sets:hardSets,unlocked:done,progress:fraction(hardSets),done:!!hardSets.length&&hardSets.every(s=>s.done),next:nextState(hardSets,done),reviewCount:hardSets.reduce((n,s)=>n+s.reviewLeft,0)};
  const extraReviews=states.filter(s=>s.set.unitId===id&&s.set.isTypePractice&&s.set.level!=='심화'&&s.set.unitType!=='advanced'&&s.reviewTotal>0);
  const supplementProgress=ready?(supplements.length?fraction(supplements):1):0,supplementDone=ready&&supplements.every(s=>s.done)&&!extraReviews.length;
  return {id,title:unit?.title||'',ready,total,answered,correct,remaining:total-answered,done,progress,expectedAccuracy:75*progress,practiceAccuracy:answered?correct/answered*100:null,chapters,sets:own,supplements,supplementProgress:supplementDone?1:Math.min(.999,supplementProgress),supplementDone,extraReviews,hard};
 });
 const bodyCurrent=ladder.find(s=>!s.done),phase=bodyCurrent?'body':ladder.some(s=>!s.supplementDone)?'supplement':'complete',current=bodyCurrent||ladder.find(s=>!s.supplementDone)||ladder.at(-1);
 const eligible=phase==='body'?current.sets:phase==='supplement'?[...current.supplements,...current.extraReviews]:[],next=nextState(eligible);
 const bodyProgress=ladder.reduce((n,u)=>n+u.progress,0)/6,supplementProgress=ladder.reduce((n,u)=>n+u.supplementProgress,0)/6,progress=(bodyProgress*24+supplementProgress*6)/30;
 return {steps:ladder,current,phase,progress,expectedAccuracy:(18*bodyProgress+2*supplementProgress)/24*100,chaptersDone:ladder.flatMap(s=>s.chapters).filter(c=>c.done).length,chaptersTotal:24,next,reviewCount:eligible.reduce((n,s)=>n+s.reviewLeft,0),completedSteps:ladder.filter(s=>s.done).length};
}
function knowledge(set,kind){
 if(kind==='review')return ['문제 답을 틀린 문항은 처음부터 다시 풀어요.','근거만 틀린 문항은 근거 묶음만 다시 골라요.','오답을 모두 확인한 뒤 다음 학습으로 넘어가요.'];
 if(set.prerequisites?.length)return set.prerequisites;
 if(set.orderedProgression)return ['먼저 설명을 보고, 글에서 중요한 말을 찾아봐요.','글의 내용을 비슷한 말이나 반대말로 바꾼 문제를 풀어요.','마지막 5단계에서는 이 문단의 가장 중요한 내용을 확인해요.'];
 if(set.unitType==='concept')return /concept-b/.test(set.id)?['사회·문화적 이념은 현재 상황에서 수용할 수 있는지 따져요.','창의적 읽기는 새로운 대안을 찾는 읽기예요.','감상적 읽기는 공감하며 감동과 즐거움을 얻는 읽기예요.']:['타당성은 내용이 옳고 정확한지 살피는 기준이에요.','공정성은 한쪽으로 치우치지 않았는지 보는 기준이에요.','표현의 적절성은 목적에 맞게 효과적으로 표현했는지 보는 기준이에요.'];
 if(set.isQuickPractice)return ['먼저 설명을 보고, 글에서 중요한 말을 찾아봐요.','형광펜 핵심 문장과 짧은 정보 하나를 비교해요.','같은 문단에 나온 내용만 보고 O·X를 골라요.'];
 if(set.level==='심화')return ['해당 문단을 읽고 다섯 선지 중 하나를 골라요.','문제 답을 맞히면 근거가 포함된 묶음 하나를 골라요.','틀렸을 때는 설명을 확인한 뒤 다시 연습해요.'];
 return ['먼저 형광펜으로 표시한 내용을 읽어요.','본문과 새 적용 예시는 표시를 보고 구별해요.','주어진 문단의 내용과 맞으면 O, 다르면 X를 골라요.'];
}
global.HomeworkLearningPath={steps,order,build,knowledge,isHardSet};
})(typeof window==='undefined'?globalThis:window);
