/* Shared cycle snapshot. Prototype choices are explicit, not mastery estimates. */
(() => {
  'use strict';
  const key = 'word-recall-cycle-v1';
  const corpus = window.CYCLE_CORPUS;
  const defaults = () => ({study:3, review:3, phrases:3, meanings:false, order:[1,2,3,4], enabled:[1,2,3,4]});
  let durable = true;
  function valid(s) {
    return s?.version === 1 && typeof s.id === 'string' && s.id.length < 100 &&
      ['ordered','free'].includes(s.mode) && s.settings &&
      Array.isArray(s.settings.order) && s.settings.order.length === 4 && new Set(s.settings.order).size === 4 && s.settings.order.every(n=>[1,2,3,4].includes(n)) &&
      Array.isArray(s.settings.enabled) && s.settings.enabled.length > 0 && s.settings.enabled.every(n=>[1,2,3,4].includes(n)) &&
      ['study','review','phrases'].every(k=>Number.isInteger(s.settings[k]) && s.settings[k]>=0 && s.settings[k]<=100) && s.settings.phrases>0 &&
      Array.isArray(s.words) && (s.words.length > 0 || window.WordRecallData?.isTest===false || window.WordRecallData?.isFirstLaunch) && new Set(s.words.map(w=>w.id)).size === s.words.length && s.words.every(w=>corpus.words.some(c=>c.id===w.id) && ['study','review'].includes(w.role)) &&
      Array.isArray(s.phraseIds) && (s.phraseIds.length > 0 || window.WordRecallData?.isTest===false || window.WordRecallData?.isFirstLaunch) && s.phraseIds.every(id=>corpus.phrases.some(p=>p.id===id && s.words.some(w=>w.id===p.word))) &&
      s.words.every(w=>s.phraseIds.some(id=>corpus.phrases.some(p=>p.id===id && p.word===w.id))) && s.progress && typeof s.progress==='object';
  }
  function read() {
    const candidates=[];
    for (const storage of ['localStorage','sessionStorage']) {
      try { const value=JSON.parse((window.WordRecallData?.[storage==='localStorage'?'local':'session'] || window[storage]).getItem(key)); if(valid(value)) candidates.push(value); } catch { /* Try the other browser storage. */ }
    }
    const state=candidates.sort((a,b)=>(b.updated||0)-(a.updated||0))[0] || null;
    if(state&&!Array.isArray(state.queueIds))state.queueIds=[];
    return state;
  }
  function write(state) {
    state.updated=Date.now(); let saved=false;
    for(const storage of ['localStorage','sessionStorage']) {
      try { (window.WordRecallData?.[storage==='localStorage'?'local':'session'] || window[storage]).setItem(key,JSON.stringify(state)); saved=true; } catch { /* Report if neither storage works. */ }
    }
    durable=saved; return saved;
  }
  function select(settings,preferredWords=[]) {
    // Existing manual choices come first; remaining places use the prepared demo order.
    const ids=[...new Set([...preferredWords.map(w=>w.id),...corpus.words.map(w=>w.id)])].slice(0,settings.study+settings.review);
    const words=ids.map((id,i)=>({id,role:i<settings.study?'study':'review'}));
    const phraseIds=words.flatMap(w=>{
      let pool=corpus.phrases.filter(p=>p.word===w.id);
      if(!settings.meanings) pool=pool.filter(p=>p.sense===pool[0].sense);
      return pool.slice(0,settings.phrases).map(p=>p.id);
    });
    return {words,phraseIds};
  }
  function phraseIdsForWord(id,settings){
    let pool=corpus.phrases.filter(p=>p.word===id);
    if(!settings.meanings&&pool.length)pool=pool.filter(p=>p.sense===pool[0].sense);
    return pool.slice(0,settings.phrases).map(p=>p.id);
  }
  function changeWord(state,id,include,role='study'){
    const word=corpus.words.find(w=>w.id===id);
    if(!word)return {ok:false,message:'Для этого слова пока не подготовлены фразы цикла.'};
    const existing=state.words.find(w=>w.id===id);
    if(include===!!existing)return {ok:true,phraseIds:[]};
    if(include){
      if(state.words.length>=corpus.words.length)return {ok:false,message:'Все доступные слова уже в цикле.'};
      const ids=phraseIdsForWord(id,state.settings);
      if(!ids.length)return {ok:false,message:'Для этого слова пока не подготовлены фразы цикла.'};
      const selectedRole=role==='review'?'review':'study';
      state.words.push({id,role:selectedRole});state.phraseIds.push(...ids);state.settings[selectedRole]++;
      state.queueIds=(state.queueIds||[]).filter(wordId=>wordId!==id);
      try {
        const listenKey='word-recall-cycle-listen-'+state.id;
        const listen=JSON.parse((window.WordRecallData?.local || localStorage).getItem(listenKey));
        if(listen?.statuses){ids.forEach(pid=>listen.statuses[pid]='listen');(window.WordRecallData?.local || localStorage).setItem(listenKey,JSON.stringify(listen));}
      } catch { /* The current page still retains the selection. */ }
      write(state);return {ok:true,phraseIds:ids};
    }
    if(state.words.length===1)return {ok:false,message:'Оставьте хотя бы одно слово в текущем цикле.'};
    state.words=state.words.filter(w=>w.id!==id);
    state.queueIds=[...new Set([...(state.queueIds||[]),id])];
    const removed=state.phraseIds.filter(pid=>corpus.phrases.some(p=>p.id===pid&&p.word===id));
    state.phraseIds=state.phraseIds.filter(pid=>!removed.includes(pid));
    state.settings[existing.role]--;
    write(state);return {ok:true,phraseIds:removed,role:existing.role};
  }
  function create(settings=defaults(), mode='free', preferredWords=[]) {
    return {version:1,demoPhraseCountVersion:1,id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),mode,settings,...select(settings,preferredWords),queueIds:[],progress:{},next:settings.order.find(n=>settings.enabled.includes(n))};
  }
  function available(s){if(!s.phraseIds.length)return [];return s.settings.order.filter(n=>s.settings.enabled.includes(n));}
  function next(s){return available(s).includes(s.next) && s.progress[s.next]?.status!=='skipped' ? s.next : null;}
  function advance(s,from){const order=available(s),i=order.indexOf(from);s.next=order.slice(i+1).find(n=>!['visited','skipped'].includes(s.progress[n]?.status)) || null;}
  function phrases(s){return s.phraseIds.map(id=>corpus.phrases.find(p=>p.id===id));}
  function words(s){return s.words.map(w=>({...corpus.words.find(p=>p.id===w.id),role:w.role}));}
  function setQueue(s,id,inQueue){s.queueIds=inQueue?[...new Set([...(s.queueIds||[]),id])]:(s.queueIds||[]).filter(wordId=>wordId!==id);write(s);}
  const savedState=read(),state=savedState || create();
  if(!savedState&&window.WordRecallData?.isFirstLaunch){state.words=[];state.phraseIds=[];}
  // Upgrade the old one-phrase demonstration once, preserving the cycle and marks.
  // Subsequent settings changes, including one phrase per word, stay user controlled.
  if(state.demoPhraseCountVersion!==1){
    state.demoPhraseCountVersion=1;
    if(state.settings.phrases===1){
      const previous=state.phraseIds.slice();state.settings.phrases=3;
      state.phraseIds=state.words.flatMap(word=>phraseIdsForWord(word.id,state.settings));
      for(const round of [1,2,3]){const progress=state.progress[round];if(progress&&Number.isInteger(progress.position)){const id=previous[progress.position],position=state.phraseIds.indexOf(id);if(position>=0)progress.position=position;}}
    }
  }
  write(state);
  window.WordRecallCycle={key,state,defaults,read,write,create,select,changeWord,setQueue,available,next,advance,phrases,words,get durable(){return durable;}};
})();
