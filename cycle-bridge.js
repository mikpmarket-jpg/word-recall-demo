/* Adapts existing screens only when opened from the cycle. Direct demo URLs stay independent. */
(() => {
  'use strict';
  if(window.WordRecallData?.isTest===false)return;
  const query=new URLSearchParams(location.search).get('cycle');
  if(!query)return;
  const api=window.WordRecallCycle,s=api.state;
  const round=Number(location.pathname.match(/circle-(\d)\.html$/)?.[1]);
  if(query!==s.id||!api.available(s).includes(round)){
    location.replace('cycle.html');return;
  }
  const phrases=api.phrases(s).map(p=>({...p,new:s.words.find(w=>w.id===p.word)?.role==='study'?[p.word]:[]}));
  if(typeof CIRCLE_PHRASES!=='undefined')CIRCLE_PHRASES.splice(0,CIRCLE_PHRASES.length,...phrases);
  // Listening can add another prepared word to the current cycle without reloading.
  if(typeof LISTEN_PHRASES!=='undefined')LISTEN_PHRASES.splice(0,LISTEN_PHRASES.length,...CYCLE_CORPUS.phrases);
  if(typeof LISTEN_DEFINITIONS!=='undefined'){
    Object.assign(LISTEN_DEFINITIONS,Object.fromEntries(Object.entries(CYCLE_CORPUS.definitions).map(([k,v])=>[k,v.slice(1)])));
    Object.assign(LISTEN_CONTEXT_DEFINITIONS,CYCLE_CORPUS.context);
  }
  const old=s.progress[round]||{};s.progress[round]={...old,status:'visited'};s.lastRound=round;api.write(s);
  const context={
    round,id:s.id,words:api.words(s),phrases,
    position(length){return Math.max(0,Math.min(length-1,Number(s.progress[round]?.position)||0));},
    remember(position){s.progress[round]={...s.progress[round],status:'visited',position};commit();},
    definition(token,phrase){const entry=CYCLE_CORPUS.context[phrase]?.[token];return entry?[token,...entry]:CYCLE_CORPUS.definitions[token];}
  };
  // A stale tab must never replace a newly rebuilt cycle.
  function commit(){const latest=api.read();if(latest?.id===s.id){latest.progress[round]=s.progress[round];latest.lastRound=round;api.state=latest;api.write(latest);}}
  window.CycleContext=context;
  document.querySelector('.phone').classList.add('cycle-connected');
  const exit=document.querySelector('.exit-circle');
  exit.href='cycle.html';exit.textContent='‹';exit.setAttribute('aria-label','Выйти на экран цикла');
  const finish=()=>{const latest=api.read();if(latest?.id!==s.id)return;if(latest.mode==='ordered'&&api.next(latest)===round)api.advance(latest,round);api.state=latest;api.write(latest);};
  exit.addEventListener('click',finish);
  document.querySelectorAll('.notes nav a').forEach(a=>{
    if(a.getAttribute('href')==='cycle.html')a.addEventListener('click',finish);
    else if(/circle-\d\.html/.test(a.getAttribute('href')||''))a.href=a.getAttribute('href')+'?cycle='+encodeURIComponent(s.id);
  });
  const notes=document.querySelector('.prototype-note');if(notes)notes.textContent='Открыт материал текущего цикла: '+context.words.length+' слов, '+phrases.length+' фраз. Выход предлагает следующий круг, но не означает освоение.';
  const demoDescription=document.querySelector('.demo-panel > p');if(demoDescription)demoDescription.textContent='Проверка на материале текущего цикла. Эти кнопки находятся вне приложения.';
  for(const id of ['demo-first','demo-many','demo-all','demo-sample','demo-real']){const button=document.getElementById(id);if(button)button.hidden=true;}
})();
