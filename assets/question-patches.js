/* Shared validation for browser question updates and the Apps Script write endpoint. */
var HomeworkQuestionPatches = (function () {
  'use strict';
  const text = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 12000;
  const id = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9:_-]{0,99}$/.test(value);

  function validEdit(edit) {
    if (!edit || typeof edit.sourceVersion !== 'string' || !/^[a-f0-9]{64}$/.test(edit.sourceVersion) ||
        !text(edit.prompt) || !text(edit.why) || !Array.isArray(edit.valid) || edit.valid.length > 100 ||
        !edit.valid.every(id) || new Set(edit.valid).size !== edit.valid.length) return false;
    if (edit.answer === 'O' || edit.answer === 'X') return text(edit.claim);
    if (!Array.isArray(edit.options) || edit.options.length !== 5 ||
        !edit.options.every(row => row && Number.isInteger(row.source) && row.source >= 0 &&
          row.source < 5 && text(row.text)) ||
        new Set(edit.options.map(row => row.source)).size !== 5 ||
        new Set(edit.options.map(row => row.text.trim())).size !== 5) return false;
    return Number.isInteger(edit.answer) && edit.answer >= 0 && edit.answer < 5;
  }

  function apply(q, record) {
    const edit = record?.edit;
    if (!validEdit(edit) || edit.sourceVersion !== q.editorSourceVersion) return q;
    const sources = q.evidence?.sources || [];
    const evidenceIds = new Set(sources.flatMap(source => source.sentences.flatMap(s => s.memberIds || [s.id])));
    if (edit.valid.some(id => !evidenceIds.has(id)) || (q.evidence?.valid?.length && !edit.valid.length)) return q;
    const updated = {...q, why:edit.why, editorRevision:'online-'+record.revision};
    if (q.evidence) updated.evidence = {...q.evidence, valid:edit.valid, explanation:edit.why};
    if (q.type === 'ox' && ['O','X'].includes(edit.answer)) {
      if (q.changed !== edit.claim || q.answer !== edit.answer) updated.claimEdits = [];
      return {...updated, ask:edit.prompt, changed:edit.claim, answer:edit.answer};
    }
    if (q.type !== 'mc' || !Number.isInteger(edit.answer) || q.options?.length !== 5) return q;
    const options = edit.options.map(row => row.text.trim());
    const answer = edit.options.find(row => row.source === edit.answer).text.trim();
    const choiceReviews = Object.fromEntries(edit.options.map(row => {
      const old = q.options[row.source], next = row.text.trim();
      const review = q.choiceReviews?.[old];
      if (review && old === next && (old === q.answer) === (next === answer)) {
        return [next, {...review, reason:review.reason === q.why ? edit.why : review.reason}];
      }
      return [next, {reason:edit.why, edits:[]}];
    }));
    return {...updated, sent:edit.prompt, options, answer, choiceReviews, fixedOptionOrder:true};
  }

  async function request(url, body, timeout = 8000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const response = await fetch(url, {
        method:'POST', credentials:'omit', signal:controller.signal,
        headers:{'Content-Type':'text/plain;charset=utf-8'}, body:JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'QUESTION_CONNECTION_FAILED');
      return result;
    } finally { clearTimeout(timer); }
  }

  function reader(url, storage) {
    const key = 'homework_online_question_patches_v1';
    let records = {}, pending = null;
    try { records = JSON.parse(storage.getItem(key) || '{}')[url] || {}; } catch (_) {}
    function refresh() {
      if (!url || globalThis.navigator?.onLine === false) return Promise.resolve(records);
      if (pending) return pending;
      pending = request(url, {action:'question_read'}, 3500).then(result => {
        if (!result.questions || typeof result.questions !== 'object' || Array.isArray(result.questions)) return;
        records = result.questions;
        try { storage.setItem(key, JSON.stringify({[url]:records})); } catch (_) {}
      }).catch(() => {}).finally(() => { pending = null; });
      return pending.then(() => records);
    }
    return {refresh};
  }
  return {id, validEdit, apply, request, reader};
})();
