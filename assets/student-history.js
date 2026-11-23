/* Recover completed work from the original sheet's summaries and answer rows. */
(function(global){
'use strict';
function importHistory(storage,sets,history){
 if(!history||!Array.isArray(history.rows)||!Array.isArray(history.answers))return {sessions:0,matched:0};
 const byId=new Map(),byLabel=new Map(),legacy=new Map(),advanced=new Map();
 sets.forEach(set=>{
  byLabel.set(set.group+' · '+set.name,set);
  set.parts.forEach((part,pi)=>part.items.forEach((q,qi)=>{
   const entry={set,q,pi,qi};byId.set(q.id,entry);
   if(q.originPage==='legacy'){
    const label=set.originalGroup+' · '+set.originalName;
    if(!legacy.has(label))legacy.set(label,[]);legacy.get(label).push({...entry,partName:part.name});
   }
   if(q.originPage==='advanced'&&q.originSet)advanced.set(q.originSet+':'+q.originQi,entry);
  }));
 });
 const clean=label=>String(label||'').replace(/\s*\(오답\)\s*$/,'');
 function find(row){
  const label=clean(row.set),set=byLabel.get(label);
  if(set){const pi=set.parts.findIndex(p=>p.name===row.part),qi=Number(row.qno)-1;if(pi>=0&&set.parts[pi].items[qi])return {set,q:set.parts[pi].items[qi],pi,qi};}
  const originals=legacy.get(label);
  if(originals)return originals.find(e=>e.partName===row.part&&e.q.originQi===Number(row.qno)-1);
  const mixed=label.match(/^고급 혼합 · 혼합 실전 (\d+)$/);if(mixed)return advanced.get('advanced-mixed-'+mixed[1]+':'+(Number(row.qno)-1));
  const part=String(row.part||'').match(/^([A-Z]\d+) · /);
  return part?byId.get(part[1]+(row.type==='ox'?'-B'+row.qno:'-S1')):undefined;
 }
 const at=row=>String(row.endedAt||row.at||'');
 const summaries=new Map();history.rows.forEach(row=>summaries.set(row.session+'|'+row.set,row));
 const grouped=new Map(),seen=new Set();
 history.answers.forEach(row=>{
  const unique=row.rid||[row.session,row.set,row.part,row.qno,row.at].join('|');if(seen.has(unique))return;seen.add(unique);
  const mapped=find(row);if(!mapped||!summaries.has(row.session+'|'+row.set))return;
  const key=mapped.set.id+'|'+row.session+'|'+row.set;
  if(!grouped.has(key))grouped.set(key,{set:mapped.set,summary:summaries.get(row.session+'|'+row.set),answers:new Map()});
  grouped.get(key).answers.set(mapped.q.id,{...row,...mapped});
 });
 const sessions=new Map();let matched=0;
 for(const group of [...grouped.values()].sort((a,b)=>at(a.summary).localeCompare(at(b.summary)))){
  const {set,summary}=group,answers=[...group.answers.values()],content='v'+(set.revision||1)+'_'+set.id;
  const key='practice_units_last_'+content;let previous;try{previous=JSON.parse(storage.getItem(key)||'null');}catch(_){}
  const score=answers.reduce((n,r)=>n+Number(r.score||0),0),max=answers.reduce((n,r)=>n+Number(r.max||0),0);
  if(!max)continue;matched+=answers.length;
  const wrongKey='practice_units_wrong_'+content,reviewKey='practice_units_review_at_'+content;
  const mistake=r=>{
   const evidence=r.q.requiresEvidence&&(/최초 근거 오답|해설 후 정정|근거 시간 초과|근거 찾기 시간 초과/.test(r.answer)||String(r.answer).startsWith(String(r.correctAnswer)+' / 근거'));
   return {pi:r.pi,qi:r.qi,mistakeKind:evidence?'evidence':'answer',correctedAfterExplanation:/해설 후 정정/.test(r.answer),timedOut:/시간 초과/.test(r.answer)};
  };
  if(/\(오답\)/.test(summary.set)){
   const rawWrong=storage.getItem(wrongKey);if(!rawWrong||!previous?.at||previous.at>at(summary)||(storage.getItem(reviewKey)||'')>=at(summary))continue;
   let wrong;try{wrong=JSON.parse(rawWrong);}catch(_){continue;}
   for(const answer of answers){wrong=wrong.filter(w=>w.pi!==answer.pi||w.qi!==answer.qi);if(Number(answer.score)<Number(answer.max))wrong.push(mistake(answer));}
   if(wrong.length)storage.setItem(wrongKey,JSON.stringify(wrong));else storage.removeItem(wrongKey);storage.setItem(reviewKey,at(summary));continue;
  }
  if(!/\(오답\)/.test(summary.set)){if(!sessions.has(set.id))sessions.set(set.id,new Set());sessions.get(set.id).add(summary.session);}
  if(previous?.at&&previous.at>=at(summary))continue;
  const expected=set.parts.reduce((n,p)=>n+p.items.length,0);
  // Partial old batches stay in the account history; don't label an incomplete new set finished.
  if(answers.length!==expected)continue;
  storage.setItem(key,JSON.stringify({score,max,at:at(summary)}));
  const wrong=answers.filter(r=>Number(r.score)<Number(r.max)).map(mistake);
  if(wrong.length)storage.setItem(wrongKey,JSON.stringify(wrong));else storage.removeItem(wrongKey);storage.setItem(reviewKey,at(summary));
 }
 for(const [id,values] of sessions){const key='practice_units_attempts_'+id;storage.setItem(key,String(Math.max(Number(storage.getItem(key)||0),values.size)));}
 // Restore the completed-set display without inventing XP or previously unlogged item rewards.
 let game;try{game=JSON.parse(storage.getItem('homework_adventure_v1')||'null');}catch(_){}
 game=game||{version:1,xp:0,hints:2,time:1,chests:0,credited:{},combos:{},records:{},pendingReviews:{},sound:false};
 game.records=game.records||{};let gameChanged=false;
 for(const set of sets){
  const content='v'+(set.revision||1)+'_'+set.id,key='units|'+content;let last,wrong;
  try{last=JSON.parse(storage.getItem('practice_units_last_'+content)||'null');wrong=JSON.parse(storage.getItem('practice_units_wrong_'+content)||'[]');}catch(_){continue;}
  if(!last||!Number.isFinite(last.score)||!Number.isFinite(last.max)||last.max<=0)continue;
  const repaired=!wrong.length&&((last.score>=last.max)||(storage.getItem('practice_units_review_at_'+content)||'')>(last.at||''));
  const record=game.records[key];
  if(!record||(!record.mastered&&repaired)){
   game.records[key]={...record,tier:record?.tier||0,best:Math.max(record?.best||0,last.score/last.max*100),mastered:!!(record?.mastered||repaired)};gameChanged=true;
  }
 }
 if(gameChanged)storage.setItem('homework_adventure_v1',JSON.stringify(game));
 // Keep every retrieved row, including old batches that no longer match a complete new set.
 let cached={rows:[],answers:[]};try{cached=JSON.parse(storage.getItem('student_history_v1')||'null')||cached;}catch(_){}
 const union=(a,b)=>[...new Map([...a,...b].map(r=>[r.rid||[r.kind,r.session,r.set,r.part,r.qno,r.at,r.endedAt].join('|'),r])).values()];
 storage.setItem('student_history_v1',JSON.stringify({rows:union(cached.rows||[],history.rows),answers:union(cached.answers||[],history.answers)}));
 return {sessions:new Set(history.rows.map(r=>r.session)).size,matched};
}
global.HomeworkStudentHistory={importHistory};
})(window);
