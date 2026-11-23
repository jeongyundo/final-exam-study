/* Teacher observation UI: login/read sync only, never sends student state changes. */
(function(global){
'use strict';
const KEY='homework_teacher_view_session_v1',modeLabels={flow:'문단 흐름별',trap:'선지 변형 유형별'},stateLabels={untouched:'미시작',solving:'풀이 중',reviewing:'복습 중',review:'복습 필요',mastered:'오답까지 완료',finished:'풀이 완료'};
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
const date=(value,short=false)=>value?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',...(short?{}:{month:'numeric',day:'numeric'}),hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(value)):'기록 없음';
const pct=(score,max)=>max?Math.round(score/max*100)+'%':'—';
const dayKey=value=>new Date(value+9*60*60*1000).toISOString().slice(0,10);
const duration=value=>{const seconds=Math.max(0,Math.round(Number(value)||0));return Math.floor(seconds/60)+'분 '+seconds%60+'초';};
async function mount(root,options={}){
 if(root.dataset.teacherMounted)return;root.dataset.teacherMounted='true';
 document.body.classList.add('teacher-view');const catalog=options.catalog||global.HOMEWORK_TEACHER_CATALOG,url=String((options.config||global.HOMEWORK_STUDENT)?.url||'').trim();
 let storage=options.storage;try{storage=storage||global.localStorage;}catch(_){}storage=storage||{getItem:()=>null,setItem(){},removeItem(){}};let session=null,records={},history={rows:[],answers:[]},revision=0,busy=false,timer=null,lastRead=0,view='flow',stateFilter='all',connection='';
 try{session=JSON.parse(storage.getItem(KEY)||'null');if(session?.id!=='IQ0VMU'||!session?.token)session=null;}catch(_){}
 const device='teacher_view_'+(global.crypto?.randomUUID?.()||Date.now().toString(36)+'_'+Math.random().toString(36).slice(2)).replace(/[^a-zA-Z0-9_-]/g,'');
 const save=()=>{try{storage.setItem(KEY,JSON.stringify(session));}catch(_){}};
 async function request(body){if(global.navigator?.onLine===false)throw Error('OFFLINE');const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000);try{const response=await fetch(url,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},credentials:'omit',body:JSON.stringify(body),signal:controller.signal});const data=await response.json();if(!response.ok||data.ok!==true)throw Error(data.error||'SERVER_ERROR');return data;}finally{clearTimeout(timeout);}}
 function accept(data,replace=false){records=replace?{...(data.records||{})}:{...records,...data.records};revision=data.revision??revision;if(data.history)history=data.history;lastRead=Date.now();connection='연결됨 · 15초마다 새로 확인';}
 // Administrator is the read-only teacher entry for the existing student record, not a new student account.
 async function login(){const result=await request({action:'login',name:'이지우'});if(result.student?.id!=='IQ0VMU')throw Error('ACCOUNT_MISMATCH');session={id:'IQ0VMU',name:'선생님',studentName:'이지우',token:result.token,expiresAt:result.expiresAt};save();accept(result,true);}
 function drawLogin(message=''){
  clearInterval(timer);root.replaceChildren();const wrap=el('section','teacher-login');wrap.append(el('small','teacher-eyebrow','기말고사 · 2-2·3-1단원'),el('h1','','선생님 진행현황'),el('p','','지우 학생의 진도와 정답률, 오답 복습 상태를 확인합니다.'));
  const form=el('form'),label=el('label','','선생님 접속 이름'),input=el('input');input.id='teacher-student-name';input.name='teacher-name';input.placeholder='선생님 접속 이름';input.value='';input.type='text';input.inputMode='text';input.lang='ko';input.autocomplete='off';input.autocapitalize='none';input.spellcheck=false;input.required=true;label.htmlFor=input.id;
  const error=el('p','teacher-error',message);error.setAttribute('role','alert');const submit=el('button','teacher-primary','학습 현황 보기');submit.type='submit';form.append(label,input,error,submit);wrap.append(form,el('small','teacher-note','학생 이름이 아닌 선생님 접속 이름을 입력하세요. 이 화면에서는 풀이·점수·복습 기록을 변경하지 않습니다.'));
  form.onsubmit=async event=>{event.preventDefault();if(input.value.normalize('NFC').replace(/\s+/g,'')!=='관리자'){error.textContent='선생님 접속 이름이 맞는지 확인해 주세요.';input.setAttribute('aria-invalid','true');input.focus();return;}input.removeAttribute('aria-invalid');if(!url){error.textContent='학습 기록 연결 주소가 설정되지 않았습니다.';return;}submit.disabled=true;submit.textContent='기록 불러오는 중…';try{await login();draw();start();}catch(e){error.textContent=errorText(e);submit.disabled=false;submit.textContent='다시 연결';}};root.appendChild(wrap);
 }
 function errorText(e){return e.message==='OFFLINE'?'인터넷에 연결한 뒤 다시 확인해 주세요.':['AUTH_REQUIRED','AUTH_EXPIRED'].includes(e.message)?'연결이 만료되었습니다. 다시 로그인해 주세요.':'기록을 불러오지 못했습니다. 잠시 후 새로고침해 주세요.';}
 async function refresh(full=false){if(busy||!session)return;busy=true;paintConnection('새 기록 확인 중…');try{if(full||session.expiresAt<Date.now())await login(session.name);else{try{accept(await request({action:'sync',token:session.token,deviceId:device,revision,operations:[]}));}catch(e){if(!['AUTH_REQUIRED','AUTH_EXPIRED'].includes(e.message))throw e;await login(session.name);}}draw(true);return true;}catch(e){connection=errorText(e)+' 마지막으로 받은 기록을 표시합니다.';if(lastRead)paintConnection(connection,true);else drawLogin(errorText(e));return false;}finally{busy=false;}}
 function start(){clearInterval(timer);timer=setInterval(()=>{if(document.visibilityState==='visible')void refresh();},15000);}
 function paintConnection(text,error=false){const node=root.querySelector('#teacher-connection');if(node){node.textContent=text;node.classList.toggle('is-error',error);}}
 const badge=(text,kind)=>el('span','teacher-badge '+(kind||''),text);
 function homeworkOverview(model){
  const section=el('section','teacher-section teacher-homework-time');section.id='teacher-homework-time';section.append(el('h2','','숙제 세션 · 화면 이탈 기록'),el('p','teacher-note','‘숙제로 시작하기’로 진행한 기록입니다. 수업·테스트 모드는 제외하며, 날짜는 숙제를 시작한 날의 한국 시간을 기준으로 합니다.'));
  const sessions=model.homeworkSessions||[];
  if(!model.homeworkTrackingKnown){section.appendChild(el('p','teacher-empty','아직 시간·집중 알림 기록이 없습니다. 새 학생 파일을 사용하거나 새 ZIP을 사이트에 올린 뒤 숙제를 시작하면 여기에 표시됩니다. 이전 숙제의 시간과 이탈 횟수는 저장하지 않았으므로 확인할 수 없습니다.'));return section;}
  const days=new Map((model.homeworkDaily||[]).map(d=>[d.date,d])),cards=el('div','teacher-daily-cards');
  for(const [key,label] of [[dayKey(Date.now()),'오늘'],[dayKey(Date.now()-86400000),'어제']]){const d=days.get(key),card=el('article','teacher-day-card');card.dataset.homeworkDay=key;card.append(el('span','',label+' · '+key),el('strong','',d?duration(d.elapsedMs/1000):'기록 없음'));
   if(d)card.append(el('p','','숙제 세션 '+d.sessions+'회'),el('small','','숙제 탭 표시 '+duration(d.visibleMs/1000)+' · 탭·앱 이탈 '+d.tabSwitches+'회'),el('small','','무활동 알림: 10초 '+d.idleNotices+'회 · 20초 '+d.idleWarnings+'회'));
   else card.appendChild(el('small','','이 날짜에 시작한 숙제 기록이 아직 없습니다.'));cards.appendChild(card);}section.appendChild(cards);
  section.appendChild(el('p','teacher-note','타이머는 탭 이탈·무활동 중에도 흐릅니다. 20초 알림 횟수에는 반복 경고가 포함됩니다. ‘확인 안 된 시간’은 브라우저 종료·절전 등으로 관찰하지 못한 구간입니다.'));
  for(const s of sessions){const detail=el('details','teacher-session-row');detail.dataset.detailId='homework-session:'+s.id;detail.dataset.homeworkSession=s.id;
   const stale=s.status==='active'&&Date.now()-s.updatedAt>90000,unconfirmed=s.status==='interrupted'||s.status==='completed'&&!s.complete,status=s.complete?'30분 타이머 완료':unconfirmed?'종료 확인 못함':s.status==='stopped'?(s.endReason==='class'?'수업으로 전환':s.managedTime?'세션 종료':'중간 종료'):stale?'최근 기록 없음':'진행 중',summary=el('summary');
   summary.append(el('time','',date(s.startedAt)),badge(status,s.complete?'correct':s.status==='active'&&!stale?'':'evidence'),el('strong','',(s.managedTime?'세션 경과 ':'타이머 ')+duration(s.elapsedMs/1000)+(s.managedTime?'':' / 30분')));detail.appendChild(summary);
   const metrics=el('dl','teacher-session-metrics');for(const [label,value] of [['숙제 탭 표시',duration(s.visibleMs/1000)],['다른 화면에 있던 시간',duration(s.hiddenMs/1000)],['확인 안 된 시간',duration(s.unobservedMs/1000)],['탭·앱 이탈',s.tabSwitches+'회'],['10초 무활동 알림',s.idleNotices+'회'],['20초 무활동 경고',s.idleWarnings+'회'],['전체화면 이탈',s.fullscreenExits+'회'],['화면 모드',s.windowed?'창 모드':'전체화면']]){const field=el('div');field.append(el('dt','',label),el('dd','',value));metrics.appendChild(field);}detail.append(metrics,el('p','teacher-note','마지막 기록 '+date(s.updatedAt)+(s.endedAt?' · 종료 '+date(s.endedAt):'')));
   if(stale||unconfirmed)detail.appendChild(el('p','teacher-note','마지막 기록 이후 계속 공부했는지는 확인할 수 없습니다. 학생 기기에서 인터넷에 연결하고 동기화하면 저장된 새 기록을 확인할 수 있습니다.'));
   section.appendChild(detail);
  }return section;
 }
 let eventLimit=100;
 function eventOverview(model){
  const section=el('section','teacher-section');section.id='teacher-student-events';const events=model.studentEvents||[];
  section.append(el('h2','','학생 선택 · 화면 이동 기록'),el('p','teacher-note','전체화면 해제·복귀, 탭 이동, 알림과 학생이 누른 버튼을 한국 시간 순서로 표시합니다. 이 기능을 추가한 버전부터 수집하며, 학생 기기에서 동기화한 내용이 보입니다.'));
  if(!events.length){section.appendChild(el('p','teacher-empty','아직 저장된 선택 기록이 없습니다.'));return section;}
  const list=el('div');const paint=()=>{list.replaceChildren();for(const event of events.slice(0,eventLimit)){
   const row=el('article','teacher-activity-row');row.append(el('time','',date(event.at)),el('strong','',event.label||event.kind));
   const seconds=event.remainingMs==null?null:Math.max(0,Math.ceil(event.remainingMs/1000));
   row.appendChild(el('p','teacher-note',[(event.mode==='homework'?'숙제':event.mode==='class'?'수업':'모드 선택 전'),seconds==null?'':'숙제 남은 시간 '+Math.floor(seconds/60)+'분 '+seconds%60+'초',event.qid?'문항 '+event.qid:event.setId||'',event.questionIndex?'세트 내 '+event.questionIndex+'번':'',event.control?'버튼 '+event.control:''].filter(Boolean).join(' · ')));list.appendChild(row);
  }more.hidden=eventLimit>=events.length;count.textContent=events.length+'건 중 '+Math.min(eventLimit,events.length)+'건 표시';};
  const count=el('p','teacher-note'),more=el('button','','이전 기록 100건 더 보기');more.type='button';more.onclick=()=>{eventLimit+=100;paint();};section.append(count,list,more);paint();return section;
 }
 function studyOverview(model){
  const section=el('section','teacher-section teacher-homework');section.id='teacher-homework';section.append(el('h2','','어제·오늘 얼마나 풀었나요?'),el('p','teacher-note','한국 시간 기준 · 동기화된 답변 횟수입니다. 같은 문제를 다시 풀거나 복습하면 횟수가 늘어납니다. 사전 읽기는 아래에 따로 표시합니다.'));
  const today=dayKey(Date.now()),yesterday=dayKey(Date.now()-86400000),days=new Map((model.daily||[]).map(d=>[d.date,d]));
  const empty=date=>({date,total:0,normal:0,review:0,correct:0,uniqueQuestions:0,seconds:0}),cards=el('div','teacher-daily-cards');
  for(const [key,label] of [[today,'오늘'],[yesterday,'어제']]){const d=days.get(key)||empty(key),card=el('article','teacher-day-card');card.dataset.teacherDay=key;card.append(el('span','',label+' · '+key),el('strong','',d.total+'회'),el('p','','일반 풀이 '+d.normal+'회 · 오답 복습 '+d.review+'회'),el('small','',d.total?'서로 다른 '+d.uniqueQuestions+'문항 · 정답 '+d.correct+'/'+d.total:'아직 서버에서 확인된 답변이 없습니다.'));cards.appendChild(card);days.set(key,d);}section.appendChild(cards);
  if(model.timeCorrections?.answers)section.appendChild(el('p','teacher-note','기기 시간대가 달랐던 '+model.timeCorrections.answers+'개 답변은 함께 저장된 시작 시각을 대조해 한국 시간으로 표시했습니다.'));
  const detail=el('details','teacher-daily-history');detail.dataset.detailId='daily-history';detail.appendChild(el('summary','','날짜별 풀이 기록 전체 보기'));
  const scroll=el('div','teacher-table-scroll'),table=el('table','teacher-table teacher-daily-table'),head=el('thead'),header=el('tr');for(const text of ['날짜','전체 응답','일반 풀이','오답 복습','정답','답변에 쓴 시간'])header.appendChild(el('th','',text));head.appendChild(header);table.appendChild(head);const body=el('tbody');
  for(const d of [...days.values()].sort((a,b)=>b.date.localeCompare(a.date))){const row=el('tr');for(const [label,value] of [['날짜',d.date],['전체 응답',d.total+'회'],['일반 풀이',d.normal+'회'],['오답 복습',d.review+'회'],['정답',d.correct+'/'+d.total],['답변에 쓴 시간',duration(d.seconds)]]){const cell=el('td','',value);cell.dataset.label=label;row.appendChild(cell);}body.appendChild(row);}table.appendChild(body);scroll.appendChild(table);detail.append(scroll,el('p','teacher-note','시간은 답변에 기록된 풀이 시간의 합입니다. 사전 읽기·해설 읽기·쉬는 시간과 숙제 30분 타이머는 포함하지 않습니다.'));section.appendChild(detail);
  const readings=model.reading||[],read=el('details','teacher-reading-history');read.dataset.detailId='reading-history';read.appendChild(el('summary','','문단 사전 읽기 · '+readings.filter(r=>r.complete).length+'문단 완료'+(readings.some(r=>!r.complete)?' · '+readings.filter(r=>!r.complete).length+'문단 진행 중':'')));
  if(!readings.length)read.appendChild(el('p','teacher-empty','아직 동기화된 사전 읽기 연습이 없습니다.'));
  for(const r of readings){const row=el('article','teacher-reading-row');row.append(el('strong','',r.unitId+'단원 · '+r.paragraph+'문단'),el('span','',r.completedSteps+'/'+r.totalSteps+'단계 · '+(r.complete?'완료':'진행 중')+' · 도움받은 단계 '+r.assistedSteps+'개'),el('small','','마지막 저장 '+date(r.updatedAt)));read.appendChild(row);}section.appendChild(read);
  section.appendChild(el('p','teacher-note','학생이 인터넷에 연결된 상태에서 상단 ‘동기화’를 누른 뒤, 이 화면의 ‘시트 기록도 다시 읽기’를 누르면 전체 기록을 다시 확인합니다.'));
  return section;
 }
 function logDetail(log,model){
  const d=global.HomeworkTeacherModel.classify(log),section=el('article','teacher-answer-detail'),evidence=log.evidence;
  const ground=(group,id)=>group?.members?.length?group.members.map(id=>catalog.sentences[id]?.text||id).join(' '):catalog.sentences[id]?.text||id;
  section.append(el('strong','',catalog.questions[log.qid]?.text||log.question||log.qid||'문항'),badge(d.kind==='evidence'?'근거 오답':d.kind==='answer'?'문제 답 오답':'정답',d.kind));if(d.corrected)section.appendChild(badge('해설 후 정정 · 최초 오답 유지','corrected'));
  section.appendChild(el('p','','문제 답: '+(log.problemAnswer||log.correctAnswer||log.answer||'기록 없음')));
  if(evidence?.rejected?.length)section.append(el('small','','처음 고른 근거'+(evidence.rejectedGroups?.length?' 묶음':'')),el('blockquote','teacher-rejected',ground(evidence.rejectedGroups?.[0],evidence.rejected[0])));
  if(evidence?.selected)section.append(el('small','',d.corrected?'다시 고른 근거 묶음':'고른 근거'+(evidence.selectedGroup?' 묶음':'')),el('blockquote','',ground(evidence.selectedGroup,evidence.selected)));
  return section;
 }
 const logsPage=new URLSearchParams(global.location?.search||'').get('view')==='logs';
 function pageLink(logs){
  const destination=new URL(global.location.href);
  if(logs)destination.searchParams.set('view','logs');
  else destination.searchParams.delete('view');
  const link=el('a','teacher-page-link',logs?'학습 로그':'학생 전체 현황');
  link.href=destination.href;
  return link;
 }
 let dailyAdmin;
 function draw(preserve=false){
  if(!logsPage&&url&&global.HomeworkDailyAdmin){
   dailyAdmin??=global.HomeworkDailyAdmin.create(url,storage);dailyAdmin.update(records);
   if(preserve&&dailyAdmin.element.contains(document.activeElement))return;
  }
  const opened=preserve?new Set([...root.querySelectorAll('details[open][data-detail-id]')].map(n=>n.dataset.detailId)):new Set(),scroll=global.scrollY;
  const model=global.HomeworkTeacherModel.build(records,catalog,history),wrap=el('div','teacher-wrap');root.replaceChildren(wrap);
  const header=el('header','teacher-header'),titles=el('div');titles.append(el('small','teacher-eyebrow','선생님 조회 · 기말고사 2-2·3-1단원'),el('h1','',logsPage?'이지우 학생 학습 로그':'이지우 학생 전체 현황'),el('p','','학생이 서버에 동기화한 기록을 조회합니다.'));
  const actions=el('div','teacher-actions'),reload=el('button','','새로고침'),full=el('button','','시트 기록도 다시 읽기'),disconnect=el('button','','연결 해제');reload.id='teacher-refresh';full.id='teacher-refresh-history';disconnect.id='teacher-disconnect';for(const button of [reload,full,disconnect])button.type='button';reload.onclick=()=>void refresh();full.onclick=()=>void refresh(true);disconnect.onclick=async()=>{clearInterval(timer);const old=session;session=null;try{storage.removeItem(KEY);}catch(_){}if(old?.token&&global.navigator?.onLine!==false)try{await request({action:'logout',token:old.token});}catch(_){}records={};history={rows:[],answers:[]};dailyAdmin=null;drawLogin();};actions.append(pageLink(!logsPage),reload,full,disconnect);if(/^https?:$/.test(global.location?.protocol||'')){const editor=el('button','','문제 관리');editor.type='button';editor.onclick=()=>{global.location.href='question-editor.html';};actions.append(editor);}header.append(titles,actions);wrap.appendChild(header);
  const sync=el('section','teacher-sync');sync.append(el('strong','','조회 기준'),el('span','',lastRead?'이번 조회 '+date(lastRead):'기록 확인 중'),el('span','',model.latestSync?'학생 기록 마지막 저장 '+date(model.latestSync):'학생 기록 저장 시각 없음'));const status=el('p','',connection);status.id='teacher-connection';sync.appendChild(status);wrap.append(sync);
  const pilotCard=global.HomeworkSocraticView?.teacher(records,logsPage);if(pilotCard)wrap.append(pilotCard);
  if(logsPage)wrap.append(studyOverview(model),homeworkOverview(model),eventOverview(model));
  else {
  const metrics=el('section','teacher-metrics');
  for(const [label,value,note] of [['채점된 문항',model.uniqueAnswered+' / '+model.totalQuestions,'같은 문항은 유형이 달라도 한 번만 셉니다.'],['오답까지 완료',model.modes.flow.mastered+' / '+model.modes.flow.sets,'문단 흐름별 세트 기준'],['남은 오답',model.remaining+'문항'+(model.unknownReviewCount?' + 상세 대기 '+model.unknownReviewCount:''),'문제 답 '+model.answerWrong+' · 근거 '+model.evidenceWrong],['최근 풀이',date(model.latestAnswer,true),model.latestAnswer?'서버에 저장된 마지막 풀이 시각':'아직 기말 풀이 기록이 없습니다.']]){const card=el('article','teacher-metric');card.append(el('span','',label),el('strong','',value),el('small','',note));metrics.appendChild(card);}wrap.appendChild(metrics);
  if(!model.latestSync&&!model.uniqueAnswered)wrap.appendChild(el('p','teacher-empty','아직 동기화된 기말 학습 기록이 없습니다. 학생 화면에 ‘동기화 완료’가 표시된 뒤 새로고침해 주세요.'));
  const modes=el('section','teacher-mode-cards');for(const [key,label] of Object.entries(modeLabels)){const m=model.modes[key],b=el('button','teacher-mode-card');b.type='button';b.dataset.teacherMode=key;b.setAttribute('aria-pressed',String(view===key));b.append(el('strong','',label),el('span','',m.completed+' / '+m.sets+'세트 풀이 완료'),el('b','teacher-rate',pct(m.score,m.max)),el('small','','최근 완료 회차의 첫 풀이 '+m.score+' / '+m.max+'점 · 복습 후에도 최초 점수 유지'));b.onclick=()=>{view=key;draw();};modes.appendChild(b);}wrap.appendChild(modes);
  if(dailyAdmin)wrap.append(dailyAdmin.element);
  const section=el('section','teacher-section');section.appendChild(el('h2','',modeLabels[view]+' · 세트별 진행'));
  const filters=el('div','teacher-filters');for(const [value,label] of [['all','전체'],['active','풀이·복습 중'],['review','복습 필요'],['done','오답까지 완료'],['untouched','미시작']]){const b=el('button','',label);b.type='button';b.dataset.teacherFilter=value;b.setAttribute('aria-pressed',String(stateFilter===value));b.onclick=()=>{stateFilter=value;draw();};filters.appendChild(b);}section.appendChild(filters);
  const tableScroll=el('div','teacher-table-scroll'),table=el('table','teacher-table'),head=el('thead'),hr=el('tr');for(const title of ['학습 묶음','상태','채점 진행','완료 회차 점수','남은 복습'])hr.appendChild(el('th','',title));head.appendChild(hr);table.appendChild(head);const body=el('tbody');
  const rows=model.sets.filter(s=>s.mode===view).filter(s=>stateFilter==='all'||stateFilter==='active'&&s.active||stateFilter==='review'&&s.waiting||stateFilter==='done'&&s.mastered||stateFilter==='untouched'&&s.state==='untouched');
  for(const set of rows){const row=el('tr');row.dataset.teacherSet=set.id;const title=el('td','',set.group+' · '+set.name);const state=el('td');state.appendChild(badge(stateLabels[set.state],set.waiting?'evidence':set.mastered?'correct':''));if(set.active?.activeQuestion?.readingRef)state.appendChild(el('small','teacher-phase',Number(set.active.activeQuestion.readingRef.slice(1))+'문단 사전 읽기 · 시간 제한 없음'));if(set.active?.activeQuestion?.evidence)state.appendChild(el('small','teacher-phase',set.active.activeQuestion.evidence.paused?'근거 해설 읽기 · 시간 멈춤':'근거 선택 중'));
   row.appendChild(title);for(const [label,cell] of [['상태',state],['채점 진행',el('td','',(set.active?set.answered:set.completed?set.total:0)+' / '+set.total)],['완료 회차 점수',el('td','',set.last?set.last.score+' / '+set.last.max+' · '+pct(set.last.score,set.last.max):'—')],['남은 복습',el('td','',set.waiting?set.waiting+'문항':'—')]]){cell.dataset.label=label;row.appendChild(cell);}body.appendChild(row);
  }if(!rows.length){const row=el('tr'),cell=el('td','teacher-empty','조건에 맞는 세트가 없습니다.');cell.colSpan=5;row.appendChild(cell);body.appendChild(row);}table.appendChild(body);tableScroll.appendChild(table);section.appendChild(tableScroll);wrap.appendChild(section);
  const wrongSection=el('section','teacher-section');wrongSection.id='teacher-wrongs';wrongSection.appendChild(el('h2','','남은 오답 · '+model.remaining+'문항'));if(!model.wrongs.length)wrongSection.appendChild(el('p','teacher-empty',model.unknownReviewCount?'복습 대기는 있지만 문항별 상세가 없는 기록이 있습니다. 세트별 진행에서 확인해 주세요.':'현재 남아 있는 기말 오답이 없습니다.'));
  for(const wrong of model.wrongs){const d=el('details','teacher-wrong');d.dataset.teacherQuestion=wrong.qid;d.dataset.detailId='wrong:'+wrong.qid;const summary=el('summary');summary.append(el('strong','',wrong.qid+' · '+wrong.question));if(wrong.answerWrong)summary.appendChild(badge('문제 답 오답','answer'));if(wrong.evidenceWrong)summary.appendChild(badge('근거 오답','evidence'));if(wrong.corrected)summary.appendChild(badge('해설 후 정정 · 오답 유지','corrected'));d.appendChild(summary);d.append(el('p','',wrong.contexts.map(c=>modeLabels[c.mode]+' · '+c.setName).join(' / ')),el('p','','정답: '+wrong.answer));for(const id of wrong.valid){const sentence=catalog.sentences[id];if(sentence)d.append(el('small','',sentence.source),el('blockquote','',sentence.text));}wrongSection.appendChild(d);}wrap.appendChild(wrongSection);
  }
  if(logsPage){
  const recent=el('section','teacher-section');recent.id='teacher-activity';recent.appendChild(el('h2','','최근 풀이'));if(!model.activity.length)recent.appendChild(el('p','teacher-empty','아직 확인할 풀이가 없습니다.'));
  for(const log of model.activity.slice(0,20)){const d=el('details','teacher-activity-row');d.dataset.activityKind=log.detail.kind;d.dataset.detailId='activity:'+log.setId+':'+log.qid+':'+log.at+':'+log.review;const summary=el('summary');summary.append(el('time','',date(log.atMs)),badge(log.review?'오답 복습':'일반 풀이',log.review?'corrected':''),badge(log.detail.kind==='evidence'?'근거 오답':log.detail.kind==='answer'?'문제 답 오답':'정답',log.detail.kind),el('span','',log.qid+' · '+log.setName));if(log.archived)summary.appendChild(badge('개편 전 문항 기록'));if(log.detail.corrected)summary.appendChild(badge('해설 후 정정','corrected'));d.append(summary,logDetail(log,model));recent.appendChild(d);}wrap.appendChild(recent);
  const rounds=el('section','teacher-section');rounds.append(el('h2','','세트별 답변 기록'));
  for(const set of model.sets){
   const normal=set.report.normal?.logs||[],review=set.report.review?.logs||[];
   if(!normal.length&&!review.length)continue;
   const detail=el('details','teacher-set-detail');detail.dataset.detailId='set:'+set.id;
   detail.append(el('summary','',set.group+' · '+set.name));
   for(const log of normal)detail.append(logDetail(log,model));
   if(review.length){
    const reviewDetail=el('details');reviewDetail.append(el('summary','','최근 오답 복습 결과'));
    for(const log of review)reviewDetail.append(logDetail(log,model));
    detail.append(reviewDetail);
   }
   rounds.append(detail);
  }
  if(rounds.children.length===1)rounds.append(el('p','teacher-empty','저장된 세트 답변 기록이 없습니다.'));
  wrap.append(rounds);
  }
  wrap.appendChild(el('footer','teacher-footer','조회 화면에서는 학생의 기록을 변경하지 않습니다. 오프라인에서 푼 내용은 학생 기기가 인터넷에 연결되어 동기화된 뒤 표시됩니다.'));
  if(preserve){root.querySelectorAll('details[data-detail-id]').forEach(n=>{if(opened.has(n.dataset.detailId))n.open=true;});global.scrollTo(0,scroll);}
  global.homeworkTeacher={refresh,model:()=>global.HomeworkTeacherModel.build(records,catalog,history),status:()=>({busy,lastRead,revision,connected:!!session})};
 }
 if(!catalog||!url){drawLogin('학습 자료 또는 기록 연결 주소가 없습니다. 최신 파일로 다시 열어 주세요.');return;}
 let adminEntry=false;try{adminEntry=global.sessionStorage.getItem('homework_teacher_entry_v1')==='1';global.sessionStorage.removeItem('homework_teacher_entry_v1');}catch(_){}
 if(session||adminEntry){root.replaceChildren(el('p','teacher-loading','학습 현황을 불러오는 중입니다.'));try{await login();draw();start();}catch(e){drawLogin(errorText(e));}}else drawLogin();
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&session)void refresh();});global.addEventListener('online',()=>{if(session)void refresh();});
 return {refresh};
}
global.HomeworkTeacher={mount};
const boot=()=>{const root=document.getElementById('app');if(document.body?.dataset.page==='teacher'&&root&&!root.dataset.teacherMounted)void mount(root);};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window);
