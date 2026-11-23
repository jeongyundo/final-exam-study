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
