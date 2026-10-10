'use strict';
const el = id => document.getElementById(id);
const sound = el('listening-audio');
const LISTEN_KEY = window.CycleContext ? 'word-recall-cycle-listen-'+window.CycleContext.id : 'word-recall-circle-02-v1';
const WORD_KEY = 'word-recall-screen-01-v1';
const phraseById = Object.fromEntries(LISTEN_PHRASES.map(p => [p.id,p]));
const wordById = Object.fromEntries(LISTEN_WORDS.map(w => [w.id,w]));
const spokenWordById = Object.fromEntries(window.CYCLE_CORPUS.words.map(w=>[w.id,w]));
const defaults = () => ({version:2,mode:'phrases',bucket:'listen',sample:false,wordIds:LISTEN_WORDS.slice(0,3).map(w=>w.id),statuses:Object.fromEntries(LISTEN_PHRASES.map(p=>[p.id,'listen'])),showTranslation:false,showWordTranslation:true,loop:true,rate:1,sequence:'ru-en',repeats:2,translation:'both',repeatPause:.5,phrasePause:.5,autoscroll:true,continuation:'next'});
let view = defaults();
try {
  const saved = JSON.parse((window.WordRecallData?.local || localStorage).getItem(LISTEN_KEY));
  if([1,2].includes(saved?.version)) {
    view = {...view,...saved};
    view.version=2;
    view.mode=['words','phrases'].includes(view.mode)?view.mode:'phrases';
    view.bucket=({train:'listen',study:view.mode==='words'?'study':'cycle'}[view.bucket])||view.bucket;
    view.bucket=(view.mode==='words'?['study','cycle']:['cycle','listen','heard']).includes(view.bucket)?view.bucket:(view.mode==='words'?'cycle':'listen');
    view.wordIds=Array.isArray(saved.wordIds)?saved.wordIds.filter(id=>wordById[id]):LISTEN_WORDS.slice(0,3).map(w=>w.id);
    view.statuses=Object.fromEntries(LISTEN_PHRASES.map(p=>[p.id,({train:'listen',study:'listen'}[saved.statuses?.[p.id]])||(['listen','heard','excluded'].includes(saved.statuses?.[p.id])?saved.statuses[p.id]:'listen')]));
    if(!['ru-en','en','en-ru'].includes(view.sequence))view.sequence='ru-en';
    if(!['text','sound','both'].includes(view.translation))view.translation='both';
    view.repeats=Math.max(1,Math.min(20,Math.floor(Number(view.repeats)||2)));
    view.repeatPause=Math.max(0,Math.min(10,Number(view.repeatPause)||0));
    view.phrasePause=Math.max(0,Math.min(10,Number(view.phrasePause)||0));
    if(!['next','single'].includes(view.continuation))view.continuation='next';
    if(![.75,.85,1,1.15,1.3].includes(view.rate))view.rate=1;
  }
} catch { /* The demo remains usable without storage. */ }
const audioSettingKeys=['sequence','repeats','translation','repeatPause','phrasePause','autoscroll','continuation','loop'];
try{const audio=JSON.parse((window.WordRecallData?.local || localStorage).getItem('word-recall-audio-settings-v1'));if(audio)for(const key of audioSettingKeys)if(key in audio)view[key]=audio[key];}catch{}
let lastMove=null, toastTimer, pending=null, generation=0, suppressClick=false;
let selectedId=window.CycleContext ? window.WordRecallCycle.phrases(window.WordRecallCycle.state)[window.CycleContext.position(window.CycleContext.phrases.length)]?.id : null, selectedWordId=phraseById[selectedId]?.word||null;
let session={playing:false,id:null,kind:'phrases',scope:'block',steps:[],step:0,ids:[]};
function persist(){try{(window.WordRecallData?.local || localStorage).setItem(LISTEN_KEY,JSON.stringify(view));}catch{/* Session-only state remains functional. */}}
function sourceWords(){
  if(view.sample)return LISTEN_WORDS.filter(w=>['time','way','day'].includes(w.id));
  try {
    const source=JSON.parse((window.WordRecallData?.local || localStorage).getItem(WORD_KEY));
    if(source?.version===1 && source.statuses)return LISTEN_WORDS.filter(w=>source.statuses[w.id]==='learn');
  } catch { /* Use the same initial list as the selection prototype. */ }
  return LISTEN_WORDS.slice(0,12);
}
function cycleWords(){return window.CycleContext?window.WordRecallCycle.words(window.WordRecallCycle.state):LISTEN_WORDS.filter(w=>view.wordIds.includes(w.id));}
function waitingWords(){
  const selected=new Set(cycleWords().map(w=>w.id));
  const queued=window.CycleContext?(window.WordRecallCycle.state.queueIds||[]).map(id=>wordById[id]).filter(Boolean):[];
  return [...new Map([...sourceWords(),...queued].filter(w=>!selected.has(w.id)).map(w=>[w.id,w])).values()];
}
function phrases(){
  if(window.CycleContext)return window.WordRecallCycle.phrases(window.WordRecallCycle.state);
  const ids=new Set(cycleWords().map(w=>w.id));return LISTEN_PHRASES.filter(p=>ids.has(p.word));
}
function labelBucket(bucket){return {study:'Изучаю',cycle:'Текущий цикл',listen:'Аудирование',heard:'Прослушано',excluded:'Текущий цикл'}[bucket];}
function toast(message,undo=false){clearTimeout(toastTimer);el('listen-toast-text').textContent=message;el('listen-undo').hidden=!undo;el('listen-toast').hidden=false;toastTimer=setTimeout(()=>{el('listen-toast').hidden=true;lastMove=null;},undo?9000:4500);}
function clearToast(){clearTimeout(toastTimer);el('listen-toast').hidden=true;lastMove=null;}
function wordPhrases(id){return phrases().filter(p=>p.word===id);}
function firstWordPhrase(id){const available=view.mode==='words'&&view.bucket==='study'?LISTEN_PHRASES.filter(p=>p.word===id):wordPhrases(id);return (view.mode==='phrases'&&view.bucket==='listen'?available.filter(p=>view.statuses[p.id]==='listen'):available)[0];}
function destination(mode,bucket,direction){
  if(mode==='words')return bucket==='study'&&direction>0?'cycle':bucket==='cycle'&&direction<0?'study':null;
  if(bucket==='cycle')return direction>0?'listen':null;
  if(bucket==='listen')return direction>0?'heard':direction<0?'excluded':null;
  return bucket==='heard'&&direction<0?'listen':null;
}
function countBucket(bucket){
  if(view.mode==='words')return bucket==='study'?waitingWords().length:bucket==='cycle'?cycleWords().length:0;
  return bucket==='cycle'?phrases().length:phrases().filter(p=>view.statuses[p.id]===bucket).length;
}
function translationVisible(p){const step=session.steps[session.step];return view.showTranslation || (session.playing && session.id===p.id && step?.language==='ru' && view.translation!=='sound');}
function renderChrome(){
  for(const mode of ['words','phrases']){el('mode-'+mode).setAttribute('aria-selected',view.mode===mode);el('mode-'+mode).tabIndex=view.mode===mode?0:-1;}
  el('bucket-study').hidden=view.mode!=='words';
  el('bucket-cycle').hidden=false;
  el('bucket-listen').hidden=view.mode!=='phrases';
  el('bucket-heard').hidden=view.mode!=='phrases';
  for(const bucket of ['study','cycle','listen','heard']){el('bucket-'+bucket).setAttribute('aria-selected',view.bucket===bucket);el('bucket-'+bucket).tabIndex=view.bucket===bucket?0:-1;el('count-'+bucket).textContent=countBucket(bucket);}
  el('listening-list').setAttribute('aria-labelledby','bucket-'+view.bucket);
  el('block-loop').checked=view.loop;
  el('listen-translation').setAttribute('aria-pressed',view.mode==='words'?view.showWordTranslation:view.showTranslation);
  el('listen-tempo-value').textContent=view.rate.toLocaleString('ru-RU',{minimumFractionDigits:1})+'×';
  renderPlayer();
}
function renderPlayer(){
  const visible=playerVisible(),selected=view.mode==='words'?selectedWordId:selectedId,record=audioRecord(view.mode,selected);
  el('listening-footer').hidden=!visible;
  el('listen-play').disabled=!visible||!record?.audio&&!session.id;
  el('listen-play').setAttribute('aria-label',session.playing?'Пауза':view.mode==='words'?'Слушать слова':'Слушать фразы');
  el('listen-play-icon').setAttribute('d',session.playing?'M7 5h4v14H7zM14 5h4v14h-4z':'m8 5 11 7-11 7z');
  el('listening-playback').hidden=!session.id;
  if(!session.id) {
    el('listening-status').textContent='';
    el('listening-position').textContent='';
  } else {
    const step=session.steps[session.step];
    el('listening-status').textContent=!session.playing?'Пауза':step?.language==='ru'?'Перевод фразы':`${session.kind==='words'?'Слово':'Диктор'} · повтор ${step?.repeat||1} из ${view.repeats}`;
    const block=session.ids; const position=block.indexOf(session.id);
    el('listening-position').textContent=session.scope!=='single'&&position>=0?`${position+1} / ${block.length}`:'';
  }
}
function renderRows(){
  const list=el('listening-list'), scroll=list.scrollTop;
  const items=view.mode==='phrases'?(view.bucket==='cycle'?phrases():phrases().filter(p=>view.statuses[p.id]===view.bucket)):(view.bucket==='study'?waitingWords():cycleWords());
  const activeItem=view.mode==='phrases'?selectedId:selectedWordId;
  if(!items.some(item=>item.id===activeItem)){
    selectedWordId=view.mode==='words'?(items[0]?.id||null):null;
    selectedId=view.mode==='phrases'?(items[0]?.id||null):(firstWordPhrase(selectedWordId)?.id||null);
  }
  renderPlayer();
  list.replaceChildren();
  if(!items.length){
    const empty=document.createElement('div');empty.className='listen-empty';
    const mark=document.createElement('div');mark.className='empty-symbol';mark.textContent=view.bucket==='heard'?'✓':'＋';
    const heading=document.createElement('h3');heading.textContent=view.mode==='words'?'Нет слов':'Нет фраз';
    empty.append(mark,heading);list.append(empty);return;
  }
  items.forEach((item,index)=>{
    if(view.mode==='phrases'&&view.bucket==='cycle'&&(index===0||items[index-1].word!==item.word)){
      const heading=document.createElement('h3');heading.className='phrase-group';
      const total=items.filter(p=>p.word===item.word).length;
      heading.textContent=`${item.word} · ${total}`;list.append(heading);
    }
    const row=document.createElement('div');row.className='listen-row';row.tabIndex=0;row.dataset.id=item.id;row.dataset.bucket=view.bucket;
    const under=document.createElement('div');under.className='listen-underlay';under.setAttribute('aria-hidden','true');
    const front=document.createElement('div');front.className='listen-front';
    const actions=[];for(const direction of [-1,1]){const to=destination(view.mode,view.bucket,direction);if(to)actions.push(`${direction<0?'Стрелка влево':'Стрелка вправо'}: в «${labelBucket(to)}»`);}
    if(view.mode==='phrases'){
      row.setAttribute('aria-label',item.text+'. '+actions.join('. '));
      const sentence=document.createElement('p');sentence.className='phrase-line';sentence.lang='en';
      const tokens=item.text.split(/([A-Za-z]+(?:['’][A-Za-z]+)?)/g);
      for(const token of tokens){
        if(/^[A-Za-z]/.test(token))sentence.append(wordButton(token,item));
        else sentence.append(document.createTextNode(token));
      }
      const ru=document.createElement('p');ru.className='phrase-ru';ru.textContent=item.translation;ru.hidden=!translationVisible(item);
      front.append(sentence,ru);
      row.addEventListener('click',()=>selectCard(item.id));
    }else{
      front.classList.add('word-listen-front');const available=view.bucket==='study'?LISTEN_PHRASES.filter(p=>p.word===item.id):wordPhrases(item.id);
      row.dataset.unavailable=String(!available.length);row.setAttribute('aria-label',item.word+'. '+item.translation+'. '+actions.join('. '));
      const info=document.createElement('div');const name=wordButton(item.word,null,item);name.classList.add('word-listen-name');
      info.append(name);
      if(item.translation){const meaning=document.createElement('div');meaning.className='word-listen-translation';meaning.textContent=item.translation;meaning.hidden=!view.showWordTranslation;info.append(meaning);}
      front.append(info);
      row.addEventListener('click',()=>selectCard(firstWordPhrase(item.id)?.id||null,item.id));
    }
    row.addEventListener('keydown',event=>{if(event.target===row&&['Enter',' '].includes((event.detail?.key||event.key))){event.preventDefault();selectCard(view.mode==='phrases'?item.id:(firstWordPhrase(item.id)?.id||null),view.mode==='words'?item.id:null);}});
    row.addEventListener('keydown',event=>{if((event.detail?.key||event.key)==='ArrowLeft'||(event.detail?.key||event.key)==='ArrowRight'){const to=destination(view.mode,view.bucket,(event.detail?.key||event.key)==='ArrowLeft'?-1:1);if(to){event.preventDefault();move(item.id,to);}}});
    row.append(under,front);list.append(row);bindSwipe(row,front,under,item.id);
  });
  list.scrollTop=scroll; updateActive();
}
function updateActive(){
  const p=session.id?(session.kind==='words'?firstWordPhrase(session.id):phraseById[session.id]):phraseById[selectedId];
  if(p&&window.CycleContext){const position=window.WordRecallCycle.state.phraseIds.indexOf(p.id);if(position>=0)window.CycleContext.remember(position);}
  el('listening-list').querySelectorAll('.listen-row').forEach(row=>{
    const active=view.mode==='phrases'?row.dataset.id===p?.id:row.dataset.id===(p?.word||selectedWordId);
    row.classList.toggle('is-current',active);
    row.setAttribute('aria-current',active?'true':'false');
    const ru=row.querySelector('.phrase-ru');if(ru)ru.hidden=!translationVisible(phraseById[row.dataset.id]);
    const meaning=row.querySelector('.word-listen-translation');if(meaning)meaning.hidden=!view.showWordTranslation;
  });
}
function render(){renderRows();renderChrome();}
function move(id,to){
  const list=el('listening-list'),hadFocus=list.contains(document.activeElement),rowIndex=[...list.children].findIndex(row=>row.dataset.id===id);
  if(view.mode==='words'){
    const oldStatus=to==='cycle'?'study':'cycle';
    if(window.CycleContext){
      const result=window.WordRecallCycle.changeWord(window.WordRecallCycle.state,id,to==='cycle');
      if(!result.ok)return;
      if(to==='cycle')result.phraseIds.forEach(pid=>view.statuses[pid]='listen');
      lastMove={mode:'words',id,to:oldStatus,role:result.role};
    }else{
      const available=LISTEN_PHRASES.filter(p=>p.word===id);
      if(to==='cycle'&&!available.length)return;
      view.wordIds=to==='cycle'?[...view.wordIds,id]:view.wordIds.filter(word=>word!==id);
      if(to==='cycle')available.forEach(p=>view.statuses[p.id]='listen');
      lastMove={mode:'words',id,to:oldStatus};
    }
  }else{
    const changed=[phraseById[id]];if(!changed[0])return;
    const previous=Object.fromEntries(changed.map(p=>[p.id,view.statuses[p.id]]));
    changed.forEach(p=>view.statuses[p.id]=to);
    lastMove={mode:'phrases',previous};
  }
  if(id===session.id||phraseById[session.id]?.word===id)stop();
  render();persist();toast(`В «${labelBucket(to)}»`,true);
  if(hadFocus){const rows=list.querySelectorAll('.listen-row');(rows[Math.min(rowIndex,rows.length-1)]||el('bucket-'+view.bucket)).focus({preventScroll:true});}
}
function bindSwipe(row,front,under,id){
  let gesture=null;
  row.addEventListener('pointerdown',event=>{if(!event.isPrimary||event.button!==0)return;gesture={x:event.clientX,y:event.clientY,pointer:event.pointerId,dx:0,horizontal:false};});
  row.addEventListener('pointermove',event=>{
    if(!gesture||gesture.pointer!==event.pointerId)return;
    const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;
    if(!gesture.horizontal&&Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)){gesture=null;return;}
    if(!gesture.horizontal&&Math.abs(dx)>9&&Math.abs(dx)>Math.abs(dy)){gesture.horizontal=true;row.setPointerCapture(event.pointerId);row.classList.add('dragging');}
    if(!gesture.horizontal)return;
    const direction=dx<0?-1:1,to=destination(view.mode,view.bucket,direction);
    gesture.dx=to?Math.min(150,Math.abs(dx))*direction:0;
    row.classList.toggle('drag-left',direction<0);row.classList.toggle('drag-right',direction>0);
    under.textContent=to?'В «'+labelBucket(to)+'»':'';front.style.transform=`translateX(${gesture.dx}px)`;
  });
  const end=event=>{
    if(!gesture||gesture.pointer!==event.pointerId)return;
    const commit=event.type==='pointerup'&&Math.abs(gesture.dx)>=70;
    const to=destination(view.mode,view.bucket,gesture.dx<0?-1:1);
    if(gesture.horizontal){suppressClick=true;setTimeout(()=>suppressClick=false,0);}
    gesture=null;
    if(commit&&to)move(id,to);else{front.style.transition='transform 160ms ease';front.style.transform='';setTimeout(()=>{front.style.transition='';row.classList.remove('dragging');},165);}
  };
  row.addEventListener('pointerup',end);row.addEventListener('pointercancel',end);row.addEventListener('lostpointercapture',end);
}
el('listening-list').addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopImmediatePropagation();}},true);
function clearPending(){if(pending)clearTimeout(pending.timer);pending=null;}
function schedule(fn,ms){clearPending();pending={fn,remaining:ms,started:Date.now(),timer:null};if(session.playing)pending.timer=setTimeout(()=>{const action=pending?.fn;pending=null;if(session.playing)action?.();},ms);}
function playerVisible(){return view.mode==='phrases'?view.bucket==='listen':view.bucket==='cycle';}
function audioRecord(kind,id){return kind==='words'?spokenWordById[id]:phraseById[id];}
function selectPlaybackItem(kind,id){if(kind==='words'){selectedWordId=id;selectedId=firstWordPhrase(id)?.id||null;}else{selectedId=id;selectedWordId=phraseById[id]?.word||null;}}
function stop(){generation++;clearPending();sound.pause();session={playing:false,id:null,kind:view.mode,scope:'block',steps:[],step:0,ids:[]};el('listening-progress').style.width='0%';renderPlayer();updateActive();}
function pause(){
  session.playing=false;sound.pause();
  if(pending){clearTimeout(pending.timer);pending.remaining=Math.max(0,pending.remaining-(Date.now()-pending.started));pending.timer=null;}
  renderPlayer();updateActive();
}
async function resume(){
  if(!playerVisible())return;
  if(!session.id){const selected=view.mode==='words'?selectedWordId:selectedId;if(selected)start(selected,view.continuation==='single'?'single':'block');return;}
  session.playing=true;
  if(pending){const fn=pending.fn,ms=pending.remaining;schedule(fn,ms);}else{try{await sound.play();if(!session.playing)sound.pause();}catch{pause();toast('Не удалось включить запись.');}}
  renderPlayer();updateActive();
}
function plan(kind=view.mode){
  const english=Array.from({length:view.repeats},(_,i)=>({language:'en',repeat:i+1}));
  if(kind==='words'||view.sequence==='en')return english;
  return view.sequence==='ru-en'?[{language:'ru'},...english]:[...english,{language:'ru'}];
}
function playbackIds(){
  if(view.mode==='phrases')return phrases().filter(p=>view.statuses[p.id]==='listen').map(p=>p.id);
  return cycleWords().filter(word=>spokenWordById[word.id]?.audio).map(word=>word.id);
}
function start(id,scope='block'){
  if(!playerVisible()||!audioRecord(view.mode,id)?.audio)return;
  stop();selectPlaybackItem(view.mode,id);session={playing:true,id,kind:view.mode,scope,steps:plan(),step:0,ids:playbackIds()};playStep();
}
async function playStep(){
  const p=audioRecord(session.kind,session.id),step=session.steps[session.step];if(!p||!step){advanceItem();return;}
  const token=++generation;clearPending();sound.pause();renderPlayer();updateActive();
  const row=el('listening-list').querySelector(`.listen-row[data-id="${session.id}"]`);
  if(view.autoscroll&&row){const list=el('listening-list'),top=row.offsetTop-(list.firstElementChild?.offsetTop||0);if(top<list.scrollTop || top+row.offsetHeight>list.scrollTop+list.clientHeight)list.scrollTo({top,behavior:'smooth'});}
  el('listening-progress').style.width='0%';
  if(step.language==='ru'&&view.translation==='text'){schedule(completeStep,2000);return;}
  sound.src=step.language==='ru'?p.translationAudio:p.audio;sound.playbackRate=view.rate;
  try{await sound.play();if(token===generation&&!session.playing)sound.pause();}
  catch{if(token===generation){pause();toast('Браузер не смог включить локальную запись.');}}
}
function completeStep(){
  if(!session.playing)return;
  session.step++;
  if(session.step>=session.steps.length)schedule(advanceItem,view.phrasePause*1000);
  else schedule(playStep,view.repeatPause*1000);
}
function advanceItem(){
  if(session.scope==='single'){stop();return;}
  const block=session.ids.filter(id=>session.kind==='words'?cycleWords().some(word=>word.id===id)&&spokenWordById[id]?.audio:phrases().some(p=>p.id===id)&&view.statuses[id]==='listen');if(!block.length){stop();return;}
  const next=block.indexOf(session.id)+1;
  if(next>=block.length&&!view.loop){stop();return;}
  const id=block[next%block.length];selectPlaybackItem(session.kind,id);session.id=id;session.steps=plan(session.kind);session.step=0;playStep();
}
sound.addEventListener('ended',()=>{if(session.playing)completeStep();});
sound.addEventListener('timeupdate',()=>{if(Number.isFinite(sound.duration)&&sound.duration>0)el('listening-progress').style.width=(sound.currentTime/sound.duration*100)+'%';});
el('listen-play').addEventListener('click',()=>session.playing?pause():resume());
el('listen-translation').addEventListener('click',()=>{if(view.mode==='words')view.showWordTranslation=!view.showWordTranslation;else view.showTranslation=!view.showTranslation;renderChrome();updateActive();persist();});
el('listen-tempo').addEventListener('click',()=>{const rates=[.75,.85,1,1.15,1.3];view.rate=rates[(rates.indexOf(view.rate)+1)%rates.length];sound.playbackRate=view.rate;renderChrome();persist();});
document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{stop();view.mode=button.dataset.mode;if(view.mode==='words'&&!['study','cycle'].includes(view.bucket))view.bucket='cycle';if(view.mode==='phrases'&&view.bucket==='study')view.bucket='cycle';render();el('listening-list').scrollTop=0;persist();}));
document.querySelectorAll('[data-bucket]').forEach(button=>button.addEventListener('click',()=>{stop();view.bucket=button.dataset.bucket;render();el('listening-list').scrollTop=0;persist();}));
for(const group of ['[data-mode]','[data-bucket]']){
  document.querySelectorAll(group).forEach(button=>button.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes((event.detail?.key||event.key)))return;event.preventDefault();const buttons=[...document.querySelectorAll(group)].filter(b=>!b.hidden);const i=buttons.indexOf(button),next=buttons[(i+((event.detail?.key||event.key)==='ArrowRight'?1:buttons.length-1))%buttons.length];next.click();next.focus();}));
}
el('listen-undo').addEventListener('click',()=>{
  if(!lastMove)return;
  if(lastMove.mode==='words'){
    if(window.CycleContext){const result=window.WordRecallCycle.changeWord(window.WordRecallCycle.state,lastMove.id,lastMove.to==='cycle',lastMove.role);if(!result.ok){toast(result.message);return;}if(lastMove.to==='cycle')result.phraseIds.forEach(pid=>view.statuses[pid]='listen');}
    else view.wordIds=lastMove.to==='cycle'?[...view.wordIds,lastMove.id]:view.wordIds.filter(id=>id!==lastMove.id);
  }else Object.assign(view.statuses,lastMove.previous);
  clearToast();render();persist();
});
el('listen-dismiss').addEventListener('click',clearToast);
function renderDemo(){el('demo-continuation').value=view.continuation;el('block-loop').checked=view.loop;el('demo-sequence').value=view.sequence;el('demo-repeats').value=view.repeats;el('demo-translation').value=view.translation;el('demo-repeat-pause').value=view.repeatPause;el('demo-phrase-pause').value=view.phrasePause;el('demo-autoscroll').checked=view.autoscroll;}
el('demo-sample').addEventListener('click',()=>{stop();view.sample=true;render();persist();});
el('demo-real').addEventListener('click',()=>{stop();view.sample=false;render();persist();});
el('demo-reset').addEventListener('click',()=>{stop();clearToast();view=defaults();selectedId=null;selectedWordId=null;renderDemo();render();persist();});
window.addEventListener(window.WordRecallData?'word-recall-data-change':'storage',event=>{if((event.detail?.key||event.key)===WORD_KEY){stop();render();}});
window.addEventListener('pagehide',()=>{pause();});
renderDemo();render();
window.WordRecallListening={settings:()=>Object.fromEntries(audioSettingKeys.map(key=>[key,view[key]])),pause:()=>{if(session.playing)pause();},apply:settings=>{stop();Object.assign(view,settings);renderDemo();render();persist();}};

