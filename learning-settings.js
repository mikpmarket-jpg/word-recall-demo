(() => {
  'use strict';
  if(window.WordRecallData?.isTest===false&&/circle-/.test(location.pathname))return;
  const $=id=>document.getElementById(id),api=window.WordRecallCycle,wordApi=window.WordRecallWords;
  const dialog=$('cycle-settings'),audioKey='word-recall-audio-settings-v1';
  const audioDefaults={sequence:'ru-en',repeats:2,translation:'both',repeatPause:.5,phrasePause:.5,autoscroll:true,continuation:'next',loop:true};
  const audioFields={sequence:'demo-sequence',repeats:'demo-repeats',translation:'demo-translation',repeatPause:'demo-repeat-pause',phrasePause:'demo-phrase-pause',autoscroll:'demo-autoscroll',continuation:'demo-continuation',loop:'block-loop'};
  const names={1:'Прояснение',2:'Аудирование',3:'Слышать и понимать',4:'Активная речь'};
  let draft,baseId,grammar,view='cycle';
  function readAudio(){
    if(window.WordRecallListening)return window.WordRecallListening.settings();
    let saved={};
    try{saved=JSON.parse((window.WordRecallData?.local || localStorage).getItem(audioKey))||JSON.parse((window.WordRecallData?.local || localStorage).getItem('word-recall-cycle-listen-'+api.state.id))||{};}catch{}
    return Object.fromEntries(Object.entries(audioDefaults).map(([key,value])=>[key,saved[key]??value]));
  }
  function renderGrammar(){document.querySelectorAll('[data-grammar]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.grammar===grammar));}
  function renderRounds(){
    const list=$('round-settings');list.replaceChildren();
    draft.order.forEach((id,index)=>{
      const row=document.createElement('div');row.className='round-setting';
      const label=document.createElement('label'),check=document.createElement('input');check.type='checkbox';check.className='switch';check.id=`round-enabled-${id}`;check.checked=draft.enabled.includes(id);check.dataset.roundEnabled=id;
      check.addEventListener('change',()=>{draft.enabled=check.checked?[...draft.enabled,id]:draft.enabled.filter(n=>n!==id);preview();});
      label.htmlFor=check.id;label.textContent=names[id];row.append(label);const order=document.createElement('div');order.className='round-order';
      for(const delta of [-1,1]){
        const b=document.createElement('button');b.type='button';b.textContent=delta<0?'↑':'↓';b.disabled=index+delta<0||index+delta>=4;b.dataset.move=`${id}:${delta}`;b.setAttribute('aria-label',`${names[id]}: ${delta<0?'выше':'ниже'}`);
        b.addEventListener('click',()=>{[draft.order[index],draft.order[index+delta]]=[draft.order[index+delta],draft.order[index]];renderRounds();list.querySelector(`[data-round-enabled="${id}"]`).focus();});order.append(b);
      }
      row.append(order,check);list.append(row);
    });
  }
  function readCycle(){
    draft.phrases=Number($('cycle-phrases').value);draft.meanings=$('cycle-meanings').checked;
    const available=draft.enabled.includes(3)&&draft.enabled.includes(4);
    $('interleave-enabled').disabled=!available;
    if(!available)$('interleave-enabled').checked=false;
    const enabled=$('interleave-enabled').checked;
    draft.interleave={enabled,listening:Number($('interleave-listening').value),speaking:Number($('interleave-speaking').value)};
    for(const id of ['interleave-listening','interleave-speaking'])$(id).disabled=!enabled;
    $('interleave-counts').classList.toggle('is-inactive',!enabled);
    const plural=(n,one,few,many)=>n%100>=11&&n%100<=14?many:n%10===1?one:n%10>=2&&n%10<=4?few:many;
    const {listening,speaking}=draft.interleave;
    $('interleave-preview').textContent=Number.isInteger(listening)&&listening>0&&Number.isInteger(speaking)&&speaking>0?
      `${listening} ${plural(listening,'фраза','фразы','фраз')} на слух → ${speaking} ${plural(speaking,'задание','задания','заданий')} на речь → повтор`:'';
  }
  function error(){
    if(view==='audio'){
      const repeat=Number($('demo-repeats').value);if(!Number.isInteger(repeat)||repeat<1||repeat>20)return 'Повторов: от 1 до 20.';
      for(const id of ['demo-repeat-pause','demo-phrase-pause']){const n=Number($(id).value);if($(id).value===''||!Number.isFinite(n)||n<0||n>10||n*2!==Math.round(n*2))return 'Пауза: от 0 до 10 секунд с шагом 0,5.';}
      return '';
    }
    if(!Number.isInteger(draft.phrases)||draft.phrases<1||draft.phrases>3)return 'Фраз на слово: от 1 до 3.';
    if(!draft.enabled.length)return 'Нужен хотя бы один круг.';
    for(const id of ['capacity','daily-limit']){const n=Number($(id).value);if(!Number.isInteger(n)||n<1||n>1000)return 'Количество слов: от 1 до 1000.';}
    if(draft.interleave.enabled&&![draft.interleave.listening,draft.interleave.speaking].every(n=>Number.isInteger(n)&&n>=1&&n<=100))return 'Количество заданий: от 1 до 100.';
    return '';
  }
  function preview(){
    if(view==='cycle')readCycle();
    const message=error();$('settings-error').textContent=message;$('settings-error').hidden=!message;$('save-cycle-settings').disabled=!!message;
  }
  function fitSheet(){
    const bounds=document.querySelector('.phone').getBoundingClientRect();
    if(!bounds.width||!bounds.height)return;
    const top=Math.max(12,bounds.top+16),bottom=Math.min(window.innerHeight,bounds.bottom);
    Object.assign(dialog.style,{left:`${bounds.left}px`,top:`${top}px`,width:`${bounds.width}px`,height:`${Math.max(240,bottom-top)}px`,margin:'0'});
  }
  window.addEventListener('resize',()=>{if(dialog.open)fitSheet();});
  function open(section='cycle'){
    wordApi.sync();const saved=api.read();if(saved)api.state=saved;
    view=section==='audio'?'audio':'cycle';
    baseId=api.state.id;draft=structuredClone(api.state.settings);const words=wordApi.state.settings;grammar=words.grammar;
    for(const [id,key] of [['capacity','capacity'],['daily-limit','dailyLimit']])$(id).value=words[key];
    $('auto-enabled').checked=words.autoEnabled;
    $('cycle-phrases').value=draft.phrases;$('cycle-meanings').checked=draft.meanings;
    const mix=draft.interleave||{enabled:false,listening:3,speaking:1};
    $('interleave-enabled').checked=!!mix.enabled;
    $('interleave-listening').value=mix.listening;$('interleave-speaking').value=mix.speaking;
    for(const part of dialog.querySelectorAll('[data-settings-view]')){part.hidden=part.dataset.settingsView!==view;part.disabled=part.hidden;}
    $('cycle-settings-title').textContent=view==='audio'?'Настройки прослушивания':'Настройки цикла обучения';
    $('experiment-settings').open=false;
    const audio=readAudio();for(const [key,id] of Object.entries(audioFields)){$(id)[$(id).type==='checkbox'?'checked':'value']=audio[key];}
    renderGrammar();renderRounds();preview();
    window.WordRecallListening?.pause();dialog.showModal();fitSheet();dialog.querySelector('.sheet-scroll').scrollTop=0;
  }
  for(const [id,section] of [['open-settings','words'],['open-cycle-settings','cycle'],['listen-settings','audio']])$(id)?.addEventListener('click',()=>open(section));
  $('close-cycle-settings').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
  dialog.querySelectorAll('input,select').forEach(field=>field.addEventListener('input',()=>{if(draft)preview();}));
  document.querySelectorAll('[data-grammar]').forEach(b=>b.addEventListener('click',()=>{grammar=b.dataset.grammar;renderGrammar();}));
  $('cycle-settings-form').addEventListener('submit',event=>{
    event.preventDefault();if(view==='cycle')readCycle();if(error()){preview();return;}
    if(view==='audio'){
      const audio={};for(const [key,id] of Object.entries(audioFields)){const field=$(id);audio[key]=field.type==='checkbox'?field.checked:field.type==='number'?Number(field.value):field.value;}
      try{(window.WordRecallData?.local || localStorage).setItem(audioKey,JSON.stringify(audio));}catch{}
      window.WordRecallListening?.apply(audio);dialog.close();return;
    }
    if(!draft.interleave.enabled){
      for(const [key,fallback] of [['listening',3],['speaking',1]])if(!Number.isInteger(draft.interleave[key])||draft.interleave[key]<1||draft.interleave[key]>100)draft.interleave[key]=fallback;
    }
    const latest=api.read()||api.state;
    if(latest.id!==baseId){$('settings-error').textContent='Цикл изменён в другой вкладке.';$('settings-error').hidden=false;return;}
    const rebuilt=['phrases','meanings'].some(key=>draft[key]!==latest.settings[key]);
    let state=latest;
    if(rebuilt){state=api.create(structuredClone(draft),latest.mode,latest.words);state.queueIds=[...new Set([...(latest.queueIds||[]),...latest.words.map(w=>w.id)])].filter(id=>!state.words.some(w=>w.id===id));}
    else{state.settings=structuredClone(draft);if(!api.available(state).includes(state.next))state.next=api.available(state).find(n=>!['visited','skipped'].includes(state.progress[n]?.status))||null;}
    api.state=state;api.write(state);
    wordApi.updateSettings({grammar,capacity:Number($('capacity').value),dailyLimit:Number($('daily-limit').value),autoEnabled:$('auto-enabled').checked});
    dialog.close();
    window.dispatchEvent(new CustomEvent('learning-settings-saved',{detail:{rebuilt}}));
    if(window.CycleContext){if(!api.available(state).includes(2))location.assign('cycle.html');else if(rebuilt)location.assign('circle-2.html?cycle='+encodeURIComponent(state.id));}
  });
  window.WordRecallLearningSettings={open,audioKey};
  if(new URLSearchParams(location.search).get('settings')==='1')open(window.WordRecallListening?'audio':document.body.dataset.nav==='words'?'words':'cycle');
})();
