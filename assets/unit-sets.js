/* 단원은 교과서의 소단원 기준입니다. 4-1은 우주 탐사와 워드투벡을 함께 다룹니다. */
(function(global){
'use strict';
const definitions=[
 {id:'1-1',title:'소통하는 독서와 작문',readings:['밑줄을 긋다 보면'],conceptRefs:['D01']},
 {id:'1-2',title:'주체적인 읽기와 쓰기',readings:['세상과 소통하는 특별한 과학자'],conceptRefs:['D02']},
 {id:'2-1',title:'사실적 읽기와 추론적 읽기',readings:['얼굴, 음성 그리고 문자'],conceptRefs:['D03']},
 {id:'2-2',title:'비판적 읽기',readings:['줄 서기를 돈으로 살 수 있을까'],conceptRefs:[]},
 {id:'4-1',title:'과학·기술 분야의 글',readings:['먼 우주로 떠나기 위한 가장 저렴한 방법','워드투벡, 언어를 숫자로 바꾸다'],conceptRefs:['D04']},
 {id:'4-2',title:'정보를 전달하는 글',readings:[],conceptRefs:['D05']},
 {id:'5-1',title:'사회·문화 분야의 글',readings:['무엇이 내 삶의 정치일까'],conceptRefs:['D06']}
];
const refUnits={K:'1-1',J:'1-2',S:'2-1',F:'4-1',W:'4-1',P:'5-1',B01:'2-1',B02:'5-1',B03:'5-1',D01:'1-1',D02:'1-2',D03:'2-1',D04:'4-1',D05:'4-2',D06:'5-1',D22:'2-2',L:'2-2'};
const unitForRef=ref=>refUnits[ref]||refUnits[ref[0]];
const order=ids=>definitions.filter(u=>ids.includes(u.id)).map(u=>u.id);
const sectionLabels={concept:'개념어 연습',reading:'본문 읽기·어휘',basic:'기본 문제',advanced:'심화 문제',challenge:'여러 자료 함께 풀기'};
function legacyUnit(set,index){
 if(set.cat==='비유법')return '1-1';
 if(set.id.startsWith('q_'))return '1-2';
 if(set.id==='c1l')return '1-1';
 if(set.id==='c1m')return index<5?'1-1':'1-2';
 if(set.id==='c4l')return index<4?'4-1':'4-2';
 if(set.id==='c4m')return [0,1,2,9].includes(index)?'4-1':'4-2';
 if(set.id.startsWith('c2'))return '2-1';
 if(set.id.startsWith('c5'))return '5-1';
 if(set.id==='develop-middle')return index<6?'4-1':index===6?'2-1':index<9?'5-1':'2-1';
 if(set.id.startsWith('develop-'))return '2-1';
 if(set.group.includes('김애란'))return '1-1';
 if(set.group.includes('주영재'))return '1-2';
 if(set.group.includes('신형철'))return '2-1';
 if(set.group.includes('지웅배')||set.group.includes('워드투벡'))return '4-1';
 if(set.group.includes('설규주'))return '5-1';
 throw new Error('단원 연결이 없는 숙제: '+set.id);
}
function build(legacy,exam,advanced,supplement=global.HOMEWORK_UNIT22){
 const units=definitions.map(u=>({...u,readings:[...u.readings],concepts:u.conceptRefs.map(ref=>({title:exam.sources[ref].title,text:exam.sources[ref].text}))}));
 units.find(u=>u.id==='1-1').concepts.push({title:'비유법',text:'직유는 ‘처럼’, ‘같이’, ‘듯이’ 등의 표현으로 견줍니다. 은유는 다른 대상에 빗대어 직접 나타냅니다. 원관념은 말하려는 대상이고 보조관념은 빗대어 표현하는 데 쓰는 대상입니다.'});
 units.find(u=>u.id==='2-1').concepts.push({title:'내용 전개 방식',text:'정의는 뜻을 밝히고, 분석은 구성 요소를 나누어 설명합니다. 비교와 대조는 공통점과 차이점을 드러냅니다. 분류와 구분은 기준에 따라 묶거나 나눕니다. 예시는 구체적인 사례, 서사는 특정 사건의 시간 흐름, 인과는 원인과 결과, 과정은 절차나 단계를 설명합니다.'});
 for(const ref of ['W03','W11','W16']){const s=exam.sources[ref];units.find(u=>u.id==='4-1').concepts.push({title:ref==='W03'?'워드투벡':ref==='W11'?'유클리드 거리':'코사인 유사도와 거리',text:s.text});}
 for(const ref of ['P06','P08','P14']){const s=exam.sources[ref];units.find(u=>u.id==='5-1').concepts.push({title:ref==='P06'?'국가 현상설':ref==='P08'?'집단 현상설':'정치의 의미',text:s.text});}
 if(!supplement?.sets?.length)throw new Error('2-2단원 문제 자료가 없습니다.');
 units.find(u=>u.id==='2-2').concepts=supplement.concepts.map(c=>({...c}));
 units.find(u=>u.id==='2-2').readingGroups=supplement.readingGroups;
 const sets=[];
 const add=(set)=>{set.group=set.unitId+'단원 · '+(set.group||sectionLabels[set.unitType]);set.cat=set.unitId+'단원';set.chapterIds=set.chapterIds||[set.unitId];sets.push(set);};
 legacy.forEach(original=>{
  const buckets=new Map();let at=0;
  original.parts.forEach((part,pi)=>part.items.forEach((item,qi)=>{
   const unit=legacyUnit(original,at++);if(!buckets.has(unit))buckets.set(unit,new Map());const parts=buckets.get(unit);
   if(!parts.has(pi))parts.set(pi,{name:part.name,items:[]});
   parts.get(pi).items.push({...item,id:item.id||'legacy:'+original.id+':'+pi+':'+qi,originPage:'legacy',originSet:original.id,originPi:pi,originQi:qi});
  }));
  for(const [unitId,parts] of buckets){
   const concept=original.cat==='개념어'||original.cat==='비유법';
   const reading=/^\d+(?:~\d+)?문단$/.test(original.name);
   const unitType=concept?'concept':reading?'reading':/^(중|상|유형 심화)/.test(original.name)?'advanced':'basic';
   const group=original.group.replace(/ · \d-\d단원$/,'');
   add({...original,id:'unit-legacy-'+original.id+(buckets.size>1?'-'+unitId:''),unitId,unitType,
    originPage:'legacy',originSet:original.id,intactLegacy:buckets.size===1,originalGroup:original.group,originalName:original.name,
    group:concept?group:group.replace(/^.+?「(.+)」$/,'$1'),
    name:(concept?group+' · ':reading?'본문 · ':'')+original.name,parts:[...parts.values()]});
  }
 });
 // Both former classifications reuse the same authored questions: retain one copy per ID.
 const questionMap=new Map();
 for(const page of ['development','traps'])for(const set of global.HomeworkExamSets.build(exam,page).sets)for(const part of set.parts)for(const q of part.items)if(!questionMap.has(q.id))questionMap.set(q.id,q);
 const groups=new Map();
 for(const unit of exam.units){
  if(unit.refs.some(ref=>!unitForRef(ref)))throw new Error('단원 없는 출제 내용 '+unit.id);
  const chapters=order([...new Set(unit.refs.map(unitForRef))]);
  const unitId=chapters[0],sourceTitle=exam.sources[unit.refs[0]].title;
  const concept=unit.refs.every(ref=>ref.startsWith('D'));
  for(const level of ['기본','심화']){
   const key=[unitId,sourceTitle,level].join('|');if(!groups.has(key))groups.set(key,[]);
   const items=unit.questions.filter(q=>q.level===level).map(original=>{
    const q=questionMap.get(original.id);if(!q)throw new Error('문항 누락 '+original.id);
    return {...q,originPage:'classified',requiresEvidence:true,skills:[unit.method,unit.trap].filter(Boolean)};
   });
   groups.get(key).push({unitId,sourceTitle,level,concept,chapters,part:{name:unit.id+' · '+unit.title,items}});
  }
 }
 for(const entries of groups.values())for(let offset=0;offset<entries.length;offset+=8){
  const batch=entries.slice(offset,offset+8),first=batch[0],number=offset/8+1;
  add({id:'unit-exam-'+first.unitId+'-'+first.part.name.split(' ')[0]+'-'+(first.level==='기본'?'basic':'advanced'),
   unitId:first.unitId,chapterIds:order([...new Set(batch.flatMap(e=>e.chapters))]),unitType:first.concept?'concept':first.level==='기본'?'basic':'advanced',
   group:first.sourceTitle,name:(first.concept?'개념어 · ':'')+first.level+' '+number,level:first.level,
   desc:(first.level==='기본'?'OX':'내신 5지선다')+' · '+first.sourceTitle,revision:exam.version||1,
   originPage:'classified',shuffleQuestions:true,timedMode:'question',parts:batch.map(e=>e.part)});
 }
 const advancedItems=new Map(global.HomeworkAdvancedSets.build(advanced).sets.flatMap(s=>s.parts.flatMap(p=>p.items)).map(q=>[q.id,q]));
 const mixed=new Map();
 for(const q of advanced.questions){
  const chapterIds=order([...new Set(q.refs.map(unitForRef))]),primary=unitForRef(q.refs[0]),key=primary+'|'+chapterIds.join(',');
  if(!mixed.has(key))mixed.set(key,{unitId:primary,chapterIds,items:[]});mixed.get(key).items.push({...advancedItems.get(q.id),originPage:'advanced',originSet:'advanced-mixed-'+q.set,originPi:0,originQi:advanced.questions.filter(item=>item.set===q.set).findIndex(item=>item.id===q.id)});
 }
 for(const group of mixed.values())for(let offset=0;offset<group.items.length;offset+=6){
  const items=group.items.slice(offset,offset+6),related=group.chapterIds.join('·');
  add({id:'unit-mixed-'+items[0].id,unitId:group.unitId,chapterIds:group.chapterIds,unitType:'challenge',
   group:related+'단원 함께 읽기',name:'자료 연결 '+(offset/6+1),level:'고급',desc:'내신 5지선다 · '+related+'단원',revision:advanced.version||1,
   originPage:'advanced',shuffleQuestions:true,timedMode:'question',parts:[{name:'여러 자료 함께 읽기',items}]});
 }
 for(const set of supplement.sets)add({...set,parts:set.parts.map(p=>({...p,items:p.items.map(q=>({...q}))}))});
 for(const u of units){
  const own=sets.filter(s=>s.unitId===u.id);u.questionCount=own.reduce((n,s)=>n+s.parts.reduce((m,p)=>m+p.items.length,0),0);
  u.relatedCount=sets.filter(s=>s.unitId!==u.id&&s.chapterIds.includes(u.id)).reduce((n,s)=>n+s.parts.reduce((m,p)=>m+p.items.length,0),0);
 }
 return {units,sets};
}
function migrateRecords(storage,sets){
 // Keep original records intact; copy compatible legacy sets only once.
 const markers=[];let state;
 try{state=JSON.parse(storage.getItem('homework_adventure_v1')||'null');}catch(_){}
 const copy=(oldKey,newKey,transform)=>{const raw=storage.getItem(oldKey);if(raw==null||storage.getItem(newKey)!=null)return;try{storage.setItem(newKey,transform?JSON.stringify(transform(JSON.parse(raw))):raw);}catch(_){}};
 let changed=false;
 for(const set of sets){
  const marker='practice_units_migrated_'+set.id;if(storage.getItem(marker))continue;
  const content='v'+(set.revision||1)+'_'+set.id,newGame='units|'+content;
  if(set.intactLegacy){
   const oldContent=(set.revision===2?'v2_':'')+set.originSet,oldGame='legacy|'+oldContent;
   const aliases=new Map();set.parts.forEach((p,pi)=>p.items.forEach((q,qi)=>aliases.set(pi+':'+(qi+1),q.id)));
   const saved=run=>({...run,order:run.order?.map(id=>aliases.get(id)||id),activeQuestion:run.activeQuestion?{...run.activeQuestion,id:aliases.get(run.activeQuestion.id)||run.activeQuestion.id}:run.activeQuestion});
   copy('bib_attempts_'+set.originSet,'practice_units_attempts_'+set.id);
   for(const kind of ['run','last','wrong'])copy('bib_'+kind+'_'+oldContent,'practice_units_'+kind+'_'+content,kind==='run'?saved:null);
   copy('bib_run_'+oldContent+'_retry','practice_units_run_'+content+'_retry',saved);
   copy('bib_failures_'+oldContent,'practice_units_failures_'+content,failures=>Object.fromEntries(Object.entries(failures).map(([id,n])=>[aliases.get(id)||id,n])));
   if(state){
    for(const field of ['records','pendingReviews'])if(state[field]?.[oldGame]&&!state[field][newGame]){
     const value=state[field][oldGame];state[field][newGame]=field==='records'?{...value}:{...value,key:newGame,page:'units',setId:set.id,name:set.group+' · '+set.name};changed=true;
    }
    for(const field of ['credited','combos'])for(const [oldId,newId] of aliases){
     if(state[field]?.[oldGame+'|'+oldId]&&!state[field][newGame+'|'+newId]){state[field][newGame+'|'+newId]=true;changed=true;}
    }
   }
  }
  // A question already rewarded under either old classification cannot earn its XP twice.
  if(state&&set.originPage==='classified')for(const p of set.parts)for(const q of p.items)for(const field of ['credited','combos']){
   if(!state[field])continue;
   if(Object.keys(state[field]).some(key=>/^(development|traps)\|/.test(key)&&key.endsWith('|'+q.id))&&!state[field][newGame+'|'+q.id]){state[field][newGame+'|'+q.id]=true;changed=true;}
  }
  markers.push(marker);
 }
 if(changed)storage.setItem('homework_adventure_v1',JSON.stringify(state));
 markers.forEach(marker=>storage.setItem(marker,'1'));
}
global.HomeworkUnitSets={build,definitions,unitForRef,sectionLabels,migrateRecords};
})(window);
