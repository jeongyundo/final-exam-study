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
