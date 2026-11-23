/* Separate reading practice records from graded OX attempts. */
(function(global){
  'use strict';
  const keys=['locate','meaning','role','bridge','check'];
  const labels=['표현 짚기','뜻 고르기','대상 구별','관계 연결','원문 확인'];
  function sanitize(raw){
    if(!raw||raw.version!==1||!Number.isInteger(raw.stage)||raw.stage<0||raw.stage>6||!raw.records||typeof raw.records!=='object')return null;
    const state={version:1,stage:raw.stage,model:Number.isInteger(raw.model)?Math.max(0,Math.min(3,raw.model)):0,records:{},orders:{},finished:false};
    for(const key of keys){
      const r=raw.records[key];if(!r)continue;
      if(typeof r.done!=='boolean'||typeof r.assisted!=='boolean')return null;
      state.records[key]={done:r.done,assisted:r.assisted,attempts:Number.isInteger(r.attempts)?Math.max(0,Math.min(10000,r.attempts)):0,showHelp:!!r.showHelp,selected:Number.isInteger(r.selected)&&r.selected>=0&&r.selected<=2?r.selected:null};
      const order=raw.orders?.[key];if(Array.isArray(order)&&order.length===2&&new Set(order).size===2&&order.every(x=>x===0||x===1))state.orders[key]=order.slice();
    }
    state.finished=complete(state);return state;
  }
  function complete(state){return !!state&&state.stage===6&&keys.every(k=>state.records?.[k]?.done===true);}
  function summary(state){return keys.map((key,i)=>{const r=state?.records?.[key];return labels[i]+': '+(r?.done?(r.assisted?'도움받아 수행':'도움 없이 수행'):r?.assisted?'다시 연습 중':'아직 안 함');}).join(' · ');}
  global.HomeworkReadingGuide={sanitize,complete,summary};
})(typeof window==='undefined'?globalThis:window);
