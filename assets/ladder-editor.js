/* 질문 사다리 편집: 질문 학습 과정을 읽기 좋게 보여 주고, 편집 키가 있으면 문구·선택지·정답을 고칩니다. */
(function(global){
'use strict';
const S=global.HomeworkSocratic,P=global.HomeworkQuestionPatches,url=global.HOMEWORK_STUDENT?.url||'';
const online=/^https?:$/.test(global.location.protocol)&&!!url;
const clone=v=>JSON.parse(JSON.stringify(v));
const courses=global.HomeworkSocraticCourses||[];
const bases=new Map(courses.map(c=>[c.id,{skills:clone(c.skills),combined:clone(c.combined)}]));
const errors={EDITOR_AUTH_REQUIRED:'편집 키를 확인해 주세요.',EDITOR_NOT_CONFIGURED:'Apps Script에 편집 키가 설정되지 않았어요.',QUESTION_EDIT_CONFLICT:'다른 창에서 이 질문을 먼저 저장했어요. 새로고침한 뒤 다시 고쳐 주세요.',INVALID_QUESTION_EDIT:'저장할 수 없는 형식이에요. 빈 칸과 정답 선택을 확인해 주세요.',QUESTION_EDIT_TOO_LARGE:'내용이 너무 길어요.',BUSY:'서버가 다른 저장을 처리 중이에요. 잠시 뒤 다시 저장해 주세요.'};
let key='',records={},active=courses[0]?.id,editing=null;
const $=id=>document.getElementById(id);
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;}
function button(label,onclick,cls){const b=el('button',cls,label);b.type='button';b.onclick=onclick;return b;}
async function call(body){try{return await P.request(url,body,25000);}catch(e){throw new Error(errors[e.message]||'서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.');}}
const label=c=>c.label||'1~3문단',place=k=>k.place||k.paragraph+'문단';
const itemKey=(course,i,isSkill)=>isSkill?course.skills[i].id:'c'+i;
function state(course,id,base){const r=records[S.editKey(course,id)];if(!r||!r.edit)return 'original';return r.edit.sourceVersion===base.rev?'saved':'stale';}

function choices(q){const list=el('ul','choices');for(const o of q.options){const li=el('li',o===q.answer?'answer':'',o);list.append(li);}return list;}
function step(parent,name,body){const row=el('div','step');row.append(el('div','label',name));const box=el('div');body(box);row.append(box);parent.append(row);}
function questionView(parent,name,q){step(parent,name,box=>{box.append(el('p','prompt',q.prompt),choices(q));});}
function sentences(course,ids){const all=Object.values(course.sources).flatMap(s=>s.sentences);return ids.map(id=>all.find(s=>s.id===id)?.text).filter(Boolean);}

function viewBody(card,course,item,isSkill){
 if(isSkill)questionView(card,'첫 질문',item.main);else questionView(card,'종합 질문',item);
 item.narrow.forEach((q,i)=>questionView(card,'작게 생각하기 '+(i+1),q));
 questionView(card,'다른 질문으로 확인',item.retest);
 questionView(card,'복습 질문',item.review);
 step(card,'해설',box=>box.append(el('p','',item.why)));
 if(isSkill)step(card,'나중에 기억 확인',box=>{box.append(el('p','prompt',item.recall.prompt));for(const [name,list] of [['정답으로 인정',item.recall.accept],['오답으로 볼 답',item.recall.reject]]){const w=el('div','words');w.append(el('small','',name+' '));for(const s of list)w.append(el('span','',s));box.append(w);}});
 const quotes=sentences(course,item.valid);if(quotes.length)step(card,'근거 문장',box=>{for(const q of quotes)box.append(el('p','quote',q));});
}

function optionEditor(box,q,name){
 const prompt=el('textarea');prompt.value=q.prompt;prompt.setAttribute('aria-label',name+' 질문');box.append(prompt);
 const rows=el('div');box.append(rows);let group='g'+Math.random().toString(36).slice(2);
 const add=(text,isAnswer)=>{const row=el('div','option-row'),pick=el('label'),radio=el('input'),input=el('input');radio.type='radio';radio.name=group;radio.checked=isAnswer;pick.append(radio,'정답');input.type='text';input.value=text;input.setAttribute('aria-label',name+' 선택지');row.append(pick,input,button('빼기',()=>{if(rows.children.length>2)row.remove();}));rows.append(row);};
 q.options.forEach(o=>add(o,o===q.answer));
 box.append(button('+ 선택지',()=>{if(rows.children.length<5)add('',false);},'link'));
 return ()=>{const opts=[...rows.children].map(r=>({text:r.querySelector('input[type=text]').value.trim(),answer:r.querySelector('input[type=radio]').checked}));return {prompt:prompt.value.trim(),options:opts.map(o=>o.text),answer:opts.find(o=>o.answer)?.text??''};};
}
function problem(name,q){if(!q.prompt)return name+'의 질문이 비어 있어요.';if(q.options.some(o=>!o))return name+'에 빈 선택지가 있어요.';if(new Set(q.options).size!==q.options.length)return name+'에 같은 선택지가 두 번 있어요.';if(!q.answer)return name+'의 정답을 골라 주세요.';return '';}
const words=v=>v.split(/[,\n]/).map(s=>s.trim()).filter(Boolean);

function editBody(card,course,item,isSkill,base,id){
 const form=el('div','edit'),read=[];card.append(form);
 let title=null;if(isSkill)step(form,'제목',box=>{title=el('input');title.type='text';title.value=item.title;box.append(title);});
 const add=(name,q,set)=>step(form,name,box=>read.push([name,optionEditor(box,q,name),set]));
 add(isSkill?'첫 질문':'종합 질문',isSkill?item.main:item,isSkill?(d,q)=>{d.main=q;}:(d,q)=>Object.assign(d,q));
 item.narrow.forEach((q,i)=>add('작게 생각하기 '+(i+1),q,(d,v)=>{d.narrow[i]=v;}));
 add('다른 질문으로 확인',item.retest,(d,q)=>{d.retest=q;});add('복습 질문',item.review,(d,q)=>{d.review=q;});
 let why;step(form,'해설',box=>{why=el('textarea');why.value=item.why;box.append(why);});
 let recall={};if(isSkill)step(form,'나중에 기억 확인',box=>{for(const [k,name,value] of [['prompt','질문',item.recall.prompt],['accept','정답으로 인정 (쉼표로 구분)',item.recall.accept.join(', ')],['reject','오답으로 볼 답 (쉼표로 구분)',item.recall.reject.join(', ')]]){box.append(el('small','',name));const t=el(k==='prompt'?'input':'textarea');if(k==='prompt')t.type='text';t.value=value;box.append(t);recall[k]=t;}});
 const message=el('p','error');message.setAttribute('role','alert');
 const actions=el('div','actions');
 const save=button('저장',async()=>{
  const draft={narrow:[]};let issue='';
  for(const [name,get,set] of read){const q=get();issue=issue||problem(name,q);set(draft,q);}
  draft.why=why.value.trim();if(!draft.why)issue=issue||'해설이 비어 있어요.';
  if(isSkill){draft.title=title.value.trim();draft.recall={prompt:recall.prompt.value.trim(),accept:words(recall.accept.value),reject:words(recall.reject.value)};
   if(!draft.title)issue=issue||'제목이 비어 있어요.';if(!draft.recall.prompt||!draft.recall.accept.length||!draft.recall.reject.length)issue=issue||'기억 확인의 질문과 답을 채워 주세요.';}
  const next=issue?null:S.ladderItem(base,draft);
  if(!next){message.textContent=issue||'정답으로 인정하는 답과 오답으로 볼 답이 겹치지 않게 해 주세요.';return;}
  const fields=isSkill?['title','main','narrow','retest','review','why','recall']:['prompt','options','answer','why','narrow','retest','review'];
  const claim=JSON.stringify(Object.fromEntries(fields.map(f=>[f,next[f]])));
  // shortcut: ladder edits use the question_save record shape (item JSON in claim) so the Apps Script needs no redeploy; give them their own action when the server is next updated.
  await store(course,id,{sourceVersion:base.rev,prompt:label(course)+' · '+(base.title||'핵심 연결'),why:next.why,valid:base.valid,answer:'O',claim},message,save);
 },'primary');
 actions.append(save,button('취소',()=>{editing=null;render();}));
 if(records[S.editKey(course,id)]?.edit)actions.append(button('원본으로 되돌리기',()=>{if(global.confirm('이 질문을 원래 원고 내용으로 되돌릴까요?'))void store(course,id,null,message);}));
 card.append(message,actions);
}
async function store(course,id,edit,message,saveButton){
 const recordId=S.editKey(course,id);if(saveButton)saveButton.disabled=true;message.textContent='';
 try{const {record}=await call({action:'question_save',key,id:recordId,edit,expected:records[recordId]?.revision||0});records[recordId]=record;S.applyEdits(courses,records);editing=null;render();$('key-status').textContent=edit?'저장했어요. 학생 화면에 반영됩니다.':'원본으로 되돌렸어요.';}
 catch(e){message.textContent=e.message;if(saveButton)saveButton.disabled=false;}
}

function render(){
 const tabs=$('tabs');tabs.replaceChildren();
 for(const c of courses){const t=button(label(c),()=>{active=c.id;editing=null;render();});t.setAttribute('role','tab');t.setAttribute('aria-selected',String(c.id===active));tabs.append(t);}
 const course=courses.find(c=>c.id===active),box=$('course');box.replaceChildren();if(!course)return;
 const base=bases.get(course.id),items=[...course.skills.map((k,i)=>({item:k,isSkill:true,i})),...course.combined.map((c,i)=>({item:c,isSkill:false,i}))];
 const changed=items.filter(({isSkill,i})=>state(course,itemKey(course,i,isSkill),(isSkill?base.skills:base.combined)[i])==='saved').length;
 const head=el('div','course-head');head.append(el('h2','',course.title||'사건과 질문 · 1~3문단'),el('small','','핵심 내용 '+course.skills.length+'개 · 핵심 연결 '+course.combined.length+'개 · 온라인 수정 '+changed+'개'));box.append(head);
 for(const {item,isSkill,i} of items){
  const id=itemKey(course,i,isSkill),b=(isSkill?base.skills:base.combined)[i],status=state(course,id,b),card=el('article','card'),cardHead=el('div','card-head');
  cardHead.append(el('span','tag',isSkill?place(item):'핵심 연결 '+(i+1)),el('h3','',isSkill?item.title:'핵심 내용을 이어 보는 질문'));
  if(status!=='original')cardHead.append(el('span','tag '+status,status==='saved'?'수정 저장됨':'원고가 바뀌어 수정이 적용되지 않음'));
  const editKeyName=course.id+'/'+id,edit=button(editing===editKeyName?'고치는 중':'고치기',()=>{editing=editKeyName;render();});
  edit.disabled=!key||editing===editKeyName;edit.title=key?'':'편집 키를 넣으면 고칠 수 있어요';cardHead.append(edit);card.append(cardHead);
  if(editing===editKeyName)editBody(card,course,item,isSkill,b,id);else viewBody(card,course,item,isSkill);
  box.append(card);if(editing===editKeyName)global.requestAnimationFrame(()=>card.scrollIntoView({block:'start'}));
 }
}

$('unlock').onclick=async()=>{
 const value=$('editor-key').value.trim(),status=$('key-status');
 if(!online){status.textContent='온라인 사이트에서만 저장할 수 있어요.';return;}
 try{status.textContent='편집 키를 확인하는 중…';await call({action:'question_authorize',key:value});key=value;$('editor-key').value='';status.textContent='편집할 수 있어요. 고칠 질문에서 ‘고치기’를 누르세요.';render();}
 catch(e){status.textContent=e.message;}
};
$('editor-key').addEventListener('keydown',e=>{if(e.key==='Enter')$('unlock').click();});
render();
if(online)call({action:'question_read'}).then(r=>{records=Object.fromEntries(Object.entries(r.questions||{}).filter(([id])=>id.startsWith('ladder:')));S.applyEdits(courses,records);render();}).catch(e=>{$('key-status').textContent='저장된 수정을 불러오지 못했어요. '+e.message;});
else $('unlock').disabled=true;
})(window);
