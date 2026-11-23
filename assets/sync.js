/* Code.gs와 호환되는 기록 전송. 페이지별 큐와 전송 주소를 분리합니다. */
(function (global) {
  'use strict';
  function isEndpoint(value) {
    try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch (_) { return false; }
  }
  function create(options) {
    const storage = options.storage || global.localStorage;
    const key = options.key;
    const prefix = key + ':item:';
    const endpoint = String(options.sheetUrl || '').trim();
    const fetcher = options.fetch || global.fetch.bind(global);
    const notify = options.onChange || (() => {});
    const normalize = options.normalizeUid || (value => value);
    let flushing = false, retryTimer = null, backoff = 0, lastError = '', storageError = '';
    const parsedEntries=new Map();
    const newId = () => options.uid + '-' + (global.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
    function save(entry) {
      try { storage.setItem(prefix + entry.row.rid, JSON.stringify(entry)); storageError = ''; }
      catch (error) { storageError = '기기에 기록을 저장하지 못했습니다. 저장 공간과 브라우저 설정을 확인해 주세요.'; notify(); throw error; }
    }
    // Move an existing array queue only after every row has been durably written.
    const legacy = JSON.parse(storage.getItem(key) || '[]');
    if (Array.isArray(legacy) && legacy.length) {
      legacy.forEach(row => save({ destination: isEndpoint(endpoint) ? endpoint : null,
        row: { ...row, uid: normalize(row.uid || options.uid), rid: row.rid || newId() } }));
      storage.removeItem(key);
    }
    function entries(sorted=true) {
      const result = [];
      // A separate storage key per record prevents one tab's append from erasing another's.
      for (let i = 0; i < storage.length; i++) {
        const name = storage.key(i);
        if (!name || !name.startsWith(prefix)) continue;
        try {
          const raw=storage.getItem(name),cached=parsedEntries.get(name);
          const entry=cached?.raw===raw?cached.entry:JSON.parse(raw);
          parsedEntries.set(name,{raw,entry});
          if (entry?.row?.rid) result.push(entry);
        } catch (_) { /* A damaged row stays on the device for recovery. */ }
      }
      return sorted?result.sort((a, b) => String(a.row.at || a.row.endedAt || '').localeCompare(String(b.row.at || b.row.endedAt || ''))):result;
    }
    function state() {
      const pending = entries(false);
      return { pending: pending.length, configured: isEndpoint(endpoint), lastError, storageError,
        waitingForSetup: pending.filter(entry => !isEndpoint(entry.destination || endpoint)).length };
    }
    function readRows() { return entries().map(entry => entry.row); }
    function enqueue(payload) {
      const row = { ...payload, uid: normalize(payload.uid || options.uid), rid: payload.rid || newId() };
      save({ destination: isEndpoint(endpoint) ? endpoint : null, row });
      notify(); void flush(); return row;
    }
    function batch() {
      const available = entries().filter(entry => isEndpoint(entry.destination || endpoint));
      if (!available.length) return null;
      const destination = available[0].destination || endpoint;
      const selected = available.filter(entry => (entry.destination || endpoint) === destination).slice(0, 60);
      selected.forEach(entry => {
        if (!entry.destination) { entry.destination = destination; save(entry); }
      });
      return { destination, selected };
    }
    async function send() {
      let next;
      while ((next = batch())) {
        const response = await fetcher(next.destination, { method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ kind: 'batch', rows: next.selected.map(entry => entry.row) }) });
        const ack = (await response.text()).trim();
        if (response.ok === false || !/^ok(?:\s|$)/.test(ack)) throw new Error(ack.slice(0, 100) || '수신 확인 없음');
        // Unacknowledged records, including beacons, always stay in storage.
        next.selected.forEach(entry => {const name=prefix+entry.row.rid;storage.removeItem(name);parsedEntries.delete(name);});
        lastError = ''; backoff = 0; notify();
      }
    }
    async function flush() {
      if(global.navigator?.onLine===false)return;
      if (flushing) return;
      flushing = true;
      try {
        if (global.navigator?.locks?.request) {
          await global.navigator.locks.request('homework:' + key, { ifAvailable: true }, async lock => { if (lock) await send(); });
        } else await send();
        lastError = ''; backoff = 0;
        if (retryTimer) { global.clearTimeout(retryTimer); retryTimer = null; }
      } catch (error) {
        lastError = String(error.message || error);
        backoff = Math.min(backoff ? backoff * 2 : 3000, 60000);
        if (!retryTimer && options.autoStart !== false) retryTimer = global.setTimeout(() => { retryTimer = null; void flush(); }, backoff);
      } finally { flushing = false; notify(); }
    }
    function beacon() {
      if(global.navigator?.onLine===false)return;
      if (!global.navigator?.sendBeacon) return;
      const next = batch(); if (!next) return;
      try { global.navigator.sendBeacon(next.destination, new Blob([JSON.stringify({ kind: 'batch', rows: next.selected.map(entry => entry.row) })], { type: 'text/plain;charset=utf-8' })); }
      catch (_) { /* No acknowledgement: leave every row queued. */ }
    }
    if (options.autoStart !== false) {
      global.addEventListener('online', flush);
      global.addEventListener('pagehide', beacon);
      global.addEventListener('storage', event => { if (event.key?.startsWith(prefix)) { notify(); void flush(); } });
      global.document.addEventListener('visibilitychange', () => { if (global.document.visibilityState === 'hidden') beacon(); else void flush(); });
      global.setInterval(flush, 20000);
    }
    return { enqueue, flush, beacon, state, readRows };
  }
  global.HomeworkSync = { create, isEndpoint };
})(window);
