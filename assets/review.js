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
