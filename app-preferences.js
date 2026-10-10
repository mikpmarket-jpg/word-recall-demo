(() => {
  'use strict';
  const key='word-recall-preferences-v1', demoKey='word-recall-prototype-v1';
  const store=window.WordRecallData?.isFirstLaunch?window.WordRecallData.local:localStorage;
  function read(k){try{return JSON.parse(store.getItem(k))||{};}catch{return {};}}
  function preferences(){const s=read(key);return {theme:s.theme==='night'?'night':'day',interface:'ru',translation:'ru'};}
  function dictionary(){try{return JSON.parse(window.WordRecallData.local.getItem('word-recall-dictionary-v1'))||window.WORD_RECALL_TEST_FIXTURE?.dictionary||{};}catch{return {};}}
  function prototype(){const s=read(demoKey),d=dictionary();return {paid:s.paid===true,signedIn:s.signedIn===true,content:window.WordRecallData?.isFirstLaunch?window.WordRecallDemo.launch?.content!==false:s.content!==false,dictionary:typeof d.name==='string'?d.name:'',dictionaryEnabled:d.enabled!==false};}
  function write(k,value){try{store.setItem(k,JSON.stringify(value));return true;}catch{return false;}}
  function apply(){const p=preferences();document.documentElement.dataset.theme=p.theme;delete document.documentElement.dataset.textSize;}
  window.WordRecallPreferences={key,demoKey,read:preferences,prototype,save(value){const ok=write(key,{...preferences(),...value});if(ok)apply();return ok;},savePrototype(value){if('dictionary' in value||'dictionaryEnabled' in value){try{const d=dictionary();window.WordRecallData.local.setItem('word-recall-dictionary-v1',JSON.stringify({name:value.dictionary??d.name??'',enabled:value.dictionaryEnabled??d.enabled??true}));return true;}catch{return false;}}const {dictionary:_,dictionaryEnabled:__,...state}=prototype();return write(demoKey,{...state,...value});}};
  document.documentElement.dataset.reviewTools=new URLSearchParams(location.search).get('preview')==='1'?'on':'off';
  apply();window.addEventListener('storage',e=>{if(e.key===key)apply();});
})();
