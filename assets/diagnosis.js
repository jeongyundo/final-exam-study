/* 진단 셋트: 학습 경로 챕터(1문단 / 2문단 / 3·4문단 / 5문단)마다 한 판. 출제 내용 수만큼(5개 또는 10개) 1문제 1점.
   틀리면 그 문장에 든 함정마다 갈래를 나눠 확인한다. 갈래에서 또 틀리면 같은 함정의 새 문장이 이어 나오고,
   갈래를 모두 맞히면 그 문제는 +1(만회). 만회했더라도 틀린 문장은 판 끝에서 맞힐 때까지 다시 푼다.
   나중 복습은 처음에 틀린 출제 내용을 다른 유형 문장으로 묻는다. */
(function(global){
'use strict';
const KIND={T:'함정 거짓',C:'바꿔치기 거짓',P:'바꿔 말한 참',O:'원문 참'};
// 거짓 5(함정 3·바꿔치기 2), 참 5(바꿔 말한 참 3·원문 참 2): O만 찍어도, X만 찍어도 5점이다.
const PLAN=['T','T','T','C','C','P','P','P','O','O'];
const PLAN5=[['T','T','C','P','O'],['T','C','P','P','O']];  // 5문제 셋트: 거짓 3·참 2 또는 거짓 2·참 3을 고루
const planFor=(n,rand)=>n>=10?PLAN:PLAN5[rand()<0.5?0:1];
const OTHER={T:['C','P','O'],C:['T','P','O'],P:['T','C','O'],O:['P','T','C']};  // 복습에서 물을 다른 유형 순서
const PARAPHRASE='바꿔 말하기';  // 맞는 문장을 틀렸을 때의 갈래
const BRANCH_LIMIT=3;            // 갈래 하나에서 이어 나오는 문장은 3개까지
const REDO='오답 다시 풀기';
function byId(pool){const map=new Map();for(const p of pool.parts)for(const q of p.items)map.set(q.id,q);return map;}
const examCount=(pool,twist)=>pool.examFrequency?.[twist]||0;
const factOf=(pool,id)=>pool.facts.find(f=>f.id===id);
const twistsOf=(fact,kind)=>kind==='T'||kind==='C'?fact.twists[kind]:[];
const kindFor=(pool,twist)=>twist===PARAPHRASE?'P':(pool.contentTwists||[]).includes(twist)?'C':'T';
function shuffled(list,rand){return list.map(v=>[rand(),v]).sort((a,b)=>a[0]-b[0]).map(p=>p[1]);}
const inPlan=(plan,f)=>plan.slots.some(s=>s.fact===f.id);
const usedIds=plan=>new Set(plan.slots.flatMap(s=>[s.main,...s.seq.map(e=>e.id)]));
const slotName=i=>(i+1)+'번';
const groupOf=(pool,id)=>(pool.groups||[]).find(g=>g.id===id);
const setId=(poolId,group,mode)=>poolId.replace(/-pool$/,'-'+(group?group+'-':'')+mode);
const newSlot=(pool,fact,kind)=>({fact:fact.id,kind,twists:twistsOf(fact,kind),main:fact.items[kind],branches:[],seq:[]});

// 새 판: 셋트(group)를 주면 그 셋트의 출제 내용만으로. 출제 내용이 겹치지 않게, 안 본 문장 먼저. 함정은 지난번에 놓친 함정, 그다음 기출에 많이 나온 함정부터.
function session(pool,{seen=[],missed=[],rand=Math.random,group=null}={}){
 seen=new Set(seen);const used=new Set(),picks=[],paragraphs=new Map(),refs=group&&groupOf(pool,group).refs;
 const facts=refs?pool.facts.filter(f=>refs.includes(f.ref)):pool.facts;
 const cost=(f,kind)=>{const ts=twistsOf(f,kind);return (seen.has(f.items[kind])?100:0)-(ts.some(t=>missed.includes(t))?50:0)-Math.max(0,...ts.map(t=>examCount(pool,t)))+(paragraphs.get(f.ref)||0)*3+rand();};
 for(const kind of planFor(facts.length,rand)){
  const twists=new Set(picks.filter(p=>p.kind==='T').map(p=>p.fact.twist.T));
  const f=facts.filter(f=>!used.has(f.id)).map(f=>({f,c:cost(f,kind)+(kind==='T'&&twists.has(f.twist.T)?20:0)})).sort((a,b)=>a.c-b.c)[0].f;
  used.add(f.id);paragraphs.set(f.ref,(paragraphs.get(f.ref)||0)+1);picks.push({fact:f,kind});
 }
 return {mode:'ten',group,slots:shuffled(picks,rand).map(p=>newSlot(pool,p.fact,p.kind)),redo:[]};
}
// 나중 복습: 지난 판에서 처음에 틀린 출제 내용을, 다른 유형 문장으로. 안 본 문장 먼저.
function review(pool,last,{seen=[]}={}){
 seen=new Set(seen);
 const slots=(last?.slots||[]).filter(s=>!s.first).map(s=>{const fact=factOf(pool,s.fact),kind=OTHER[s.kind].find(k=>!seen.has(fact.items[k]))||OTHER[s.kind][0];return newSlot(pool,fact,kind);});
 return slots.length?{mode:'review',group:last.group||null,slots,redo:[]}:null;
}
// 갈래 문장: 그 함정이 든 다른 출제 내용의 문장. 이번 판에 나오지 않은 출제 내용(같은 내용의 참·거짓을 견줘 답을 알아채지 않게),
// 그 함정만 든 문장, 안 본 문장 순으로 먼저.
function branchItem(pool,plan,slot,twist,seen,rand){
 const kind=kindFor(pool,twist),used=usedIds(plan);
 const all=shuffled(pool.facts.filter(f=>f.id!==slot.fact&&!used.has(f.items[kind])&&(kind==='P'||twistsOf(f,kind).includes(twist))),rand);
 const only=f=>kind==='P'||twistsOf(f,kind).length===1,fresh=f=>!seen.has(f.items[kind]);
 const rank=f=>(inPlan(plan,f)?4:0)+(only(f)?0:2)+(fresh(f)?0:1);
 return all.sort((a,b)=>rank(a)-rank(b))[0]?.items[kind]||null;
}
// 정답이 늘 X(또는 O)로 이어지지 않게 섞는 맞는(또는 틀린) 문장. 결과는 갈래 판정에 넣지 않는다.
function controlItem(pool,plan,slot,twist,rand){
 const kind=kindFor(pool,twist)==='P'?'C':'P',used=usedIds(plan);
 return shuffled(pool.facts.filter(f=>f.id!==slot.fact&&!used.has(f.items[kind])),rand).sort((a,b)=>inPlan(plan,a)-inPlan(plan,b))[0]?.items[kind]||null;
}
// 갈래 b를 시작하거나 이어 간다. 문장이 없으면 그 갈래는 확인하지 못한 것으로 두고 다음 갈래로 간다.
function advance(pool,plan,i,b,seen,rand,out){
 const slot=plan.slots[i];
 for(;b<slot.branches.length;b++){
  const twist=slot.branches[b].twist,id=branchItem(pool,plan,slot,twist,seen,rand);
  if(!id){slot.branches[b].ok=false;continue;}
  if(rand()<0.5){const c=controlItem(pool,plan,slot,twist,rand);if(c){slot.seq.push({id:c,b,control:true});out.push(c);}}
  slot.seq.push({id,b});out.push(id);return;
 }
}
// 답한 뒤 할 일. 틀리면 판 끝에 다시 풀 문장을 붙이고(맞힐 때까지), 갈래를 열거나 이어 간다.
function onAnswer(pool,plan,q,ok,{seen=[],rand=Math.random}={}){
 seen=new Set(seen);const items=byId(pool),base=q.redoOf||q.id,ids=[],out={redo:null,insert:[]};
 if(!ok){const n=plan.redo.filter(id=>id===base).length+1;plan.redo.push(base);out.redo={...redoItem(items.get(base),n),part:REDO,pi:plan.slots.length};}
 if(!q.redoOf){
  const i=plan.slots.findIndex(s=>s.main===q.id||s.seq.some(e=>e.id===q.id));
  if(i>=0){
   const slot=plan.slots[i],entry=slot.seq.find(e=>e.id===q.id);
   if(!entry&&!ok){slot.branches=(slot.twists.length?slot.twists:[PARAPHRASE]).map(twist=>({twist,ok:null}));advance(pool,plan,i,0,seen,rand,ids);}
   else if(entry&&!entry.control){
    const branch=slot.branches[entry.b],tries=slot.seq.filter(e=>e.b===entry.b&&!e.control).length;
    if(ok){branch.ok=true;advance(pool,plan,i,entry.b+1,seen,rand,ids);}
    else if(tries<BRANCH_LIMIT)advance(pool,plan,i,entry.b,seen,rand,ids);
    else{branch.ok=false;advance(pool,plan,i,entry.b+1,seen,rand,ids);}
   }
   out.insert=ids.map(id=>({...items.get(id),chainOf:slot.main,part:slotName(i),pi:i}));
  }
 }
 return out;
}
// 저장해 둔 판으로 세트를 만든다(이어 풀기에도 같은 순서). 묶음 이름은 '1번'처럼 두어 정답을 드러내지 않는다.
function build(pool,plan){
 const items=byId(pool),count=new Map();
 const parts=plan.slots.map((s,i)=>({name:slotName(i),items:[items.get(s.main),...s.seq.map(e=>({...items.get(e.id),chainOf:s.main}))]}));
 if(plan.redo.length)parts.push({name:REDO,items:plan.redo.map(id=>{const n=(count.get(id)||0)+1;count.set(id,n);return redoItem(items.get(id),n);})});
 const g=plan.group&&groupOf(pool,plan.group),label=g?g.name+' · ':'';
 return {id:setId(pool.id,plan.group,plan.mode),unitId:pool.unitId,chapterIds:pool.chapterIds,group:pool.group,name:label+(plan.mode==='ten'?plan.slots.length+'문제':'다른 유형으로 복습 · '+plan.slots.length+'문제'),level:'기본',revision:pool.revision,originPage:pool.originPage,timedMode:pool.timedMode,shuffleQuestions:false,diagnosisSession:plan.mode,diagnosisPlan:plan,parts};
}
const redoItem=(q,n)=>({...q,id:q.id+'#다시'+n,redoOf:q.id});
// 한 문제에 1점: 처음에 맞히면 1점, 틀렸으면 갈래를 모두 맞혀야 1점(만회).
function score(plan,logs){
 const ok=new Map();for(const l of logs)if(l.qid)ok.set(l.qid,ok.get(l.qid)||!!l.ok);
 const slots=plan.slots.map((s,i)=>{const first=ok.get(s.main)===true;
  const branches=s.branches.map((b,j)=>({twist:b.twist,ok:s.seq.some(e=>e.b===j&&!e.control&&ok.get(e.id)===true)}));
  const redeemed=!first&&branches.length>0&&branches.every(b=>b.ok);
  return {name:slotName(i),kind:s.kind,twists:s.twists,fact:s.fact,main:s.main,first,redeemed,branches,got:first||redeemed?1:0};});
 const redoIds=[...new Set(plan.redo)];
 return {slots,got:slots.reduce((n,s)=>n+s.got,0),max:slots.length,first:slots.filter(s=>s.first).length,redeemed:slots.filter(s=>s.redeemed).length,
  redo:redoIds.length,redoDone:redoIds.filter(id=>logs.some(l=>String(l.qid||'').startsWith(id+'#다시')&&l.ok)).length};
}
function describe(result){
 const lines=['처음에 맞힘 '+result.first+'개','만회 +'+result.redeemed,'놓침 '+(result.max-result.got)+'개'];
 if(result.redo)lines.push('오답 다시 풀기 '+result.redoDone+'/'+result.redo);
 for(const s of result.slots.filter(s=>!s.first))lines.push(s.name+' '+KIND[s.kind]+(s.branches.length?' → '+s.branches.map(b=>b.twist+(b.ok?' ✓':' ✗')).join(' · '):''));
 return lines;
}
// 다음 판에서 먼저 낼 함정: 처음에 틀렸고 갈래에서도 다 맞히지 못한 함정.
const missedTwists=last=>(last?.slots||[]).filter(s=>!s.first).flatMap(s=>s.branches.filter(b=>!b.ok).map(b=>b.twist));
global.HomeworkDiagnosis={KIND,PLAN,REDO,PARAPHRASE,setId,session,review,onAnswer,build,score,describe,missedTwists};
})(typeof window==='undefined'?globalThis:window);
