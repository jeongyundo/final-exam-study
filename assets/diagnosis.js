/* 진단·낚시: 내용을 몰라서 틀리는지, 함정에 걸리는지, 바꿔 말한 참을 못 알아보는지 나누고 다음 문제를 고릅니다. */
(function(global){
'use strict';
const LABEL={content:'내용 모름',trap:'함정에 걸림',paraphrase:'바꿔 말하기 약함',ok:'이해함'};
function byId(pool){const map=new Map();for(const p of pool.parts)for(const q of p.items)map.set(q.id,q);return map;}
function base(pool,suffix,name,parts,round){
 return {id:pool.id.replace(/-pool$/,'-'+suffix),unitId:pool.unitId,chapterIds:pool.chapterIds,group:pool.group,name,level:'기본',revision:pool.revision,originPage:pool.originPage,timedMode:pool.timedMode,shuffleQuestions:true,diagnosisRound:round,parts};
}
// 1차 진단: 진단용 출제 내용마다 바꿔치기 거짓·함정 거짓·바꿔 말한 참을 하나씩.
function check(pool){
 const items=byId(pool),own=pool.facts.filter(f=>f.diagnose),part=(name,kind)=>({name,items:own.map(f=>items.get(f.items[kind]))});
 return base(pool,'check','1차 진단 · '+own.length*3+'문제',[part('내용 · 바꿔치기 거짓','C'),part('함정 · 함정 거짓','T'),part('바꿔말하기 · 바꿔 말한 참','P')],1);
}
// 바꿔치기를 틀리면 내용 모름, 그것은 맞히고 함정을 틀리면 함정, 둘 다 맞히고 바꿔 말한 참을 틀리면 바꿔 말하기 약함.
function verdict(pool,logs){
 const ok=new Map();for(const l of logs)ok.set(l.qid,!!l.ok);
 const facts=pool.facts.filter(f=>f.diagnose).map(f=>{
  const [c,t,p]=['C','T','P'].map(k=>ok.get(f.items[k]));
  if([c,t,p].includes(undefined))return {id:f.id,ref:f.ref,kind:'skipped',twist:null};
  const kind=!c?'content':!t?'trap':!p?'paraphrase':'ok';
  return {id:f.id,ref:f.ref,kind,twist:kind==='content'?f.twist.C:kind==='trap'?f.twist.T:null};
 });
 const counts={};for(const k of Object.keys(LABEL))counts[k]=facts.filter(f=>f.kind===k).length;
 return {facts,counts};
}
// 기출에 나온 횟수: 많이 나온 함정일수록 먼저, 더 많이 묻는다(4회 이상 3문제, 1~3회 2문제, 0회 1문제).
const examCount=(pool,twist)=>pool.examFrequency?.[twist]||0;
const trapQuota=count=>count>=4?3:count>=1?2:1;
// 낚시: 약한 갈래만 골라 진단에 쓰지 않은 출제 내용에서 다시 묻는다. 맞는 문장을 섞어 X만 찍지 못하게 한다.
function fishing(pool,result){
 const items=byId(pool),rest=pool.facts.filter(f=>!f.diagnose),used=new Set(),parts=[],count=twist=>examCount(pool,twist);
 const pick=(facts,kind,n,avoid=[])=>{const out=[];for(const f of [...facts.filter(f=>!avoid.includes(f.ref)),...facts.filter(f=>avoid.includes(f.ref))]){const id=f.items[kind];if(out.length<n&&!used.has(id)){used.add(id);out.push(items.get(id));}}return out;};
 for(const twist of [...new Set(result.facts.filter(f=>f.kind==='trap').map(f=>f.twist))].sort((a,b)=>count(b)-count(a))){
  const refs=result.facts.filter(f=>f.kind==='trap'&&f.twist===twist).map(f=>f.ref);
  parts.push({name:'함정 · '+twist+' · 기출 '+count(twist)+'회',twist,items:[...pick(rest.filter(f=>f.twist.T===twist),'T',trapQuota(count(twist)),refs),...pick(rest,'P',1,refs)]});
 }
 const content=result.facts.filter(f=>f.kind==='content').sort((a,b)=>count(b.twist)-count(a.twist)).slice(0,4).map(m=>pool.facts.find(f=>f.id===m.id));
 if(content.length)parts.push({name:'내용 · 근거 보고 다시',items:[...pick(content,'O',4),...pick(content,'C',4)]});
 if(result.counts.paraphrase)parts.push({name:'바꿔말하기 · 다시',items:[...pick(rest,'P',3),...pick(rest,'C',1)]});
 const total=parts.reduce((n,p)=>n+p.items.length,0);
 // 묶음 순서를 지켜 많이 나온 함정부터 풀게 하고, 묶음 안에서만 섞는다.
 return total?{...base(pool,'fish','낚시 · '+total+'문제',parts,2),shuffleQuestions:false,shuffleWithinParts:true}:null;
}
// 낚시 묶음을 다 맞히면 실수, 하나라도 또 틀리면 약점.
function fishingResult(set,logs){
 const ok=new Map();for(const l of logs)ok.set(l.qid,!!l.ok);
 return set.parts.map(p=>{const got=p.items.filter(q=>ok.get(q.id)).length;return {name:p.name,got,total:p.items.length,steady:got===p.items.length};});
}
function describe(result){
 const traps=new Map();for(const f of result.facts)if(f.kind==='trap')traps.set(f.twist,(traps.get(f.twist)||0)+1);
 return ['content','trap','paraphrase','ok'].map(k=>LABEL[k]+' '+result.counts[k]+'개'+(k==='trap'&&traps.size?' ('+[...traps].map(([t,n])=>t+' '+n).join(', ')+')':''));
}
global.HomeworkDiagnosis={LABEL,check,verdict,fishing,fishingResult,describe};
})(typeof window==='undefined'?globalThis:window);
