/* One dataset boundary for HTML; keep the same contract in the APK storage layer. */
(() => {
  'use strict';
  const modeKey='word-recall-prototype-v1',prefix='word-recall-data:',migrationKey=prefix+'legacy-copied-v1',launchKey='word-recall-first-launch-v1';
  function launchState(){try{const s=JSON.parse(localStorage.getItem(launchKey));return s&&/^launch-[a-z0-9-]+$/.test(s.id)&&['onboarding','ready'].includes(s.phase)?s:null;}catch{return null;}}
  const launch=launchState();
  function enabled(){try{const current=launchState();return current?current.content!==false:JSON.parse(localStorage.getItem(modeKey))?.content!==false;}catch{return true;}}
  const isTest=enabled(),mode=launch?launch.id:isTest?'test':'personal';
  const scoped=k=>/^word-recall-(screen-01-v1$|cycle-|circle-|audio-settings-|video-work-|topic-|playback-|catalog-scroll:|dictionary-v1$)/.test(k);
  const key=k=>(launch?k.startsWith('word-recall-'):scoped(k))?prefix+mode+':'+k:k;
  function storage(name){return window[name];}
  // Old prototype progress belongs to the test dataset. Originals are kept intact.
  for(const name of ['localStorage','sessionStorage'])try{
    const store=storage(name);
    if(store.getItem(migrationKey)!=='1'){
      const keys=Array.from({length:store.length},(_,i)=>store.key(i));
      for(const k of keys)if(scoped(k)&&store.getItem(prefix+'test:'+k)===null)store.setItem(prefix+'test:'+k,store.getItem(k));
      if(name==='localStorage'){
        const old=JSON.parse(store.getItem(modeKey)||'{}');
        if(old.dictionary&&store.getItem(prefix+'test:word-recall-dictionary-v1')===null)store.setItem(prefix+'test:word-recall-dictionary-v1',JSON.stringify({name:old.dictionary,enabled:old.dictionaryEnabled!==false}));
      }
      store.setItem(migrationKey,'1');
    }
  }catch{/* Never delete originals or mark an incomplete copy as complete. */}
  const adapter=name=>({getItem:k=>{const store=storage(name),value=store.getItem(key(k));return value??(!launch&&isTest&&scoped(k)&&store.getItem(migrationKey)!=='1'?store.getItem(k):null);},setItem:(k,v)=>storage(name).setItem(key(k),v),removeItem:k=>storage(name).removeItem(key(k))});
  function emptyExercise(){
    const phone=document.querySelector('.phone');if(!phone)return;
    document.querySelectorAll('audio,video').forEach(e=>{e.pause();e.removeAttribute('src');});
    for(const child of phone.children){child.hidden=true;child.style.display='none';child.inert=true;}
    const screen=document.createElement('div');screen.className='app-screen dataset-empty';
    const header=document.createElement('header');header.className='screen-header';
    const back=document.createElement('a');back.className='header-back';back.href='cycle.html';back.textContent='‹';back.setAttribute('aria-label','К циклу обучения');
    const title=document.createElement('h1');title.className='header-title';title.textContent='Цикл обучения';header.append(back,title);screen.append(header);
    const message=document.createElement('p');message.className='app-note';message.textContent='Для этого упражнения пока нет фраз. Добавьте слова в цикл.';screen.append(message);
    const link=document.createElement('a');link.className='app-button';link.href='cycle.html';link.textContent='Добавить слова';screen.append(link);phone.append(screen);
  }
  function checkMode(){if(enabled()!==isTest||(launchState()?.id||null)!==(launch?.id||null)){document.querySelectorAll('audio,video').forEach(e=>e.pause());window.speechSynthesis?.cancel();location.reload();}}
  const local=adapter('localStorage');
  window.WordRecallData={isTest,mode,key,local,session:adapter('sessionStorage'),emptyExercise,checkMode,isFirstLaunch:!!launch};
  const homeKey='word-recall-home-preview-v1';
  function readHome(){try{const s=JSON.parse(local.getItem(homeKey))||{};return {preview:['start','auto','today-empty','active'].includes(s.preview)?s.preview:'auto',completed:Number.isInteger(s.completed)&&s.completed>=0&&s.completed<=10?s.completed:launch?0:3,restore:s.restore==='empty'?'empty':'found'};}catch{return {preview:'auto',completed:launch?0:3,restore:'found'};}}
  function saveHome(value){try{local.setItem(homeKey,JSON.stringify({...readHome(),...value}));window.dispatchEvent(new Event('word-recall-demo-change'));return true;}catch{return false;}}
  window.WordRecallDemo={readHome,saveHome,get launch(){return launchState();},startLaunch(){try{localStorage.setItem(launchKey,JSON.stringify({id:'launch-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),phase:'onboarding',content:true}));return true;}catch{return false;}},finishOnboarding(){try{const s=launchState();if(!s||s.id!==launch?.id)return false;localStorage.setItem(launchKey,JSON.stringify({...s,phase:'ready'}));return true;}catch{return false;}},exitLaunch(){try{if(launchState()?.id!==launch?.id)return false;localStorage.removeItem(launchKey);return true;}catch{return false;}},setContent(content){try{if(launch){const s=launchState();if(s?.id!==launch.id)return false;localStorage.setItem(launchKey,JSON.stringify({...s,content}));return true;}const s=JSON.parse(localStorage.getItem(modeKey))||{};localStorage.setItem(modeKey,JSON.stringify({...s,content}));return true;}catch{return false;}}};
  document.documentElement.dataset.testData=isTest?'on':'off';
  // Other tabs and BFCache pages adopt the same switch. Old callbacks keep their old namespace.
  window.addEventListener('storage',e=>{if(e.key===modeKey||e.key===launchKey)checkMode();else if(e.key?.startsWith(prefix+mode+':'))window.dispatchEvent(new CustomEvent('word-recall-data-change',{detail:{key:e.key.slice((prefix+mode+':').length)}}));});
  window.addEventListener('pageshow',checkMode);
  // Exercise pages have no bottom navigation; the rehearsal exit remains available there.
  if(launch)document.addEventListener('DOMContentLoaded',()=>{
    const phone=document.querySelector('.phone');if(!phone||phone.querySelector('.first-launch-banner'))return;
    const banner=document.createElement('div');banner.className='first-launch-banner';
    const label=document.createElement('span');label.textContent='Проверка первого запуска';
    const exit=document.createElement('button');exit.type='button';exit.textContent='Завершить';
    exit.onclick=()=>{if(window.WordRecallDemo.exitLaunch())location.href='index.html';else label.textContent='Не удалось завершить проверку. Повторите.';};
    banner.append(label,exit);phone.prepend(banner);
  },{once:true});
})();
