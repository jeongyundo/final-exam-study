/* Daily homework goals and progress. Dates use Korea time on every device. */
var HomeworkDaily = (function () {
  'use strict';
  const offset = 9 * 3600000;
  const day = now => new Date(now + offset).toISOString().slice(0,10);
  const startOf = date => Date.parse(date + 'T00:00:00+09:00');
  const validDay = date => typeof date === 'string' && /^20\d\d-\d\d-\d\d$/.test(date)
    && Number.isFinite(startOf(date)) && day(startOf(date)) === date;
  const defaults = {paragraphs:3,minutes:30};
  const validPlan = plan => plan && Number.isInteger(plan.paragraphs) && plan.paragraphs >= 0 && plan.paragraphs <= 40
    && Number.isInteger(plan.minutes) && plan.minutes >= 0 && plan.minutes <= 120;
  const target = plan => validPlan(plan) ? plan : defaults;
  const recordPrefix = 'homework_daily_v1_';
  const paragraphId = /^unit(\d)(\d)-[lr](\d{2})-quick-basic$/;
  function paragraphLabel(id) {
    const match = typeof id === 'string' && id.match(paragraphId);
    return match ? {unit:match[1]+'-'+match[2], number:Number(match[3])} : null;
  }

  function progress(date, plan, records) {
    const start = startOf(date), end = start + 86400000;
    const paragraphs = new Set(), intervals = [];
    for (const record of records) {
      if (!record || record.date !== date) continue;
      for (const id of Array.isArray(record.paragraphs) ? record.paragraphs : []) {
        if (paragraphLabel(id)) paragraphs.add(id);
      }
      for (const interval of Array.isArray(record.intervals) ? record.intervals : []) {
        if (!Array.isArray(interval)) continue;
        const [left,right] = interval;
        if (Number.isFinite(left) && Number.isFinite(right) && left >= start && right <= end && right > left) intervals.push([left,right]);
      }
    }
    intervals.sort((a,b) => a[0] - b[0]);
    let timeMs = 0, previousEnd = start;
    for (const [left,right] of intervals) {
      timeMs += Math.max(0,right - Math.max(left,previousEnd));
      previousEnd = Math.max(previousEnd,right);
    }
    const goal = target(plan), rest = !goal.paragraphs && !goal.minutes;
    const reason = goal.paragraphs && paragraphs.size >= goal.paragraphs ? 'paragraphs'
      : goal.minutes && timeMs >= goal.minutes * 60000 ? 'time' : null;
    return {date,goal,paragraphs:[...paragraphs],timeMs,reason,rest,done:!!reason};
  }

  function create({storage,prefix,planFor,now=Date.now}) {
    const id = globalThis.crypto?.randomUUID?.() || now().toString(36)+'_'+Math.random().toString(36).slice(2);
    let date = day(now()), lastTick = 0, wasWorking = false, changed = false;
    let local = {date,paragraphs:[],intervals:[]}, other = [], lastRead = -Infinity, lastSave = 0;
    const keyFor = value => prefix + recordPrefix + value + '_';
    function flush() {
      if (!changed) return;
      try { storage.setItem(keyFor(date)+id,JSON.stringify(local)); } catch (_) { return; }
      changed = false;
      lastSave = now();
    }
    function current(t = now()) {
      const next = day(t);
      if (next === date) return;
      flush();
      date = next;
      local = {date,paragraphs:[],intervals:[]};
      lastRead = -Infinity;
      lastTick = 0;
      wasWorking = false;
    }
    function snapshot(t = now()) {
      current(t);
      if (t - lastRead >= 5000) {
        other = [];
        const prefix = keyFor(date);
        for (let i=0; i<storage.length; i++) {
          const key = storage.key(i);
          if (!key?.startsWith(prefix) || key === prefix+id) continue;
          try { other.push(JSON.parse(storage.getItem(key))); } catch (_) {}
        }
        lastRead = t;
      }
      return progress(date,planFor(date),[...other,local]);
    }
    function tick(working) {
      const t = now();
      current(t);
      if (working && wasWorking && t > lastTick && t-lastTick <= 2500) {
        const last = local.intervals.at(-1);
        if (last && last[1] === lastTick) last[1] = t;
        else local.intervals.push([lastTick,t]);
        changed = true;
      }
      if ((!working && wasWorking) || t-lastSave >= 10000) flush();
      lastTick = t;
      wasWorking = working;
      return snapshot(t);
    }
    function finishParagraph(set) {
      current();
      if (!set.isQuickPractice || !paragraphLabel(set.id)
          || local.paragraphs.includes(set.id)) return snapshot();
      local.paragraphs.push(set.id);
      changed = true;
      flush();
      return snapshot();
    }
    return {snapshot,tick,flush,finishParagraph};
  }

  function planClient(url, storage) {
    const key = 'homework_daily_plans_v1';
    let records = {}, pending, loaded = false;
    try { records = JSON.parse(storage.getItem(key) || '{}') || {}; } catch (_) {}
    function replace(next) {
      records = next;
      try { storage.setItem(key,JSON.stringify(records)); } catch (_) {}
    }
    function refresh() {
      if (pending) return pending;
      pending = HomeworkQuestionPatches.request(url,{action:'daily_read'},5500).then(result => {
        if (!result.plans || typeof result.plans !== 'object' || Array.isArray(result.plans)) throw Error('INVALID_DAILY_PLANS');
        replace(result.plans);
        loaded = true;
      }).finally(() => { pending = null; });
      return pending;
    }
    async function save(date, plan, secret, expected) {
      const result = await HomeworkQuestionPatches.request(url,{action:'daily_save',date,plan,key:secret,expected},25000);
      replace({...records,[date]:result.record});
      return result.record;
    }
    return {planFor:date=>target(records[date]?.plan),recordFor:date=>records[date],refresh,save,isLoaded:()=>loaded};
  }
  return {day,validDay,defaults,target,validPlan,progress,create,recordPrefix,paragraphLabel,planClient};
})();
