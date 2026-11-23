/* Versioned pilot state. Existing question/run/score keys are never written here. */
var HomeworkSocratic = (function(){
'use strict';
const suffix='socratic_v1_unit22-p01-03',eventSuffix='socratic_event_v1_';
// Each course keeps its own saved state. The 1~3 course keeps its original key.
const suffixFor=content=>content?.id?'socratic_v1_'+content.id:suffix;
const covers=['unit22-l01-quick-basic','unit22-l02-quick-basic','unit22-l03-quick-basic','unit22-intro-p01-03-basic'];
const clone=v=>JSON.parse(JSON.stringify(v)),parse=v=>{try{return JSON.parse(v||'null');}catch(_){return null;}};
const day=t=>new Date(t+9*3600000).toISOString().slice(0,10);
const norm=s=>String(s).normalize('NFC').replace(/[\s.!?。]/g,'');
function read(storage,prefix,content){const s=parse(storage.getItem(prefix+suffixFor(content)));return s?.schema===1&&s.content?.skills?.length?s:null;}
function level(r){if(!r||!r.first)return null;if(r.recallCorrect&&r.independent)return 4;if(r.solved)return 3;if(r.help)return 2;return 1;}
function summary(s,now=Date.now()){
 if(!s)return {started:false,pending:[],combinedPending:[],pendingCount:0,due:[],paragraphs:[],skills:[],complete:false};
 const skills=s.content.skills.map(k=>({id:k.id,title:k.title,paragraph:k.paragraph,...s.results[k.id],level:level(s.results[k.id])}));
 const pending=skills.filter(r=>r.pending).map(r=>r.id),due=skills.filter(r=>r.solved&&!r.recallCorrect&&!r.teacherPending&&r.dueAt<=now&&r.lastRecallDay!==day(now)).map(r=>r.id);
 const all=[...new Set(skills.map(k=>k.paragraph))],paragraphs=all.filter(p=>skills.filter(k=>k.paragraph===p).every(k=>k.solved&&!k.pending));
 const combinedPending=s.combined.map((x,i)=>x.pending?i:null).filter(i=>i!==null);
 return {started:true,pending,combinedPending,pendingCount:pending.length+combinedPending.length,due,paragraphs,skills,totalParagraphs:all.length,complete:paragraphs.length===all.length&&s.combined.every(x=>x.correct&&!x.pending),initialCorrect:skills.filter(k=>k.first==='correct'&&!k.reasonWrong).length,wrong:skills.filter(k=>k.first==='wrong').length,unknown:skills.filter(k=>k.first==='unknown').length,assisted:skills.filter(k=>k.help||k.reasonWrong).length,mastered:skills.filter(k=>k.level===4).length};
}
// Online ladder edits keep ids, evidence and sources; only wording, choices and answers change.
const editKey=(course,key)=>'ladder:'+course.id+':'+key;
function question_(q){return !!q&&typeof q.prompt==='string'&&q.prompt.trim()&&Array.isArray(q.options)&&q.options.length>=2&&q.options.length<=5&&q.options.every(o=>typeof o==='string'&&o.trim())&&new Set(q.options).size===q.options.length&&q.options.includes(q.answer);}
function ladderItem(base,item){
 if(!item||typeof item!=='object'||typeof item.why!=='string'||!item.why.trim())return null;
 const pick=q=>({prompt:q.prompt.trim(),options:q.options.map(o=>o.trim()),answer:q.answer.trim()});
 if(!Array.isArray(item.narrow)||item.narrow.length!==2||![...item.narrow,item.retest,item.review].every(question_))return null;
 const next={...base,why:item.why.trim(),narrow:item.narrow.map(pick),retest:pick(item.retest),review:pick(item.review)};
 if(base.main){
  if(!question_(item.main)||typeof item.title!=='string'||!item.title.trim())return null;
  const r=item.recall,list=v=>Array.isArray(v)&&v.length&&v.every(s=>typeof s==='string'&&s.trim());
  if(!r||typeof r.prompt!=='string'||!r.prompt.trim()||!list(r.accept)||!list(r.reject))return null;
  const accept=r.accept.map(norm);if(r.reject.some(s=>accept.includes(norm(s))))return null;
  Object.assign(next,{title:item.title.trim(),main:pick(item.main),recall:{prompt:r.prompt.trim(),accept:r.accept.map(s=>s.trim()),reject:r.reject.map(s=>s.trim())}});
 }else{if(!question_(item))return null;Object.assign(next,pick(item));}
 return next;
}
function edited(base,record){
 const edit=record?.edit;if(!edit||edit.answer!=='O'||edit.sourceVersion!==base.rev)return base;
 try{return ladderItem(base,JSON.parse(edit.claim))||base;}catch(_){return base;}
}
const bases=new WeakMap();
// Replaces course items in place so running tutors pick up the latest wording.
function applyEdits(courses,records){for(const course of courses||[]){
 const base=bases.get(course)||{skills:course.skills.slice(),combined:course.combined.slice()};bases.set(course,base);
 course.skills=base.skills.map(k=>edited(k,records?.[editKey(course,k.id)]));
 course.combined=base.combined.map((c,i)=>edited(c,records?.[editKey(course,'c'+i)]));
}}
// Question tutoring never awards completion for the separate OX sets.
function overlay(state){return state;}
function shouldStart(s,setId,content){return !!(s&&s.screen!=='summary')||(!summary(s).complete&&(content?.covers||covers).includes(setId));}
function create({storage,prefix,content,now=Date.now,onChange=()=>{},onParagraph=()=>{}}){
 const key=suffixFor(content);let state=read(storage,prefix,content),saveError=null;
 function persist(next,event){
  const eventId=globalThis.crypto?.randomUUID?.()||now().toString(36)+'_'+Math.random().toString(36).slice(2);
  next.updatedAt=now();next.sequence=(state?.sequence||0)+1;
  const record={...event,id:eventId,at:now(),course:content.id,version:next.content.version,sequence:next.sequence};
  // Save the resume state first. A storage failure never advances the visible question.
  try{storage.setItem(prefix+key,JSON.stringify(next));saveError=null;}catch(e){saveError='저장 공간을 확인해 주세요. 현재 질문을 유지했어요.';onChange(state,saveError);return false;}
  state=next;
  try{storage.setItem(prefix+eventSuffix+eventId,JSON.stringify(record));}catch(e){saveError='진행은 저장했지만 상세 로그를 저장하지 못했어요.';}
  for(const p of summary(state,now()).paragraphs)if(!state.countedParagraphs.includes(p)){onParagraph(p);state.countedParagraphs.push(p);storage.setItem(prefix+key,JSON.stringify(state));}
  onChange(state,saveError);return true;
 }
 function start(){state=read(storage,prefix,content)||state;if(state){onChange(state);return;}const next={schema:1,content:clone(content),createdAt:now(),updatedAt:now(),screen:'welcome',mode:'learn',index:0,node:'main',diagnostic:[],results:{},combined:content.combined.map(()=>({correct:false})),countedParagraphs:[],queue:[],queueIndex:0,helpThisRound:false};for(const k of content.skills)next.results[k.id]={first:null,help:false,reasonWrong:false,solved:false,pending:false,independent:false,recallCorrect:false};persist(next,{kind:'start'});}
 const skill=(s=state)=>{const k=s.content.skills[s.index];return content.skills.find(x=>x.id===k?.id)||k;};
 const combinedItem=(s=state)=>(content.combined?.length===s.content.combined.length?content.combined:s.content.combined)[s.index];
 function question(s=state){const k=skill(s);if(s.screen==='diagnostic'){
  const id=s.content.diagnostic[s.diagnostic.length],base=(content.skills.find(k=>k.id===id)||s.content.skills.find(k=>k.id===id)).main;
  // Presentation fixes apply to an in-progress diagnostic too; saved answers and grading stay intact.
  const context=content.diagnosticContext?.[id]||s.content.diagnosticContext?.[id];
  return context?{...base,prompt:context.prompt,context,diagnosticRevision:content.diagnosticRevision||s.content.diagnosticRevision}:base;
 }if(s.mode==='combined'){const c=combinedItem(s);return s.node==='narrow1'?c.narrow[0]:s.node==='narrow2'?c.narrow[1]:s.node==='retest'?c.retest:s.combinedReview?c.review:c;}if(s.node==='evidence')return k.evidence;if(s.mode==='recall'&&s.node==='recall')return k.recall;if(s.node==='narrow1')return k.narrow[0];if(s.node==='narrow2')return k.narrow[1];if(s.node==='retest')return k.retest;if(s.mode==='review')return k.review;return k.main;}
 function beginSkill(s,index,reading=true){s.index=index;s.node=s.diagnostic.find(d=>d.id===s.content.skills[index].id)?.result==='correct'?'retest':'main';s.helpThisRound=false;s.screen=reading?'reading':'question';s.notice='';}
 function complete(s){const k=skill(s),r=s.results[k.id];r.solved=true;r.dueAt=r.dueAt||now()+20*3600000;
  if(s.mode==='learn'&&!r.help&&!r.reasonWrong)r.independent=true;
  if(s.mode==='review'&&!s.helpThisRound){r.pending=false;if(day(now())>day(s.createdAt))r.independent=true;}
  s.screen='feedback';s.notice=s.mode==='review'?'복습에서 확인했어요.':r.help||r.reasonWrong?'도움을 받아 확인했어요.':'스스로 확인했어요.';
 }
 function advanceQueue(s){s.queueIndex++;if(s.queueIndex>=s.queue.length){s.screen='summary';s.mode='learn';s.index=0;return;}
  s.index=s.content.skills.findIndex(k=>k.id===s.queue[s.queueIndex]);s.helpThisRound=false;s.notice='';const k=skill(s),r=s.results[k.id];s.node=s.mode==='recall'?'recall':r.reasonWrong&&r.first==='correct'&&!r.help?'evidence':'main';s.screen='question';
 }
 function act(action){
  if(!state)return;const s=clone(state),k=skill(s),r=s.results[k.id],before=summary(state,now());let event={kind:action.type,mode:s.mode,skill:k.id,node:s.node};
  if(action.type==='begin'&&s.screen==='welcome'){s.screen='diagnostic';}
  else if(action.type==='answer'&&s.screen==='diagnostic'){
   const id=s.content.diagnostic[s.diagnostic.length],q=question(s);if(action.value!=='?'&&!q.options.includes(action.value))return;
   const result=action.value==='?'?'unknown':action.value===q.answer?'correct':'wrong';s.diagnostic.push({id,result,answer:action.value});event={...event,mode:'diagnostic',skill:id,value:action.value,result};if(s.diagnostic.length===s.content.diagnostic.length)s.screen='placement';
  }
  else if(action.type==='learn'&&s.screen==='placement'){beginSkill(s,0);}
  else if(action.type==='read'&&s.screen==='reading'){s.screen='question';}
  else if(action.type==='answer'&&s.screen==='question'){
   const q=question(s);if(s.node==='recall'){
    const value=String(action.value).trim();if(!value||value.length>200)return;const result=value==='?'?'unknown':q.accept.map(norm).includes(norm(value))?'correct':q.reject.map(norm).includes(norm(value))?'wrong':'pending';
    r.lastRecallDay=day(now());r.recallResponse=value;r.teacherPending=result==='pending';r.recallCorrect=result==='correct';if(result==='correct'){r.pending=!r.independent;}else if(result!=='pending'){r.pending=true;r.independent=false;}
    s.notice=result==='correct'?'본문 없이 기억해 냈어요.':result==='pending'?'표현이 다양할 수 있어 선생님 확인 대기로 남겼어요. 오답으로 단정하지 않아요.':'다시 확인할 내용으로 남겼어요.';s.screen='feedback';event={...event,value,result};
   }else if(s.node==='evidence'){
    if(action.value!=='?'&&(!Number.isInteger(action.value)||!q.groups[action.value]))return;
    const correct=q.correct.includes(action.value);event={...event,value:action.value,result:correct?'correct':action.value==='?'?'unknown':'wrong'};
    if(correct){complete(s);}else{r.reasonWrong=true;r.pending=true;r.independent=false;s.helpThisRound=true;s.screen='evidence-feedback';s.selectedEvidence=action.value;s.notice=action.value==='?'?'근거를 함께 확인해 봐요.':q.reasons[action.value];}
   }else{
    if(action.value!=='?'&&!q.options.includes(action.value))return;const result=action.value==='?'?'unknown':action.value===q.answer?'correct':'wrong';event={...event,value:action.value,result};
    if(s.mode==='combined'){const c=s.combined[s.index];c.first=c.first||result;if(result==='correct'){
     if(['narrow1','narrow2'].includes(s.node)){s.node='retest';s.notice='다른 상황에서도 같은지 확인해 봐요.';}else{c.correct=true;if(s.combinedReview&&!s.helpThisRound)c.pending=false;s.screen='feedback';s.notice=c.help?'도움을 받아 종합했어요.':'핵심 내용을 연결했어요.';}
    }else{c.help=true;c.pending=true;s.helpThisRound=true;s.notice='두 내용만 나눠서 다시 확인해 봐요.';if(s.node==='main')s.node='narrow1';else if(s.node==='narrow1')s.node='narrow2';else s.screen='explanation';}}
    else{
     if(s.mode==='learn'&&!r.first)r.first=result;
     if(result==='correct'){
      if(['narrow1','narrow2'].includes(s.node)){s.node='retest';s.notice='이제 다른 질문으로 확인해 봐요.';}
      else if(k.evidence&&s.node==='main'&&s.mode==='learn'){s.node='evidence';s.notice='어떤 부분이 근거인지 확인해 봐요.';}
      else complete(s);
     }else{r.help=true;r.pending=true;r.independent=false;s.helpThisRound=true;s.notice=result==='unknown'?'괜찮아요. 더 작은 질문부터 생각해 봐요.':'답을 바로 보기 전에, 한 가지만 다시 살펴봐요.';
      if(s.node==='main')s.node='narrow1';else if(s.node==='narrow1')s.node='narrow2';else s.screen='explanation';
     }
    }
   }
  }
  else if(action.type==='explain'&&s.screen==='question'&&s.node!=='recall'){
   if(s.mode==='combined'){s.combined[s.index].help=true;s.combined[s.index].pending=true;}else{r.first=r.first||'revealed';if(s.node==='evidence')r.reasonWrong=true;else r.help=true;r.pending=true;r.independent=false;}s.helpThisRound=true;s.screen=s.node==='evidence'?'evidence-feedback':'explanation';s.notice='이번 내용은 설명의 도움을 받은 것으로 기록해요.';
  }
  else if(action.type==='again'&&['explanation','evidence-feedback'].includes(s.screen)){s.screen='question';s.node=s.screen==='question'&&state.screen==='evidence-feedback'?'evidence':'retest';s.notice='';delete s.selectedEvidence;}
  else if(action.type==='next'&&s.screen==='feedback'){
   if(s.mode==='recall'||s.mode==='review')advanceQueue(s);
   else if(s.mode==='combined'){s.index=s.combinedReview?(before.combinedPending.find(i=>i>s.index)??s.content.combined.length):s.index+1;s.helpThisRound=false;if(s.index>=s.content.combined.length){s.screen='summary';s.mode='learn';s.index=0;}else{s.screen='question';s.node='main';s.notice='';}}
   else if(s.index<s.content.skills.length-1){const p=k.paragraph;beginSkill(s,s.index+1,s.content.skills[s.index+1].paragraph!==p);}
   else{s.mode='combined';s.combinedReview=false;s.helpThisRound=false;s.index=0;s.node='main';s.screen='question';s.notice=(s.content.label||'1~3문단')+'의 핵심을 두 질문으로 연결해 봐요.';}
  }
  else if(action.type==='review'&&s.screen==='summary'&&before.pending.length){s.mode='review';s.queue=before.pending;s.queueIndex=-1;advanceQueue(s);}
  else if(action.type==='review'&&s.screen==='summary'&&before.combinedPending.length){s.mode='combined';s.combinedReview=true;s.helpThisRound=false;s.index=before.combinedPending[0];s.node='main';s.screen='question';s.notice='핵심 연결 복습 · 새 상황으로 다시 확인해요.';}
  else if(action.type==='recall'&&before.due.length&&['summary','welcome'].includes(s.screen)){s.mode='recall';s.queue=before.due;s.queueIndex=-1;advanceQueue(s);}
  else return;
  if(action.type==='answer'){const asked=question(state);event.prompt=asked.prompt;if(state.screen==='diagnostic'&&asked.context){event.context=clone(asked.context);event.diagnosticRevision=asked.diagnosticRevision;}event.selectedText=state.node==='evidence'&&action.value!=='?'?asked.groups[action.value].map(id=>Object.values(state.content.sources).flatMap(p=>p.sentences).find(x=>x.id===id)?.text||'').join(' '):String(action.value);}
  persist(s,event);
 }
 return {start,act,question,content,key,skill:()=>state&&skill(),combinedItem:()=>state&&combinedItem(),state:()=>state,summary:()=>summary(state,now()),error:()=>saveError};
}
return {create,read,summary,overlay,shouldStart,covers,suffix,suffixFor,eventSuffix,level,editKey,ladderItem,applyEdits};
})();
