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
