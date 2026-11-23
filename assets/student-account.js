/* Named student profile, persistent sign-in, and background account synchronization. */
(function(global){
'use strict';
const SESSION='homework_student_session_v1';
function profileForName(name){
 const normalized=String(name||'').replace(/\s+/g,'').replace(/학생$/,'');
 if(['지우','이지우'].includes(normalized))return {id:'IQ0VMU',name:'이지우',isTest:false};
 const test=normalized.match(/^(?:테스트|관리자테스트)(\d{0,3})$/);if(!test)return null;
 const suffix=test[1]?String(Number(test[1])):'';
 return {id:'TEST_LOCAL'+(suffix?'_'+suffix:''),name:'테스트'+suffix,isTest:true};
}
const validName=name=>!!profileForName(name);
const adminName=name=>String(name||'').normalize('NFC').replace(/\s+/g,'')==='관리자';
function node(tag,cls,text){const el=document.createElement(tag);if(cls)el.className=cls;if(text!=null)el.textContent=text;return el;}
async function open(options){
 const term=options.term;
 const raw=options.storage||global.localStorage,config=options.config||{};
 let session;try{session=JSON.parse(raw.getItem(SESSION)||'null');}catch(_){}
 const storedProfile=profileForName(session?.name);
 if(!storedProfile||session?.id!==storedProfile.id||!!session?.isTest!==storedProfile.isTest)session=null;
 else if(storedProfile.isTest)session={...storedProfile,signedAt:session.signedAt||Date.now()};
 const app=document.getElementById('app');
 if(!session){
  session=await new Promise(resolve=>{
   app.replaceChildren();const card=node('section','student-login');card.append(node('small','student-login-eyebrow','단원별 학습'),node('h1','','학생 로그인'),node('p','','이름을 입력하면 이 기기의 학습 기록을 연결하고 이어서 공부할 수 있어요.'));
   const form=node('form'),label=node('label','','학생 이름'),input=node('input');input.id='student-name';input.name='studentName';input.autocomplete='name';input.placeholder='예: 이지우';input.required=true;label.htmlFor=input.id;
   const error=node('p','student-login-error');error.id='student-login-error';error.setAttribute('role','alert');
   const button=node('button','act primary','로그인');button.type='submit';form.append(label,input,error,button);card.appendChild(form);app.appendChild(card);
   form.onsubmit=e=>{e.preventDefault();if(adminName(input.value)){button.disabled=true;global.sessionStorage.setItem('homework_teacher_entry_v1','1');const destination=new URL(location.href);if(location.protocol==='file:'){destination.searchParams.set('teacher','1');destination.searchParams.delete('admin');}else{destination.pathname=destination.pathname.replace(/[^/]*$/,'teacher.html');destination.search='';}location.assign(destination.href);return;}const profile=profileForName(input.value);if(!profile){error.textContent='등록된 학생 이름을 확인해 주세요.';return;}button.disabled=true;if(!profile.isTest)raw.removeItem('homework_teacher_view_session_v1');const data={...profile,signedAt:Date.now(),token:'',expiresAt:0};raw.setItem(SESSION,JSON.stringify(data));resolve(data);};
  });
 }
 const isTest=session.isTest===true,url=isTest?'':String(config.url||'').trim();
 document.body.classList.toggle('test-profile',isTest);
 let application=null,bar=null,authenticating=null,sessionError='',dirtyTimer=null,extraSyncs=[];
 const saveSession=()=>raw.setItem(SESSION,JSON.stringify(session));
 const active=()=>!!document.querySelector('#scr-q.on');
 const refresh=()=>{term?.clearPreviousReviews(client.storage);if(application&&document.querySelector('#scr-start.on'))application.renderStart();paint();};
 async function fetchJSON(body){
  const controller=new AbortController(),timer=global.setTimeout(()=>controller.abort(),body.action==='sync'?45000:15000);
  try{const response=await global.fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},credentials:'omit',body:JSON.stringify(body),signal:controller.signal});const data=await response.json();if(data.ok!==true)throw Error(data.error||'SERVER_ERROR');return data;}
  finally{global.clearTimeout(timer);}
 }
 const client=global.HomeworkStudentState.create({raw,uid:session.id,keyFilter:term?.acceptsKey,
  isActive:active,onChange:()=>paint(),onRemote:refresh,
  onDirty:()=>{if(isTest)return;global.clearTimeout(dirtyTimer);dirtyTimer=global.setTimeout(()=>client.flush(),900);},
  request:url?async body=>{
   if(global.navigator?.onLine===false)throw Error('OFFLINE');
   if(!session.token||session.expiresAt<Date.now())await authenticate();
   try{return await fetchJSON({...body,token:session.token});}
   catch(error){if(!['AUTH_REQUIRED','AUTH_EXPIRED'].includes(error.message))throw error;session.token='';await authenticate();return fetchJSON({...body,token:session.token});}
  }:null});
 function authenticate(){
  if(authenticating)return authenticating;
  authenticating=(async()=>{
   const response=await fetchJSON({action:'login',name:session.name});
   if(response.student?.id!==session.id)throw Error('ACCOUNT_MISMATCH');
   session={...session,token:response.token,expiresAt:response.expiresAt};saveSession();client.receive(response);
   if(!term)global.HomeworkStudentHistory.importHistory(client.storage,options.sets,response.history);sessionError='';paint();return response;
  })().finally(()=>authenticating=null);
  return authenticating;
 }
 function historyCount(){if(term)return 0;try{return new Set((JSON.parse(client.storage.getItem('student_history_v1')||'{}').rows||[]).map(r=>r.session)).size;}catch(_){return 0;}}
 function paint(){
  if(!bar)return;const state=client.status(),status=bar.querySelector('.student-sync-status');
  let text=isTest?'테스트 기록 · 이 기기에만 저장':!url?'동기화 서버 연결 전':state.conflicts.length?'다른 기기의 새 기록이 있어요':global.navigator?.onLine===false?'오프라인 · 이 기기에 저장 중':state.lastError||sessionError?'이 기기에 저장됨 · 연결 후 다시 동기화':state.pending?'기록 동기화 중 · '+state.pending+'개':state.online?'동기화 완료':'기록 불러오는 중';
  status.textContent=text;status.dataset.state=isTest?'ready':state.conflicts.length?'conflict':state.online&&!state.pending?'ready':'pending';
  const history=bar.querySelector('.student-history-count'),count=historyCount();history.textContent=count?'이전 학습 '+count+'회 연결':'';history.hidden=!count;
  const conflict=bar.querySelector('.student-conflict');conflict.hidden=!state.conflicts.length;
 }
 if(!isTest)client.importLocal();term?.clearPreviousReviews(client.storage);
 for(let i=0;i<client.storage.length;i++){
  const key=client.storage.key(i);if(!/queue:item:/.test(key))continue;
  try{const entry=JSON.parse(client.storage.getItem(key));if(entry?.row&&entry.row.uid!==session.id){entry.row.uid=session.id;client.storage.setItem(key,JSON.stringify(entry));}}catch(_){}
 }
 app.replaceChildren(node('p','loading',session.name+'의 학습 화면을 준비하고 있습니다.'));
 if(url&&global.navigator?.onLine!==false){
  try{
   if(!session.token||session.expiresAt<Date.now())await authenticate();
   // Cached students open immediately; attach() resumes synchronization in the background.
  }catch(error){sessionError=error.message;}
 }
 function attach(instance){
  application=instance;bar=node('section','student-account-bar');bar.setAttribute('aria-label','학생 계정');
  const identity=node('div','student-account-identity');identity.append(node('strong','',isTest?session.name+' 계정 · 실제 학습과 분리':'이지우 학생'),...(term?[node('small','student-term',term.label+' · 6개 단원')]:[]),node('span','student-sync-status','기록 확인 중'),node('small','student-history-count'));bar.appendChild(identity);
  const actions=node('div','student-account-actions'),sync=node('button','','동기화'),logout=node('button','','로그아웃');sync.type=logout.type='button';sync.id='student-sync-now';logout.id='student-logout';actions.append(sync,logout);bar.appendChild(actions);
  if(isTest){sync.hidden=true;const reset=node('button','','테스트 기록 초기화');reset.type='button';reset.id='student-test-reset';let resetTimer=null;reset.onclick=()=>{if(!reset.dataset.armed){reset.dataset.armed='1';reset.textContent='한 번 더 누르면 테스트 기록만 지워요';resetTimer=global.setTimeout(()=>{delete reset.dataset.armed;reset.textContent='테스트 기록 초기화';},4000);return;}global.clearTimeout(resetTimer);client.stop();global.dispatchEvent(new Event('pagehide'));global.queueMicrotask(()=>{const prefix='student:'+session.id+':',keys=[];for(let i=0;i<raw.length;i++){const key=raw.key(i);if(key?.startsWith(prefix))keys.push(key);}keys.forEach(key=>raw.removeItem(key));location.reload();});};actions.prepend(reset);}
  const conflict=node('div','student-conflict');conflict.hidden=true;conflict.appendChild(node('p','','같은 기록이 다른 기기에서도 바뀌었어요. 이 기기의 내용은 별도로 보관하고, 다른 기기에 저장된 진도를 불러올 수 있어요.'));
  const resolve=node('button','act ghost','다른 기기의 진도 불러오기');resolve.type='button';resolve.id='student-use-cloud';resolve.onclick=()=>{if(active())application.goUnit(null);client.useCloud();void client.flush();};conflict.appendChild(resolve);bar.appendChild(conflict);
  document.querySelector('.wrap').prepend(bar);
  sync.onclick=async()=>{global.dispatchEvent(new Event('pagehide'));sync.disabled=true;try{await Promise.all([client.flush(),...extraSyncs.map(s=>s.flush()),application.sync.flush()]);}finally{sync.disabled=false;paint();}};
  logout.onclick=async()=>{global.dispatchEvent(new Event('pagehide'));logout.disabled=true;await client.flush();if(url&&session.token&&global.navigator?.onLine!==false)try{await fetchJSON({action:'logout',token:session.token});}catch(_){}client.stop();raw.removeItem(SESSION);location.reload();};
  if(!isTest&&!term)for(const [page,prefix] of [['legacy','bib_'],['development','practice_development_'],['traps','practice_traps_'],['advanced','practice_advanced_']]){
   const setting=global.HOMEWORK_SHEETS?.[page];if(setting?.url)extraSyncs.push(global.HomeworkSync.create({storage:client.storage,key:prefix+'queue',sheetUrl:setting.url,uid:session.id,normalizeUid:()=>session.id}));
  }
  const flush=()=>void client.flush();global.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')flush();});
  if(!isTest)client.start();paint();
 }
 return {uid:session.id,name:session.name,isTest,storage:client.storage,client,attach,historyCount};
}
global.HomeworkStudentAccount={open,validName,profileForName};
})(window);
