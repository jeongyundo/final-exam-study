/* 각 진입 페이지에서 공통 화면과 문제 엔진을 연결합니다. */
(function () {
  'use strict';
  const page = document.body.dataset.page || 'legacy';
  const app = document.getElementById('app');
  try {
    app.innerHTML = window.HOMEWORK_SHELL;
    const metadata = {
      legacy: { title: '이지우 학생 내신 준비', intro: '한 문제씩 풀고 바로 확인합니다. 세트를 고르면 시작합니다.', storagePrefix: 'bib_' },
      development: { title: '내용 전개 방식별 연습', intro: '정의·분석·인과 등 같은 전개 방식끼리 모아 풀어요. 기본은 OX, 심화는 내신 5지선다입니다.', storagePrefix: 'practice_development_' },
      traps: { title: '선지 변형 유형별 연습', intro: '반의어·순서·조건 등 헷갈리는 유형만 골라 집중해서 풀어요. 기본은 OX, 심화는 내신 5지선다입니다.', storagePrefix: 'practice_traps_' }
    }[page];
    if (!metadata) throw new Error('알 수 없는 페이지');
    document.getElementById('page-title').textContent = metadata.title;
    document.getElementById('page-intro').textContent = metadata.intro+(page==='legacy'?'':' 답을 맞히면 30초 동안 본문 근거 문장을 하나 고릅니다.');
    document.querySelectorAll('[data-page-link]').forEach(link => { if (link.dataset.pageLink === page) link.setAttribute('aria-current', 'page'); });
    document.getElementById('timer-description').textContent = '기본 풀이는 한 문단 30초·두 문단 이상 50초이며, 같은 문항을 틀릴 때마다 다음 풀이에 10초씩 더 드려요. 내용 전개 방식·선지 변형 유형에서는 답을 맞히면 새로 30초 동안 근거 문장을 하나 고릅니다. 근거까지 통과한 뒤 해설은 정답 기본 20초·오답 기본 10초에 문항의 누적 오답 1회당 10초를 더해 읽어요. 연장권을 쓰면 풀이에 30초를 더 받을 수 있어요.';
    const links = document.getElementById('practice-links');
    if (page === 'legacy') {
      links.innerHTML = '<h2>유형별로 집중 연습</h2><div class="practice-link-grid">'
        + '<a href="development.html"><strong>내용 전개 방식</strong><span>정의·분석·비교와 대조 등 8가지</span><small>기본 OX · 심화 5지선다 →</small></a>'
        + '<a href="traps.html"><strong>선지 변형 유형</strong><span>반의어·인과·조건·주체 등 8가지</span><small>기본 OX · 심화 5지선다 →</small></a>'
        + '<a href="advanced.html"><strong>고급 혼합 문제</strong><span>본문·보기·여러 자료를 연결하는 실전 연습</span><small>내신 5지선다 · 정답과 해설 →</small></a></div>';
    } else links.hidden = true;
    const data = page === 'legacy' ? { sets: window.HOMEWORK_LEGACY_SETS } : window.HOMEWORK_PAGE_CATALOG || window.HomeworkExamSets.build(window.HOMEWORK_EXAM_BANK, page);
    if (!Array.isArray(data.sets) || !data.sets.length) throw new Error('문제 데이터 없음');
    const sheet = window.HOMEWORK_SHEETS?.[page] || {};
    window.homeworkApp = window.HomeworkApp.mount({ page, ...metadata, ...data, sheetUrl: sheet.url || '', history: sheet.history === true });
  } catch (error) {
    console.error('문제 페이지를 시작하지 못했습니다.', error);
    app.replaceChildren();
    const box = document.createElement('div');box.className = 'load-error';
    const title = document.createElement('h1');title.textContent = '문제를 불러오지 못했습니다.';
    const text = document.createElement('p');text.textContent = '인터넷 연결을 확인한 뒤 다시 열어 주세요. 계속되면 선생님에게 알려 주세요.';
    const retry = document.createElement('button');retry.type = 'button';retry.className = 'act';retry.textContent = '다시 불러오기';retry.onclick = () => location.reload();
    const home = document.createElement('a');home.href = 'index.html';home.textContent = '기존 숙제로';
    box.append(title, text, retry, home);app.appendChild(box);
  }
})();
