/* The hosted editor stores edits through Apps Script. Its key lives in memory. */
(function () {
  'use strict';
  let key = '', versions = {};
  const api = (body) => HomeworkQuestionPatches.request(window.HOMEWORK_STUDENT.url, body, 25000);
  const errors = {
    EDITOR_AUTH_REQUIRED:'편집 키를 확인해 주세요.',
    EDITOR_NOT_CONFIGURED:'Apps Script에 편집 키를 설정해 주세요.',
    INVALID_ACTION:'온라인 문항 편집 서버를 새 버전으로 배포해 주세요.',
    QUESTION_EDIT_CONFLICT:'다른 창에서 이 문항을 수정했습니다. 새로고침해 최신 내용을 확인해 주세요.',
    INVALID_QUESTION_EDIT:'문구, 정답, 선지 순서와 근거를 확인해 주세요.',
    QUESTION_EDIT_TOO_LARGE:'문항이 너무 깁니다. 문구나 해설을 줄여 주세요.',
    BUSY:'서버에서 다른 저장을 처리 중입니다. 잠시 뒤 다시 저장해 주세요.',
  };
  async function call(body) {
    try { return await api(body); }
    catch (error) { throw new Error(errors[error.message] || '문항 서버에 연결하지 못했습니다. 인터넷과 서버 배포 상태를 확인해 주세요.'); }
  }
  window.HomeworkOnlineEditor = {
    async unlock(value) {
      await call({action:'question_authorize', key:value});
      key = value;
    },
    async request(path, payload) {
      if (path === '/api/questions') {
        const [catalog, result] = await Promise.all([
          fetch(window.HOMEWORK_EDITOR_CATALOG).then(response => {
            if (!response.ok) throw new Error('문항 목록을 불러오지 못했습니다.');
            return response.json();
          }),
          call({action:'question_read'}),
        ]);
        versions = result.questions;
        return {questions:catalog, edits:Object.fromEntries(Object.entries(versions)
          .filter(([id, record]) => record.edit !== null && !id.startsWith('ladder:')).map(([id, record]) => [id, record.edit]))};
      }
      if (path !== '/api/save') throw new Error('지원하지 않는 작업입니다.');
      const {id, edit} = payload;
      const {record} = await call({action:'question_save', key, id, edit, expected:versions[id]?.revision || 0});
      versions[id] = record;
      return {edit:record.edit};
    },
  };
})();
