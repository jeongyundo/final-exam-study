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
