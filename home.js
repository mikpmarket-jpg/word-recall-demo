(() => {
  'use strict';
  const cycleAPI = window.WordRecallCycle;
  const nav=window.WordRecallNavigation;
  const data = window.APP_CATALOG;
  const fixture = window.WORD_RECALL_TEST_FIXTURE?.home;
  const $ = id => document.getElementById(id);
  const demo=window.WordRecallDemo,firstLaunch=window.WordRecallData?.isFirstLaunch;
  let preview = new URLSearchParams(location.search).get('screen')==='start'?'start':demo.readHome().preview, completed = fixture?demo.readHome().completed:0;
  const el = (tag, cls, text) => {const node=document.createElement(tag);node.className=cls||'';if(text!=null)node.textContent=text;return node;};
  const url = (page, params) => page+'?'+new URLSearchParams(params);
  const read = key => {try{return JSON.parse((window.WordRecallData?.local || localStorage).getItem(key));}catch{return null;}};
  const array = key => {const value=read(key);return Array.isArray(value)?value.filter(x=>x&&typeof x==='object'):[];};
  const count = (n, forms) => `${n} ${forms[n%100>=11&&n%100<=14?2:n%10===1?0:n%10>=2&&n%10<=4?1:2]}`;
  const time = value => {const sec=Math.max(0,Math.floor(Number(value)||0));return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;};
  function cover(src, cls) {
    if(!src)return el('span',cls+' home-material-placeholder','w·');
    const image=el('img',cls);image.src=src;image.alt='';image.loading='lazy';image.draggable=false;
    image.addEventListener('error',()=>image.replaceWith(el('span',cls+' home-material-placeholder','w·')),{once:true});
    return image;
  }
  function state() {return cycleAPI.read() || cycleAPI.state;}
  function learning() {
    const s=state();
    // Explicit prototype views never clear stored practice or viewing history.
    if(firstLaunch){const words=read('word-recall-screen-01-v1');preview=!s.words.length&&!Object.keys(words?.statuses||{}).length?'start':'auto';}
    const starting=preview==='start';
    document.querySelector('.home-today').hidden=starting;
    document.querySelector('.home-screen').classList.toggle('home-start',starting);
    const empty=!s.words.length&&!s.phraseIds.length;
    $('home-continue-label').textContent=empty?'Добавить слова':starting?'Начать обучение':'Продолжить обучение';
    const today=firstLaunch?{newWords:read('word-recall-screen-01-v1')?.addedToday||0,reviewWords:0,minutes:0}:fixture&&preview!=='today-empty'?fixture.today:{newWords:0,reviewWords:0,minutes:0};
    $('today-new').textContent=today.newWords;
    $('today-review').textContent=today.reviewWords;
    $('today-minutes').replaceChildren(document.createTextNode(today.minutes),el('small','',' мин'));
    $('home-continue').href='cycle.html';
    $('home-cycle-state').textContent=`${count(s.words.length,['слово','слова','слов'])} · ${count(s.phraseIds.length,['фраза','фразы','фраз'])}`;
  }
  function goals() {
    $('home-goals').hidden=!fixture;
    if(!fixture)return;
    const track=$('goals-track'),left=track.scrollLeft;track.replaceChildren();
    const done=preview==='start'?0:completed;
    for(const goal of fixture.goals){
      const card=el('a','home-goal');card.href=nav.enter(goal.href);
      card.append(cover(goal.cover,'home-goal-image'));
      const copy=el('div','home-goal-copy'),remaining=Math.max(0,goal.cycles-done);
      copy.append(el('h3','',goal.title),el('p','home-goal-effort',remaining?`${preview==='start'?'':'Ещё '}${count(remaining,['цикл','цикла','циклов'])} по ${fixture.minutesPerCycle} мин`:'Пора смотреть'));
      card.append(copy);track.append(card);
    }
    track.scrollLeft=left;
  }
  function workingMaterials() {
    const items=[];
    for(const session of window.WordRecallVideoWork.read()){
      const show=data.shows.find(x=>x.id===session.collectionId),clip=show?.clips.find(x=>x.id===session.materialId);
      if(!show||show.available===false||!clip||clip.available===false)continue;
      const saved=read('word-recall-playback-v1:'+clip.id);
      const index=saved?.index??session.position?.index;
      const seconds=saved?.videoTime??session.position?.seconds??(typeof session.position==='number'?session.position:null);
      const caption=session.mode==='video'&&Number.isFinite(seconds)?`${time(seconds)} из ${time(clip.sec)}`:Number.isFinite(index)?`Фраза ${index+1}`:{audio:'Аудирование',cards:'Карточки фраз',video:'Продолжить просмотр'}[session.mode];
      items.push({title:clip.title.replace(/\s*[|｜]\s*Friends\s*$/,'').trim(),cover:clip.cover||show.cover,caption,lastUsed:session.lastUsed,href:url('player.html',{section:show.section,collection:show.id,clip:clip.id,mode:session.mode})});
    }
    for(const session of array('word-recall-topic-work-v1')){
      const theme=[...window.TOPIC_LAYOUT.themes,...(window.TOPIC_LAYOUT.archivedThemes||[])].find(x=>x.id===session.theme&&x.topics.some(t=>t.id===session.topic)),topic=theme?.topics.find(x=>x.id===session.topic);
      if(!topic)continue;
      items.push({title:topic.title,cover:topic.preview||'app-media/topics/previews/'+({dlg_aeroport_1:'airport',dom:'home'}[topic.id]||topic.id)+'.jpg',caption:({audio:'Аудирование',cards:'Карточки фраз',read:'Чтение'}[session.mode]||'Чтение'),lastUsed:session.lastUsed,href:url('catalog.html',{section:'topics',theme:theme.id,topic:topic.id,mode:['audio','cards'].includes(session.mode)?session.mode:'read',version:session.version||'all'})});
    }
    const uploads=array('word-recall-local-uploads-v1');
    for(const session of array('word-recall-upload-work-v1')){
      const item=uploads.find(x=>x.id===session.id);if(!item)continue;
      const modes=[...(item.mediaId?['watch']:[]),...(item.text?.trim()?['read','listen']:[])];
      const mode=modes.includes(session.mode)?session.mode:modes[0];
      items.push({title:item.name||item.title,caption:'Мои загрузки',lastUsed:session.lastUsed,href:url('uploads.html',{item:item.id,...(mode?{mode}: {})})});
    }
    return items.sort((a,b)=>(b.lastUsed||0)-(a.lastUsed||0));
  }
  function materialTrack(id,items) {
    const track=$(id),left=track.scrollLeft;track.replaceChildren();
    for(const item of items){
      const card=el('a','home-material');card.href=nav.enter(item.href);
      card.append(cover(item.cover,'home-material-image'),el('h3','',item.title));
      if(item.caption)card.append(el('p','',item.caption));
      track.append(card);
    }
    track.scrollLeft=left;
  }
  function materials() {
    let work=preview==='start'?[]:workingMaterials();
    if(!work.length&&preview==='active'&&fixture)work=fixture.workPreview;
    $('home-work').hidden=!work.length;
    materialTrack('materials-track',work);

    const videos=data.shows.filter(show=>show.available!==false).map(show=>({title:show.title,cover:show.cover,caption:show.section==='series'?'Сериал':'Видео',href:url('catalog.html',{section:show.section,collection:show.id})}));
    $('home-videos').hidden=!videos.length;
    materialTrack('videos-track',videos);

    const topicNames={hotel:'Отель',airport:'Аэропорт'};
    const topics=window.TOPIC_LAYOUT.themes.map(theme=>({title:topicNames[theme.id]||theme.title,cover:theme.cover,href:url('catalog.html',{section:'topics',theme:theme.id})}));
    $('home-topics').hidden=!topics.length;
    materialTrack('topics-track',topics);
  }
  function render() {
    learning();goals();materials();
  }
  function step(track,direction) {
    const width=(track.firstElementChild?.getBoundingClientRect().width||track.clientWidth*.85)+14;
    track.scrollBy({left:direction*width,behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  }
  document.querySelectorAll('.home-carousel').forEach(track=>{
    track.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();step(track,event.key==='ArrowRight'?1:-1);}});
  });
  window.addEventListener('word-recall-demo-change',()=>{preview=demo.readHome().preview;completed=fixture?demo.readHome().completed:0;render();});
  if(firstLaunch&&demo.launch?.phase==='onboarding')location.replace('settings.html?view=onboarding&launch=1');
  const positions=()=>[document.querySelector('.home-screen'),...document.querySelectorAll('.home-carousel')];
  const savePositions=()=>positions().forEach((e,i)=>nav.remember('home:'+preview+':'+i,e));
  const restorePositions=()=>positions().forEach((e,i)=>nav.restore('home:'+preview+':'+i,e));
  document.querySelector('.home-screen').addEventListener('click',savePositions,{capture:true});
  window.addEventListener('pagehide',savePositions);
  window.addEventListener('pageshow',()=>{render();restorePositions();});
  window.addEventListener('word-recall-data-change',render);
  window.addEventListener('storage',event=>{if(['word-recall-upload-work-v1','word-recall-local-uploads-v1'].includes(event.key))render();});
  render();restorePositions();
})();
