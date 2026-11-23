/* One question at a time, in the existing passage/question split view. */
var HomeworkSocraticView=(function(){
'use strict';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
const labels={correct:'정답',wrong:'문제 답 오답',unknown:'모름',revealed:'설명 먼저 봄'};
const place=k=>k?.place||k?.paragraph+'문단',course=s=>s.content.label||'1~3문단';
const sourceIds=(s,item)=>item.sources||(s.mode==='combined'?Object.keys(s.content.sources):['L'+String(item.paragraph).padStart(2,'0')]);
function map(s,box){const m=HomeworkSocratic.summary(s),list=el('ul','socratic-skill-map');for(const r of m.skills){const row=el('li');row.append(el('span','',place(s.content.skills.find(k=>k.id===r.id))+' · '+r.title),el('strong','',r.level===null?'미확인':r.level===4?'혼자 확인 완료':r.teacherPending?'표현 확인 대기':r.pending?'복습할 내용':r.solved?'나중에 기억 확인': '학습 중'));list.append(row);}box.append(list);return m;}
function mount({root,model,onHome,onContinue}){
 let live=true;
 const button=(parent,label,action,primary=false,id)=>{const b=el('button','act '+(primary?'primary':'ghost'),label);b.type='button';if(id)b.id=id;b.onclick=action;parent.append(b);return b;};
 function render(){if(!live)return;const s=model.state();if(!s)return;root.replaceChildren();const wrap=el('section','socratic-panel');root.append(wrap);const heading=el('header','socratic-heading');heading.append(el('small','','2-2 · '+course(s)+' · 질문하며 읽기'),el('h2','',s.screen==='diagnostic'?'알고 있는 것부터 확인해요':s.screen==='summary'?'여기까지 배운 내용':s.screen==='welcome'?'하나씩 읽고, 생각하고, 확인해요':s.screen==='placement'?'이제 글을 읽으며 확인해요':s.mode==='combined'?course(s)+' · 핵심 연결':s.mode==='recall'?'본문 없이 기억해 보기':place(s.content.skills[s.index])+' · '+s.content.skills[s.index].title));wrap.append(heading);
 const top=el('div','socratic-toolbar');button(top,'저장하고 학습 현황',onHome,false,'socratic-home');top.append(el('span','','질문 시간 제한 없음 · 직접 다음으로 이동'));heading.append(top);
 if(model.error())wrap.append(el('p','socratic-error',model.error()));
 const act=(type,value)=>{model.act({type,value});render();};
 if(s.screen==='welcome'){const card=el('div','socratic-card');card.append(el('p','','짧은 문장이나 상황을 읽고 다섯 질문에 하나씩 답해요. 몇 문단이었는지 외울 필요는 없어요. 정답과 해설은 진단이 끝난 뒤에 확인해요.'),el('p','','그다음 '+[...new Set(s.content.skills.map(place))].join(' → ')+' → 핵심 연결 순서로 읽어요. 막히면 더 작은 질문부터 도와줄게요.'),el('p','','이전에 푼 문제와 점수는 그대로 보관됩니다.'));button(card,'다섯 질문 시작하기',()=>act('begin'),true,'socratic-begin');wrap.append(card);return;}
 if(s.screen==='placement'){const card=el('div','socratic-card');card.append(el('p','','잘 아는 내용은 다른 각도의 질문으로 바로 확인해요. 막힌 내용은 한 가지씩 짚어 봅니다.'));for(const d of s.diagnostic){const k=s.content.skills.find(k=>k.id===d.id);card.append(el('p','',k.title+' · '+(d.result==='correct'?'첫 확인 통과':d.result==='unknown'?'아직 모르겠음':'함께 확인할 내용')));}card.append(el('small','','진단만으로 혼자 익혔다고 판단하지 않아요. 배우지 않은 내용은 미확인으로 둡니다.'));button(card,place(s.content.skills[0])+'부터 읽기',()=>act('learn'),true);wrap.append(card);return;}
 if(s.screen==='summary'){const card=el('div','socratic-card'),m=map(s,card);card.prepend(el('p','', '첫 정답 '+m.initialCorrect+' · 문제 답 오답 '+m.wrong+' · 근거 오답 '+m.skills.filter(k=>k.reasonWrong).length+' · 모름 '+m.unknown+' · 도움받음 '+m.assisted));card.append(el('p','','설명 뒤에 맞혀도 첫 답변 기록은 바뀌지 않아요. 다음 날 이후 본문 없이 기억하는지 다시 확인합니다.'));
 if(m.pendingCount)button(card,'바로 복습하기 · '+m.pendingCount+'개',()=>act('review'),true,'socratic-review');
 if(m.due.length)button(card,'기억 확인하기 · '+m.due.length+'개',()=>act('recall'),true,'socratic-recall');
 if(m.complete)button(card,'본문 OX 이어 풀기',onContinue,true,'socratic-continue');
 button(card,'학습 현황으로',onHome);wrap.append(card);return;}
 const k=s.content.skills[s.index],q=model.question(),feedback=['explanation','evidence-feedback','feedback'].includes(s.screen),hidePassage=s.screen==='diagnostic'||s.mode==='recall'&&s.node==='recall';
 const grid=el('div','socratic-grid'),left=el('article','socratic-passage'),right=el('section','socratic-question');grid.append(left,right);wrap.append(grid);
 const explanation=s.mode==='combined'?s.content.combined[s.index].why:k.why;
 const highlighted=s.mode==='combined'?s.content.combined[s.index].valid:s.screen==='evidence-feedback'&&k.evidence?k.evidence.correct.flatMap(i=>k.evidence.groups[i]):k.valid;
 if(s.screen==='diagnostic'&&q.context){left.setAttribute('aria-label','진단 질문에 필요한 내용');left.append(el('h3','',q.context.title));for(const text of q.context.text)left.append(el('p','socratic-source',text));left.append(el('small','','위 내용을 읽고 질문에 답해 보세요.'));}
 else if(hidePassage){left.append(el('h3','','지금은 기억으로 생각해 봐요'),el('p','','모르면 “모름”을 눌러도 괜찮아요.'));}
 else {
  const bar=el('div','socratic-passage-title');bar.append(el('h3','','지문'));button(bar,'지문 크게 보기',()=>{const d=el('dialog','socratic-dialog');const body=left.cloneNode(true);body.querySelectorAll('button').forEach(b=>b.remove());d.append(body);button(d,'닫기',()=>{d.close();d.remove();},true);document.body.append(d);d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();});left.append(bar);
  const sources=sourceIds(s,s.mode==='combined'?s.content.combined[s.index]:k).map(id=>s.content.sources[id]).filter(Boolean);
  for(const source of sources){left.append(el('h4','',source.label));const p=el('p','socratic-source');for(const sentence of source.sentences){p.append(el(feedback&&highlighted.includes(sentence.id)?'mark':'span','',sentence.text+' '));}left.append(p);}
  if(feedback){const note=el('aside','socratic-explanation');note.setAttribute('aria-label','지문 속 근거와 해설');note.append(el('strong','','근거와 해설'),el('p','',explanation));if(s.screen==='evidence-feedback'&&s.notice)note.append(el('p','',s.notice));left.append(note);}
 }
 if(s.screen==='reading'){right.append(el('h3','','먼저 이 문단을 읽어 보세요'),el('p','','모르는 말이 있어도 괜찮아요. 다음 화면에서 한 가지씩 묻고 함께 짚어 봅니다.'));button(right,'읽었어요 · 질문 시작',()=>act('read'),true,'socratic-read');return;}
 if(s.screen==='diagnostic')right.append(el('p','socratic-step',(s.diagnostic.length+1)+' / '+s.content.diagnostic.length+' · 정답은 진단 뒤에 확인해요'));
 else right.append(el('p','socratic-step',s.mode==='review'?'복습 · '+(s.queueIndex+1)+' / '+s.queue.length:s.mode==='recall'?'나중에 기억 확인':s.node==='narrow1'?'작게 생각하기 · 1':s.node==='narrow2'?'작게 생각하기 · 2':s.node==='retest'?'다른 질문으로 확인':s.node==='evidence'?'근거 확인':'한 가지 생각하기'));
 if(s.notice&&!feedback)right.append(el('p','socratic-notice',s.notice));
 if(feedback){right.append(el('h3','',s.screen==='feedback'?s.notice:s.screen==='evidence-feedback'?'근거를 다시 살펴봐요':'짧게 설명할게요'));
 if(s.screen==='feedback'){
  if(s.mode!=='combined'&&s.mode!=='recall'){const r=s.results[k.id];right.append(el('p','',r.first==='correct'?(r.reasonWrong?'문제 답은 정답 · 근거는 한 번 틀림':'첫 답변: 정답'):'첫 답변: '+(labels[r.first]||'미확인')));if(r.help||r.reasonWrong)right.append(el('small','',s.mode==='review'?'이번 복습은 통과했어요. 처음 도움받거나 틀린 기록은 그대로 남아요.':'도움 뒤에 확인한 기록입니다. 복습에서 다시 살펴봐요.'));}
  button(right,'다음으로',()=>act('next'),true,'socratic-next');
 }else button(right,s.screen==='evidence-feedback'?'해설 숨기고 근거 다시 고르기':'다른 질문으로 확인하기',()=>act('again'),true,'socratic-again');
 return;}
 right.append(el('h3','socratic-prompt',q.prompt));
 if(s.node==='recall'&&s.mode==='recall'){const form=el('form','socratic-recall-form'),input=el('input');input.type='text';input.maxLength=200;input.id='socratic-recall-answer';input.autocomplete='off';input.setAttribute('aria-label','기억나는 답');form.append(input);const submit=el('button','act primary','답 확인');submit.type='submit';form.append(submit);form.onsubmit=e=>{e.preventDefault();if(input.value.trim())act('answer',input.value);};right.append(form);button(right,'? 모름',()=>act('answer','?'));return;}
 const choices=el('div','socratic-choices');right.append(choices);
 if(s.node==='evidence'&&s.screen!=='diagnostic'){q.groups.forEach((ids,index)=>{const text=ids.map(id=>Object.values(s.content.sources).flatMap(x=>x.sentences).find(x=>x.id===id).text).join(' ');button(choices,(index+1)+'. '+text,()=>act('answer',index),false,'socratic-choice-'+index);});}
 else q.options.forEach((value,index)=>button(choices,value,()=>act('answer',value),false,'socratic-choice-'+index));
 button(choices,'? 모름',()=>act('answer','?'),false,'socratic-unknown');
 if(s.screen!=='diagnostic')button(right,'설명 바로 보기 · 무료',()=>act('explain'),false,'socratic-explain');
 }
 return {render,destroy(){live=false;root.replaceChildren();}};
}
function teacher(records,logs=false){
 const base='practice_units_final2026_',states=Object.keys(records).filter(key=>key.startsWith(base+'socratic_v1_')).sort().map(key=>{try{return JSON.parse(records[key]?.value||'null');}catch(_){return null;}}).filter(s=>s?.schema);
 if(!states.length)return null;const card=el('section','teacher-section');card.id='teacher-socratic';
 for(const s of states){card.append(el('h2','','2-2 '+course(s)+' · 질문하며 읽기'));const m=map(s,card);card.append(el('p','','새 과정 첫 정답 '+m.initialCorrect+' · 문제 답 오답 '+m.wrong+' · 근거 오답 '+m.skills.filter(k=>k.reasonWrong).length+' · 모름 '+m.unknown+' · 남은 복습 '+m.pendingCount+' · 본문 없이 확인 '+m.mastered+'/'+m.skills.length));
  for(const k of m.skills)if(k.teacherPending)card.append(el('p','','선생님 확인 대기 · '+k.title+' · 학생 답: '+k.recallResponse));}
 card.append(el('small','','새 과정 기록은 기존 문제 점수와 별도로 표시합니다. 4단계는 도움 없는 확인과 나중의 기억 확인을 모두 통과한 경우입니다.'));
 if(logs){const events=[];for(const [key,record] of Object.entries(records))if(key.startsWith(base+HomeworkSocratic.eventSuffix)){try{events.push(JSON.parse(record.value));}catch(_){}}events.sort((a,b)=>b.at-a.at);
  const kinds={answer:'답변',explain:'설명 요청',review:'복습 시작',again:'재도전',next:'다음',recall:'기억 확인',read:'본문 읽기',begin:'학습 시작',start:'과정 시작'},modes={learn:'학습',review:'복습',combined:'핵심 연결',recall:'기억 확인',diagnostic:'시작 확인'},nodes={main:'첫 질문',narrow1:'작은 질문 1',narrow2:'작은 질문 2',retest:'다시 확인',evidence:'근거 고르기',review:'복습 질문'},results={correct:'정답',wrong:'오답',unknown:'모름',pending:'선생님 확인 대기'};
  for(const e of events.slice(0,100)){const s=states.find(s=>s.content.id===e.course)||states[0],k=s.content.skills.find(k=>k.id===e.skill),d=el('details');
   d.append(el('summary','',new Date(e.at).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})+' · '+course(s)+' · '+(e.mode==='combined'?'핵심 연결':k?.title||'시작')+' · '+(kinds[e.kind]||e.kind)),el('p','',(e.prompt?e.prompt+' · ':'')+'단계: '+(modes[e.mode]||e.mode||'시작')+' / '+(nodes[e.node]||e.node||'—')+' · 선택: '+(e.selectedText??e.value??'—')+' · 결과: '+(results[e.result]||'—')));card.append(d);}}
 return card;
}
return {mount,teacher};
})();
