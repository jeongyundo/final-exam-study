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
