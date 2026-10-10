'use strict';
const get=id=>document.getElementById(id);
const narration=get('narration'), video=get('scene-video');
const KEY='word-recall-circle-03-v1';
const rates=[.75,.85,1,1.15,1.3];
const fresh=()=>({plays:0,heard:false,assisted:false,textOpen:false,translated:false,known:false});
let attempts=Object.fromEntries(REVIEW_PHRASES.map(p=>[p.id,fresh()]));
// Each entry starts a fresh demo check; earlier manual results stay separate.
let knownPhrases={};
try{
  const saved=JSON.parse((window.WordRecallData?.local || localStorage).getItem(KEY));
  for(const p of REVIEW_PHRASES){
    if(saved?.version===2&&saved.knownPhrases?.[p.id]===true)knownPhrases[p.id]=true;
    if(saved?.version===1&&saved.attempts?.[p.id]?.known===true)knownPhrases[p.id]=true;
  }
}catch{/* The prototype also works without persistent storage. */}
let index=window.CycleContext?.position(REVIEW_PHRASES.length)||0,rateIndex=2,loop=false,source='narrator',media=narration;
let resumeEligible=false,previewOnly=false,generation=0,toastTimer;
let articulationTipDismissed=false;
const boundaries={};
const current=()=>REVIEW_PHRASES[index];
const attempt=()=>attempts[current().id];
const clean=token=>token.replace(/[^a-z]/gi,'').toLowerCase();
const seconds=n=>n.toFixed(1).replace('.',',')+' с';
function persist(){try{(window.WordRecallData?.local || localStorage).setItem(KEY,JSON.stringify({version:2,knownPhrases}));}catch{/* Session state remains usable. */}}
function toast(text){clearTimeout(toastTimer);get('circle-toast').textContent=text;get('circle-toast').hidden=false;toastTimer=setTimeout(()=>get('circle-toast').hidden=true,3500);}
function hasOriginal(){return !!(current().scene||current().originalAudio);}
function original(){const value=current().scene||current().originalAudio;return typeof value==='string'?{url:value}:value;}
function duration(){return Number.isFinite(media.duration)&&media.duration>0?media.duration:source==='narrator'?current().duration:original()?.duration||current().duration;}
function edges(){
  const key=current().id+':'+source;
  if(!boundaries[key]){const data=source==='narrator'?current():original();boundaries[key]={start:data?.start||0,end:data?.end||duration()};}
  return boundaries[key];
}
function renderState(){
  const a=attempt();
  get('review-task').textContent=a.assisted?'Слушайте и повторяйте фразу вслух в темпе оригинала.':'Расслышать и понять фразу.';
  document.querySelector('.review-task').classList.toggle('is-assisted',a.assisted);
  get('phrase-text').hidden=!a.textOpen;get('phrase-ghost').style.visibility=a.textOpen?'hidden':'visible';
  get('phrase-translation').classList.toggle('is-visible',a.translated);
  get('phrase-translation').setAttribute('aria-hidden',!a.translated);
  get('reveal-text').setAttribute('aria-expanded',a.textOpen);
  get('reveal-label').textContent=a.textOpen?'Скрыть текст':'Показать текст';
  get('toggle-translation').setAttribute('aria-pressed',a.translated);
  const button=get('know-phrase');
  button.disabled=!a.heard||a.assisted||a.known||!media.paused;
  button.classList.toggle('is-known',a.known);
  button.classList.toggle('is-checking',!a.assisted&&!a.known);
  get('know-label').textContent='Знаю фразу';button.setAttribute('aria-pressed',a.known);
  button.title=a.known?'Фраза отмечена':a.assisted?'Использованы подсказки или повторное прослушивание':!a.heard?'Сначала прослушайте фразу':'';
  updateScrollMode();
}
function assist(){attempt().assisted=true;persist();renderState();}
function playingUI(){
  const playing=!media.paused;
  const label=source==='original'?'Слушать оригинал':'Слушать диктора';
  get('main-play').setAttribute('aria-label',playing?'Пауза':label);
  get('play-icon').setAttribute('d',playing?'M7 5h4v14H7zM14 5h4v14h-4z':'m8 5 11 7-11 7z');
  get('scene-player').classList.toggle('is-playing',playing&&media===video);
  get('scene-play').setAttribute('aria-label',playing&&media===video?'Пауза':'Слушать оригинал');
  renderState();
}
function pause(){media.pause();playingUI();}
function setSource(next){
  generation++;narration.pause();video.pause();source=next;
  media=next==='original'&&current().scene?video:narration;
  media.src=next==='original'?original().url:current().audio;
  media.load();resumeEligible=false;previewOnly=false;
  drawWave();renderEdges();playingUI();
}
async function play(restart=false,preview=false){
  const isResume=resumeEligible&&!restart;
  const a=attempt();
  if(!isResume){
    if(a.plays>0)assist();
    media.currentTime=edges().start;
  }
  previewOnly=preview;resumeEligible=false;
  media.playbackRate=rates[rateIndex];
  const token=++generation,player=media;
  try{
    await player.play();
    if(token!==generation){if(player!==media)player.pause();return;}
    if(!isResume){a.plays++;persist();}
    playingUI();
  }catch{
    if(token!==generation)return;
    toast('Не удалось воспроизвести запись. Попробуйте Play ещё раз.');playingUI();
  }
}
function mainPlay(){
  if(!media.paused){resumeEligible=true;pause();}
  else play();
}
function finish(){
  if(media.paused&&!media.ended)return;
  media.pause();resumeEligible=false;
  media.currentTime=edges().end;
  attempt().heard=true;persist();playingUI();
  if(loop&&!previewOnly)play(true);
  previewOnly=false;
}
function renderEdges(){
  const d=duration(),b=edges();b.end=Math.min(b.end,d);b.start=Math.min(b.start,Math.max(0,b.end-.2));
  for(const edge of ['start','end']){
    get(edge+'-range').max=d;get(edge+'-range').value=b[edge];get(edge+'-value').textContent=seconds(b[edge]);
    get(edge+'-range').setAttribute('aria-valuetext',seconds(b[edge]));
  }
  get('clip-selection').style.left=b.start/d*100+'%';get('clip-selection').style.width=(b.end-b.start)/d*100+'%';
  document.querySelectorAll('[data-edge]').forEach(button=>{const edge=button.dataset.edge,v=b[edge]+Number(button.dataset.delta);button.disabled=edge==='start'?v<0||v>b.end-.2:v>d||v<b.start+.2;});
}
function changeEdge(edge,value){
  pause();resumeEligible=false;const b=edges();
  b[edge]=edge==='start'?Math.max(0,Math.min(value,b.end-.2)):Math.max(b.start+.2,Math.min(value,duration()));
  b[edge]=Math.round(b[edge]*10)/10;media.currentTime=b.start;renderEdges();
}
function drawWave(){
  get('wave-bars').replaceChildren();
  const peaks=source==='narrator'?current().peaks:original()?.peaks||[];
  peaks.forEach((peak,i)=>{const line=document.createElementNS('http://www.w3.org/2000/svg','line'),height=4+peak*35;
    for(const [k,v] of Object.entries({x1:(i+.4)*320/peaks.length,x2:(i+.4)*320/peaks.length,y1:24-height/2,y2:24+height/2,stroke:'#b6b0a4','stroke-width':2,'stroke-linecap':'round'}))line.setAttribute(k,v);
    get('wave-bars').append(line);
  });
}
function openDictionary(token){
  pause();assist();
  const entry=window.CycleContext?.definition(clean(token),current().id)||REVIEW_DEFINITIONS[clean(token)];if(!entry)return;
  get('dictionary-word').textContent=entry[0];get('definition-title').textContent=entry[1];get('definition-description').textContent=entry[2];
  get('word-form').hidden=clean(token)===entry[0];get('word-form').textContent='В этой фразе: '+clean(token);
  get('definition-example').textContent=current().text;get('definition-translation').textContent=current().translation;get('dictionary').showModal();
}
function updateScrollMode(){requestAnimationFrame(()=>{window.fitCircleLayout?.();get('circle-body').classList.toggle('can-scroll',get('circle-body').scrollHeight>get('circle-body').clientHeight+2);});}
function renderPhrase(){
  window.CycleContext?.remember(index);
  generation++;narration.pause();video.pause();get('circle-toast').hidden=true;
  attempts[current().id]=fresh();
  get('phrase-text').replaceChildren();get('phrase-ghost').replaceChildren();
  current().tokens.forEach(token=>{const button=document.createElement('button');button.className='phrase-word';button.textContent=token;button.setAttribute('aria-label',`Значение слова ${clean(token)}`);button.setAttribute('aria-haspopup','dialog');button.addEventListener('click',()=>openDictionary(token));get('phrase-text').append(button,document.createTextNode(' '));const ghost=document.createElement('span');ghost.className='phrase-word';ghost.textContent=token;get('phrase-ghost').append(ghost,document.createTextNode(' '));});
  get('phrase-translation').textContent=current().translation;
  get('scene-player').hidden=!current().scene;get('scene-placeholder').hidden=!!current().scene;
  setSource(hasOriginal()?'original':'narrator');
  get('circle-body').scrollTop=0;renderState();
}
function navigate(delta){const next=index+delta;if(next<0||next>=REVIEW_PHRASES.length){toast(next<0?'Это первая фраза.':'Это последняя фраза.');return;}index=next;renderPhrase();}
if(REVIEW_PHRASES.length){
get('main-play').addEventListener('click',mainPlay);
get('scene-play').addEventListener('click',()=>{if(source!=='original'){setSource('original');play(true);}else mainPlay();});
get('narrator-audio').addEventListener('click',()=>{if(source!=='narrator')setSource('narrator');play(true);});
get('reveal-text').addEventListener('click',()=>{const a=attempt();a.textOpen=!a.textOpen;if(a.textOpen)assist();persist();renderState();});
get('toggle-translation').addEventListener('click',()=>{const a=attempt();a.translated=!a.translated;if(a.translated)assist();persist();renderState();});
get('know-phrase').addEventListener('click',()=>{const a=attempt();if(!a.heard||a.assisted||!media.paused||a.known)return;a.known=true;knownPhrases[current().id]=true;pause();persist();renderState();});
get('change-tempo').addEventListener('click',()=>{rateIndex=(rateIndex+1)%rates.length;media.playbackRate=rates[rateIndex];get('tempo-value').textContent=rates[rateIndex].toLocaleString('ru-RU',{minimumFractionDigits:1})+'×';});
get('loop-phrase').addEventListener('click',()=>{loop=!loop;get('loop-phrase').setAttribute('aria-pressed',loop);});
get('close-dictionary').addEventListener('click',()=>get('dictionary').close());
get('dictionary').addEventListener('click',event=>{if(event.target===get('dictionary')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)get('dictionary').close();}});
for(const edge of ['start','end'])get(edge+'-range').addEventListener('input',event=>changeEdge(edge,Number(event.target.value)));
document.querySelectorAll('[data-edge]').forEach(button=>button.addEventListener('click',()=>changeEdge(button.dataset.edge,edges()[button.dataset.edge]+Number(button.dataset.delta))));
get('preview-clip').addEventListener('click',()=>play(true,true));
get('reset-clip').addEventListener('click',()=>{pause();resumeEligible=false;delete boundaries[current().id+':'+source];media.currentTime=edges().start;renderEdges();});
get('demo-prev').addEventListener('click',()=>navigate(-1));get('demo-next').addEventListener('click',()=>navigate(1));
get('demo-reset-attempt').addEventListener('click',()=>{attempts[current().id]=fresh();persist();renderPhrase();});
for(const player of [narration,video]){
  player.addEventListener('play',()=>{if(player!==media)return;playingUI();});
  player.addEventListener('pause',()=>{if(player===media)playingUI();});
  player.addEventListener('loadedmetadata',()=>{if(player!==media)return;renderEdges();player.currentTime=edges().start;});
  player.addEventListener('timeupdate',()=>{if(player!==media)return;if(!player.paused&&player.currentTime>=edges().end-.03)finish();});
  player.addEventListener('ended',()=>{if(player===media)finish();});
  player.addEventListener('error',()=>{if(player===media){toast('Запись недоступна.');playingUI();}});
}
let gesture=null,suppressClick=false;
get('circle-body').addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0||event.target.closest('.sync-panel,button,input,a'))return;
  const overflowing=get('circle-body').scrollHeight>get('circle-body').clientHeight+2;
  if(overflowing&&!event.target.closest('.scene-placeholder,.scene-player'))return;
  gesture={x:event.clientX,y:event.clientY,pointer:event.pointerId};
  if(event.target.closest('.scene-placeholder,.scene-player'))get('circle-body').setPointerCapture(event.pointerId);
});
get('circle-body').addEventListener('pointerup',event=>{if(!gesture||gesture.pointer!==event.pointerId)return;const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;gesture=null;if(Math.abs(dy)>65&&Math.abs(dy)>Math.abs(dx)*1.5){suppressClick=true;navigate(dy<0?1:-1);setTimeout(()=>suppressClick=false,0);}});
get('circle-body').addEventListener('pointercancel',()=>gesture=null);
get('circle-body').addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopImmediatePropagation();}},true);
document.addEventListener('keydown',event=>{if(get('dictionary').open||event.target.closest('input,button,a,summary'))return;if(event.key==='ArrowUp'){event.preventDefault();navigate(1);}if(event.key==='ArrowDown'){event.preventDefault();navigate(-1);}});
get('sync-panel').addEventListener('toggle',updateScrollMode);window.addEventListener('resize',updateScrollMode);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!media.paused){resumeEligible=true;pause();}});
window.addEventListener('pagehide',()=>{generation++;narration.pause();video.pause();});
renderPhrase();

}else{window.WordRecallData?.emptyExercise();}
