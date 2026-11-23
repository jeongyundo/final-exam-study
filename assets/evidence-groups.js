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
