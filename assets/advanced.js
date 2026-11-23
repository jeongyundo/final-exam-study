/* 고급은 유형 힌트 없이 여러 제재를 섞어서 제시합니다. */
(function (global) {
  'use strict';
  function build(bank) {
    const sets = [];
    for (let n = 1; n <= 5; n++) {
      const questions = bank.questions.filter(q => q.set === n);
      sets.push({ id: 'advanced-mixed-' + n, cat: '고급 혼합', group: '고급 혼합',
        name: '혼합 실전 ' + n, level: '고급', revision: bank.version,
        desc: '내신 5지선다', shuffleQuestions: true, timedMode: 'question',
        parts: [{ name: '혼합 실전', items: questions.map(q => ({
          id: q.id, type: 'mc', paragraphCount:q.refs.length, referenceMode: 'visible', disableAutoFocus: true,
          sourceLabel: q.id + ' · ' + q.refs.map(r => '「' + bank.sources[r].title + '」').filter((v,i,a) => a.indexOf(v) === i).join(' / '),
          // 자료의 구획과 보기의 줄바꿈을 보존합니다.
          noteLabel: '자료와 보기',
          note: q.refs.map((r,i) => '[자료 ' + (i+1) + '] ' + bank.sources[r].title + ' · ' + bank.sources[r].label + '\n' + bank.sources[r].text).join('\n\n')
            + (q.view ? '\n\n[보기 · 출제용 사례]\n' + q.view : ''),
          sent: q.prompt, options: [...q.options], answer: q.answer,
          evidence: bank.evidence?.[q.id] ? {title:q.prompt, statement:q.answer,
            explanation:q.optionExplanations[q.answerIndex]+'\n'+q.reasoning, valid:bank.evidence[q.id],
            sources:q.refs.map(id=>({id,title:bank.sources[id].title,label:bank.sources[id].label,sentences:bank.sentenceSources[id]}))} : undefined,
          summaryWhy:q.reasoning,pageSpecificReasons:true,
          choiceReviews:Object.fromEntries(q.options.map((option,i)=>[option,{reason:q.optionExplanations[i],edits:global.HOMEWORK_CORRECTIONS?.[q.id]?.choices?.[option]||[]}])),
          why: q.reasoning + '\n\n' + q.optionExplanations.map((why,i) => '「' + q.options[i] + '」\n' + why).join('\n\n')
        })) }] });
    }
    return { sets };
  }
  global.HomeworkAdvancedSets = { build };
  if (typeof document === 'undefined'||global.HOMEWORK_BUILD_ONLY) return;
  const app = document.getElementById('app');
  try {
    app.innerHTML = global.HOMEWORK_SHELL;
    document.getElementById('page-title').textContent = '독서와 작문 고급 혼합 문제';
    document.getElementById('page-intro').textContent = '6문항씩 5세트. 본문과 보기의 조건을 함께 살펴보세요. 답을 고르면 해설이 나옵니다.';
    const manuscript=document.createElement('a');
    manuscript.href='materials/advanced-problems.md';
    manuscript.download='고급 혼합 문제 원고.md';
    manuscript.className='act ghost advanced-download';
    manuscript.textContent='문제 원고 내려받기';
    document.querySelector('#scr-start header').appendChild(manuscript);
    document.querySelectorAll('[data-page-link]').forEach(link => {
      if (link.dataset.pageLink === 'advanced') link.setAttribute('aria-current', 'page');
    });
    document.getElementById('timer-description').textContent = '기본 풀이는 한 문단 30초·두 문단 이상 50초에 누적 오답 1회당 10초를 더해요. 해설도 정답 기본 5초·오답 기본 10초에 누적 오답당 10초씩 더 읽어요. 연장권을 쓰면 30초를 더 받을 수 있어요.';
    document.getElementById('practice-links').hidden = true;
    document.getElementById('diag').hidden = true;
    const sheet = global.HOMEWORK_SHEETS?.advanced || {};
    global.homeworkApp = global.HomeworkApp.mount({ page: 'advanced', startLayout: 'sets',
      storagePrefix: 'practice_advanced_', ...(global.HOMEWORK_PAGE_CATALOG || build(global.HOMEWORK_ADVANCED_BANK)),
      sheetUrl: sheet.url || '', history: false });
    const style = document.createElement('style');
    style.textContent = '#q-body .note{white-space:pre-wrap;line-height:1.9}#q-fb{white-space:pre-wrap}#q-body .sent{margin-top:24px}';
    document.head.appendChild(style);
  } catch (error) {
    console.error('고급 문제 시작 실패', error);
    app.textContent = '고급 문제를 불러오지 못했습니다. 폴더의 파일을 모두 함께 열었는지 확인해 주세요.';
  }
})(window);