function selectCard(id,wordId=null){
  stop();selectedId=id;selectedWordId=wordId||phraseById[id]?.word||null;renderPlayer();updateActive();
}
function wordButton(token,phrase=null,word=null){
  const button=document.createElement('button');button.className='listen-word';button.textContent=token;button.setAttribute('aria-haspopup','dialog');
  if(phrase){const target=window.CYCLE_CORPUS.words.find(w=>w.id===phrase.word);if((target?.forms||[phrase.word]).includes(token.toLowerCase()))button.classList.add('is-target');}
  button.addEventListener('click',event=>{event.stopPropagation();openDictionary(token,phrase,word);});
  return button;
}
function openDictionary(token,phrase,word){
  if(session.playing)pause();
  const key=token.toLowerCase();
  const entry=LISTEN_CONTEXT_DEFINITIONS[phrase?.id]?.[key]||LISTEN_DEFINITIONS[key];
  el('listen-dictionary-context').textContent=phrase?'ЗНАЧЕНИЕ В ЭТОЙ ФРАЗЕ':'СЛОВАРЬ';
  el('listen-dictionary-word').textContent=token;
  el('listen-definition-title').textContent=entry?.[0]||word?.translation||'';
  el('listen-definition-description').textContent=entry?.[1]||'';
  el('listen-definition-title').hidden=!el('listen-definition-title').textContent;
  el('listen-definition-description').hidden=!el('listen-definition-description').textContent;
  el('listen-definition-title').closest('.definition-block').hidden=!el('listen-definition-title').textContent&&!el('listen-definition-description').textContent;
  el('listen-definition-example').textContent=phrase?.text||'';el('listen-definition-example').hidden=!phrase;
  el('listen-definition-translation').textContent=phrase?.translation||'';el('listen-definition-translation').hidden=!phrase;
  el('listen-dictionary').showModal();
}
for(const [dialog,close] of [['listen-dictionary','close-listen-dictionary']]){
  el(close).addEventListener('click',()=>el(dialog).close());
  el(dialog).addEventListener('click',event=>{if(event.target===el(dialog)){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)el(dialog).close();}});
}

if(window.WordRecallData?.isTest===false)window.WordRecallData.emptyExercise();
