/* One dataset boundary for HTML; keep the same contract in the APK storage layer. */
(() => {
  'use strict';
  const modeKey='word-recall-prototype-v1',prefix='word-recall-data:',migrationKey=prefix+'legacy-copied-v1';
  function enabled(){try{return JSON.parse(localStorage.getItem(modeKey))?.content!==false;}catch{return true;}}
  const isTest=enabled(),mode=isTest?'test':'personal';
  const scoped=k=>/^word-recall-(screen-01-v1$|cycle-|circle-|audio-settings-|video-work-|topic-|playback-|catalog-scroll:|dictionary-v1$)/.test(k);
  const key=k=>scoped(k)?prefix+mode+':'+k:k;
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
  const adapter=name=>({getItem:k=>{const store=storage(name),value=store.getItem(key(k));return value??(isTest&&scoped(k)&&store.getItem(migrationKey)!=='1'?store.getItem(k):null);},setItem:(k,v)=>storage(name).setItem(key(k),v),removeItem:k=>storage(name).removeItem(key(k))});
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
  function checkMode(){if(enabled()!==isTest){document.querySelectorAll('audio,video').forEach(e=>e.pause());window.speechSynthesis?.cancel();location.reload();}}
  window.WordRecallData={isTest,mode,key,local:adapter('localStorage'),session:adapter('sessionStorage'),emptyExercise,checkMode};
  document.documentElement.dataset.testData=isTest?'on':'off';
  // Other tabs and BFCache pages adopt the same switch. Old callbacks keep their old namespace.
  window.addEventListener('storage',e=>{if(e.key===modeKey)checkMode();else if(e.key?.startsWith(prefix+mode+':'))window.dispatchEvent(new CustomEvent('word-recall-data-change',{detail:{key:e.key.slice((prefix+mode+':').length)}}));});
  window.addEventListener('pageshow',checkMode);
})();
