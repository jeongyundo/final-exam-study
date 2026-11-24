/* A new exam has its own progress keys; prior exam data cannot recreate review obligations. */
(function(global){
'use strict';
const term={id:'final2026',label:'2학기 기말고사',page:'units-final2026',storagePrefix:'practice_units_final2026_',activeUnits:['2-2','3-1','3-2','5-2','6-1','6-2','6-3'],examSteps:['2-2','3-1','3-2','5-2','6-1','6-2','6-3']};
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
