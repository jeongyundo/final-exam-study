/* 한 진입 화면에서 소단원별 개념과 문제를 함께 엽니다. */
(async function(global){
'use strict';
const app=document.getElementById('app');
try{
 if(new URLSearchParams(location.search).get('teacher')==='1'){document.body.dataset.page='teacher';await global.HomeworkTeacher.mount(app);return;}
 document.body.dataset.page='units';
 const data=global.HOMEWORK_UNIT_CATALOG||global.HomeworkUnitSets.build(global.HOMEWORK_LEGACY_SETS,global.HOMEWORK_EXAM_BANK,global.HOMEWORK_ADVANCED_BANK);
 const questionPatches=/^https?:$/.test(global.location?.protocol||'')
  ?global.HomeworkQuestionPatches?.reader(global.HOMEWORK_STUDENT?.url,global.localStorage):null;
 void questionPatches?.refresh();
 const dailyPlans=global.HOMEWORK_STUDENT?.url&&global.HomeworkDaily?.planClient(global.HOMEWORK_STUDENT.url,global.localStorage);
 const account=await global.HomeworkStudentAccount.open({config:global.HOMEWORK_STUDENT,term:global.HomeworkStudyTerm,sets:data.sets,storage:global.localStorage});
 global.homeworkStudent=account;
 app.innerHTML=global.HOMEWORK_SHELL;
 document.getElementById('practice-links').hidden=true;
 if(!global.HomeworkStudyTerm)global.HomeworkUnitSets.migrateRecords(account.storage,data.sets);
 const sheet=global.HOMEWORK_SHEETS?.units||global.HOMEWORK_SHEETS?.legacy||{};
 global.homeworkApp=global.HomeworkApp.mount({page:global.HomeworkStudyTerm?.page||'units',storagePrefix:global.HomeworkStudyTerm?.storagePrefix||'practice_units_',questionRewardScope:global.HomeworkStudyTerm?.id,storage:account.storage,uid:account.uid,...data,questionPatches,dailyPlans,sets:[...data.sets,...(data.practiceSets||[])],sheetUrl:account.isTest?'':sheet.url||'',history:false,testMode:account.isTest,guidedLearning:true});
 document.getElementById('sets').after(document.getElementById('game-home'));
 account.attach(global.homeworkApp);
 if(dailyPlans&&!account.isTest){
  const refresh=()=>{if(document.visibilityState!=='hidden')void dailyPlans.refresh().then(()=>{if(document.querySelector('#scr-start.on'))global.homeworkApp.renderStart();}).catch(()=>{});};
  refresh();global.setInterval(refresh,60000);document.addEventListener('visibilitychange',refresh);
 }
}catch(error){
 console.error('단원별 학습 시작 실패',error);app.textContent='문제를 불러오지 못했습니다. 파일을 다시 열어 주세요.';
}
})(window);
