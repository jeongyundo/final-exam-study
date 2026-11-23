/* 자동 생성: scripts/build-runtime.py. 수정은 각 원본 파일에서 합니다. */
/* A new exam has its own progress keys; prior exam data cannot recreate review obligations. */
(function(global){
'use strict';
const term={id:'final2026',label:'2학기 기말고사',page:'units-final2026',storagePrefix:'practice_units_final2026_',activeUnits:['2-2','3-1','3-2','5-2','6-1','6-2'],examSteps:['2-2','3-1','3-2','5-2','6-1','6-2']};
const retired=value=>String(value||'').includes('unit22-method-');
term.acceptsKey=key=>key==='homework_adventure_v1'||String(key).startsWith(term.storagePrefix)&&!retired(key);
term.clearPreviousReviews=storage=>{
 let game;try{game=JSON.parse(storage.getItem('homework_adventure_v1')||'null');}catch(_){}
 if(!game)return 0;
 const previous=Object.fromEntries(Object.entries(game.pendingReviews||{}).filter(([key,p])=>p?.page!==term.page||retired(key)||retired(p?.setId)));
 if(game.pending&&game.pending.page!==term.page)previous.legacy=game.pending;
 if(!Object.keys(previous).length)return 0;
 let archived={};try{archived=JSON.parse(storage.getItem('study_review_archive_final2026')||'{}');}catch(_){}
 storage.setItem('study_review_archive_final2026',JSON.stringify({...archived,...previous}));
 game.pendingReviews=Object.fromEntries(Object.entries(game.pendingReviews||{}).filter(([key,p])=>p?.page===term.page&&!retired(key)&&!retired(p?.setId)));
 if(game.pending?.page!==term.page)delete game.pending;
 storage.setItem('homework_adventure_v1',JSON.stringify(game));return Object.keys(previous).length;
};
global.HomeworkStudyTerm=term;
})(typeof window==='undefined'?globalThis:window);

;
/* 숙제 페이지가 공유하는 화면 구조입니다. */
window.HOMEWORK_SHELL = "<div class=\"wrap\">\n  <nav class=\"page-nav\" aria-label=\"학습 페이지\">\n    <a href=\"index.html\" data-page-link=\"legacy\">기존 숙제</a>\n    <a href=\"development.html\" data-page-link=\"development\">내용 전개 방식</a>\n    <a href=\"traps.html\" data-page-link=\"traps\">선지 변형 유형</a>\n    <a href=\"advanced.html\" data-page-link=\"advanced\">고급 혼합 문제</a>\n  </nav>\n  <div class=\"timer-setting\" hidden>\n    <strong>⏱ 문제당 30초 제한</strong>\n    <span id=\"time-limit-state\" aria-live=\"polite\"></span>\n    <small id=\"timer-description\"></small>\n  </div>\n\n  <!-- 시작 -->\n  <div class=\"screen on\" id=\"scr-start\">\n    <header>\n      <h1 class=\"serif\" id=\"page-title\"></h1>\n      <p id=\"page-intro\"></p>\n      <div class=\"uid\">학생 코드 <b id=\"uid\"></b> <span style=\"margin-left:6px\">— IQ0VMU와 HJ98I1은 같은 학생 코드로 기록됩니다</span></div>\n      <div class=\"sync syncbox\" style=\"margin-top:6px\"></div>\n      <div style=\"margin-top:10px\"><button class=\"act ghost\" id=\"diag\" style=\"font-size:13px;padding:7px 12px\">전송 점검</button>\n        <pre id=\"diag-out\" style=\"display:none;margin:8px 0 0;padding:10px 12px;background:#fff;border:1px solid var(--line);border-radius:var(--radius);font-size:12.5px;white-space:pre-wrap;line-height:1.5\"></pre></div>\n    </header>\n    <section id=\"practice-links\" class=\"practice-links\" aria-label=\"새 유형별 연습\"></section>\n    <div id=\"practice-filters\" class=\"practice-filters\" hidden></div>\n    <div class=\"sets\" id=\"sets\"></div>\n  </div>\n\n  <!-- 풀이 -->\n  <div class=\"screen\" id=\"scr-q\">\n    <div class=\"top\">\n      <span class=\"part\" id=\"q-part\"></span>\n      <span class=\"cnt\" id=\"q-cnt\" aria-live=\"polite\"></span>\n      <span class=\"timer\" id=\"q-timer\">0초</span>\n    </div>\n    <div class=\"prog\"><i id=\"q-prog\"></i></div>\n    <div id=\"q-body\"></div>\n    <div class=\"fb\" id=\"q-fb\" aria-live=\"polite\"></div>\n    <div class=\"row-act\">\n      <button class=\"act ghost\" id=\"q-quit\">그만두기</button>\n      <button class=\"act primary\" id=\"q-check\" style=\"display:none\">확인</button>\n      <button class=\"act primary\" id=\"q-next\" style=\"display:none\">다음</button>\n    </div>\n  </div>\n\n  <!-- 결과 -->\n  <div class=\"screen\" id=\"scr-end\">\n    <header>\n      <h1 class=\"serif\" id=\"e-title\"></h1>\n      <p id=\"e-sub\"></p>\n    </header>\n    <div class=\"result\">\n      <h2>결과</h2>\n      <div class=\"score serif\"><span id=\"e-score\"></span><small id=\"e-max\"></small></div>\n      <div class=\"meta\" id=\"e-meta\"></div>\n      <div class=\"rows\" id=\"e-rows\"></div>\n    </div>\n    <div class=\"wrongs\" id=\"e-wrongs\"></div>\n    <div class=\"sync syncbox\" id=\"e-sync\"></div>\n    <div class=\"row-act\">\n      <button class=\"act primary\" id=\"e-retry\" style=\"display:none\">오답 다시 풀기</button>\n      <button class=\"act ghost\" id=\"e-resend\">기록 다시 보내기</button>\n      <button class=\"act ghost\" id=\"e-home\">처음으로</button>\n      <button class=\"act primary\" id=\"e-again\">같은 세트 다시 풀기</button>\n    </div>\n  </div>\n\n</div>";

;
/* Code.gs와 호환되는 기록 전송. 페이지별 큐와 전송 주소를 분리합니다. */
(function (global) {
  'use strict';
  function isEndpoint(value) {
    try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch (_) { return false; }
  }
  function create(options) {
    const storage = options.storage || global.localStorage;
    const key = options.key;
    const prefix = key + ':item:';
    const endpoint = String(options.sheetUrl || '').trim();
    const fetcher = options.fetch || global.fetch.bind(global);
    const notify = options.onChange || (() => {});
    const normalize = options.normalizeUid || (value => value);
    let flushing = false, retryTimer = null, backoff = 0, lastError = '', storageError = '';
    const parsedEntries=new Map();
    const newId = () => options.uid + '-' + (global.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
    function save(entry) {
      try { storage.setItem(prefix + entry.row.rid, JSON.stringify(entry)); storageError = ''; }
      catch (error) { storageError = '기기에 기록을 저장하지 못했습니다. 저장 공간과 브라우저 설정을 확인해 주세요.'; notify(); throw error; }
    }
    // Move an existing array queue only after every row has been durably written.
    const legacy = JSON.parse(storage.getItem(key) || '[]');
    if (Array.isArray(legacy) && legacy.length) {
      legacy.forEach(row => save({ destination: isEndpoint(endpoint) ? endpoint : null,
        row: { ...row, uid: normalize(row.uid || options.uid), rid: row.rid || newId() } }));
      storage.removeItem(key);
    }
    function entries(sorted=true) {
      const result = [];
      // A separate storage key per record prevents one tab's append from erasing another's.
      for (let i = 0; i < storage.length; i++) {
        const name = storage.key(i);
        if (!name || !name.startsWith(prefix)) continue;
        try {
          const raw=storage.getItem(name),cached=parsedEntries.get(name);
          const entry=cached?.raw===raw?cached.entry:JSON.parse(raw);
          parsedEntries.set(name,{raw,entry});
          if (entry?.row?.rid) result.push(entry);
        } catch (_) { /* A damaged row stays on the device for recovery. */ }
      }
      return sorted?result.sort((a, b) => String(a.row.at || a.row.endedAt || '').localeCompare(String(b.row.at || b.row.endedAt || ''))):result;
    }
    function state() {
      const pending = entries(false);
      return { pending: pending.length, configured: isEndpoint(endpoint), lastError, storageError,
        waitingForSetup: pending.filter(entry => !isEndpoint(entry.destination || endpoint)).length };
    }
    function readRows() { return entries().map(entry => entry.row); }
    function enqueue(payload) {
      const row = { ...payload, uid: normalize(payload.uid || options.uid), rid: payload.rid || newId() };
      save({ destination: isEndpoint(endpoint) ? endpoint : null, row });
      notify(); void flush(); return row;
    }
    function batch() {
      const available = entries().filter(entry => isEndpoint(entry.destination || endpoint));
      if (!available.length) return null;
      const destination = available[0].destination || endpoint;
      const selected = available.filter(entry => (entry.destination || endpoint) === destination).slice(0, 60);
      selected.forEach(entry => {
        if (!entry.destination) { entry.destination = destination; save(entry); }
      });
      return { destination, selected };
    }
    async function send() {
      let next;
      while ((next = batch())) {
        const response = await fetcher(next.destination, { method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ kind: 'batch', rows: next.selected.map(entry => entry.row) }) });
        const ack = (await response.text()).trim();
        if (response.ok === false || !/^ok(?:\s|$)/.test(ack)) throw new Error(ack.slice(0, 100) || '수신 확인 없음');
        // Unacknowledged records, including beacons, always stay in storage.
        next.selected.forEach(entry => {const name=prefix+entry.row.rid;storage.removeItem(name);parsedEntries.delete(name);});
        lastError = ''; backoff = 0; notify();
      }
    }
    async function flush() {
      if(global.navigator?.onLine===false)return;
      if (flushing) return;
      flushing = true;
      try {
        if (global.navigator?.locks?.request) {
          await global.navigator.locks.request('homework:' + key, { ifAvailable: true }, async lock => { if (lock) await send(); });
        } else await send();
        lastError = ''; backoff = 0;
        if (retryTimer) { global.clearTimeout(retryTimer); retryTimer = null; }
      } catch (error) {
        lastError = String(error.message || error);
        backoff = Math.min(backoff ? backoff * 2 : 3000, 60000);
        if (!retryTimer && options.autoStart !== false) retryTimer = global.setTimeout(() => { retryTimer = null; void flush(); }, backoff);
      } finally { flushing = false; notify(); }
    }
    function beacon() {
      if(global.navigator?.onLine===false)return;
      if (!global.navigator?.sendBeacon) return;
      const next = batch(); if (!next) return;
      try { global.navigator.sendBeacon(next.destination, new Blob([JSON.stringify({ kind: 'batch', rows: next.selected.map(entry => entry.row) })], { type: 'text/plain;charset=utf-8' })); }
      catch (_) { /* No acknowledgement: leave every row queued. */ }
    }
    if (options.autoStart !== false) {
      global.addEventListener('online', flush);
      global.addEventListener('pagehide', beacon);
      global.addEventListener('storage', event => { if (event.key?.startsWith(prefix)) { notify(); void flush(); } });
      global.document.addEventListener('visibilitychange', () => { if (global.document.visibilityState === 'hidden') beacon(); else void flush(); });
      global.setInterval(flush, 20000);
    }
    return { enqueue, flush, beacon, state, readRows };
  }
  global.HomeworkSync = { create, isEndpoint };
})(window);

;
/* 문제 내용은 data/exam-bank.js 한 곳에서 관리합니다. */
(function (global) {
  'use strict';
  const definitions = {
    development: { field: 'method', prefix: 'development', label: '내용 전개 방식',
      categories: ['정의', '분석', '비교와 대조', '분류와 구분', '예시', '서사', '인과', '과정'] },
    traps: { field: 'trap', prefix: 'traps', label: '선지 변형 유형',
      categories: ['반의어', '인과', '순서', '비교', '조건', '주체', '정도', '비유의 사실화'] }
  };
  function build(bank, page) {
    const definition = definitions[page];
    if (!definition) throw new Error('알 수 없는 연습 페이지입니다.');
    const sets = [];
    definition.categories.forEach((category, categoryIndex) => {
      const units = bank.units.filter(unit => unit[definition.field] === category);
      // A unit stays together: two OX items and one multiple-choice item per batch.
      for (let offset = 0; offset < units.length; offset += 8) {
        const group = units.slice(offset, offset + 8), batch = offset / 8 + 1;
        ['기본', '심화'].forEach(level => {
          const parts = group.map(unit => ({ name: unit.id + ' · ' + unit.title,
            items: unit.questions.filter(question => question.level === level).map(question => {
              const sources = unit.refs.map(id => bank.sources[id]);
              const item = { id: question.id, type: question.type, paragraphCount:sources.length,
                sourceLabel: sources.map(source => '「' + source.title + '」 ' + source.label).join(' / '),
                passage: sources.map(source => '[' + source.title + ' · ' + source.label + ']\n' + source.text).join('\n\n'),
                referenceMode: 'visible',
                evidence: {title:unit.title, statement:unit.questions[0].prompt, explanation:unit.questions[0].explanation, valid:bank.evidence[unit.id], sources:unit.refs.map(id=>({id, title:bank.sources[id].title, label:bank.sources[id].label, sentences:bank.sentenceSources[id]}))},
                disableAutoFocus: true,
                answer: question.answer, why: question.explanation,
                claimEdits:global.HOMEWORK_CORRECTIONS?.[question.id]?.claim||[] };
              if(question.type==='mc')item.choiceReviews=Object.fromEntries(question.options.map(option=>[option,{reason:question.explanation,edits:global.HOMEWORK_CORRECTIONS?.[question.id]?.choices?.[option]||[]}]));
              if (question.type === 'ox') { item.ask = '지문 내용과 일치하면 O, 일치하지 않으면 X를 고르세요.'; item.changed = question.prompt; }
              else { item.sent = question.prompt; item.options = [...question.options]; }
              return item;
            }) }));
          sets.push({ id: definition.prefix + '-c' + (categoryIndex + 1) + '-' + (level === '기본' ? 'basic' : 'advanced') + '-' + batch,
            cat: category, group: definition.label + ' · ' + category,
            name: level + ' ' + batch, level, category, batch, revision: bank.version || 1,
            desc: (level === '기본' ? 'OX' : '내신 5지선다') + ' · 출제 내용 ' + group.length + '개',
            shuffleQuestions: true, timedMode: level === '심화' ? 'overall' : 'none', parts });
        });
      }
    });
    return { sets, categories: definition.categories };
  }
  global.HomeworkExamSets = { build };
})(window);

;
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

;
/* Shared by the browser and the separate Apps Script server. No credentials live here. */
var HomeworkStudentStateCore=(function(){
'use strict';
const clone=x=>JSON.parse(JSON.stringify(x));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function allowedKey(key){return typeof key==='string'&&key.length<500&&key!=='bib_uid'&&key!=='__proto__'&&(/^(bib_|practice_(units|development|traps|advanced)_)/.test(key)||['homework_adventure_v1','student_history_v1'].includes(key))&&!/queue(?::|$)/.test(key);}
function empty(){return {version:1,revision:0,records:{},receipts:{},aliases:['IQ0VMU','HJ98I1']};}
function seen(ranges,n){return ranges.some(r=>n>=r[0]&&n<=r[1]);}
function remember(ranges,n){const all=[...ranges,[n,n]].sort((a,b)=>a[0]-b[0]),out=[];for(const r of all){const last=out[out.length-1];if(last&&r[0]<=last[1]+1)last[1]=Math.max(last[1],r[1]);else out.push([...r]);}return out;}
function mergeGame(base,local,remote){
 if(!base||!local||!remote)return null;
 const out={...clone(remote),credited:{...remote.credited,...local.credited},combos:{...remote.combos,...local.combos},records:{...remote.records},pendingReviews:{...remote.pendingReviews}};
 let duplicateXp=0,duplicateHints=0,localChests=0,newChests=0;
 for(const key of Object.keys(local.credited||{}))if(!base.credited?.[key]&&remote.credited?.[key])duplicateXp+=10;
 for(const key of Object.keys(local.combos||{}))if(!base.combos?.[key]&&remote.combos?.[key])duplicateHints++;
 for(const [key,r] of Object.entries(local.records||{})){
  const b=base.records?.[key]||{},s=remote.records?.[key]||{};
  localChests+=Math.max(0,(r.tier||0)-(b.tier||0));newChests+=Math.max(0,(r.tier||0)-(s.tier||0));
  out.records[key]={...s,...r,tier:Math.max(r.tier||0,s.tier||0),best:Math.max(r.best||0,s.best||0),mastered:!!(r.mastered||s.mastered)};
 }
 for(const key of new Set([...Object.keys(base.pendingReviews||{}),...Object.keys(local.pendingReviews||{})])){
  const b=base.pendingReviews?.[key],l=local.pendingReviews?.[key],r=remote.pendingReviews?.[key];
  if(same(b,l))continue;
  if(!same(b,r)&&!same(l,r))return null;
  if(l)out.pendingReviews[key]=clone(l);else delete out.pendingReviews[key];
 }
 for(const field of ['xp','hints','time','chests']){
  const adjustment=field==='xp'?duplicateXp:field==='hints'?duplicateHints:field==='chests'?localChests-newChests:0;
  const value=(remote[field]||0)+(local[field]||0)-(base[field]||0)-adjustment;
  if(!Number.isSafeInteger(value)||value<0)return null;out[field]=value;
 }
 if(local.sound!==base.sound)out.sound=local.sound;
 return out;
}
function apply(state,device,operations){
 if(!/^[a-zA-Z0-9_-]{8,100}$/.test(device))throw Error('INVALID_DEVICE');
 const accepted=[],conflicts=[];state.receipts[device]=state.receipts[device]||[];
 for(const op of operations){
  if(!Number.isSafeInteger(op.seq)||op.seq<1||!allowedKey(op.key)||(op.value!==null&&typeof op.value!=='string')||(op.value||'').length>2000000)throw Error('INVALID_OPERATION');
  if(seen(state.receipts[device],op.seq)){accepted.push(op.seq);continue;}
  const current=state.records[op.key],version=current?.version||0;
  let value=op.value;
  if(op.seed&&current){/* New-device imports never replace existing cloud progress. */}
  else if(op.expected!==version){
   if(op.key==='homework_adventure_v1'&&op.base&&current?.value&&value){
    let merged;try{merged=mergeGame(JSON.parse(op.base),JSON.parse(value),JSON.parse(current.value));}catch(_){}
    if(!merged){conflicts.push(op.key);continue;}value=JSON.stringify(merged);
    state.records[op.key]={value,version:++state.revision,at:Date.now()};
   }else{conflicts.push(op.key);continue;}
  }else state.records[op.key]={value,version:++state.revision,at:Date.now()};
  state.receipts[device]=remember(state.receipts[device],op.seq);accepted.push(op.seq);
 }
 return {accepted,conflicts:[...new Set(conflicts)],revision:state.revision,records:state.records};
}
return {allowedKey,empty,apply,mergeGame};
})();

(function(global){
'use strict';
function create(options){
 const raw=options.raw,uid=options.uid,prefix='student:'+uid+':data:',metaKey='student:'+uid+':sync',core=HomeworkStudentStateCore;
 const syncKey=key=>core.allowedKey(key)&&key!=='student_history_v1'&&!key.startsWith('practice_units_migrated_')&&(!options.keyFilter||options.keyFilter(key));
 const freshGame=()=>({version:1,xp:0,hints:2,time:1,chests:0,records:{},credited:{},combos:{},pendingReviews:{},sound:false});
 function importGame(local,remote){
  const merged={...remote,credited:{...remote.credited,...local.credited},combos:{...remote.combos,...local.combos},records:{...remote.records},pendingReviews:{...remote.pendingReviews},xp:Math.max(local.xp||0,remote.xp||0)};
  const earned=g=>(g.xp||0)>0||Object.keys(g.credited||{}).length>0||Object.values(g.records||{}).some(r=>r.tier>0);
  if(!earned(remote))for(const key of ['hints','time','chests'])merged[key]=earned(local)?local[key]??remote[key]:Math.min(local[key]??remote[key],remote[key]);
  for(const [key,record] of Object.entries(local.records||{})){const r=remote.records?.[key]||{};merged.records[key]={...r,...record,tier:Math.max(r.tier||0,record.tier||0),best:Math.max(r.best||0,record.best||0),mastered:!!(r.mastered||record.mastered)};}
  for(const [key,review] of Object.entries(local.pendingReviews||{}))if(!remote.records?.[key]&&!remote.pendingReviews?.[key])merged.pendingReviews[key]=review;
  return merged;
 }
 let meta;try{meta=JSON.parse(raw.getItem(metaKey)||'null');}catch(_){}
 meta=meta?.version===1?meta:{version:1,device:('d_'+(global.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2))).replace(/[^a-zA-Z0-9_-]/g,''),seq:0,known:{},pending:{},deferred:{},conflicts:[]};
 // Raw legacy history stays on this device; synchronize reconstructed progress only.
 // Migration markers belong to the device so another device can still import its old work.
 for(const bucket of ['known','pending','deferred'])for(const key of Object.keys(meta[bucket]))if(!syncKey(key)){if(key.startsWith('practice_units_migrated_'))raw.removeItem(prefix+key);delete meta[bucket][key];}
 meta.conflicts=meta.conflicts.filter(syncKey);
 let busy=false,online=false,lastError='',timer=null,stopped=false;
 let saveQueued=false;
 const persist=()=>{saveQueued=false;raw.setItem(metaKey,JSON.stringify(meta));};
 const save=()=>{if(!global.queueMicrotask){persist();return;}if(saveQueued)return;saveQueued=true;global.queueMicrotask(persist);};
 const notify=()=>options.onChange?.(status());
 let cachedKeys=null,cachedRawLength=-1;
 const invalidateKeys=()=>{cachedKeys=null;};
 global.addEventListener?.('storage',invalidateKeys);
 function keys(){const length=raw.length;if(cachedKeys&&length===cachedRawLength)return cachedKeys;const result=[];for(let i=0;i<length;i++){const k=raw.key(i);if(k?.startsWith(prefix))result.push(k.slice(prefix.length));}cachedRawLength=length;return cachedKeys=result;}
 function change(key,value,seed=false){
  if(!syncKey(key))return;
  const base=meta.known[key];meta.pending[key]={seq:++meta.seq,key,value,expected:base?.version||0,base:key==='homework_adventure_v1'?base?.value||(meta.legacyGameImport?null:JSON.stringify(freshGame())):undefined,seed};save();options.onDirty?.();notify();
 }
 const storage={get length(){return keys().length;},key:i=>keys()[i]??null,getItem:k=>raw.getItem(prefix+k),
  setItem(k,v){v=String(v);if(this.getItem(k)===v)return;raw.setItem(prefix+k,v);invalidateKeys();change(k,v);},
  removeItem(k){const old=this.getItem(k);if(old===null)return;raw.removeItem(prefix+k);invalidateKeys();if(/queue(?::|$)/.test(k)&&raw.getItem(k)===old)raw.removeItem(k);change(k,null);},
  clear(){keys().forEach(k=>this.removeItem(k));}};
 function seed(){for(const key of keys())if(syncKey(key)&&!meta.known[key]&&!meta.pending[key]){if(key==='homework_adventure_v1')meta.legacyGameImport=true;change(key,storage.getItem(key),true);}}
 function importLocal(){
  const original=[];for(let i=0;i<raw.length;i++){const key=raw.key(i);if(core.allowedKey(key)||/^(bib_|practice_(units|development|traps|advanced)_)queue(?::|$)/.test(key))original.push(key);}
  for(const key of original){
   if(options.keyFilter&&!options.keyFilter(key))continue;
   // A known or queued deletion is intentional; never re-import its legacy snapshot.
   if(storage.getItem(key)==null&&!meta.known[key]&&!meta.pending[key]&&!meta.deferred[key]){invalidateKeys();if(key==='homework_adventure_v1')meta.legacyGameImport=true;raw.setItem(prefix+key,raw.getItem(key));change(key,raw.getItem(key),true);}
   if(/queue(?::|$)/.test(key)&&raw.getItem(key)===storage.getItem(key))raw.removeItem(key);
  }
  seed();
 }
 function writeRemote(key,record){
  invalidateKeys();
  if(record.value===null)raw.removeItem(prefix+key);else if(storage.getItem(key)!==record.value)raw.setItem(prefix+key,record.value);
  meta.known[key]=record;delete meta.deferred[key];
 }
 function receive(response,sent=[]){
  const accepted=new Set(response.accepted||[]),sentByKey=new Map(sent.map(o=>[o.key,o]));let changed=false;
  for(const [key,record] of Object.entries(response.records||{})){
   if(!syncKey(key))continue;
   let pending=meta.pending[key],previous=sentByKey.get(key);
   const initialImport=!previous||!accepted.has(previous.seq)||(previous.seed&&record.value!==previous.value);
   if(initialImport&&key==='homework_adventure_v1'&&pending?.expected===0&&!meta.known[key]&&record.value&&pending.value){
    const local=JSON.parse(pending.value),remote=JSON.parse(record.value);
    const merged=meta.legacyGameImport?importGame(local,remote):core.mergeGame(freshGame(),local,remote);
    if(merged){
     const value=JSON.stringify(merged);meta.known[key]=record;raw.setItem(prefix+key,value);meta.legacyGameImport=false;previous=null;changed=true;
     if(value===record.value){delete meta.pending[key];pending=null;}
     else{pending={seq:++meta.seq,key,value,expected:record.version,base:record.value,seed:false};meta.pending[key]=pending;}
    }
   }
   if(pending&&accepted.has(pending.seq)){delete meta.pending[key];pending=null;}
   else if(pending?.seed&&!previous){delete meta.pending[key];pending=null;}
   else if(pending&&previous&&accepted.has(previous.seq)){
    if(key==='homework_adventure_v1'&&previous.value&&record.value&&pending.value){
     const rebased=core.mergeGame(JSON.parse(previous.value),JSON.parse(pending.value),JSON.parse(record.value));
     if(rebased){pending.value=JSON.stringify(rebased);raw.setItem(prefix+key,pending.value);}
    }
    pending.expected=record.version;pending.base=key==='homework_adventure_v1'?record.value:undefined;pending.seed=false;
    meta.known[key]=record;
   }
   if(pending){meta.deferred[key]=record;continue;}
   if(options.isActive?.()&&key!=='homework_adventure_v1'){
    if(storage.getItem(key)===record.value){meta.known[key]=record;delete meta.deferred[key];}else meta.deferred[key]=record;
    continue;
   }
   if((meta.known[key]?.version||0)!==record.version||storage.getItem(key)!==record.value){writeRemote(key,record);changed=true;}
  }
  meta.revision=response.revision??meta.revision??0;meta.conflicts=(response.conflicts||[]).filter(key=>meta.pending[key]);online=true;lastError='';save();notify();if(changed)options.onRemote?.();
 }
 function applyDeferred(){
  if(options.isActive?.())return;
  let changed=false;for(const [key,record] of Object.entries(meta.deferred))if(!meta.pending[key]){writeRemote(key,record);changed=true;}
  save();if(changed)options.onRemote?.();
 }
 async function flush(){
  persist();
  if(busy||stopped||!options.request)return;busy=true;
  try{
   applyDeferred();
   for(let batch=0;batch<6;batch++){
    const sent=Object.values(meta.pending).sort((a,b)=>Number(a.key.includes('_migrated_'))-Number(b.key.includes('_migrated_'))||a.seq-b.seq).slice(0,100);
    const response=await options.request({action:'sync',deviceId:meta.device,revision:meta.revision??0,operations:sent});
    if(response.ok!==true)throw Error(response.error||'SYNC_FAILED');receive(response,sent);
    if(!sent.length||!Object.keys(meta.pending).length||meta.conflicts.length)break;
   }
  }catch(error){online=false;lastError=error.message||String(error);notify();}
  finally{busy=false;notify();}
 }
 function status(){return {online,busy,pending:Object.keys(meta.pending).length,conflicts:[...meta.conflicts],lastError,configured:!!options.request};}
 function useCloud(){
  if(options.isActive?.())return false;
  const copy={};for(const key of meta.conflicts){const op=meta.pending[key],record=meta.deferred[key];if(!record)continue;copy[key]=op.value;delete meta.pending[key];writeRemote(key,record);}
  if(Object.keys(copy).length)raw.setItem('student:'+uid+':conflict-backup:'+Date.now(),JSON.stringify(copy));
  meta.conflicts=[];save();applyDeferred();options.onRemote?.();notify();return true;
 }
 function start(){if(timer)return;stopped=false;timer=global.setInterval(flush,15000);global.addEventListener?.('online',flush);void flush();}
 function stop(){stopped=true;global.clearInterval(timer);timer=null;global.removeEventListener?.('online',flush);}
 return {storage,importLocal,seed,receive,flush,status,useCloud,start,stop};
}
global.HomeworkStudentState={create,core:HomeworkStudentStateCore};
})(typeof window==='undefined'?globalThis:window);

;
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

;
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
   const form=node('form'),label=node('label','','학생 이름'),input=node('input');input.id='student-name';input.name='studentName';input.autocomplete='name';input.placeholder='이름';input.required=true;label.htmlFor=input.id;
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

;
/* 보상은 이 기기의 모든 학습 페이지에서 공유합니다. 시트의 채점 형식은 유지합니다. */
(function(global){
'use strict';
const KEY='homework_adventure_v1';
const fresh=()=>({version:1,hints:2,time:1,chests:0,xp:0,records:{},credited:{},combos:{},pendingReviews:{},sound:false});
function create(storage){
  let cachedRaw,cachedState;
  function read(copy=false){try{const raw=storage.getItem(KEY);
    if(!copy&&cachedState&&raw===cachedRaw)return cachedState;
    const s=JSON.parse(raw);if(s?.version===1){
    // Preserve the old single review while moving obligations into their own set keys.
    const {pending,...saved}=s;
    const state={...fresh(),...saved,pendingReviews:{...s.pendingReviews}};
    if(pending?.key&&!state.pendingReviews[pending.key])state.pendingReviews[pending.key]=pending;
    cachedRaw=raw;cachedState=state;return state;
  }}catch(_){}return fresh();}
  function write(s){const raw=JSON.stringify(s);storage.setItem(KEY,raw);cachedRaw=raw;cachedState=s;return s;}
  function change(fn){const s=read(true),result=fn(s);write(s);return result;}
  function settle(s,key,pct,progressRewards=false){
    const r=s.records[key]||{tier:0,best:0};
    const tier=progressRewards?(r.tier||0):pct>=100?3:pct>=80?2:pct>=60?1:0;
    const gained=Math.max(0,tier-r.tier);
    s.chests+=gained;r.tier=Math.max(tier,r.tier);r.best=Math.max(pct,r.best);r.mastered=true;s.records[key]=r;
    return gained;
  }
  return {
    state:read,
    stage(key,fraction){return change(s=>{
      const pct=Math.max(0,Math.min(100,Number(fraction)*100||0)),r=s.records[key]||{tier:0,best:0};
      const tier=pct+1e-9>=100?3:pct+1e-9>=85?2:pct+1e-9>=60?1:0,gained=Math.max(0,tier-(r.tier||0));
      s.chests+=gained;s.records[key]={...r,tier:Math.max(r.tier||0,tier),best:Math.max(r.best||0,pct),mastered:!!r.mastered||pct>=100};return {gained,tier:Math.max(r.tier||0,tier)};
    });},
    pending(key){return read().pendingReviews[key]||null;},
    reviews(page){return Object.values(read().pendingReviews).filter(p=>p.page===page);},
    reconcile(page,sets){return change(s=>{
      for(const [key,pending] of Object.entries(s.pendingReviews)){
        if(pending.page!==page)continue;
        const current=sets.find(set=>set.id===pending.setId);
        if(!current){delete s.pendingReviews[key];continue;}
        if(current.key!==key){
          delete s.pendingReviews[key];
          if(current.resetReviewOnRevision){s.archivedReviews={...s.archivedReviews,[key]:{...pending}};continue;}
          pending.key=current.key;pending.pct=0;s.pendingReviews[current.key]=pending;
        }
      }
    });},
    answer(key,id,ok,streak,retry){return change(s=>{
      let xp=0,bonus=false;
      if(!retry && !s.credited[key+'|'+id] && ok){s.credited[key+'|'+id]=true;s.xp+=10;xp=10;}
      if(!retry && ok && streak>0 && streak%3===0 && !s.combos[key+'|'+id]){s.combos[key+'|'+id]=true;s.hints++;bonus=true;}
      return {xp,bonus};
    });},
    finish(key,info){return change(s=>{
      const pending=s.pendingReviews[key];
      if(info.retry){
        if(!pending)return {gained:0,locked:info.wrong>0};
        pending.wrong=info.wrong;
        if(info.wrong)return {gained:0,locked:true};
        const pct=pending.pct;const gained=settle(s,key,pct,info.progressRewards);delete s.pendingReviews[key];return {gained,locked:false,pct};
      }
      if(pending)return {gained:0,locked:true,pct:pending.pct};
      const r=s.records[key]||{tier:0,best:0};r.best=Math.max(r.best,info.pct);s.records[key]=r;
      if(info.wrong){s.pendingReviews[key]={key,page:info.page,setId:info.setId,name:info.name,pct:info.pct,wrong:info.wrong};return {gained:0,locked:true};}
      return {gained:settle(s,key,info.pct,info.progressRewards),locked:false,pct:info.pct};
    });},
    use(kind){return change(s=>{if(!['hints','time'].includes(kind)||s[kind]<1)return false;s[kind]--;return true;});},
    open(random=Math.random){return change(s=>{
      if(s.chests<1)return null;s.chests--;
      const n=random();const prize=n<.5?{hints:2,time:0,label:'힌트권 2장'}:n<.85?{hints:1,time:1,label:'힌트권 1장 + 시간 연장권 1장'}:{hints:2,time:1,label:'희귀 보상! 힌트권 2장 + 시간 연장권 1장'};
      s.hints+=prize.hints;s.time+=prize.time;return prize;
    });},
    sound(value){return change(s=>s.sound=!!value);},
    progress(keys){const s=read();const done=keys.filter(k=>s.records[k]?.mastered).length;return {done,total:keys.length,pct:keys.length?Math.round(done/keys.length*100):0};}
  };
}
/* 문항별로 작성한 비교 안내를 먼저 사용합니다. */
function guide(q){
  if(q.hintGuide)return q.hintGuide;
  const prompt=[q.sent,q.ask,q.changed].filter(Boolean).join(' ');
  if(q.type==='vocabMatch')return '낱말의 뜻에서 핵심 표현을 찾고, 비슷해 보이는 다른 낱말과 구별해 연결하세요.';
  if(['drag','both','pair'].includes(q.type))return '실제로 말하려는 대상과 그 대상을 빗댄 대상을 구별하세요. 두 문장이 있으면 각각 먼저 판단하세요.';
  const negative=/적절하지|일치하지|옳지|타당하지|알맞지|아닌|잘못/.test(q.sent||'');
  const aim=negative?'일치하지 않는 선택지 하나를 찾으세요.':q.type==='ox'?'문장의 정보가 모두 맞는지 판단하세요.':'질문에 맞는 선택지를 고르세요.';
  // Some authored evidence titles are complete answers. Only reuse neutral topic labels.
  const topic=String(q.evidence?.title||'').trim(),neutral=topic&&!/[.!?。]|(?:이다|한다|준다|없다|있다|않다|해요|예요)$/.test(topic)&&!['한 가지 정보','정보 연결','조건 더하기','여러 정보 판단','문단 전체 종합'].includes(topic);
  let focusTask='';
  if(/공연용|공연 입장권/.test(prompt)&&!/주장|논거|입장료/.test(prompt))focusTask=/배포|오전|오후|줄/.test(prompt)?'입장권 배포 시각·공연 시각·줄을 서는 때를 나누어 비교하세요.':'입장권이 어느 시간 공연용인지 본문에서 찾아 비교하세요.';
  else if(/관심|책임|존경/.test(topic))focusTask='관심·책임·존경이 각각 상대의 무엇을 위한 태도인지 구별하세요.';
  else if(/사랑받|매력/.test(topic))focusTask='사랑하는 일과 사랑받는 일 중 무엇에 집중하는지 확인하세요.';
  else if(/과거|결혼/.test(topic))focusTask='누가 결혼을 결정하는지, 사랑을 언제 가꾼다고 보는지 시대별로 비교하세요.';
  else if(/격정|친밀감|설렘/.test(topic))focusTask='처음 느낀 감정과 시간이 지난 뒤의 감정이 같은지 확인하세요.';
  else if(/주는|주면|베푸|부자/.test(topic))focusTask='무엇을 주고, 그 행동이 상대와 자신에게 어떤 영향을 미치는지 확인하세요.';
  else if(/집착|욕망|소유|지배/.test(topic))focusTask='상대의 바람을 존중하는지, 자신의 욕망을 앞세우는지 구별하세요.';
  else if(/자율|독립|성숙/.test(topic))focusTask='상대와 관계를 맺을 때 자신의 삶과 독립성을 어떻게 다루는지 확인하세요.';
  else if(/인류|세계 전체|한 사람/.test(topic))focusTask='사랑의 대상이 어디까지 이어지는지 범위를 확인하세요.';
  else if(/기술|배울|배워|훈련|노력/.test(topic))focusTask='사랑을 배우는 일이 필요한지, 배움과 실천을 어떻게 연결하는지 확인하세요.';
  else if(/기쁨|슬픔|절망/.test(topic))focusTask='어떤 일이 일어났을 때 누구의 감정이 어떻게 달라지는지 확인하세요.';
  else if(/인과|원인|결과/.test(prompt)||(q.skills||[]).includes('인과'))focusTask='원인과 결과의 방향을 화살표로 정리해 보세요.';
  else if(/조건|경우|때에만|반드시/.test(prompt)||(q.skills||[]).includes('조건'))focusTask='주장이 성립하는 조건과 예외를 확인하세요.';
  else if(/비교|차이|공통/.test(prompt))focusTask='두 대상에 같은 비교 기준을 적용해 보세요.';
  else if(/순서|과정|단계/.test(prompt))focusTask='먼저 일어나는 일과 나중에 일어나는 일을 나누세요.';
  else focusTask='누가 무엇을 설명하는지 찾고, 문장에 추가된 조건을 비교하세요.';
  return (neutral?'‘'+topic+'’에 관한 부분을 읽어 보세요. ':'')+focusTask+' '+aim;
}
function evidenceIndex(q,sentences){
  const words=[q.sent,q.changed,q.why].filter(Boolean).join(' ').match(/[가-힣A-Za-z0-9]{2,}/g)||[];
  const scores=sentences.map(s=>words.reduce((n,w)=>n+(s.includes(w)?Math.min(w.length,8):0),0));
  return scores.length?scores.indexOf(Math.max(...scores)):-1;
}
global.HomeworkGame={create,guide,evidenceIndex,key:KEY};
})(window);

;
/* Author-specified expression edits. An incorrect choice is never replaced by the answer choice. */
(function(global){
'use strict';
const tokenize=text=>String(text).match(/\S+\s*|\s+/gu)||[];
function diff(before,after){
  const a=tokenize(before),b=tokenize(after),table=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
  for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)table[i][j]=a[i]===b[j]?1+table[i+1][j+1]:Math.max(table[i+1][j],table[i][j+1]);
  const pieces=[],push=(kind,text)=>{if(pieces.at(-1)?.kind===kind)pieces.at(-1).text+=text;else pieces.push({kind,text});};
  let i=0,j=0;
  while(i<a.length||j<b.length){
    if(i<a.length&&j<b.length&&a[i]===b[j]){push('same',a[i]);i++;j++;}
    else if(i<a.length&&(j===b.length||table[i+1][j]>=table[i][j+1]))push('remove',a[i++]);
    else push('add',b[j++]);
  }
  return pieces;
}
function parts(text,edits){
  const valid=[...(edits||[])].sort((a,b)=>a.start-b.start);
  if(!valid.length||valid.some((e,i)=>text.slice(e.start,e.end)!==e.before||e.end<=e.start||(i&&e.start<valid[i-1].end)))return [{kind:'same',text}];
  const result=[];let pos=0;
  for(const edit of valid){if(edit.start>pos)result.push({kind:'same',text:text.slice(pos,edit.start)});result.push(...diff(edit.before,edit.after));pos=edit.end;}
  if(pos<text.length)result.push({kind:'same',text:text.slice(pos)});return result;
}
function element(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;}
function correction(text,edits){
  const box=element('span','correction-diff');
  const pieces=parts(text,edits);const fixed=pieces.filter(p=>p.kind!=='remove').map(p=>p.text).join('');
  box.setAttribute('aria-label','원문: '+text+' / 표현을 고친 문장: '+fixed);
  pieces.forEach((piece,i)=>{const n=element(piece.kind==='remove'?'del':piece.kind==='add'?'ins':'span','diff-'+piece.kind,piece.text);n.style.setProperty('--reveal-delay',Math.min(i*35,220)+'ms');box.appendChild(n);});return box;
}
function paint(q,body){
  if(q.type==='mc'&&q.choiceReviews){
    const row=body.querySelector('.picks');if(!row)return;
    // Preserve the original numbering when the other options move into the disclosure.
    const buttons=Array.from(body.querySelectorAll('.pick'));
    const numbered=row.classList.contains('numbered')||row.dataset.reviewNumbered==='true';
    row.dataset.reviewNumbered=String(numbered);row.classList.remove('numbered');
    const rest=element('details','other-choice-reviews');
    const summary=element('summary','','다른 선지 풀이 보기');
    const otherChoices=element('div','picks col');rest.append(summary,otherChoices);
    buttons.forEach((button,index)=>{
      const option=button.dataset.reviewOption||button.textContent,review=q.choiceReviews[option];
      const originalIndex=button.dataset.reviewIndex==null?index:Number(button.dataset.reviewIndex);
      button.dataset.reviewOption=option;button.dataset.reviewIndex=String(originalIndex);
      const good=option===q.answer,chosen=option===q._picked;
      const content=element('span','choice-review-content');
      const number=numbered?('①②③④⑤⑥⑦⑧⑨⑩'[originalIndex]||String(originalIndex+1))+' ':'';
      content.appendChild(element('span','choice-verdict '+(good?'verdict-good':'verdict-wrong'),number+(chosen?'내 선택 · ':'')+(good?'정답 선지':'틀린 표현만 수정')));
      const text=element('span','choice-original');text.appendChild(!good&&review?.edits?.length?correction(option,review.edits):document.createTextNode(option));content.appendChild(text);
      // The shared feedback card explains the answer once; choices only show local edits.
      button.replaceChildren(content);button.disabled=true;button.hidden=false;button.classList.add('choice-reviewed');
      button.classList.toggle('answer-correct',good);button.classList.toggle('answer-wrong',chosen&&!good);
      button.setAttribute('aria-pressed',String(chosen));button.style.setProperty('--review-delay','0ms');
      (good||chosen?row:otherChoices).appendChild(button);
    });
    body.querySelectorAll('.other-choice-reviews').forEach(old=>old.remove());
    if(otherChoices.children.length)row.after(rest);
    return;
  }
  if(q.type==='ox'&&(q.answer==='O'||q.claimEdits?.length)){
    const claim=body.querySelector('.claim');if(!claim)return;
    const tag=element('span','choice-verdict '+(q.answer==='O'?'verdict-good':'verdict-wrong'),q.answer==='O'?'O · 그대로 맞는 문장이에요':'X · 틀린 표현만 바로잡아요');
    const copy=element('span','ox-correction-copy');copy.appendChild(q.answer==='X'?correction(q.changed,q.claimEdits):document.createTextNode(q.changed));
    claim.replaceChildren(tag,copy);claim.classList.add('claim-reviewed');
  }
}
global.HomeworkReview={diff,parts,paint};
})(window);

;
/* 결과의 오답 원인과 해설 후 정정을 점수와 별도로 표시합니다. */
(function(global){
'use strict';
function classify(log){
  const wrong=log.ok===false||(log.ok==null&&Number(log.score)<Number(log.max));
  const kind=wrong?(log.evidence||log.answerCorrect===true?'evidence':'answer'):'correct';
  const corrected=kind==='evidence'&&!!log.evidence?.selected&&log.evidence.selectedCorrect!==false&&!!(log.evidence.hadMistake||log.evidence.rejected?.length);
  return {kind,corrected,timedOut:kind==='answer'?!!log.timedOut:kind==='evidence'?!log.evidence?.selected&&!log.evidence?.retired:false};
}
function summarize(logs){
  const totals={correct:0,answer:0,evidence:0,corrected:0};
  for(const log of logs){const detail=classify(log);totals[detail.kind]++;if(detail.corrected)totals.corrected++;}
  return totals;
}
function node(tag,className,text){const n=global.document.createElement(tag);n.className=className||'';if(text!=null)n.textContent=text;return n;}
function badges(detail){
  const wrap=node('div','outcome-badges');
  wrap.appendChild(node('span','outcome-badge outcome-'+detail.kind,detail.kind==='evidence'?'근거 오답':detail.kind==='answer'?'문제 답 오답':'정답'));
  if(detail.corrected)wrap.appendChild(node('span','outcome-badge outcome-corrected','해설 후 정정 · 오답 유지'));
  else if(detail.timedOut)wrap.appendChild(node('span','outcome-badge outcome-timeout',detail.kind==='evidence'?'근거 시간 초과':'풀이 시간 초과'));
  return wrap;
}
function render({logs,summary,wrongs,findQuestion,classified}){
  summary.replaceChildren();summary.hidden=!classified;
  if(classified){
    const totals=summarize(logs),hasEvidence=logs.some(log=>log.evidence||(findQuestion(log)?.requiresEvidence??log.type==='mc'));summary.appendChild(node('h3','','어디서 틀렸을까?'));
    const grid=node('div','outcome-totals');
    for(const [kind,label] of [['correct','정답'],['answer','문제 답 오답'],['evidence','근거 오답']]){
      if(kind==='evidence'&&!hasEvidence)continue;
      const cell=node('div','outcome-total outcome-'+kind);cell.dataset.outcomeKind=kind;cell.append(node('span','',label),node('strong','',totals[kind]+'문항'));grid.appendChild(cell);
    }
    summary.appendChild(grid);
    if(hasEvidence){const corrected=node('p','outcome-correction-summary','해설 후 정정 '+totals.corrected+'문항 · 근거 오답에 포함되며 점수는 0점으로 유지돼요.');corrected.dataset.correctedCount=totals.corrected;summary.appendChild(corrected);}
  }
  wrongs.replaceChildren();const failed=logs.filter(log=>classify(log).kind!=='correct');if(!failed.length)return;
  wrongs.appendChild(node('h3','','오답 정리 · 다시 볼 문항'));
  for(const log of failed){
    const detail=classify(log),q=findQuestion(log),card=node('article','wr');card.dataset.mistakeKind=detail.kind;card.dataset.corrected=String(detail.corrected);if(log.qid)card.dataset.questionId=log.qid;
    if(classified)card.appendChild(badges(detail));
    card.appendChild(node('div','s serif',log.part+' '+log.qno+'. '+(log.sent||q?.sent||q?.changed||'')));
    if(!classified){card.appendChild(node('div','w','내 답: '+log.answer+' → 정답: '+log.correctAnswer));wrongs.appendChild(card);continue;}
    if(detail.kind==='answer'){
      card.appendChild(node('p','wrong-answer-status','문제 답: '+(log.timedOut?'시간 초과':log.problemAnswer||log.answer)+' → 정답: '+log.correctAnswer));
      if(q?.requiresEvidence??log.type==='mc')card.appendChild(node('p','wrong-evidence-status','근거 선택: 진행하지 않음 · 문제 답에서 틀렸어요.'));
    }else{
      card.appendChild(node('p','wrong-answer-status','문제 답: '+(log.reviewMode==='evidence-only'?'이전 정답 유지 · ':'')+(log.problemAnswer||log.correctAnswer)+' · 정답'));
      card.appendChild(node('p','wrong-evidence-status','근거 선택: '+(log.evidence?.rejected?.length||log.evidence?.hadMistake?'처음 선택 오답':'시간 초과')));
      const sentences=q?.evidence?.sources.flatMap(source=>source.sentences)||[];
      const sentence=id=>sentences.find(s=>s.id===id||s.memberIds?.includes(id))?.text||id;
      const groupText=(group,id)=>group?.members?.length?group.members.map(sentence).join(' '):sentence(id);
      const first=log.evidence?.rejected?.[0];
      if(first){card.append(node('small','wrong-detail-label','처음 고른 근거'+(log.evidence.rejectedGroups?.length?' 묶음':'')),node('blockquote','wrong-first-evidence',groupText(log.evidence.rejectedGroups?.[0],first)));}
      if(detail.corrected){card.append(node('small','wrong-detail-label','해설을 본 뒤 다시 고른 근거'+(log.evidence.selectedGroup?' 묶음':'')),node('blockquote','wrong-corrected-evidence',groupText(log.evidence.selectedGroup,log.evidence.selected)),node('p','wrong-correction-note','근거는 바로잡았지만, 이번 회차는 최초 근거 오답으로 0점 · 필수 복습 대상이에요.'));}
      else if(log.evidence?.hadMistake&&detail.timedOut)card.appendChild(node('p','wrong-correction-note','근거를 틀린 뒤 제한 시간 안에 바로잡지 못했어요.'));
    }
    if(log.why)card.appendChild(node('p','wrong-reason',log.why));
    wrongs.appendChild(card);
  }
}
global.HomeworkResults={classify,summarize,badges,render};
})(window);

;
/* Group adjacent complete sentences without consulting the answer key. */
(function(global){
'use strict';
const linked=/^(그렇지 않다면|그렇지 않으면|말하자면|다시 말해|정해진 저녁|그날 저녁|이러한 법은|그럴 때면|맞는 말이지만|즉 |그 상실의 결과|하지만 문제는|그리고 그 기준은|이는 )/;
const quoteLead=/(?:이렇게 (?:말했다|강조했다)|다음과 같은 근거를 댔다)[.!?]?$/;
const weight=members=>members.reduce((n,s)=>n+s.text.length,0);
function build(sources){
 const blocks=[];
 for(const source of sources||[]){
  let block=null,lastParagraph=null;
  for(const row of source.sentences||[]){
   if(!row.text?.trim())continue;
   if(!block||row.paragraph!==lastParagraph){block={units:[]};blocks.push(block);lastParagraph=row.paragraph;}
   const member={...row,sourceId:source.id,sourceTitle:source.title,sourceLabel:source.label};
   const previous=block.units.at(-1),last=previous?.at(-1);
   if(previous&&(linked.test(row.text.trim())||quoteLead.test(last.text.trim())&&/^[“"‘']/.test(row.text.trim())))previous.push(member);
   else block.units.push([member]);
  }
 }
 const unitCount=blocks.reduce((n,b)=>n+b.units.length,0),characters=blocks.reduce((n,b)=>n+weight(b.units.flat()),0);
 const target=Math.min(unitCount,unitCount>=10||characters>=700?4:3);
 while(blocks.length>target&&blocks.length>1){let best=0,size=Infinity;for(let i=0;i<blocks.length-1;i++){const n=weight([...blocks[i].units.flat(),...blocks[i+1].units.flat()]);if(n<size){size=n;best=i;}}blocks.splice(best,2,{units:[...blocks[best].units,...blocks[best+1].units]});}
 while(blocks.length<target){let at=-1,size=-1;blocks.forEach((b,i)=>{const n=weight(b.units.flat());if(b.units.length>1&&n>size){at=i;size=n;}});if(at<0)break;const units=blocks[at].units;let cut=1,balance=Infinity,left=0;for(let i=1;i<units.length;i++){left+=weight(units[i-1]);const difference=Math.abs(size-2*left);if(difference<balance){balance=difference;cut=i;}}blocks.splice(at,1,{units:units.slice(0,cut)},{units:units.slice(cut)});}
 return blocks.map((block,index)=>{const members=block.units.flat();return {id:'eg1:'+members[0].id+'..'+members.at(-1).id,index,members};});
}
const contains=(group,id)=>group.members.some(s=>s.id===id||s.memberIds?.includes(id));
const supportingId=(group,valid)=>valid.find(id=>contains(group,id))||null;
const snapshot=group=>({id:group.id,index:group.index,members:group.members.map(s=>s.id)});
function rejectedGroups(groups,saved,valid){
 const out=[];
 for(const group of groups){if(supportingId(group,valid))continue;const prior=(saved?.rejectedGroups||[]).some(g=>g.id===group.id||g.members?.some(id=>contains(group,id)));const legacy=(saved?.rejected||[]).some(id=>contains(group,id));if(prior||legacy)out.push(snapshot(group));}
 return out;
}
global.HomeworkEvidenceGroups={build,contains,supportingId,snapshot,rejectedGroups};
})(typeof window==='undefined'?globalThis:window);

;
/* Completed results outrank leftover resume snapshots, without erasing history. */
(function(global){
'use strict';
function active(run,report){
 if(!run)return null;
 for(const completed of [report?.normal,report?.review]){
  if(!completed?.endedAt||!Array.isArray(completed.logs)||!completed.logs.length)continue;
  if(run.session&&completed.session===run.session)return null;
  // Normal and review attempts share a per-set increasing attempt counter.
  // A different session at the same counter may be a concurrent device: retain it.
  const before=Number(run.attempt),after=Number(completed.attempt);
  if(Number.isInteger(before)&&before>0&&Number.isInteger(after)&&after>before)return null;
 }
 return run;
}
global.HomeworkAttemptState={active};
})(typeof window==='undefined'?globalThis:window);

;
/* 2-2 1~3문단 전용 질문 사다리. 본문은 기존 원문을 그대로 사용합니다. */
var HomeworkSocraticContent = {
  "version": 1,
  "id": "unit22-p01-03",
  "title": "사건과 질문 · 1~3문단",
  "sources": {
    "L01": {
      "id": "L01",
      "title": "줄 서기를 돈으로 살 수 있을까",
      "label": "1문단",
      "text": "여름마다 뉴욕시의 퍼블릭 시어터는 센트럴 파크에서 셰익스피어 무료 야외 공연을 연다. 오후 1시부터 배포하는 저녁 공연 입장권을 받기 위해 사람들은 몇 시간 전부터 줄을 서기 시작한다.",
      "sentences": [
        {
          "id": "L01:1",
          "text": "여름마다 뉴욕시의 퍼블릭 시어터는 센트럴 파크에서 셰익스피어 무료 야외 공연을 연다.",
          "paragraph": 0,
          "memberIds": [
            "L01:1"
          ],
          "topic": "미국 뉴욕에는 여름마다 큰 공원에서 공짜 연극을 여는 극장이 있다. 연극은 셰익스피어의 작품이다."
        },
        {
          "id": "L01:2",
          "text": "오후 1시부터 배포하는 저녁 공연 입장권을 받기 위해 사람들은 몇 시간 전부터 줄을 서기 시작한다.",
          "paragraph": 0,
          "memberIds": [
            "L01:2"
          ],
          "topic": "표는 오후 1시에 나눠 준다. 공연은 저녁이다. 표를 받으려고 사람들은 몇 시간 전부터 줄을 선다."
        }
      ]
    },
    "L02": {
      "id": "L02",
      "title": "줄 서기를 돈으로 살 수 있을까",
      "label": "2문단",
      "text": "많은 뉴요커들은 연극을 보고 싶었으나 줄을 설 시간이 없었다. 이런 곤란한 상황에서 작은 사업거리가 새로 등장했다. 편리를 얻는 대가로 기꺼이 비용을 지불할 의사가 있는 사람을 위해 대신 줄을 서고 입장권을 받아 주는 사업이었다. 이들은 온라인 사이트에 자신들의 서비스를 광고했고, 줄을 서서 기다리는 수고를 견뎌 내는 대가로 무료 공연 입장권에 한 장당 125달러의 수고비를 청구했다.",
      "sentences": [
        {
          "id": "L02:1",
          "text": "많은 뉴요커들은 연극을 보고 싶었으나 줄을 설 시간이 없었다.",
          "paragraph": 0,
          "memberIds": [
            "L02:1"
          ],
          "topic": "연극을 보고 싶은 뉴욕 사람은 많았다. 그런데 바빠서 줄 설 시간이 없었다."
        },
        {
          "id": "L02:2",
          "text": "이런 곤란한 상황에서 작은 사업거리가 새로 등장했다.",
          "paragraph": 0,
          "memberIds": [
            "L02:2"
          ],
          "topic": "그러자 새로운 작은 사업이 생겼다."
        },
        {
          "id": "L02:3",
          "text": "편리를 얻는 대가로 기꺼이 비용을 지불할 의사가 있는 사람을 위해 대신 줄을 서고 입장권을 받아 주는 사업이었다.",
          "paragraph": 0,
          "memberIds": [
            "L02:3"
          ],
          "topic": "어떤 사람들은 돈을 내서라도 편하게 표를 받고 싶었다. 그 사람 대신 줄을 서서 표를 받아다 주는 일이었다."
        },
        {
          "id": "L02:4",
          "text": "이들은 온라인 사이트에 자신들의 서비스를 광고했고, 줄을 서서 기다리는 수고를 견뎌 내는 대가로 무료 공연 입장권에 한 장당 125달러의 수고비를 청구했다.",
          "paragraph": 0,
          "memberIds": [
            "L02:4"
          ],
          "topic": "이 사람들은 인터넷에 광고를 올렸다. 그리고 공짜 표 한 장을 받아 주는 값으로 125달러(우리 돈 십수만 원)를 달라고 했다(청구했다). 줄 서서 기다린 고생값(수고비)이라는 것이다."
        }
      ]
    },
    "L03": {
      "id": "L03",
      "title": "줄 서기를 돈으로 살 수 있을까",
      "label": "3문단",
      "text": "극장 측은 “공원에서 이루어지는 줄 서기 대리 행위는 셰익스피어 정신에 어긋난다.”라고 주장하면서 대리로 줄을 서 주는 사람들의 영업을 막기 위해 노력했다. 국가 보조금을 받는 비영리 사업체인 퍼블릭 시어터의 사명은 모든 계층의 시민이 훌륭한 극장 시설을 이용할 수 있게 하는 것이다. 당시 뉴욕 검찰 총장이었던 앤드루 쿠오모(Andrew Cuomo)는 온라인 사이트에 압력을 가해 대리 줄 서기로 입장권을 구해 준다는 광고를 중단하게 했다. 그러면서 그는 이렇게 강조했다. “무료여야 하는 입장권을 판매하는 행위는 기관이 납세자의 후원을 받아 제공하는 혜택을 누릴 뉴요커의 권리를 침해한다.” 사람을 고용해 대리로 줄을 세우거나 암표를 파는 행동이 잘못일까?",
      "sentences": [
        {
          "id": "L03:1",
          "text": "극장 측은 “공원에서 이루어지는 줄 서기 대리 행위는 셰익스피어 정신에 어긋난다.”라고 주장하면서 대리로 줄을 서 주는 사람들의 영업을 막기 위해 노력했다.",
          "paragraph": 0,
          "memberIds": [
            "L03:1"
          ],
          "topic": "극장은 \"대신 줄 서 주는 건 셰익스피어 정신(이 공연의 정신)과 맞지 않는다.\"라고 말했다. 그리고 그 사업을 막으려고 애썼다."
        },
        {
          "id": "L03:2",
          "text": "국가 보조금을 받는 비영리 사업체인 퍼블릭 시어터의 사명은 모든 계층의 시민이 훌륭한 극장 시설을 이용할 수 있게 하는 것이다.",
          "paragraph": 0,
          "memberIds": [
            "L03:2"
          ],
          "topic": "이 극장은 돈을 벌려고 만든 곳이 아니다(비영리). 나라가 세금으로 돈도 대 준다(보조금). 극장이 꼭 해야 할 일(사명)은 부자든 아니든 모든 시민이 좋은 공연을 보게 하는 것이다."
        },
        {
          "id": "L03:3",
          "text": "당시 뉴욕 검찰 총장이었던 앤드루 쿠오모(Andrew Cuomo)는 온라인 사이트에 압력을 가해 대리 줄 서기로 입장권을 구해 준다는 광고를 중단하게 했다.",
          "paragraph": 0,
          "memberIds": [
            "L03:3"
          ],
          "topic": "뉴욕 검찰 총장 쿠오모도 나섰다. 인터넷 사이트를 압박해서 그 광고를 내리게 했다."
        },
        {
          "id": "L03:4",
          "text": "그러면서 그는 이렇게 강조했다.",
          "paragraph": 0,
          "memberIds": [
            "L03:4"
          ],
          "topic": "그리고 이렇게 말했다."
        },
        {
          "id": "L03:5",
          "text": "“무료여야 하는 입장권을 판매하는 행위는 기관이 납세자의 후원을 받아 제공하는 혜택을 누릴 뉴요커의 권리를 침해한다.”",
          "paragraph": 0,
          "memberIds": [
            "L03:5"
          ],
          "topic": "\"이 공연은 시민이 낸 세금의 도움으로 여는 혜택이다. 그러니 뉴욕 시민 누구나 누릴 권리가 있다. 공짜여야 할 표를 파는 건 그 권리를 빼앗는(침해하는) 일이다.\""
        },
        {
          "id": "L03:6",
          "text": "사람을 고용해 대리로 줄을 세우거나 암표를 파는 행동이 잘못일까?",
          "paragraph": 0,
          "memberIds": [
            "L03:6"
          ],
          "topic": "그렇다면 돈을 주고 사람을 시켜 대신 줄을 세우거나, 표를 비싸게 되파는(암표) 건 정말 잘못일까?"
        }
      ]
    }
  },
  "skills": [
    {
      "id": "free",
      "paragraph": 1,
      "title": "무료 공연과 기다림",
      "main": {
        "prompt": "이 공연의 입장권은 무료다.",
        "options": [
          "O",
          "X"
        ],
        "answer": "O"
      },
      "narrow": [
        {
          "prompt": "1문단은 이 공연을 무엇이라고 소개하나요?",
          "options": [
            "무료 야외 공연",
            "유료 실내 공연"
          ],
          "answer": "무료 야외 공연"
        },
        {
          "prompt": "무료라는 말은 어떤 뜻인가요?",
          "options": [
            "표값을 내지 않는다",
            "표값을 나중에 낸다"
          ],
          "answer": "표값을 내지 않는다"
        }
      ],
      "retest": {
        "prompt": "표값을 내지 않아도, 표를 받으려면 해야 하는 일은?",
        "options": [
          "미리 줄을 서서 기다린다",
          "극장에 돈을 보낸다",
          "저녁에 아무 때나 들어간다"
        ],
        "answer": "미리 줄을 서서 기다린다"
      },
      "review": {
        "prompt": "친구가 “공짜 표니까 기다릴 필요도 없겠네”라고 했어요. 글과 맞나요?",
        "options": [
          "아니다. 몇 시간 전부터 줄을 선다",
          "맞다. 원하는 때 바로 받는다",
          "아니다. 공연을 보려면 표를 사야 한다"
        ],
        "answer": "아니다. 몇 시간 전부터 줄을 선다"
      },
      "why": "입장권은 무료예요. 하지만 표를 받으려고 사람들은 몇 시간 전부터 줄을 섭니다. 표값과 기다리는 시간은 구별해야 해요.",
      "valid": [
        "L01:1",
        "L01:2"
      ],
      "recall": {
        "prompt": "퍼블릭 시어터의 이 공연은 유료인가요, 무료인가요? 한 단어로 적어 보세요.",
        "accept": [
          "무료",
          "무료다",
          "무료이다",
          "공짜",
          "무료공연"
        ],
        "reject": [
          "유료",
          "유료다",
          "유료공연"
        ]
      }
    },
    {
      "id": "time",
      "paragraph": 1,
      "title": "표를 나누는 때와 공연하는 때",
      "main": {
        "prompt": "공연은 오후 1시에 시작한다.",
        "options": [
          "O",
          "X"
        ],
        "answer": "X"
      },
      "narrow": [
        {
          "prompt": "오후 1시부터 하는 일은 무엇인가요?",
          "options": [
            "입장권을 나눠 준다",
            "공연을 시작한다"
          ],
          "answer": "입장권을 나눠 준다"
        },
        {
          "prompt": "글에서 입장권 앞에 붙은 말은 무엇인가요?",
          "options": [
            "저녁 공연",
            "오후 1시 공연"
          ],
          "answer": "저녁 공연"
        }
      ],
      "retest": {
        "prompt": "입장권 배포와 공연 순서가 맞는 것은?",
        "options": [
          "오후 1시부터 표 배포 → 저녁 공연",
          "저녁 표 배포 → 다음 날 오후 1시 공연",
          "오후 1시에 표 배포와 공연을 함께 시작"
        ],
        "answer": "오후 1시부터 표 배포 → 저녁 공연"
      },
      "review": {
        "prompt": "“오후 1시에 가면 공연을 볼 수 있어.” 어디를 잘못 읽었나요?",
        "options": [
          "표를 나눠 주는 시간을 공연 시간으로 읽었다",
          "공연 장소를 잘못 읽었다",
          "표값을 무료라고 잘못 읽었다"
        ],
        "answer": "표를 나눠 주는 시간을 공연 시간으로 읽었다"
      },
      "why": "오후 1시는 입장권을 나눠 주기 시작하는 때예요. 그 입장권으로 보는 공연은 저녁에 열립니다.",
      "valid": [
        "L01:2"
      ],
      "recall": {
        "prompt": "입장권을 나눠 주기 시작하는 시각을 적어 보세요. 오전·오후도 함께 써 주세요.",
        "accept": [
          "오후1시",
          "오후한시",
          "13시",
          "오후1시부터",
          "오후한시부터"
        ],
        "reject": [
          "저녁",
          "오전1시",
          "오후7시"
        ]
      }
    },
    {
      "id": "service",
      "paragraph": 2,
      "title": "대신 줄을 서 주는 사업",
      "main": {
        "prompt": "사람들은 공연에 관심이 없어서 다른 사람에게 줄 서기를 맡겼다.",
        "options": [
          "O",
          "X"
        ],
        "answer": "X"
      },
      "narrow": [
        {
          "prompt": "사람들은 연극을 보고 싶어 했나요?",
          "options": [
            "보고 싶어 했다",
            "보고 싶지 않아 했다"
          ],
          "answer": "보고 싶어 했다"
        },
        {
          "prompt": "보고 싶었는데 무엇이 부족했나요?",
          "options": [
            "줄을 설 시간",
            "공연을 보려는 마음"
          ],
          "answer": "줄을 설 시간"
        }
      ],
      "retest": {
        "prompt": "이 사업은 어떤 사람을 도와주나요?",
        "options": [
          "공연은 보고 싶지만 줄 설 시간이 없는 사람",
          "공연에 관심이 없는 사람",
          "대신 연극을 해 줄 배우가 필요한 사람"
        ],
        "answer": "공연은 보고 싶지만 줄 설 시간이 없는 사람"
      },
      "review": {
        "prompt": "“대신 줄을 서 주면 어떤 불편이 줄어들까?”",
        "options": [
          "직접 줄을 서서 기다려야 하는 불편",
          "공연 내용이 어려운 불편",
          "공연장이 실내인 불편"
        ],
        "answer": "직접 줄을 서서 기다려야 하는 불편"
      },
      "why": "사람들은 공연을 보고 싶었지만 줄을 설 시간이 없었어요. 사업자는 그 사람 대신 줄을 서서 표를 받아 주었습니다.",
      "valid": [
        "L02:1",
        "L02:3"
      ],
      "recall": {
        "prompt": "이 사업자는 표를 원하는 사람 대신 무엇을 해 주었나요? 짧게 적어 보세요.",
        "accept": [
          "줄서기",
          "줄을서기",
          "대신줄서기",
          "대신줄을서기",
          "줄을서준다",
          "대신줄을서준다",
          "줄을서서입장권을받아준다",
          "대신줄을서서표를받아준다"
        ],
        "reject": [
          "공연",
          "공연하기",
          "연극하기",
          "표만들기"
        ]
      },
      "evidence": {
        "prompt": "사람들에게 줄 설 시간이 없었다는 근거가 담긴 묶음을 골라 보세요.",
        "groups": [
          [
            "L02:1"
          ],
          [
            "L02:2",
            "L02:3"
          ],
          [
            "L02:4"
          ]
        ],
        "correct": [
          0
        ],
        "reasons": [
          "",
          "이 묶음은 사업자가 해 주는 일을 설명해요. 사람들이 어떤 어려움을 겪었는지는 앞 문장에 나와요.",
          "이 문장은 광고와 수고비를 설명해요. 시간이 없었다는 근거는 아니에요."
        ]
      }
    },
    {
      "id": "fee",
      "paragraph": 2,
      "title": "125달러는 누구에게 주는 돈인가",
      "main": {
        "prompt": "125달러는 어떤 돈인가요?",
        "options": [
          "극장이 받는 표값",
          "대신 줄을 서 준 사람이 받는 수고비",
          "공연을 본 뒤 내는 세금"
        ],
        "answer": "대신 줄을 서 준 사람이 받는 수고비"
      },
      "narrow": [
        {
          "prompt": "돈을 받는 쪽은 어떤 일을 했나요?",
          "options": [
            "대신 줄을 서서 표를 받아 주었다",
            "공연장에서 연극을 했다"
          ],
          "answer": "대신 줄을 서서 표를 받아 주었다"
        },
        {
          "prompt": "마지막 문장에서 125달러를 무엇이라고 부르나요?",
          "options": [
            "수고비",
            "관람료"
          ],
          "answer": "수고비"
        }
      ],
      "retest": {
        "prompt": "125달러가 오가는 방향으로 맞는 것은?",
        "options": [
          "표를 원하는 사람 → 대신 줄을 선 사람",
          "대신 줄을 선 사람 → 극장",
          "극장 → 관객 모두"
        ],
        "answer": "표를 원하는 사람 → 대신 줄을 선 사람"
      },
      "review": {
        "prompt": "[새 예시] 친구가 무료 축구 관람권을 받으려고 내 대신 줄을 섰어요. 내가 친구에게 준 5천 원은 글의 무엇과 같나요?",
        "options": [
          "줄을 서 준 수고에 주는 돈",
          "경기장에 내는 관람료",
          "무료 표에 붙는 세금"
        ],
        "answer": "줄을 서 준 수고에 주는 돈"
      },
      "why": "125달러는 극장이 받는 표값이 아니에요. 표를 원하는 사람이 대신 줄을 서서 표를 받아 준 사람에게 주는 수고비예요.",
      "valid": [
        "L02:3",
        "L02:4"
      ],
      "recall": {
        "prompt": "무료 입장권 한 장을 대신 받아 주고 받은 125달러를 글에서는 무엇이라고 부르나요?",
        "accept": [
          "수고비",
          "줄서기수고비",
          "수고의대가",
          "줄을서준수고비"
        ],
        "reject": [
          "표값",
          "입장료",
          "관람료",
          "세금"
        ]
      }
    },
    {
      "id": "mission",
      "paragraph": 3,
      "title": "극장이 공연을 여는 목적",
      "main": {
        "prompt": "퍼블릭 시어터는 돈을 많이 버는 것을 목적으로 한다.",
        "options": [
          "O",
          "X"
        ],
        "answer": "X"
      },
      "narrow": [
        {
          "prompt": "극장은 어떤 사업체라고 했나요?",
          "options": [
            "비영리 사업체",
            "영리 사업체"
          ],
          "answer": "비영리 사업체"
        },
        {
          "prompt": "극장의 사명은 누가 시설을 이용하게 하는 것인가요?",
          "options": [
            "모든 계층의 시민",
            "돈을 많이 낸 시민만"
          ],
          "answer": "모든 계층의 시민"
        }
      ],
      "retest": {
        "prompt": "극장에 대한 설명으로 맞는 것은?",
        "options": [
          "여러 계층의 시민이 좋은 극장 시설을 이용하게 하려 한다",
          "돈을 많이 내는 사람만 공연을 보게 하려 한다",
          "보조금을 받으니 이익을 남기는 것이 목적이다"
        ],
        "answer": "여러 계층의 시민이 좋은 극장 시설을 이용하게 하려 한다"
      },
      "review": {
        "prompt": "“국가에서 돈을 받으니 돈 버는 사업이네.” 어느 부분을 놓쳤나요?",
        "options": [
          "비영리 사업체라는 설명",
          "공연이 무료라는 말을 극장이 하지 않았다는 점",
          "극장이 뉴욕에 없다는 점"
        ],
        "answer": "비영리 사업체라는 설명"
      },
      "why": "비영리는 이익을 남기는 것을 목적으로 하지 않는다는 뜻이에요. 국가 보조금을 받는 이 극장의 사명은 모든 계층의 시민이 좋은 극장 시설을 이용하게 하는 것입니다.",
      "valid": [
        "L03:2"
      ],
      "recall": {
        "prompt": "극장은 어느 계층의 시민이 극장 시설을 이용하게 하려 하나요? 짧게 적어 보세요.",
        "accept": [
          "모든계층",
          "모든계층의시민",
          "모든시민",
          "모든계층시민"
        ],
        "reject": [
          "부자",
          "부유층",
          "돈많은사람",
          "일부계층"
        ]
      }
    },
    {
      "id": "rights",
      "paragraph": 3,
      "title": "쿠오모가 지키려는 권리",
      "main": {
        "prompt": "쿠오모가 대리 줄 서기를 반대한 이유는?",
        "options": [
          "뉴요커가 세금으로 마련된 혜택을 누릴 권리를 침해해서",
          "극장에 세금이 전혀 쓰이지 않아서",
          "공연이 저녁에 열려서"
        ],
        "answer": "뉴요커가 세금으로 마련된 혜택을 누릴 권리를 침해해서"
      },
      "narrow": [
        {
          "prompt": "쿠오모의 말에서 이 혜택은 누구의 후원을 받나요?",
          "options": [
            "납세자",
            "대리 줄 서기 사업자만"
          ],
          "answer": "납세자"
        },
        {
          "prompt": "그는 누구의 권리가 침해된다고 했나요?",
          "options": [
            "뉴요커의 권리",
            "대리 줄 서기 사업자의 권리"
          ],
          "answer": "뉴요커의 권리"
        }
      ],
      "retest": {
        "prompt": "쿠오모의 말과 같은 뜻은?",
        "options": [
          "세금으로 마련한 혜택을 뉴욕 시민이 누릴 수 있어야 한다",
          "대리 줄 서기 사업자가 더 많은 돈을 벌어야 한다",
          "공연을 보는 시민은 모두 부자여야 한다"
        ],
        "answer": "세금으로 마련한 혜택을 뉴욕 시민이 누릴 수 있어야 한다"
      },
      "review": {
        "prompt": "“쿠오모는 대리 줄 서기 사업자의 돈 벌 권리를 지키려 했다.” 맞나요?",
        "options": [
          "아니다. 혜택을 누릴 뉴요커의 권리를 말한다",
          "맞다. 사업자의 수익을 보호하려 한다",
          "맞다. 극장의 표값을 올리려 한다"
        ],
        "answer": "아니다. 혜택을 누릴 뉴요커의 권리를 말한다"
      },
      "why": "쿠오모는 납세자의 후원, 즉 세금으로 마련된 혜택을 뉴요커가 누릴 권리를 말해요. 무료여야 할 표를 파는 행위가 그 권리를 침해한다고 보았습니다.",
      "valid": [
        "L03:5"
      ],
      "recall": {
        "prompt": "쿠오모는 세금으로 마련된 혜택을 누릴 누구의 권리를 말했나요?",
        "accept": [
          "뉴요커",
          "뉴요커의권리",
          "뉴욕시민",
          "뉴욕시민의권리",
          "뉴요커들",
          "뉴욕시민들"
        ],
        "reject": [
          "사업자",
          "극장",
          "대리줄서기사업자",
          "암표상"
        ]
      },
      "evidence": {
        "prompt": "쿠오모가 반대한 이유를 담은 묶음을 골라 보세요.",
        "groups": [
          [
            "L03:1",
            "L03:2"
          ],
          [
            "L03:3",
            "L03:4",
            "L03:5"
          ],
          [
            "L03:6"
          ]
        ],
        "correct": [
          1
        ],
        "reasons": [
          "이 묶음은 극장의 주장과 사명을 설명해요. 질문에서 묻는 사람은 쿠오모예요.",
          "",
          "마지막 문장은 글쓴이가 던지는 질문이에요. 쿠오모가 반대한 이유를 직접 말하는 부분은 아니에요."
        ]
      }
    },
    {
      "id": "question",
      "paragraph": 3,
      "title": "질문으로 끝나는 문단",
      "main": {
        "prompt": "3문단 마지막에서 글쓴이는 대리 줄 서기가 잘못이라고 결론 내린다.",
        "options": [
          "O",
          "X"
        ],
        "answer": "X"
      },
      "narrow": [
        {
          "prompt": "마지막 문장은 어떻게 끝나나요?",
          "options": [
            "잘못일까?",
            "잘못이다."
          ],
          "answer": "잘못일까?"
        },
        {
          "prompt": "“잘못일까?”는 어떤 말인가요?",
          "options": [
            "답을 따져 보자는 질문",
            "이미 정한 결론"
          ],
          "answer": "답을 따져 보자는 질문"
        }
      ],
      "retest": {
        "prompt": "3문단 마지막 문장을 읽은 뒤 할 일은?",
        "options": [
          "뒤 글에서 이 질문을 어떻게 따지는지 살핀다",
          "글쓴이가 이미 반대 결론을 내렸다고 정리한다",
          "쿠오모가 사업을 찬성했다고 정리한다"
        ],
        "answer": "뒤 글에서 이 질문을 어떻게 따지는지 살핀다"
      },
      "review": {
        "prompt": "극장과 쿠오모가 반대했으니, 글쓴이도 마지막에 반대 결론을 낸 걸까요?",
        "options": [
          "아니다. 마지막에는 잘못인지 질문한다",
          "그렇다. 두 사람의 의견이 곧 글쓴이의 결론이다",
          "그렇다. 마지막 문장은 의문문이 아니다"
        ],
        "answer": "아니다. 마지막에는 잘못인지 질문한다"
      },
      "why": "극장과 쿠오모는 반대했어요. 하지만 글쓴이의 마지막 문장은 “잘못일까?”라는 질문입니다. 이 문단만으로 글쓴이가 결론을 내렸다고 보면 안 돼요.",
      "valid": [
        "L03:1",
        "L03:5",
        "L03:6"
      ],
      "recall": {
        "prompt": "3문단의 마지막은 결론인가요, 질문인가요? 한 단어로 적어 보세요.",
        "accept": [
          "질문",
          "물음",
          "의문",
          "의문문",
          "문제제기",
          "질문이다"
        ],
        "reject": [
          "결론",
          "반대결론",
          "찬성결론",
          "단정"
        ]
      }
    }
  ],
  "diagnostic": [
    "free",
    "time",
    "fee",
    "rights",
    "question"
  ],
  "combined": [
    {
      "prompt": "[새 예시] 학교가 축구 관람권을 무료로 줍니다. 친구에게 대신 줄을 서 달라고 하고 5천 원을 줬어요. 맞는 설명은?",
      "options": [
        "관람권은 무료지만, 대신 기다려 준 일에는 돈을 줬다",
        "학교가 관람권 한 장을 5천 원에 팔았다",
        "친구는 축구 경기를 대신 뛰어 주었다"
      ],
      "answer": "관람권은 무료지만, 대신 기다려 준 일에는 돈을 줬다",
      "why": "관람권의 가격과 대신 기다려 준 대가는 달라요. 새 예시의 5천 원은 2문단의 수고비에 해당합니다.",
      "valid": [
        "L01:1",
        "L02:4"
      ],
      "narrow": [
        {
          "prompt": "학교가 나눠 주는 관람권 자체는 얼마인가요?",
          "options": [
            "무료",
            "5천 원"
          ],
          "answer": "무료"
        },
        {
          "prompt": "내가 5천 원을 준 상대는 누구인가요?",
          "options": [
            "대신 줄을 서 준 친구",
            "학교"
          ],
          "answer": "대신 줄을 서 준 친구"
        }
      ],
      "retest": {
        "prompt": "[새 예시] 무료 공연 표를 대신 받아 준 언니에게 수고비를 줬어요. 그 돈은 무엇에 대한 대가인가요?",
        "options": [
          "표를 받으려고 대신 기다린 일",
          "극장이 연극을 보여 준 일",
          "무료 표에 매기는 세금"
        ],
        "answer": "표를 받으려고 대신 기다린 일"
      },
      "review": {
        "prompt": "[새 예시] 박물관 무료 관람권을 친구가 대신 줄 서서 받아 줬어요. 친구에게 간식값을 줬다면, 표값과 간식값을 어떻게 구별하나요?",
        "options": [
          "표는 무료이고, 간식값은 친구의 수고에 준 돈이다",
          "박물관이 간식값만큼 입장료를 받은 것이다",
          "친구가 표를 인쇄한 비용을 받은 것이다"
        ],
        "answer": "표는 무료이고, 간식값은 친구의 수고에 준 돈이다"
      }
    },
    {
      "prompt": "1~3문단을 읽고 “반대하는 사람도 있으니 잘못인지 따져 보자”라고 정리했어요. 이 말과 가장 가까운 부분은?",
      "options": [
        "글쓴이가 마지막에 던진 질문",
        "극장이 받기로 한 관람료",
        "쿠오모가 사업자를 칭찬한 말"
      ],
      "answer": "글쓴이가 마지막에 던진 질문",
      "why": "극장과 쿠오모의 반대가 소개된 뒤, 글쓴이는 대리 줄 서기나 암표 판매가 잘못인지 질문해요. 아직 찬반 결론을 내린 부분은 아닙니다.",
      "valid": [
        "L03:6"
      ],
      "narrow": [
        {
          "prompt": "마지막 문장에 붙은 문장부호는 무엇인가요?",
          "options": [
            "물음표",
            "마침표"
          ],
          "answer": "물음표"
        },
        {
          "prompt": "잘못인지 묻는 말과 잘못이라고 정한 말은 같나요?",
          "options": [
            "다르다. 묻는 말은 아직 결론이 아니다",
            "같다. 물으면 이미 결론을 정한 것이다"
          ],
          "answer": "다르다. 묻는 말은 아직 결론이 아니다"
        }
      ],
      "retest": {
        "prompt": "“극장과 쿠오모가 반대했다” 다음에 필자는 무엇을 하나요?",
        "options": [
          "정말 잘못인지 물음을 던진다",
          "쿠오모가 찬성했다고 고친다",
          "극장이 표를 팔도록 허락한다"
        ],
        "answer": "정말 잘못인지 물음을 던진다"
      },
      "review": {
        "prompt": "친구가 “3문단까지 읽었으니 글쓴이의 찬반 결론도 알겠어”라고 했어요. 어떻게 답할까요?",
        "options": [
          "아직 잘못인지 질문한 단계이므로 결론이라고 단정할 수 없어",
          "극장의 반대가 바로 글쓴이의 확정된 결론이야",
          "마지막에 물었으므로 글쓴이는 찬성한 거야"
        ],
        "answer": "아직 잘못인지 질문한 단계이므로 결론이라고 단정할 수 없어"
      }
    }
  ],
  "diagnosticRevision": 1,
  "diagnosticContext": {
    "free": {
      "title": "글에 나온 공연",
      "text": [
        "여름마다 뉴욕시의 퍼블릭 시어터는 센트럴 파크에서 셰익스피어 무료 야외 공연을 연다."
      ],
      "prompt": "글에 나온 야외 공연의 입장권은 무료다."
    },
    "time": {
      "title": "표를 나눠 주는 때와 공연하는 때",
      "text": [
        "오후 1시부터 배포하는 저녁 공연 입장권을 받기 위해 사람들은 몇 시간 전부터 줄을 서기 시작한다."
      ],
      "prompt": "오후 1시는 공연이 시작하는 시간이다."
    },
    "fee": {
      "title": "어떤 상황인가요?",
      "text": [
        "연극을 보고 싶지만 줄을 설 시간이 없는 사람들이 있었어요.",
        "이 사람들 대신 줄을 서서 무료 입장권을 받아 주는 사업이 생겼고, 사업자는 표 한 장을 받아 줄 때마다 125달러를 받았어요."
      ],
      "prompt": "이 상황에서 125달러는 무엇에 대한 돈인가요?"
    },
    "rights": {
      "title": "쿠오모가 한 말",
      "text": [
        "쿠오모는 뉴욕의 검찰 총장이었어요. 그는 대신 줄을 서서 무료 입장권을 구해 주는 사업을 반대하며 이렇게 말했어요.",
        "“무료여야 하는 입장권을 판매하는 행위는 기관이 납세자의 후원을 받아 제공하는 혜택을 누릴 뉴요커의 권리를 침해한다.”",
        "납세자는 세금을 내는 사람, 뉴요커는 뉴욕 시민을 뜻해요."
      ],
      "prompt": "쿠오모가 대리 줄 서기 사업을 반대한 이유는 무엇인가요?"
    },
    "question": {
      "title": "판단할 문장",
      "text": [
        "“사람을 고용해 대리로 줄을 세우거나 암표를 파는 행동이 잘못일까?”"
      ],
      "prompt": "이 말을 한 글쓴이는 대리 줄 서기가 잘못이라고 결론 내렸다."
    }
  }
};

;
/* 자동 생성: scripts/build-socratic.py · 원고: 문제 원고/2-2 질문 사다리 4~18문단.json */
var HomeworkSocraticCourses=[{"version": 1, "id": "unit22-p01-03", "title": "사건과 질문 · 1~3문단", "sources": {"L01": {"id": "L01", "title": "줄 서기를 돈으로 살 수 있을까", "label": "1문단", "text": "여름마다 뉴욕시의 퍼블릭 시어터는 센트럴 파크에서 셰익스피어 무료 야외 공연을 연다. 오후 1시부터 배포하는 저녁 공연 입장권을 받기 위해 사람들은 몇 시간 전부터 줄을 서기 시작한다.", "sentences": [{"id": "L01:1", "text": "여름마다 뉴욕시의 퍼블릭 시어터는 센트럴 파크에서 셰익스피어 무료 야외 공연을 연다.", "paragraph": 0, "memberIds": ["L01:1"], "topic": "미국 뉴욕에는 여름마다 큰 공원에서 공짜 연극을 여는 극장이 있다. 연극은 셰익스피어의 작품이다."}, {"id": "L01:2", "text": "오후 1시부터 배포하는 저녁 공연 입장권을 받기 위해 사람들은 몇 시간 전부터 줄을 서기 시작한다.", "paragraph": 0, "memberIds": ["L01:2"], "topic": "표는 오후 1시에 나눠 준다. 공연은 저녁이다. 표를 받으려고 사람들은 몇 시간 전부터 줄을 선다."}]}, "L02": {"id": "L02", "title": "줄 서기를 돈으로 살 수 있을까", "label": "2문단", "text": "많은 뉴요커들은 연극을 보고 싶었으나 줄을 설 시간이 없었다. 이런 곤란한 상황에서 작은 사업거리가 새로 등장했다. 편리를 얻는 대가로 기꺼이 비용을 지불할 의사가 있는 사람을 위해 대신 줄을 서고 입장권을 받아 주는 사업이었다. 이들은 온라인 사이트에 자신들의 서비스를 광고했고, 줄을 서서 기다리는 수고를 견뎌 내는 대가로 무료 공연 입장권에 한 장당 125달러의 수고비를 청구했다.", "sentences": [{"id": "L02:1", "text": "많은 뉴요커들은 연극을 보고 싶었으나 줄을 설 시간이 없었다.", "paragraph": 0, "memberIds": ["L02:1"], "topic": "연극을 보고 싶은 뉴욕 사람은 많았다. 그런데 바빠서 줄 설 시간이 없었다."}, {"id": "L02:2", "text": "이런 곤란한 상황에서 작은 사업거리가 새로 등장했다.", "paragraph": 0, "memberIds": ["L02:2"], "topic": "그러자 새로운 작은 사업이 생겼다."}, {"id": "L02:3", "text": "편리를 얻는 대가로 기꺼이 비용을 지불할 의사가 있는 사람을 위해 대신 줄을 서고 입장권을 받아 주는 사업이었다.", "paragraph": 0, "memberIds": ["L02:3"], "topic": "어떤 사람들은 돈을 내서라도 편하게 표를 받고 싶었다. 그 사람 대신 줄을 서서 표를 받아다 주는 일이었다."}, {"id": "L02:4", "text": "이들은 온라인 사이트에 자신들의 서비스를 광고했고, 줄을 서서 기다리는 수고를 견뎌 내는 대가로 무료 공연 입장권에 한 장당 125달러의 수고비를 청구했다.", "paragraph": 0, "memberIds": ["L02:4"], "topic": "이 사람들은 인터넷에 광고를 올렸다. 그리고 공짜 표 한 장을 받아 주는 값으로 125달러(우리 돈 십수만 원)를 달라고 했다(청구했다). 줄 서서 기다린 고생값(수고비)이라는 것이다."}]}, "L03": {"id": "L03", "title": "줄 서기를 돈으로 살 수 있을까", "label": "3문단", "text": "극장 측은 “공원에서 이루어지는 줄 서기 대리 행위는 셰익스피어 정신에 어긋난다.”라고 주장하면서 대리로 줄을 서 주는 사람들의 영업을 막기 위해 노력했다. 국가 보조금을 받는 비영리 사업체인 퍼블릭 시어터의 사명은 모든 계층의 시민이 훌륭한 극장 시설을 이용할 수 있게 하는 것이다. 당시 뉴욕 검찰 총장이었던 앤드루 쿠오모(Andrew Cuomo)는 온라인 사이트에 압력을 가해 대리 줄 서기로 입장권을 구해 준다는 광고를 중단하게 했다. 그러면서 그는 이렇게 강조했다. “무료여야 하는 입장권을 판매하는 행위는 기관이 납세자의 후원을 받아 제공하는 혜택을 누릴 뉴요커의 권리를 침해한다.” 사람을 고용해 대리로 줄을 세우거나 암표를 파는 행동이 잘못일까?", "sentences": [{"id": "L03:1", "text": "극장 측은 “공원에서 이루어지는 줄 서기 대리 행위는 셰익스피어 정신에 어긋난다.”라고 주장하면서 대리로 줄을 서 주는 사람들의 영업을 막기 위해 노력했다.", "paragraph": 0, "memberIds": ["L03:1"], "topic": "극장은 \"대신 줄 서 주는 건 셰익스피어 정신(이 공연의 정신)과 맞지 않는다.\"라고 말했다. 그리고 그 사업을 막으려고 애썼다."}, {"id": "L03:2", "text": "국가 보조금을 받는 비영리 사업체인 퍼블릭 시어터의 사명은 모든 계층의 시민이 훌륭한 극장 시설을 이용할 수 있게 하는 것이다.", "paragraph": 0, "memberIds": ["L03:2"], "topic": "이 극장은 돈을 벌려고 만든 곳이 아니다(비영리). 나라가 세금으로 돈도 대 준다(보조금). 극장이 꼭 해야 할 일(사명)은 부자든 아니든 모든 시민이 좋은 공연을 보게 하는 것이다."}, {"id": "L03:3", "text": "당시 뉴욕 검찰 총장이었던 앤드루 쿠오모(Andrew Cuomo)는 온라인 사이트에 압력을 가해 대리 줄 서기로 입장권을 구해 준다는 광고를 중단하게 했다.", "paragraph": 0, "memberIds": ["L03:3"], "topic": "뉴욕 검찰 총장 쿠오모도 나섰다. 인터넷 사이트를 압박해서 그 광고를 내리게 했다."}, {"id": "L03:4", "text": "그러면서 그는 이렇게 강조했다.", "paragraph": 0, "memberIds": ["L03:4"], "topic": "그리고 이렇게 말했다."}, {"id": "L03:5", "text": "“무료여야 하는 입장권을 판매하는 행위는 기관이 납세자의 후원을 받아 제공하는 혜택을 누릴 뉴요커의 권리를 침해한다.”", "paragraph": 0, "memberIds": ["L03:5"], "topic": "\"이 공연은 시민이 낸 세금의 도움으로 여는 혜택이다. 그러니 뉴욕 시민 누구나 누릴 권리가 있다. 공짜여야 할 표를 파는 건 그 권리를 빼앗는(침해하는) 일이다.\""}, {"id": "L03:6", "text": "사람을 고용해 대리로 줄을 세우거나 암표를 파는 행동이 잘못일까?", "paragraph": 0, "memberIds": ["L03:6"], "topic": "그렇다면 돈을 주고 사람을 시켜 대신 줄을 세우거나, 표를 비싸게 되파는(암표) 건 정말 잘못일까?"}]}}, "skills": [{"id": "free", "paragraph": 1, "title": "무료 공연과 기다림", "main": {"prompt": "이 공연의 입장권은 무료다.", "options": ["O", "X"], "answer": "O"}, "narrow": [{"prompt": "1문단은 이 공연을 무엇이라고 소개하나요?", "options": ["무료 야외 공연", "유료 실내 공연"], "answer": "무료 야외 공연"}, {"prompt": "무료라는 말은 어떤 뜻인가요?", "options": ["표값을 내지 않는다", "표값을 나중에 낸다"], "answer": "표값을 내지 않는다"}], "retest": {"prompt": "표값을 내지 않아도, 표를 받으려면 해야 하는 일은?", "options": ["미리 줄을 서서 기다린다", "극장에 돈을 보낸다", "저녁에 아무 때나 들어간다"], "answer": "미리 줄을 서서 기다린다"}, "review": {"prompt": "친구가 “공짜 표니까 기다릴 필요도 없겠네”라고 했어요. 글과 맞나요?", "options": ["아니다. 몇 시간 전부터 줄을 선다", "맞다. 원하는 때 바로 받는다", "아니다. 공연을 보려면 표를 사야 한다"], "answer": "아니다. 몇 시간 전부터 줄을 선다"}, "why": "입장권은 무료예요. 하지만 표를 받으려고 사람들은 몇 시간 전부터 줄을 섭니다. 표값과 기다리는 시간은 구별해야 해요.", "valid": ["L01:1", "L01:2"], "recall": {"prompt": "퍼블릭 시어터의 이 공연은 유료인가요, 무료인가요? 한 단어로 적어 보세요.", "accept": ["무료", "무료다", "무료이다", "공짜", "무료공연"], "reject": ["유료", "유료다", "유료공연"]}, "rev": "d31ea99250c0b3fff6817e4a2c6888a45eefe0ce6687198e5cff358edbb0f647"}, {"id": "time", "paragraph": 1, "title": "표를 나누는 때와 공연하는 때", "main": {"prompt": "공연은 오후 1시에 시작한다.", "options": ["O", "X"], "answer": "X"}, "narrow": [{"prompt": "오후 1시부터 하는 일은 무엇인가요?", "options": ["입장권을 나눠 준다", "공연을 시작한다"], "answer": "입장권을 나눠 준다"}, {"prompt": "글에서 입장권 앞에 붙은 말은 무엇인가요?", "options": ["저녁 공연", "오후 1시 공연"], "answer": "저녁 공연"}], "retest": {"prompt": "입장권 배포와 공연 순서가 맞는 것은?", "options": ["오후 1시부터 표 배포 → 저녁 공연", "저녁 표 배포 → 다음 날 오후 1시 공연", "오후 1시에 표 배포와 공연을 함께 시작"], "answer": "오후 1시부터 표 배포 → 저녁 공연"}, "review": {"prompt": "“오후 1시에 가면 공연을 볼 수 있어.” 어디를 잘못 읽었나요?", "options": ["표를 나눠 주는 시간을 공연 시간으로 읽었다", "공연 장소를 잘못 읽었다", "표값을 무료라고 잘못 읽었다"], "answer": "표를 나눠 주는 시간을 공연 시간으로 읽었다"}, "why": "오후 1시는 입장권을 나눠 주기 시작하는 때예요. 그 입장권으로 보는 공연은 저녁에 열립니다.", "valid": ["L01:2"], "recall": {"prompt": "입장권을 나눠 주기 시작하는 시각을 적어 보세요. 오전·오후도 함께 써 주세요.", "accept": ["오후1시", "오후한시", "13시", "오후1시부터", "오후한시부터"], "reject": ["저녁", "오전1시", "오후7시"]}, "rev": "fb09c306e2045af67c28fa188e0400188358629fb9c5bb7cd4bab7097ba6ffe9"}, {"id": "service", "paragraph": 2, "title": "대신 줄을 서 주는 사업", "main": {"prompt": "사람들은 공연에 관심이 없어서 다른 사람에게 줄 서기를 맡겼다.", "options": ["O", "X"], "answer": "X"}, "narrow": [{"prompt": "사람들은 연극을 보고 싶어 했나요?", "options": ["보고 싶어 했다", "보고 싶지 않아 했다"], "answer": "보고 싶어 했다"}, {"prompt": "보고 싶었는데 무엇이 부족했나요?", "options": ["줄을 설 시간", "공연을 보려는 마음"], "answer": "줄을 설 시간"}], "retest": {"prompt": "이 사업은 어떤 사람을 도와주나요?", "options": ["공연은 보고 싶지만 줄 설 시간이 없는 사람", "공연에 관심이 없는 사람", "대신 연극을 해 줄 배우가 필요한 사람"], "answer": "공연은 보고 싶지만 줄 설 시간이 없는 사람"}, "review": {"prompt": "“대신 줄을 서 주면 어떤 불편이 줄어들까?”", "options": ["직접 줄을 서서 기다려야 하는 불편", "공연 내용이 어려운 불편", "공연장이 실내인 불편"], "answer": "직접 줄을 서서 기다려야 하는 불편"}, "why": "사람들은 공연을 보고 싶었지만 줄을 설 시간이 없었어요. 사업자는 그 사람 대신 줄을 서서 표를 받아 주었습니다.", "valid": ["L02:1", "L02:3"], "recall": {"prompt": "이 사업자는 표를 원하는 사람 대신 무엇을 해 주었나요? 짧게 적어 보세요.", "accept": ["줄서기", "줄을서기", "대신줄서기", "대신줄을서기", "줄을서준다", "대신줄을서준다", "줄을서서입장권을받아준다", "대신줄을서서표를받아준다"], "reject": ["공연", "공연하기", "연극하기", "표만들기"]}, "evidence": {"prompt": "사람들에게 줄 설 시간이 없었다는 근거가 담긴 묶음을 골라 보세요.", "groups": [["L02:1"], ["L02:2", "L02:3"], ["L02:4"]], "correct": [0], "reasons": ["", "이 묶음은 사업자가 해 주는 일을 설명해요. 사람들이 어떤 어려움을 겪었는지는 앞 문장에 나와요.", "이 문장은 광고와 수고비를 설명해요. 시간이 없었다는 근거는 아니에요."]}, "rev": "8ee1a234c0b9dbcdb96d0e31e3509677d2540645d67fa7b3732da22ce854d1d7"}, {"id": "fee", "paragraph": 2, "title": "125달러는 누구에게 주는 돈인가", "main": {"prompt": "125달러는 어떤 돈인가요?", "options": ["극장이 받는 표값", "대신 줄을 서 준 사람이 받는 수고비", "공연을 본 뒤 내는 세금"], "answer": "대신 줄을 서 준 사람이 받는 수고비"}, "narrow": [{"prompt": "돈을 받는 쪽은 어떤 일을 했나요?", "options": ["대신 줄을 서서 표를 받아 주었다", "공연장에서 연극을 했다"], "answer": "대신 줄을 서서 표를 받아 주었다"}, {"prompt": "마지막 문장에서 125달러를 무엇이라고 부르나요?", "options": ["수고비", "관람료"], "answer": "수고비"}], "retest": {"prompt": "125달러가 오가는 방향으로 맞는 것은?", "options": ["표를 원하는 사람 → 대신 줄을 선 사람", "대신 줄을 선 사람 → 극장", "극장 → 관객 모두"], "answer": "표를 원하는 사람 → 대신 줄을 선 사람"}, "review": {"prompt": "[새 예시] 친구가 무료 축구 관람권을 받으려고 내 대신 줄을 섰어요. 내가 친구에게 준 5천 원은 글의 무엇과 같나요?", "options": ["줄을 서 준 수고에 주는 돈", "경기장에 내는 관람료", "무료 표에 붙는 세금"], "answer": "줄을 서 준 수고에 주는 돈"}, "why": "125달러는 극장이 받는 표값이 아니에요. 표를 원하는 사람이 대신 줄을 서서 표를 받아 준 사람에게 주는 수고비예요.", "valid": ["L02:3", "L02:4"], "recall": {"prompt": "무료 입장권 한 장을 대신 받아 주고 받은 125달러를 글에서는 무엇이라고 부르나요?", "accept": ["수고비", "줄서기수고비", "수고의대가", "줄을서준수고비"], "reject": ["표값", "입장료", "관람료", "세금"]}, "rev": "ec7c3edb2dcce9b5d1ef36b89a58cc7bf77eff99fdec13ea0eb6440b0b6ddad0"}, {"id": "mission", "paragraph": 3, "title": "극장이 공연을 여는 목적", "main": {"prompt": "퍼블릭 시어터는 돈을 많이 버는 것을 목적으로 한다.", "options": ["O", "X"], "answer": "X"}, "narrow": [{"prompt": "극장은 어떤 사업체라고 했나요?", "options": ["비영리 사업체", "영리 사업체"], "answer": "비영리 사업체"}, {"prompt": "극장의 사명은 누가 시설을 이용하게 하는 것인가요?", "options": ["모든 계층의 시민", "돈을 많이 낸 시민만"], "answer": "모든 계층의 시민"}], "retest": {"prompt": "극장에 대한 설명으로 맞는 것은?", "options": ["여러 계층의 시민이 좋은 극장 시설을 이용하게 하려 한다", "돈을 많이 내는 사람만 공연을 보게 하려 한다", "보조금을 받으니 이익을 남기는 것이 목적이다"], "answer": "여러 계층의 시민이 좋은 극장 시설을 이용하게 하려 한다"}, "review": {"prompt": "“국가에서 돈을 받으니 돈 버는 사업이네.” 어느 부분을 놓쳤나요?", "options": ["비영리 사업체라는 설명", "공연이 무료라는 말을 극장이 하지 않았다는 점", "극장이 뉴욕에 없다는 점"], "answer": "비영리 사업체라는 설명"}, "why": "비영리는 이익을 남기는 것을 목적으로 하지 않는다는 뜻이에요. 국가 보조금을 받는 이 극장의 사명은 모든 계층의 시민이 좋은 극장 시설을 이용하게 하는 것입니다.", "valid": ["L03:2"], "recall": {"prompt": "극장은 어느 계층의 시민이 극장 시설을 이용하게 하려 하나요? 짧게 적어 보세요.", "accept": ["모든계층", "모든계층의시민", "모든시민", "모든계층시민"], "reject": ["부자", "부유층", "돈많은사람", "일부계층"]}, "rev": "fbe86570febc11492b853feb27deef987b12772c310e6d21e8b7d3aaa88d39a5"}, {"id": "rights", "paragraph": 3, "title": "쿠오모가 지키려는 권리", "main": {"prompt": "쿠오모가 대리 줄 서기를 반대한 이유는?", "options": ["뉴요커가 세금으로 마련된 혜택을 누릴 권리를 침해해서", "극장에 세금이 전혀 쓰이지 않아서", "공연이 저녁에 열려서"], "answer": "뉴요커가 세금으로 마련된 혜택을 누릴 권리를 침해해서"}, "narrow": [{"prompt": "쿠오모의 말에서 이 혜택은 누구의 후원을 받나요?", "options": ["납세자", "대리 줄 서기 사업자만"], "answer": "납세자"}, {"prompt": "그는 누구의 권리가 침해된다고 했나요?", "options": ["뉴요커의 권리", "대리 줄 서기 사업자의 권리"], "answer": "뉴요커의 권리"}], "retest": {"prompt": "쿠오모의 말과 같은 뜻은?", "options": ["세금으로 마련한 혜택을 뉴욕 시민이 누릴 수 있어야 한다", "대리 줄 서기 사업자가 더 많은 돈을 벌어야 한다", "공연을 보는 시민은 모두 부자여야 한다"], "answer": "세금으로 마련한 혜택을 뉴욕 시민이 누릴 수 있어야 한다"}, "review": {"prompt": "“쿠오모는 대리 줄 서기 사업자의 돈 벌 권리를 지키려 했다.” 맞나요?", "options": ["아니다. 혜택을 누릴 뉴요커의 권리를 말한다", "맞다. 사업자의 수익을 보호하려 한다", "맞다. 극장의 표값을 올리려 한다"], "answer": "아니다. 혜택을 누릴 뉴요커의 권리를 말한다"}, "why": "쿠오모는 납세자의 후원, 즉 세금으로 마련된 혜택을 뉴요커가 누릴 권리를 말해요. 무료여야 할 표를 파는 행위가 그 권리를 침해한다고 보았습니다.", "valid": ["L03:5"], "recall": {"prompt": "쿠오모는 세금으로 마련된 혜택을 누릴 누구의 권리를 말했나요?", "accept": ["뉴요커", "뉴요커의권리", "뉴욕시민", "뉴욕시민의권리", "뉴요커들", "뉴욕시민들"], "reject": ["사업자", "극장", "대리줄서기사업자", "암표상"]}, "evidence": {"prompt": "쿠오모가 반대한 이유를 담은 묶음을 골라 보세요.", "groups": [["L03:1", "L03:2"], ["L03:3", "L03:4", "L03:5"], ["L03:6"]], "correct": [1], "reasons": ["이 묶음은 극장의 주장과 사명을 설명해요. 질문에서 묻는 사람은 쿠오모예요.", "", "마지막 문장은 글쓴이가 던지는 질문이에요. 쿠오모가 반대한 이유를 직접 말하는 부분은 아니에요."]}, "rev": "53b8ec3b99baf5512fc75f5b4da942ecff5df27d3f1c99423e19d71551966e9f"}, {"id": "question", "paragraph": 3, "title": "질문으로 끝나는 문단", "main": {"prompt": "3문단 마지막에서 글쓴이는 대리 줄 서기가 잘못이라고 결론 내린다.", "options": ["O", "X"], "answer": "X"}, "narrow": [{"prompt": "마지막 문장은 어떻게 끝나나요?", "options": ["잘못일까?", "잘못이다."], "answer": "잘못일까?"}, {"prompt": "“잘못일까?”는 어떤 말인가요?", "options": ["답을 따져 보자는 질문", "이미 정한 결론"], "answer": "답을 따져 보자는 질문"}], "retest": {"prompt": "3문단 마지막 문장을 읽은 뒤 할 일은?", "options": ["뒤 글에서 이 질문을 어떻게 따지는지 살핀다", "글쓴이가 이미 반대 결론을 내렸다고 정리한다", "쿠오모가 사업을 찬성했다고 정리한다"], "answer": "뒤 글에서 이 질문을 어떻게 따지는지 살핀다"}, "review": {"prompt": "극장과 쿠오모가 반대했으니, 글쓴이도 마지막에 반대 결론을 낸 걸까요?", "options": ["아니다. 마지막에는 잘못인지 질문한다", "그렇다. 두 사람의 의견이 곧 글쓴이의 결론이다", "그렇다. 마지막 문장은 의문문이 아니다"], "answer": "아니다. 마지막에는 잘못인지 질문한다"}, "why": "극장과 쿠오모는 반대했어요. 하지만 글쓴이의 마지막 문장은 “잘못일까?”라는 질문입니다. 이 문단만으로 글쓴이가 결론을 내렸다고 보면 안 돼요.", "valid": ["L03:1", "L03:5", "L03:6"], "recall": {"prompt": "3문단의 마지막은 결론인가요, 질문인가요? 한 단어로 적어 보세요.", "accept": ["질문", "물음", "의문", "의문문", "문제제기", "질문이다"], "reject": ["결론", "반대결론", "찬성결론", "단정"]}, "rev": "018bbe9095d39ff79b72a195e750af9e355f34ecb0d2df423b595b2f765c3577"}], "diagnostic": ["free", "time", "fee", "rights", "question"], "combined": [{"prompt": "[새 예시] 학교가 축구 관람권을 무료로 줍니다. 친구에게 대신 줄을 서 달라고 하고 5천 원을 줬어요. 맞는 설명은?", "options": ["관람권은 무료지만, 대신 기다려 준 일에는 돈을 줬다", "학교가 관람권 한 장을 5천 원에 팔았다", "친구는 축구 경기를 대신 뛰어 주었다"], "answer": "관람권은 무료지만, 대신 기다려 준 일에는 돈을 줬다", "why": "관람권의 가격과 대신 기다려 준 대가는 달라요. 새 예시의 5천 원은 2문단의 수고비에 해당합니다.", "valid": ["L01:1", "L02:4"], "narrow": [{"prompt": "학교가 나눠 주는 관람권 자체는 얼마인가요?", "options": ["무료", "5천 원"], "answer": "무료"}, {"prompt": "내가 5천 원을 준 상대는 누구인가요?", "options": ["대신 줄을 서 준 친구", "학교"], "answer": "대신 줄을 서 준 친구"}], "retest": {"prompt": "[새 예시] 무료 공연 표를 대신 받아 준 언니에게 수고비를 줬어요. 그 돈은 무엇에 대한 대가인가요?", "options": ["표를 받으려고 대신 기다린 일", "극장이 연극을 보여 준 일", "무료 표에 매기는 세금"], "answer": "표를 받으려고 대신 기다린 일"}, "review": {"prompt": "[새 예시] 박물관 무료 관람권을 친구가 대신 줄 서서 받아 줬어요. 친구에게 간식값을 줬다면, 표값과 간식값을 어떻게 구별하나요?", "options": ["표는 무료이고, 간식값은 친구의 수고에 준 돈이다", "박물관이 간식값만큼 입장료를 받은 것이다", "친구가 표를 인쇄한 비용을 받은 것이다"], "answer": "표는 무료이고, 간식값은 친구의 수고에 준 돈이다"}, "rev": "548e16562f7d82a79ed57c2dd1f00416ea304a66f645e9ca34749bcd984b3646"}, {"prompt": "1~3문단을 읽고 “반대하는 사람도 있으니 잘못인지 따져 보자”라고 정리했어요. 이 말과 가장 가까운 부분은?", "options": ["글쓴이가 마지막에 던진 질문", "극장이 받기로 한 관람료", "쿠오모가 사업자를 칭찬한 말"], "answer": "글쓴이가 마지막에 던진 질문", "why": "극장과 쿠오모의 반대가 소개된 뒤, 글쓴이는 대리 줄 서기나 암표 판매가 잘못인지 질문해요. 아직 찬반 결론을 내린 부분은 아닙니다.", "valid": ["L03:6"], "narrow": [{"prompt": "마지막 문장에 붙은 문장부호는 무엇인가요?", "options": ["물음표", "마침표"], "answer": "물음표"}, {"prompt": "잘못인지 묻는 말과 잘못이라고 정한 말은 같나요?", "options": ["다르다. 묻는 말은 아직 결론이 아니다", "같다. 물으면 이미 결론을 정한 것이다"], "answer": "다르다. 묻는 말은 아직 결론이 아니다"}], "retest": {"prompt": "“극장과 쿠오모가 반대했다” 다음에 필자는 무엇을 하나요?", "options": ["정말 잘못인지 물음을 던진다", "쿠오모가 찬성했다고 고친다", "극장이 표를 팔도록 허락한다"], "answer": "정말 잘못인지 물음을 던진다"}, "review": {"prompt": "친구가 “3문단까지 읽었으니 글쓴이의 찬반 결론도 알겠어”라고 했어요. 어떻게 답할까요?", "options": ["아직 잘못인지 질문한 단계이므로 결론이라고 단정할 수 없어", "극장의 반대가 바로 글쓴이의 확정된 결론이야", "마지막에 물었으므로 글쓴이는 찬성한 거야"], "answer": "아직 잘못인지 질문한 단계이므로 결론이라고 단정할 수 없어"}, "rev": "9d900df731de673342cb58c6a14000a134af90b41633c425c4db56ecb6db5827"}], "diagnosticRevision": 1, "diagnosticContext": {"free": {"title": "글에 나온 공연", "text": ["여름마다 뉴욕시의 퍼블릭 시어터는 센트럴 파크에서 셰익스피어 무료 야외 공연을 연다."], "prompt": "글에 나온 야외 공연의 입장권은 무료다."}, "time": {"title": "표를 나눠 주는 때와 공연하는 때", "text": ["오후 1시부터 배포하는 저녁 공연 입장권을 받기 위해 사람들은 몇 시간 전부터 줄을 서기 시작한다."], "prompt": "오후 1시는 공연이 시작하는 시간이다."}, "fee": {"title": "어떤 상황인가요?", "text": ["연극을 보고 싶지만 줄을 설 시간이 없는 사람들이 있었어요.", "이 사람들 대신 줄을 서서 무료 입장권을 받아 주는 사업이 생겼고, 사업자는 표 한 장을 받아 줄 때마다 125달러를 받았어요."], "prompt": "이 상황에서 125달러는 무엇에 대한 돈인가요?"}, "rights": {"title": "쿠오모가 한 말", "text": ["쿠오모는 뉴욕의 검찰 총장이었어요. 그는 대신 줄을 서서 무료 입장권을 구해 주는 사업을 반대하며 이렇게 말했어요.", "“무료여야 하는 입장권을 판매하는 행위는 기관이 납세자의 후원을 받아 제공하는 혜택을 누릴 뉴요커의 권리를 침해한다.”", "납세자는 세금을 내는 사람, 뉴요커는 뉴욕 시민을 뜻해요."], "prompt": "쿠오모가 대리 줄 서기 사업을 반대한 이유는 무엇인가요?"}, "question": {"title": "판단할 문장", "text": ["“사람을 고용해 대리로 줄을 세우거나 암표를 파는 행동이 잘못일까?”"], "prompt": "이 말을 한 글쓴이는 대리 줄 서기가 잘못이라고 결론 내렸다."}}}, {"id": "unit22-p04-08", "version": 1, "title": "시장 편 두 주장 · 4~8문단", "label": "4~8문단", "covers": ["unit22-l04-quick-basic", "unit22-l05-quick-basic", "unit22-market-p04-05-basic", "unit22-l06-quick-basic", "unit22-l07-quick-basic", "unit22-l08-quick-basic", "unit22-market-p06-08-basic"], "skills": [{"id": "two-claims", "paragraph": 4, "title": "시장 편의 두 주장", "main": {"prompt": "4문단에서 시장을 옹호하는 주장은 하나뿐이다.", "options": ["O", "X"], "answer": "X"}, "narrow": [{"prompt": "4문단 두 번째 문장은 “하나는 ~, 다른 하나는 ~”으로 이어져요. 주장은 몇 개인가요?", "options": ["한 개", "두 개"], "answer": "두 개"}, {"prompt": "두 주장이 중요하게 여기는 것을 바르게 짝지은 것은?", "options": ["개인의 자유 / 행복·사회적 효용", "줄 서기의 공정성 / 극장의 사명"], "answer": "개인의 자유 / 행복·사회적 효용"}], "retest": {"prompt": "시장을 옹호하는 두 입장을 바르게 짝지은 것은?", "options": ["자유 지상주의 – 사회적 효용 / 공리주의 – 개인의 자유", "자유 지상주의 – 개인의 자유 / 공리주의 – 행복과 사회적 효용", "자유 지상주의 – 극장의 사명 / 공리주의 – 무료 공연"], "answer": "자유 지상주의 – 개인의 자유 / 공리주의 – 행복과 사회적 효용"}, "review": {"prompt": "친구가 “시장 편 주장은 결국 ‘돈을 많이 벌자’ 하나야”라고 했어요. 글과 맞나요?", "options": ["맞다. 두 입장 모두 결국 돈을 버는 것만 중요하게 여긴다", "아니다. 극장의 사명까지 더해 시장 편 주장은 세 가지다", "아니다. 개인의 자유와 행복(효용), 두 가지 주장이다"], "answer": "아니다. 개인의 자유와 행복(효용), 두 가지 주장이다"}, "why": "4문단은 시장을 옹호하는 주장이 두 가지라고 밝혀요. 하나는 개인의 자유를 존중하자는 자유 지상주의, 다른 하나는 행복이나 사회적 효용을 가장 크게 하자는 공리주의(5문단)예요.", "valid": ["L04:1", "L04:2", "L04:3"], "recall": {"prompt": "개인의 자유를 가장 중요하게 여기며 시장을 옹호하는 사람들을 글에서 무엇이라고 부르나요?", "accept": ["자유지상주의자", "자유지상주의", "자유지상주의자들", "자유지상주의자의입장"], "reject": ["공리주의자", "공리주의", "경제학자", "맨큐"]}, "rev": "d85f56c39e572722c917072c1cca4ba4d199276f47cd1d70dd4df69c335e2baa"}, {"id": "condition", "paragraph": 4, "title": "자유 지상주의에 붙은 조건", "main": {"prompt": "자유 지상주의자는 타인의 권리를 침범하더라도 원하는 재화를 자유롭게 사고팔 수 있어야 한다고 본다.", "options": ["O", "X"], "answer": "X"}, "narrow": [{"prompt": "4문단 네 번째 문장에서 “~하지 않는 한” 앞에 있는 말은?", "options": ["타인의 권리를 침범하지", "암표를 팔지"], "answer": "타인의 권리를 침범하지"}, {"prompt": "“~하지 않는 한”은 어떤 뜻인가요?", "options": ["그렇게 하더라도 상관없이", "그렇게 하지 않을 때에만"], "answer": "그렇게 하지 않을 때에만"}], "retest": {"prompt": "자유 지상주의자가 자유로운 거래에 붙인 조건은?", "options": ["국가가 법으로 허락한 물건일 때만", "사고판 결과로 모두가 행복해질 때만", "타인의 권리를 침범하지 않을 때"], "answer": "타인의 권리를 침범하지 않을 때"}, "review": {"prompt": "“자유 지상주의자는 어떤 경우에든 무엇이든 사고팔아도 된다고 한다.” 어디를 놓쳤나요?", "options": ["“타인의 권리를 침범하지 않는 한”이라는 조건", "장기 매매 금지법에는 찬성한다는 자유 지상주의자의 입장", "행복을 근거로 든다는 점에서 공리주의자와 같다는 점"], "answer": "“타인의 권리를 침범하지 않는 한”이라는 조건"}, "why": "자유 지상주의자는 “타인의 권리를 침범하지 않는 한” 원하는 재화는 무엇이든 자유롭게 사고팔 수 있어야 한다고 해요. 조건이 붙어 있으므로 ‘침범하더라도’로 바꾸면 틀린 말이 돼요.", "valid": ["L04:4"], "recall": {"prompt": "자유 지상주의자는 “○○의 권리를 침범하지 않는 한” 자유롭게 사고팔 수 있다고 했어요. ○○에 들어갈 말은?", "accept": ["타인", "타인의", "남", "다른사람", "타인의권리", "남의"], "reject": ["국가", "극장", "시장", "자신", "나"]}, "evidence": {"prompt": "자유 지상주의자가 붙인 조건이 담긴 묶음을 골라 보세요.", "groups": [["L04:1", "L04:2"], ["L04:3", "L04:4"], ["L04:5", "L04:6"]], "correct": [1], "reasons": ["이 묶음은 시장 편 주장이 두 가지라고 소개해요. 자유 지상주의자의 조건은 아직 나오지 않아요.", "", "이 묶음은 암표 매매 금지법에 반대하는 이유예요. 조건을 직접 말한 문장은 바로 앞에 있어요."]}, "rev": "4235c03a5e9d6a949d9a36817467a91f030d3c5e45970e75184c8f28dc7b55d4"}, {"id": "liberty-reason", "paragraph": 4, "title": "암표 금지법에 반대하는 이유", "main": {"prompt": "자유 지상주의자가 암표 매매 금지법에 반대하는 이유는?", "options": ["암표 거래가 구매자와 판매자 모두의 행복을 늘려 사회적 효용을 높이기 때문", "성인이 서로 동의해 내린 선택을 막아 개인의 자유를 침해하기 때문", "암표 가격이 공연의 가치를 가장 높게 평가하는 사람을 정확히 가려 주기 때문"], "answer": "성인이 서로 동의해 내린 선택을 막아 개인의 자유를 침해하기 때문"}, "narrow": [{"prompt": "4문단 마지막 문장에서 이런 법이 방해한다고 한 것은?", "options": ["성인이 상호 동의에 따라 내린 선택", "극장이 공연을 여는 일"], "answer": "성인이 상호 동의에 따라 내린 선택"}, {"prompt": "‘행복이나 사회적 효용’을 근거로 드는 쪽은 어느 입장인가요?", "options": ["자유 지상주의자", "공리주의자"], "answer": "공리주의자"}], "retest": {"prompt": "자유 지상주의자가 장기 매매 금지법과 암표 매매 금지법에 같은 이유로 반대하는 까닭은?", "options": ["두 법 모두 시장의 효율성을 떨어뜨리기 때문", "두 법 모두 개인의 자유를 침해한다고 믿기 때문", "두 법 모두 세금을 낭비하기 때문"], "answer": "두 법 모두 개인의 자유를 침해한다고 믿기 때문"}, "review": {"prompt": "“자유 지상주의자는 암표가 모두를 행복하게 해서 금지법에 반대한다.” 무엇이 잘못되었나요?", "options": ["자유 지상주의자는 암표 매매 금지법에 오히려 찬성한다", "행복은 공리주의의 근거다. 자유 지상주의는 개인의 자유를 든다", "틀린 곳이 없다. 자유 지상주의자도 행복을 근거로 든다"], "answer": "행복은 공리주의의 근거다. 자유 지상주의는 개인의 자유를 든다"}, "why": "자유 지상주의자는 암표 매매 금지법이 성인이 상호 동의로 내린 선택을 방해해 개인의 자유를 침해한다고 믿어요. ‘행복이나 효용이 늘어난다’는 근거는 5문단 공리주의자의 것이니 섞으면 안 돼요.", "valid": ["L04:5", "L04:6"], "recall": {"prompt": "자유 지상주의자는 암표 매매 금지법이 무엇을 침해한다고 믿나요? 짧게 적어 보세요.", "accept": ["개인의자유", "자유", "개인자유", "개인의자유를침해한다"], "reject": ["행복", "효용", "사회적효용", "뉴요커의권리"]}, "rev": "1f3562b9e00ed995e0bd74b40f123a352a0a3564af134955d30803a48be83fe0"}, {"id": "both-gain", "paragraph": 5, "title": "거래가 성립했다는 것의 뜻", "main": {"prompt": "공리주의자는 거래가 성립했다는 것을 구매자와 판매자가 모두 이익을 얻었다는 뜻으로 본다.", "options": ["O", "X"], "answer": "O"}, "narrow": [{"prompt": "125달러를 내고 사람을 고용한 사람이 행복하지 않았다면 어떻게 했을 거라고 했나요?", "options": ["더 많은 돈을 냈을 것이다", "애당초 사람을 고용하지 않았을 것이다"], "answer": "애당초 사람을 고용하지 않았을 것이다"}, {"prompt": "몇 시간 줄을 서서 125달러를 번 사람은 어떻다고 했나요?", "options": ["그도 행복을 느낀다", "손해만 본다"], "answer": "그도 행복을 느낀다"}], "retest": {"prompt": "공리주의자가 ‘둘 다 행복해졌다’고 확신하는 근거는?", "options": ["극장 측이 두 사람 모두 만족했다고 직접 발표했기 때문", "125달러가 공연 입장권 값보다 훨씬 비싸기 때문", "이익이 없었다면 애당초 거래를 하지 않았을 것이기 때문"], "answer": "이익이 없었다면 애당초 거래를 하지 않았을 것이기 때문"}, "review": {"prompt": "공리주의자는 무엇을 보고 ‘둘 다 이익을 얻었다’고 판단하나요?", "options": ["거래가 성립했다는 것", "줄을 선 시간이 길었다는 것", "입장권이 무료라는 것"], "answer": "거래가 성립했다는 것"}, "why": "5문단에서 공리주의자는 거래가 성립했다는 것 자체가 양측이 모두 이익을 얻었다는 뜻이라고 해요. 이익이 없었다면 고용한 사람도, 줄을 선 사람도 애당초 그 거래를 하지 않았을 것이라는 이유예요.", "valid": ["L05:3", "L05:5", "L05:7"], "recall": {"prompt": "거래가 구매자와 판매자 모두에게 이익을 주어 사회적 효용을 높인다고 보는 입장은 누구인가요?", "accept": ["공리주의자", "공리주의", "공리주의자들", "공리주의자의입장"], "reject": ["자유지상주의자", "자유지상주의", "암표상", "필자"]}, "evidence": {"prompt": "‘둘 다 이익을 얻었다’고 확신하는 이유가 담긴 묶음을 골라 보세요.", "groups": [["L05:1"], ["L05:2", "L05:3"], ["L05:4", "L05:5", "L05:6", "L05:7"]], "correct": [2], "reasons": ["이 문장은 두 번째 주장이 공리주의자의 입장이라고 소개만 해요.", "이 묶음은 ‘둘 다 이익’이라는 주장 자체예요. 왜 그렇게 확신하는지는 뒤 문장들에 나와요.", ""]}, "rev": "92181f5d7843b0b7df6052d14dd0cf8ad44c04dfbd880109035073d70c6973ae"}, {"id": "wtp", "paragraph": 6, "title": "가치를 재는 기준", "main": {"prompt": "시장 옹호자들은 재화의 가치를 무엇으로 재나요?", "options": ["줄을 서서 기다리려는 마음", "얼마나 지불할 의사가 있느냐", "공연을 얼마나 오래 좋아했느냐"], "answer": "얼마나 지불할 의사가 있느냐"}, "narrow": [{"prompt": "시장은 재화를 어떤 사람에게 할당한다고 했나요?", "options": ["재화에 가장 높은 가치를 매기는 사람", "줄을 가장 먼저 선 사람"], "answer": "재화에 가장 높은 가치를 매기는 사람"}, {"prompt": "6문단 마지막 문장에서 그 기준은 무엇으로 측정한다고 했나요?", "options": ["얼마나 오래 기다리느냐", "얼마나 지불할 의사가 있느냐"], "answer": "얼마나 지불할 의사가 있느냐"}], "retest": {"prompt": "[새 예시] 같은 표를 원하는 두 사람이 있어요. 한 명은 3만 원, 한 명은 5만 원까지 내겠대요. 시장 옹호자는 누가 표의 가치를 더 높게 평가한다고 볼까요?", "options": ["3만 원까지 내겠다는 사람", "먼저 줄을 선 사람", "5만 원까지 내겠다는 사람"], "answer": "5만 원까지 내겠다는 사람"}, "review": {"prompt": "“시장 옹호자들은 가장 오래 기다린 사람이 표를 가장 소중히 여긴다고 본다.” 어디가 틀렸나요?", "options": ["기준을 지불 의사에서 기다림으로 바꿨다", "시장 옹호자를 경제학자라고 불렀다", "표를 재화라고 불렀다"], "answer": "기준을 지불 의사에서 기다림으로 바꿨다"}, "why": "6문단에서 시장은 재화에 가장 높은 가치를 매기는 사람에게 재화를 할당하고, 그 기준을 ‘얼마나 지불할 의사가 있느냐’로 측정한다고 해요. 기다림을 기준으로 삼는 것은 줄 서기 쪽이에요.", "valid": ["L06:3", "L06:4"], "recall": {"prompt": "시장 옹호자들은 재화의 가치를 ‘얼마나 ○○할 의사가 있느냐’로 잰다고 했어요. ○○에 들어갈 말은?", "accept": ["지불", "지불할", "돈을지불", "돈을낼", "돈을지불할"], "reject": ["기다릴", "기다림", "줄을설", "관람할"]}, "rev": "00ff2b0c1db0f4baa980cae993ae55ced50047276d99106d8d6960262508964b"}, {"id": "mankiw", "paragraph": 7, "title": "맨큐가 암표를 예로 든 까닭", "main": {"prompt": "맨큐는 암표상이 나쁘다는 것을 보여 주려고 암표 거래를 예로 들었다.", "options": ["O", "X"], "answer": "X"}, "narrow": [{"prompt": "맨큐는 암표 판매를 예로 들어 무엇을 설명하나요?", "options": ["자유 시장의 미덕", "암표상의 잘못"], "answer": "자유 시장의 미덕"}, {"prompt": "맨큐는 암표 거래가 무엇을 나타내는 예라고 했나요?", "options": ["시장이 실패하는 방식", "시장이 효율적 결론에 도달하는 방식"], "answer": "시장이 효율적 결론에 도달하는 방식"}], "retest": {"prompt": "맨큐의 말로 볼 때, 암표상이 하는 일은?", "options": ["표를 공짜로 나눠 주어 누구나 공연을 볼 수 있게 보장한다", "가장 높은 값을 낼 의사가 있는 소비자가 표를 갖게 보장한다", "표 가격을 가장 낮게 매겨 돈이 없는 사람도 표를 사게 한다"], "answer": "가장 높은 값을 낼 의사가 있는 소비자가 표를 갖게 보장한다"}, "review": {"prompt": "“맨큐는 암표 거래를 시장이 재화를 비효율적으로 나누는 예로 든다.” 맞나요?", "options": ["맞다. 암표는 비효율의 예다", "아니다. 맨큐는 암표를 언급하지 않는다", "아니다. 시장이 효율적 결론에 도달하는 예로 든다"], "answer": "아니다. 시장이 효율적 결론에 도달하는 예로 든다"}, "why": "맨큐는 암표 판매를 예로 들어 자유 시장의 미덕을 설명해요. 암표상은 시장이 감당할 수 있는 최고 가격을 매겨, 가장 높은 값을 낼 소비자가 표를 갖게 하므로 시장이 효율적 결론에 이르는 예라는 거예요.", "valid": ["L07:1", "L07:5"], "recall": {"prompt": "맨큐는 암표 거래를 시장이 어떤 결론에 도달하는 예라고 했나요? (○○적 결론)", "accept": ["효율", "효율적", "효율적결론", "효율적인결론"], "reject": ["비효율", "비효율적", "불공정", "공정"]}, "rev": "dfeef6c75358c2f8e909f660718a67b0516d05518f662d7dc8bb4a07c331de15"}, {"id": "if-claim", "paragraph": 8, "title": "‘맞는다면’으로 끌어낸 결론", "main": {"prompt": "8문단에서 필자는 암표상을 칭찬해야 한다고 직접 주장한다.", "options": ["O", "X"], "answer": "X"}, "narrow": [{"prompt": "8문단 첫 문장은 어떤 말로 시작하나요?", "options": ["자유 시장을 옹호하는 주장이 맞는다면", "자유 시장을 옹호하는 주장은 틀렸으므로"], "answer": "자유 시장을 옹호하는 주장이 맞는다면"}, {"prompt": "[새 예시] “내일 비가 온다면 경기는 취소된다.” 이 말을 한 사람은 내일 비가 온다고 확신한 건가요?", "options": ["그렇다. 비가 온다고 확신했다", "아니다. 비가 온다고 가정해 본 것이다"], "answer": "아니다. 비가 온다고 가정해 본 것이다"}], "retest": {"prompt": "8문단의 ‘칭찬해야 마땅하다’는 어떤 말인가요?", "options": ["필자가 근거를 들어 확신하는 자신의 최종 결론", "필자가 12문단에서 그대로 받아들이는 결론", "시장 편 주장이 맞다고 가정해 본 결론"], "answer": "시장 편 주장이 맞다고 가정해 본 결론"}, "review": {"prompt": "8문단 결론을 필자 자신의 주장이라고 하면 왜 틀리나요?", "options": ["‘맞는다면’이라는 가정에서 끌어낸 결론이라서", "필자는 8문단에서 암표상을 언급하지 않아서", "8문단은 극장 대변인이 한 말을 옮긴 것이라서"], "answer": "‘맞는다면’이라는 가정에서 끌어낸 결론이라서"}, "why": "8문단은 “자유 시장을 옹호하는 주장이 맞는다면”으로 시작해요. 그 주장을 가정했을 때 따라 나오는 결론을 따져 본 것이지, 필자 자신의 생각이 아니에요. 필자는 9문단부터 이 주장을 반박합니다.", "valid": ["L08:1", "L08:2"], "recall": {"prompt": "8문단의 ‘칭찬해야 마땅하다’는 필자의 생각인가요, 가정해 본 결론인가요?", "accept": ["가정", "가정해본결론", "가정한결론", "가정에서나온결론", "가정해본것", "가정한것", "가정적결론"], "reject": ["필자의생각", "필자생각", "필자의주장", "주장", "생각"]}, "rev": "7663ff5216bcedcf542ae7ded34a238715d7a893a96fc72ecd2c999627b8bba6"}], "diagnostic": ["two-claims", "condition", "liberty-reason", "wtp", "if-claim"], "diagnosticRevision": 1, "diagnosticContext": {"two-claims": {"title": "시장 편 주장 소개", "text": ["줄 서기에 관해 시장을 옹호하는 입장에는 두 가지 주장이 있다.", "하나는 개인의 자유 존중에 대한 것이고, 다른 하나는 행복이나 사회적 효용의 극대화에 대한 주장이다."], "prompt": "위 글에서 시장을 옹호하는 주장은 하나뿐이다."}, "condition": {"title": "자유 지상주의자의 생각", "text": ["자유 지상주의자들은 타인의 권리를 침범하지 않는 한 원하는 재화는 무엇이든 자유롭게 사고팔 수 있어야 한다고 주장한다."], "prompt": "자유 지상주의자는 타인의 권리를 침범하더라도 원하는 재화를 자유롭게 사고팔 수 있어야 한다고 본다."}, "liberty-reason": {"title": "암표 매매 금지법", "text": ["자유 지상주의자는 장기 매매 금지법에 반대하는 것과 같은 이유로 암표 매매 금지법에 반대한다.", "이러한 법은 성인이 상호 동의에 따라 내린 선택을 방해함으로써 개인의 자유를 침해한다고 믿기 때문이다."], "prompt": "자유 지상주의자가 암표 매매 금지법에 반대하는 이유는?"}, "wtp": {"title": "시장이 재화를 나누는 방식", "text": ["시장은 사람들이 상호 유리한 방향으로 거래하는 것을 허용함으로써, 재화에 가장 높은 가치를 매기는 사람에게 그 재화를 할당한다.", "그리고 그 기준은 얼마나 지불할 의사가 있느냐로 측정한다."], "prompt": "시장 옹호자들은 재화의 가치를 무엇으로 재나요?"}, "if-claim": {"title": "판단할 문장", "text": ["“자유 시장을 옹호하는 주장이 맞는다면, 줄 서기의 본질을 침범했다는 이유로 암표상과 대리 줄 서기를 비난해서는 안 된다. 오히려 사회적 효용을 증가시킨 공로로 칭찬해야 마땅하다.”"], "prompt": "이 문장을 쓴 글쓴이는 암표상을 칭찬해야 한다고 직접 주장한다."}}, "combined": [{"prompt": "[새 예시] 국가대표 사인 유니폼을 경매로 팔면서 “제일 많이 낸 사람이 이 유니폼을 가장 높게 평가하는 사람이니까, 이게 가장 좋은 방법”이라고 한 사람이 있어요. 4~7문단의 어느 쪽 생각과 가장 가까운가요?", "options": ["극장 대변인과 쿠오모 쪽", "공리주의자·맨큐 쪽 경제학자", "자유 지상주의자 쪽 사람들"], "answer": "공리주의자·맨큐 쪽 경제학자", "why": "지불하려는 금액을 곧 가치 평가로 보는 생각은 6~7문단의 경제학자(공리주의 쪽)와 같아요. 맨큐도 시장이 가치를 가장 높게 평가하는 구매자에게 재화를 준다고 했어요. 자유 지상주의자는 ‘가치’가 아니라 ‘개인의 자유’를 근거로 들어요.", "valid": ["L06:3", "L06:4", "L07:3"], "sources": ["L06", "L07"], "narrow": [{"prompt": "이 사람은 ‘개인의 자유’를 말하나요, ‘가치를 가장 높게 평가하는 사람’을 말하나요?", "options": ["개인의 자유", "가치를 가장 높게 평가하는 사람"], "answer": "가치를 가장 높게 평가하는 사람"}, {"prompt": "재화의 가치를 지불 의사로 재는 쪽은?", "options": ["시장을 옹호하는 경제학자", "줄 서기를 옹호하는 쪽"], "answer": "시장을 옹호하는 경제학자"}], "retest": {"prompt": "[새 예시] 한정판 운동화를 최고가 입찰자에게 파는 것이 “가장 원하는 사람에게 가는 효율적 방법”이라는 주장은 누구의 논리와 같나요?", "options": ["극장 측의 사명", "맨큐의 논리", "쿠오모의 주장"], "answer": "맨큐의 논리"}, "review": {"prompt": "[새 예시] “제일 비싸게 산 사람이 그 물건을 제일 아낀다”는 말을 4~7문단 말로 바꾸면?", "options": ["지불할 의사가 클수록 재화의 가치를 높게 평가한다", "기다릴 의사가 클수록 재화를 아낀다", "타인의 권리를 침범하지 않는 한 사고판다"], "answer": "지불할 의사가 클수록 재화의 가치를 높게 평가한다"}, "rev": "1d02921ebd572cf216ad11d86eab0a27281490df0bd469e74f9aee0af5678caf"}, {"prompt": "4~8문단을 읽고 “시장 편 주장이 맞다면 암표상을 칭찬해야 한다는 데까지 갈 수 있다”라고 정리했어요. 이 정리에 대한 설명으로 맞는 것은?", "options": ["필자가 글 전체에서 최종적으로 내린 결론을 정리한 것이다", "필자가 시장 편 주장에서 끌어낸 가정적 결론을 정리한 것이다", "극장 측이 대리 줄 서기에 대해 내린 결론을 정리한 것이다"], "answer": "필자가 시장 편 주장에서 끌어낸 가정적 결론을 정리한 것이다", "why": "4~7문단은 시장 편의 두 주장과 맨큐의 설명을 소개하고, 8문단은 그 주장이 맞는다면 어떤 결론이 나오는지 따져 봐요. 필자는 9문단부터 이 주장을 반박합니다.", "valid": ["L04:1", "L08:1", "L08:2"], "sources": ["L04", "L08"], "narrow": [{"prompt": "4~7문단에서 소개한 생각은 누구의 생각인가요?", "options": ["시장을 옹호하는 사람들", "필자 자신"], "answer": "시장을 옹호하는 사람들"}, {"prompt": "8문단은 ‘~이 맞는다면’으로 시작해요. 이것은?", "options": ["확정된 결론", "가정"], "answer": "가정"}], "retest": {"prompt": "8문단 다음에 필자는 무엇을 하나요?", "options": ["시장 편 주장이 옳다고 보고 그대로 받아들인다", "암표상을 칭찬하는 법을 만들자고 제안한다", "줄 서기의 도덕성 측면에서 반대 근거를 살핀다"], "answer": "줄 서기의 도덕성 측면에서 반대 근거를 살핀다"}, "review": {"prompt": "친구가 “필자는 시장 편이야. 8문단에서 암표상을 칭찬하잖아”라고 했어요. 어떻게 답할까요?", "options": ["8문단은 가정해 본 결론이고, 필자는 뒤에서 반박해", "맞아. 필자는 끝까지 시장 편 주장을 지지해", "8문단은 쿠오모가 사업자를 칭찬한 말이야"], "answer": "8문단은 가정해 본 결론이고, 필자는 뒤에서 반박해"}, "rev": "88bf19e9dc424c17e7584c5991ae64765df46d7874a445951d716e8a1da4b42b"}], "sources": {"L04": {"id": "L04", "title": "줄 서기를 돈으로 살 수 있을까", "label": "4문단", "text": "줄 서기에 관해 시장을 옹호하는 입장에는 두 가지 주장이 있다. 하나는 개인의 자유 존중에 대한 것이고, 다른 하나는 행복이나 사회적 효용의 극대화에 대한 주장이다. 첫 번째는 자유 지상주의자의 입장이다. 그들은 타인의 권리를 침범하지 않는 한 원하는 재화는 무엇이든 자유롭게 사고팔 수 있어야 한다고 주장한다. 자유 지상주의자는 장기 매매 금지법에 반대하는 것과 같은 이유로 암표 매매 금지법에 반대한다. 이러한 법은 성인이 상호 동의에 따라 내린 선택을 방해함으로써 개인의 자유를 침해한다고 믿기 때문이다.", "sentences": [{"id": "L04:1", "text": "줄 서기에 관해 시장을 옹호하는 입장에는 두 가지 주장이 있다.", "paragraph": 0, "memberIds": ["L04:1"], "topic": "돈으로 줄을 사는 것(시장)에 찬성하는 쪽의 이유는 두 가지다."}, {"id": "L04:2", "text": "하나는 개인의 자유 존중에 대한 것이고, 다른 하나는 행복이나 사회적 효용의 극대화에 대한 주장이다.", "paragraph": 0, "memberIds": ["L04:2"], "topic": "첫째는 '개인의 자유를 존중하자'는 것이다. 둘째는 '사람들의 만족(효용)을 가장 크게 만들자'는 것이다."}, {"id": "L04:3", "text": "첫 번째는 자유 지상주의자의 입장이다.", "paragraph": 0, "memberIds": ["L04:3"], "topic": "첫째 이유는 '자유 지상주의자'의 생각이다. 개인의 자유를 무엇보다 중요하게 여기는 사람들이다."}, {"id": "L04:4", "text": "그들은 타인의 권리를 침범하지 않는 한 원하는 재화는 무엇이든 자유롭게 사고팔 수 있어야 한다고 주장한다.", "paragraph": 0, "memberIds": ["L04:4"], "topic": "그들은 이렇게 말한다. \"남의 권리를 침범하지(피해를 주지) 않는 한, 무엇이든 자유롭게 사고팔 수 있어야 한다.\""}, {"id": "L04:5", "text": "자유 지상주의자는 장기 매매 금지법에 반대하는 것과 같은 이유로 암표 매매 금지법에 반대한다.", "paragraph": 0, "memberIds": ["L04:5"], "topic": "그래서 그들은 '암표를 팔지 마라'는 법에 반대한다. '장기를 사고팔지 마라'는 법에 반대하는 것과 같은 이유에서다."}, {"id": "L04:6", "text": "이러한 법은 성인이 상호 동의에 따라 내린 선택을 방해함으로써 개인의 자유를 침해한다고 믿기 때문이다.", "paragraph": 0, "memberIds": ["L04:6"], "topic": "어른 둘이 서로 좋다고 합의한 거래를 법이 막으면, 개인의 자유를 빼앗는 것이라고 믿기 때문이다."}]}, "L05": {"id": "L05", "title": "줄 서기를 돈으로 살 수 있을까", "label": "5문단", "text": "시장을 옹호하는 두 번째 주장은 경제학자에게 좀 더 친숙한 것으로 공리주의자의 입장이다. 공리주의자는 시장에서의 거래가 구매자와 판매자에게 똑같이 이익을 제공하고, 결과적으로 집단의 행복이나 사회적 효용을 향상한다고 말한다. 돈을 지불한 사람과 돈을 받고 대리로 줄을 선 사람 사이에 거래가 성립했다는 것은 결과적으로 양측이 모두 이익을 얻었다는 뜻이다. 125달러를 내고 대리로 줄을 서 주는 사람을 고용한 사람은 줄을 서지 않고 셰익스피어 연극을 관람함으로써 틀림없이 행복을 느낀다. 그렇지 않다면 애당초 사람을 고용하지 않았을 것이다. 몇 시간 동안 줄을 서서 125달러를 번 사람도 행복을 느낀다. 그렇지 않다면 애당초 그 일을 하지 않았을 것이다.", "sentences": [{"id": "L05:1", "text": "시장을 옹호하는 두 번째 주장은 경제학자에게 좀 더 친숙한 것으로 공리주의자의 입장이다.", "paragraph": 0, "memberIds": ["L05:1"], "topic": "둘째 이유는 '공리주의자'의 생각이다. 경제학자들이 자주 쓰는 생각이다. 공리주의는 '사람들 행복의 합을 가장 크게 만들자'는 생각이다."}, {"id": "L05:2", "text": "공리주의자는 시장에서의 거래가 구매자와 판매자에게 똑같이 이익을 제공하고, 결과적으로 집단의 행복이나 사회적 효용을 향상한다고 말한다.", "paragraph": 0, "memberIds": ["L05:2"], "topic": "공리주의자는 이렇게 말한다. \"거래를 하면 사는 사람도 이득이고 파는 사람도 이득이다. 그러니 사회 전체의 행복(효용)이 커진다.\""}, {"id": "L05:3", "text": "돈을 지불한 사람과 돈을 받고 대리로 줄을 선 사람 사이에 거래가 성립했다는 것은 결과적으로 양측이 모두 이익을 얻었다는 뜻이다.", "paragraph": 0, "memberIds": ["L05:3"], "topic": "돈 낸 사람과 대신 줄 선 사람이 거래를 했다. 거래를 했다는 건 결과적으로 둘 다 이익을 얻었다는 뜻이다."}, {"id": "L05:4", "text": "125달러를 내고 대리로 줄을 서 주는 사람을 고용한 사람은 줄을 서지 않고 셰익스피어 연극을 관람함으로써 틀림없이 행복을 느낀다.", "paragraph": 0, "memberIds": ["L05:4"], "topic": "125달러를 낸 사람은 줄을 안 서고도 연극을 본다. 그러니 분명히 행복하다."}, {"id": "L05:5", "text": "그렇지 않다면 애당초 사람을 고용하지 않았을 것이다.", "paragraph": 0, "memberIds": ["L05:5"], "topic": "행복하지 않았다면 처음부터 돈을 내지 않았을 것이다."}, {"id": "L05:6", "text": "몇 시간 동안 줄을 서서 125달러를 번 사람도 행복을 느낀다.", "paragraph": 0, "memberIds": ["L05:6"], "topic": "몇 시간 줄을 서고 125달러를 번 사람도 행복하다."}, {"id": "L05:7", "text": "그렇지 않다면 애당초 그 일을 하지 않았을 것이다.", "paragraph": 0, "memberIds": ["L05:7"], "topic": "싫었으면 처음부터 그 일을 안 했을 것이다."}]}, "L06": {"id": "L06", "title": "줄 서기를 돈으로 살 수 있을까", "label": "6문단", "text": "이렇게 시장 거래의 결과로 구매자와 판매자는 모두 행복해지고 효용은 증가한다. 이것이 바로 자유 시장이 재화를 효율적으로 분배한다고 주장하는 경제학자들의 입장이다. 시장은 사람들이 상호 유리한 방향으로 거래하는 것을 허용함으로써, 재화에 가장 높은 가치를 매기는 사람에게 그 재화를 할당한다. 그리고 그 기준은 얼마나 지불할 의사가 있느냐로 측정한다.", "sentences": [{"id": "L06:1", "text": "이렇게 시장 거래의 결과로 구매자와 판매자는 모두 행복해지고 효용은 증가한다.", "paragraph": 0, "memberIds": ["L06:1"], "topic": "정리하면, 거래 덕분에 사는 사람도 파는 사람도 행복해지고 만족(효용)이 커진다."}, {"id": "L06:2", "text": "이것이 바로 자유 시장이 재화를 효율적으로 분배한다고 주장하는 경제학자들의 입장이다.", "paragraph": 0, "memberIds": ["L06:2"], "topic": "그래서 경제학자들은 \"시장에 맡기면 물건(재화)이 낭비 없이 가장 알맞게(효율적으로) 나뉜다.\"라고 말한다."}, {"id": "L06:3", "text": "시장은 사람들이 상호 유리한 방향으로 거래하는 것을 허용함으로써, 재화에 가장 높은 가치를 매기는 사람에게 그 재화를 할당한다.", "paragraph": 0, "memberIds": ["L06:3"], "topic": "시장에서는 서로 이득이 되는 거래를 자유롭게 할 수 있다. 그러면 물건은 그 물건을 가장 귀하게 여기는 사람에게 간다."}, {"id": "L06:4", "text": "그리고 그 기준은 얼마나 지불할 의사가 있느냐로 측정한다.", "paragraph": 0, "memberIds": ["L06:4"], "topic": "그런데 '누가 가장 귀하게 여기는지'는 '누가 돈을 가장 많이 낼 마음이 있는지'로 잰다."}]}, "L07": {"id": "L07", "title": "줄 서기를 돈으로 살 수 있을까", "label": "7문단", "text": "미국에서 가장 널리 쓰이는 경제학 교과서 중 한 권을 저술한 경제학자 그레고리 맨큐(Gregory Mankiw)는 암표 판매를 예로 들어 자유 시장의 미덕을 설명한다. 경제적 효율성이란 사회 구성원 전체의 경제적 행복을 극대화하는 방식으로 재화를 분배하는 것이다. 맨큐는 자유 시장이 얼마만큼의 돈을 지불할 의사가 있느냐를 기준으로 재화의 가치를 가장 높게 평가하는 구매자에게 재화를 공급함으로써 이러한 목적에 기여한다고 주장한다. 그는 암표 거래 현상을 예로 들면서 이렇게 말했다. “부족한 자원을 효율적으로 분배하려면, 재화는 그 가치를 가장 높게 평가하는 소비자에게 돌아가야 한다. 암표 거래가 바로 시장이 효율적 결론에 도달하는 방식을 나타내는 예다. …… 암표상은 표에 시장이 감당할 수 있는 최고 가격을 매김으로써, 가장 높은 가격을 지불할 의사가 있는 소비자가 실제로 표를 손에 넣을 수 있도록 보장한다.”", "sentences": [{"id": "L07:1", "text": "미국에서 가장 널리 쓰이는 경제학 교과서 중 한 권을 저술한 경제학자 그레고리 맨큐(Gregory Mankiw)는 암표 판매를 예로 들어 자유 시장의 미덕을 설명한다.", "paragraph": 0, "memberIds": ["L07:1"], "topic": "맨큐는 미국에서 가장 널리 쓰이는 경제학 교과서 중 하나를 쓴 경제학자다. 그는 암표를 예로 들어 시장의 좋은 점(미덕)을 설명한다."}, {"id": "L07:2", "text": "경제적 효율성이란 사회 구성원 전체의 경제적 행복을 극대화하는 방식으로 재화를 분배하는 것이다.", "paragraph": 0, "memberIds": ["L07:2"], "topic": "'경제적 효율성'이란 사회 모든 사람의 경제적 행복이 가장 커지도록 물건을 나누는 것이다."}, {"id": "L07:3", "text": "맨큐는 자유 시장이 얼마만큼의 돈을 지불할 의사가 있느냐를 기준으로 재화의 가치를 가장 높게 평가하는 구매자에게 재화를 공급함으로써 이러한 목적에 기여한다고 주장한다.", "paragraph": 0, "memberIds": ["L07:3"], "topic": "시장은 '얼마 낼 마음이 있나'를 기준으로 삼는다. 그 기준으로 물건을 가장 귀하게 여기는 사람에게 준다. 그래서 시장은 모두의 행복을 키우는 데(효율성) 도움이 된다. 맨큐는 이렇게 주장한다."}, {"id": "L07:4", "text": "그는 암표 거래 현상을 예로 들면서 이렇게 말했다.", "paragraph": 0, "memberIds": ["L07:4"], "topic": "그는 암표를 예로 들어 이렇게 말했다."}, {"id": "L07:5", "text": "“부족한 자원을 효율적으로 분배하려면, 재화는 그 가치를 가장 높게 평가하는 소비자에게 돌아가야 한다. 암표 거래가 바로 시장이 효율적 결론에 도달하는 방식을 나타내는 예다. …… 암표상은 표에 시장이 감당할 수 있는 최고 가격을 매김으로써, 가장 높은 가격을 지불할 의사가 있는 소비자가 실제로 표를 손에 넣을 수 있도록 보장한다.”", "paragraph": 0, "memberIds": ["L07:5", "L07:6", "L07:7"], "topic": "\"물건이 모자랄 때 잘 나누려면, 그 물건을 가장 귀하게 여기는 사람이 가져야 한다."}]}, "L08": {"id": "L08", "title": "줄 서기를 돈으로 살 수 있을까", "label": "8문단", "text": "자유 시장을 옹호하는 주장이 맞는다면, 줄 서기의 본질을 침범했다는 이유로 암표상과 대리 줄 서기를 비난해서는 안 된다. 오히려 가격이 낮게 책정된 재화를 가장 많은 대가를 지불하려는 사람에게 돌아가게 만들어 사회적 효용을 증가시킨 공로로 칭찬해야 마땅하다.", "sentences": [{"id": "L08:1", "text": "자유 시장을 옹호하는 주장이 맞는다면, 줄 서기의 본질을 침범했다는 이유로 암표상과 대리 줄 서기를 비난해서는 안 된다.", "paragraph": 0, "memberIds": ["L08:1"], "topic": "시장 편 주장이 맞다고 해 보자. 그러면 \"줄 서기를 망쳤다(줄 서기의 본질을 침범했다)\"며 암표상과 대리 줄 서기를 욕하면(비난하면) 안 된다."}, {"id": "L08:2", "text": "오히려 가격이 낮게 책정된 재화를 가장 많은 대가를 지불하려는 사람에게 돌아가게 만들어 사회적 효용을 증가시킨 공로로 칭찬해야 마땅하다.", "paragraph": 0, "memberIds": ["L08:2"], "topic": "앞의 가정이 맞다면 오히려 칭찬해야 한다는 결론이 나온다. 가장 많은 돈을 내려는 사람에게 표를 보내 사회 전체의 만족을 키웠다는 이유다. 필자가 조건 없이 칭찬하는 말은 아니다."}]}}}, {"id": "unit22-p09-15", "version": 1, "title": "반박 1·2단계 · 9~15문단", "label": "9~15문단", "covers": ["unit22-l09-quick-basic", "unit22-l10-quick-basic", "unit22-challenge-p09-10-basic", "unit22-l11-quick-basic", "unit22-l12-quick-basic", "unit22-challenge-p11-12-basic", "unit22-l13-quick-basic", "unit22-l14-quick-basic", "unit22-l15-quick-basic", "unit22-challenge-p13-15-basic"], "skills": [{"id": "spokesman", "paragraph": 9, "title": "대변인이 댄 두 근거", "main": {"prompt": "대변인은 대리 줄 서기와 암표 판매가 공연을 간절히 보고 싶은 사람에게서 좌석과 입장권을 빼앗는다고 했다.", "options": ["O", "X"], "answer": "O"}, "narrow": [{"prompt": "9문단 따옴표 안 첫 문장에서 좌석과 입장권을 빼앗긴다는 사람은?", "options": ["대신 줄을 서 주는 사람", "공연을 간절하게 보고 싶어 하는 사람"], "answer": "공연을 간절하게 보고 싶어 하는 사람"}, {"prompt": "따옴표 안 두 번째 문장에서 극장 측이 원한다고 한 것은?", "options": ["사람들이 공연을 무료로 관람하는 것", "사람들이 공연을 비싸게 관람하는 것"], "answer": "사람들이 공연을 무료로 관람하는 것"}], "retest": {"prompt": "대변인이 댄 근거 두 가지로 맞는 것은?", "options": ["암표가 극장의 세금 수입을 줄인다 / 공연을 유료로 바꾸고 싶다", "간절한 사람에게서 좌석을 빼앗는다 / 사람들이 무료로 관람하기를 원한다", "대리 줄 서기는 불법이다 / 표값을 올려 극장 수입을 늘리고 싶다"], "answer": "간절한 사람에게서 좌석을 빼앗는다 / 사람들이 무료로 관람하기를 원한다"}, "review": {"prompt": "“대변인은 암표 판매가 극장의 수입을 줄인다고 반대했다.” 맞나요?", "options": ["맞다. 표를 팔지 못해 극장 수입이 줄어드는 것이 이유다", "아니다. 암표상이 세금을 내지 않는다는 것이 이유다", "아니다. 간절한 사람의 좌석을 빼앗아서 반대했다"], "answer": "아니다. 간절한 사람의 좌석을 빼앗아서 반대했다"}, "why": "9문단에서 대변인은 대리 줄 서기와 암표 판매가 공연을 간절히 보고 싶은 사람에게서 좌석과 입장권을 빼앗는다고 했고, 사람들이 공연을 무료로 관람하기를 원한다고 말했어요.", "valid": ["L09:3", "L09:4"], "recall": {"prompt": "대변인은 사람들이 공연을 어떻게 관람하기를 원한다고 했나요?", "accept": ["무료", "무료로", "공짜로", "공짜", "무료관람"], "reject": ["유료", "유료로", "비싸게", "돈을내고"]}, "rev": "cbeb13a95479aaa7f91b70d4d51cabf65b47d558c78285e83a15cc43f5455d3c"}, {"id": "perhaps", "paragraph": 10, "title": "필자의 해석과 ‘아마도’", "main": {"prompt": "대변인은 “암표 거래는 불공정하다”라고 직접 말했다.", "options": ["O", "X"], "answer": "X"}, "narrow": [{"prompt": "10문단 첫 문장은 어떤 말로 시작하나요?", "options": ["분명히", "아마도"], "answer": "아마도"}, {"prompt": "‘아마도 ~이리라’는 누구의 생각을 나타내나요?", "options": ["필자가 대변인의 뜻을 추측한 것", "대변인이 직접 한 말"], "answer": "필자가 대변인의 뜻을 추측한 것"}], "retest": {"prompt": "10문단에서 필자는 대변인의 말을 어떻게 해석했나요?", "options": ["암표는 극장의 사명과는 아무 상관이 없는 일이다", "암표는 표를 사고판 사람 모두를 행복하게 한다", "암표는 125달러를 낼 여유가 없는 사람에게 불공정하다"], "answer": "암표는 125달러를 낼 여유가 없는 사람에게 불공정하다"}, "review": {"prompt": "10문단의 “이 주장은 설득력이 있다”에서 ‘이 주장’은 무엇인가요?", "options": ["자유 시장 옹호자의 재반박", "암표가 경제적 여유가 없는 사람에게 불공정하다는 주장", "줄 서기가 시간이 많은 사람에게 유리하다는 비판"], "answer": "암표가 경제적 여유가 없는 사람에게 불공정하다는 주장"}, "why": "10문단은 “아마도”로 시작해요. 대변인이 직접 ‘불공정’이라고 말한 것이 아니라, 필자가 대변인의 의도를 그렇게 추측한 거예요. 필자는 이 공정성 주장이 설득력이 있다고 인정합니다.", "valid": ["L10:1", "L10:3"], "recall": {"prompt": "필자는 대변인의 의도를, 암표 거래가 경제적 여유가 없는 사람에게 ○○○한 행위라는 것으로 보았어요. ○○○에 들어갈 말은?", "accept": ["불공정", "불공정한", "불공평", "불공평한"], "reject": ["공정", "공정한", "효율적", "비효율적"]}, "rev": "d8e61c176087abe571650cb29de9f92bb183573c2a9e7620ea754f7f2cf0da10"}, {"id": "market-reply", "paragraph": 11, "title": "11문단은 누구의 말인가", "main": {"prompt": "11문단의 “최고 가격을 지불하는 사람이 공연의 가치를 가장 높게 평가한다”는 생각은 누구의 것인가요?", "options": ["필자가 직접 내린 결론", "극장 대변인이 한 말", "시장 옹호자의 예상 반응"], "answer": "시장 옹호자의 예상 반응"}, "narrow": [{"prompt": "11문단 첫 문장의 주어는 누구인가요?", "options": ["극장 측", "자유 시장 옹호자들"], "answer": "자유 시장 옹호자들"}, {"prompt": "“~ 반응을 보일 수 있다”는 어떤 말인가요?", "options": ["앞으로 나올 수 있는 반응을 예상한 말", "필자가 확정한 결론"], "answer": "앞으로 나올 수 있는 반응을 예상한 말"}], "retest": {"prompt": "11문단에서 자유 시장 옹호자들이 내놓을 것으로 예상한 제안은?", "options": ["시장 가격에 팔거나 암표상 판매를 허용하자", "입장권을 모두 선착순 무료로 나눠 주자", "대리 줄 서기를 법으로 금지하자"], "answer": "시장 가격에 팔거나 암표상 판매를 허용하자"}, "review": {"prompt": "O/X: “필자는 최고 가격을 내는 사람이 공연의 가치를 가장 높게 평가한다고 본다.”", "options": ["O", "X"], "answer": "X"}, "why": "11문단은 “자유 시장 옹호자들은 다음과 같은 반응을 보일 수 있다”로 시작해요. 최고 가격을 내는 사람이 가치를 가장 높게 평가한다는 것은 필자가 예상한 시장 편의 반응이고, 필자는 12문단에서 이를 반박해요.", "valid": ["L11:1", "L11:3", "L11:6"], "recall": {"prompt": "11문단에서 ‘다음과 같은 반응’을 보일 수 있다고 한 사람들은 누구인가요?", "accept": ["자유시장옹호자", "자유시장옹호자들", "시장옹호자", "시장옹호자들", "시장편", "시장을옹호하는사람"], "reject": ["필자", "극장", "대변인", "쿠오모"]}, "evidence": {"prompt": "이 생각이 누구의 말인지 알려 주는 문장을 골라 보세요.", "groups": [["L11:1"], ["L11:2", "L11:3"], ["L11:4", "L11:5", "L11:6"]], "correct": [0], "reasons": ["", "이 묶음은 반응의 내용이에요. 누가 이 반응을 보이는지는 바로 앞 문장에 나와요.", "이 묶음은 시장 옹호자의 결론과 제안이에요. 말하는 사람이 누구인지는 첫 문장에서 밝혀요."]}, "rev": "fc77ad0617bfa192d4a10c00f51fb0cd50c10f886f5dda4b82685fa2e25e55e2"}, {"id": "not-convincing", "paragraph": 12, "title": "‘설득력이 없다’의 대상", "sources": ["L11", "L12"], "main": {"prompt": "12문단의 “이러한 주장은 설득력이 없다”는 10문단의 공정성 주장을 가리킨다.", "options": ["O", "X"], "answer": "X"}, "narrow": [{"prompt": "‘이러한’은 보통 어디를 가리키나요?", "options": ["바로 앞 문단", "글의 첫 문단"], "answer": "바로 앞 문단"}, {"prompt": "12문단 바로 앞 11문단은 누구의 말이었나요?", "options": ["필자가 공정성을 인정한 말", "필자가 예상한 자유 시장 옹호자의 반응"], "answer": "필자가 예상한 자유 시장 옹호자의 반응"}], "retest": {"prompt": "10문단 ‘설득력이 있다’와 12문단 ‘설득력이 없다’가 가리키는 주장을 바르게 짝지은 것은?", "options": ["10: 시장 옹호자의 재반박 / 12: 공정성 주장", "10: 공정성 주장 / 12: 시장 옹호자의 재반박", "10과 12 모두 공정성 주장"], "answer": "10: 공정성 주장 / 12: 시장 옹호자의 재반박"}, "review": {"prompt": "“필자는 10문단에서 인정한 공정성 주장을 12문단에서 뒤집는다.” 맞나요?", "options": ["맞다. 필자는 10문단과 달리 12문단에서 생각을 바꾼다", "아니다. 12문단이 반박하는 것은 9문단 대변인의 말이다", "아니다. 12문단이 반박하는 것은 11문단의 시장 편 반응이다"], "answer": "아니다. 12문단이 반박하는 것은 11문단의 시장 편 반응이다"}, "why": "12문단의 “이러한 주장”은 바로 앞 11문단, 즉 필자가 예상한 자유 시장 옹호자의 반응을 가리켜요. 10문단의 공정성 주장은 필자가 설득력이 있다고 인정한 것이에요.", "valid": ["L11:1", "L12:1"], "recall": {"prompt": "12문단 첫 문장 “이러한 주장은 설득력이 없다”는 누구의 주장을 반박하나요?", "accept": ["자유시장옹호자", "자유시장옹호자들", "시장옹호자", "시장옹호자들", "시장옹호자의반응", "자유시장옹호자의주장", "시장편", "11문단"], "reject": ["대변인", "공정성주장", "10문단", "필자", "극장"]}, "rev": "86b7c9c05b6e9108f66f5e01170e002e62b4820a2890900a80d0feb78a2c50b5"}, {"id": "two-in-price", "paragraph": 12, "title": "시장 가격에 들어 있는 두 가지", "main": {"prompt": "시장 가격에는 지불하려는 마음만 반영된다.", "options": ["O", "X"], "answer": "X"}, "narrow": [{"prompt": "[새 예시] 공연을 정말 보고 싶지만 지갑이 비어 있다면, 그 사람은 비싼 표를 살 수 있나요?", "options": ["살 수 있다", "살 수 없다"], "answer": "살 수 없다"}, {"prompt": "12문단에서 마음과 함께 가격에 반영된다고 한 것은?", "options": ["지불할 수 있는 능력", "기다릴 수 있는 시간"], "answer": "지불할 수 있는 능력"}], "retest": {"prompt": "12문단에 따르면 시장 가격에 반영되는 두 가지는?", "options": ["기다리려는 마음 + 기다릴 시간", "지불하려는 마음 + 지불할 수 있는 능력", "공연에 대한 지식 + 나이"], "answer": "지불하려는 마음 + 지불할 수 있는 능력"}, "review": {"prompt": "“기꺼이 높은 값을 내는 사람은 꼭 그 재화를 가장 높게 평가하는 사람이다.” 12문단과 맞나요?", "options": ["아니다. 낼 수 있는 능력이 반영되어 꼭 그렇지는 않다", "맞다. 값을 많이 낼수록 가치를 높게 본다", "아니다. 값을 많이 내는 사람은 공연을 싫어한다"], "answer": "아니다. 낼 수 있는 능력이 반영되어 꼭 그렇지는 않다"}, "why": "12문단은 시장 가격에 자발적으로 지불하려는 마음만큼이나 지불할 수 있는 능력도 반영된다고 해요. 그래서 기꺼이 값을 낸다고 해서 ‘꼭’ 가치를 높게 평가한다는 뜻은 아니에요. ‘전혀 아니다’로 세게 바꾸면 안 돼요.", "valid": ["L12:3", "L12:4"], "recall": {"prompt": "시장 가격에는 지불하려는 마음과 함께 무엇이 반영된다고 했나요?", "accept": ["지불할수있는능력", "능력", "지불능력", "경제적능력", "돈을낼수있는능력", "낼수있는능력", "지불할능력"], "reject": ["시간", "기다릴수있는능력", "열정", "마음"]}, "rev": "75a7864b70a704a57746da014a85e4680c67205bfc41748605dc0399be07ee0e"}, {"id": "ballpark", "paragraph": 13, "title": "야구장 사례", "main": {"prompt": "필자는 야구장 사례를 들어 비싼 관람석에 앉는 능력이 경기를 향한 열정보다 주머니 사정과 관계가 깊을 수 있다고 말한다.", "options": ["O", "X"], "answer": "O"}, "narrow": [{"prompt": "필자가 야구장에서 자주 본 사람들은 어떻게 행동했나요?", "options": ["일찍 와서 끝까지 응원했다", "늦게 와서 비싼 자리에 앉았다가 일찍 떠났다"], "answer": "늦게 와서 비싼 자리에 앉았다가 일찍 떠났다"}, {"prompt": "필자는 그 사람들이 야구를 얼마나 좋아한다고 느꼈나요?", "options": ["얼마나 좋아하는지 의심스러웠다", "정말 좋아한다고 확신했다"], "answer": "얼마나 좋아하는지 의심스러웠다"}], "retest": {"prompt": "야구장 사례가 보여 주려는 것은?", "options": ["비싼 자리에 앉는 사람일수록 야구를 가장 열정적으로 좋아한다", "젊은 팬은 선수들의 타율을 잘 몰라서 열정이 부족하다", "비싼 자리에 앉을 능력은 열정보다 주머니 사정과 관계가 깊을 수 있다"], "answer": "비싼 자리에 앉을 능력은 열정보다 주머니 사정과 관계가 깊을 수 있다"}, "review": {"prompt": "“필자는 비싼 표를 산 사람은 야구를 좋아하지 않는다고 단정한다.” 어디가 틀렸나요?", "options": ["원문은 ‘의심스럽다’, ‘~수 있다’라고만 했다", "필자는 야구장에 직접 가 본 적이 없다고 했다", "틀린 곳이 없다. 필자는 그렇게 단정한다"], "answer": "원문은 ‘의심스럽다’, ‘~수 있다’라고만 했다"}, "why": "필자는 늦게 와서 비싼 자리에 앉았다가 일찍 떠나는 사람들을 보며 야구를 얼마나 좋아하는지 의심스럽다고 해요. 그래서 비싼 관람석에 앉을 능력은 열정보다 주머니 사정과 관계가 깊을 ‘수 있다’고 말해요.", "valid": ["L13:1", "L13:2", "L13:3"], "recall": {"prompt": "비싼 관람석에 앉을 수 있는 능력은 경기를 향한 열정보다 무엇과 관계가 깊을 수 있다고 했나요?", "accept": ["주머니사정", "주머니", "경제적여유", "돈", "경제적능력", "경제사정"], "reject": ["열정", "시간", "타율", "야구지식"]}, "rev": "0091f12a1950330b9dae49576cbe2bd71763e3b282b135cb36c6f90224a06190"}, {"id": "indicator", "paragraph": 13, "title": "불완전한 지표", "main": {"prompt": "필자는 시장 가격이 불완전한 지표이므로 줄 서기는 언제나 완전한 지표라고 본다.", "options": ["O", "X"], "answer": "X"}, "narrow": [{"prompt": "13문단 마지막 문장은 어떤 말로 시작하나요?", "options": ["언제나", "어떨 때는"], "answer": "어떨 때는"}, {"prompt": "‘~ 지표일 수 있다’는 어떤 표현인가요?", "options": ["그럴 가능성을 말하는 표현", "반드시 그렇다고 단정하는 표현"], "answer": "그럴 가능성을 말하는 표현"}], "retest": {"prompt": "13문단 마지막 문장과 같은 뜻은?", "options": ["줄을 서려는 태도는 언제나 가격보다 관람을 원하는 사람을 잘 보여 준다", "줄을 서려는 태도가 관람을 정말 원하는 사람을 더 잘 보여 줄 때도 있다", "줄을 서는 사람은 모두 돈이 없어서 관람을 정말 원하는 사람이다"], "answer": "줄을 서려는 태도가 관람을 정말 원하는 사람을 더 잘 보여 줄 때도 있다"}, "review": {"prompt": "“시장 가격은 마음뿐 아니라 능력도 반영하므로, 누가 가치를 가장 높게 평가하는지 가려내기에 ○○○○ 지표다.” ○○○○에 알맞은 말은?", "options": ["완전한", "유일한", "불완전한"], "answer": "불완전한"}, "why": "13문단은 시장 가격이 지불하려는 마음뿐 아니라 능력도 반영하므로 불완전한 지표라고 해요. 그리고 ‘어떨 때는’ 줄을 서려는 태도가 더 나은 지표일 수 있다고 할 뿐, 줄 서기가 언제나 낫다고 하지는 않아요.", "valid": ["L13:5", "L13:6"], "recall": {"prompt": "필자는 시장 가격을, 누가 가치를 가장 높게 평가하는지 가려내기에 어떤 지표라고 했나요?", "accept": ["불완전한지표", "불완전한", "불완전", "불완전한지표다"], "reject": ["완전한지표", "완전한", "완벽한", "정확한"]}, "rev": "7f7b468b8e300a734064c41421e732ac4162997ea52938767d72af45f366b880"}, {"id": "queue-two", "paragraph": 14, "title": "줄 서기에 들어 있는 두 가지", "main": {"prompt": "필자는 “줄 서기는 시간이 남아도는 사람에게 유리한 차별”이라는 비판을 어떻게 받아들이나요?", "options": ["맞는 말이므로 아무 조건 없이 완전히 인정한다", "돈 많은 사람에게 유리한 시장과 같은 맥락에서만 인정한다", "줄 서기는 공평하므로 전혀 근거가 없다고 거부한다"], "answer": "돈 많은 사람에게 유리한 시장과 같은 맥락에서만 인정한다"}, "narrow": [{"prompt": "14문단 둘째 문장은 어떤 말로 시작하나요?", "options": ["맞는 말이지만", "틀린 말이므로"], "answer": "맞는 말이지만"}, {"prompt": "시장이 ‘마음 + 돈을 낼 능력’으로 나눈다면, 줄 서기는 무엇으로 나누나요?", "options": ["마음 + 지불할 능력", "마음 + 기다릴 수 있는 능력(시간)"], "answer": "마음 + 기다릴 수 있는 능력(시간)"}], "retest": {"prompt": "14문단에 따르면 줄 서기가 재화를 나누는 바탕은?", "options": ["자발적으로 지불하려는 마음과 능력", "자발적으로 기다리려는 마음과 능력", "극장이 정한 공정한 추첨 순서"], "answer": "자발적으로 기다리려는 마음과 능력"}, "review": {"prompt": "필자는 지불하려는 마음이 기다리려는 마음보다 더 나은 가치 평가 기준이라고 보나요?", "options": ["그렇다. 돈이 더 정확한 기준이다", "기다리려는 마음은 기준이 될 수 없다고 본다", "그렇게 추정할 근거가 없다고 본다"], "answer": "그렇게 추정할 근거가 없다고 본다"}, "why": "14문단에서 필자는 줄 서기가 시간이 많은 사람에게 유리하다는 비판이 “맞는 말이지만”, 시장이 돈 많은 사람에게 유리한 것과 같은 맥락에서만 그렇다고 해요. 시장이 지불하려는 마음과 능력으로 나누듯, 줄 서기는 기다리려는 마음과 능력으로 나눠요.", "valid": ["L14:2", "L14:3", "L14:4"], "recall": {"prompt": "줄 서기는 자발적으로 기다리려는 마음과 무엇을 바탕으로 재화를 나눈다고 했나요?", "accept": ["능력", "기다릴수있는능력", "기다릴능력", "시간", "기다릴수있는시간", "기다리는능력"], "reject": ["돈", "지불능력", "지불할수있는능력", "열정"]}, "evidence": {"prompt": "필자가 이 비판을 ‘일부만’ 인정한다는 근거 문장을 골라 보세요.", "groups": [["L14:1"], ["L14:2"], ["L14:3", "L14:4"]], "correct": [1], "reasons": ["이 문장은 암표 옹호자의 비판 내용이에요. 필자가 어떻게 받아들이는지는 다음 문장에 나와요.", "", "이 묶음은 줄 서기와 시장의 분배 기준을 비교해요. 인정의 범위를 정하는 말은 바로 앞 문장의 ‘맞는 말이지만’이에요."]}, "rev": "8eb3f35ad396c01cc25e8e082e72b36babc4326ba929f0de13dffb3533a3c6d1"}, {"id": "empirical", "paragraph": 15, "title": "경험적 문제", "main": {"prompt": "필자는 줄 서기가 시장보다 항상 재화를 더 잘 분배한다고 결론짓는다.", "options": ["O", "X"], "answer": "X"}, "narrow": [{"prompt": "‘경험적 문제’는 어떤 문제인가요?", "options": ["머릿속 이론만으로 미리 정할 수 있는 문제", "실제로 확인해 봐야 알 수 있는 문제"], "answer": "실제로 확인해 봐야 알 수 있는 문제"}, {"prompt": "15문단은 가치를 가장 높게 평가하는 사람에게 재화를 나누는 역할을 누가 한다고 했나요?", "options": ["시장이 할 때도 있고 줄 서기가 할 때도 있다", "언제나 줄 서기만 한다"], "answer": "시장이 할 때도 있고 줄 서기가 할 때도 있다"}], "retest": {"prompt": "15문단의 결론으로 맞는 것은?", "options": ["경제 논리로 따져 보면 시장이 줄 서기보다 항상 더 낫다", "무엇이 나은지는 미리 정할 수 없는 경험적 문제다", "줄 서기가 시장보다 관람을 원하는 사람을 항상 더 잘 가린다"], "answer": "무엇이 나은지는 미리 정할 수 없는 경험적 문제다"}, "review": {"prompt": "‘시장이 줄 서기보다 낫다’는 공리주의자의 입장에 대해 필자는 무엇이라고 했나요?", "options": ["반드시 옳다", "줄 서기보다 언제나 정확하다", "우연에 상당한 지배를 받는다"], "answer": "우연에 상당한 지배를 받는다"}, "why": "15문단에서 필자는 시장이 더 낫다는 공리주의자의 입장이 우연에 상당한 지배를 받는다고 해요. 가치를 가장 높게 평가하는 사람에게 재화를 나누는 역할은 시장이 할 때도, 줄 서기가 할 때도 있어서, 무엇이 나은지는 미리 정할 수 없는 경험적 문제라는 거예요.", "valid": ["L15:1", "L15:2", "L15:3"], "recall": {"prompt": "시장과 줄 서기 중 무엇이 더 나은지는 미리 정할 수 없는 ‘○○○ 문제’라고 했어요. ○○○에 들어갈 말은?", "accept": ["경험적", "경험적문제", "경험", "경험적인문제", "경험적인"], "reject": ["이론적", "논리적", "경제적", "추상적"]}, "rev": "7980aa4ea8f22d80e51dc4ae939746131ab971ff38d4edb0523ff88ab2779c09"}], "diagnostic": ["perhaps", "market-reply", "two-in-price", "queue-two", "empirical"], "diagnosticRevision": 1, "diagnosticContext": {"perhaps": {"title": "대변인의 말과 글쓴이의 해석", "text": ["대변인: “대리 줄 서기와 암표 판매는 공원에서 셰익스피어 공연을 간절하게 보고 싶어 하는 사람에게서 좌석과 입장권을 빼앗고 있다. 우리는 사람들이 공연을 무료로 관람하기를 원한다.”", "글쓴이: 아마도 대변인의 의도는 암표 거래는 125달러를 지불할 만한 경제적 여유가 없는 사람에게 불공정한 행위라는 것이리라."], "prompt": "대변인은 “암표 거래는 불공정하다”라고 직접 말했다."}, "market-reply": {"title": "누구의 말일까요?", "text": ["이러한 주장에 대해 자유 시장 옹호자들은 다음과 같은 반응을 보일 수 있다.", "“최고 가격을 지불하는 사람이 공연의 가치를 가장 높게 평가하는 사람이다.”"], "prompt": "따옴표 안의 생각은 누구의 것인가요?"}, "two-in-price": {"title": "시장 가격", "text": ["어떤 재화에 기꺼이 가격을 지불하려는 것이 꼭 해당 재화의 가치를 높게 평가한다는 뜻은 아니다.", "시장 가격에는 자발적으로 지불하려는 마음만큼이나 지불할 수 있는 능력도 반영된다."], "prompt": "시장 가격에는 지불하려는 마음만 반영된다."}, "queue-two": {"title": "줄 서기에 대한 비판", "text": ["암표 거래를 옹호하는 사람들은 줄 서기가 시간이 남아도는 사람들에게 유리한 차별이라고 비판한다.", "글쓴이: 맞는 말이지만, 시장이 돈 많은 사람들을 유리하게 차별한다는 말과 같은 맥락에서만 그러하다."], "prompt": "글쓴이는 이 비판을 어떻게 받아들이나요?"}, "empirical": {"title": "글쓴이의 결론", "text": ["시장이 이 역할을 더 잘 수행할지, 줄 서기가 더 잘 수행할지는 추상적인 경제적 논리에 따라 미리 결정할 수 없는 경험적 문제다."], "prompt": "글쓴이는 줄 서기가 시장보다 항상 재화를 더 잘 분배한다고 결론짓는다."}}, "combined": [{"prompt": "[새 예시] 월드컵 예선 표를 경매로만 판대요. 12문단의 ‘마음’과 ‘능력’으로 볼 때 생길 수 있는 문제는?", "options": ["돈을 많이 낸 팬일수록 축구를 가장 사랑하는 팬이 된다", "가장 간절한 학생 팬이라도 돈이 없으면 표를 못 구할 수 있다", "경매에서는 누구나 같은 값을 내므로 아무 문제가 없다"], "answer": "가장 간절한 학생 팬이라도 돈이 없으면 표를 못 구할 수 있다", "why": "경매 가격에는 내려는 마음만큼 낼 수 있는 능력도 반영돼요. 마음은 가장 간절해도 돈이 없는 팬은 표를 놓칠 수 있습니다.", "valid": ["L12:4", "L12:5"], "sources": ["L12"], "narrow": [{"prompt": "경매에서 표를 얻는 사람은?", "options": ["가장 일찍 온 사람", "가장 높은 값을 낸 사람"], "answer": "가장 높은 값을 낸 사람"}, {"prompt": "마음은 아주 크지만 돈이 없는 팬은 경매에서 어떻게 될까요?", "options": ["더 높은 값을 부르지 못해 밀릴 수 있다", "표를 가장 먼저 받는다"], "answer": "더 높은 값을 부르지 못해 밀릴 수 있다"}], "retest": {"prompt": "[새 예시] 인기 가수의 팬 사인회 자리를 최고가 입찰로만 나눈다면, 12문단 논리로 무엇이 문제인가요?", "options": ["사인회 시간이 길어져 가수와 팬 모두 힘들어진다", "가수가 입찰 금액을 하나도 받지 못하게 된다", "가장 아끼는 팬보다 돈을 많이 낼 수 있는 사람에게 갈 수 있다"], "answer": "가장 아끼는 팬보다 돈을 많이 낼 수 있는 사람에게 갈 수 있다"}, "review": {"prompt": "[새 예시] 동아리 공연 앞자리를 돈을 많이 낸 순서로 주면 ‘가장 보고 싶은 사람’이 앞에 앉는다는 말에, 12~13문단의 필자는 어떻게 답할까요?", "options": ["그렇다. 많이 낸 돈이 곧 가장 큰 간절함을 보여 준다", "꼭 그렇지 않다. 낸 돈에는 낼 수 있는 능력도 섞여 있다", "아니다. 돈을 많이 낸 사람은 공연을 싫어한다"], "answer": "꼭 그렇지 않다. 낸 돈에는 낼 수 있는 능력도 섞여 있다"}, "rev": "3300abdeb96b376c6e3592d7f88b544d8df5784439dc9970277825d4bb9db192"}, {"prompt": "9~15문단을 읽고 친구가 “필자는 결국 줄 서기가 시장보다 항상 낫다고 했어”라고 정리했어요. 어떻게 고쳐야 하나요?", "options": ["고칠 필요가 없다. 필자는 줄 서기가 항상 낫다고 했다", "반대로 필자는 시장이 항상 더 낫다고 결론지었다", "무엇이 나은지는 미리 정할 수 없는 경험적 문제라고 했다"], "answer": "무엇이 나은지는 미리 정할 수 없는 경험적 문제라고 했다", "why": "필자는 시장 가격이 불완전한 지표라고 하면서도, 줄 서기에 기다릴 능력이 섞여 있다는 비판을 일부 인정해요. 그래서 무엇이 나은지는 미리 정할 수 없는 경험적 문제라고 결론짓습니다.", "valid": ["L13:6", "L14:2", "L15:3"], "sources": ["L13", "L14", "L15"], "narrow": [{"prompt": "13문단 마지막 문장은 ‘언제나’로 시작하나요, ‘어떨 때는’으로 시작하나요?", "options": ["언제나", "어떨 때는"], "answer": "어떨 때는"}, {"prompt": "14문단에서 필자는 줄 서기에도 한계가 있다고 인정하나요?", "options": ["인정한다", "인정하지 않는다"], "answer": "인정한다"}], "retest": {"prompt": "9~15문단에서 필자가 시장 편에 대해 말한 것으로 맞는 것은?", "options": ["시장은 언제나 줄 서기보다 가치를 정확하게 잰다", "시장이 더 낫다는 입장은 우연에 상당한 지배를 받는다", "시장 편 주장은 공정성 문제까지 모두 옳다"], "answer": "시장이 더 낫다는 입장은 우연에 상당한 지배를 받는다"}, "review": {"prompt": "선지 “필자는 줄 서기가 시장보다 항상 재화를 더 잘 분배한다고 본다.”는 어떤 함정인가요?", "options": ["필자의 말을 남의 말로 바꾼 주체 함정", "‘어떨 때는’을 ‘항상’으로 바꾼 정도 함정", "원문 그대로 옮긴 바른 선지"], "answer": "‘어떨 때는’을 ‘항상’으로 바꾼 정도 함정"}, "rev": "34fa624e26b9726c4a2a2c0ed44176aabb88c7bfda9e3a16391a27554a1abea6"}], "sources": {"L09": {"id": "L09", "title": "줄 서기를 돈으로 살 수 있을까", "label": "9문단", "text": "그렇다면 줄 서기의 도덕성 측면에서는 어떤 주장을 펼칠 수 있을까? 대리 줄 서기와 암표 판매를 금지하려는 이유는 무엇일까? 센트럴 파크에서 열리는 셰익스피어 공연의 대변인은 다음과 같은 근거를 댔다. “대리 줄 서기와 암표 판매는 공원에서 셰익스피어 공연을 간절하게 보고 싶어 하는 사람에게서 좌석과 입장권을 빼앗고 있다. 우리는 사람들이 공연을 무료로 관람하기를 원한다.”", "sentences": [{"id": "L09:1", "text": "그렇다면 줄 서기의 도덕성 측면에서는 어떤 주장을 펼칠 수 있을까?", "paragraph": 0, "memberIds": ["L09:1"], "topic": "그럼 이제 반대로, 줄 서기가 옳다고 보는 쪽(줄 서기의 도덕성)에서는 무슨 말을 할 수 있을까?"}, {"id": "L09:2", "text": "대리 줄 서기와 암표 판매를 금지하려는 이유는 무엇일까?", "paragraph": 0, "memberIds": ["L09:2"], "topic": "대신 줄 서기와 암표를 왜 막으려는 걸까?"}, {"id": "L09:3", "text": "센트럴 파크에서 열리는 셰익스피어 공연의 대변인은 다음과 같은 근거를 댔다.", "paragraph": 0, "memberIds": ["L09:3"], "topic": "공연 측 대변인(대표로 말하는 사람)은 이렇게 말했다."}, {"id": "L09:4", "text": "“대리 줄 서기와 암표 판매는 공원에서 셰익스피어 공연을 간절하게 보고 싶어 하는 사람에게서 좌석과 입장권을 빼앗고 있다. 우리는 사람들이 공연을 무료로 관람하기를 원한다.”", "paragraph": 0, "memberIds": ["L09:4", "L09:5"], "topic": "\"대신 줄 서기와 암표는 공연을 정말 보고 싶은 사람의 자리를 빼앗는다."}]}, "L10": {"id": "L10", "title": "줄 서기를 돈으로 살 수 있을까", "label": "10문단", "text": "아마도 대변인의 의도는 암표 거래는 125달러를 지불할 만한 경제적 여유가 없는 사람에게 불공정한 행위라는 것이리라. 보통 사람은 그만큼 불리하게 되어 입장권을 손에 넣기가 더욱 힘들어진다. 이 주장은 설득력이 있다. 돈을 받고 대신 줄을 선 사람이나 암표상이 입장권을 확보했다면 그 뒤에 서 있던 사람, 즉 암표 가격을 지불할 만한 경제적 여유가 없는 사람은 손해를 본다.", "sentences": [{"id": "L10:1", "text": "아마도 대변인의 의도는 암표 거래는 125달러를 지불할 만한 경제적 여유가 없는 사람에게 불공정한 행위라는 것이리라.", "paragraph": 0, "memberIds": ["L10:1"], "topic": "대변인이 하고 싶은 말은 아마 이것일 것이다. \"암표는 125달러를 낼 돈이 없는 사람에게 불공평하다.\""}, {"id": "L10:2", "text": "보통 사람은 그만큼 불리하게 되어 입장권을 손에 넣기가 더욱 힘들어진다.", "paragraph": 0, "memberIds": ["L10:2"], "topic": "평범한 사람은 그만큼 불리해져서 표를 구하기가 더 어려워진다."}, {"id": "L10:3", "text": "이 주장은 설득력이 있다.", "paragraph": 0, "memberIds": ["L10:3"], "topic": "필자는 “암표 거래는 돈이 부족한 사람에게 불공정하다”는 주장에 설득력이 있다고 본다."}, {"id": "L10:4", "text": "돈을 받고 대신 줄을 선 사람이나 암표상이 입장권을 확보했다면 그 뒤에 서 있던 사람, 즉 암표 가격을 지불할 만한 경제적 여유가 없는 사람은 손해를 본다.", "paragraph": 0, "memberIds": ["L10:4"], "topic": "줄 알바나 암표상이 앞에서 표를 가져가 버리면, 그 뒤에 선 사람은 표를 못 받는다. 그 사람은 비싼 암표를 살 돈도 없다. 그러니 손해를 본다."}]}, "L11": {"id": "L11", "title": "줄 서기를 돈으로 살 수 있을까", "label": "11문단", "text": "이러한 주장에 대해 자유 시장 옹호자들은 다음과 같은 반응을 보일 수 있다. 극장 측이 연극을 열렬하게 관람하고 싶어 하는 사람들로 관람석을 채우고 공연이 주는 즐거움을 극대화하고 싶다면, 그 가치를 가장 높게 평가하는 사람에게 입장권이 돌아가기를 원해야 한다. 그런데 그 사람은 바로 입장권에 최고 가격을 지불하는 사람들이다. 따라서 공연에서 최대의 즐거움을 끌어낼 관객으로 극장을 채울 수 있는 최선의 방법은 입장권을 자유 시장에 맡기는 것이다. 다시 말해 시장이 수용할 수 있는 가격이 얼마가 됐든 그 가격에 입장권을 판매하든지, 아니면 돈을 받고 대신 줄을 선 사람이나 암표상이 가장 높은 가격을 지불하려는 사람에게 입장권을 팔 수 있도록 허용하는 것이다. 최고 가격을 자발적으로 지불하는 사람에게 입장권이 돌아가게 하는 것이 셰익스피어 공연의 가치를 가장 높게 평가하는 사람을 결정하는 최고의 방법이다.", "sentences": [{"id": "L11:1", "text": "이러한 주장에 대해 자유 시장 옹호자들은 다음과 같은 반응을 보일 수 있다.", "paragraph": 0, "memberIds": ["L11:1"], "topic": "“이러한 주장”은 앞 문단의 “암표 거래는 돈이 부족한 사람에게 불공정하다”는 주장이다. 이에 대해 자유 시장 옹호자들이 아래처럼 반론할 수 있다고 필자가 예상한다."}, {"id": "L11:2", "text": "극장 측이 연극을 열렬하게 관람하고 싶어 하는 사람들로 관람석을 채우고 공연이 주는 즐거움을 극대화하고 싶다면, 그 가치를 가장 높게 평가하는 사람에게 입장권이 돌아가기를 원해야 한다.", "paragraph": 0, "memberIds": ["L11:2"], "topic": "\"극장은 정말 보고 싶은 사람들로 자리를 채우고 싶지? 공연의 즐거움을 최대로 하고 싶지? 그렇다면 공연을 가장 귀하게 여기는 사람에게 표가 가야 해.\""}, {"id": "L11:3", "text": "그런데 그 사람은 바로 입장권에 최고 가격을 지불하는 사람들이다.", "paragraph": 0, "memberIds": ["L11:3"], "topic": "\"그 사람이 누구냐고? 바로 표에 가장 비싼 돈을 내는 사람이야.\""}, {"id": "L11:4", "text": "따라서 공연에서 최대의 즐거움을 끌어낼 관객으로 극장을 채울 수 있는 최선의 방법은 입장권을 자유 시장에 맡기는 것이다.", "paragraph": 0, "memberIds": ["L11:4"], "topic": "\"그러니까 표를 시장에 맡기는 게 가장 좋은 방법이야.\""}, {"id": "L11:5", "text": "다시 말해 시장이 수용할 수 있는 가격이 얼마가 됐든 그 가격에 입장권을 판매하든지, 아니면 돈을 받고 대신 줄을 선 사람이나 암표상이 가장 높은 가격을 지불하려는 사람에게 입장권을 팔 수 있도록 허용하는 것이다.", "paragraph": 0, "memberIds": ["L11:5"], "topic": "\"방법은 두 가지야. ㉠ 극장이 사람들이 낼 수 있는 만큼 값을 매겨 표를 팔거나, ㉡ 줄 알바나 암표상이 가장 비싸게 사려는 사람에게 팔게 내버려 두거나.\""}, {"id": "L11:6", "text": "최고 가격을 자발적으로 지불하는 사람에게 입장권이 돌아가게 하는 것이 셰익스피어 공연의 가치를 가장 높게 평가하는 사람을 결정하는 최고의 방법이다.", "paragraph": 0, "memberIds": ["L11:6"], "topic": "\"스스로 가장 비싼 돈을 내는 사람에게 표를 주는 것, 그게 공연을 가장 좋아하는 사람을 고르는 최고의 방법이야.\""}]}, "L12": {"id": "L12", "title": "줄 서기를 돈으로 살 수 있을까", "label": "12문단", "text": "하지만 이러한 주장은 설득력이 없다. 우리의 목적이 사회적 효용을 극대화하는 것이라 할지라도, 자유 시장이 줄 서기보다 믿음직스럽지 않을 수도 있다. 어떤 재화에 기꺼이 가격을 지불하려는 것이 꼭 해당 재화의 가치를 높게 평가한다는 뜻은 아니기 때문이다. 시장 가격에는 자발적으로 지불하려는 마음만큼이나 지불할 수 있는 능력도 반영된다. 셰익스피어 연극이나 야구 경기를 가장 간절하게 보고 싶어 하는 사람이라도 입장권을 살 만한 경제적 여유가 없을 수 있다. 그리고 어떤 경우에는 최고 가격을 내고 입장권을 손에 넣은 사람이라도 그 경험의 가치를 전혀 높게 평가하지 않을 수도 있다.", "sentences": [{"id": "L12:1", "text": "하지만 이러한 주장은 설득력이 없다.", "paragraph": 0, "memberIds": ["L12:1"], "topic": "필자는 11문단에서 예상한 시장 옹호자의 반론, 곧 “비싼 값을 내는 사람이 공연을 가장 원하므로 시장에 맡기자”는 주장에 설득력이 없다고 본다."}, {"id": "L12:2", "text": "우리의 목적이 사회적 효용을 극대화하는 것이라 할지라도, 자유 시장이 줄 서기보다 믿음직스럽지 않을 수도 있다.", "paragraph": 0, "memberIds": ["L12:2"], "topic": "목표가 '모두의 만족을 최대로'라고 쳐도, 시장이 줄 서기보다 더 믿을 만하지 않을 수도 있다."}, {"id": "L12:3", "text": "어떤 재화에 기꺼이 가격을 지불하려는 것이 꼭 해당 재화의 가치를 높게 평가한다는 뜻은 아니기 때문이다.", "paragraph": 0, "memberIds": ["L12:3"], "topic": "돈을 많이 낸다고 해서 꼭 그걸 더 좋아한다는 뜻은 아니기 때문이다."}, {"id": "L12:4", "text": "시장 가격에는 자발적으로 지불하려는 마음만큼이나 지불할 수 있는 능력도 반영된다.", "paragraph": 0, "memberIds": ["L12:4"], "topic": "가격에는 '얼마나 사고 싶은지(마음)'뿐 아니라 '돈이 얼마나 있는지(능력)'도 들어 있다."}, {"id": "L12:5", "text": "셰익스피어 연극이나 야구 경기를 가장 간절하게 보고 싶어 하는 사람이라도 입장권을 살 만한 경제적 여유가 없을 수 있다.", "paragraph": 0, "memberIds": ["L12:5"], "topic": "공연이나 경기를 가장 보고 싶은 사람도 표 살 돈이 없을 수 있다."}, {"id": "L12:6", "text": "그리고 어떤 경우에는 최고 가격을 내고 입장권을 손에 넣은 사람이라도 그 경험의 가치를 전혀 높게 평가하지 않을 수도 있다.", "paragraph": 0, "memberIds": ["L12:6"], "topic": "반대로, 가장 비싼 표를 산 사람이 그 공연을 별로 좋아하지 않을 수도 있다."}]}, "L13": {"id": "L13", "title": "줄 서기를 돈으로 살 수 있을까", "label": "13문단", "text": "예를 들어 나는 야구장에 늦게 도착해 비싼 관람석에 앉았다가 일찍 자리를 뜨는 사람들을 자주 목격한다. 그럴 때면 그들이 야구를 얼마나 좋아하는지 의심스럽다. 이렇듯 비싼 관람석에 앉을 수 있는 경제적 능력은 경기를 향한 열정보다는 주머니 사정과 관계가 깊을 수 있다. 오히려 경제적 여유는 없지만 선발 출전 선수들의 평균 타율을 전부 꿰고 있는 팬들, 특히 젊은 팬들이 그들보다 야구를 좋아하는 것만은 확실하다. 시장 가격은 자발적으로 가격을 지불하려는 마음뿐만 아니라 능력도 반영하므로, 누가 특정 재화의 가치를 가장 높게 평가하는 사람인지 가려내기에는 불완전한 지표다. 어떨 때는 공연을 관람하거나 야구 경기를 보기 위해 자발적으로 줄을 서고자 하는 태도가 가격을 지불하고자 하는 태도보다 관람을 정말 원하는 사람을 나타내는 지표일 수 있다.", "sentences": [{"id": "L13:1", "text": "예를 들어 나는 야구장에 늦게 도착해 비싼 관람석에 앉았다가 일찍 자리를 뜨는 사람들을 자주 목격한다.", "paragraph": 0, "memberIds": ["L13:1"], "topic": "예를 들어 필자는 야구장에서 이런 사람들을 자주 본다. 늦게 와서 비싼 자리에 앉았다가 일찍 가 버리는 사람들이다."}, {"id": "L13:2", "text": "그럴 때면 그들이 야구를 얼마나 좋아하는지 의심스럽다.", "paragraph": 0, "memberIds": ["L13:2"], "topic": "그럴 때 필자는 '저 사람들, 야구를 정말 좋아하는 걸까?' 하고 의심한다."}, {"id": "L13:3", "text": "이렇듯 비싼 관람석에 앉을 수 있는 경제적 능력은 경기를 향한 열정보다는 주머니 사정과 관계가 깊을 수 있다.", "paragraph": 0, "memberIds": ["L13:3"], "topic": "이처럼 비싼 자리에 앉는 건 경기를 좋아하는 마음 때문이라기보다 돈이 많아서일 수 있다."}, {"id": "L13:4", "text": "오히려 경제적 여유는 없지만 선발 출전 선수들의 평균 타율을 전부 꿰고 있는 팬들, 특히 젊은 팬들이 그들보다 야구를 좋아하는 것만은 확실하다.", "paragraph": 0, "memberIds": ["L13:4"], "topic": "오히려 돈은 없어도 선발 선수들의 타율(안타를 치는 비율)을 다 외우는 팬, 특히 젊은 팬들이 그 사람들보다 야구를 더 좋아하는 건 확실하다."}, {"id": "L13:5", "text": "시장 가격은 자발적으로 가격을 지불하려는 마음뿐만 아니라 능력도 반영하므로, 누가 특정 재화의 가치를 가장 높게 평가하는 사람인지 가려내기에는 불완전한 지표다.", "paragraph": 0, "memberIds": ["L13:5"], "topic": "가격에는 마음과 돈(능력)이 같이 들어 있다. 그래서 가격만 보고는 누가 가장 좋아하는지 정확히 알 수 없다. 가격은 정확하지 않은 자(불완전한 지표)다."}, {"id": "L13:6", "text": "어떨 때는 공연을 관람하거나 야구 경기를 보기 위해 자발적으로 줄을 서고자 하는 태도가 가격을 지불하고자 하는 태도보다 관람을 정말 원하는 사람을 나타내는 지표일 수 있다.", "paragraph": 0, "memberIds": ["L13:6"], "topic": "때로는 '몇 시간이라도 줄 서겠다'는 마음이 '돈을 내겠다'는 마음보다 진짜 팬을 더 잘 보여 줄 수 있다."}]}, "L14": {"id": "L14", "title": "줄 서기를 돈으로 살 수 있을까", "label": "14문단", "text": "암표 거래를 옹호하는 사람들은 줄 서기가 시간이 남아도는 사람들에게 유리한 차별이라고 비판한다. 맞는 말이지만, 시장이 돈 많은 사람들을 유리하게 차별한다는 말과 같은 맥락에서만 그러하다. 시장이 자발적으로 돈을 지불하려는 마음과 능력을 바탕으로 재화를 분배하듯, 줄 서기는 자발적으로 기다리려는 마음과 능력을 바탕으로 재화를 분배한다. 그리고 자발적으로 가격을 지불하려는 마음이, 자발적으로 줄을 서서 기다리려는 마음보다 더 나은 가치 평가 기준이라고 추정할 근거는 없다.", "sentences": [{"id": "L14:1", "text": "암표 거래를 옹호하는 사람들은 줄 서기가 시간이 남아도는 사람들에게 유리한 차별이라고 비판한다.", "paragraph": 0, "memberIds": ["L14:1"], "topic": "암표 거래를 옹호하는 사람들은 “줄 서기도 시간이 많은 사람에게 유리한 차별이다”라고 비판한다."}, {"id": "L14:2", "text": "맞는 말이지만, 시장이 돈 많은 사람들을 유리하게 차별한다는 말과 같은 맥락에서만 그러하다.", "paragraph": 0, "memberIds": ["L14:2"], "topic": "필자는 그 지적을 인정한다. 다만 시장도 돈 많은 사람에게 유리하므로, 줄 서기에만 있는 문제는 아니라고 말한다."}, {"id": "L14:3", "text": "시장이 자발적으로 돈을 지불하려는 마음과 능력을 바탕으로 재화를 분배하듯, 줄 서기는 자발적으로 기다리려는 마음과 능력을 바탕으로 재화를 분배한다.", "paragraph": 0, "memberIds": ["L14:3"], "topic": "시장은 '돈 낼 마음 + 돈'으로 나눈다. 줄 서기는 '기다릴 마음 + 시간'으로 나눈다."}, {"id": "L14:4", "text": "그리고 자발적으로 가격을 지불하려는 마음이, 자발적으로 줄을 서서 기다리려는 마음보다 더 나은 가치 평가 기준이라고 추정할 근거는 없다.", "paragraph": 0, "memberIds": ["L14:4"], "topic": "그리고 '돈을 내겠다는 마음'이 '기다리겠다는 마음'보다 더 좋은 기준이라고 볼 이유는 없다."}]}, "L15": {"id": "L15", "title": "줄 서기를 돈으로 살 수 있을까", "label": "15문단", "text": "따라서 줄 서기보다 시장 논리가 더 낫다는 공리주의자의 입장은 우연에 상당한 지배를 받는다. 그 가치를 가장 높게 평가하는 사람에게 재화를 분배하는 역할은 시장이 수행할 때도 있고 줄 서기가 수행할 때도 있기 때문이다. 어떤 경우에든 시장이 이 역할을 더 잘 수행할지, 줄 서기가 더 잘 수행할지는 추상적인 경제적 논리에 따라 미리 결정할 수 없는 경험적 문제다.", "sentences": [{"id": "L15:1", "text": "따라서 줄 서기보다 시장 논리가 더 낫다는 공리주의자의 입장은 우연에 상당한 지배를 받는다.", "paragraph": 0, "memberIds": ["L15:1"], "topic": "그러니 \"시장이 줄 서기보다 낫다\"는 공리주의자의 말은 맞을 때도 있고 틀릴 때도 있다. 상황에 따라 그때그때 달라진다(우연에 크게 좌우된다)."}, {"id": "L15:2", "text": "그 가치를 가장 높게 평가하는 사람에게 재화를 분배하는 역할은 시장이 수행할 때도 있고 줄 서기가 수행할 때도 있기 때문이다.", "paragraph": 0, "memberIds": ["L15:2"], "topic": "가장 좋아하는 사람에게 물건을 잘 보내는 쪽이 어떤 때는 시장이고, 어떤 때는 줄 서기이기 때문이다."}, {"id": "L15:3", "text": "어떤 경우에든 시장이 이 역할을 더 잘 수행할지, 줄 서기가 더 잘 수행할지는 추상적인 경제적 논리에 따라 미리 결정할 수 없는 경험적 문제다.", "paragraph": 0, "memberIds": ["L15:3"], "topic": "둘 중 뭐가 더 나은지는 머릿속 이론(추상적 논리)만으로 미리 정할 수 없다. 실제 상황을 보고 확인해야 안다(경험적 문제)."}]}}}, {"id": "unit22-p16-18", "version": 1, "title": "반박 3단계 · 16~18문단", "label": "16~18문단", "covers": ["unit22-l16-quick-basic", "unit22-l17-quick-basic", "unit22-morality-p16-17-basic", "unit22-l18-quick-basic", "unit22-morality-p18-basic"], "skills": [{"id": "fundamental", "paragraph": 16, "title": "더 근본적인 반박", "main": {"prompt": "16문단의 ‘더욱 근본적인 반박’은 무엇인가요?", "options": ["시장이 줄 서기보다 효용을 더 늘린다는 반박", "암표가 법에 어긋난다는 반박", "공리주의적 사고가 유일하게 중요한 견해는 아니라는 반박"], "answer": "공리주의적 사고가 유일하게 중요한 견해는 아니라는 반박"}, "narrow": [{"prompt": "12~15문단은 무엇을 기준으로 시장과 줄 서기를 비교했나요?", "options": ["누가 가치를 가장 높게 평가하는가(효용)", "재화가 지닌 본질"], "answer": "누가 가치를 가장 높게 평가하는가(효용)"}, {"prompt": "16문단은 그런 공리주의적 사고가 어떻다고 하나요?", "options": ["유일하게 중요한 견해이다", "유일하게 중요한 견해는 아니다"], "answer": "유일하게 중요한 견해는 아니다"}], "retest": {"prompt": "앞의 반박(12~15문단)과 16문단 반박의 차이로 맞는 것은?", "options": ["앞은 효용으로 따져도 시장이 낫지 않다는 것, 뒤는 효용만이 기준이 아니라는 것", "앞은 공정성만 따진 반박이고, 16문단은 효용이 가장 중요하다는 반박이다", "앞은 극장 대변인의 반박, 16문단은 쿠오모의 반박이라는 것"], "answer": "앞은 효용으로 따져도 시장이 낫지 않다는 것, 뒤는 효용만이 기준이 아니라는 것"}, "review": {"prompt": "“필자는 공리주의적 사고가 유일하게 중요한 견해라고 본다.” 맞나요?", "options": ["맞다. 효용만 따지면 된다", "아니다. 유일하게 중요한 견해는 아니라고 반박한다", "맞다. 16문단에서 공리주의를 지지한다"], "answer": "아니다. 유일하게 중요한 견해는 아니라고 반박한다"}, "why": "12~15문단은 효용을 기준으로 따져도 시장이 줄 서기보다 낫다고 할 수 없다는 반박이었어요. 16문단은 더 근본적으로, 공리주의적 사고(효용) 자체가 유일하게 중요한 견해는 아니라고 반박해요.", "valid": ["L16:1", "L16:2"], "recall": {"prompt": "16문단에서 필자는 어떤 사고가 유일하게 중요한 견해는 아니라고 했나요?", "accept": ["공리주의적사고", "공리주의", "공리주의적", "공리주의적인사고", "공리주의사고"], "reject": ["자유지상주의", "자유지상주의적사고", "시장", "줄서기"]}, "rev": "eccb125b8c71baff660ba0f2e42002e5becdb6d702d2cb0f2079cc1fa00ffda3"}, {"id": "distribution", "paragraph": 16, "title": "분배 방식과 본질", "main": {"prompt": "필자는 “재화의 분배 방식은 재화가 지닌 본질이다”라고 단정한다.", "options": ["O", "X"], "answer": "X"}, "narrow": [{"prompt": "16문단 마지막 문장의 끝은 어떻게 되어 있나요?", "options": ["본질이다", "본질의 일부일 수도 있다"], "answer": "본질의 일부일 수도 있다"}, {"prompt": "‘~일 수도 있다’는 어떤 표현인가요?", "options": ["가능성을 말하는 표현", "단정하는 표현"], "answer": "가능성을 말하는 표현"}], "retest": {"prompt": "16문단 내용과 맞는 것은?", "options": ["모든 재화는 효용만으로 가치를 잴 수 있다", "어떤 재화는 분배 방식이 본질의 일부일 수도 있다", "모든 재화는 분배 방식이 곧 본질 그 자체이다"], "answer": "어떤 재화는 분배 방식이 본질의 일부일 수도 있다"}, "review": {"prompt": "선지에서 ‘본질의 일부일 수도 있다’를 ‘본질이다’로 바꾸면 어떤 함정인가요?", "options": ["필자의 말을 남의 말로 바꾼 주체 함정", "원인과 결과의 순서를 뒤바꾼 인과 함정", "가능성을 단정으로 세게 바꾼 정도 함정"], "answer": "가능성을 단정으로 세게 바꾼 정도 함정"}, "why": "16문단은 어떤 재화는 효용을 넘어선 가치를 지니고, 재화의 분배 방식은 본질의 ‘일부일 수도 있다’고 해요. 원문의 정도 표현을 그대로 지켜야 하고, ‘본질이다’로 단정하면 틀린 선지가 돼요.", "valid": ["L16:3", "L16:4"], "recall": {"prompt": "16문단은 재화의 분배 방식이 재화가 지닌 본질의 ‘○○일 수도 있다’고 했어요. ○○에 들어갈 말은?", "accept": ["일부", "일부분", "일부일수도"], "reject": ["전부", "전체", "핵심", "본질"]}, "rev": "e70124d24ce53a4439843dba96a611516521ea7492e0a5ff77ae0c0f12e6d45c"}, {"id": "not-only-fair", "paragraph": 17, "title": "문제는 공정성만이 아니다", "main": {"prompt": "17문단에서 필자는 돈이 없는 사람의 관람 기회가 줄어든다는 점을 인정한다.", "options": ["O", "X"], "answer": "O"}, "narrow": [{"prompt": "그 문장의 첫 낱말 ‘물론’은 언제 쓰는 말인가요?", "options": ["상대의 말을 인정할 때", "상대의 말에 반대할 때"], "answer": "상대의 말을 인정할 때"}, {"prompt": "‘물론’ 다음 문장은 무엇이라고 하나요?", "options": ["문제는 공정성뿐이다", "하지만 문제는 공정성만이 아니다"], "answer": "하지만 문제는 공정성만이 아니다"}], "retest": {"prompt": "17문단에서 필자가 공정성 문제에 더한 문제는?", "options": ["무료 공연의 공연 시간이 너무 짧아 불편하다는 문제", "무료 공연이 시장 상품으로 바뀌면 무언가가 사라진다는 문제", "극장 좌석 수가 적어 모든 시민이 볼 수 없다는 문제"], "answer": "무료 공연이 시장 상품으로 바뀌면 무언가가 사라진다는 문제"}, "review": {"prompt": "“필자가 10문단에서 ‘설득력이 있다’고 했으니, 필자가 암표에 반대하는 가장 근본적인 이유는 공정성이다.” 맞나요?", "options": ["아니다. 공정성은 인정하지만 문제는 공정성만이 아니라고 한다", "맞다. 공정성이 필자가 든 가장 근본적인 이유다", "아니다. 필자는 공정성 문제를 처음부터 인정하지 않는다"], "answer": "아니다. 공정성은 인정하지만 문제는 공정성만이 아니라고 한다"}, "why": "17문단은 “물론” 돈이 없는 사람은 관람 기회가 줄어든다고 공정성 문제를 인정해요. 하지만 “문제는 공정성만이 아니다”라며, 무료 공연이 시장 상품으로 바뀌면 무언가가 사라진다고 덧붙여요.", "valid": ["L17:5", "L17:6", "L17:7"], "recall": {"prompt": "17문단에서 필자는 “하지만 문제는 ○○○만이 아니다”라고 했어요. ○○○에 들어갈 말은?", "accept": ["공정성", "공정"], "reject": ["효용", "효율성", "자유", "돈"]}, "evidence": {"prompt": "필자가 공정성 문제를 ‘인정’하는 문장을 골라 보세요.", "groups": [["L17:2", "L17:3", "L17:4"], ["L17:5"], ["L17:6", "L17:7", "L17:8"]], "correct": [1], "reasons": ["이 묶음은 대변인의 말을 다시 떠올리며 질문을 던지는 부분이에요.", "", "이 묶음은 공정성 말고 다른 문제가 있다고 더하는 부분이에요. 인정하는 문장은 그 바로 앞에 있어요."]}, "rev": "79b94c197b58398e495a3491c444e80f6de761572854c1748b46b22c5c89ba40"}, {"id": "lost", "paragraph": 17, "title": "시장 상품이 되면 사라지는 것", "main": {"prompt": "필자는 무료 공연이 시장 상품이 될 때의 문제가 가격 경쟁에서 밀린 사람의 실망뿐이라고 본다.", "options": ["O", "X"], "answer": "X"}, "narrow": [{"prompt": "17문단 마지막 문장은 ‘실망~’으로 끝나요. 어떻게 끝나나요?", "options": ["실망뿐이다", "실망만이 아니다"], "answer": "실망만이 아니다"}, {"prompt": "‘~만이 아니다’는 어떤 뜻인가요?", "options": ["그것 말고도 더 있다", "그것 하나뿐이다"], "answer": "그것 말고도 더 있다"}], "retest": {"prompt": "공립 극장의 무료 공연이 시장 상품으로 바뀌면 어떻게 된다고 했나요?", "options": ["공연이 더 즐거워진다", "모든 시민이 관람할 수 있게 된다", "무언가가 사라진다"], "answer": "무언가가 사라진다"}, "review": {"prompt": "선지 “상실의 결과는 가격 경쟁에서 밀린 사람들이 느끼는 실망뿐이다.”가 틀린 까닭은?", "options": ["원문 ‘실망만이 아니다’를 반대로 뒤집었다", "‘실망’이라는 낱말이 원문에 없다", "상실이 아니라 이익이라고 해야 한다"], "answer": "원문 ‘실망만이 아니다’를 반대로 뒤집었다"}, "why": "17문단은 무료 공연이 시장 상품으로 바뀌면 무언가가 사라지고, 그 상실의 결과는 가격 경쟁에서 밀린 사람들의 실망‘만이 아니다’라고 해요. 실망 말고도 사라지는 것이 있다는 뜻이에요.", "valid": ["L17:7", "L17:8"], "recall": {"prompt": "공립 극장의 무료 공연이 무엇으로 바뀌면 무언가가 사라진다고 했나요?", "accept": ["시장상품", "시장의상품", "상품", "시장상품으로"], "reject": ["선물", "축제", "무료공연", "공공재"]}, "rev": "dc2833b3929b34c335e7ffbee09e0bc726057f97338db621e70adf3d1b7d1287"}, {"id": "gift", "paragraph": 18, "title": "시가 베푸는 선물(비유)", "main": {"prompt": "‘시가 스스로에게 베푸는 선물’은 시청이 시민에게 실제 선물을 나눠 준다는 뜻이다.", "options": ["O", "X"], "answer": "X"}, "narrow": [{"prompt": "‘말하자면 ~인 셈이다’는 어떤 말을 할 때 쓰나요?", "options": ["실제로 일어난 일을 그대로 말할 때", "빗대어 말할 때"], "answer": "빗대어 말할 때"}, {"prompt": "퍼블릭 시어터는 무료 야외 공연을 무엇으로 생각하나요?", "options": ["대중의 축제이자 시민 축하 행사", "극장의 수익 사업"], "answer": "대중의 축제이자 시민 축하 행사"}], "retest": {"prompt": "‘시가 스스로에게 베푸는 선물’이 뜻하는 것은?", "options": ["시청이 공연 뒤 선물을 준다는 것", "무료 공연은 시민 모두를 위한 축제라는 것", "시민이 시청에 선물을 바친다는 것"], "answer": "무료 공연은 시민 모두를 위한 축제라는 것"}, "review": {"prompt": "선지 “퍼블릭 시어터는 시가 시민에게 실제 선물을 나누어 주는 행사를 연다.”는 어떤 함정인가요?", "options": ["필자의 말을 남의 말로 바꾼 주체 함정", "원문 내용을 그대로 옮긴 바른 선지", "비유를 실제 일로 바꾼 비유의 사실화"], "answer": "비유를 실제 일로 바꾼 비유의 사실화"}, "why": "퍼블릭 시어터는 무료 야외 공연을 대중의 축제이자 시민 축하 행사로 생각해요. ‘시가 스스로에게 베푸는 선물인 셈이다’는 그것을 선물에 빗댄 말이지, 실제로 선물을 나눠 준다는 뜻이 아니에요.", "valid": ["L18:1", "L18:2"], "recall": {"prompt": "퍼블릭 시어터는 무료 야외 공연을 대중의 무엇이라고 생각하나요? 두 글자로 적어 보세요.", "accept": ["축제", "대중의축제", "축하행사", "시민축하행사"], "reject": ["상품", "사업", "수익사업", "시장"]}, "rev": "02de323f27cf466fa7d0af03a106bce94a82b4d0b28d0b36b12aea8af56c5988"}, {"id": "purpose", "paragraph": 18, "title": "퍼블릭 시어터의 취지", "main": {"prompt": "필자는 좌석 수가 한정되어 있으므로 무료 공연의 취지가 이미 깨졌다고 본다.", "options": ["O", "X"], "answer": "X"}, "narrow": [{"prompt": "18문단에서 ‘좌석 수는 한정되어 있다’ 앞에 붙은 낱말은?", "options": ["따라서", "물론"], "answer": "물론"}, {"prompt": "퍼블릭 시어터의 취지는 무엇인가요?", "options": ["지불 능력과 관계없이 누구나 평등하게 무료로 관람하게 하는 것", "돈을 많이 낸 사람부터 관람하게 하는 것"], "answer": "지불 능력과 관계없이 누구나 평등하게 무료로 관람하게 하는 것"}], "retest": {"prompt": "18문단의 ‘물론 좌석 수는 한정되어 있다’ 뒤에 이어지는 생각은?", "options": ["그래서 무료 공연의 취지는 이미 무너진 것이다", "그러므로 좌석마다 알맞은 입장료를 받아야 한다", "하지만 취지는 누구나 평등하게 무료로 보게 하는 것이다"], "answer": "하지만 취지는 누구나 평등하게 무료로 보게 하는 것이다"}, "review": {"prompt": "[새 예시] 학교 강당 무료 공연 자리가 100석뿐이에요. 18문단의 필자라면 어떻게 말할까요?", "options": ["자리가 적으니 누구나 보게 하려는 뜻은 이미 사라졌다", "자리는 적어도, 누구나 평등하게 보게 하려는 뜻은 그대로다", "자리가 적으니 돈을 많이 낸 학생부터 앉혀야 한다"], "answer": "자리는 적어도, 누구나 평등하게 보게 하려는 뜻은 그대로다"}, "why": "18문단은 “물론” 좌석 수가 한정되어 있다고 인정하지만, 퍼블릭 시어터의 취지는 관람료 지불 능력과 전혀 관계없이 누구나 평등하게 무료로 관람하게 하는 것이라고 해요. 좌석 제한 때문에 취지가 깨졌다고 하지 않아요.", "valid": ["L18:3", "L18:5"], "recall": {"prompt": "퍼블릭 시어터의 취지는 관람료 지불 능력과 관계없이 누구나 어떻게 공연을 관람하게 하는 것인가요?", "accept": ["평등하게", "평등", "누구나평등하게", "평등하게무료로", "무료로", "평등하게무료"], "reject": ["돈을내고", "먼저온순서로", "비싸게", "차례로"]}, "rev": "1142357bc09e4ca525da67177aeef3ebe8ae538daf864e10e63c1c93abc8b974"}, {"id": "private", "paragraph": 18, "title": "공공의 축제와 돈벌이", "main": {"prompt": "입장료를 받거나 암표상이 이득을 보게 하는 일은 공공의 축제를 무엇으로 바꾼다고 했나요?", "options": ["모두가 함께 즐기는 더 큰 시민 축하 행사", "가장 원하는 사람에게 가는 공정한 시장", "돈벌이, 즉 사적 이익을 취득하기 위한 도구"], "answer": "돈벌이, 즉 사적 이익을 취득하기 위한 도구"}, "narrow": [{"prompt": "18문단 마지막 문장에서 ‘공공’과 맞서는 말은?", "options": ["사적", "공립"], "answer": "사적"}, {"prompt": "선물이어야 하는 행사로 돈을 받는 일은 취지에 맞나요?", "options": ["취지에 맞는다", "취지에 어긋난다"], "answer": "취지에 어긋난다"}], "retest": {"prompt": "18문단 마지막 두 문장의 뜻으로 맞는 것은?", "options": ["입장료를 받으면 더 많은 시민이 참여해 축제가 더 공공적으로 된다", "선물이어야 할 행사로 돈을 벌면 공공의 축제가 사적 이익의 도구가 된다", "암표상이 이득을 보는 것은 표를 원하는 사람에게 가므로 취지에 맞는다"], "answer": "선물이어야 할 행사로 돈을 벌면 공공의 축제가 사적 이익의 도구가 된다"}, "review": {"prompt": "“18문단은 암표상 덕분에 공공의 축제가 더 많은 사람의 것이 된다고 본다.” 무엇이 틀렸나요?", "options": ["틀린 곳이 없다. 18문단은 암표상을 긍정한다", "반대다. 공공의 축제를 사적 이익의 도구로 바꾼다고 본다", "18문단은 암표상이 아니라 극장 대변인만 다룬다"], "answer": "반대다. 공공의 축제를 사적 이익의 도구로 바꾼다고 본다"}, "why": "18문단은 본래 선물이어야 하는 행사로 입장료를 받거나 암표상이 이득을 취하게 하는 일이 취지에 어긋나고, 공공의 축제를 돈벌이, 즉 사적 이익을 취득하기 위한 도구로 바꾸는 행위라고 해요.", "valid": ["L18:6", "L18:7"], "recall": {"prompt": "입장료나 암표는 공공의 축제를 ‘○○ 이익’을 취득하기 위한 도구로 바꾼다고 했어요. ○○에 들어갈 말은?", "accept": ["사적", "사적인", "개인", "개인적", "개인의"], "reject": ["공공", "공적", "사회적", "공동"]}, "rev": "b126437c8a2a09d0668ec9cccab8c6483d3776a76c6563c4d384cbd37b7fa55b"}], "diagnostic": ["fundamental", "distribution", "not-only-fair", "gift", "purpose"], "diagnosticRevision": 1, "diagnosticContext": {"fundamental": {"title": "더 근본적인 반박", "text": ["줄 서기보다 시장 논리를 옹호하는 공리주의자들의 주장은 더욱 근본적인 반박에 부딪히기 쉽다.", "즉 공리주의적 사고가 유일하게 중요한 견해는 아니라는 반박이다."], "prompt": "여기서 말하는 ‘더욱 근본적인 반박’은 무엇인가요?"}, "distribution": {"title": "재화의 가치", "text": ["어떤 재화는 구매자와 판매자에게 부여하는 효용을 넘어선 가치를 지닌다.", "재화의 분배 방식은 재화가 지닌 본질의 일부일 수도 있다."], "prompt": "글쓴이는 “재화의 분배 방식은 재화가 지닌 본질이다”라고 단정한다."}, "not-only-fair": {"title": "글쓴이의 말", "text": ["물론 연극을 보고 싶지만 입장권을 구매할 경제적 여유가 없는 사람에게는 공연을 관람할 기회가 축소될 것이다.", "하지만 문제는 공정성만이 아니다."], "prompt": "글쓴이는 돈이 없는 사람의 관람 기회가 줄어든다는 점을 인정한다."}, "gift": {"title": "무료 야외 공연", "text": ["퍼블릭 시어터는 무료 야외 공연을 대중의 축제이자 일종의 시민 축하 행사로 생각한다.", "말하자면 시(市)가 스스로에게 베푸는 선물인 셈이다."], "prompt": "‘시가 스스로에게 베푸는 선물’은 시청이 시민에게 실제 선물을 나눠 준다는 뜻이다."}, "purpose": {"title": "좌석과 취지", "text": ["물론 좌석 수는 한정되어 있다.", "하지만 퍼블릭 시어터의 취지는 관람료 지불 능력과 전혀 관계없이 누구나 평등하게 셰익스피어 공연을 무료로 관람할 수 있게 하는 것이다."], "prompt": "글쓴이는 좌석 수가 한정되어 있으므로 무료 공연의 취지가 이미 깨졌다고 본다."}}, "combined": [{"prompt": "[새 예시] 체육대회 때 학생회가 반마다 무료로 나눠 준 응원 티셔츠를 한 학생이 중고 사이트에 팔았어요. 18문단 논리로 무엇이 문제인가요?", "options": ["티셔츠를 시장 가격보다 너무 낮게 매겨 손해를 봤다", "모두를 위한 축제의 선물을 개인의 돈벌이 도구로 바꿨다", "학생회가 티셔츠를 반마다 너무 많이 나눠 주었다"], "answer": "모두를 위한 축제의 선물을 개인의 돈벌이 도구로 바꿨다", "why": "학생회는 함께 응원하라고 티셔츠를 선물했어요. 이를 팔아 돈을 버는 것은 18문단처럼 공공의 축제를 사적 이익의 도구로 바꾸어, 나눠 준 취지에 어긋나요.", "valid": ["L18:6", "L18:7"], "sources": ["L18"], "narrow": [{"prompt": "학생회는 티셔츠를 무엇을 하라고 나눠 줬나요?", "options": ["팔아서 돈을 벌라고", "함께 응원하라고"], "answer": "함께 응원하라고"}, {"prompt": "티셔츠를 판 학생이 얻은 것은 누구의 이익인가요?", "options": ["그 학생 개인의 이익", "반 전체의 이익"], "answer": "그 학생 개인의 이익"}], "retest": {"prompt": "[새 예시] 마을 축제에서 무료로 나눠 준 떡을 한 사람이 모아 비싸게 되팔았어요. 18문단 표현으로 이 행동은?", "options": ["떡을 원하는 사람에게 나눠 축제의 취지를 살리는 행위", "공공의 축제를 사적 이익의 도구로 바꾸는 행위", "시장이 가장 효율적인 결론에 이르는 바람직한 행위"], "answer": "공공의 축제를 사적 이익의 도구로 바꾸는 행위"}, "review": {"prompt": "[새 예시] 무료 학교 공연 표를 받아 돈을 받고 넘기려는 친구에게 16~18문단의 필자라면 뭐라고 할까요?", "options": ["돈을 받으면 간절한 친구에게 가니 더 공정해진다", "표를 먼저 받은 사람의 권리이니 팔아도 괜찮다", "나누는 방식도 공연의 뜻일 수 있으니 돈벌이로 바꾸면 안 된다"], "answer": "나누는 방식도 공연의 뜻일 수 있으니 돈벌이로 바꾸면 안 된다"}, "rev": "0031610986a47c8eff0a79de867adbc595ab23ebfffea59c4824f573ff2aae38"}, {"prompt": "16~18문단에서 필자가 대리 줄 서기와 암표에 반대하는 가장 근본적인 이유는?", "options": ["돈이 없는 사람에게 불공정하다는 것, 오직 그 하나뿐이다", "무료 공연은 모두의 축제라, 돈으로 나누면 무언가가 사라진다", "암표 판매는 법에 어긋나므로 처벌해야 한다는 것"], "answer": "무료 공연은 모두의 축제라, 돈으로 나누면 무언가가 사라진다", "why": "필자는 공정성 문제도 인정하지만 그것만이 아니라고 해요. 효용이 유일한 기준이 아니고, 누구나 평등하게 무료로 나누는 방식이 공공 축제라는 본질의 일부일 수 있어서, 시장 상품으로 바꾸면 무언가가 사라진다는 것이 가장 근본적인 이유예요.", "valid": ["L16:4", "L17:6", "L18:7"], "sources": ["L16", "L17", "L18"], "narrow": [{"prompt": "17문단의 ‘문제는 공정성만이 아니다’는 공정성 말고 다른 이유도 있다는 뜻인가요?", "options": ["그렇다", "아니다"], "answer": "그렇다"}, {"prompt": "16문단은 무엇이 재화의 본질의 일부일 수도 있다고 했나요?", "options": ["재화의 가격", "재화의 분배 방식"], "answer": "재화의 분배 방식"}], "retest": {"prompt": "9~18문단에서 필자가 반박하는 순서로 맞는 것은?", "options": ["효용만이 기준이 아님 → 공정성 → 시장이 항상 나음", "공정성 → 효용으로도 시장 우위 없음 → 효용만이 기준 아님", "시장 찬성 → 공정성 반대 → 효용만이 유일한 기준"], "answer": "공정성 → 효용으로도 시장 우위 없음 → 효용만이 기준 아님"}, "review": {"prompt": "친구가 “필자는 결국 돈 없는 사람이 불쌍해서 반대한 거야”라고 했어요. 어떻게 보충할까요?", "options": ["그것도 맞지만, 공공 축제가 돈벌이가 되는 게 더 근본 문제야", "맞아. 돈 없는 사람이 불쌍하다는 게 유일한 이유야", "아니야. 필자는 결국 암표에 찬성했어"], "answer": "그것도 맞지만, 공공 축제가 돈벌이가 되는 게 더 근본 문제야"}, "rev": "f301d96e57563f2f5b65703540a29ee451baf5b9412530e0f441e5eda03f2cbf"}], "sources": {"L16": {"id": "L16", "title": "줄 서기를 돈으로 살 수 있을까", "label": "16문단", "text": "그런데 줄 서기보다 시장 논리를 옹호하는 공리주의자들의 주장은 더욱 근본적인 반박에 부딪히기 쉽다. 즉 공리주의적 사고가 유일하게 중요한 견해는 아니라는 반박이다. 어떤 재화는 구매자와 판매자에게 부여하는 효용을 넘어선 가치를 지닌다. 재화의 분배 방식은 재화가 지닌 본질의 일부일 수도 있다.", "sentences": [{"id": "L16:1", "text": "그런데 줄 서기보다 시장 논리를 옹호하는 공리주의자들의 주장은 더욱 근본적인 반박에 부딪히기 쉽다.", "paragraph": 0, "memberIds": ["L16:1"], "topic": "그런데 공리주의자의 주장에는 더 뿌리 깊은(근본적인) 문제가 있다."}, {"id": "L16:2", "text": "즉 공리주의적 사고가 유일하게 중요한 견해는 아니라는 반박이다.", "paragraph": 0, "memberIds": ["L16:2"], "topic": "바로 '행복(효용)의 양만 따지는 생각이 전부는 아니다'라는 것이다."}, {"id": "L16:3", "text": "어떤 재화는 구매자와 판매자에게 부여하는 효용을 넘어선 가치를 지닌다.", "paragraph": 0, "memberIds": ["L16:3"], "topic": "어떤 것은 사고파는 사람이 얻는 만족보다 더 큰 가치를 가진다."}, {"id": "L16:4", "text": "재화의 분배 방식은 재화가 지닌 본질의 일부일 수도 있다.", "paragraph": 0, "memberIds": ["L16:4"], "topic": "그리고 '어떻게 나눠 주느냐'가 그 물건의 진짜 의미(본질)의 일부일 수도 있다."}]}, "L17": {"id": "L17", "title": "줄 서기를 돈으로 살 수 있을까", "label": "17문단", "text": "퍼블릭 시어터에서 주관하는 여름 셰익스피어 무료 공연에 관해 다시 한번 생각해 보자. 대변인은 대리 줄 서기에 반대하는 극장의 입장을 밝히면서 “우리는 사람들이 공연을 무료로 관람하기를 원한다.”라고 말했다. 하지만 그렇게 말한 이유는 무엇일까? 입장권이 사고팔린다고 해서 공연 관람이 어떻게 감소한다는 것일까? 물론 연극을 보고 싶지만 입장권을 구매할 경제적 여유가 없는 사람에게는 공연을 관람할 기회가 축소될 것이다. 하지만 문제는 공정성만이 아니다. 공립 극장의 무료 공연이 시장 상품으로 바뀌면 무언가가 사라진다. 그 상실의 결과는 가격 경쟁에서 밀린 사람들이 느끼는 실망만이 아니다.", "sentences": [{"id": "L17:1", "text": "퍼블릭 시어터에서 주관하는 여름 셰익스피어 무료 공연에 관해 다시 한번 생각해 보자.", "paragraph": 0, "memberIds": ["L17:1"], "topic": "처음의 무료 셰익스피어 공연으로 다시 돌아가 보자."}, {"id": "L17:2", "text": "대변인은 대리 줄 서기에 반대하는 극장의 입장을 밝히면서 “우리는 사람들이 공연을 무료로 관람하기를 원한다.”라고 말했다.", "paragraph": 0, "memberIds": ["L17:2"], "topic": "대변인은 \"우리는 사람들이 공짜로 공연을 보기를 바란다.\"라고 했다."}, {"id": "L17:3", "text": "하지만 그렇게 말한 이유는 무엇일까?", "paragraph": 0, "memberIds": ["L17:3"], "topic": "왜 그렇게 말했을까?"}, {"id": "L17:4", "text": "입장권이 사고팔린다고 해서 공연 관람이 어떻게 감소한다는 것일까?", "paragraph": 0, "memberIds": ["L17:4"], "topic": "표를 사고판다고 해서 공연을 보는 일에서 뭐가 줄어든다는 걸까?"}, {"id": "L17:5", "text": "물론 연극을 보고 싶지만 입장권을 구매할 경제적 여유가 없는 사람에게는 공연을 관람할 기회가 축소될 것이다.", "paragraph": 0, "memberIds": ["L17:5"], "topic": "물론 보고 싶지만 돈이 없는 사람은 공연을 볼 기회가 줄어든다."}, {"id": "L17:6", "text": "하지만 문제는 공정성만이 아니다.", "paragraph": 0, "memberIds": ["L17:6"], "topic": "그런데 문제는 '불공평하다'는 것만이 아니다."}, {"id": "L17:7", "text": "공립 극장의 무료 공연이 시장 상품으로 바뀌면 무언가가 사라진다.", "paragraph": 0, "memberIds": ["L17:7"], "topic": "모두를 위한 공짜 공연이 '사고파는 물건'이 되면 뭔가가 없어진다."}, {"id": "L17:8", "text": "그 상실의 결과는 가격 경쟁에서 밀린 사람들이 느끼는 실망만이 아니다.", "paragraph": 0, "memberIds": ["L17:8"], "topic": "그 잃어버린 것은 돈 경쟁에서 진 사람들의 속상함만이 아니다."}]}, "L18": {"id": "L18", "title": "줄 서기를 돈으로 살 수 있을까", "label": "18문단", "text": "퍼블릭 시어터는 무료 야외 공연을 대중의 축제이자 일종의 시민 축하 행사로 생각한다. 말하자면 시(市)가 스스로에게 베푸는 선물인 셈이다. 물론 좌석 수는 한정되어 있다. 정해진 저녁 시간에 시민 전체가 참석할 수는 없기 때문이다. 하지만 퍼블릭 시어터의 취지는 관람료 지불 능력과 전혀 관계없이 누구나 평등하게 셰익스피어 공연을 무료로 관람할 수 있게 하는 것이다. 본래 선물이어야 하는 행사로 입장료를 받거나 암표상이 이득을 취하게 허용하는 일은 이러한 취지에 어긋난다. 이는 공공의 축제를 돈벌이, 즉 사적 이익을 취득하기 위한 도구로 바꾸는 행위다.", "sentences": [{"id": "L18:1", "text": "퍼블릭 시어터는 무료 야외 공연을 대중의 축제이자 일종의 시민 축하 행사로 생각한다.", "paragraph": 0, "memberIds": ["L18:1"], "topic": "극장은 이 무료 공연을 모두의 축제, 시민들의 잔치로 여긴다."}, {"id": "L18:2", "text": "말하자면 시(市)가 스스로에게 베푸는 선물인 셈이다.", "paragraph": 0, "memberIds": ["L18:2"], "topic": "말하자면 도시가 시민들, 곧 자기 자신에게 주는 선물이다."}, {"id": "L18:3", "text": "물론 좌석 수는 한정되어 있다.", "paragraph": 0, "memberIds": ["L18:3"], "topic": "물론 자리는 정해져 있다."}, {"id": "L18:4", "text": "정해진 저녁 시간에 시민 전체가 참석할 수는 없기 때문이다.", "paragraph": 0, "memberIds": ["L18:4"], "topic": "그날 저녁에 모든 시민이 다 올 수는 없으니까."}, {"id": "L18:5", "text": "하지만 퍼블릭 시어터의 취지는 관람료 지불 능력과 전혀 관계없이 누구나 평등하게 셰익스피어 공연을 무료로 관람할 수 있게 하는 것이다.", "paragraph": 0, "memberIds": ["L18:5"], "topic": "하지만 극장이 원래 하려던 것(취지)은 돈이 있든 없든 누구나 똑같이 공짜로 공연을 보게 하는 것이다."}, {"id": "L18:6", "text": "본래 선물이어야 하는 행사로 입장료를 받거나 암표상이 이득을 취하게 허용하는 일은 이러한 취지에 어긋난다.", "paragraph": 0, "memberIds": ["L18:6"], "topic": "원래 선물이어야 할 행사에서 입장료를 받거나 암표상이 돈을 벌게 놔두면, 그 목적과 어긋난다."}, {"id": "L18:7", "text": "이는 공공의 축제를 돈벌이, 즉 사적 이익을 취득하기 위한 도구로 바꾸는 행위다.", "paragraph": 0, "memberIds": ["L18:7"], "topic": "그건 모두의 축제를 개인의 돈벌이 수단(사적 이익의 도구)으로 바꿔 버리는 일이다."}]}}}, {"id": "unit22-critical", "version": 1, "title": "비판적 읽기 · 개념과 적용", "label": "비판적 읽기", "covers": ["unit22-concept-a-basic", "unit22-concept-b-basic"], "skills": [{"id": "meaning", "paragraph": 0, "place": "개념", "title": "비판적 읽기의 뜻", "sources": ["D22"], "main": {"prompt": "비판적 읽기는 글쓴이의 말에 무조건 반대하면서 읽는 것이다.", "options": ["O", "X"], "answer": "X"}, "narrow": [{"prompt": "비판적 읽기의 뜻에서 ‘무조건’ 뒤에 오는 말은?", "options": ["반대하고", "수용하지 않고"], "answer": "수용하지 않고"}, {"prompt": "따져 본 뒤 글쓴이 생각에 동의해도 비판적 읽기인가요?", "options": ["그렇다. 올바른지 따져 읽었다면 동의할 수도 있다", "아니다. 반드시 반대해야 한다"], "answer": "그렇다. 올바른지 따져 읽었다면 동의할 수도 있다"}], "retest": {"prompt": "비판적 읽기의 뜻으로 맞는 것은?", "options": ["글쓴이의 생각에 공감하며 감동과 즐거움을 얻으며 읽는 것", "내용과 필자의 생각을 무조건 수용하지 않고 따져 가며 읽는 것", "글쓴이의 생각에 무조건 반대하며 틀린 곳을 찾아 읽는 것"], "answer": "내용과 필자의 생각을 무조건 수용하지 않고 따져 가며 읽는 것"}, "review": {"prompt": "[새 예시] 광고 글을 읽고 “정말 그 효과가 있을까? 근거가 뭐지?” 하고 따져 보는 것은 어떤 읽기인가요?", "options": ["감상적 읽기", "소리 내어 읽기", "비판적 읽기"], "answer": "비판적 읽기"}, "why": "비판적 읽기는 글의 내용과 필자의 생각을 무조건 수용하지 않고, 글에 제시된 내용이 올바른지 따져 가며 읽는 거예요. 반대만 하는 것이 아니라, 따져 본 뒤 동의할 수도 있어요.", "valid": ["D22:1"], "recall": {"prompt": "비판적 읽기는 글의 내용과 필자의 생각을 무조건 ○○하지 않고 따져 가며 읽는 것이에요. ○○에 들어갈 말은?", "accept": ["수용", "수용하지", "받아들이지", "받아들이", "수용하"], "reject": ["반대", "비판", "부정", "반대하지"]}, "rev": "b7b85fb9893c70157b309cdb6fde265f76276f750e1dbaf1a73615ebf047d21e"}, {"id": "criteria", "paragraph": 0, "place": "개념", "title": "세 기준 구별하기", "sources": ["D22"], "main": {"prompt": "‘이 글이 한쪽 편만 들고 있나?’를 살피는 기준은?", "options": ["내용의 타당성", "관점의 공정성", "표현 방법의 적절성"], "answer": "관점의 공정성"}, "narrow": [{"prompt": "[새 예시] 축구 심판이 한 팀 편만 들면 무엇이 없다고 하나요?", "options": ["타당성", "공정성"], "answer": "공정성"}, {"prompt": "‘주장과 근거가 옳고 정확한가’를 살피는 기준은?", "options": ["내용의 타당성", "관점의 공정성"], "answer": "내용의 타당성"}], "retest": {"prompt": "기준과 설명을 바르게 짝지은 것은?", "options": ["내용의 타당성 – 필자가 한쪽으로 치우치지 않고 균형 있게 다루는지", "관점의 공정성 – 주장, 의견, 근거 등 글의 내용이 옳고 정확한지", "표현 방법의 적절성 – 목적과 내용에 비추어 표현이 적절한지"], "answer": "표현 방법의 적절성 – 목적과 내용에 비추어 표현이 적절한지"}, "review": {"prompt": "선지 “내용의 타당성은 글이 한쪽 입장에 치우치지 않았는지 살피는 기준이다.”는 어떤 함정인가요?", "options": ["함정이 없는 바른 선지", "기준 이름을 맞바꾼 함정", "정도 표현을 세게 바꾼 함정"], "answer": "기준 이름을 맞바꾼 함정"}, "why": "내용의 타당성은 주장·의견·근거가 옳고 정확한지, 관점의 공정성은 한쪽으로 치우치지 않고 균형 있게 다루는지, 표현 방법의 적절성은 글의 목적과 내용에 비추어 표현이 효과적이고 적절한지 살피는 기준이에요.", "valid": ["D22:2", "D22:3", "D22:4"], "recall": {"prompt": "필자가 글의 내용을 한쪽으로 치우치지 않고 균형 있게 다루는지 판단하는 기준의 이름은?", "accept": ["관점의공정성", "공정성", "관점의공정"], "reject": ["내용의타당성", "타당성", "표현방법의적절성", "적절성"]}, "rev": "f5e19979be0a305ae49103ace600a9e7451af988daa0c7cf029fe1b9255218ac"}, {"id": "ideology", "paragraph": 0, "place": "개념", "title": "사회·문화적 이념 따지기", "sources": ["D22"], "main": {"prompt": "글쓴이가 유명한 교수라면 글에 담긴 생각은 따지지 않고 받아들여도 된다.", "options": ["O", "X"], "answer": "X"}, "narrow": [{"prompt": "비판적 독자는 글에 반영된 사회·문화적 이념을 어떻게 하나요?", "options": ["글쓴이가 유명하면 그대로 받아들인다", "현재 우리 상황에서 수용할 수 있는지 판단한다"], "answer": "현재 우리 상황에서 수용할 수 있는지 판단한다"}, {"prompt": "비판적 읽기의 뜻에 들어 있는 말은?", "options": ["무조건 수용하지 않는다", "무조건 수용한다"], "answer": "무조건 수용하지 않는다"}], "retest": {"prompt": "사회·문화적 이념을 비판적으로 읽는 방법으로 맞는 것은?", "options": ["글이 쓰인 나라의 이념이면 무조건 옳다고 본다", "이념은 따지지 않고 주장과 근거가 옳은지만 살핀다", "글에 담긴 이념이 지금 우리 상황에서 받아들일 만한지 본다"], "answer": "글에 담긴 이념이 지금 우리 상황에서 받아들일 만한지 본다"}, "review": {"prompt": "[새 예시] 100년 전 책에 “여자는 학교에 갈 필요가 없다”는 생각이 담겨 있어요. 비판적 독자는 어떻게 읽어야 할까요?", "options": ["오래되고 유명한 책이니 그대로 받아들인다", "그 생각이 오늘날 받아들일 수 있는지 따져 본다", "그 시대에는 맞았으니 지금도 옳다고 본다"], "answer": "그 생각이 오늘날 받아들일 수 있는지 따져 본다"}, "why": "비판적 독자는 글에 반영된 사회·문화적 이념이 현재 우리의 상황에서 수용할 수 있는 것인지 판단해요. 글쓴이가 유명하거나 전문가여도 무조건 받아들이지 않아요.", "valid": ["D22:1", "D22:5"], "recall": {"prompt": "비판적 독자는 글에 반영된 ‘사회·문화적 ○○’이 현재 우리 상황에서 수용할 수 있는지 판단해요. ○○에 들어갈 말은?", "accept": ["이념", "이념이", "사상"], "reject": ["관점", "표현", "내용", "감동"]}, "rev": "b18afa87230384d2535c7c3a1efe38f944b10a0788f53005e126799cf041d51c"}, {"id": "creative", "paragraph": 0, "place": "개념", "title": "창의적 읽기와 감상적 읽기", "sources": ["D22"], "main": {"prompt": "창의적 읽기는 글에 공감하며 감동과 즐거움을 얻는 읽기다.", "options": ["O", "X"], "answer": "X"}, "narrow": [{"prompt": "‘새로운 대안을 탐구한다’는 설명은 어느 읽기의 것인가요?", "options": ["감상적 읽기", "창의적 읽기"], "answer": "창의적 읽기"}, {"prompt": "‘공감하며 감동과 즐거움을 얻는다’는 설명은 어느 읽기의 것인가요?", "options": ["감상적 읽기", "창의적 읽기"], "answer": "감상적 읽기"}], "retest": {"prompt": "창의적 읽기에 대한 설명으로 맞는 것은?", "options": ["문제 상황을 따져 보고 발상을 바꿔 새로운 대안을 찾는다", "글쓴이의 생각에 공감하며 감동과 즐거움을 얻는다", "글에 담긴 이념이 지금도 받아들일 만한지 판단한다"], "answer": "문제 상황을 따져 보고 발상을 바꿔 새로운 대안을 찾는다"}, "review": {"prompt": "[새 예시] 줄 서기 글을 읽고 “우리 학교 급식 줄도 학년별로 시간을 나누면 어떨까?” 하고 새 방법을 떠올렸어요. 어떤 읽기인가요?", "options": ["감상적 읽기", "사실적 읽기", "창의적 읽기"], "answer": "창의적 읽기"}, "why": "창의적 읽기는 문제 상황을 비판적으로 이해하고 유연한 사고로 발상을 전환해 새로운 대안을 탐구하는 읽기예요. 공감하며 감동과 즐거움을 얻는 것은 감상적 읽기예요.", "valid": ["D22:6", "D22:7"], "recall": {"prompt": "문제 상황을 비판적으로 이해하고 새로운 대안을 탐구하는 읽기는 무슨 읽기인가요?", "accept": ["창의적읽기", "창의적", "창의적인읽기"], "reject": ["감상적읽기", "감상적", "비판적읽기", "사실적읽기"]}, "rev": "b465d2d100e6cc6e8635e3caf03f2bb8d9c197d567f0e48fa0f26c55259adc88"}, {"id": "apply-fair", "paragraph": 0, "place": "적용", "title": "관점의 공정성으로 따져 보기", "sources": ["L04", "L11", "L14"], "main": {"prompt": "이 글을 관점의 공정성으로 따져 볼 때 근거로 삼을 수 있는 것은?", "options": ["필자가 야구장에서 직접 겪은 일을 근거로 들었다는 점", "필자가 시장 편 주장과 재반박을 소개하고 일부를 인정한 점", "무료 공연을 ‘시가 베푸는 선물’이라는 비유로 표현했다는 점"], "answer": "필자가 시장 편 주장과 재반박을 소개하고 일부를 인정한 점"}, "narrow": [{"prompt": "4~7문단은 누구의 생각을 소개했나요?", "options": ["시장을 옹호하는 사람들의 생각", "필자만의 생각"], "answer": "시장을 옹호하는 사람들의 생각"}, {"prompt": "‘관점의 공정성’은 무엇을 살피는 기준인가요?", "options": ["표현이 효과적인지", "한쪽으로 치우치지 않고 균형 있게 다루는지"], "answer": "한쪽으로 치우치지 않고 균형 있게 다루는지"}], "retest": {"prompt": "14문단에서 필자가 줄 서기에 대한 비판을 ‘맞는 말이지만’ 하며 일부 인정한 점은 어느 기준으로 평가할 근거인가요?", "options": ["표현 방법의 적절성", "관점의 공정성", "감상적 읽기"], "answer": "관점의 공정성"}, "review": {"prompt": "“필자가 시장 편도 소개했으니 이 글은 무조건 공정하다.” 비판적 독자의 답으로 알맞은 것은?", "options": ["맞다. 반대편 주장을 소개하기만 하면 공정한 글이다", "아니다. 공정성은 주장이 옳은지 살피는 기준이라 관계없다", "꼭 그렇지 않다. 반박하려고 소개했으니 균형은 따로 따져야 한다"], "answer": "꼭 그렇지 않다. 반박하려고 소개했으니 균형은 따로 따져야 한다"}, "why": "관점의 공정성은 글의 내용을 한쪽으로 치우치지 않고 균형 있게 다루는지 보는 기준이에요. 이 글은 시장 편 두 주장과 재반박을 소개하고(4~7·11문단), 비판을 일부 인정하기도 해요(14문단). 다만 반박하려고 소개한 것이니, 균형 여부는 근거를 대며 따져야 해요.", "valid": ["L04:1", "L11:1", "L14:2"], "recall": {"prompt": "필자가 시장 편 주장을 소개하고 일부 인정한 점은 비판적 읽기의 어느 기준으로 평가할 수 있나요?", "accept": ["관점의공정성", "공정성"], "reject": ["내용의타당성", "타당성", "표현방법의적절성", "적절성"]}, "rev": "12dc40a4b7e89d1e0a11481dfceb4f769b4b64e1df466ba7a3e6497168132b23"}, {"id": "apply-valid", "paragraph": 0, "place": "적용", "title": "야구장 예시의 타당성", "sources": ["L13"], "main": {"prompt": "야구장 예시를 내용의 타당성으로 따져 볼 때 찾을 수 있는 약점은?", "options": ["야구 이야기라서 셰익스피어 공연과는 아무 관련이 없다", "‘주머니 사정’이라는 표현이 글의 목적에 맞지 않는다", "필자 한 사람의 경험이라 모든 경우에 맞는다고 하기 어렵다"], "answer": "필자 한 사람의 경험이라 모든 경우에 맞는다고 하기 어렵다"}, "narrow": [{"prompt": "필자는 그 관객들에게 직접 물어보고 썼나요?", "options": ["직접 물어보았다", "‘의심스럽다’고 느낀 것을 썼다"], "answer": "‘의심스럽다’고 느낀 것을 썼다"}, {"prompt": "‘내용의 타당성’은 무엇을 살피는 기준인가요?", "options": ["주장과 근거가 옳고 정확한지", "표현이 아름다운지"], "answer": "주장과 근거가 옳고 정확한지"}], "retest": {"prompt": "[새 예시] 늦게 와서 일찍 떠난 관객에게 다른 사정이 있었을 수도 있다고 생각해 보는 것은 어느 기준으로 읽은 것인가요?", "options": ["감상적 읽기", "내용의 타당성", "표현 방법의 적절성"], "answer": "내용의 타당성"}, "review": {"prompt": "야구장 예시에 대한 비판적 반응으로 알맞은 것은?", "options": ["필자 개인의 경험이므로 근거로 충분한지 따져 볼 수 있다", "필자가 여러 번 직접 봤으니 따질 필요가 전혀 없다", "야구장 사례는 관점의 공정성으로만 따질 수 있다"], "answer": "필자 개인의 경험이므로 근거로 충분한지 따져 볼 수 있다"}, "why": "내용의 타당성은 근거가 옳고 정확한지 살피는 기준이에요. 야구장 예시는 필자가 자주 목격한 개인 경험이고, 필자도 ‘의심스럽다’고 했을 뿐이라 모든 경우에 맞는 근거인지 따져 볼 수 있어요.", "valid": ["L13:1", "L13:2"], "recall": {"prompt": "야구장 예시가 근거로 충분한지 따지는 것은 비판적 읽기의 어느 기준인가요?", "accept": ["내용의타당성", "타당성"], "reject": ["관점의공정성", "공정성", "표현방법의적절성", "적절성"]}, "rev": "3b90a8c2d30e246c05d7a5f1dd6b484f6f667487df7c12cad11ace2c734e32cf"}, {"id": "apply-expression", "paragraph": 0, "place": "적용", "title": "선물 비유의 적절성", "sources": ["D22", "L18"], "main": {"prompt": "‘시가 스스로에게 베푸는 선물’이라는 비유가 무료 공연의 취지를 전하기에 알맞은지 살피는 기준은?", "options": ["내용의 타당성", "표현 방법의 적절성", "관점의 공정성"], "answer": "표현 방법의 적절성"}, "narrow": [{"prompt": "비유는 글의 내용인가요, 표현 방법인가요?", "options": ["표현 방법", "내용"], "answer": "표현 방법"}, {"prompt": "표현 방법의 적절성을 따질 때 비추어 보는 것은?", "options": ["글쓴이의 나이", "글의 목적과 내용"], "answer": "글의 목적과 내용"}], "retest": {"prompt": "선물 비유를 비판적으로 읽은 반응으로 알맞은 것은?", "options": ["시청이 공연 뒤에 실제로 선물을 나눠 줬는지 확인한다", "무료 공연이 모두를 위한 것이라는 취지를 잘 전하는지 살핀다", "비유가 멋있기만 하면 글의 목적과 상관없이 좋다"], "answer": "무료 공연이 모두를 위한 것이라는 취지를 잘 전하는지 살핀다"}, "review": {"prompt": "표현 방법의 적절성은 무엇에 비추어 평가하나요?", "options": ["글의 길이", "글의 목적과 내용", "글쓴이가 유명한지"], "answer": "글의 목적과 내용"}, "why": "표현 방법의 적절성은 글의 목적과 내용에 비추어 표현이 효과적이고 적절한지 평가하는 기준이에요. 선물 비유가 ‘누구나 평등하게 누리는 공공 축제’라는 취지를 잘 전하는지 살필 수 있어요.", "valid": ["D22:4", "L18:2"], "recall": {"prompt": "비유가 글의 목적과 내용에 알맞은지 따지는 기준의 이름은?", "accept": ["표현방법의적절성", "적절성", "표현의적절성", "표현방법"], "reject": ["내용의타당성", "타당성", "관점의공정성", "공정성"]}, "rev": "957748ec5b068f4a18dc10256606991e6bb04516bffd132e0c1789b9f13630df"}, {"id": "apply-creative", "paragraph": 0, "place": "적용", "title": "내 생활에 옮겨 보기", "sources": ["L16"], "main": {"prompt": "[새 예시] 16문단의 생각을 우리 생활에 옮긴 것으로 가장 알맞은 것은?", "options": ["반장도 돈을 가장 많이 내는 학생이 가장 원하는 사람이니 돈으로 정하는 게 낫다", "반장 자리를 돈으로 사면 뽑는 방식이 바뀌어 그 자리의 의미도 달라질 수 있다", "급식 줄을 오래 서면 시간이 아까우니 줄 서기를 모두 없애야 한다"], "answer": "반장 자리를 돈으로 사면 뽑는 방식이 바뀌어 그 자리의 의미도 달라질 수 있다"}, "narrow": [{"prompt": "16문단은 무엇이 재화의 본질의 일부일 수도 있다고 했나요?", "options": ["분배 방식", "가격"], "answer": "분배 방식"}, {"prompt": "반장 자리를 돈으로 사면, 사람들이 그 자리를 예전과 같은 뜻으로 볼까요?", "options": ["그대로 같은 뜻으로 본다", "뜻이 달라질 수 있다"], "answer": "뜻이 달라질 수 있다"}], "retest": {"prompt": "[새 예시] 다음 중 ‘나누는 방식이 그 물건의 뜻의 일부’라고 볼 수 있는 것은?", "options": ["편의점에서 아무렇게나 산 생수", "친구가 직접 골라 준 생일 선물", "자동판매기에서 뽑은 음료수"], "answer": "친구가 직접 골라 준 생일 선물"}, "review": {"prompt": "창의적 읽기를 한 반응으로 알맞은 것은?", "options": ["글쓴이의 생각에 깊이 공감하며 감동과 즐거움을 느꼈다고 말한다", "16~18문단 내용을 빠짐없이 순서대로 요약해 정리한다", "16문단 생각으로 학교 행사에서 돈으로 사면 안 되는 것을 찾아 새 규칙을 낸다"], "answer": "16문단 생각으로 학교 행사에서 돈으로 사면 안 되는 것을 찾아 새 규칙을 낸다"}, "why": "16문단은 재화의 분배 방식이 본질의 일부일 수도 있다고 해요. 친구들이 뽑아 준다는 방식이 반장 자리의 뜻의 일부라면, 그 자리를 돈으로 사는 순간 의미가 달라질 수 있어요. 이렇게 글의 생각을 내 생활에 옮겨 새로운 대안을 찾는 것이 창의적 읽기예요.", "valid": ["L16:3", "L16:4"], "recall": {"prompt": "16문단에서 ‘본질의 일부일 수도 있다’고 한 것은 재화의 무엇인가요?", "accept": ["분배방식", "분배", "나누는방식", "분배하는방식"], "reject": ["가격", "효용", "가치", "품질"]}, "rev": "b37974624f54062756135c61e72e6b808b37778b30571611146c7613ff5af6f2"}], "diagnostic": ["meaning", "criteria", "ideology", "creative", "apply-fair"], "diagnosticRevision": 1, "diagnosticContext": {"meaning": {"title": "판단할 문장", "text": ["“비판적 읽기는 글쓴이의 말에 무조건 반대하면서 읽는 것이다.”"], "prompt": "위 문장은 비판적 읽기를 바르게 설명한다."}, "criteria": {"title": "어떤 기준일까요?", "text": ["한 학생이 글을 읽고 “이 글은 한쪽 편 이야기만 하는 것 같아”라고 말했어요."], "prompt": "이 학생이 살핀 비판적 읽기 기준은?"}, "ideology": {"title": "판단할 문장", "text": ["“글쓴이가 유명한 교수라면 글에 담긴 생각은 따지지 않고 받아들여도 된다.”"], "prompt": "위 문장은 비판적 읽기에 맞는 태도이다."}, "creative": {"title": "판단할 문장", "text": ["“창의적 읽기는 글에 공감하며 감동과 즐거움을 얻는 읽기다.”"], "prompt": "위 문장은 창의적 읽기를 바르게 설명한다."}, "apply-fair": {"title": "줄 서기 글의 짜임", "text": ["글쓴이는 시장을 옹호하는 두 주장과 경제학자 맨큐의 설명을 자세히 소개한다.", "시장 옹호자들이 보일 수 있는 반응도 예상해 싣고, 줄 서기에 대한 비판 일부를 ‘맞는 말이지만’ 하며 인정한다."], "prompt": "이런 짜임을 근거로 이 글을 평가할 때 쓰는 기준은?"}}, "combined": [{"prompt": "윗글을 비판적으로 읽은 반응으로 적절하지 않은 것은?", "options": ["시장 옹호 입장을 소개한 뒤 반박하므로, 균형 있게 다뤘는지 관점의 공정성 측면에서 따져 볼 수 있다", "필자가 시장 편 주장을 모두 받아들였으므로, 필자의 결론은 시장 편의 결론과 같다고 판단할 수 있다", "야구장 사례는 필자 개인의 경험이므로 근거로 충분한지 내용의 타당성 측면에서 따져 볼 수 있다"], "answer": "필자가 시장 편 주장을 모두 받아들였으므로, 필자의 결론은 시장 편의 결론과 같다고 판단할 수 있다", "why": "필자는 시장 편 주장을 소개하고 반박했지, 받아들이지 않았어요. 나머지 두 반응은 비판적 읽기 기준을 글에 바르게 적용한 것이에요.", "valid": ["L11:1", "L13:1", "L16:2"], "sources": ["L11", "L13", "L16"], "narrow": [{"prompt": "필자는 결국 시장 편 주장에 동의했나요, 반박했나요?", "options": ["동의했다", "반박했다"], "answer": "반박했다"}, {"prompt": "야구장 사례는 누구의 경험인가요?", "options": ["필자 개인의 경험", "여러 사람을 조사한 결과"], "answer": "필자 개인의 경험"}], "retest": {"prompt": "‘공공의 축제를 돈벌이 도구로 바꾸면 안 된다’는 생각이 오늘날 우리 사회에서도 받아들여질 수 있는지 판단하는 것은 무엇을 따지는 것인가요?", "options": ["사회·문화적 이념", "표현 방법의 적절성", "감상적 읽기"], "answer": "사회·문화적 이념"}, "review": {"prompt": "‘시가 스스로에게 베푸는 선물’이라는 비유가 무료 공연의 취지를 전하기에 알맞은지 살피는 반응은 어느 기준을 적용한 것인가요?", "options": ["관점의 공정성", "표현 방법의 적절성", "내용의 타당성"], "answer": "표현 방법의 적절성"}, "rev": "e64ed62816ce8d7c8d7b5285e9cf93dd2208d0a5de2afb0f83b14d203d82ad80"}, {"prompt": "[새 예시] 학교 결승전 응원석을 선착순 무료로 나눠 주는데, 한 학생이 자리를 여러 개 맡아 3천 원씩 받고 넘기려 해요. 필자의 관점에서 평가한 것으로 가장 알맞은 것은?", "options": ["돈을 낸 학생이 가장 간절한 학생이므로 자리를 가장 효율적으로 나눈 것이다", "선착순도 시간이 많은 학생에게 유리한 차별이니 돈으로 팔아도 문제없다", "돈에는 능력도 섞여 간절한 학생이 밀릴 수 있고, 함께 응원한다는 취지에 어긋난다"], "answer": "돈에는 능력도 섞여 간절한 학생이 밀릴 수 있고, 함께 응원한다는 취지에 어긋난다", "why": "12문단 논리로는 가격에 내려는 마음뿐 아니라 낼 수 있는 능력도 들어가 간절한 학생이 밀릴 수 있어요. 16·18문단 논리로는 무료 선착순이라는 나누는 방식이 모두 함께 응원한다는 취지의 일부일 수 있는데, 이를 개인 돈벌이로 바꾸는 것은 그 취지에 어긋나요.", "valid": ["L16:4", "L18:7"], "sources": ["L16", "L18"], "narrow": [{"prompt": "12문단에 따르면 돈으로 나누면 가격에 무엇이 함께 섞이나요?", "options": ["낼 수 있는 능력", "기다릴 수 있는 시간"], "answer": "낼 수 있는 능력"}, {"prompt": "16문단에 따르면 무료 선착순이라는 나누는 방식은 그 자리의 무엇일 수도 있나요?", "options": ["본질의 일부", "아무 상관 없는 절차"], "answer": "본질의 일부"}], "retest": {"prompt": "[새 예시] 무료로 나눠 준 학교 축제 공연 표를 돈 받고 파는 일을 필자의 말로 평가하면?", "options": ["시장이 효율적 결론에 이르는 일", "공공의 축제를 사적 이익의 도구로 바꾸는 일", "가장 간절한 학생에게 표를 주는 일"], "answer": "공공의 축제를 사적 이익의 도구로 바꾸는 일"}, "review": {"prompt": "이 상황을 평가하며 ‘나누는 방식은 그 자리의 본질이다’라고 단정해 쓰면 어떤 문제가 있나요?", "options": ["문제가 없다. 필자도 본질이라고 단정했다", "‘일부일 수도 있다’보다 세게 말한 정도 함정이 된다", "필자의 말을 쿠오모의 말로 바꾼 주체 함정이 된다"], "answer": "‘일부일 수도 있다’보다 세게 말한 정도 함정이 된다"}, "rev": "05c91de709970412bfe41e0ad1ed3c3ecd5ab8911e68bbe1db7806022dd2d1a5"}], "sources": {"D22": {"id": "D22", "title": "비판적 읽기와 다양한 읽기 방법", "label": "교과서 49쪽 개념 발췌 정리", "text": "비판적 읽기는 글의 내용과 필자의 생각을 무조건 수용하지 않고, 글에 제시된 내용이 올바른지 따져 가며 읽는 것이다. 내용의 타당성은 글에 나타난 주장이나 의견, 근거 등 글의 내용이 옳고 정확한지 살피는 기준이다. 관점의 공정성은 필자가 글의 내용을 한쪽으로 치우치지 않고 균형 있게 다루는지 판단하는 기준이다. 표현 방법의 적절성은 글의 목적과 내용에 비추어 표현 방법이 효과적이고 적절한지 평가하는 기준이다. 비판적 독자는 글에 반영된 사회·문화적 이념이 현재 우리의 상황에서 수용할 수 있는 것인지 판단한다. 창의적 읽기는 문제 상황을 비판적으로 이해하고 유연한 사고로 발상을 전환하며 새로운 대안을 탐구하는 읽기이다. 감상적 읽기는 글의 내용이나 필자의 생각에 공감하며 감동과 즐거움을 얻는 읽기이며, 서로 다른 감상을 공유하여 이해를 풍부하게 할 수 있다.", "sentences": [{"id": "D22:1", "text": "비판적 읽기는 글의 내용과 필자의 생각을 무조건 수용하지 않고, 글에 제시된 내용이 올바른지 따져 가며 읽는 것이다.", "paragraph": 0, "memberIds": ["D22:1"], "topic": "비판적 읽기"}, {"id": "D22:2", "text": "내용의 타당성은 글에 나타난 주장이나 의견, 근거 등 글의 내용이 옳고 정확한지 살피는 기준이다.", "paragraph": 0, "memberIds": ["D22:2"], "topic": "내용의 타당성"}, {"id": "D22:3", "text": "관점의 공정성은 필자가 글의 내용을 한쪽으로 치우치지 않고 균형 있게 다루는지 판단하는 기준이다.", "paragraph": 0, "memberIds": ["D22:3"], "topic": "관점의 공정성"}, {"id": "D22:4", "text": "표현 방법의 적절성은 글의 목적과 내용에 비추어 표현 방법이 효과적이고 적절한지 평가하는 기준이다.", "paragraph": 0, "memberIds": ["D22:4"], "topic": "표현 방법의 적절성"}, {"id": "D22:5", "text": "비판적 독자는 글에 반영된 사회·문화적 이념이 현재 우리의 상황에서 수용할 수 있는 것인지 판단한다.", "paragraph": 0, "memberIds": ["D22:5"], "topic": "사회·문화적 이념"}, {"id": "D22:6", "text": "창의적 읽기는 문제 상황을 비판적으로 이해하고 유연한 사고로 발상을 전환하며 새로운 대안을 탐구하는 읽기이다.", "paragraph": 0, "memberIds": ["D22:6"], "topic": "창의적 읽기"}, {"id": "D22:7", "text": "감상적 읽기는 글의 내용이나 필자의 생각에 공감하며 감동과 즐거움을 얻는 읽기이며, 서로 다른 감상을 공유하여 이해를 풍부하게 할 수 있다.", "paragraph": 0, "memberIds": ["D22:7"], "topic": "감상적 읽기"}]}, "L04": {"id": "L04", "title": "줄 서기를 돈으로 살 수 있을까", "label": "4문단", "text": "줄 서기에 관해 시장을 옹호하는 입장에는 두 가지 주장이 있다. 하나는 개인의 자유 존중에 대한 것이고, 다른 하나는 행복이나 사회적 효용의 극대화에 대한 주장이다. 첫 번째는 자유 지상주의자의 입장이다. 그들은 타인의 권리를 침범하지 않는 한 원하는 재화는 무엇이든 자유롭게 사고팔 수 있어야 한다고 주장한다. 자유 지상주의자는 장기 매매 금지법에 반대하는 것과 같은 이유로 암표 매매 금지법에 반대한다. 이러한 법은 성인이 상호 동의에 따라 내린 선택을 방해함으로써 개인의 자유를 침해한다고 믿기 때문이다.", "sentences": [{"id": "L04:1", "text": "줄 서기에 관해 시장을 옹호하는 입장에는 두 가지 주장이 있다.", "paragraph": 0, "memberIds": ["L04:1"], "topic": "돈으로 줄을 사는 것(시장)에 찬성하는 쪽의 이유는 두 가지다."}, {"id": "L04:2", "text": "하나는 개인의 자유 존중에 대한 것이고, 다른 하나는 행복이나 사회적 효용의 극대화에 대한 주장이다.", "paragraph": 0, "memberIds": ["L04:2"], "topic": "첫째는 '개인의 자유를 존중하자'는 것이다. 둘째는 '사람들의 만족(효용)을 가장 크게 만들자'는 것이다."}, {"id": "L04:3", "text": "첫 번째는 자유 지상주의자의 입장이다.", "paragraph": 0, "memberIds": ["L04:3"], "topic": "첫째 이유는 '자유 지상주의자'의 생각이다. 개인의 자유를 무엇보다 중요하게 여기는 사람들이다."}, {"id": "L04:4", "text": "그들은 타인의 권리를 침범하지 않는 한 원하는 재화는 무엇이든 자유롭게 사고팔 수 있어야 한다고 주장한다.", "paragraph": 0, "memberIds": ["L04:4"], "topic": "그들은 이렇게 말한다. \"남의 권리를 침범하지(피해를 주지) 않는 한, 무엇이든 자유롭게 사고팔 수 있어야 한다.\""}, {"id": "L04:5", "text": "자유 지상주의자는 장기 매매 금지법에 반대하는 것과 같은 이유로 암표 매매 금지법에 반대한다.", "paragraph": 0, "memberIds": ["L04:5"], "topic": "그래서 그들은 '암표를 팔지 마라'는 법에 반대한다. '장기를 사고팔지 마라'는 법에 반대하는 것과 같은 이유에서다."}, {"id": "L04:6", "text": "이러한 법은 성인이 상호 동의에 따라 내린 선택을 방해함으로써 개인의 자유를 침해한다고 믿기 때문이다.", "paragraph": 0, "memberIds": ["L04:6"], "topic": "어른 둘이 서로 좋다고 합의한 거래를 법이 막으면, 개인의 자유를 빼앗는 것이라고 믿기 때문이다."}]}, "L11": {"id": "L11", "title": "줄 서기를 돈으로 살 수 있을까", "label": "11문단", "text": "이러한 주장에 대해 자유 시장 옹호자들은 다음과 같은 반응을 보일 수 있다. 극장 측이 연극을 열렬하게 관람하고 싶어 하는 사람들로 관람석을 채우고 공연이 주는 즐거움을 극대화하고 싶다면, 그 가치를 가장 높게 평가하는 사람에게 입장권이 돌아가기를 원해야 한다. 그런데 그 사람은 바로 입장권에 최고 가격을 지불하는 사람들이다. 따라서 공연에서 최대의 즐거움을 끌어낼 관객으로 극장을 채울 수 있는 최선의 방법은 입장권을 자유 시장에 맡기는 것이다. 다시 말해 시장이 수용할 수 있는 가격이 얼마가 됐든 그 가격에 입장권을 판매하든지, 아니면 돈을 받고 대신 줄을 선 사람이나 암표상이 가장 높은 가격을 지불하려는 사람에게 입장권을 팔 수 있도록 허용하는 것이다. 최고 가격을 자발적으로 지불하는 사람에게 입장권이 돌아가게 하는 것이 셰익스피어 공연의 가치를 가장 높게 평가하는 사람을 결정하는 최고의 방법이다.", "sentences": [{"id": "L11:1", "text": "이러한 주장에 대해 자유 시장 옹호자들은 다음과 같은 반응을 보일 수 있다.", "paragraph": 0, "memberIds": ["L11:1"], "topic": "“이러한 주장”은 앞 문단의 “암표 거래는 돈이 부족한 사람에게 불공정하다”는 주장이다. 이에 대해 자유 시장 옹호자들이 아래처럼 반론할 수 있다고 필자가 예상한다."}, {"id": "L11:2", "text": "극장 측이 연극을 열렬하게 관람하고 싶어 하는 사람들로 관람석을 채우고 공연이 주는 즐거움을 극대화하고 싶다면, 그 가치를 가장 높게 평가하는 사람에게 입장권이 돌아가기를 원해야 한다.", "paragraph": 0, "memberIds": ["L11:2"], "topic": "\"극장은 정말 보고 싶은 사람들로 자리를 채우고 싶지? 공연의 즐거움을 최대로 하고 싶지? 그렇다면 공연을 가장 귀하게 여기는 사람에게 표가 가야 해.\""}, {"id": "L11:3", "text": "그런데 그 사람은 바로 입장권에 최고 가격을 지불하는 사람들이다.", "paragraph": 0, "memberIds": ["L11:3"], "topic": "\"그 사람이 누구냐고? 바로 표에 가장 비싼 돈을 내는 사람이야.\""}, {"id": "L11:4", "text": "따라서 공연에서 최대의 즐거움을 끌어낼 관객으로 극장을 채울 수 있는 최선의 방법은 입장권을 자유 시장에 맡기는 것이다.", "paragraph": 0, "memberIds": ["L11:4"], "topic": "\"그러니까 표를 시장에 맡기는 게 가장 좋은 방법이야.\""}, {"id": "L11:5", "text": "다시 말해 시장이 수용할 수 있는 가격이 얼마가 됐든 그 가격에 입장권을 판매하든지, 아니면 돈을 받고 대신 줄을 선 사람이나 암표상이 가장 높은 가격을 지불하려는 사람에게 입장권을 팔 수 있도록 허용하는 것이다.", "paragraph": 0, "memberIds": ["L11:5"], "topic": "\"방법은 두 가지야. ㉠ 극장이 사람들이 낼 수 있는 만큼 값을 매겨 표를 팔거나, ㉡ 줄 알바나 암표상이 가장 비싸게 사려는 사람에게 팔게 내버려 두거나.\""}, {"id": "L11:6", "text": "최고 가격을 자발적으로 지불하는 사람에게 입장권이 돌아가게 하는 것이 셰익스피어 공연의 가치를 가장 높게 평가하는 사람을 결정하는 최고의 방법이다.", "paragraph": 0, "memberIds": ["L11:6"], "topic": "\"스스로 가장 비싼 돈을 내는 사람에게 표를 주는 것, 그게 공연을 가장 좋아하는 사람을 고르는 최고의 방법이야.\""}]}, "L13": {"id": "L13", "title": "줄 서기를 돈으로 살 수 있을까", "label": "13문단", "text": "예를 들어 나는 야구장에 늦게 도착해 비싼 관람석에 앉았다가 일찍 자리를 뜨는 사람들을 자주 목격한다. 그럴 때면 그들이 야구를 얼마나 좋아하는지 의심스럽다. 이렇듯 비싼 관람석에 앉을 수 있는 경제적 능력은 경기를 향한 열정보다는 주머니 사정과 관계가 깊을 수 있다. 오히려 경제적 여유는 없지만 선발 출전 선수들의 평균 타율을 전부 꿰고 있는 팬들, 특히 젊은 팬들이 그들보다 야구를 좋아하는 것만은 확실하다. 시장 가격은 자발적으로 가격을 지불하려는 마음뿐만 아니라 능력도 반영하므로, 누가 특정 재화의 가치를 가장 높게 평가하는 사람인지 가려내기에는 불완전한 지표다. 어떨 때는 공연을 관람하거나 야구 경기를 보기 위해 자발적으로 줄을 서고자 하는 태도가 가격을 지불하고자 하는 태도보다 관람을 정말 원하는 사람을 나타내는 지표일 수 있다.", "sentences": [{"id": "L13:1", "text": "예를 들어 나는 야구장에 늦게 도착해 비싼 관람석에 앉았다가 일찍 자리를 뜨는 사람들을 자주 목격한다.", "paragraph": 0, "memberIds": ["L13:1"], "topic": "예를 들어 필자는 야구장에서 이런 사람들을 자주 본다. 늦게 와서 비싼 자리에 앉았다가 일찍 가 버리는 사람들이다."}, {"id": "L13:2", "text": "그럴 때면 그들이 야구를 얼마나 좋아하는지 의심스럽다.", "paragraph": 0, "memberIds": ["L13:2"], "topic": "그럴 때 필자는 '저 사람들, 야구를 정말 좋아하는 걸까?' 하고 의심한다."}, {"id": "L13:3", "text": "이렇듯 비싼 관람석에 앉을 수 있는 경제적 능력은 경기를 향한 열정보다는 주머니 사정과 관계가 깊을 수 있다.", "paragraph": 0, "memberIds": ["L13:3"], "topic": "이처럼 비싼 자리에 앉는 건 경기를 좋아하는 마음 때문이라기보다 돈이 많아서일 수 있다."}, {"id": "L13:4", "text": "오히려 경제적 여유는 없지만 선발 출전 선수들의 평균 타율을 전부 꿰고 있는 팬들, 특히 젊은 팬들이 그들보다 야구를 좋아하는 것만은 확실하다.", "paragraph": 0, "memberIds": ["L13:4"], "topic": "오히려 돈은 없어도 선발 선수들의 타율(안타를 치는 비율)을 다 외우는 팬, 특히 젊은 팬들이 그 사람들보다 야구를 더 좋아하는 건 확실하다."}, {"id": "L13:5", "text": "시장 가격은 자발적으로 가격을 지불하려는 마음뿐만 아니라 능력도 반영하므로, 누가 특정 재화의 가치를 가장 높게 평가하는 사람인지 가려내기에는 불완전한 지표다.", "paragraph": 0, "memberIds": ["L13:5"], "topic": "가격에는 마음과 돈(능력)이 같이 들어 있다. 그래서 가격만 보고는 누가 가장 좋아하는지 정확히 알 수 없다. 가격은 정확하지 않은 자(불완전한 지표)다."}, {"id": "L13:6", "text": "어떨 때는 공연을 관람하거나 야구 경기를 보기 위해 자발적으로 줄을 서고자 하는 태도가 가격을 지불하고자 하는 태도보다 관람을 정말 원하는 사람을 나타내는 지표일 수 있다.", "paragraph": 0, "memberIds": ["L13:6"], "topic": "때로는 '몇 시간이라도 줄 서겠다'는 마음이 '돈을 내겠다'는 마음보다 진짜 팬을 더 잘 보여 줄 수 있다."}]}, "L14": {"id": "L14", "title": "줄 서기를 돈으로 살 수 있을까", "label": "14문단", "text": "암표 거래를 옹호하는 사람들은 줄 서기가 시간이 남아도는 사람들에게 유리한 차별이라고 비판한다. 맞는 말이지만, 시장이 돈 많은 사람들을 유리하게 차별한다는 말과 같은 맥락에서만 그러하다. 시장이 자발적으로 돈을 지불하려는 마음과 능력을 바탕으로 재화를 분배하듯, 줄 서기는 자발적으로 기다리려는 마음과 능력을 바탕으로 재화를 분배한다. 그리고 자발적으로 가격을 지불하려는 마음이, 자발적으로 줄을 서서 기다리려는 마음보다 더 나은 가치 평가 기준이라고 추정할 근거는 없다.", "sentences": [{"id": "L14:1", "text": "암표 거래를 옹호하는 사람들은 줄 서기가 시간이 남아도는 사람들에게 유리한 차별이라고 비판한다.", "paragraph": 0, "memberIds": ["L14:1"], "topic": "암표 거래를 옹호하는 사람들은 “줄 서기도 시간이 많은 사람에게 유리한 차별이다”라고 비판한다."}, {"id": "L14:2", "text": "맞는 말이지만, 시장이 돈 많은 사람들을 유리하게 차별한다는 말과 같은 맥락에서만 그러하다.", "paragraph": 0, "memberIds": ["L14:2"], "topic": "필자는 그 지적을 인정한다. 다만 시장도 돈 많은 사람에게 유리하므로, 줄 서기에만 있는 문제는 아니라고 말한다."}, {"id": "L14:3", "text": "시장이 자발적으로 돈을 지불하려는 마음과 능력을 바탕으로 재화를 분배하듯, 줄 서기는 자발적으로 기다리려는 마음과 능력을 바탕으로 재화를 분배한다.", "paragraph": 0, "memberIds": ["L14:3"], "topic": "시장은 '돈 낼 마음 + 돈'으로 나눈다. 줄 서기는 '기다릴 마음 + 시간'으로 나눈다."}, {"id": "L14:4", "text": "그리고 자발적으로 가격을 지불하려는 마음이, 자발적으로 줄을 서서 기다리려는 마음보다 더 나은 가치 평가 기준이라고 추정할 근거는 없다.", "paragraph": 0, "memberIds": ["L14:4"], "topic": "그리고 '돈을 내겠다는 마음'이 '기다리겠다는 마음'보다 더 좋은 기준이라고 볼 이유는 없다."}]}, "L16": {"id": "L16", "title": "줄 서기를 돈으로 살 수 있을까", "label": "16문단", "text": "그런데 줄 서기보다 시장 논리를 옹호하는 공리주의자들의 주장은 더욱 근본적인 반박에 부딪히기 쉽다. 즉 공리주의적 사고가 유일하게 중요한 견해는 아니라는 반박이다. 어떤 재화는 구매자와 판매자에게 부여하는 효용을 넘어선 가치를 지닌다. 재화의 분배 방식은 재화가 지닌 본질의 일부일 수도 있다.", "sentences": [{"id": "L16:1", "text": "그런데 줄 서기보다 시장 논리를 옹호하는 공리주의자들의 주장은 더욱 근본적인 반박에 부딪히기 쉽다.", "paragraph": 0, "memberIds": ["L16:1"], "topic": "그런데 공리주의자의 주장에는 더 뿌리 깊은(근본적인) 문제가 있다."}, {"id": "L16:2", "text": "즉 공리주의적 사고가 유일하게 중요한 견해는 아니라는 반박이다.", "paragraph": 0, "memberIds": ["L16:2"], "topic": "바로 '행복(효용)의 양만 따지는 생각이 전부는 아니다'라는 것이다."}, {"id": "L16:3", "text": "어떤 재화는 구매자와 판매자에게 부여하는 효용을 넘어선 가치를 지닌다.", "paragraph": 0, "memberIds": ["L16:3"], "topic": "어떤 것은 사고파는 사람이 얻는 만족보다 더 큰 가치를 가진다."}, {"id": "L16:4", "text": "재화의 분배 방식은 재화가 지닌 본질의 일부일 수도 있다.", "paragraph": 0, "memberIds": ["L16:4"], "topic": "그리고 '어떻게 나눠 주느냐'가 그 물건의 진짜 의미(본질)의 일부일 수도 있다."}]}, "L18": {"id": "L18", "title": "줄 서기를 돈으로 살 수 있을까", "label": "18문단", "text": "퍼블릭 시어터는 무료 야외 공연을 대중의 축제이자 일종의 시민 축하 행사로 생각한다. 말하자면 시(市)가 스스로에게 베푸는 선물인 셈이다. 물론 좌석 수는 한정되어 있다. 정해진 저녁 시간에 시민 전체가 참석할 수는 없기 때문이다. 하지만 퍼블릭 시어터의 취지는 관람료 지불 능력과 전혀 관계없이 누구나 평등하게 셰익스피어 공연을 무료로 관람할 수 있게 하는 것이다. 본래 선물이어야 하는 행사로 입장료를 받거나 암표상이 이득을 취하게 허용하는 일은 이러한 취지에 어긋난다. 이는 공공의 축제를 돈벌이, 즉 사적 이익을 취득하기 위한 도구로 바꾸는 행위다.", "sentences": [{"id": "L18:1", "text": "퍼블릭 시어터는 무료 야외 공연을 대중의 축제이자 일종의 시민 축하 행사로 생각한다.", "paragraph": 0, "memberIds": ["L18:1"], "topic": "극장은 이 무료 공연을 모두의 축제, 시민들의 잔치로 여긴다."}, {"id": "L18:2", "text": "말하자면 시(市)가 스스로에게 베푸는 선물인 셈이다.", "paragraph": 0, "memberIds": ["L18:2"], "topic": "말하자면 도시가 시민들, 곧 자기 자신에게 주는 선물이다."}, {"id": "L18:3", "text": "물론 좌석 수는 한정되어 있다.", "paragraph": 0, "memberIds": ["L18:3"], "topic": "물론 자리는 정해져 있다."}, {"id": "L18:4", "text": "정해진 저녁 시간에 시민 전체가 참석할 수는 없기 때문이다.", "paragraph": 0, "memberIds": ["L18:4"], "topic": "그날 저녁에 모든 시민이 다 올 수는 없으니까."}, {"id": "L18:5", "text": "하지만 퍼블릭 시어터의 취지는 관람료 지불 능력과 전혀 관계없이 누구나 평등하게 셰익스피어 공연을 무료로 관람할 수 있게 하는 것이다.", "paragraph": 0, "memberIds": ["L18:5"], "topic": "하지만 극장이 원래 하려던 것(취지)은 돈이 있든 없든 누구나 똑같이 공짜로 공연을 보게 하는 것이다."}, {"id": "L18:6", "text": "본래 선물이어야 하는 행사로 입장료를 받거나 암표상이 이득을 취하게 허용하는 일은 이러한 취지에 어긋난다.", "paragraph": 0, "memberIds": ["L18:6"], "topic": "원래 선물이어야 할 행사에서 입장료를 받거나 암표상이 돈을 벌게 놔두면, 그 목적과 어긋난다."}, {"id": "L18:7", "text": "이는 공공의 축제를 돈벌이, 즉 사적 이익을 취득하기 위한 도구로 바꾸는 행위다.", "paragraph": 0, "memberIds": ["L18:7"], "topic": "그건 모두의 축제를 개인의 돈벌이 수단(사적 이익의 도구)으로 바꿔 버리는 일이다."}]}}}];

;
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

;
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
 function render(){if(!live)return;const s=model.state();if(!s)return;const current=model.skill?.()||s.content.skills[s.index];root.replaceChildren();const wrap=el('section','socratic-panel');root.append(wrap);const heading=el('header','socratic-heading');heading.append(el('small','','2-2 · '+course(s)+' · 질문하며 읽기'),el('h2','',s.screen==='diagnostic'?'알고 있는 것부터 확인해요':s.screen==='summary'?'여기까지 배운 내용':s.screen==='welcome'?'하나씩 읽고, 생각하고, 확인해요':s.screen==='placement'?'이제 글을 읽으며 확인해요':s.mode==='combined'?course(s)+' · 핵심 연결':s.mode==='recall'?'본문 없이 기억해 보기':place(current)+' · '+current.title));wrap.append(heading);
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
 const k=current,c=s.mode==='combined'?model.combinedItem?.()||s.content.combined[s.index]:null,q=model.question(),feedback=['explanation','evidence-feedback','feedback'].includes(s.screen),hidePassage=s.screen==='diagnostic'||s.mode==='recall'&&s.node==='recall';
 const grid=el('div','socratic-grid'),left=el('article','socratic-passage'),right=el('section','socratic-question');grid.append(left,right);wrap.append(grid);
 const explanation=c?c.why:k.why;
 const highlighted=c?c.valid:s.screen==='evidence-feedback'&&k.evidence?k.evidence.correct.flatMap(i=>k.evidence.groups[i]):k.valid;
 if(s.screen==='diagnostic'&&q.context){left.setAttribute('aria-label','진단 질문에 필요한 내용');left.append(el('h3','',q.context.title));for(const text of q.context.text)left.append(el('p','socratic-source',text));left.append(el('small','','위 내용을 읽고 질문에 답해 보세요.'));}
 else if(hidePassage){left.append(el('h3','','지금은 기억으로 생각해 봐요'),el('p','','모르면 “모름”을 눌러도 괜찮아요.'));}
 else {
  const bar=el('div','socratic-passage-title');bar.append(el('h3','','지문'));button(bar,'지문 크게 보기',()=>{const d=el('dialog','socratic-dialog');const body=left.cloneNode(true);body.querySelectorAll('button').forEach(b=>b.remove());d.append(body);button(d,'닫기',()=>{d.close();d.remove();},true);document.body.append(d);d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();});left.append(bar);
  const sources=sourceIds(s,c||k).map(id=>(model.content?.sources||s.content.sources)[id]||s.content.sources[id]).filter(Boolean);
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

;
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

;
/*
 * HomeworkStudySession: a local study-session controller, independent of quiz timers.
 * create({window, document, storage, key, testMode, now, onChange, onAlert, onComplete, onRecord})
 *   startHomework({allowWindowed:false}) -> Promise<{started,state}>
 *   startClass(), requestFullscreen() -> Promise<boolean>, activity(), snapshot(),
 *   evaluate(now?), stop(), end(), dispose().
 * onChange/onComplete receive a detached snapshot. onAlert receives that snapshot
 * plus {reason,level}. active means homework monitoring is running; class is inactive.
 * pending means a new homework session is awaiting fullscreen or explicit windowed
 * consent. dispose removes listeners without deleting a session saved for reload.
 * initialState({now,mode,testMode,windowed}) and evaluateState(state,now) are pure;
 * evaluateState returns {state,alerts:[{reason,level}],completed}.
 * onRecord receives an epoch-timestamped, detached session record every 10 seconds
 * and at start/alerts/end/pagehide. Test accounts do not emit records. Observation
 * counts only callback intervals <=5 seconds; reload and lifecycle gaps are unknown.
 * Expiry across an unobserved boundary is interrupted/unobserved, not completed/timer.
 */
(function(global){
'use strict';
const DURATION_MS=30*60*1000,NOTICE_MS=10000,WARNING_MS=20000,REPEAT_MS=20000,RECORD_INTERVAL_MS=10000,OBSERVATION_GAP_MS=5000;
const copy=value=>({...value});
function initialState({now=Date.now(),mode='homework',testMode=false,windowed=false}={}){
 const active=mode==='homework';
 return {version:1,mode,active,testMode:!!testMode,windowed:!!windowed,pending:false,
  startedAt:active?now:null,deadline:active&&!testMode?now+DURATION_MS:null,
  remainingMs:active&&!testMode?DURATION_MS:null,elapsedMs:0,lastActivityAt:now,
  idleMs:0,idleLevel:'active',idleNoticeSent:false,idleWarningStep:0,
  hidden:false,fullscreen:false,fullscreenSupported:false,fullscreenRequested:false,
  fullscreenError:null,attention:null,completedAt:null};
}
function evaluateState(input,now=Date.now()){
 const state=copy(input),alerts=[];
 if(!state.active||state.mode!=='homework')return {state,alerts,completed:false};
 state.elapsedMs=Math.max(0,now-state.startedAt);
 state.remainingMs=state.deadline==null?null:Math.max(0,state.deadline-now);
 state.idleMs=Math.max(0,now-state.lastActivityAt);
 if(state.deadline!=null&&now>=state.deadline){
  Object.assign(state,{active:false,pending:false,remainingMs:0,completedAt:now,attention:null,idleLevel:'active'});
  return {state,alerts,completed:true};
 }
 state.idleLevel=state.idleMs>=WARNING_MS?'warning':state.idleMs>=NOTICE_MS?'notice':'active';
 // A hidden page or fullscreen guard already has its own warning. Do not stack alarms.
 if(state.hidden||state.attention==='fullscreen')return {state,alerts,completed:false};
 if(state.idleMs>=WARNING_MS){
  const step=1+Math.floor((state.idleMs-WARNING_MS)/REPEAT_MS);
  if(step>(state.idleWarningStep||0)){
   state.idleWarningStep=step;state.idleNoticeSent=true;
   alerts.push({reason:'idle-warning',level:'warning'});
  }
 }else if(state.idleMs>=NOTICE_MS&&!state.idleNoticeSent){
  state.idleNoticeSent=true;alerts.push({reason:'idle-notice',level:'notice'});
 }
 return {state,alerts,completed:false};
}
function create(options={}){
 const win=options.window||global,doc=options.document||win.document;
 const storage=options.storage||win.localStorage,key=options.key||'homework_study_session_v1';
 const clock=options.now||(()=>Date.now()),testMode=!!options.testMode;
 const managedTime=!!options.managedTime, observationLimit=managedTime?120*60000:DURATION_MS;
 const onChange=options.onChange||(()=>{}),onAlert=options.onAlert||(()=>{}),onComplete=options.onComplete||(()=>{}),onRecord=options.onRecord||(()=>{});
 const schedule=(fn,ms)=>win.setTimeout?win.setTimeout(fn,ms):setTimeout(fn,ms);
 const unschedule=id=>win.clearTimeout?win.clearTimeout(id):clearTimeout(id);
 let disposed=false,generation=0,ownedFullscreen=false,requestingFullscreen=false,audio=null,lastPersistAt=0;
 let titleBeforeAlert=null,lastAlertTitle=null,fullscreenWait=null;
 let telemetry=null,observationAt=null,observationHidden=false,observationSuspended=false,deadlineObserved=false,lastRecordAt=null,restoredSession=null;
 const listeners=[];
 const fullscreenElement=()=>doc.fullscreenElement||doc.webkitFullscreenElement||null;
 const isFullscreen=()=>!!fullscreenElement();
 const fullscreenMethod=()=>doc.documentElement?.requestFullscreen||doc.documentElement?.webkitRequestFullscreen;
 const hidden=()=>doc.hidden===true||doc.visibilityState==='hidden';
 const supported=()=>!!fullscreenMethod()&&doc.fullscreenEnabled!==false&&doc.webkitFullscreenEnabled!==false;
 let state=initialState({now:clock(),mode:null,testMode});
 try{
  const saved=JSON.parse(storage?.getItem(key)||'null');
  if(saved?.version===1&&saved.mode==='homework'&&saved.active&&Number.isFinite(saved.startedAt)&&
   (saved.deadline===null||Number.isFinite(saved.deadline))){
   const now=clock();
   state={...initialState({now,mode:'homework',testMode,windowed:!!saved.windowed}),
    startedAt:saved.startedAt,deadline:testMode||managedTime?null:(saved.deadline??saved.startedAt+DURATION_MS)};
   restoredSession=saved;
  }
 }catch(_){}
 function syncEnvironment(){
  state.hidden=hidden();state.fullscreen=isFullscreen();state.fullscreenSupported=supported();
  state.fullscreenRequested=ownedFullscreen;
  state.attention=state.active?(state.hidden?'hidden':!state.windowed&&!state.fullscreen?'fullscreen':null):null;
 }
 syncEnvironment();
 const newId=()=>String(win.crypto?.randomUUID?.()||('study_'+clock().toString(36)+'_'+Math.random().toString(36).slice(2)));
 function beginRecord(saved=null){
  if(testMode){telemetry=null;return;}
  const now=clock(),old=saved?.telemetry||{},elapsed=Math.max(0,Math.min(observationLimit,now-state.startedAt));
  const count=value=>Number.isFinite(value)&&value>=0?value:0;
  const visibleMs=Math.min(elapsed,count(old.visibleMs)),hiddenMs=Math.min(elapsed-visibleMs,count(old.hiddenMs));
  telemetry={version:1,id:typeof saved?.id==='string'?saved.id:typeof old.id==='string'?old.id:newId(),startedAt:state.startedAt,updatedAt:now,endedAt:null,status:'active',endReason:null,
   durationMs:observationLimit,managedTime,elapsedMs:elapsed,observedMs:visibleMs+hiddenMs,visibleMs,hiddenMs,unobservedMs:elapsed-visibleMs-hiddenMs,
   tabSwitches:Math.floor(count(old.tabSwitches)),idleNotices:Math.floor(count(old.idleNotices)),idleWarnings:Math.floor(count(old.idleWarnings)),fullscreenExits:Math.floor(count(old.fullscreenExits)),windowed:state.windowed,testMode:false};
  state.id=telemetry.id;observationAt=now;observationHidden=state.hidden;observationSuspended=false;deadlineObserved=false;lastRecordAt=null;
 }
 if(state.active)beginRecord(restoredSession);
 function recordSnapshot(now=clock()){
  if(!telemetry)return null;
  const end=telemetry.endedAt??now,elapsedMs=Math.max(0,Math.min(observationLimit,end-telemetry.startedAt));
  const visibleMs=Math.min(elapsedMs,telemetry.visibleMs),hiddenMs=Math.min(elapsedMs-visibleMs,telemetry.hiddenMs),observedMs=visibleMs+hiddenMs;
  return {...telemetry,elapsedMs,observedMs,visibleMs,hiddenMs,unobservedMs:Math.max(0,elapsedMs-observedMs),windowed:state.windowed};
 }
 function observe(now=clock()){
  if(!telemetry||telemetry.status!=='active')return;
  const previous=observationAt,interval=previous==null?Infinity:now-previous,deadline=state.deadline??telemetry.startedAt+observationLimit;
  if(!observationSuspended&&interval>=0&&interval<=OBSERVATION_GAP_MS){
   const amount=Math.max(0,Math.min(now,deadline)-Math.max(previous,telemetry.startedAt));
   telemetry[observationHidden?'hiddenMs':'visibleMs']+=amount;
   if(previous<deadline&&now>=deadline)deadlineObserved=true;
  }
  observationAt=now;observationHidden=state.hidden;
 }
 function publishRecord(force=false,now=clock()){
  if(disposed||!telemetry||testMode||(!force&&lastRecordAt!==null&&now-lastRecordAt<RECORD_INTERVAL_MS))return;
  telemetry.updatedAt=now;telemetry=recordSnapshot(now);lastRecordAt=now;persist(true);
  // A failing observer must not interrupt the quiz or its clock.
  try{onRecord({...telemetry});}catch(_){}
 }
 function endRecord(status,reason,now=clock()){
  if(!telemetry||telemetry.status!=='active')return;
  observe(now);telemetry.status=status;telemetry.endReason=reason;
  telemetry.endedAt=status==='completed'||status==='interrupted'?state.deadline??now:now;
  publishRecord(true,now);
 }
 function snapshot(){
  const result=copy(state),now=clock();
  if(result.active){result.elapsedMs=Math.max(0,now-result.startedAt);result.remainingMs=result.deadline==null?null:Math.max(0,result.deadline-now);result.idleMs=Math.max(0,now-result.lastActivityAt);}
  return result;
 }
 function notify(){if(!disposed)onChange(snapshot());}
 function persist(force=false){
  const now=clock();if(!force&&now-lastPersistAt<5000)return;lastPersistAt=now;
  try{if(state.active&&state.mode==='homework')storage?.setItem(key,JSON.stringify({version:1,mode:'homework',active:true,startedAt:state.startedAt,deadline:state.deadline,windowed:state.windowed,id:telemetry?.id,telemetry:recordSnapshot()}));else storage?.removeItem(key);}catch(_){}
 }
 function clearTitle(){
  if(lastAlertTitle!==null&&doc.title===lastAlertTitle)doc.title=titleBeforeAlert;
  lastAlertTitle=null;titleBeforeAlert=null;
 }
 function setTitle(message){
  if(titleBeforeAlert===null)titleBeforeAlert=doc.title||'';
  lastAlertTitle='⚠ '+message+' · '+titleBeforeAlert;doc.title=lastAlertTitle;
 }
 function unlockAudio(){
  try{
   const Audio=win.AudioContext||win.webkitAudioContext;
   if(!audio&&Audio)audio=new Audio();
   const resumed=audio?.resume?.();if(resumed?.catch)resumed.catch(()=>{});
  }catch(_){}
 }
 function beep(level){
  if(!audio||audio.state==='closed')return;
  try{
   const at=audio.currentTime,count=level==='warning'?2:1;
   for(let i=0;i<count;i++){
    const oscillator=audio.createOscillator(),gain=audio.createGain(),start=at+i*.19;
    oscillator.type='sine';oscillator.frequency.setValueAtTime(level==='warning'?720:520,start);
    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.12,start+.015);gain.gain.exponentialRampToValueAtTime(.001,start+.13);
    oscillator.connect(gain);gain.connect(audio.destination);oscillator.start(start);oscillator.stop(start+.15);
    oscillator.onended=()=>{try{oscillator.disconnect();gain.disconnect();}catch(_){}};
   }
  }catch(_){}
 }
 function alert(reason,level='warning'){
  if(disposed||!state.active)return;
  const metric={'hidden':'tabSwitches','idle-notice':'idleNotices','idle-warning':'idleWarnings','fullscreen-exit':'fullscreenExits'}[reason];
  if(telemetry&&metric){observe();telemetry[metric]++;publishRecord(true);}
  if(reason==='hidden')setTitle('숙제 화면으로 돌아와 주세요');
  else if(reason==='fullscreen-exit')setTitle('전체화면으로 돌아와 주세요');
  else if(reason.startsWith('idle-'))setTitle('숙제에 집중해 주세요');
  if(reason!=='idle-notice'&&reason!=='idle-warning')beep(level);
  onAlert({...snapshot(),reason,level});
 }
 function evaluate(now=clock()){
  if(disposed)return snapshot();
  observe(now);
  const result=evaluateState(state,now);state=result.state;
  if(result.completed){endRecord(deadlineObserved?'completed':'interrupted',deadlineObserved?'timer':'unobserved',now);persist(true);clearTitle();notify();onComplete(snapshot());return snapshot();}
  for(const item of result.alerts)alert(item.reason,item.level);
  if(state.active)publishRecord(false,now);
  notify();return snapshot();
 }
 function resetActivity(now=clock()){
  Object.assign(state,{lastActivityAt:now,idleMs:0,idleLevel:'active',idleNoticeSent:false,idleWarningStep:0});
 }
 function activity(){
  if(disposed||!state.active||state.mode!=='homework'||hidden())return;
  if(state.deadline!=null&&clock()>=state.deadline){evaluate();return;}
  observe();publishRecord();
  const changed=state.idleLevel!=='active'||state.idleNoticeSent||state.idleWarningStep>0;
  resetActivity();if(!state.attention)clearTitle();if(changed)notify();
 }
 function exitOwnedFullscreen(){
  if(!ownedFullscreen)return;
  ownedFullscreen=false;state.fullscreenRequested=false;
  if(fullscreenElement()!==doc.documentElement)return;
  try{const exit=doc.exitFullscreen||doc.webkitExitFullscreen;const result=exit?.call(doc);if(result?.catch)result.catch(()=>{});}catch(_){}
 }
 function resolveFullscreenWait(value){
  if(!fullscreenWait)return;const waiting=fullscreenWait;fullscreenWait=null;unschedule(waiting.timer);waiting.resolve(value);
 }
 async function requestFullscreen(){
  if(disposed)return false;
  unlockAudio();const ticket=generation;
  if(isFullscreen()){state.fullscreenError=null;syncEnvironment();notify();return true;}
  const request=fullscreenMethod();
  if(!supported()){
   state.fullscreenError='이 브라우저에서는 전체화면을 사용할 수 없어요.';syncEnvironment();notify();return false;
  }
  requestingFullscreen=true;state.fullscreenError=null;
  try{
   // Invoke in the click handler's synchronous stack before any await.
   const result=request.call(doc.documentElement);
   await result;
   if(!isFullscreen()&&result==null){
    await new Promise(resolve=>{fullscreenWait={resolve,timer:schedule(()=>resolveFullscreenWait(false),1500)};});
   }
   if(fullscreenElement()===doc.documentElement)ownedFullscreen=true;
   if(disposed||ticket!==generation){exitOwnedFullscreen();return false;}
   if(!isFullscreen())throw new Error('fullscreen-not-entered');
   state.fullscreenError=null;syncEnvironment();notify();return true;
  }catch(_){
   if(!disposed&&ticket===generation){state.fullscreenError='전체화면이 허용되지 않았어요. 다시 시도하거나 현재 화면에서 시작해 주세요.';syncEnvironment();notify();}
   return false;
  }finally{requestingFullscreen=false;}
 }
 async function startHomework({allowWindowed=false}={}){
  if(disposed)return {started:false,state:snapshot()};
  const ticket=++generation,wasActive=state.active&&state.mode==='homework';
  unlockAudio();
  // A retry resumes the same absolute deadline; it never grants another 30 minutes.
  if(!wasActive){state=initialState({now:clock(),mode:null,testMode});state.pending=true;syncEnvironment();}
  if(allowWindowed){state.windowed=true;state.fullscreenError=null;}
  else {
   const entered=await requestFullscreen();
   if(disposed||ticket!==generation)return {started:false,state:snapshot()};
   if(!entered){state.pending=true;syncEnvironment();if(wasActive)evaluate();else notify();return {started:false,state:snapshot()};}
  }
  if(disposed||ticket!==generation)return {started:false,state:snapshot()};
  if(wasActive){state.pending=false;if(!allowWindowed)state.windowed=false;resetActivity();syncEnvironment();persist(true);evaluate();if(state.active)publishRecord(true);}
  else {
   state=initialState({now:clock(),testMode,windowed:allowWindowed});if(managedTime){state.deadline=null;state.remainingMs=null;}syncEnvironment();beginRecord();persist(true);publishRecord(true);clearTitle();notify();
  }
  return {started:state.active,state:snapshot()};
 }
 function stop(mode=null){
  generation++;resolveFullscreenWait(false);
  endRecord('stopped',mode==='class'?'class':'manual');
  state=initialState({now:clock(),mode,testMode});exitOwnedFullscreen();syncEnvironment();persist(true);clearTitle();notify();return snapshot();
 }
 function startClass(){return stop('class');}
 function visibilityChanged(){
  if(disposed)return;observe();const wasHidden=state.hidden;syncEnvironment();observationHidden=state.hidden;
  if(!state.active)return;
  // An overdue session completes before a return warning or an idle reminder can fire.
  if(state.deadline!=null&&clock()>=state.deadline){evaluate();return;}
  if(state.hidden&&!wasHidden){alert('hidden');notify();}
  else if(!state.hidden&&wasHidden){resetActivity();clearTitle();syncEnvironment();alert('returned');notify();}
 }
 function fullscreenChanged(){
  if(disposed)return;observe();const wasFullscreen=state.fullscreen;
  if(fullscreenElement()!==doc.documentElement)ownedFullscreen=false;
  syncEnvironment();
  if(state.fullscreen){resolveFullscreenWait(true);state.fullscreenError=null;if(!state.hidden)clearTitle();}
  else if(wasFullscreen&&state.active&&!state.hidden&&!state.windowed&&!requestingFullscreen){alert('fullscreen-exit');}
  notify();
 }
 function listen(target,type,handler,settings){
  if(!target?.addEventListener)return;target.addEventListener(type,handler,settings);listeners.push(()=>target.removeEventListener(type,handler,settings));
 }
 const trustedActivity=event=>{if(event.isTrusted===true)activity();};
 for(const type of ['pointermove','pointerdown','keydown','scroll','touchstart','touchmove'])listen(doc,type,trustedActivity,{capture:true,passive:true});
 listen(doc,'visibilitychange',visibilityChanged);listen(doc,'fullscreenchange',fullscreenChanged);listen(doc,'webkitfullscreenchange',fullscreenChanged);
 listen(win,'pagehide',event=>{
  if(disposed||!state.active)return;observe();
  if(state.deadline!=null&&clock()>=state.deadline)evaluate();else publishRecord(true);
  // The account's Sync button dispatches pagehide solely to flush saved work.
  // Only the browser's real lifecycle event suspends observation until pageshow.
  if(event.isTrusted===false)return;
  observationSuspended=true;observationAt=null;
 });
 listen(win,'pageshow',()=>{
  if(disposed||!state.active)return;const returned=observationSuspended;
  observationSuspended=false;observationAt=clock();syncEnvironment();observationHidden=state.hidden;
  if(returned&&!state.hidden){resetActivity();clearTitle();}evaluate();
  if(returned&&state.active&&!state.hidden){alert('returned');notify();}
 });
 const timer=win.setInterval(()=>{if(state.active)evaluate();},1000);
 function dispose(){
  if(disposed)return;if(state.active){observe();publishRecord(true);}disposed=true;generation++;win.clearInterval(timer);resolveFullscreenWait(false);
  for(const remove of listeners)remove();clearTitle();
  try{const result=audio?.close?.();if(result?.catch)result.catch(()=>{});}catch(_){}
 }
 // Notify after create returns, so callers can safely assign the controller first.
 const initialTimer=schedule(()=>{if(!disposed){if(state.active)evaluate();else notify();}},0);
 return {startHomework,startClass,requestFullscreen,activity,snapshot,evaluate,stop:()=>stop(),end:()=>stop(),dispose:()=>{unschedule(initialTimer);dispose();}};
}
global.HomeworkStudySession={DURATION_MS,NOTICE_MS,WARNING_MS,REPEAT_MS,RECORD_INTERVAL_MS,OBSERVATION_GAP_MS,initialState,evaluateState,create};
})(typeof window==='undefined'?globalThis:window);

;
/* Shared validation for browser question updates and the Apps Script write endpoint. */
var HomeworkQuestionPatches = (function () {
  'use strict';
  const text = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 12000;
  const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9:_-]{0,99}$/.test(value);

  function validEdit(edit) {
    if (!edit || typeof edit.sourceVersion !== 'string' || !/^[a-f0-9]{64}$/.test(edit.sourceVersion) ||
        !text(edit.prompt) || !text(edit.why) || !Array.isArray(edit.valid) || edit.valid.length > 100 ||
        !edit.valid.every(id) || new Set(edit.valid).size !== edit.valid.length) return false;
    if (edit.answer === 'O' || edit.answer === 'X') return text(edit.claim);
    if (!Array.isArray(edit.options) || edit.options.length !== 5 ||
        !edit.options.every(row => row && Number.isInteger(row.source) && row.source >= 0 &&
          row.source < 5 && text(row.text)) ||
        new Set(edit.options.map(row => row.source)).size !== 5 ||
        new Set(edit.options.map(row => row.text.trim())).size !== 5) return false;
    return Number.isInteger(edit.answer) && edit.answer >= 0 && edit.answer < 5;
  }

  function apply(q, record) {
    const edit = record?.edit;
    if (!validEdit(edit) || edit.sourceVersion !== q.editorSourceVersion) return q;
    const sources = q.evidence?.sources || [];
    const evidenceIds = new Set(sources.flatMap(source => source.sentences.flatMap(s => s.memberIds || [s.id])));
    if (edit.valid.some(id => !evidenceIds.has(id)) || (q.evidence?.valid?.length && !edit.valid.length)) return q;
    const updated = {...q, why:edit.why, editorRevision:'online-'+record.revision};
    if (q.evidence) updated.evidence = {...q.evidence, valid:edit.valid, explanation:edit.why};
    if (q.type === 'ox' && ['O','X'].includes(edit.answer)) {
      if (q.changed !== edit.claim || q.answer !== edit.answer) updated.claimEdits = [];
      return {...updated, ask:edit.prompt, changed:edit.claim, answer:edit.answer};
    }
    if (q.type !== 'mc' || !Number.isInteger(edit.answer) || q.options?.length !== 5) return q;
    const options = edit.options.map(row => row.text.trim());
    const answer = edit.options.find(row => row.source === edit.answer).text.trim();
    const choiceReviews = Object.fromEntries(edit.options.map(row => {
      const old = q.options[row.source], next = row.text.trim();
      const review = q.choiceReviews?.[old];
      if (review && old === next && (old === q.answer) === (next === answer)) {
        return [next, {...review, reason:review.reason === q.why ? edit.why : review.reason}];
      }
      return [next, {reason:edit.why, edits:[]}];
    }));
    return {...updated, sent:edit.prompt, options, answer, choiceReviews, fixedOptionOrder:true};
  }

  async function request(url, body, timeout = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        method:'POST', credentials:'omit', signal:controller.signal,
        headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'QUESTION_CONNECTION_FAILED');
      return result;
    } finally { clearTimeout(timer); }
  }

  function reader(url, storage) {
    const key = 'homework_online_question_patches_v1';
    let records = {}, pending = null;
    try { records = JSON.parse(storage.getItem(key) || '{}')[url] || {}; } catch (_) {}
    function refresh() {
      if (!url || globalThis.navigator?.onLine === false) return Promise.resolve(records);
      if (pending) return pending;
      pending = request(url, {action:'question_read'}, 3500).then(result => {
        if (!result.questions || typeof result.questions !== 'object' || Array.isArray(result.questions)) return;
        records = result.questions;
        try { storage.setItem(key, JSON.stringify({[url]:records})); } catch (_) {}
      }).catch(() => {}).finally(() => { pending = null; });
      return pending.then(() => records);
    }
    return {refresh};
  }
  return {id, validEdit, apply, request, reader};
})();

;
/* Daily homework goals and progress. Dates use Korea time on every device. */
var HomeworkDaily = (function () {
  'use strict';
  const offset = 9 * 3600000;
  const day = now => new Date(now + offset).toISOString().slice(0,10);
  const startOf = date => Date.parse(date + 'T00:00:00+09:00');
  const validDay = date => typeof date === 'string' && /^20\d\d-\d\d-\d\d$/.test(date)
    && Number.isFinite(startOf(date)) && day(startOf(date)) === date;
  const defaults = {paragraphs:3,minutes:30};
  const validPlan = plan => plan && Number.isInteger(plan.paragraphs) && plan.paragraphs >= 0 && plan.paragraphs <= 40
    && Number.isInteger(plan.minutes) && plan.minutes >= 0 && plan.minutes <= 120;
  const target = plan => validPlan(plan) ? plan : defaults;
  const recordPrefix = 'homework_daily_v1_';
  const paragraphId = /^unit(\d)(\d)-[lr](\d{2})-quick-basic$/;
  function paragraphLabel(id) {
    const match = typeof id === 'string' && id.match(paragraphId);
    return match ? {unit:match[1]+'-'+match[2], number:Number(match[3])} : null;
  }

  function progress(date, plan, records) {
    const start = startOf(date), end = start + 86400000;
    const paragraphs = new Set(), intervals = [];
    for (const record of records) {
      if (!record || record.date !== date) continue;
      for (const id of Array.isArray(record.paragraphs) ? record.paragraphs : []) {
        if (paragraphLabel(id)) paragraphs.add(id);
      }
      for (const interval of Array.isArray(record.intervals) ? record.intervals : []) {
        if (!Array.isArray(interval)) continue;
        const [left,right] = interval;
        if (Number.isFinite(left) && Number.isFinite(right) && left >= start && right <= end && right > left) intervals.push([left,right]);
      }
    }
    intervals.sort((a,b) => a[0] - b[0]);
    let timeMs = 0, previousEnd = start;
    for (const [left,right] of intervals) {
      timeMs += Math.max(0,right - Math.max(left,previousEnd));
      previousEnd = Math.max(previousEnd,right);
    }
    const goal = target(plan), rest = !goal.paragraphs && !goal.minutes;
    const reason = goal.paragraphs && paragraphs.size >= goal.paragraphs ? 'paragraphs'
      : goal.minutes && timeMs >= goal.minutes * 60000 ? 'time' : null;
    return {date,goal,paragraphs:[...paragraphs],timeMs,reason,rest,done:!!reason};
  }

  function create({storage,prefix,planFor,now=Date.now}) {
    const id = globalThis.crypto?.randomUUID?.() || now().toString(36)+'_'+Math.random().toString(36).slice(2);
    let date = day(now()), lastTick = 0, wasWorking = false, changed = false;
    let local = {date,paragraphs:[],intervals:[]}, other = [], lastRead = -Infinity, lastSave = 0;
    const keyFor = value => prefix + recordPrefix + value + '_';
    function flush() {
      if (!changed) return;
      try { storage.setItem(keyFor(date)+id,JSON.stringify(local)); } catch (_) { return; }
      changed = false;
      lastSave = now();
    }
    function current(t = now()) {
      const next = day(t);
      if (next === date) return;
      flush();
      date = next;
      local = {date,paragraphs:[],intervals:[]};
      lastRead = -Infinity;
      lastTick = 0;
      wasWorking = false;
    }
    function snapshot(t = now()) {
      current(t);
      if (t - lastRead >= 5000) {
        other = [];
        const prefix = keyFor(date);
        for (let i=0; i<storage.length; i++) {
          const key = storage.key(i);
          if (!key?.startsWith(prefix) || key === prefix+id) continue;
          try { other.push(JSON.parse(storage.getItem(key))); } catch (_) {}
        }
        lastRead = t;
      }
      return progress(date,planFor(date),[...other,local]);
    }
    function tick(working) {
      const t = now();
      current(t);
      if (working && wasWorking && t > lastTick && t-lastTick <= 2500) {
        const last = local.intervals.at(-1);
        if (last && last[1] === lastTick) last[1] = t;
        else local.intervals.push([lastTick,t]);
        changed = true;
      }
      if ((!working && wasWorking) || t-lastSave >= 10000) flush();
      lastTick = t;
      wasWorking = working;
      return snapshot(t);
    }
    function finishParagraph(set) {
      current();
      if (!set.isQuickPractice || !paragraphLabel(set.id)
          || local.paragraphs.includes(set.id)) return snapshot();
      local.paragraphs.push(set.id);
      changed = true;
      flush();
      return snapshot();
    }
    return {snapshot,tick,flush,finishParagraph};
  }

  function planClient(url, storage) {
    const key = 'homework_daily_plans_v1';
    let records = {}, pending, loaded = false;
    try { records = JSON.parse(storage.getItem(key) || '{}') || {}; } catch (_) {}
    function replace(next) {
      records = next;
      try { storage.setItem(key,JSON.stringify(records)); } catch (_) {}
    }
    function refresh() {
      if (pending) return pending;
      pending = HomeworkQuestionPatches.request(url,{action:'daily_read'},5500).then(result => {
        if (!result.plans || typeof result.plans !== 'object' || Array.isArray(result.plans)) throw Error('INVALID_DAILY_PLANS');
        replace(result.plans);
        loaded = true;
      }).finally(() => { pending = null; });
      return pending;
    }
    async function save(date, plan, secret, expected) {
      const result = await HomeworkQuestionPatches.request(url,{action:'daily_save',date,plan,key:secret,expected},25000);
      replace({...records,[date]:result.record});
      return result.record;
    }
    return {planFor:date=>target(records[date]?.plan),recordFor:date=>records[date],refresh,save,isLoaded:()=>loaded};
  }
  return {day,validDay,defaults,target,validPlan,progress,create,recordPrefix,paragraphLabel,planClient};
})();

;
/* 세 페이지의 공통 문제 엔진. 기존 문제와 기록 형식을 유지합니다. */
(function (global) {
'use strict';
function mount(options) {
const localStorage=options.storage||global.localStorage;
const sessionStorage=options.sessionStorage||global.sessionStorage;
const SETS = options.sets;
const untimed=options.testMode===true;
let manualSelection=false, pilotView=null, pilotActive=false;
const guidedActive=()=>!!options.guidedLearning&&!manualSelection;
const setsById=new Map(SETS.map(set=>[set.id,set]));
const setLoads=new Map();
let selectionTicket=0,prefetchTicket=0;
function loadSet(set,background=false){
  if(!set.dataFile||set._loaded)return Promise.resolve(set);
  const apply=()=>{
    const full=global.HOMEWORK_SET_DATA?.[set.id];
    if(!full?.parts?.length)throw new Error('문제 데이터가 없습니다.');
    Object.assign(set,full,{_loaded:true});return set;
  };
  if(global.HOMEWORK_SET_DATA?.[set.id])return Promise.resolve(apply());
  if(setLoads.has(set.dataFile))return setLoads.get(set.dataFile).then(apply);
  const promise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.src=set.dataFile;script.async=true;script.fetchPriority=background?'low':'high';
    script.onload=()=>resolve();
    script.onerror=()=>{script.remove();setLoads.delete(set.dataFile);reject(new Error('문제 파일을 불러오지 못했습니다.'));};
    document.head.appendChild(script);
  });
  setLoads.set(set.dataFile,promise);return promise.then(apply);
}
const legacySection=set=>set.name.match(/^(기초|기본|하|중|상|유형 심화)/)?.[1]||(/^\d+(~\d+)?문단$/.test(set.name)?'본문':'문제');
function prepareRelated(set){
  const ticket=++prefetchTicket;
  const related=SETS.filter(s=>s.id!==set.id&&s.dataFile&&(set.category?s.category===set.category:s.group===set.group&&(!practice?legacySection(s)===legacySection(set):true)));
  const next=async()=>{
    if(ticket!==prefetchTicket||!$('#scr-q').classList.contains('on'))return;
    const other=related.shift();if(!other)return;
    try{await loadSet(other,true);}catch(_){/* Background failures never interrupt the selected question. */}
    if(ticket===prefetchTicket)global.setTimeout(next,100);
  };
  global.requestAnimationFrame(()=>global.requestAnimationFrame(()=>global.setTimeout(next,250)));
}
const SHEET_URL = String(options.sheetUrl || '').trim();
const PREFIX = options.storagePrefix || 'bib_';
const practice = options.page !== 'legacy';
const escapeHTML = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $ = s => document.querySelector(s);
const shuffle = a => a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(p=>p[1]);
const pad = n => String(n).padStart(2,'0');
const stamp = d => new Date(d.getTime()+9*60*60*1000).toISOString().slice(0,19).replace('T',' ');

/* ---- 기기 코드 / 회차 ---- */
const UID_ALIASES={IQ0VMU:'IQ0VMU',HJ98I1:'IQ0VMU'};
const normalizeUid=u=>UID_ALIASES[u]||u;
function getUid(){
  if(options.uid){const uid=normalizeUid(options.uid);localStorage.setItem('bib_uid',uid);return uid;}
  let u = localStorage.getItem('bib_uid');
  if(!u){ u = Math.random().toString(36).slice(2,8).toUpperCase(); }
  u=normalizeUid(u);
  localStorage.setItem('bib_uid',u);
  return u;
}
const UID = getUid();
$('#uid').textContent = UID;
const attemptsKey = id => PREFIX+'attempts_'+id;
const getAttempts = id => +(localStorage.getItem(attemptsKey(id))||0);

/* ---- 진행 중인 풀이 저장 (세트별) ---- */
const contentKey = id => { const revision=setsById.get(id)?.revision; return (practice?'v'+(revision||1)+'_':revision===2?'v2_':'')+id; };
const runKey = id => PREFIX+'run_'+contentKey(id);
const retryKey = id => runKey(id)+'_retry';
const loadActiveRun = (id,retry=false) => {
  try{return global.HomeworkAttemptState.active(JSON.parse(localStorage.getItem(retry?retryKey(id):runKey(id))||'null'),JSON.parse(localStorage.getItem(PREFIX+'report_'+contentKey(id))||'null'));}catch(_){return null;}
};
const loadRun = id => loadActiveRun(id);
const loadRetry = id => loadActiveRun(id,true);
function saveRun(idx){
  if(!run||run.finished)return;
  const q=run.list[run.idx];
  const activeQuestion=q&&(!q._submitted||q._evidencePhase)?{id:q.id||q.pi+':'+q.qno,
    editorRevision:q.editorRevision,
    remainingMs:run.deadline==null?run.questionRemainingMs:Math.max(0,run.deadline-Date.now()),
    extraSeconds:run.extraSeconds||0,solveLimitSeconds:run.questionLimitSeconds||30,hintUsed:!!q._hintUsed,timeDecision:q._timeDecision||null,elapsedMs:(q._solveElapsedMs||0)+(run.qStart&&!q._evidencePhase&&!q._timeDecision?Math.max(0,Date.now()-run.qStart):0),choiceHelpUsed:!!q._choiceHelpUsed,eliminated:q._eliminated||[],evidence:q._evidencePhase?{...q._evidencePhase,remainingMs:run.deadline==null?q._evidencePhase.remainingMs:Math.max(0,run.deadline-Date.now())}:null}:null;
  localStorage.setItem(run.retry?retryKey(run.set.id):runKey(run.set.id), JSON.stringify({
    attempt:run.attempt, session:run.session, idx:(idx==null?run.idx+(run.list[run.idx]?._submitted&&!run.list[run.idx]?._evidencePhase?1:0):idx),
    order:run.list.map(q=>q.id || q.pi+':'+q.qno), logs:run.logs, startedAt:run.startedAt.toISOString(), studiedRefs:[...(run.studiedRefs||[])], readingStates:run.readingStates||{}, totalRemainingMs:run.totalRemainingMs, totalTimedOut:run.totalTimedOut, questionRemainingMs:run.questionRemainingMs, totalBonusSeconds:run.totalBonusSeconds||0, activeQuestion
  }));
}
const clearRun = id => localStorage.removeItem(runKey(id));
const lastKey = id => PREFIX+'last_'+contentKey(id);
const loadLast = id => { try{ return JSON.parse(localStorage.getItem(lastKey(id))||'null'); }catch(e){ return null; } };
const openKey = PREFIX+'open';
const loadOpen = () => { try{ return JSON.parse(sessionStorage.getItem(openKey)||'{}'); }catch(e){ return {}; } };
const saveOpen = o => { try{ sessionStorage.setItem(openKey, JSON.stringify(o)); }catch(e){} };
const wrongKey = id => PREFIX+'wrong_'+contentKey(id);
const loadWrong = id => { try{ return JSON.parse(localStorage.getItem(wrongKey(id))||'[]'); }catch(e){ return []; } };
const saveWrong = (id,arr) => { try{ arr.length ? localStorage.setItem(wrongKey(id), JSON.stringify(arr)) : localStorage.removeItem(wrongKey(id)); }catch(e){} };
const failureKey=set=>PREFIX+'failures_'+contentKey(set.id);
const questionKey=q=>q.id||q.pi+':'+q.qno;
function baseSolveSeconds(q){
  if(Number.isInteger(q.paragraphCount))return q.paragraphCount>=2?50:30;
  // Older homework labels identify paragraphs; sentence lines and a label such as '2문단' are not two paragraphs.
  const count=text=>Array.from(String(text||'').matchAll(/(\d+)(?:\s*[~∼–·,\-]\s*(\d+))?\s*문단/g)).reduce((n,m)=>n+(m[2]?Math.max(2,Math.abs(+m[2]-m[1])+1):1),0);
  const headings=Array.from(String(q.passage||'').matchAll(/(?:^|\n)\s*\[([^\]]+)\]/g));
  const paragraphs=Math.max(count(q.label),count(q.sourceLabel),headings.reduce((n,m)=>n+count(m[1]),0));
  return paragraphs>=2?50:30;
}
const validCount=n=>Number.isSafeInteger(n)&&n>0?n:0;
function loadFailures(set){try{const data=JSON.parse(localStorage.getItem(failureKey(set))||'{}');return data&&typeof data==='object'&&!Array.isArray(data)?data:{};}catch(_){return {};}}
function saveFailures(set,data){try{localStorage.setItem(failureKey(set),JSON.stringify(data));}catch(_){} }
function restoreKnownFailures(set){
  const data=loadFailures(set);let changed=false;
  for(const {pi,qi} of loadWrong(set.id)){
    const q=set.parts[pi]?.items[qi];if(!q)continue;
    const key=q.id||pi+':'+(qi+1);
    if(!validCount(data[key])){data[key]=1;changed=true;}
  }
  if(changed)saveFailures(set,data);
}
function countFailure(q){
  const data=loadFailures(run.set),key=questionKey(q);
  q._failureCount=Math.max(validCount(data[key]),q._failureCount||0)+1;
  data[key]=q._failureCount;saveFailures(run.set,data);
}

/* ---- 학습 모험: 모든 페이지가 공유하는 보상과 필수 복습 ---- */
const game=global.HomeworkGame.create(localStorage);
const gameKey=set=>options.page+'|'+contentKey(set.id);
game.reconcile(options.page,SETS.map(set=>({id:set.id,key:gameKey(set),resetReviewOnRevision:!!set.resetReviewOnRevision})));
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e;}
const adventure=el('section','adventure');adventure.id='game-home';
const loadingStatus=el('p','set-loading-status');loadingStatus.id='set-loading-status';loadingStatus.hidden=true;loadingStatus.setAttribute('role','status');document.body.appendChild(loadingStatus);
const timeBackdrop=el('div','time-backdrop');timeBackdrop.setAttribute('aria-hidden','true');document.body.appendChild(timeBackdrop);
function clearTimeSignal(){delete document.body.dataset.timeStage;}
let homeGameState;
$('#scr-start header').after(adventure);
const helpPanel=el('section','question-help');helpPanel.id='question-help';helpPanel.setAttribute('aria-label','문제 도움');$('#q-body').after(helpPanel);
const tools=el('div','game-tools');tools.id='game-tools';helpPanel.appendChild(tools);
const hintBox=el('div','game-hint');hintBox.id='game-hint';hintBox.hidden=true;helpPanel.appendChild(hintBox);
const effect=el('div','hit-effect');effect.setAttribute('aria-hidden','true');document.body.appendChild(effect);
const rewardBox=el('section','adventure reward-panel');rewardBox.id='game-result';$('#e-wrongs').before(rewardBox);
const outcomeSummary=el('section','result-breakdown');outcomeSummary.id='e-breakdown';outcomeSummary.hidden=true;$('#e-meta').after(outcomeSummary);
const resultReview=el('section','result-review');resultReview.id='e-review';resultReview.hidden=true;
const resultReviewNote=el('p','result-review-note');resultReviewNote.id='e-review-note';
$('#e-retry').type='button';$('#e-retry').setAttribute('aria-describedby','e-review-note');
resultReview.append($('#e-retry'),resultReviewNote);outcomeSummary.after(resultReview);
const nextSetButton=el('button','act primary','다음 세트 풀기');nextSetButton.id='e-next-set';nextSetButton.type='button';
const nextTypeButton=el('button','act ghost','다음 유형 고르기');nextTypeButton.id='e-next-type';nextTypeButton.type='button';
$('#e-home').before(nextSetButton,nextTypeButton);
const guidedContinue=el('button','act primary','다음 학습 계속하기');guidedContinue.id='guided-continue';guidedContinue.type='button';guidedContinue.hidden=true;$('#e-home').before(guidedContinue);
const hardContinue=el('button','act ghost','하드 난이도 도전');hardContinue.id='hard-continue';hardContinue.type='button';hardContinue.hidden=true;guidedContinue.after(hardContinue);
const guidedStatus=el('section','guided-question-status');guidedStatus.id='guided-question-status';guidedStatus.hidden=true;$('#q-body').before(guidedStatus);
const answerDock=el('section','answer-dock');answerDock.id='answer-dock';answerDock.hidden=true;answerDock.setAttribute('aria-label','다음 문제로 이동');$('#q-fb').after(answerDock);
function resetAnswerDock(){const b=$('#q-next');if(b)$('#scr-q>.row-act').appendChild(b);answerDock.hidden=true;answerDock.replaceChildren();document.body.classList.remove('answer-reviewed','passage-review');}
function showAnswerDock(){answerDock.hidden=false;document.body.classList.add('answer-reviewed');answerDock.appendChild($('#q-next'));}
let audioContext=null,hitTimer=null,autoNextTimer=null,cancelAutoNext=null;
let studySession=null,studyQuizPause=null,studyDialog=null,pendingStudyAction=null,studyReturnNoticeUntil=0;
const daily=options.guidedLearning&&!untimed&&global.HomeworkDaily?.create({storage:localStorage,prefix:PREFIX,planFor:date=>options.dailyPlans?.planFor(date)});
const socratic=global.HomeworkSocratic,socraticCourses=options.guidedLearning&&socratic?(global.HomeworkSocraticCourses||[global.HomeworkSocraticContent]).filter(Boolean):[];
const pilots=socraticCourses.map(content=>socratic.create({storage:localStorage,prefix:PREFIX,content,onParagraph:p=>{
 if(!(p>0))return;// concept and application skills are not textbook paragraphs
 const state=studySession?.snapshot();if(state?.active&&state.mode==='homework'&&daily){const today=daily.finishParagraph({id:'unit22-l'+String(p).padStart(2,'0')+'-quick-basic',isQuickPractice:true});checkDailyFinish(today,state);paintHomeworkProgress(state,today);}
}}));
let pilot=pilots[0]||null;
if(pilots.length&&options.questionPatches)void options.questionPatches.refresh().then(records=>{socratic.applyEdits(socraticCourses,records);if(pilotActive)pilotView?.render();});
const pilotState=m=>socratic.read(localStorage,PREFIX,m.content);
// A course already in progress comes first; otherwise the course whose paragraphs the path reaches next.
function pilotFor(setId){return pilots.find(m=>{const s=pilotState(m);return s&&s.screen!=='summary';})||pilots.find(m=>socratic.shouldStart(pilotState(m),setId,m.content))||null;}
function duePilot(){return pilots.find(m=>socratic.summary(pilotState(m)).due.length)||null;}
function startPilot(recall=false,model=pilot){
 if(!model)return;pilot=model;manualSelection=false;if(run){clearInterval(run.timerId);pauseQuestionClock();saveRun();}run=null;
 show('#scr-q');pilotActive=true;document.body.classList.add('socratic-active');guidedStatus.hidden=true;$('#q-fb').replaceChildren();
 pilotView=global.HomeworkSocraticView.mount({root:$('#q-body'),model:pilot,onHome:saveStudyAndHome,onContinue:()=>{saveStudyAndHome();continueStudy(startGuided);}});
 pilot.start();if(recall&&pilot.state()?.screen==='summary')pilot.act({type:'recall'});pilotView.render();paintHomeworkProgress();
}
function renderPilotHome(home,next){
 const course=pilotFor(next?.set.id)||duePilot()||pilots[0];if(!course)return;const s=pilotState(course),m=socratic.summary(s),total=course.content.skills.length,card=el('section','guided-next socratic-home-card');card.id='socratic-home-card';
 card.append(el('small','','새 학습 · 2-2단원 '+(course.content.label||'1~3문단')),el('h3','','질문하며 읽기'),el('p','',m.started?'복습까지 확인한 문단 '+m.paragraphs.length+'/'+m.totalParagraphs+' · 남은 복습 '+m.pendingCount+' · 나중에 기억 확인 '+m.mastered+'/'+total+' · 새 과정 첫 정답 '+m.initialCorrect+'/'+total:'한 가지씩 묻고, 막히면 더 작은 질문으로 도와줘요. 질문 학습 뒤에는 본문 OX를 따로 풀어요.'));
 const row=el('div','intro-practice-actions');const b=el('button','act primary',m.started?'질문 학습 이어 하기':'질문 학습 시작하기');b.id='socratic-launch';b.onclick=()=>continueStudy(()=>startPilot(false,course));row.append(b);
 if(m.due.length){const recall=el('button','act ghost','기억 확인 '+m.due.length+'개');recall.onclick=()=>continueStudy(()=>startPilot(true,course));row.append(recall);}card.append(row);home.append(card);
 const practiceCard=el('section','guided-next');practiceCard.id='intro-ox-practice';
 practiceCard.append(el('small','','2-2단원 · 1~3문단'),el('h3','','본문 OX · 어휘 연습'),el('p','','본문 OX는 질문 학습과 따로 기록해요. 풀던 문제와 오답은 이어서 풀 수 있어요.'));
 const buttons=el('div','intro-practice-actions');
 const choices=[...global.HomeworkSocratic.covers.map((id,i)=>({id,label:i<3?(i+1)+'문단 OX':'1~3문단 묶음 OX'})),...SETS.filter(s=>s.isVocabularyPractice).map(s=>({id:s.id,label:s.name}))];
 for(const choice of choices){const set=setsById.get(choice.id);if(!set)continue;const total=set.parts.reduce((n,p)=>n+p.items.length,0),saved=loadRun(set.id),last=loadLast(set.id),pending=homeGameState.pendingReviews[gameKey(set)];
 const button=el('button','act ghost',choice.label+' · '+total+'문항'+(pending?' · 오답 복습':saved?' · 이어 풀기':last?' · 다시 풀기':''));button.type='button';button.dataset.introSet=set.id;
 button.onclick=()=>continueStudy(()=>{manualSelection=false;start(set,loadRun(set.id));});buttons.append(button);}
 practiceCard.append(buttons);home.append(practiceCard);
}
const dailyText=p=>p.rest?'오늘은 쉬는 날이에요.':p.done?'오늘 숙제 완료 · '+(p.reason==='paragraphs'?'문단 목표 달성':'학습 시간 목표 달성'):
 [p.goal.paragraphs?Math.min(p.paragraphs.length,p.goal.paragraphs)+' / '+p.goal.paragraphs+'문단':'',p.goal.minutes?Math.floor(p.timeMs/60000)+' / '+p.goal.minutes+'분':''].filter(Boolean).join(' 또는 ');
const homeworkCompletionNotices=new Set();
let homeworkCompletionTimer=null;
function notifyHomeworkCompletion(key,message){
 // Goal checks run every second; a dismissed notice must stay dismissed.
 if(homeworkCompletionNotices.has(key))return;
 homeworkCompletionNotices.add(key);
 global.clearTimeout(homeworkCompletionTimer);
 studyCompletion.textContent=message+' 풀던 문제는 계속 풀 수 있어요.';
 studyCompletion.hidden=false;
 homeworkCompletionTimer=global.setTimeout(()=>{studyCompletion.hidden=true;homeworkCompletionTimer=null;},5000);
 daily?.flush();
 logStudentEvent('homework-goal',message);
}
function checkDailyFinish(p,state){
 if(!p||!state?.active||(!p.done&&!p.rest))return;
 // Meeting a daily goal is a milestone, never a quiz/navigation event.
 // Keep the current answer, explanation, timer and review queue in place.
 notifyHomeworkCompletion('daily:'+p.date,p.rest?'오늘은 쉬는 날이에요.':dailyText(p));
}
function logStudentEvent(kind,label,control=''){
 if(untimed)return;
 try{
  const state=studySession?.snapshot(),at=Date.now(),id=global.crypto?.randomUUID?.()||at.toString(36)+'_'+Math.random().toString(36).slice(2);
  const q=run?.list?.[run.idx];
  const today=state?.active&&daily?.snapshot?.(at);
  const remainingMs=today?.goal.minutes?Math.max(0,today.goal.minutes*60000-today.timeMs):state?.remainingMs??null;
  const value={version:1,id,at,kind,label:String(label||'').replace(/\s+/g,' ').slice(0,1000),control:String(control||'').slice(0,120),mode:state?.mode||null,studySession:state?.id||null,remainingMs,fullscreen:!!state?.fullscreen,setId:run?.set?.id||null,qid:q?.id||null,questionIndex:run?run.idx+1:null};
  localStorage.setItem(PREFIX+'homework_event_v1_'+id,JSON.stringify(value));
 }catch(error){console.warn('학생 선택 기록 저장 실패',error);}
}
document.addEventListener('click',event=>{
 if(!event.isTrusted)return;
 const target=event.target.closest?.('button,a,summary,[role="button"],input[type="radio"],input[type="checkbox"]');
 if(target)logStudentEvent('choice',target.getAttribute('aria-label')||target.textContent||target.value,target.id||target.className);
},true);
document.addEventListener('change',event=>{
 const target=event.target;if(event.isTrusted&&target?.tagName==='SELECT')logStudentEvent('choice',target.selectedOptions?.[0]?.textContent,target.id);
},true);
for(const name of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(name,()=>{
 const active=!!(document.fullscreenElement||document.webkitFullscreenElement);
 if(logStudentEvent.lastFullscreen===active)return;logStudentEvent.lastFullscreen=active;
 logStudentEvent(active?'fullscreen-enter':'fullscreen-exit',active?'전체화면 진입':'전체화면 해제');
});
const studyBar=el('section','study-session-bar');studyBar.id='study-session-bar';studyBar.hidden=true;studyBar.setAttribute('aria-label','학습 모드와 숙제 시간');$('.wrap').prepend(studyBar);
const studyLabel=el('strong','study-session-label'),studyClock=el('span','study-session-clock'),studyNotice=el('p','study-session-notice');studyClock.id='study-session-clock';studyClock.setAttribute('role','timer');studyClock.setAttribute('aria-live','off');studyNotice.setAttribute('role','status');
const studyProgress=el('p','study-session-progress');studyProgress.id='study-session-progress';studyProgress.setAttribute('role','status');studyProgress.hidden=true;
const studyCompletion=el('p','study-session-completion');studyCompletion.id='study-session-completion';studyCompletion.setAttribute('role','status');studyCompletion.setAttribute('aria-live','polite');studyCompletion.hidden=true;
const studyExit=el('button','act ghost study-session-exit','숙제 종료');studyExit.type='button';studyExit.id='study-session-end';studyBar.append(studyLabel,studyClock,studyExit,studyProgress,studyCompletion,studyNotice);
function paintHomeworkProgress(state=studySession?.snapshot(),today){
 const active=state?.mode==='homework'&&(state.active||!!state.completedAt);
 if(active&&today===undefined)today=daily?.snapshot();
 const lines=[];
 if(active&&today?.goal.paragraphs)lines.push('완료 문단 '+today.paragraphs.length+' / '+today.goal.paragraphs);
 if(active&&pilotActive&&pilot?.state()){const s=pilot.state();const k=s.content.skills[s.index];lines.push(s.mode==='combined'?(s.content.label||'1~3문단')+' 핵심 연결':'질문 학습 · '+(k.place||k.paragraph+'문단'));}
 if(active&&run&&$('#scr-q').classList.contains('on')){
  const q=run.list[run.idx],labels=[...new Set((q?.evidence?.sources||[]).map(source=>source.label).filter(label=>/^\d+문단$/.test(label)))];
  if(labels.length)lines.push((run.retry?'복습 중':q.type==='ox'?'지금 OX':'지금 푸는 문단')+' · '+labels.join(' · '));
 }else if(active&&run&&$('#scr-end').classList.contains('on')&&!run.retry){
  const paragraph=global.HomeworkDaily?.paragraphLabel(run.set.id);
  if(paragraph&&today?.paragraphs.includes(run.set.id))lines.push(paragraph.number+'문단 OX 완료');
 }
 const text=lines.join('  |  ');
 if(studyProgress.textContent!==text)studyProgress.textContent=text;
 studyProgress.hidden=!text;
}
function closeStudyDialog(){if(studyDialog){studyDialog.close();studyDialog.remove();studyDialog=null;}}
function openStudyDialog(kind,title,copy,actions){
 if(studyDialog?.dataset.kind===kind)return;
 closeStudyDialog();const dialog=el('dialog','study-session-dialog');dialog.id='study-session-dialog';dialog.dataset.kind=kind;
 const heading=el('h2','',title);heading.id='study-session-dialog-title';dialog.setAttribute('aria-labelledby',heading.id);dialog.append(heading,el('p','',copy));
 const row=el('div','study-dialog-actions');for(const [label,action,primary] of actions){const b=el('button','act '+(primary?'primary':'ghost'),label);b.type='button';b.onclick=action;row.appendChild(b);}dialog.appendChild(row);dialog.addEventListener('cancel',e=>e.preventDefault());document.body.appendChild(dialog);studyDialog=dialog;dialog.showModal();
}
function pauseStudyQuiz(){
 if(studyQuizPause||!run||!$('#scr-q').classList.contains('on'))return;
 const q=run.list[run.idx];if(!q)return;
 const state={run,q,timer:run.deadline!=null&&!q._timeDecision,auto:false};
 const pause=$('#q-review-pause');if(pause&&pause.getAttribute('aria-pressed')==='false'){pause.click();state.auto=true;}
 if(state.timer){pauseQuestionClock();clearInterval(run.timerId);if(q._evidencePhase&&!q._evidencePhase.paused)q._evidencePhase.remainingMs=run.questionRemainingMs;
  if(!q._evidencePhase&&!q._submitted){q._solveElapsedMs=(q._solveElapsedMs||0)+(run.qStart?Math.max(0,Date.now()-run.qStart):0);run.qStart=null;}run.deadline=null;
 }
 studyQuizPause=state;saveRun();
}
function resumeStudyQuiz(){
 const state=studyQuizPause;studyQuizPause=null;if(!state||run!==state.run||run.list[run.idx]!==state.q||!$('#scr-q').classList.contains('on'))return;
 if(state.timer){if(state.q._evidencePhase)startEvidenceTimer(state.q);else if(!state.q._submitted)startQuestionTimer(state.q);}
 const pause=$('#q-review-pause');if(state.auto&&pause?.getAttribute('aria-pressed')==='true')pause.click();
}
function saveStudyAndHome(){
 ++selectionTicket;loadingStatus.hidden=true;
 if(run&&$('#scr-q').classList.contains('on')){clearInterval(run.timerId);pauseQuestionClock();saveRun();}
 studyQuizPause=null;clearAutoNext();closeStudyDialog();renderStart();show('#scr-start');
}
function finishStudy(){pendingStudyAction=null;saveStudyAndHome();studySession?.end();}
studyExit.onclick=finishStudy;
function studyFullscreenPrompt(failed=false){
 const state=studySession?.snapshot();if(!state)return;
 openStudyDialog(failed?'fullscreen-failed':'fullscreen-return',failed?'전체화면을 열지 못했어요':'전체화면으로 돌아와 주세요',failed?'이 브라우저가 전체화면을 지원하지 않거나 요청을 허용하지 않았어요. 다시 시도하거나 현재 화면에서 숙제를 진행할 수 있어요.':'숙제는 전체화면으로 진행해요. 문제 시간과 자동 이동은 잠시 멈췄고, 숙제는 화면으로 돌아오면 이어져요.',[
  ['전체화면으로 '+(failed?'다시 시도':'돌아가기'),()=>launchStudy('homework',pendingStudyAction),true],
  ...(failed?[['이 화면에서 숙제 시작',()=>launchStudy('homework',pendingStudyAction,true),false]]:[]),
  ['수업으로 시작하기',()=>launchStudy('class',pendingStudyAction||(()=>startGuided())),false],
  ['숙제 종료',finishStudy,false]
 ]);
}
function paintStudySession(state){
 const working=state.mode==='homework'&&state.active&&!state.hidden&&(state.fullscreen||state.windowed)&&$('#scr-q').classList.contains('on');
 const today=daily?.tick?.(working);
 checkDailyFinish(today,state);
 studyBar.hidden=!state.mode;studyBar.dataset.mode=state.mode||'';document.body.classList.toggle('homework-session',state.mode==='homework'&&state.active);
 const completed=!!today?.done||!!state.completedAt;
 studyLabel.textContent=state.mode==='homework'?(completed?'숙제 목표 완료':'숙제 모드'):'수업 모드';
 const remaining=today?Math.max(0,today.goal.minutes*60000-today.timeMs):state.remainingMs;
 const shownMs=completed?(today?.timeMs??state.elapsedMs):remaining;
 const seconds=Math.max(0,completed?Math.floor((shownMs||0)/1000):Math.ceil((shownMs||0)/1000));
 const timerText=pad(Math.floor(seconds/60))+':'+pad(seconds%60);
 studyClock.textContent=state.mode==='homework'?(state.testMode?'테스트 · 시간 제한 없음':completed?'학습 시간 '+timerText:today?(today.goal.minutes?'남은 시간 '+timerText:'문단 목표로 진행 중'):timerText):'숙제 제한·집중 알림 없음';
 if(state.mode!=='homework'||(!completed&&!today?.rest))studyCompletion.hidden=true;
 paintHomeworkProgress(state,today);
 studyExit.hidden=state.mode!=='homework';
 const text=!state.active?'':state.hidden?'다른 탭으로 이동했어요. 숙제 화면으로 돌아와 주세요.':!state.fullscreen&&!state.windowed?'전체화면으로 돌아와 숙제를 이어 가세요.':state.idleLevel==='warning'?'20초 이상 활동이 없어요. 화면을 터치하거나 문제를 계속 풀어 주세요.':state.idleLevel==='notice'?'10초 동안 활동이 없어요. 읽고 있다면 화면을 한 번 터치해 주세요.':Date.now()<studyReturnNoticeUntil?'숙제 화면으로 돌아왔어요. 남은 내용에 다시 집중해 볼까요?':state.windowed?'현재 화면에서 숙제 중 · 전체화면 제한 없이 진행해요.':'';
 if(studyNotice.textContent!==text)studyNotice.textContent=text;studyNotice.hidden=!text;studyBar.dataset.attention=text?'true':'false';
 const blocked=state.mode==='homework'&&state.active&&(state.hidden||!state.fullscreen&&!state.windowed);
 if(blocked){pauseStudyQuiz();if(!state.hidden&&studyDialog?.dataset.kind!=='fullscreen-failed')studyFullscreenPrompt();}
 else{if(studyDialog?.dataset.kind==='fullscreen-return')closeStudyDialog();resumeStudyQuiz();}
}
async function launchStudy(mode,action,allowWindowed=false){
 if(mode==='homework'&&daily){
  const today=daily.snapshot();
  if(today.rest&&!studySession.snapshot().active){openStudyDialog('daily-complete','오늘의 숙제',dailyText(today),[['닫기',closeStudyDialog,true]]);return;}
  void options.dailyPlans?.refresh().then(()=>{if(!studySession.snapshot().active&&$('#scr-start').classList.contains('on'))renderStart();}).catch(()=>{});
 }
 logStudentEvent('mode-choice',mode==='class'?'수업으로 전환 선택':allowWindowed?'현재 화면에서 숙제 계속 선택':'전체화면 숙제 시작·복귀 선택');
 pendingStudyAction=action||pendingStudyAction;closeStudyDialog();
 if(mode==='class'){studySession.startClass();const nextAction=pendingStudyAction;pendingStudyAction=null;if(nextAction)nextAction();return;}
 const result=await studySession.startHomework({allowWindowed});
 if(!result.started){studyFullscreenPrompt(true);return;}
 closeStudyDialog();resumeStudyQuiz();const nextAction=pendingStudyAction;pendingStudyAction=null;if(nextAction)nextAction();
}
function continueStudy(action){
 const state=studySession?.snapshot();
 if(!studySession||state.mode==='class'||state.active||(state.mode==='homework'&&state.completedAt)){action();return;}
 openStudyDialog('choose-mode','어떤 방식으로 시작할까요?','숙제는 전체화면에서 오늘의 목표를 따라 진행해요. 수업은 기존 풀이 방식으로 진행해요.',[['숙제로 시작하기',()=>launchStudy('homework',action),true],['수업으로 시작하기',()=>launchStudy('class',action),false],['학습 현황으로',()=>{closeStudyDialog();renderStart();show('#scr-start');},false]]);
}
function clearAutoNext(){clearInterval(autoNextTimer);autoNextTimer=null;if(cancelAutoNext)cancelAutoNext();cancelAutoNext=null;}
function scheduleNext(ok,rewardSummary){
  clearAutoNext();
  if(untimed){answerDock.appendChild(el('p','manual-next-note','테스트 중 · 시간 제한과 자동 이동이 없어요. 해설을 확인한 뒤 ‘다음’을 누르세요.'));return;}
  const currentRun=run,q=run.list[run.idx],seconds=(q._evidenceResult?.selected?20:ok?5:10)+10*(q._failureCount||0);
  let remainingMs=seconds*1000,endsAt=Date.now()+remainingMs,paused=false,active=true,previous=-1;
  const message=el('div','auto-next-countdown');message.id='auto-next-countdown';
  const line=el('span','auto-next-line');line.setAttribute('role','status');line.setAttribute('aria-live','polite');message.appendChild(line);
  if(rewardSummary)message.appendChild(el('small','auto-next-rewards',rewardSummary));
  const pause=el('button','auto-next-pause','⏸ 해설 읽기 · 멈추기');pause.type='button';pause.id='q-review-pause';pause.setAttribute('aria-pressed','false');message.appendChild(pause);answerDock.appendChild(message);
  const isCurrent=()=>active&&run===currentRun&&run.list[run.idx]===q&&$('#scr-q').classList.contains('on');
  cancelAutoNext=()=>{active=false;pause.disabled=true;};
  const paint=left=>{
    message.classList.toggle('is-paused',paused);pause.setAttribute('aria-pressed',String(paused));
    pause.textContent=paused?'▶ 자동 이동 다시 시작':'⏸ 해설 읽기 · 멈추기';
    if(paused)line.textContent='자동 이동 멈춤 · 천천히 해설을 읽어 보세요.';
    else line.replaceChildren(el('strong','',String(left)),document.createTextNode('초 뒤 '+(run.idx+1===run.list.length?'결과 화면으로':'다음 문제로')+' 이동해요.'));
  };
  const tick=()=>{
    if(!isCurrent()){clearAutoNext();return;}
    const left=Math.max(0,Math.ceil((endsAt-Date.now())/1000));
    if(left!==previous){previous=left;paint(left);}
    if(left===0){clearAutoNext();next();}
  };
  pause.onclick=()=>{
    if(!isCurrent())return;
    if(paused){paused=false;endsAt=Date.now()+remainingMs;previous=-1;autoNextTimer=setInterval(tick,100);tick();}
    else{remainingMs=Math.max(0,endsAt-Date.now());paused=true;clearInterval(autoNextTimer);autoNextTimer=null;paint(Math.ceil(remainingMs/1000));}
  };
  autoNextTimer=setInterval(tick,100);tick();
}

function tone(ok){
  if(!game.state().sound)return;
  try{
    audioContext=audioContext||new (global.AudioContext||global.webkitAudioContext)();void audioContext.resume();
    const now=audioContext.currentTime;
    (ok?[523,659,784]:[220,165]).forEach((hz,i)=>{const o=audioContext.createOscillator(),g=audioContext.createGain();o.connect(g);g.connect(audioContext.destination);o.type='sine';o.frequency.value=hz;g.gain.setValueAtTime(0,now+i*.065);g.gain.linearRampToValueAtTime(.055,now+i*.065+.01);g.gain.exponentialRampToValueAtTime(.001,now+i*.065+.16);o.start(now+i*.065);o.stop(now+i*.065+.18);});
  }catch(_){}
}
function impact(ok,streak,gains){
  clearTimeout(hitTimer);effect.replaceChildren();effect.className='hit-effect '+(ok?'hit-good':'hit-wrong');
  const word=el('strong','hit-word',ok?(streak>=3?streak+' COMBO!':'정답 적중!'):'다시 도전!');if(ok){const detail=[gains.xp?'+'+gains.xp+' XP':'추가 XP 없음',gains.bonus?'💡 힌트권 +1장':'',gains.level?'Lv.'+gains.level+' 레벨 상승!':''].filter(Boolean).join(' · ');word.appendChild(el('small','hit-rewards',detail));}effect.appendChild(word);
  if(ok)for(let i=0;i<12;i++){const spark=el('i','hit-spark');spark.style.setProperty('--angle',(i*30)+'deg');spark.style.setProperty('--distance',(65+i%3*25)+'px');spark.style.setProperty('--color',['#f2b544','#30bfa0','#527fe6'][i%3]);effect.appendChild(spark);}
  void effect.offsetWidth;effect.classList.add('playing');
  $('#q-fb').classList.remove('impact-good','impact-wrong');void $('#q-fb').offsetWidth;$('#q-fb').classList.add(ok?'impact-good':'impact-wrong');
  hitTimer=setTimeout(()=>effect.classList.remove('playing'),850);tone(ok);
}
function chestControl(parent){
  const area=el('div','chest-area');
  const heading=el('strong','chest-heading','🎁 보물상자 열기');
  const help=el('p','chest-help');help.dataset.chestHelp='';
  const button=el('button','chest-button');button.type='button';
  const message=el('p','chest-message');message.setAttribute('role','status');
  function update(){const state=game.state();button.textContent=state.chests?'🎁 상자 1개 열기 · 남은 '+state.chests+'개':'🎁 아직 상자가 없어요';button.disabled=state.chests<1;
    area.classList.toggle('has-chests',state.chests>0);help.textContent=state.chests?'상자가 기다리고 있어요! 지금 열어서 힌트·시간 연장 아이템을 챙기고 출발해요.':options.guidedLearning?'복습 포함 단원·전체 진행률 60%·85%·100%에서 상자를 받아요.':'첫 풀이 60%부터 상자 지급! 해당 세트의 오답 복습까지 마치면 여기서 열 수 있어요.';}
  button.addEventListener('click',()=>{const prize=game.open();if(!prize){update();return;}message.textContent='✨ '+prize.label+' 획득!'+(game.state().chests?' 상자가 더 남았어요. 한 번 더 열어 볼까요?':' 도움 아이템을 챙겼어요. 모험을 이어 가요!');area.classList.remove('chest-open');void area.offsetWidth;area.classList.add('chest-open');tone(true);update();refreshWallet();});
  update();area.append(heading,help,button,message);parent.appendChild(area);
}
function refreshWallet(){
  const state=game.state();document.querySelectorAll('[data-wallet]').forEach(n=>n.textContent='💡 힌트 '+state.hints+' · ⏳ 연장 '+state.time+' · 🎁 상자 '+state.chests);
}
function renderAdventure(){
  const savedReviews=game.state().pendingReviews;
  for(const set of SETS){const wrong=loadWrong(set.id).length;if(wrong&&!savedReviews[gameKey(set)]){const last=loadLast(set.id);game.finish(gameKey(set),{page:options.page,setId:set.id,name:set.group+' · '+set.name,pct:last?.max?last.score/last.max*100:0,wrong});}}
  const state=game.state(),progress=game.progress(SETS.filter(s=>!s.isTypePractice).map(gameKey));adventure.replaceChildren();
  const badge=progress.pct===100?'🏆 만점 도전자 · 이 페이지 완주!':progress.pct>=80?'🏅 실전 준비 달인':progress.pct>=60?'🥈 기본기 탐험가':'🧭 오늘의 한 세트부터';
  adventure.appendChild(el('p','mastery-badge',badge));
  const heading=el('div','adventure-heading');heading.append(el('strong','','독해 모험 · Lv.'+(Math.floor(state.xp/100)+1)),el('span','xp-label',state.xp+' XP'));adventure.appendChild(heading);
  const wallet=el('p','wallet');wallet.dataset.wallet='';adventure.appendChild(wallet);
  const bar=el('div','mastery-track');const fill=el('i');fill.style.width=progress.pct+'%';bar.appendChild(fill);adventure.appendChild(bar);
  adventure.append(el('p','mastery-copy','이 페이지 시험 대비 달성도 '+progress.pct+'% · '+progress.done+'/'+progress.total+'세트 완주'),el('small','game-caption','세트의 모든 문항을 맞히고 오답 복습까지 끝내면 완주! 실제 시험 점수를 예측하는 수치는 아니에요.'));
  const rules=el('details','game-rules'),summary=el('summary','','모험 규칙과 보상');rules.append(summary,el('p','','첫 풀이 60% → 상자 1개 · 80% → 2개 · 100% → 3개. 같은 세트는 이전보다 높은 보상 단계에 도달한 만큼만 추가로 받아요. 해당 세트의 오답을 모두 다시 맞혀야 완주와 상자 보상을 받아요. 다른 세트의 진도와 오답은 각각 따로 보관해요.'),el('p','',untimed?'테스트에서는 시간 제한과 자동 이동 없이 문제와 해설을 확인할 수 있어요.':'첫 정답은 문항마다 10 XP, 3연속 정답마다 힌트권 1장! 같은 문항으로 보상을 반복해서 받지는 못해요. 처음에는 힌트권 2장과 연장권 1장을 드려요. 힌트 사용은 점수를 깎지 않아요. 기본 풀이는 한 문단 30초·두 문단 이상 50초이며, 같은 문항을 틀릴 때마다 다음 풀이에 10초씩 더 드려요. 연장권은 현재 문제에 30초를 더해요.'));adventure.appendChild(rules);
  const sound=el('button','sound-toggle',state.sound?'🔊 효과음 켜짐':'🔇 효과음 꺼짐');sound.type='button';sound.setAttribute('aria-pressed',String(state.sound));sound.onclick=()=>{const enabled=!game.state().sound;game.sound(enabled);sound.textContent=enabled?'🔊 효과음 켜짐':'🔇 효과음 꺼짐';sound.setAttribute('aria-pressed',String(enabled));if(enabled)tone(true);};adventure.appendChild(sound);
  for(const pending of game.reviews(options.page)){const lock=el('div','review-lock');lock.append(el('strong','','🔧 오답 복습이 남아 있어요'),el('p','',pending.name+' · 남은 오답 '+pending.wrong+'문항. 이 세트의 완주와 보상은 복습 후 확정돼요.'));const b=el('button','act primary',pending.name+' · 오답 이어 풀기');b.type='button';b.onclick=()=>openPending(pending.key);lock.appendChild(b);adventure.appendChild(lock);}
  chestControl(adventure);refreshWallet();
}
function openPending(key){
  const pending=key?game.pending(key):game.reviews(options.page)[0];if(!pending)return false;
  const set=SETS.find(s=>s.id===pending.setId);
  if(pending.page!==options.page||!set||pending.key!==gameKey(set))return false;
  if(!loadWrong(set.id).length){ // Older cloud summaries may omit individual answers: review the entire set.
    const all=[];set.parts.forEach((p,pi)=>p.items.forEach((_,qi)=>all.push({pi,qi})));saveWrong(set.id,all);
  }
  start(set,loadRetry(set.id),true);return true;
}
function renderTools(q){
  document.getElementById('time-help')?.remove();
  helpPanel.hidden=true;tools.hidden=true;
  tools.replaceChildren();hintBox.replaceChildren();hintBox.hidden=true;q._hintUsed=false;
  const actions=el('div','tool-actions');
  const hint=el('button','act hint-use',run.retry?'💡 복습 힌트 무료':'💡 힌트 쓰기');hint.type='button';hint.id='use-hint';hint.disabled=!run.retry&&game.state().hints<1;
  hint.onclick=()=>{
    if(!q._restoringHint&&run.deadline!=null&&Date.now()>=run.deadline){timeHelp(q);return;}
    if(q._submitted||q._hintUsed||(!run.retry&&!q._restoringHint&&!game.use('hints')))return;
    q._hintUsed=true;hint.disabled=true;hint.textContent='💡 힌트 사용함';hintBox.hidden=false;
    hintBox.append(el('strong','','무엇을 묻는 문제일까?'),el('p','',global.HomeworkGame.guide(q)));
    const existing=document.querySelectorAll('#q-body .hint');existing.forEach(n=>n.hidden=false);
    const reading=document.querySelector('#q-body .passage, #q-body .lines, #q-body .note, #q-body .sent, #q-body .pairbox .txt');
    if(reading){
      const candidates=Array.from(reading.querySelectorAll('.orig'));
      if(candidates.length){const index=global.HomeworkGame.evidenceIndex(q,candidates.map(n=>n.textContent));if(candidates[index])candidates[index].classList.add('hint-highlight');}
      else{
        // Highlight text nodes only, preserving selectable evidence and line breaks.
        const walker=document.createTreeWalker(reading,NodeFilter.SHOW_TEXT);const nodes=[];let node;
        while((node=walker.nextNode()))if(node.textContent.trim().length>18&&!node.parentElement.closest('b,mark'))nodes.push(node);
        const pieces=nodes.flatMap(n=>(n.textContent.match(/[^.!?。\n]+[.!?。]?/g)||[n.textContent]).map(text=>({node:n,text}))).filter(p=>p.text.trim().length>18&&!/^\[/.test(p.text.trim()));
        const selected=pieces[global.HomeworkGame.evidenceIndex(q,pieces.map(p=>p.text))];
        if(selected){const text=selected.node.textContent,at=text.indexOf(selected.text),fragment=document.createDocumentFragment();fragment.append(document.createTextNode(text.slice(0,at)));fragment.appendChild(el('mark','hint-highlight',selected.text));fragment.append(document.createTextNode(text.slice(at+selected.text.length)));selected.node.replaceWith(fragment);}
      }
      const excerpt=reading.querySelector('.hint-highlight');if(excerpt){hintBox.appendChild(el('strong','hint-reading-title','함께 볼 본문'));const quote=el('blockquote','hint-excerpt');quote.appendChild(el('mark','',excerpt.textContent));hintBox.appendChild(quote);}
      reading.closest('details')?.setAttribute('open','');hintBox.appendChild(el('small','','이 문장과 주장·선지를 비교해 보세요. 본문에도 같은 곳을 형광펜으로 표시했어요.'));
    }
    refreshWallet();const choice=$('#use-choice-help');if(choice)choice.disabled=q._choiceHelpUsed||game.state().hints<1;
  };
  const extend=el('button','act time-use','⏳ 30초 연장');extend.type='button';extend.id='use-time';
  extend.hidden=untimed;
  extend.disabled=game.state().time<1;extend.title='현재 문제의 제한 시간에 30초를 더해요';
  extend.onclick=()=>{
    if((q._submitted&&!q._evidencePhase)||q._evidencePhase?.paused||(!q._timeDecision&&run.deadline==null)||!game.use('time'))return;
    const expired=!!q._timeDecision;q._timeDecision=null;closeTimeDecision();clearTimeSignal();
    if(q._evidencePhase){q._evidencePhase.bonusMs=(q._evidencePhase.bonusMs||0)+30000;q._evidencePhase.remainingMs=(expired?0:Math.max(0,run.deadline-Date.now()))+30000;startEvidenceTimer(q);}
    else{run.extraSeconds=(run.extraSeconds||0)+30;if(expired){run.questionRemainingMs=30000;startQuestionTimer(q);}else{run.deadline+=30000;run.questionRemainingMs=Math.max(0,run.deadline-Date.now());}}
    extend.disabled=game.state().time<1;refreshWallet();saveRun(run.idx);
  };
  const eliminate=el('button','act choice-use','🧩 선지 2개 가리기 · 힌트권 1장');eliminate.type='button';eliminate.id='use-choice-help';eliminate.hidden=q.type!=='mc';
  eliminate.disabled=q._choiceHelpUsed||game.state().hints<1;eliminate.onclick=()=>{if(run.deadline!=null&&Date.now()>=run.deadline){timeHelp(q);return;}if(q._submitted||q._choiceHelpUsed||q.type!=='mc'||!game.use('hints'))return;const wrongs=shuffle(q.options.filter(o=>o!==q.answer));q._eliminated=wrongs.slice(0,2);q._choiceHelpUsed=true;applyChoiceHelp(q);eliminate.disabled=true;eliminate.textContent='🧩 선지 2개를 가렸어요';hint.disabled=q._hintUsed||(!run.retry&&game.state().hints<1);refreshWallet();saveRun(run.idx);document.getElementById('time-help')?.remove();};
  actions.append(hint,extend,eliminate);tools.appendChild(actions);refreshWallet();
}
function placeReadingControl(){
 const reading=$('#q-body .passage, #q-body .lines, #q-body .note');if(!reading)return;
 let button=$('#use-reading-size');if(!button){button=el('button','act reading-size reading-size-inline');button.id='use-reading-size';button.type='button';const paint=()=>{const large=document.body.classList.contains('large-reading');button.textContent=large?'🔎 크기 되돌리기':'🔎 지문 크게 보기';button.setAttribute('aria-pressed',String(large));};button.onclick=()=>{document.body.classList.toggle('large-reading');paint();};paint();}
 let heading=reading.querySelector(':scope>.reading-heading');if(!heading){heading=el('div','reading-heading');const title=reading.querySelector(':scope>b');if(title)heading.appendChild(title);reading.prepend(heading);}heading.appendChild(button);
}
function applyChoiceHelp(q){const valid=new Set((q._eliminated||[]).filter(o=>o!==q.answer));document.querySelectorAll('#q-body .pick').forEach(b=>{if(valid.has(b.textContent)){b.hidden=true;b.dataset.eliminated='true';}});}
function placeAnswerSupport(q){
 const picks=$('#q-body .picks');if(!picks)return;
 const support=el('div','answer-support');support.id='answer-support';
 const hint=$('#use-hint'),choice=$('#use-choice-help');if(hint)support.appendChild(hint);if(q.type==='mc'&&choice)support.appendChild(choice);support.appendChild(hintBox);picks.after(support);
 if(q.type==='ox'){
  const unknown=el('button','pick unknown-pick','? 모름');unknown.type='button';unknown.id='answer-unknown';unknown.title='정답과 해설을 확인하고 오답 복습에 추가해요';
  unknown.onclick=()=>{if(q._submitted||q._timeDecision)return;q._unknown=true;q._picked='?';picks.querySelectorAll('[aria-pressed]').forEach(b=>b.setAttribute('aria-pressed','false'));unknown.setAttribute('aria-pressed','true');submit('unknown');};picks.appendChild(unknown);
 }
}
function closeTimeDecision(){document.getElementById('time-expired-dialog')?.remove();const app=document.getElementById('app');if(app)app.inert=false;$('#q-body').inert=false;}
function timeHelp(q,evidence=false){
 if(untimed||q._evidencePhase?.paused||q._submitted&&!q._evidencePhase)return;
 if(!q._timeDecision){
  clearInterval(run.timerId);clearTimeSignal();run.deadline=null;
  if(evidence)q._evidencePhase.remainingMs=0;
  else{run.questionRemainingMs=0;q._solveElapsedMs=(q._solveElapsedMs||0)+(run.qStart?Math.max(0,Date.now()-run.qStart):0);run.qStart=null;}
  q._timeDecision=evidence?'evidence':'answer';saveRun(run.idx);
 }
 if(document.getElementById('time-expired-dialog'))return;
 const overlay=el('section','time-expired-overlay');overlay.id='time-expired-dialog';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','time-expired-title');
 const state=game.state(),canContinue=state.time>0||state.chests>0;
 const card=el('div','time-expired-card');card.append(el('h2','','시간이 끝났어요'));card.firstChild.id='time-expired-title';
 card.append(el('p','',evidence&&q._evidencePhase.failed?'처음 틀린 근거는 오답으로 기록되어 있어요. '+(canContinue?'시간을 더 받아 근거를 다시 확인할 수 있어요.':'정답 근거와 해설을 확인해 보세요.'):canContinue?'조금 더 풀거나 정답과 해설을 확인할 수 있어요. 아직 채점하지 않았어요.':'사용할 연장권과 상자가 없어요. 정답과 해설을 확인하고 복습에서 다시 도전해요.'));
 const wallet=el('p','expiry-wallet');wallet.dataset.wallet='';card.appendChild(wallet);const actions=el('div','expiry-actions');
 const add=(label,id,action)=>{const b=el('button','act primary',label);b.type='button';b.id=id;b.onclick=action;actions.appendChild(b);return b;};
 if($('#use-time'))$('#use-time').disabled=state.time<1;if(state.time>0)add('⏳ 30초 더 풀기 · 연장권 1장','expiry-extend',()=>$('#use-time').click());
 else card.appendChild(el('p','expiry-empty','사용할 연장권이 없어요.'));
 const hintButton=$('#use-hint');if(state.time>0&&hintButton&&!hintButton.disabled&&!q._hintUsed&&(run.retry||state.hints>0))add('⏳💡 30초 연장 + 힌트 같이 쓰기','expiry-extend-hint',()=>{$('#use-time').click();hintButton.click();});
 if(state.chests>0)add('🎁 상자 열고 아이템 받기','expiry-open-chest',()=>{const prize=game.open();if(prize){closeTimeDecision();$('#use-time').disabled=game.state().time<1;refreshWallet();timeHelp(q,evidence);$('#time-expired-title').after(el('p','journey-earned',prize.label+' 획득!'));}});
 const show=add(evidence?'근거 해설 보기':'정답과 해설 보기','expiry-reveal',()=>{q._timeDecision=null;closeTimeDecision();if(evidence)completeEvidence(q,null);else submit('questionTimeout');});show.className='act ghost';card.appendChild(actions);overlay.appendChild(card);document.body.appendChild(overlay);const app=document.getElementById('app');if(app)app.inert=true;refreshWallet();(actions.querySelector('button')||show).focus();
}

function resultAdventure(total,max,wrong){
  const outcome=game.finish(gameKey(run.set),{page:options.page,setId:run.set.id,name:run.set.group+' · '+run.set.name,pct:max?total/max*100:0,wrong,retry:run.retry,progressRewards:!!options.guidedLearning});
  const pending=game.pending(gameKey(run.set));rewardBox.replaceChildren();
  if(options.guidedLearning){
   const model=learningState(),unit=journeyUnit(model),gains=awardJourneyRewards(model),hard=isHardSet(run.set);
   rewardBox.append(el('h2','',hard?(pending?'하드 도전 · 남은 오답':'하드 구간 클리어!'):pending?'깃발을 세우기 전 · 복습 시간':'⚑ 구간 클리어!'),el('p','',hard?'하드 난이도는 선택 과정이에요. 오답은 여기서 복습하거나 나중에 이어 하고, 다음 단원의 숙제를 먼저 시작해도 돼요.':journeyCheer(model,unit)),el('p','',hard?'하드 진행 '+percent(unit.hard.progress*100):'단원 '+percent(unit.progress*100)+' · 연습 정답률 '+(unit.practiceAccuracy==null?'시작 전':percent(unit.practiceAccuracy))+' · 학습 기준 예상 '+percent(unit.expectedAccuracy)));
   if(gains.length)rewardBox.appendChild(el('p','journey-earned','🎁 '+gains.join(' · ')));
   rewardBox.appendChild(el('small','','단원·전체 코스 각각 복습 포함 60%·85%·100%에서 상자 누적 1·2·3개를 받아요.'));const wallet=el('p','wallet');wallet.dataset.wallet='';rewardBox.appendChild(wallet);chestControl(rewardBox);refreshWallet();return;
  }
  const pct=outcome.pct??pending?.pct??(total/max*100);const tier=pct>=100?3:pct>=80?2:pct>=60?1:0;
  rewardBox.append(el('h2','',pending?'🔒 오답을 수리하고 보물상자 받기':'✨ 세트 클리어!'),el('p','','첫 풀이 정답률 '+Math.round(pct)+'% · 보상 단계 '+tier+'/3'));
  rewardBox.append(el('p','',pending?'남은 오답 '+pending.wrong+'개를 모두 맞히면 보상과 다음 학습이 열려요. 복습 힌트는 무료예요.':outcome.gained?'🎁 보물상자 '+outcome.gained+'개 획득!':tier?'이 세트에서 이미 받은 단계의 상자예요. 더 높은 정답률에 도전해 보세요.':'오답 복습 완료! 첫 풀이 60%부터 보물상자를 받을 수 있어요.'));
  const wallet=el('p','wallet');wallet.dataset.wallet='';rewardBox.appendChild(wallet);chestControl(rewardBox);refreshWallet();
  const following=followingSet();
  $('#e-again').disabled=!!pending;nextSetButton.disabled=!!pending||!following;nextTypeButton.disabled=!!pending;
  nextSetButton.textContent=following&&following.level==='심화'&&run.set.level==='기본'?'심화 5지선다 도전':'다음 세트 풀기';
}
function followingSet(){
  const set=run.set,similar=SETS.filter(s=>(s.category||s.group)===(set.category||set.group)&&s.level===set.level),i=similar.findIndex(s=>s.id===set.id);return similar[i+1]||(set.level==='기본'?SETS.find(s=>s.category===set.category&&s.level==='심화'&&(!options.units||s.unitId===set.unitId&&s.unitType==='advanced')):null)||null;
}
nextSetButton.onclick=()=>{if(game.pending(gameKey(run.set))){openPending(gameKey(run.set));return;}const set=followingSet();if(set)start(set,loadRun(set.id));};
nextTypeButton.onclick=()=>{
  if(game.pending(gameKey(run.set))){openPending(gameKey(run.set));return;}
  if(options.units){goUnit(selectedUnit);return;}
  if(options.categories){const at=options.categories.indexOf(run.set.category);practiceFilter.category=options.categories[(at+1)%options.categories.length];sessionStorage.setItem(filterKey,JSON.stringify(practiceFilter));}
  renderStart();show('#scr-start');(options.categories?$('#practice-filters'):$('#sets')).scrollIntoView({block:'start'});
};

/* ---- 페이지별 전송 큐 ---- */
const sync = global.HomeworkSync.create({ storage:localStorage, key:PREFIX+'queue', sheetUrl:SHEET_URL, uid:UID, normalizeUid, onChange:updateSync });
const readQ = () => sync.readRows();
const enqueue = payload => sync.enqueue(payload);
const flush = () => sync.flush();
function updateSync(){
  const state=sync.state();
  document.querySelectorAll('.syncbox').forEach(el=>{
    el.textContent=state.storageError || (!state.configured
      ? '시트 연결 전입니다. 풀이 기록은 이 기기에 보관됩니다.'+(state.pending?' · 보관 중 '+state.pending+'건':'')
      : state.pending ? '전송 대기 '+state.pending+'건 · 연결되면 자동으로 다시 보냅니다.' : '기록이 모두 전송되었습니다.');
    el.classList.toggle('pending',state.pending>0 || !!state.storageError);
  });
}

/* ---- 두 기기에서 같은 회차 기록 불러오기 ---- */
let cloudHistoryLoading=false;
async function loadCloudHistory(){
  if(cloudHistoryLoading || !options.history || !global.HomeworkSync.isEndpoint(SHEET_URL)) return;
  cloudHistoryLoading=true;
  try{
    const url=new URL(SHEET_URL); url.searchParams.set('action','history'); url.searchParams.set('uid',UID);
    const response=await fetch(url.toString());
    const data=await response.json();
    if(!data || data.ok!==true || !Array.isArray(data.rows)) return;
    const setsByLabel=new Map(SETS.map(set=>[set.group+' · '+set.name,set]));
    let changed=false;
    const cloudCounts=new Map();
    const cloudLatestNewer=new Set();
    const uniqueRows=new Map();
    data.rows.forEach(row=>{
      if(String(row.set||'').includes('(오답)')) return;
      uniqueRows.set([row.session,row.set,row.attempt].join('|'),row);
    });
    const latestRows=new Map();
    uniqueRows.forEach(row=>{
      const set=setsByLabel.get(String(row.set||''));
      if(!set) return;
      cloudCounts.set(set.id,(cloudCounts.get(set.id)||0)+1);
      const score=Number(row.score), max=Number(row.max);
      if(!Number.isFinite(score)||!Number.isFinite(max)) return;
      const endedAt=String(row.endedAt||'');
      const current=loadLast(set.id);
      const parsed=Date.parse(endedAt);
      const currentParsed=current&&current.at ? Date.parse(String(current.at).replace(' ','T')) : -1;
      if(!current || (Number.isFinite(parsed)&&parsed>currentParsed)){
        cloudLatestNewer.add(set.id);
        try{ localStorage.setItem(lastKey(set.id),JSON.stringify({score,max,at:endedAt})); changed=true; }catch(e){}
      }
      const previous=latestRows.get(set.id);
      if(!previous || parsed>Date.parse(String(previous.endedAt||''))) latestRows.set(set.id,row);
    });
    cloudCounts.forEach((count,id)=>{ if(count>getAttempts(id)){ try{ localStorage.setItem(attemptsKey(id),String(count)); changed=true; }catch(e){} } });
    latestRows.forEach((row,id)=>{
      const set=SETS.find(s=>s.id===id);
      if(!set || !cloudLatestNewer.has(id)) return;
      const wrong=[]; const seen=new Set(); let matchedAnswers=0;
      (data.answers||[]).forEach(answer=>{
        if(answer.session!==row.session || answer.set!==row.set) return;
        matchedAnswers++;
        if(Number(answer.score)>=Number(answer.max)) return;
        const pi=set.parts.findIndex(part=>part.name===answer.part), qi=Number(answer.qno)-1;
        if(pi<0 || qi<0 || qi>=set.parts[pi].items.length) return;
        const key=pi+':'+qi; if(!seen.has(key)){ seen.add(key); wrong.push({pi,qi}); }
      });
      if(matchedAnswers){ saveWrong(id,wrong); changed=true; }
    });
    if(changed && $('#scr-start').classList.contains('on')) renderStart();
  }catch(e){ /* 기록 서버가 아직 새 버전이 아니면 다음 시작 때 다시 시도 */ }
  finally{ cloudHistoryLoading=false; }
}

/* ---- 시작 화면 ---- */
function show(id){ if(pilotActive){pilotView?.destroy();pilotView=null;pilotActive=false;document.body.classList.remove('socratic-active');}closeTimeDecision();clearAutoNext();resetAnswerDock();document.getElementById('time-help')?.remove();document.body.classList.remove('quick-comparison');clearTimeSignal();++prefetchTicket;clearAutoNext();effect.classList.remove('playing');clearTimeout(hitTimer);document.body.classList.remove('split-question');document.body.classList.toggle('units-home',!!options.units&&id==='#scr-start');document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on')); $(id).classList.add('on'); paintHomeworkProgress(); window.scrollTo(0,0); }
function renderStart(){
  renderAdventure();
  homeGameState=game.state();
  document.body.classList.toggle('guided-study',guidedActive());adventure.hidden=guidedActive();$('.page-nav').hidden=guidedActive();
  if(guidedActive()){renderGuidedHome();return;}
  if(options.units){renderUnitStart();if(options.testMode&&manualSelection){const back=el('button','act ghost','자동 학습 화면으로');back.id='test-close-library';back.onclick=()=>{manualSelection=false;renderStart();};$('#sets').prepend(back);}return;}
  if(options.startLayout==='sets'){
    const box=$('#sets');box.replaceChildren();
    const heading=document.createElement('h2');heading.textContent='고급 혼합 · 30문항';box.appendChild(heading);
    const tiles=document.createElement('div');tiles.className='tiles';
    SETS.forEach(set=>tiles.appendChild(makeSetCard(set)));box.appendChild(tiles);
    return;
  }
  if(practice){ renderPracticeStart(); return; }
  $('#sets').innerHTML = '';
  const cats = [];
  const topCategory = set => set.cat==='비유법' ? '개념어' : set.cat.replace(/^(\d+단원) 지문$/, '$1');
  SETS.forEach(set=>{
    const category=topCategory(set);
    let c=cats.find(x=>x.name===category); if(!c){ c={name:category, groups:[]}; cats.push(c); }
    let g=c.groups.find(x=>x.name===set.group); if(!g){ g={name:set.group, sets:[]}; c.groups.push(g); } g.sets.push(set);
  });
  const categoryOrder=['1단원','2단원','3단원','4단원','5단원','개념어'];
  cats.sort((a,b)=>{
    const ai=categoryOrder.indexOf(a.name),bi=categoryOrder.indexOf(b.name);
    return (ai<0?categoryOrder.length:ai)-(bi<0?categoryOrder.length:bi);
  });
  cats.forEach(c=>{
  const cbox=document.createElement('div'); cbox.className='cat'; cbox.innerHTML='<h2>'+c.name+'</h2>';
  c.groups.forEach(g=>{
    const box=document.createElement('div'); box.className='grp';
    box.innerHTML='<h3>'+g.name+'</h3>';
    const chapOf = set => /^\d+(~\d+)?문단$/.test(set.name) ? '본문' : /^기초/.test(set.name) ? '기초' : /^기본/.test(set.name) ? '기본'
                       : /^하/.test(set.name) ? '하' : /^중/.test(set.name) ? '중' : /^상/.test(set.name) ? '상' : /^유형 심화/.test(set.name) ? '유형 심화' : '문제';
    const ORDER=['본문','기초','기본','하','중','상','유형 심화','문제'];
    const chaps={}; g.sets.forEach(set=>{ (chaps[chapOf(set)]=chaps[chapOf(set)]||[]).push(set); });
    const opened=loadOpen();
    ORDER.filter(k=>chaps[k]).forEach(k=>{
      const list=chaps[k];
      const ch=document.createElement('div'); ch.className='chap'; const key=g.name+'|'+k;
      if(opened[key]) ch.classList.add('open');
      let sc=0, mx=0, done=0; list.forEach(set=>{ const r=loadLast(set.id); if(r){ sc+=r.score; mx+=r.max; done++; } });
      const pct = mx ? Math.round(sc/mx*100) : null;
      const btn=document.createElement('button'); btn.type='button'; btn.className='chap-btn';
      btn.innerHTML='<span class="arrow">▶</span><span class="nm">'+k+'</span><span class="cnt">'+list.length+'세트'+(done?' · '+done+'개 풀었음':'')+'</span>'
        +'<span class="acc '+(pct==null?'':(pct>=85?'good':(pct<65?'bad':'')))+'">'+(pct==null?'미풀이':'정답률 '+pct+'%')+'</span>';
      btn.addEventListener('click', ()=>{ ch.classList.toggle('open'); const o=loadOpen(); o[key]=ch.classList.contains('open'); saveOpen(o); });
      const body=document.createElement('div'); body.className='chap-body';
      const tiles=document.createElement('div'); tiles.className='tiles'; body.appendChild(tiles);
      ch.append(btn, body); box.appendChild(ch);
    list.forEach(set=>{
    tiles.appendChild(makeSetCard(set));
    });
    });
    cbox.appendChild(box);
  });
  $('#sets').appendChild(cbox);
  });
}

function learningState(){return global.HomeworkLearningPath.build({sets:SETS,units:options.units||[],storage:localStorage,prefix:PREFIX,page:options.page});}
function startGuided(){const model=learningState(),target=model.next;const chosen=pilotFor(target?.set.id);if(chosen){startPilot(false,chosen);return;}const due=duePilot();if(due){startPilot(true,due);return;}if(!target){renderStart();show('#scr-start');return;}manualSelection=false;document.body.classList.add('guided-study');if(target.kind==='review'){if(target.pending&&openPending(target.pending.key))return;start(target.set,target.retry,true);}else start(target.set,target.normal);}
function isHardSet(set){return !!set&&global.HomeworkLearningPath.isHardSet(set);}
function startHard(unitId){
 const unit=learningState().steps.find(u=>u.id===unitId),target=unit?.hard?.next;
 if(!unit?.hard?.unlocked||!target){renderStart();show('#scr-start');return;}
 manualSelection=false;document.body.classList.add('guided-study');
 if(target.kind==='review'){if(target.pending&&openPending(gameKey(target.set)))return;start(target.set,target.retry,true);}else start(target.set,target.normal);
}
function percent(value){return (Math.floor(value*10+1e-7)/10).toLocaleString('ko-KR',{maximumFractionDigits:1})+'%';}
function journeyUnit(model,set=run?.set){return model.steps.find(u=>u.id===set?.unitId)||model.current;}
function journeyChapter(unit,set=run?.set){return unit.chapters.find(c=>c.id===set?.readingBlock)||unit.chapters.find(c=>!c.done)||unit.chapters.at(-1);}
function journeyCheer(model,unit=journeyUnit(model)){
 if(model.phase==='supplement')return '본문 깃발을 모두 세웠어요! 이제 단원별 보충과 남은 복습으로 24문항 중 20문항 목표를 향해 마무리해요.';
 const done=unit.chapters.filter(c=>c.done).length,current=journeyChapter(unit);
 if(unit.done)return unit.id+'단원 본문 클리어! 4문항 중 3문항 목표에 한 걸음 가까워졌어요. 다음 월드로 출발해요!';
 if(model.next?.kind==='review')return '틀린 부분까지 바로잡는 중이에요. 복습을 마친 내용만 깃발에 반영돼요. 이번 구간도 끝낼 수 있어요!';
 return (current?.progress?'이번 '+(current.index+1)+'챕터 '+percent(current.progress*100)+'까지 왔어요. ':'첫 구간부터 한 걸음씩 시작해요. ')+(done?'챕터 '+done+'개를 마쳤고 ':'')+'이 단원은 '+(4-done)+'챕터 남았어요. 4문항 중 3문항을 노려 봐요!';
}
function awardJourneyRewards(model){
 if(!options.guidedLearning)return [];
 const earned=[];for(const unit of model.steps.filter(u=>u.ready)){const reward=game.stage('journey:'+options.page+':unit:'+unit.id,unit.progress);if(reward.gained)earned.push(unit.id+'단원 '+percent(unit.progress*100)+' · 상자 +'+reward.gained);}
 const globalReward=game.stage('journey:'+options.page+':all',model.progress);if(globalReward.gained)earned.push('전체 코스 '+percent(model.progress*100)+' · 상자 +'+globalReward.gained);
 return earned;
}
function renderStageMap(model,home){
 const unit=model.current,map=el('section','stage-map');map.id='stage-map';
 map.append(el('small','world-caption','WORLD '+(model.steps.indexOf(unit)+1)+' · '+unit.id+'단원'),el('h2','',model.phase==='supplement'?'마지막 코스 · 단원별 보충 자료':unit.ready?'네 개의 챕터를 따라 출발!':'다음 월드 준비 중'));
 const road=el('ol','stage-road');
 const active=unit.chapters.find(c=>!c.done);
 for(const chapter of unit.chapters){const node=el('li','stage-node'+(chapter.done?' cleared':chapter===active&&unit.ready?' active':' locked'));node.dataset.chapter=chapter.id;node.dataset.chapterState=chapter.done?'cleared':chapter===active&&unit.ready?'current':'waiting';
  const marker=el('div','stage-marker',chapter.done?'⚑':String(chapter.index+1));marker.setAttribute('aria-hidden','true');
  node.append(marker,el('small','stage-label','CHAPTER '+(chapter.index+1)),el('strong','',chapter.title),el('span','stage-state',chapter.done?'복습까지 클리어':chapter.ready?percent(chapter.progress*100)+' 진행':'자료 준비 중'));
  const bar=el('progress');bar.max=1;bar.value=chapter.progress;bar.setAttribute('aria-label',(chapter.index+1)+'챕터 진행률');node.appendChild(bar);road.appendChild(node);
 }
 map.appendChild(road);home.appendChild(map);
}
function renderHardCourses(model,home){
 const courses=model.steps.filter(u=>u.hard?.sets.length&&(u.hard.unlocked||u.id===model.current.id));if(!courses.length)return;
 const section=el('section','hard-courses');section.id='hard-courses';section.setAttribute('aria-label','선택형 하드 난이도');
 for(const unit of courses){const hard=unit.hard,card=el('div','hard-course'+(hard.unlocked?' unlocked':''));card.dataset.hardUnit=unit.id;
  card.append(el('small','',hard.unlocked?'HARD · 선택 도전':'HARD · 잠김'),el('h3','',unit.id+'단원 하드 난이도'),el('p','',hard.unlocked?'기본 4챕터 완료! 심화 5지선다에 도전할 수 있어요. 하드를 마치지 않아도 다음 단원의 숙제를 할 수 있어요.':'기본 4챕터와 그 오답 복습을 마치면 열려요. 먼저 문단별 기본 문제를 차례로 풀어요.'));
  if(hard.unlocked){card.appendChild(el('span','hard-progress','하드 '+percent(hard.progress*100)+(hard.done?' · 복습까지 완료':' 진행')));if(hard.next){const button=el('button','act ghost',unit.id+'단원 하드 '+(hard.next.kind==='new'?'도전하기':hard.next.kind==='review'?'복습하기':'이어서 하기'));button.type='button';button.dataset.hardStart=unit.id;button.onclick=()=>continueStudy(()=>startHard(unit.id));card.appendChild(button);}}
  else {const locked=el('button','act ghost','기본 4챕터 완료 후 해금');locked.type='button';locked.disabled=true;card.appendChild(locked);}section.appendChild(card);
 }home.appendChild(section);
}
function renderGuidedHome(){
 document.body.classList.add('units-home');
 const model=learningState(),current=model.current,next=model.next,box=$('#sets');const gains=awardJourneyRewards(model);box.replaceChildren();$('#practice-links').hidden=true;$('#practice-filters').hidden=true;
 $('#page-title').textContent='기말고사 깨부수기';$('#page-intro').textContent='한 챕터씩 깃발을 세워요. 본문 모험과 마지막 복습으로 24문항 중 20문항을 노려 봐요!';
 const home=el('section','guided-home');home.id='guided-home';
 if(daily){const today=daily.snapshot(),card=el('section','guided-next');card.id='daily-homework-goal';card.append(el('h3','','오늘의 숙제 · '+today.date),el('p','',dailyText(today)));home.appendChild(card);}
 const ladder=el('ol','exam-ladder');model.steps.forEach((step,i)=>{const item=el('li','exam-step'+(step.id===current.id?' current':'')+(step.done?' done':''));item.dataset.examStep=step.id;if(step.id===current.id)item.setAttribute('aria-current','step');item.append(el('span','step-number',String(i+1)),el('strong','',step.id+'단원'),el('small','',step.done?'본문 클리어':step.ready?(step.id===current.id?'모험 중':'다음 월드'):'준비 중'));ladder.appendChild(item);});home.appendChild(ladder);
 renderPilotHome(home,model.next);
 renderStageMap(model,home);
 const stats=el('div','journey-stats');
 const values=[['progress','이 단원 진행',percent(current.progress*100),'복습까지 확인한 내용'],['accuracy','연습 첫 정답률',current.practiceAccuracy==null?'—':percent(current.practiceAccuracy),current.practiceAccuracy==null?'첫 구간을 풀면 표시돼요':'실제 첫 풀이 기록 · 복습 점수 제외'],['estimate','학습 기준 예상',percent(current.expectedAccuracy),'단원 완주 목표 3/4 · 진행률 환산']];
 for(const [key,title,value,note] of values){const card=el('div','journey-stat');card.dataset.journeyMetric=key;card.append(el('small','',title),el('strong','',value),el('span','',note));stats.appendChild(card);}home.appendChild(stats);
 const overall=el('section','journey-overall');overall.append(el('strong','','전체 '+model.chaptersDone+' / 24챕터 클리어'),el('span','','남은 '+(24-model.chaptersDone)+'챕터 · 마지막 단원별 보충 '+model.steps.filter(u=>u.supplementDone).length+' / 6코스'),el('p','','전체 코스 '+percent(model.progress*100)+' · 학습 기준 예상 '+percent(model.expectedAccuracy)+' · 최종 목표 20/24'));
 overall.appendChild(el('small','estimate-note','예상치는 학습 진도를 목표 정답률에 환산한 동기부여 지표이며, 실제 시험 성적을 확정하지 않아요.'));home.appendChild(overall);
 const cheer=el('p','journey-cheer',journeyCheer(model,current));cheer.setAttribute('role','status');home.appendChild(cheer);
 if(gains.length)home.appendChild(el('p','journey-earned','🎁 '+gains.join(' · ')));
 if(game.state().chests)chestControl(home);
 if(next){const card=el('section','guided-next'),chapter=journeyChapter(current,next.set);card.append(el('small','',next.kind==='review'?'깃발을 세우기 전 · 필수 복습':model.phase==='supplement'?'마지막 코스 · '+current.id+'단원 보충 자료':next.kind==='resume'?'풀던 구간부터 이어가요':'자동으로 정한 다음 구간'),el('h3','',(course=>course?(course.content.label||'1~3문단')+' · 질문하며 읽기':next.set.name.replace(/\s*10문제/,' 연습'))(pilotFor(next.set.id))),el('p','',model.phase==='supplement'?'본문 밖 개념을 따로 정리하는 시간이에요.':(chapter.index+1)+'챕터 · '+chapter.title));
  const list=el('ul','guided-knowledge');global.HomeworkLearningPath.knowledge(next.set,next.kind).forEach(text=>list.appendChild(el('li','',text)));card.append(el('h4','','시작 전에 알아두기'),list);
  const actions=el('div','study-start-actions');actions.id='study-start-actions';
  const button=el('button','act primary','숙제로 시작하기');button.id='guided-start';button.type='button';button.onclick=()=>launchStudy('homework',startGuided);
  const classButton=el('button','act ghost','수업으로 시작하기');classButton.id='guided-class-start';classButton.type='button';classButton.onclick=()=>launchStudy('class',startGuided);
  actions.append(button,classButton);card.append(actions,el('p','study-mode-guide',daily?'오늘의 문단 목표 또는 학습 시간 목표를 채우면 알려 드려요. 풀던 문제는 계속 풀 수 있어요.':'숙제: 전체화면 · 30분 달성 안내 · 탭 이동 알림 / 수업: 숙제용 제한 없이 진행'));home.appendChild(card);
 }else home.appendChild(el('p','guided-complete',model.phase==='complete'?'본문과 보충 복습까지 완주! 이제 24문항 중 20문항 목표에 도전해 봐요.':'다음 '+current.id+'단원 자료를 준비 중이에요. 준비되면 모험이 자동으로 이어집니다.'));
 renderHardCourses(model,home);
 const rewards=el('details','journey-rules');rewards.append(el('summary','','상자와 예상 정답률은 어떻게 올라가나요?'),el('p','','현재 단원과 전체 코스 각각 복습 포함 진행률 60%에서 상자 누적 1개, 85%에서 2개, 100%에서 3개를 받아요. 새 단계에 오른 만큼만 지급해요. 정답률은 단계 전에도 조금씩 표시돼요.'),el('p','','단원 예상치는 본문 진도를 3/4(75%) 목표에 연속 환산해요. 전체는 여섯 단원의 본문으로 18/24, 마지막 보충과 복습으로 2/24를 더해 20/24 목표에 도달하는 학습 지표예요. 실제 연습 정답률은 별도로 표시해요.'));home.appendChild(rewards);
 const supplements=el('details','supplement-world');supplements.id='supplement-world';supplements.append(el('summary','','맨 마지막 코스 · 단원별 보충 자료'),el('p','','본문 여섯 월드를 먼저 지나고 비판적 읽기·인문·예술 개념과 남겨 둔 유형 복습을 차례로 정리해요. 기존 기록은 유지됩니다.'));
 for(const u of model.steps){const row=el('p');row.append(el('strong','',u.id+'단원 보충 자료'),el('span','',u.ready?(u.supplementDone?' · 복습 완료':' · 본문 코스 뒤에 공부해요'):' · 자료 준비 중'));supplements.appendChild(row);}home.appendChild(supplements);
 if(options.testMode){const manual=el('button','act ghost','문제를 골라서 테스트');manual.id='test-open-library';manual.type='button';manual.onclick=()=>{manualSelection=true;renderStart();};home.appendChild(manual);}
 if(!game.state().chests)chestControl(home);box.appendChild(home);
}
function paintGuidedStatus(){guidedStatus.hidden=!guidedActive();if(!guidedActive())return;const model=learningState(),s=journeyUnit(model),chapter=journeyChapter(s),hard=isHardSet(run.set);const gains=awardJourneyRewards(model);
 guidedStatus.replaceChildren(el('strong','',s.id+'단원 · '+(hard?'하드 난이도 · 선택 도전':model.phase==='supplement'?'보충 자료':(chapter.index+1)+'챕터 '+percent(chapter.progress*100))),el('span','',hard?'하드를 끝내지 않아도 다음 단원의 기본 숙제를 할 수 있어요.':'단원 '+percent(s.progress*100)+' · 연습 정답률 '+(s.practiceAccuracy==null?'시작 전':percent(s.practiceAccuracy))+' · 학습 기준 예상 '+percent(s.expectedAccuracy)));
 const wallet=el('small','chapter-wallet');wallet.dataset.wallet='';guidedStatus.appendChild(wallet);refreshWallet();
 if(gains.length){const note=el('p','journey-earned','🎁 '+gains.join(' · '));$('#q-fb').appendChild(note);refreshWallet();}
 if(run?.list[run.idx]?._submitted&&!run.list[run.idx]?._evidencePhase){$('#q-fb').appendChild(el('p','journey-cheer',journeyCheer(model,s)));}
}
function paintGuidedContinuation(){
 guidedContinue.hidden=!guidedActive();hardContinue.hidden=true;if(!guidedActive())return;
 const model=learningState(),target=model.next,unit=journeyUnit(model),hard=unit.hard;
 guidedContinue.textContent=target?(target.set.unitId!==run.set.unitId?target.set.unitId+'단원 숙제 시작하기':target.kind==='review'?'필수 복습하고 계속하기':model.phase==='supplement'?'단원 보충 자료 이어 하기':'다음 구간 계속하기'):'학습 현황으로';guidedContinue.onclick=()=>continueStudy(startGuided);
 if(hard?.unlocked&&hard.next&&!(hard.next.kind==='review'&&hard.next.set.id===run.set.id)){
  hardContinue.hidden=false;hardContinue.textContent=unit.id+'단원 하드 '+(isHardSet(run.set)?'계속하기':'도전하기')+' · 선택';hardContinue.onclick=()=>continueStudy(()=>startHard(unit.id));
 }
}

function makeSetCard(set){
    const total = set.parts.reduce((a,p)=>a+p.items.length,0);
    const saved = loadRun(set.id);
    const pending=homeGameState.pendingReviews[gameKey(set)];
    const card = document.createElement('div');
    card.className = 'set' + (saved ? ' live' : '');
    const main = document.createElement('button'); main.type='button'; main.className='set-main';
    main.dataset.setId=set.id;
    main.innerHTML = '<div><div class="t">'+set.name+'</div><div class="d">'+total+'문항 · '+set.desc+'</div></div>'+
      (pending ? '<div class="n"><b>오답 '+pending.wrong+'개</b>복습 이어 풀기</div>' : saved
        ? '<div class="n"><b>'+saved.idx+' / '+total+'</b>이어서 풀기</div>'
        : (function(){ const r=loadLast(set.id); return '<div class="n"><b>'+getAttempts(set.id)+'</b>번 풀었음'+(r?' · 지난 '+r.score+'/'+r.max:'')+'</div>'; })());
    main.addEventListener('click', ()=> start(set, saved));
    if(homeGameState.records[gameKey(set)]?.mastered)main.appendChild(el('span','set-mastered','✓ 오답까지 완주'));
    card.appendChild(main);
    if(pending)return card;
    if(saved){
      const nb = document.createElement('button'); nb.type='button'; nb.className='set-new';
      const label = (saved.attempt+1)+'회차 풀기 시작';
      nb.textContent = label;
      nb.addEventListener('click', ()=>{
        if(nb.dataset.armed){ clearRun(set.id); start(set); }
        else { nb.dataset.armed='1'; nb.textContent='풀던 것은 지워집니다. 한 번 더 누르세요'; setTimeout(()=>{ delete nb.dataset.armed; nb.textContent=label; }, 3000); }
      });
      card.appendChild(nb);
    }else{
      const nb = document.createElement('button'); nb.type='button'; nb.className='set-new';
      nb.textContent = (getAttempts(set.id)+1)+'회차 풀기 시작';
      nb.addEventListener('click', ()=> start(set));
      card.appendChild(nb);
    }
    const wl = loadWrong(set.id);
    if(wl.length && !saved){
      const rb = document.createElement('button'); rb.type='button'; rb.className='set-new retry';
      rb.textContent = '오답 '+wl.length+'개 다시 풀기';
      rb.addEventListener('click', ()=> start(set, null, true));
      card.appendChild(rb);
    }
    return card;
}
const filterKey=PREFIX+'filters';
const unitKey=PREFIX+'selected_unit';
let selectedUnit=options.units?.find(u=>u.id===sessionStorage.getItem(unitKey))?.id||(options.units?.length===1?options.units[0].id:null);
const modeKey=PREFIX+'practice_mode';
let unitPracticeMode=new URLSearchParams(location.search).get('mode')||sessionStorage.getItem(modeKey)||'flow';
if(!['flow','trap'].includes(unitPracticeMode))unitPracticeMode='flow';
function goUnit(id){
  if(run&&$('#scr-q').classList.contains('on')){clearInterval(run.timerId);pauseQuestionClock();saveRun();}
  selectedUnit=options.units.some(u=>u.id===id)?id:(options.units.length===1?options.units[0].id:null);
  if(selectedUnit)sessionStorage.setItem(unitKey,selectedUnit);else sessionStorage.removeItem(unitKey);
  renderStart();show('#scr-start');
}
function renderUnitStart(){
  document.body.classList.add('units-page');document.body.classList.toggle('units-home',$('#scr-start').classList.contains('on'));
  const nav=$('.page-nav');nav.replaceChildren();nav.classList.add('unit-nav');nav.setAttribute('aria-label','단원 선택');
  const home=el('button','unit-nav-home','전체 단원');home.type='button';home.onclick=()=>goUnit(null);home.setAttribute('aria-pressed',String(!selectedUnit));if(options.units.length>1)nav.appendChild(home);
  options.units.forEach(u=>{const button=el('button','',u.id+'단원');button.type='button';button.dataset.unit=u.id;button.setAttribute('aria-pressed',String(selectedUnit===u.id));button.onclick=()=>goUnit(u.id);nav.appendChild(button);});
  $('#practice-links').hidden=true;$('#practice-filters').hidden=true;
  const box=$('#sets');box.replaceChildren();
  const chapter=options.units.find(u=>u.id===selectedUnit);
  if(!chapter){
    $('#page-title').textContent='단원별 학습';$('#page-intro').textContent='단원을 고르면 개념어부터 본문·기본·심화 문제까지 이어서 풀 수 있어요.';
    const grid=el('div','unit-grid');
    options.units.forEach(u=>{const card=el('button','unit-card');card.type='button';card.dataset.openUnit=u.id;
      card.append(el('strong','unit-number',u.id+'단원'),el('span','unit-name',u.title),el('span','unit-readings',u.readings.length?u.readings.join(' / '):'개념어 · 자료 수집과 정보 전달 글쓰기'),el('span','unit-count',u.questionCount+'문항'+(u.relatedCount?' · 연결 문제 '+u.relatedCount+'문항':'')));
      card.onclick=()=>goUnit(u.id);grid.appendChild(card);});box.appendChild(grid);return;
  }
  $('#page-title').textContent=chapter.id+'단원 · '+chapter.title;
  $('#page-intro').textContent=chapter.readings.length?chapter.readings.join(' / '):'정보 수집·선별부터 조직과 표현까지 함께 확인해요.';
  if(chapter.readingGroups){renderFinalStudy(chapter,box);return;}
  const notes=el('section','unit-concepts');notes.setAttribute('aria-label',chapter.id+'단원 개념어');notes.appendChild(el('h2','','개념어 먼저 보기'));
  chapter.concepts.forEach((concept,i)=>{const detail=el('details','unit-concept');if(i===0)detail.open=true;detail.append(el('summary','',concept.title),el('p','',concept.text));notes.appendChild(detail);});box.appendChild(notes);
  const own=SETS.filter(s=>s.unitId===chapter.id),related=SETS.filter(s=>s.unitId!==chapter.id&&s.chapterIds?.includes(chapter.id));
  for(const type of ['concept','reading','basic','advanced','challenge']){
    const sets=own.filter(s=>s.unitType===type);if(!sets.length)continue;
    const section=el('section','unit-section');section.dataset.unitSection=type;section.appendChild(el('h2','',global.HomeworkUnitSets.sectionLabels[type]));
    const groups=new Map();sets.forEach(s=>{const label=s.group.replace(/^\d-\d단원 · /,'');if(!groups.has(label))groups.set(label,[]);groups.get(label).push(s);});
    for(const [label,sets] of groups){const details=el('details','unit-set-group');
      details.appendChild(el('summary','',label+' · '+sets.reduce((n,s)=>n+s.parts.reduce((m,p)=>m+p.items.length,0),0)+'문항'));
      const tiles=el('div','tiles');sets.forEach(s=>tiles.appendChild(makeSetCard(s)));details.appendChild(tiles);section.appendChild(details);
    }box.appendChild(section);
  }
  if(related.length){const section=el('section','unit-section unit-related');section.append(el('h2','','다른 단원과 연결해서 풀기'),el('p','','이 단원을 함께 쓰는 문제예요. 어느 단원에서 열어도 풀이 기록은 하나로 이어집니다.'));const tiles=el('div','tiles');related.forEach(s=>tiles.appendChild(makeSetCard(s)));section.appendChild(tiles);box.appendChild(section);}
}
function renderFinalStudy(chapter,box){
  const modes=el('nav','study-modes');modes.setAttribute('aria-label','연습 방법');
  for(const [value,label] of [['flow','문단 흐름별'],['trap','선지 변형 유형별']]){const b=el('button','',label);b.type='button';b.dataset.studyMode=value;b.setAttribute('aria-pressed',String(unitPracticeMode===value));b.onclick=()=>{unitPracticeMode=value;sessionStorage.setItem(modeKey,value);renderStart();};modes.appendChild(b);}box.appendChild(modes);
  if(unitPracticeMode!=='flow'){
    const title='선지 변형 유형별 연습';box.append(el('h2','study-view-title',title),el('p','study-view-intro',chapter.id+'단원 문제를 같은 유형끼리 모아 풀어요. 기본 OX와 심화 5지선다를 고르세요.'));
    const relevant=SETS.filter(s=>s.unitId===chapter.id&&s.isTypePractice&&s.practiceMode===unitPracticeMode),categories=[...new Set(relevant.map(s=>s.practiceCategory))];
    for(const category of categories){const d=el('details','unit-type-group');d.dataset.typeCategory=category;const list=relevant.filter(s=>s.practiceCategory===category);d.appendChild(el('summary','',category+' · '+list.reduce((n,s)=>n+s.parts.reduce((m,p)=>m+p.items.length,0),0)+'문항'));const tiles=el('div','tiles');list.forEach(s=>tiles.appendChild(makeSetCard(s)));d.appendChild(tiles);box.appendChild(d);}return;
  }
  const concepts=el('details','study-concept-notes');concepts.appendChild(el('summary','','개념어와 읽기 기준 먼저 보기'));
  chapter.concepts.forEach(c=>{const d=el('details','unit-concept');d.append(el('summary','',c.title),el('p','',c.text));concepts.appendChild(d);});box.appendChild(concepts);
  const conceptSets=SETS.filter(s=>s.unitId===chapter.id&&!s.isTypePractice&&s.unitType==='concept'),practice=el('details','unit-type-group');practice.appendChild(el('summary','','개념어 연습 · 기본 OX / 심화 5지선다'));const conceptTiles=el('div','tiles');conceptSets.forEach(s=>conceptTiles.appendChild(makeSetCard(s)));practice.appendChild(conceptTiles);box.appendChild(practice);
  const own=SETS.filter(s=>s.unitId===chapter.id&&!s.isTypePractice);
  chapter.readingGroups.forEach((group,index)=>{
    const section=el('section','unit-flow-block');section.dataset.readingBlock=group.id;section.append(el('h2','',(index+1)+'. '+group.title),el('p','unit-flow-summary',group.summary));
    for(const chunk of group.chunks){const sets=own.filter(s=>s.readingBlock===group.id&&s.readingChunk===chunk.id&&!s.isQuickPractice);const d=el('details','unit-flow-chunk');d.dataset.readingChunk=chunk.id;const count=level=>sets.filter(s=>s.level===level).reduce((n,s)=>n+s.parts.reduce((m,p)=>m+p.items.length,0),0);d.appendChild(el('summary','',chunk.label+' · '+chunk.title+' · 기본 '+count('기본')+' / 심화 '+count('심화')));
      const quick=own.filter(s=>s.isQuickPractice&&s.readingChunk===chunk.id);if(quick.length){d.appendChild(el('p','quick-menu-note','먼저 짧게 비교해 보기 · 문단마다 10문제'));const qt=el('div','tiles quick-tiles');quick.forEach(s=>qt.appendChild(makeSetCard(s)));d.appendChild(qt);}
      const reading=el('details','flow-reading');reading.appendChild(el('summary','','본문 먼저 읽기 · '+chunk.label));for(const source of chunk.passages){const block=el('section','flow-reading-source');block.append(el('h4','',source.label),el('p','serif',source.text));reading.appendChild(block);}d.appendChild(reading);
      const tiles=el('div','tiles');sets.forEach(s=>tiles.appendChild(makeSetCard(s)));d.appendChild(tiles);section.appendChild(d);
    }
    const application=own.filter(s=>s.readingBlock===group.id&&s.readingChunk==='apply');if(application.length){const d=el('details','unit-flow-chunk');d.appendChild(el('summary','','웹 인터랙티브의 새 예시로 적용하기'));const tiles=el('div','tiles');application.forEach(s=>tiles.appendChild(makeSetCard(s)));d.appendChild(tiles);section.appendChild(d);}
    const examples=own.filter(s=>s.readingBlock===group.id&&s.readingChunk==='examples');if(examples.length){const d=el('details','unit-flow-chunk');d.dataset.examplePractice='true';d.appendChild(el('summary','','어려운 소재 · 쉬운 예시로 OX 풀기'));const tiles=el('div','tiles');examples.forEach(s=>tiles.appendChild(makeSetCard(s)));d.appendChild(tiles);section.appendChild(d);}
    box.appendChild(section);
  });
}
let practiceFilter={category:options.categories?.[0],level:'all'};
try{ const saved=JSON.parse(sessionStorage.getItem(filterKey)||'null');
  if(saved && options.categories?.includes(saved.category) && ['all','기본','심화'].includes(saved.level)) practiceFilter=saved;
}catch(_){}
function renderPracticeStart(){
  const filters=$('#practice-filters'); filters.hidden=false; filters.replaceChildren();
  const types=document.createElement('div');types.className='category-pills';types.setAttribute('aria-label','유형 선택');
  options.categories.forEach(category=>{
    const button=document.createElement('button');button.type='button';button.textContent=category;
    button.setAttribute('aria-pressed',String(practiceFilter.category===category));
    button.addEventListener('click',()=>{practiceFilter.category=category;sessionStorage.setItem(filterKey,JSON.stringify(practiceFilter));renderStart();});types.appendChild(button);
  });
  const levels=document.createElement('div');levels.className='level-tabs';levels.setAttribute('aria-label','난이도 선택');
  [['all','모두'],['기본','기본 OX'],['심화','심화 5지선다']].forEach(([value,label])=>{
    const button=document.createElement('button');button.type='button';button.textContent=label;button.setAttribute('aria-pressed',String(practiceFilter.level===value));
    button.addEventListener('click',()=>{practiceFilter.level=value;sessionStorage.setItem(filterKey,JSON.stringify(practiceFilter));renderStart();});levels.appendChild(button);
  });
  filters.append(types,levels);
  const box=$('#sets');box.replaceChildren();
  const selected=SETS.filter(set=>set.category===practiceFilter.category);
  const total=selected.reduce((sum,set)=>sum+set.parts.reduce((n,p)=>n+p.items.length,0),0);
  const heading=document.createElement('h2');heading.className='practice-heading';heading.textContent=practiceFilter.category+' · '+total+'문항';box.appendChild(heading);
  ['기본','심화'].forEach(level=>{
    if(practiceFilter.level!=='all' && practiceFilter.level!==level)return;
    const group=document.createElement('section');group.className='grp practice-group';
    const title=document.createElement('h3');title.textContent=level==='기본'?'기본 · OX':'심화 · 내신 5지선다';
    const tiles=document.createElement('div');tiles.className='tiles';
    selected.filter(set=>set.level===level).forEach(set=>tiles.appendChild(makeSetCard(set)));
    group.append(title,tiles);box.appendChild(group);
  });
}

/* ---- 풀이 상태 ---- */
let run = null;   // {set, attempt, session, list, idx, startedAt, logs, qStart, timerId}

function balanceAnswerPositions(items){
  const groups=new Map();
  items.forEach(q=>{
    if(q.fixedOptionOrder||!Array.isArray(q.options)||q.options.length<2)return;
    const answerIndex=q.options.indexOf(q.answer);
    if(answerIndex<0)return;
    const n=q.options.length;
    if(!groups.has(n))groups.set(n,[]);
    groups.get(n).push(q);
  });
  groups.forEach((questions,n)=>{
    const slots=[];
    while(slots.length<questions.length)slots.push(...Array.from({length:n},(_,i)=>i));
    const shuffledQuestions=shuffle(questions), shuffledSlots=shuffle(slots).slice(0,questions.length);
    shuffledQuestions.forEach((q,i)=>{
      const answer=q.answer, distractors=shuffle(q.options.filter(x=>x!==answer));
      const result=[];result[shuffledSlots[i]]=answer;
      let d=0;for(let j=0;j<n;j++)if(result[j]===undefined)result[j]=distractors[d++];
      q.options=result;
    });
  });
}

function start(set, saved, retry, questionRecords){
  if(options.guidedLearning&&!options.testMode&&isHardSet(set)&&!learningState().steps.find(u=>u.id===set.unitId)?.hard?.unlocked){renderStart();show('#scr-start');return;}
  const ticket=++selectionTicket;
  ++prefetchTicket;
  const latest=options.questionPatches&&questionRecords===undefined?options.questionPatches.refresh():null;
  if(set.dataFile&&!set._loaded){
    loadingStatus.textContent=set.group+' · '+set.name+' 불러오는 중…';loadingStatus.hidden=false;
    return Promise.all([loadSet(set),latest||questionRecords]).then(([,records])=>{
      if(ticket===selectionTicket){loadingStatus.hidden=true;return start(set,saved,retry,records);}
    }).catch(()=>{
      if(ticket===selectionTicket){loadingStatus.textContent='문제를 불러오지 못했어요. 같은 세트를 다시 눌러 주세요.';}
    });
  }
  if(latest){
    loadingStatus.textContent='최신 문항을 확인하는 중…';loadingStatus.hidden=false;
    return latest.then(records=>{
      if(ticket===selectionTicket)return start(set,saved,retry,records);
    });
  }
  loadingStatus.hidden=true;
  if(options.units){unitPracticeMode=set.practiceMode||'flow';sessionStorage.setItem(modeKey,unitPracticeMode);}
  if(options.units&&!set.chapterIds?.includes(selectedUnit)){selectedUnit=set.unitId;sessionStorage.setItem(unitKey,selectedUnit);renderStart();}
  clearAutoNext();
  if(!retry&&game.pending(gameKey(set))){openPending(gameKey(set));return;}
  restoreKnownFailures(set);
  if(retry && !saved)saved=loadRetry(set.id);
  if(run){clearInterval(run.timerId);pauseQuestionClock();}
  let list = [];
  set.parts.forEach((p,pi)=> p.items.forEach((original,qi)=>{
    const it=questionRecords?global.HomeworkQuestionPatches.apply(original,questionRecords[original.id]):original;
    list.push({...it, options:it.options?[...it.options]:it.options, part:p.name, pi, qno:qi+1, max: it.type==='vocabMatch'?it.words.length:(it.type==='both'?2:(it.type==='pair'?3:1))});
  }));
  if(retry){ const w=new Set(loadWrong(set.id).map(x=>x.pi+':'+x.qi)); list=list.filter(q=>w.has(q.pi+':'+(q.qno-1))); if(!list.length){ renderStart(); show('#scr-start'); return; } }
  if(saved?.order){
    const byId=new Map(list.map(q=>[q.id || q.pi+':'+q.qno,q]));
    if(saved.order.length===list.length && new Set(saved.order).size===list.length && saved.order.every(id=>byId.has(id))) list=saved.order.map(id=>byId.get(id));
  }else if(set.shuffleWithinParts){const parts=new Map();for(const q of list){if(!parts.has(q.pi))parts.set(q.pi,[]);parts.get(q.pi).push(q);}list=[...parts.values()].flatMap(questions=>shuffle(questions));}
  else if(set.shuffleQuestions){ list=shuffle(list); }
  balanceAnswerPositions(list);
  let attempt, session, idx=0, logs=[], startedAt=new Date();
  if(saved){
    attempt=saved.attempt; session=saved.session; idx=Math.min(saved.idx, list.length);
    logs=saved.logs||[]; startedAt=new Date(saved.startedAt);
  }else{
    attempt = getAttempts(set.id)+1;
    localStorage.setItem(attemptsKey(set.id), attempt);
    session = Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  }
  run = {set, attempt, session, list, idx, startedAt, logs, studiedRefs:new Set(saved?.studiedRefs||[]),readingStates:saved?.readingStates||{},qStart:null, timerId:null, retry:!!retry,
    resumeQuestion:saved?.activeQuestion||null, extraSeconds:saved?.activeQuestion?.extraSeconds||0,
    totalRemainingMs:null, totalStartedAt:null, totalTimedOut:false, questionStartedAt:null, questionRemainingMs:saved?.activeQuestion?.remainingMs??30000};
  show('#scr-q');
  if(run.idx >= run.list.length) finish(); else{renderQ();if(!saved)saveRun(run.idx);}
  prepareRelated(set);
}

function tokens(t){ return (t||'').replace(/[‘’“”'"()\[\]『』「」.,?!·…:;→=/]/g,' ').split(/\s+/).filter(w=>w.length>=2).map(w=>w.replace(/(은|는|이|가|을|를|의|에|에서|으로|로|과|와|도|만|이다|였다|이었다|했다|한다|다)$/,'')).filter(w=>w.length>=2); }
function focusIndex(q, sentences){
  const quoted = [...(q.why||'').matchAll(/[‘“]([^’”]+)[’”]/g)].map(m=>m[1]);
  const keywords = tokens((q.changed||'')+' '+(q.sent||'')+' '+(q.why||''));
  const scores=sentences.map(s=>quoted.reduce((n,t)=>n+(s.includes(t)?20+t.length:0),0)
    +keywords.reduce((n,w)=>n+(s.includes(w)?w.length:0),0));
  const best=Math.max(...scores);
  return best>0 ? scores.indexOf(best) : (sentences.length===1?0:-1);
}
function arrangeShortComparison(q,body){
  if(!q.shortComparison)return;document.body.classList.add('quick-comparison');
  const grid=el('div','quick-comparison-grid'),left=el('section','quick-source'),right=el('section','quick-information');right.appendChild(el('strong','quick-label',q.progressiveComparison?q.progressiveStep+'/5단계 · '+q.progressiveLabel:'비교할 정보'));if(q.synthesis)right.classList.add('synthesis-question');left.setAttribute('aria-label','핵심 문장 또는 지문');left.tabIndex=0;
  for(const node of [...body.children]){if(node.matches('.passage'))left.appendChild(node);else if(node.matches('.ask,.claim,.picks'))right.appendChild(node);}
  grid.append(left,right);body.appendChild(grid);
}
function renderQ(){
  paintHomeworkProgress();
  closeTimeDecision();clearAutoNext();resetAnswerDock();
  document.body.classList.remove('split-question','evidence-stage','evidence-reviewed','quick-comparison');
  paintGuidedStatus();
  clearTimeSignal();
  clearAutoNext();
  const q = run.list[run.idx];
  clearInterval(run.timerId); run.deadline=null;
  $('#q-timer').className='timer';
  const restored=run.resumeQuestion?.id===(q.id||q.pi+':'+q.qno)&&run.resumeQuestion.editorRevision===q.editorRevision?run.resumeQuestion:null;
  run.resumeQuestion=null;
  q._failureCount=validCount(loadFailures(run.set)[questionKey(q)]);
  const expectedLimit=baseSolveSeconds(q)+q._failureCount*10;
  const previousLimit=restored?(restored.solveLimitSeconds||30):expectedLimit;
  const addedSeconds=Math.max(0,expectedLimit-previousLimit);
  run.questionLimitSeconds=previousLimit+addedSeconds;
  run.extraSeconds=restored?.extraSeconds||0;run.questionRemainingMs=restored?.remainingMs!=null?restored.remainingMs+addedSeconds*1000:run.questionLimitSeconds*1000;
  q._timeDecision=restored?.timeDecision||null;q._solveElapsedMs=restored?.elapsedMs||0;q._unknown=false;q._choiceHelpUsed=!!restored?.choiceHelpUsed;q._eliminated=restored?.eliminated||[];q._dismissedHelp={};q._submitted=false;q._timedOut=false;q._evidencePhase=null;q._evidenceResult=null;q._answerSeconds=null;
  const previousWrong=run.retry?loadWrong(run.set.id).find(w=>w.pi===q.pi&&w.qi===q.qno-1):null;
  q._evidenceOnlyReview=previousWrong?.mistakeKind==='evidence'&&requiresEvidence(q);

  const prev = run.idx>0 ? run.list[run.idx-1] : null;
  const samePassage = prev && ((q.passage && q.passage===prev.passage) || (q.lines && prev.lines && JSON.stringify(q.lines)===JSON.stringify(prev.lines)));
  const evidenceMode = /^(기초|본문설명|유형 심화)/.test(run.set.name) && q.type==='ox';
  q._evi = null; q._eviFocus = -1;
  const total = run.list.length;
  $('#q-part').textContent = run.set.group+' · '+(q.readingLabel?q.readingLabel+' · '+run.set.level:run.set.name)+' — '+q.part;
  $('#q-cnt').textContent = (run.idx+1)+' / '+total;
  $('#q-prog').style.width = (run.idx/total*100)+'%';
  $('#q-fb').className='fb'; $('#q-fb').textContent='';
  $('#q-check').style.display='none'; $('#q-next').style.display='none';
  $('#q-check').disabled = true;

  const body = $('#q-body'); body.innerHTML='';
  if(q.sourceLabel){const source=document.createElement('p');source.className='source-label';source.textContent=q.sourceLabel;body.appendChild(source);}
  if(previousWrong?.mistakeKind){const prior=el('aside','review-origin');prior.append(el('strong','','지난 풀이의 오답 원인'),global.HomeworkResults.badges({kind:previousWrong.mistakeKind,corrected:previousWrong.correctedAfterExplanation,timedOut:previousWrong.timedOut}));body.appendChild(prior);}

  if(run.idx===0 || (prev && prev.part!==q.part)){
    const ph=document.createElement('div'); ph.className='phase';
    if(/^어휘/.test(q.part)) ph.innerHTML='<b>어휘</b>이 문단에 나오는 낱말의 뜻을 먼저 확인합니다.';
    else if(/^공부/.test(q.part)) ph.innerHTML='<b>공부</b>원문과 쉬운 풀이를 읽고 확인 문제를 풉니다. 끝나면 바로 시험으로 넘어갑니다.';
    
    else if(/^시험/.test(q.part)) ph.innerHTML='<b>시험</b>형광펜으로 표시한 중요한 내용을 읽고 답을 고르세요.';
    if(ph.innerHTML) body.appendChild(ph);
  }
  renderTools(q);
  if(q.type==='vocabMatch'){ renderVocab(q, body); return; }
  if(samePassage && q.referenceMode!=='optional'){ const sm=document.createElement('div'); sm.className='same'; sm.textContent='같은 지문입니다 — 다시 읽지 않아도 됩니다'; body.appendChild(sm); }
  if(q.lines){
    const bx=document.createElement('div'); bx.className='lines'+(run.set.revision===2?' unnumbered':''); bx.innerHTML='<b>'+(q.label||'지문')+' — 원문과 쉬운 풀이</b>';
    const NO='①②③④⑤';
    const fi = (q.focus>=0 && q.focus<q.lines.length) ? q.focus : focusIndex(q, q.lines.map(l=>l.s+' '+l.e)); q._eviFocus = fi;
    q.lines.forEach((ln,i)=>{ const d=document.createElement('div');
      d.className='ln'+(evidenceMode ? ' pick' : (fi<0||isMediumPlusSet(run.set)?'':(i===fi?' focus':' dim')));
      if(evidenceMode){ d.addEventListener('click', ()=>{ bx.querySelectorAll('.ln').forEach(x=>x.classList.remove('chosen')); d.classList.add('chosen'); q._evi=i; unlockPicks(); }); }
      const a=document.createElement('span'); a.className='no'; a.textContent=ln.no||NO[i]||(i+1);
      const o=document.createElement('span'); o.className='orig'; o.textContent=ln.s;
      const e=document.createElement('div'); e.className='easy'; e.textContent=ln.e;
      d.append(a,o,e); bx.appendChild(d); });
    body.appendChild(bx);
  }
  if(q.passage){
    const pg=el('div','passage serif');pg.appendChild(el('b','',q.synthesis?'문단 전체':q.shortComparison?'핵심 문장':'지문'));
    const groups=[];let group=null;
    String(q.passage).split(/\n+/).filter(line=>line.trim()).forEach(line=>{
      const head=line.match(/^\[([^\]]+)\]\s*/);
      if(head||!group){group={label:head?head[1]:'',paragraphs:[]};groups.push(group);}
      const text=head?line.slice(head[0].length):line;
      if(text.trim())group.paragraphs.push(text);
    });
    const autoFocus=evidenceMode||(!q.disableAutoFocus&&!isMediumPlusSet(run.set));
    const sentences=autoFocus?groups.flatMap(g=>g.paragraphs.flatMap(text=>text.split(/(?<=[.?!”’])[^\S\n]+(?=\S)/))):[];
    const fi=autoFocus?(q.focus>=0&&q.focus<sentences.length?q.focus:focusIndex(q,sentences)):-1;q._eviFocus=fi;let index=0;
    groups.forEach(g=>{
      const section=el('section','reading-source');if(g.label)section.appendChild(el('b','reading-label',g.label));
      g.paragraphs.forEach(text=>{
        const paragraph=el('p','reading-paragraph');
        if(!autoFocus){paragraph.textContent=text;section.appendChild(paragraph);return;}
        text.split(/(?<=[.?!”’])[^\S\n]+(?=\S)/).forEach((sentence,n,all)=>{
          const at=index++;
          if(evidenceMode){const span=el('span','sn',sentence);span.onclick=()=>{pg.querySelectorAll('.sn').forEach(x=>x.classList.remove('chosen'));span.classList.add('chosen');q._evi=at;unlockPicks();};paragraph.appendChild(span);}
          else paragraph.appendChild(at===fi&&!isMediumPlusSet(run.set)&&!q.disableAutoFocus?el('mark','',sentence):document.createTextNode(sentence));
          if(n<all.length-1)paragraph.appendChild(document.createTextNode(' '));
        });section.appendChild(paragraph);
      });pg.appendChild(section);
    });
    if(q.referenceMode==='optional'){const details=el('details','reference');details.append(el('summary','','지문 펼쳐보기'),pg);body.appendChild(details);}else body.appendChild(pg);
  }
  if(evidenceMode){ const ev=document.createElement('div'); ev.className='evi'; ev.textContent='O·X를 바로 고르세요. 필요하면 지문에서 답의 근거가 되는 문장을 눌러 표시할 수 있어요.'; body.appendChild(ev); }
  if(q.note){
    const nt=el('div','note structured-reading');nt.appendChild(el('b','',q.noteLabel||'설명'));
    String(q.note).split(/\n\s*\n/).filter(Boolean).forEach(block=>{
      const section=el('section','reading-source');block.split(/\n/).filter(line=>line.trim()).forEach(line=>{
        if(/^\[(?:자료|보기)/.test(line))section.appendChild(el('b','reading-label',line));
        else section.appendChild(el('p','reading-paragraph',line));
      });nt.appendChild(section);
    });body.appendChild(nt);
  }
  if(q.sent){ const sent = document.createElement('p'); sent.className='sent serif'; sent.textContent=q.sent; body.appendChild(sent); }

  q._submitted=false;
  q._picked=null; q._t=null; q._v=null; q._tA=null; q._vA=null; q._tB=null; q._vB=null;

  if(q.type==='pair'){
    const mk=(lbl,txt,key)=>{
      const b=document.createElement('div'); b.className='pairbox';
      b.innerHTML='<div class="lbl">'+lbl+'</div><div class="txt">'+txt+'</div>';
      b.appendChild(dragBlock(q, key, key==='A'?q.aTenor:q.bTenor, key==='A'?q.aVehicle:q.bVehicle)); return b;
    };
    const a=document.createElement('div'); a.className='ask';
    a.textContent='두 문장에서 원관념과 보조관념을 각각 찾으세요';
    body.appendChild(a);
    body.appendChild(mk('① '+q.aType, q.a, 'A'));
    body.appendChild(mk('② '+q.bType, q.b, 'B'));
    const a2=document.createElement('div'); a2.className='ask';
    a2.textContent='①과 ②의 원관념·보조관념이 서로 같은가? (같으면 O, 다르면 X)';
    body.appendChild(a2);
    body.appendChild(pickRow(['O','X'], v=>{ q._picked=v; checkReady(q); }, true));
    $('#q-check').style.display='';
  }else if(q.type==='mc'){
    if(q.hint){ const h=document.createElement('div'); h.className='hint'; h.hidden=true; h.innerHTML='<b>힌트</b>'; h.appendChild(document.createTextNode(q.hint)); body.appendChild(h); }
    const row = pickRow(q.options, v=>{ q._picked=v; submit(); });
    row.classList.add('col'); if(practice)row.classList.add('numbered'); body.appendChild(row);
  }else if(q.type==='choice' || q.type==='ox'){
    if(q.type==='ox'){
      const a=document.createElement('div'); a.className='ask'; a.textContent=q.ask||'이렇게 바꾸어도 원관념과 보조관념이 그대로인가?'; body.appendChild(a);
      const c=document.createElement('div'); c.className='claim serif'; c.textContent=q.changed; body.appendChild(c);
      if(q.hint){ const h=document.createElement('div'); h.className='hint'; h.hidden=true; h.innerHTML='<b>힌트</b>'; h.appendChild(document.createTextNode(q.hint)); body.appendChild(h); }
    }
    const pr = pickRow(q.type==='ox'?['O','X']:['직유','은유'], v=>{ q._picked=v; submit(); });
    // O·X answers are always available; selecting evidence is optional.
    body.appendChild(pr);
  }else{
    if(q.type==='both'){
      const a=document.createElement('div'); a.className='ask'; a.textContent='비유의 종류'; body.appendChild(a);
      body.appendChild(pickRow(['직유','은유'], v=>{ q._picked=v; checkReady(q); }, true));
      const a2=document.createElement('div'); a2.className='ask'; a2.textContent='원관념과 보조관념'; body.appendChild(a2);
    }else{
      const a=document.createElement('div'); a.className='ask'; a.textContent='조각을 누른 뒤, 들어갈 칸을 누르세요'; body.appendChild(a);
    }
    body.appendChild(dragBlock(q));
    $('#q-check').style.display='';
  }

  arrangeQuestionReading(q,body);
  arrangeShortComparison(q,body);
  placeReadingControl();placeAnswerSupport(q);
  if(q.highlightEvidence)markReadingEvidence(q);
  applyChoiceHelp(q);
  if(restored?.hintUsed){q._restoringHint=true;$('#use-hint').disabled=false;$('#use-hint').click();q._restoringHint=false;}
  // An evidence stage means the problem answer was already correct, even if its wording was edited.
  if(restored?.evidence){
    q._picked=q.answer;
    if(requiresEvidence(q))beginEvidence(q,restored.evidence.answerSeconds,restored.evidence);
    else{
      const previous=restored.evidence,failed=!!previous.failed||!!previous.rejected?.length;
      q._answerSeconds=previous.answerSeconds||0;
      q._evidenceResult={retired:true,ok:!failed,hadMistake:failed,selected:null,selectedCorrect:false,rejected:previous.rejected||[],rejectedGroups:previous.rejectedGroups||[],failureCounted:previous.failureCounted===true,sec:0};
      submit('evidenceDone');
    }
  }
  else if(q._evidenceOnlyReview){q._picked=q.answer;beginEvidence(q,0);}
  else startQuestionTimer(q);
}

// Keep the source beside the five choices, including the evidence selection stage.
function arrangeQuestionReading(q,body){
  if(!['mc','ox'].includes(q.type)||q.shortComparison)return;
  const children=Array.from(body.children);
  const readings=children.filter(node=>node.matches('.passage, .lines, .note, .reference'));
  if(!readings.length)return;
  const context=el('div','question-context');
  const reading=el('section','question-reading');reading.setAttribute('aria-label','지문과 자료');reading.tabIndex=0;
  const question=el('section','question-answer');question.setAttribute('aria-label','문제와 선지');
  children.forEach(node=>{
    if(readings.includes(node))reading.appendChild(node);
    else if(node.matches('.source-label, .review-origin, .phase, .same'))context.appendChild(node);
    else question.appendChild(node);
  });
  body.append(context,reading,question);
  document.body.classList.add('split-question');
}

// Solving starts at 30/50 seconds, with 10 more per previous wrong answer. Reading vocabulary
// cards happens before the answer phase and starts the clock only after the begin button.
$('#time-limit-state').textContent='항상 적용';
function isMediumPlusSet(set){return set.timedMode==='overall'||/^(중|상|유형 심화)/.test(set.name||'');}
function pauseQuestionClock(){
  clearTimeSignal();
  if(run&&run.deadline!=null){run.questionRemainingMs=Math.max(0,run.deadline-Date.now());run.questionStartedAt=null;}
}
function startQuestionTimer(q){
  clearInterval(run.timerId);if(q._timeDecision){run.qStart=null;run.deadline=null;$('#q-timer').textContent='0';timeHelp(q);return;}run.qStart=Date.now();
  if(untimed){run.deadline=null;run.questionRemainingMs=null;$('#q-timer').hidden=true;$('#q-timer').textContent='';clearTimeSignal();return;}
  const timer=$('#q-timer');timer.hidden=false;timer.style.visibility='visible';timer.removeAttribute('aria-hidden');timer.className='timer';
  run.deadline=Date.now()+Math.max(0,run.questionRemainingMs??run.questionLimitSeconds*1000);
  let previousLeft=-1;
  const tick=()=>{
    if(run.list[run.idx]!==q||q._submitted)return;
    const left=Math.max(0,Math.ceil((run.deadline-Date.now())/1000));
    if(left!==previousLeft){previousLeft=left;timer.textContent=String(left);timer.setAttribute('aria-label','남은 시간 '+left+'초');}
    const stage=left===0?'':left<=3?'deep-red':left<=5?'red':left<=10?'yellow':'';
    if(stage)document.body.dataset.timeStage=stage;else clearTimeSignal();
    if(left===0)timeHelp(q);
  };
  run.timerId=setInterval(tick,100);tick();
}

// Select one of three or four contiguous evidence groups; authored sentence IDs remain the grading source.
function requiresEvidence(q){return (q.requiresEvidence||['development','traps'].includes(options.page))&&q.evidence?.valid?.length>0;}
function evidenceGroupButtons(){return Array.from(document.querySelectorAll('#q-body button.evidence-group'));}
function drawEvidenceGroup(q,button,group,highlight=false){
  button.replaceChildren();button.dataset.evidenceGroupId=group.id;button.dataset.evidenceMembers=group.members.map(s=>s.id).join(' ');
  button.appendChild(el('span','evidence-group-number',['①','②','③','④'][group.index]||String(group.index+1)));
  const content=el('span','evidence-group-content');let part=null,last='';
  for(const sentence of group.members){
    const key=sentence.sourceId+':'+sentence.paragraph;
    if(key!==last){part=el('span','evidence-group-part');part.appendChild(el('span','evidence-group-source',sentence.sourceLabel));content.appendChild(part);last=key;}
    const text=el('span','evidence-group-text');text.dataset.sentenceId=sentence.id;
    if(highlight&&q.evidence.valid.some(id=>sentence.id===id||sentence.memberIds?.includes(id)))text.appendChild(el('mark','evidence-highlight',sentence.text));else text.textContent=sentence.text;
    part.append(text,document.createTextNode(' '));
  }
  button.appendChild(content);
  button.classList.toggle('evidence-correct',highlight&&!!global.HomeworkEvidenceGroups.supportingId(group,q.evidence.valid));
}
function beginEvidence(q,answerSeconds,saved){
  clearInterval(run.timerId);clearAutoNext();clearTimeSignal();
  document.body.classList.add('evidence-stage');
  q._submitted=true;q._answerSeconds=answerSeconds;
  const allSentences=q.evidence.sources.flatMap(source=>source.sentences),helper=global.HomeworkEvidenceGroups;
  q._evidenceGroups=helper.build(q.evidence.sources);
  const rejected=[...new Set((saved?.rejected||[]).map(id=>allSentences.find(s=>s.id===id||s.memberIds?.includes(id))?.id).filter(id=>id&&!q.evidence.valid.includes(id)))];
  const rejectedGroups=helper.rejectedGroups(q._evidenceGroups,saved,q.evidence.valid);
  q._evidencePhase={remainingMs:saved?.remainingMs??30000,bonusMs:saved?.bonusMs||0,picked:q._picked,answerSeconds,rejected,rejectedGroups,paused:saved?.paused===true,failed:!!saved?.failed||!!saved?.rejected?.length||!!saved?.rejectedGroups?.length,failureCounted:saved?.failureCounted===true};
  if(q._evidencePhase.failed&&!q._evidencePhase.failureCounted){countFailure(q);q._evidencePhase.failureCounted=true;}
  $('#q-next').style.display='none';$('#q-check').style.display='none';
  if($('#answer-support'))$('#answer-support').hidden=true;tools.querySelectorAll('button').forEach(b=>b.disabled=true);if($('#use-reading-size'))$('#use-reading-size').disabled=false;hintBox.hidden=true;
  const body=$('#q-body'),reading=body.querySelector('.passage');
  if(q._evidenceOnlyReview)body.querySelectorAll('.picks, .ask, .claim').forEach(n=>n.remove());
  else body.querySelectorAll('.picks, .ask, .claim, .sent').forEach(n=>n.hidden=true);
  body.querySelectorAll('.hint').forEach(n=>n.hidden=true);
  body.querySelectorAll('button').forEach(b=>b.disabled=true);
  const task=el('section','evidence-task');task.id='evidence-task';
  task.append(el('strong','',q._evidenceOnlyReview?'근거 묶음만 다시 골라요':'✓ 답을 맞혔어요! 이제 근거 묶음 고르기'),el('p','',q._evidenceOnlyReview?'문제 답은 지난 정답을 유지해요. 아래 묶음 중 근거가 들어 있는 것을 하나 고르세요.':'이어지는 문장들을 묶었어요. 정답의 근거가 들어 있는 묶음을 하나 고르세요. 여러 묶음에 근거가 있으면 어느 하나만 골라도 통과해요.'));
  const claim=q.type==='ox'?q.changed:q.answer;task.appendChild(el('p',q._evidenceOnlyReview?'evidence-claim evidence-preserved-answer':'evidence-claim',(q._evidenceOnlyReview?'이전에 맞힌 문제 답: ':'판단한 내용: ')+claim));
  if(q.type==='ox'&&q.answer==='X')task.appendChild(el('small','','X로 판단한 이유를 보여 주는 근거가 있는 묶음을 고르세요.'));
  const status=el('p','evidence-status',untimed?'시간 제한 없이 근거가 들어 있는 묶음 하나를 고르세요.':'새로 30초! 근거가 들어 있는 묶음 하나를 고르면 통과해요.');status.id='evidence-status';status.setAttribute('role','status');task.appendChild(status);
  const answerPane=body.querySelector('.question-answer');if(answerPane)answerPane.prepend(task);else reading.before(task);
  reading.replaceChildren(el('b','','근거 묶음 '+q._evidenceGroups.length+'개 · 하나를 골라 주세요'));reading.classList.add('evidence-reading');
  const readingPane=body.querySelector('.question-reading');if(readingPane)readingPane.scrollTop=0;
  const choices=el('div','evidence-groups');reading.appendChild(choices);
  for(const group of q._evidenceGroups){
    const button=el('button','evidence-sentence evidence-group');button.type='button';drawEvidenceGroup(q,button,group);
    const wasRejected=rejectedGroups.some(g=>g.id===group.id);button.classList.toggle('evidence-rejected',wasRejected);button.disabled=q._evidencePhase.paused||wasRejected;
    button.onclick=()=>{
      if(!q._evidencePhase||q._evidencePhase.paused||run.list[run.idx]!==q)return;
      if(q._timeDecision)return;if(run.deadline!=null&&Date.now()>=run.deadline){timeHelp(q,true);return;}
      const selected=helper.supportingId(group,q.evidence.valid);
      if(selected){completeEvidence(q,selected,helper.snapshot(group));return;}
      const rejectedId=group.members[0].id;q._evidencePhase.rejected.push(rejectedId);q._evidencePhase.rejectedGroups.push(helper.snapshot(group));q._evidencePhase.failed=true;
      if(!q._evidencePhase.failureCounted){countFailure(q);q._evidencePhase.failureCounted=true;}
      button.classList.add('evidence-rejected');button.disabled=true;tone(false);pauseEvidence(q);showEvidenceExplanation(q,rejectedId);saveRun(run.idx);
    };
    choices.appendChild(button);
  }
  placeReadingControl();
  const fb=$('#q-fb');fb.className='fb';fb.textContent='';
  if(saved)status.textContent=untimed?'테스트 중 · 시간 제한 없이 근거 묶음을 이어 고르세요.':'남은 시간부터 이어 풀어요. 근거가 있는 묶음 하나를 고르세요.';
  if(q._evidencePhase.paused){status.textContent='근거 오답으로 기록했어요. 시간은 멈췄으니 해설을 읽고 다시 고르세요. 다시 맞혀도 이번 문항의 오답 기록은 유지돼요.';showEvidenceExplanation(q,rejected.at(-1));}
  startEvidenceTimer(q);if(q._evidencePhase)saveRun(run.idx);
  if(!saved){tone(true);task.classList.add('evidence-enter');}
  task.tabIndex=-1;task.focus({preventScroll:true});(q._evidencePhase?.paused?$('#evidence-explanation'):task).scrollIntoView({block:'start',behavior:'instant'});
}
function startEvidenceTimer(q){
  document.getElementById('time-help')?.remove();clearInterval(run.timerId);clearTimeSignal();
  const phase=q._evidencePhase;if(!phase)return;if(q._timeDecision){run.deadline=null;$('#q-timer').textContent='0';timeHelp(q,true);return;}const extend=$('#use-time');if(extend)extend.disabled=untimed||phase.paused||game.state().time<1;
  if(untimed){phase.startedAt=phase.startedAt||Date.now();run.deadline=null;$('#q-timer').hidden=true;$('#q-timer').textContent='';return;}
  run.deadline=phase.paused?null:Date.now()+phase.remainingMs;
  const currentRun=run,timer=$('#q-timer');timer.hidden=false;timer.style.visibility='visible';timer.className='timer evidence-timer';
  timer.classList.toggle('evidence-clock-paused',phase.paused);
  let previous=-1;
  const tick=()=>{
    if(run!==currentRun||run.list[run.idx]!==q||!q._evidencePhase)return;
    const left=Math.max(0,Math.ceil((phase.paused?phase.remainingMs:run.deadline-Date.now())/1000));
    if(left!==previous){previous=left;timer.textContent=String(left);timer.setAttribute('aria-label',(phase.paused?'근거 해설 읽기 · 시간 멈춤 · ':'근거 찾기 ')+ '남은 시간 '+left+'초');}
    if(phase.paused){clearTimeSignal();return;}
    const stage=left===0?'':left<=3?'deep-red':left<=5?'red':left<=10?'yellow':'';
    if(stage)document.body.dataset.timeStage=stage;else clearTimeSignal();
    if(left===0)timeHelp(q,true);
  };
  if(!phase.paused)run.timerId=setInterval(tick,100);tick();
}
function pauseEvidence(q){
  const phase=q._evidencePhase;if(!phase||phase.paused)return;
  phase.remainingMs=untimed?null:Math.max(0,run.deadline-Date.now());phase.paused=true;
  run.questionRemainingMs=phase.remainingMs;
  startEvidenceTimer(q);
  document.querySelectorAll('#q-body .evidence-sentence').forEach(button=>button.disabled=true);
  $('#evidence-status').textContent='근거 오답으로 기록했어요. 시간은 멈췄으니 해설을 읽고 다시 고르세요. 다시 맞혀도 이번 문항의 오답 기록은 유지돼요.';
}
function resumeEvidence(q){
  const phase=q._evidencePhase;if(!phase||!phase.paused||run.list[run.idx]!==q)return;
  phase.paused=false;
  $('#evidence-explanation')?.remove();document.body.classList.remove('passage-review');
  const readingPane=$('#q-body .question-reading, #q-body .quick-source');if(readingPane)readingPane.scrollTop=0;
  evidenceGroupButtons().forEach(button=>{
    const group=q._evidenceGroups.find(g=>g.id===button.dataset.evidenceGroupId);drawEvidenceGroup(q,button,group);
    button.classList.remove('evidence-chosen');button.removeAttribute('aria-label');button.disabled=phase.rejectedGroups.some(g=>g.id===group.id);
  });
  $('#evidence-status').textContent=untimed?'정답 표시를 숨겼어요. 근거가 들어 있는 묶음을 다시 고르세요.':'남은 시간부터 다시 시작했어요. 근거가 들어 있는 묶음을 하나 고르세요.';
  startEvidenceTimer(q);saveRun(run.idx);
  const task=$('#evidence-task');task.focus({preventScroll:true});task.scrollIntoView({block:'start',behavior:'instant'});
}
function completeEvidence(q,selected,selectedGroup){
  if(!q._evidencePhase||q._evidencePhase.paused)return;document.getElementById('time-help')?.remove();
  const phase=q._evidencePhase;
  q._evidenceResult={ok:!!selected&&!phase.failed,selectedCorrect:!!selected,hadMistake:phase.failed,failureCounted:phase.failureCounted,selected:selected||null,selectedGroup:selectedGroup||null,rejectedGroups:[...(phase.rejectedGroups||[])],sec:untimed?Math.max(0,(Date.now()-(phase.startedAt||Date.now()))/1000):Math.max(0,Math.round((30000+(phase.bonusMs||0)-Math.max(0,run.deadline-Date.now()))/10)/100),rejected:[...phase.rejected]};
  q._evidencePhase=null;document.body.classList.add('evidence-reviewed');clearInterval(run.timerId);clearTimeSignal();run.deadline=null;$('#q-timer').classList.remove('evidence-timer');
  q._submitted=false;submit('evidenceDone');
}
function paintEvidenceResult(q){
  const result=q._evidenceResult,task=$('#evidence-task');
  if(task)task.remove();
  const readingTitle=$('#q-body .evidence-reading>.reading-heading>b, #q-body .evidence-reading>b');if(readingTitle)readingTitle.textContent='정답의 근거';
  evidenceGroupButtons().forEach(button=>{
    button.disabled=true;const group=q._evidenceGroups.find(g=>g.id===button.dataset.evidenceGroupId);
    if(result.selectedGroup?.id===group.id||!result.selectedGroup&&result.selected&&global.HomeworkEvidenceGroups.contains(group,result.selected)){button.classList.add('evidence-chosen');button.setAttribute('aria-label','내가 고른 근거 묶음 '+(group.index+1));}
  });
  showEvidenceExplanation(q,result.rejected.at(-1),result.selected);
}
function markReadingEvidence(q){
  if(!q.evidence?.valid?.length)return;
  const reading=$('#q-body .passage, #q-body .note');if(!reading)return;
  reading.querySelectorAll('.hint-highlight').forEach(node=>node.replaceWith(document.createTextNode(node.textContent)));
  const valid=q.focusQuotes||q.evidence.sources.flatMap(source=>source.sentences).filter(s=>q.evidence.valid.includes(s.id));
  // Match complete, authored source sentences, never keywords or the entire paragraph.
  reading.querySelectorAll('.reading-paragraph').forEach(paragraph=>{
    const text=paragraph.textContent,matches=[];
    valid.forEach(sentence=>{let at=text.indexOf(sentence.text);while(at>=0){matches.push({at,end:at+sentence.text.length,id:sentence.id});at=text.indexOf(sentence.text,at+sentence.text.length);}});
    if(!matches.length)return;
    paragraph.replaceChildren();let offset=0;
    matches.sort((a,b)=>a.at-b.at).forEach(match=>{
      if(match.at<offset)return;
      paragraph.appendChild(document.createTextNode(text.slice(offset,match.at)));
      const mark=el('mark','evidence-highlight',text.slice(match.at,match.end));mark.dataset.evidenceId=match.id;paragraph.appendChild(mark);offset=match.end;
    });
    paragraph.appendChild(document.createTextNode(text.slice(offset)));
  });
  return reading;
}
function paintAnswerEvidence(q){
  const reading=markReadingEvidence(q);if(!reading)return;
  reading.classList.add('answer-evidence-reading');
  showEvidenceExplanation(q);
  const pane=$('#q-body .question-reading, #q-body .quick-source');if(pane)pane.scrollTop=0;
}
function conciseExplanation(text){
  return String(text||'').split(/\s*근거\s*[:：]/)[0].replace(/\s*\d+(?:[~∼–-]\d+)?문단 안의 문장만을 근거로 판단합니다\.?/g,'').replace(/\s*다른 문단의 내용은 필요하지 않습니다\.?/g,'').trim();
}
function showEvidenceExplanation(q,rejectedId,selectedId){
  const all=q.evidence.sources.flatMap(source=>source.sentences);
  const rejected=all.find(s=>s.id===rejectedId),correct=all.find(s=>s.id===(selectedId||q.evidence.valid[0]));
  if(!correct)return;
  evidenceGroupButtons().forEach(button=>{const group=q._evidenceGroups.find(g=>g.id===button.dataset.evidenceGroupId);drawEvidenceGroup(q,button,group,true);if(global.HomeworkEvidenceGroups.supportingId(group,q.evidence.valid))button.setAttribute('aria-label','정답 근거가 포함된 묶음 '+(group.index+1));});
  const groupHistory=q._evidencePhase?.rejectedGroups||q._evidenceResult?.rejectedGroups||[];
  const rejectedGroup=[...groupHistory].reverse().find(g=>g.members?.includes(rejectedId));
  const rejectedText=rejectedGroup?rejectedGroup.members.map(id=>all.find(s=>s.id===id)?.text||id).join(' '):rejected?.text;
  $('#evidence-explanation')?.remove();
  const reading=$('#q-body .passage, #q-body .note');
  const panel=el('section','evidence-explanation'+(reading?' passage-explanation':''));panel.id='evidence-explanation';panel.setAttribute('aria-label','지문 안의 근거와 해설');panel.setAttribute('aria-live','polite');
  if(reading){
    document.body.classList.add('passage-review');
    if(!q._evidencePhase){const fb=$('#q-fb');fb.classList.add('compact-feedback');panel.classList.add(fb.classList.contains('ok')?'ok':'no');const verdict=fb.querySelector('.feedback-verdict');if(verdict)panel.appendChild(verdict);}
  }
  if(rejectedText){
    const wrong=el('div','evidence-reject-explanation');
    wrong.append(el('strong','',rejectedGroup?'왜 고른 묶음은 근거가 아닐까?':'왜 고른 문장은 근거가 아닐까?'));
    const topics=[...new Set((rejectedGroup?.members||[rejectedId]).map(id=>all.find(s=>s.id===id)?.topic).filter(Boolean))];
    wrong.appendChild(el('p','evidence-selected-topic','고른 부분의 내용: '+(topics.length?topics.join(' '):rejectedText)));
    wrong.appendChild(el('p','','이 문제의 ‘'+q.evidence.title+'’는 지문에서 형광펜으로 표시한 문장을 근거로 판단해야 해요.'));
    panel.appendChild(wrong);
  }
  const right=el('div','evidence-correct-explanation');right.appendChild(el('strong','',reading?'형광펜 문장이 근거예요':'근거와 해설'));
  // The source is already highlighted above; quote it only when there is no passage to annotate.
  if(!reading){const quote=el('blockquote','evidence-correct-quote');quote.textContent=correct.text;right.appendChild(quote);}
  right.appendChild(el('p','evidence-reason',conciseExplanation(q.evidence.explanation)));
  if(q.evidence.valid.length>1&&q._evidencePhase)right.appendChild(el('small','','형광펜 근거가 들어 있는 묶음 중 하나만 골라도 통과해요.'));
  if(q._evidencePhase?.paused){const back=el('button','act ghost evidence-return','해설 다 봤어요 · 다시 고르기');back.type='button';back.id='evidence-resume';back.onclick=()=>resumeEvidence(q);right.appendChild(back);}
  panel.appendChild(right);
  if(reading){
    const mark=Array.from(reading.querySelectorAll('mark[data-evidence-id],mark.evidence-highlight')).find(node=>node.dataset.evidenceId===correct.id)||reading.querySelector('mark.evidence-highlight');
    const paragraph=mark?.closest('.reading-paragraph, .evidence-group');
    if(paragraph)paragraph.after(panel);else reading.appendChild(panel);
  }else $('#q-fb').appendChild(panel);
  if(rejected&&q._evidencePhase)panel.scrollIntoView({block:'nearest',behavior:'instant'});
}
function scrollToAnswerExplanation(){
  const panel=$('#evidence-explanation');
  if(!panel){$('#q-fb').scrollIntoView({block:'nearest',behavior:'instant'});return;}
  const reading=panel.closest('.passage,.note'),anchor=reading?.querySelector('mark[data-evidence-id],mark.evidence-highlight');
  const first=anchor?.getBoundingClientRect(),last=panel.getBoundingClientRect();
  // Show the source and its annotation together when they fit; otherwise prioritize the explanation.
  if(first&&last.bottom-first.top<window.innerHeight-48)anchor.scrollIntoView({block:'start',behavior:'instant'});
  else panel.scrollIntoView({block:'nearest',behavior:'instant'});
}

function renderVocab(q, body){
  clearInterval(run.timerId);
  $('#q-timer').style.visibility='hidden';
  const intro=document.createElement('div'); intro.className='vocab-intro';
  const title=document.createElement('h2'); title.textContent='낱말 '+q.words.length+'개, 한 번에 익히기'; intro.appendChild(title);
  q.words.forEach(w=>{
    const card=document.createElement('div'); card.className='vocab-card';
    const word=document.createElement('strong'); word.textContent=w.word;
    const meaning=document.createElement('span'); meaning.textContent=w.meaning;
    card.append(word,meaning); intro.appendChild(card);
  });
  const begin=document.createElement('button'); begin.type='button'; begin.className='act primary'; begin.textContent='다 읽었어요 · 한 번에 맞추기';
  intro.appendChild(begin); body.appendChild(intro);
  begin.addEventListener('click',()=>{
    intro.remove();
    const title=document.createElement('p'); title.className='sent'; title.textContent=q.sent;
    const guide=document.createElement('p'); guide.textContent='낱말을 누르고 알맞은 뜻 칸을 누르세요. 다시 누르면 옮길 수 있어요.';
    const progress=document.createElement('p'); progress.className='vocab-progress'; progress.setAttribute('aria-live','polite');
    const board=document.createElement('div'); board.className='vocab-board';
    const pool=document.createElement('div'); pool.className='pool'; pool.setAttribute('aria-label','낱말 모음');
    const zones=document.createElement('div'); zones.className='zones vocab-zones';
    let selected=null; q._matches=Array(q.words.length).fill(null); q._submitted=false;
    const chips=q.words.map((w,i)=>{
      const chip=document.createElement('button'); chip.type='button'; chip.className='chip'; chip.textContent=w.word;
      chip.dataset.word=i; chip.setAttribute('aria-pressed','false');
      chip.addEventListener('click',e=>{
        e.stopPropagation(); if(q._submitted)return;
        const next=selected===chip?null:chip;
        chips.forEach(c=>{c.classList.remove('sel');c.setAttribute('aria-pressed','false');});
        selected=next; if(selected){selected.classList.add('sel');selected.setAttribute('aria-pressed','true');}
      }); return chip;
    });
    function refresh(){
      q._matches=q.words.map((w,i)=>{
        const chip=zones.querySelector('[data-slot="'+i+'"] .chip'); return chip?Number(chip.dataset.word):null;
      });
      const count=q._matches.filter(i=>i!==null).length;
      progress.textContent=count+' / '+q.words.length+'개 연결'; $('#q-check').disabled=count!==q.words.length;
    }
    function place(target){
      if(!selected||q._submitted)return;
      const old=target.querySelector('.chip'); if(target!==pool&&old)pool.appendChild(old);
      target.appendChild(selected);selected.classList.remove('sel');selected.setAttribute('aria-pressed','false');selected=null;refresh();
    }
    shuffle(chips).forEach(c=>pool.appendChild(c));
    pool.addEventListener('click',()=>place(pool));
    shuffle(q.words.map((w,i)=>({w,i}))).forEach(({w,i})=>{
      const zone=document.createElement('div');zone.className='zone';zone.dataset.slot=i;
      const label=document.createElement('button');label.type='button';label.className='vocab-target';label.textContent=w.meaning;label.setAttribute('aria-label',w.meaning+' — 이 뜻에 넣기');
      zone.appendChild(label);zone.addEventListener('click',()=>place(zone));zones.appendChild(zone);
    });
    board.append(pool,zones);body.append(title,guide,progress,board);refresh();
    $('#q-check').style.display='';startQuestionTimer(q);
  });
}

function unlockPicks(){ const pr=document.querySelector('#q-body .picks'); if(pr) pr.classList.remove('locked'); }
function pickRow(values, onPick, keepEnabled){
  const d=document.createElement('div'); d.className='picks';
  values.forEach(v=>{
    const b=document.createElement('button'); b.type='button'; b.className='pick'; b.textContent=v; b.setAttribute('aria-pressed','false');
    b.addEventListener('click', ()=>{
      d.querySelectorAll('.pick').forEach(o=>o.setAttribute('aria-pressed','false'));
      b.setAttribute('aria-pressed','true');
      if(!keepEnabled) d.querySelectorAll('.pick').forEach(o=>o.disabled=true);
      onPick(v);
    });
    d.appendChild(b);
  });
  return d;
}

let selChip=null;
function dragBlock(q, key, tenor, vehicle){
  key = key || '';
  if(tenor===undefined){ tenor=q.tenor; vehicle=q.vehicle; }
  const wrap=document.createElement('div');
  const pool=document.createElement('div'); pool.className='pool';
  const zones=document.createElement('div'); zones.className='zones';
  const mk=(role,label)=>{ const z=document.createElement('div'); z.className='zone'; z.dataset.role=role; z.innerHTML='<b>'+label+'</b>'; return z; };
  const zt=mk('tenor','원관념'), zv=mk('vehicle','보조관념');
  zones.append(zt,zv);
  shuffle([[tenor,'tenor'],[vehicle,'vehicle']]).forEach(p=>{
    const c=document.createElement('span'); c.className='chip serif'; c.textContent=p[0]; c.dataset.role=p[1]; c.tabIndex=0;
    c.addEventListener('click', e=>{ e.stopPropagation(); if(selChip) selChip.classList.remove('sel'); selChip=(selChip===c)?null:c; if(selChip) selChip.classList.add('sel'); });
    pool.appendChild(c);
  });
  [zt,zv,pool].forEach(z=> z.addEventListener('click', ()=>{
    if(!selChip) return;
    if(z.classList.contains('zone')){ const old=z.querySelector('.chip'); if(old) pool.appendChild(old); }
    z.appendChild(selChip); selChip.classList.remove('sel'); selChip=null;
    q['_t'+key] = zt.querySelector('.chip'); q['_v'+key] = zv.querySelector('.chip');
    checkReady(q);
  }));
  wrap.append(pool,zones);
  return wrap;
}
function checkReady(q){
  const dragDone = q.type==='pair' ? (!!q._tA && !!q._vA && !!q._tB && !!q._vB) : (!!q._t && !!q._v);
  const pickDone = (q.type==='both'||q.type==='pair') ? !!q._picked : true;
  $('#q-check').disabled = !(dragDone && pickDone);
}

/* ---- 채점 + 기록 ---- */
function submit(forceTimeout){
  const q = run.list[run.idx];
  if(q._submitted||q._timeDecision)return;document.getElementById('time-help')?.remove();
  if(forceTimeout!=='questionTimeout'&&forceTimeout!==true&&run.deadline!=null&&Date.now()>=run.deadline){q._unknown=false;timeHelp(q);return;}
  const timedOut=forceTimeout===true||forceTimeout==='questionTimeout'||run.deadline!=null&&Date.now()>=run.deadline;
  pauseQuestionClock();
  if(!timedOut && q.type==='vocabMatch' && (!q._matches || q._matches.some(i=>i===null)))return;
  q._timedOut=timedOut;
  q._submitted=true;
  clearInterval(run.timerId);
  const sec=(q._answerSeconds??Math.round(((q._solveElapsedMs||0)+(run.qStart?Math.max(0,Date.now()-run.qStart):0))/10)/100)+(q._evidenceResult?.sec||0);
  const now = new Date();

  let score=0, answerText='', msg='';
  const dragOK = () => q._t && q._v && q._t.dataset.role==='tenor' && q._v.dataset.role==='vehicle';
  const dragTxt = () => '원관념 '+(q._t?q._t.textContent:'—')+' / 보조관념 '+(q._v?q._v.textContent:'—');

  if(timedOut){
    const allowedSeconds=run.questionLimitSeconds+(run.extraSeconds||0);
    score=0;answerText='시간 초과 ('+allowedSeconds+'초)';
    msg=allowedSeconds+'초 동안 답하지 않아 오답 처리되었습니다.<br>'+(q.type==='vocabMatch'
      ?q.words.map(w=>w.word+' — '+w.meaning).join('<br>'):'정답 '+escapeHTML(q.answer)+' — '+escapeHTML(q.summaryWhy||q.why||''));
    $('#q-timer').textContent='0';
  }else if(q.type==='vocabMatch'){
    score=q._matches.reduce((n,word,slot)=>n+(q.words[word].meaning===q.words[slot].meaning?1:0),0);
    answerText=q._matches.map((word,slot)=>q.words[word].word+' → '+q.words[slot].meaning).join(' / ');
    msg=score+' / '+q.words.length+'개 정답<br>'+q.words.map(w=>w.word+' — '+w.meaning).join('<br>');
    document.querySelectorAll('.vocab-target').forEach(b=>b.disabled=true);
  }else if(q.type==='pair'){
    const ok=(t,v)=> !!t && !!v && t.dataset.role==='tenor' && v.dataset.role==='vehicle';
    const A=ok(q._tA,q._vA), B=ok(q._tB,q._vB), C=q._picked===q.answer;
    score=(A?1:0)+(B?1:0)+(C?1:0);
    answerText='①'+(q._tA?q._tA.textContent:'—')+'/'+(q._vA?q._vA.textContent:'—')+
               ' ②'+(q._tB?q._tB.textContent:'—')+'/'+(q._vB?q._vB.textContent:'—')+' 판단'+q._picked;
    msg='① '+(A?'○':'×')+' 원관념 '+q.aTenor+' · 보조관념 '+q.aVehicle+
        ' / ② '+(B?'○':'×')+' 원관념 '+q.bTenor+' · 보조관념 '+q.bVehicle+
        ' / 판단 '+(C?'○':'×')+' 정답 '+q.answer+' — '+q.why;
  }else if(q.type==='choice'||q.type==='ox'||q.type==='mc'){
    score = q._picked===q.answer ? 1:0; answerText=q._unknown?'? (모름 · 답 확인)':q._picked;
    msg = '정답 '+escapeHTML(q.answer)+' — '+escapeHTML(q.summaryWhy||q.why);
    if(q._evi!=null){
      const NO='①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯';
      const lab = i => (q.lines && q.lines[i] && q.lines[i].no) ? q.lines[i].no : (NO[i]||(i+1));
      const eviOK = q._eviFocus<0 || q._evi===q._eviFocus;
      answerText += ' / 근거:'+lab(q._evi)+(q._eviFocus>=0 ? (eviOK?'○':'×(정답 '+lab(q._eviFocus)+')') : '');
      if(q._eviFocus>=0) msg = (eviOK ? '근거 문장을 바르게 골랐습니다. ' : '근거는 '+lab(q._eviFocus)+'번 문장입니다. ') + msg;
    }
  }else if(q.type==='drag'){
    score = dragOK()?1:0; answerText=dragTxt();
    msg = '원관념 '+q.tenor+' · 보조관념 '+q.vehicle;
  }else{
    const a = q._picked===q.answer, b = dragOK();
    score = (a?1:0)+(b?1:0); answerText = q._picked+' / '+dragTxt();
    msg = '비유의 종류 '+(a?'○':'×')+' — 정답 '+q.answer+' · '+q.why+' / 원관념·보조관념 '+(b?'○':'×')+' — 원관념 '+q.tenor+' · 보조관념 '+q.vehicle;
  }
  if(score===q.max&&!q._evidenceResult&&requiresEvidence(q)){beginEvidence(q,sec);return;}
  const evidenceResult=q._evidenceResult;
  if(evidenceResult?.retired){
    answerText+=' / 기본 근거 선택 단계 종료'+(evidenceResult.hadMistake?' · 최초 근거 오답 유지':' · 이전 문제 답 정답 유지');
    if(!evidenceResult.ok)score=0;
    msg=(evidenceResult.hadMistake?'이전에 틀린 근거는 오답으로 유지하고 기본 OX로 복습합니다. ':'이전에 맞힌 문제 답을 유지했습니다. 기본 OX의 근거 선택 단계는 종료되었습니다. ')+'<br>'+msg;
  }else if(evidenceResult){
    const selectedSentence=q.evidence.sources.flatMap(source=>source.sentences).find(s=>s.id===evidenceResult.selected);
    answerText+=' / 근거 '+(evidenceResult.selectedCorrect?evidenceResult.selected+' '+selectedSentence.text+(evidenceResult.hadMistake?' (해설 후 정정 · 최초 근거 오답 유지)':''):'시간 초과');
    if(evidenceResult.selectedGroup)answerText+=' / 선택한 근거 묶음 '+(evidenceResult.selectedGroup.index+1)+' ['+evidenceResult.selectedGroup.members.join(',')+']';
    if(evidenceResult.rejectedGroups?.length){const first=evidenceResult.rejectedGroups[0];answerText+=' / 처음 고른 근거 묶음 '+(first.index+1)+' ['+first.members.join(',')+']';}
    if(evidenceResult.rejected.length){const firstWrong=q.evidence.sources.flatMap(source=>source.sentences).find(s=>s.id===evidenceResult.rejected[0]);answerText+=' / 최초 근거 오답: '+evidenceResult.rejected[0]+' '+(firstWrong?.text||'');}
    if(!evidenceResult.ok)score=0;
    msg=(evidenceResult.ok?'근거 문장도 처음에 바르게 찾았습니다. ':evidenceResult.selectedCorrect?'근거는 바로잡았지만 처음 선택이 틀렸으므로 이번 문항은 오답으로 기록됩니다. 정답 점수·XP·콤보 보상은 없고 필수 복습에서 다시 확인해요. ':'근거 선택 시간이 끝났어요. 문제 답은 맞혔고, 근거는 오답 복습에서 다시 확인해요. ')+'<br>'+msg;
  }
  if(q._evidenceOnlyReview)answerText='문제 답 이전 정답 유지 · 근거만 복습 / '+answerText;
  const ok = score===q.max;
  if(!ok&&!evidenceResult?.failureCounted)countFailure(q);
  const streak=ok?run.logs.reduce((n,l)=>l.ok?n+1:0,0)+1:0;
  const beforeXp=game.state().xp;
  const prize=game.answer(options.questionRewardScope||gameKey(run.set),q.id||q.pi+':'+q.qno,ok,streak,run.retry);

  const newLevel=Math.floor(game.state().xp/100)+1,oldLevel=Math.floor(beforeXp/100)+1;
  const fb=$('#q-fb'); fb.className='fb '+(ok?'ok':'no');
  const verdict=evidenceResult&&!evidenceResult.ok?(evidenceResult.retired?'이전 근거 오답 유지':evidenceResult.selectedCorrect?'근거 오답 · 해설 후 정정':'근거 찾기 시간 초과'):timedOut?'시간 초과 · 오답':q._unknown?'모름 · 정답과 해설 확인':ok?'맞았습니다':score>0?'일부 맞았습니다':'틀렸습니다';
  fb.replaceChildren(el('b','feedback-verdict',verdict));
  const answerLabel=value=>q.type==='mc'?(['①','②','③','④','⑤'][q.options.indexOf(value)]||value):value;
  if(['ox','mc','choice'].includes(q.type))fb.appendChild(el('p','feedback-answer','내 선택: '+(q._unknown?'? 모름':timedOut?'시간 초과':answerLabel(q._picked)||'—')+' · 정답: '+answerLabel(q.answer)));
  if(evidenceResult&&!evidenceResult.ok)fb.appendChild(el('p','feedback-notice',evidenceResult.selectedCorrect?'근거는 바로잡았지만 최초 오답은 유지돼요. 근거만 다시 복습합니다.':evidenceResult.retired?'이전 근거 오답을 기본 OX로 다시 복습합니다.':'문제 답은 맞혔고, 근거는 다시 복습합니다.'));
  $('#q-timer').hidden=true;$('#q-timer').textContent='';$('#q-timer').removeAttribute('aria-label');


  const rewards=el('div','answer-reward');
  if(ok){
    rewards.appendChild(el('strong','reward-heading','이번 정답 보상'));
    const chips=el('div','reward-chips');chips.appendChild(el('span','combo-chip',streak+' COMBO'));
    chips.appendChild(el('span','xp-chip',prize.xp?'+'+prize.xp+' XP':'추가 XP 없음'));
    if(prize.bonus)chips.appendChild(el('span','hint-chip','💡 힌트권 +1장'));
    if(newLevel>oldLevel)chips.appendChild(el('span','level-chip','🎉 레벨 상승! Lv.'+newLevel));
    rewards.appendChild(chips);
    if(!prize.xp)rewards.appendChild(el('small','reward-note',run.retry?'오답 복습에는 XP·연속 정답 아이템 보상이 없어요. 힌트는 무료예요.':'이미 첫 정답 XP를 받은 문항이에요. XP는 문항마다 한 번 지급돼요.'));
    if(streak%3===0&&!prize.bonus&&!run.retry)rewards.appendChild(el('small','reward-note','이 문항의 연속 정답 힌트권은 이미 받았어요.'));
    else if(!prize.bonus&&!run.retry)rewards.appendChild(el('small','reward-note',(3-streak%3)+'개 더 연속으로 맞히면 힌트권 1장! 같은 문항 보상은 한 번만 지급돼요.'));
    const meter=tools.querySelector('.combo-meter');if(meter)meter.textContent=streak+' COMBO'+(prize.bonus?' · 💡 힌트권 1장 획득!':'');
  }else{rewards.textContent='COMBO 초기화 · 이 문제는 필수 복습에 추가됐어요.';const meter=tools.querySelector('.combo-meter');if(meter)meter.textContent='0 COMBO · 다음 정답부터 다시 시작!';}
  // The single explanation is inserted before rewards below.
  impact(ok,streak,{...prize,level:newLevel>oldLevel?newLevel:null});
  helpPanel.hidden=true;hintBox.hidden=true;if($('#answer-support'))$('#answer-support').hidden=true;tools.querySelectorAll('button').forEach(b=>b.disabled=true);refreshWallet();
  document.querySelectorAll('#q-body .pick').forEach(button=>{if(button.textContent===q.answer)button.classList.add('answer-correct');else if(button.textContent===q._picked||q._unknown&&button.id==='answer-unknown')button.classList.add('answer-wrong');});
  document.querySelectorAll('#q-body [data-eliminated]').forEach(b=>b.hidden=false);
  if(q._unknown){$('#answer-unknown').textContent='? 모름 · 내 선택';$('#answer-unknown').classList.add('answer-unknown-selected');}
  document.querySelectorAll('#q-body .picks, #q-body .sent, #q-body .claim, #q-body .ask').forEach(n=>n.hidden=false);
  global.HomeworkReview.paint(q,$('#q-body'));
  if(evidenceResult&&!evidenceResult.retired)paintEvidenceResult(q);
  else if(q.evidence?.valid?.length)paintAnswerEvidence(q);
  else{const explanation=el('div','feedback-explanation');explanation.innerHTML=['ox','mc','choice'].includes(q.type)?escapeHTML(conciseExplanation(q.summaryWhy||q.why)):msg;fb.appendChild(explanation);}
  fb.appendChild(rewards);fb.appendChild(el('small','sec','풀이 시간 '+sec.toFixed(1)+'초'));
  document.querySelectorAll('#q-body button').forEach(b=>b.disabled=true);if($('#use-reading-size'))$('#use-reading-size').disabled=false;
  document.querySelectorAll('#q-body .chip, #q-body .zone').forEach(e=>e.style.pointerEvents='none');
  $('#q-check').style.display='none'; $('#q-next').style.display='';
  $('#q-next').textContent = run.idx+1===run.list.length ? '결과 보기 →' : '다음 문제로 →';showAnswerDock();
  $('#q-next').focus({preventScroll:true});
  scrollToAnswerExplanation();

  const log = {kind:'answer', uid:UID, session:run.session, set:run.set.group+' · '+run.set.name+(run.retry?' (오답)':''), attempt:run.attempt,
               part:q.part, qno:q.qno, qid:q.id, type:q.type, answer:answerText, correctAnswer: q.type==='drag' ? '원관념 '+q.tenor+' / 보조관념 '+q.vehicle
                 : q.type==='both' ? q.answer+' / 원관념 '+q.tenor+' / 보조관념 '+q.vehicle
                 : q.type==='pair' ? '①'+q.aTenor+'/'+q.aVehicle+' ②'+q.bTenor+'/'+q.bVehicle+' 판단'+q.answer
                 : q.answer,
               score, max:q.max, sec, timedOut, hinted:!!q._hintUsed||!!q._choiceHelpUsed, answerCorrect:!timedOut&&(q.type==='ox'||q.type==='mc')?q._picked===q.answer:undefined, problemAnswer:q._unknown?'모름':q._picked||undefined, unknown:!!q._unknown,reviewMode:q._evidenceOnlyReview?'evidence-only':run.retry?'full':undefined, evidence:evidenceResult||undefined, at:stamp(now),atMs:now.getTime()};
  run.logs.push({...log, sent:q.sent||q.changed||q.a||'', why:q.why||'', ok});
  saveRun(run.idx+1);
  paintGuidedStatus();
  enqueue(log);
  const rewardSummary=ok?streak+' COMBO · '+(prize.xp?'+'+prize.xp+' XP':'추가 XP 없음')+(prize.bonus?' · 힌트권 +1장':'')+(newLevel>oldLevel?' · Lv.'+newLevel+' 상승!':''):'COMBO 초기화 · 획득 XP 없음';
  scheduleNext(ok,rewardSummary);
}

function next(){
  if(!run||run.finished)return;
  if(run.list[run.idx]?._evidencePhase||run.list[run.idx]?._timeDecision)return;
  clearAutoNext();
  run.idx++;
  if(run.idx < run.list.length) renderQ(); else finish();
}

function finish(){
  if(!run||run.finished)return;
  run.finished=true;
  clearAutoNext();
  clearInterval(run.timerId);
  if(!run.retry) clearRun(run.set.id);
  else localStorage.removeItem(retryKey(run.set.id));
  const endAt = new Date();
  // 오답 목록: 전체 풀이면 새로 만들고, 오답 풀이면 그중 아직 틀린 것만 남김
  const findQuestion=l=>run.list.find(q=>l.qid?q.id===l.qid:q.part===l.part&&q.qno===l.qno);
  const wrongNow = run.logs.filter(l=>!l.ok).map(l=>{const detail=global.HomeworkResults.classify(l);return {pi:findQuestion(l).pi,qi:l.qno-1,mistakeKind:detail.kind,correctedAfterExplanation:detail.corrected,timedOut:detail.timedOut};});
  saveWrong(run.set.id, wrongNow);
  const total = run.logs.reduce((a,l)=>a+l.score,0);
  const max = run.list.reduce((a,q)=>a+q.max,0);
  if(!run.retry){ try{ localStorage.setItem(lastKey(run.set.id), JSON.stringify({score:total, max, at:stamp(endAt)})); }catch(e){} }
  if(options.units){
    // Keep the completed attempt available to the teacher after the in-progress run is removed.
    const reportKey=PREFIX+'report_'+contentKey(run.set.id);let report={};try{report=JSON.parse(localStorage.getItem(reportKey)||'{}');}catch(_){}
    const compact=run.logs.map(log=>({qid:log.qid,part:log.part,qno:log.qno,type:log.type,score:log.score,max:log.max,ok:log.ok,answerCorrect:log.answerCorrect,problemAnswer:log.problemAnswer,unknown:log.unknown,answer:log.answer,correctAnswer:log.correctAnswer,evidence:log.evidence,timedOut:log.timedOut,hinted:log.hinted,sec:log.sec,reviewMode:log.reviewMode,at:log.at,atMs:log.atMs}));
    const attemptReport={attempt:run.attempt,session:run.session,score:total,max,startedAt:run.startedAt.toISOString(),endedAt:stamp(endAt),logs:compact};
    report[run.retry?'review':'normal']=attemptReport;
    if(!run.retry)delete report.review;
    localStorage.setItem(reportKey,JSON.stringify(report));
  }
  const wrongN = run.logs.filter(l=>!l.ok).length;
  const dur = Math.round((endAt-run.startedAt)/1000);
  const parts = run.set.parts.map((p,pi)=>{
    const ls = run.logs.filter(l=>l.part===p.name);
    return {name:p.name, got:ls.reduce((a,l)=>a+l.score,0), max:ls.reduce((a,l)=>a+l.max,0)};
  }).filter(p=>p.max>0);

  $('#e-title').textContent = run.set.group+' · '+run.set.name+(run.retry?' — 오답 다시 풀기':'');
  $('#e-retry').style.display = wrongNow.length ? '' : 'none';
  $('#e-retry').textContent = '바로 복습하기 · '+wrongNow.length+'문항 →';
  resultReview.hidden=!wrongNow.length;
  resultReviewNote.textContent='방금 틀린 문제만 다시 풀어요. 근거만 틀렸다면 근거 선택부터 시작해요.';
  $('#e-sub').textContent = run.attempt+'번째 풀이 · '+stamp(run.startedAt).slice(0,16)+' 시작';
  $('#e-score').textContent = total; $('#e-max').textContent = ' / '+max;
  $('#e-meta').textContent = '틀린 문항 '+wrongN+'개 · 총 '+Math.floor(dur/60)+'분 '+(dur%60)+'초 · 문항당 평균 '+(dur/run.list.length).toFixed(1)+'초';
  $('#e-rows').innerHTML = parts.map(p=>'<div class="row"><span class="nm">'+p.name+'</span><span class="track"><span class="fill" style="width:'+(p.got/p.max*100)+'%"></span></span><span class="val">'+p.got+'/'+p.max+'</span></div>').join('');
  global.HomeworkResults.render({logs:run.logs,summary:outcomeSummary,wrongs:$('#e-wrongs'),findQuestion,classified:!!options.units||['development','traps'].includes(options.page)});

  enqueue({kind:'summary', uid:UID, session:run.session, set:run.set.group+' · '+run.set.name+(run.retry?' (오답)':''), attempt:run.attempt,
           score:total, max, wrong:wrongN, sec:dur, startedAt:stamp(run.startedAt), endedAt:stamp(endAt),
           parts: parts.map(p=>p.name.split(' ')[0]+' '+p.got+'/'+p.max).join(', ')});
  resultAdventure(total,max,wrongNow.length);
  paintGuidedContinuation();
  updateSync();
  const state=studySession?.snapshot();
  const today=daily&&state?.active&&!run.retry?daily.finishParagraph(run.set):null;
  show('#scr-end');
  checkDailyFinish(today,state);
}

$('#q-check').addEventListener('click', submit);
$('#q-next').addEventListener('click', next);
let quitTimer=null;
$('#q-quit').addEventListener('click', ()=>{
  const b=$('#q-quit');
  if(b.dataset.armed){
    clearTimeout(quitTimer); delete b.dataset.armed; b.classList.remove('warn'); b.textContent='그만두기';
    clearInterval(run.timerId);pauseQuestionClock();saveRun();renderStart();show('#scr-start');
  }else{
    b.dataset.armed='1'; b.classList.add('warn'); b.textContent='여기까지 저장됩니다. 한 번 더 누르면 나갑니다';
    quitTimer=setTimeout(()=>{ delete b.dataset.armed; b.classList.remove('warn'); b.textContent='그만두기'; }, 4000);
  }
});
$('#e-home').addEventListener('click', ()=>{ renderStart(); show('#scr-start'); });
$('#e-resend').addEventListener('click', ()=>{ flush(); });
$('#diag').addEventListener('click', async ()=>{
  const out=$('#diag-out');out.style.display='block';out.textContent='연결을 확인하고 있습니다…';
  if(!global.HomeworkSync.isEndpoint(SHEET_URL)){
    out.textContent='아직 시트가 연결되지 않았습니다. 지금 푼 기록은 이 기기에 보관됩니다.\n보관 중: '+readQ().length+'건';return;
  }
  const lines=['전송 대기: '+readQ().length+'건'];
  try{ const response=await fetch(SHEET_URL);const text=(await response.text()).trim();
    lines.push(/^ok(?:\s|$)/.test(text)?'기록 서버 연결 정상':'서버 응답을 확인하지 못했습니다. 배포 주소와 접근 권한을 확인해 주세요.');
  }catch(error){lines.push('서버에 연결하지 못했습니다: '+error.message);}
  try{ const response=await fetch(SHEET_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
    body:JSON.stringify({kind:'batch',rows:[{kind:'test',rid:'test-'+Date.now()}]})});
    const text=(await response.text()).trim();lines.push(/^ok(?:\s|$)/.test(text)?'기록 전송 경로 정상 · 점검용 기록은 시트에 남지 않습니다.':'기록 수신을 확인하지 못했습니다. 배포 설정을 확인해 주세요.');
  }catch(error){lines.push('전송 경로를 확인하지 못했습니다: '+error.message);}
  out.textContent=lines.join('\n');void flush();
});
$('#e-again').addEventListener('click', ()=> start(run.set));
$('#e-retry').addEventListener('click', ()=> start(run.set, null, true));
document.addEventListener('click', e=>{ if(!e.target.closest('.chip')&&!e.target.closest('.zone')&&!e.target.closest('.pool')&&selChip){ selChip.classList.remove('sel'); selChip=null; } });

global.addEventListener('pagehide',()=>{
  if(run && $('#scr-q').classList.contains('on')){pauseQuestionClock();saveRun();}
});
if(options.guidedLearning&&global.HomeworkStudySession){
 if(daily)global.addEventListener('pagehide',event=>{
  if(event.isTrusted)daily.tick(false);
  daily.flush();
 });
 studySession=global.HomeworkStudySession.create({window:global,document,storage:sessionStorage,key:PREFIX+'study_session_'+UID,testMode:untimed,managedTime:!!daily,onRecord:record=>{localStorage.setItem(PREFIX+'homework_session_v1_'+record.id,JSON.stringify(record));},onChange:paintStudySession,onAlert:event=>{logStudentEvent(event.reason,({'hidden':'다른 탭·앱으로 이동','returned':'숙제 화면 복귀','idle-notice':'10초 무활동 알림','idle-warning':'20초 무활동 경고','fullscreen-exit':'전체화면 해제 알림'})[event.reason]||event.reason);if(event.reason==='returned')studyReturnNoticeUntil=Date.now()+5000;},onComplete:state=>{
  notifyHomeworkCompletion('session:'+state.startedAt,'30분 숙제 목표를 채웠어요.');
 }});
 paintStudySession(studySession.snapshot());
 document.addEventListener('click',event=>{if(event.target.closest?.('#student-logout'))studySession.end();},true);
}
renderStart();
if(options.units){nextTypeButton.textContent='단원 문제 고르기';$('#e-home').textContent=guidedActive()?'학습 현황':'단원으로';}
updateSync();
loadCloudHistory();
flush();
if(new URLSearchParams(location.search).get('review')==='1')openPending();
return { start, loadSet, renderStart, goUnit:options.units?goUnit:undefined, getRun:()=>run, sets:SETS, sync, game, storagePrefix:PREFIX, page:options.page };
}
global.HomeworkApp={mount};
})(window);
