(function(global){
'use strict';
function create(url, storage) {
  const daily=global.HomeworkDaily, client=daily.planClient(url,storage);
  const node=(tag,text)=>{const element=document.createElement(tag);if(text)element.textContent=text;return element;};
  const element=node('section'),form=node('form'),report=node('p'),completed=node('p'),status=node('p');
  element.className='teacher-section';element.id='teacher-daily-homework';
  form.className='daily-plan-form';status.setAttribute('role','status');
  function field(title,type,attributes={}) {
    const label=node('label',title),input=node('input');
    input.type=type;Object.assign(input,attributes);label.append(input);form.append(label);return input;
  }
  const date=field('날짜 (한국 시간)','date',{required:true,value:daily.day(Date.now())});
  const paragraphs=field('문단 목표','number',{min:0,max:40,step:1,required:true});
  const minutes=field('시간 목표 (분)','number',{min:0,max:120,step:1,required:true});
  const key=field('관리자 편집 키','password',{minLength:20,maxLength:256,required:true,autocomplete:'off'});
  const save=node('button','이 날짜 숙제 저장');save.type='submit';form.append(save);
  const read=node('button','숙제 설정 새로 읽기');read.type='button';form.append(read);
  element.append(node('h2','일별 숙제 관리'),report,completed,form,node('p','문단 또는 시간 목표 중 하나를 달성하면 완료입니다. 0은 해당 목표를 끄고, 둘 다 0이면 쉬는 날입니다.'),status);
  let expected=0,records=[],dirty=false,busy=false;
  function showProgress(){
    const goal=client.planFor(date.value);
    const result=daily.progress(date.value,goal,records);
    const seconds=Math.floor(result.timeMs/1000);
    const text=[goal.paragraphs?result.paragraphs.length+' / '+goal.paragraphs+'문단':'',
      goal.minutes?Math.floor(seconds/60)+'분 '+seconds%60+'초 / '+goal.minutes+'분':''].filter(Boolean).join(' · ');
    report.textContent=result.rest?'쉬는 날':(result.done?'완료 · ':result.timeMs||result.paragraphs.length?'진행 중 · ':'기록 없음 · ')+text;
    const labels=result.paragraphs.map(daily.paragraphLabel)
      .sort((a,b)=>a.unit.localeCompare(b.unit)||a.number-b.number)
      .map(({unit,number})=>unit+'단원 '+number+'문단');
    completed.hidden=!labels.length;
    completed.textContent=labels.length?'완료한 문단 · '+labels.join(', '):'';
  }
  function showPlan(){
    const plan=client.planFor(date.value);
    expected=client.recordFor(date.value)?.revision||0;
    paragraphs.value=plan.paragraphs;minutes.value=plan.minutes;dirty=false;showProgress();
  }
  function controls(){
    save.disabled=busy||!client.isLoaded();
    read.disabled=busy;date.disabled=busy;paragraphs.disabled=busy;minutes.disabled=busy;key.disabled=busy;
  }
  async function refresh(){
    busy=true;controls();status.textContent='숙제 설정을 불러오는 중입니다.';
    try{await client.refresh();if(!dirty)showPlan();status.textContent='';}
    catch(_){status.textContent='온라인 숙제 설정을 읽지 못했습니다. Apps Script 배포 버전과 인터넷 연결을 확인해 주세요.';}
    finally{busy=false;controls();}
  }
  date.onchange=()=>{if(daily.validDay(date.value)){showPlan();void refresh();}};
  paragraphs.oninput=minutes.oninput=()=>{dirty=true;};
  read.onclick=()=>{dirty=false;void refresh();};
  form.onsubmit=async event=>{
    event.preventDefault();
    const plan={paragraphs:paragraphs.valueAsNumber,minutes:minutes.valueAsNumber};
    if(!daily.validPlan(plan)||!daily.validDay(date.value)||!client.isLoaded()||busy)return;
    busy=true;controls();status.textContent='숙제 설정을 저장하는 중입니다.';
    try{
      await client.save(date.value,plan,key.value,expected);
      key.value='';showPlan();status.textContent='저장했습니다. 학생이 사이트를 열면 새 목표를 받습니다.';
    }catch(error){
      status.textContent=error.message==='EDITOR_AUTH_REQUIRED'?'편집 키를 확인해 주세요.':
        error.message==='EDITOR_NOT_CONFIGURED'?'Apps Script에 관리자 편집 키를 설정해 주세요.':
        error.message==='DAILY_PLAN_CONFLICT'?'다른 창에서 목표가 바뀌었습니다. 숙제 설정을 새로 읽어 주세요.':'저장하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    }finally{busy=false;controls();}
  };
  showPlan();void refresh();
  return {element,update(source) {
    records=Object.entries(source).filter(([key])=>key.startsWith('practice_units_final2026_'+daily.recordPrefix))
      .map(([,record])=>{try{return JSON.parse(record.value);}catch(_){return null;}});
    showProgress();
  }};
}
global.HomeworkDailyAdmin={create};
})(window);
