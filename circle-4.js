'use strict';
const el=id=>document.getElementById(id);
const speechBody=el('speech-body'),wordAudio=el('word-audio'),hintAudio=el('hint-audio');
const rates=[.75,.85,1,1.15,1.3];
let speechIndex=window.CycleContext?.position(ACTIVE_WORDS.length)||0,speechGesture=null,speechToastTimer,rateIndex=2;
let wordTranslated=false,hintOpen=false,hintTranslated=false;
let audioRequest=0,requestedPlayer=null;
const current=()=>ACTIVE_WORDS[speechIndex];
function showMessage(text){clearTimeout(speechToastTimer);el('speech-toast').textContent=text;el('speech-toast').hidden=false;speechToastTimer=setTimeout(()=>el('speech-toast').hidden=true,2200);}
function renderControls(){
  el('word-translation').classList.toggle('is-visible',wordTranslated);
  el('word-translation').setAttribute('aria-hidden',!wordTranslated);
  el('toggle-word-translation').setAttribute('aria-pressed',wordTranslated);
  el('speech-hint').classList.toggle('is-open',hintOpen);
  el('speech-hint').setAttribute('aria-hidden',!hintOpen);
  el('speech-hint').inert=!hintOpen;
  el('toggle-hint').setAttribute('aria-expanded',hintOpen);
  el('hint-toggle-label').textContent=hintOpen?'Скрыть подсказку':'Подсказка';
  el('hint-translation').classList.toggle('is-visible',hintTranslated);
  el('hint-translation').setAttribute('aria-hidden',!hintTranslated);
  el('toggle-hint-translation').setAttribute('aria-pressed',hintTranslated);
  const playingWord=!wordAudio.paused,playingHint=!hintAudio.paused;
  const play='m8 5 11 7-11 7z',pause='M7 5h4v14H7zM14 5h4v14h-4z';
  el('word-play-icon').setAttribute('d',playingWord?pause:play);
  el('hint-play-icon').setAttribute('d',playingHint?pause:play);
  el('word-play').setAttribute('aria-label',playingWord?'Пауза озвучки слова':'Слушать слово');
  el('hint-play').setAttribute('aria-label',playingHint?'Пауза фразы-подсказки':'Слушать фразу-подсказку');
  el('hint-play-label').textContent=playingHint?'Пауза':'Слушать фразу';
}
function renderSpeechWord(){
  window.CycleContext?.remember(speechIndex);
  audioRequest++;requestedPlayer=null;wordAudio.pause();hintAudio.pause();
  wordTranslated=false;hintOpen=false;hintTranslated=false;
  el('speech-word').textContent=current().word;
  el('word-translation').textContent=current().translation;
  el('hint-phrase').textContent=current().phrase;
  el('hint-translation').textContent=current().phraseTranslation;
  wordAudio.src=current().audio;wordAudio.load();wordAudio.playbackRate=rates[rateIndex];
  hintAudio.src=current().phraseAudio;hintAudio.load();
  el('speech-toast').hidden=true;clearTimeout(speechToastTimer);
  speechBody.scrollTop=0;renderControls();
}
function navigateSpeechWord(delta){
  const next=speechIndex+delta;
  if(next<0||next>=ACTIVE_WORDS.length){showMessage(next<0?'Это первое слово.':'Это последнее слово.');return;}
  speechIndex=next;renderSpeechWord();
}
async function toggleAudio(player,other){
  const request=++audioRequest;
  if(!player.paused){requestedPlayer=null;player.pause();return;}
  requestedPlayer=player;other.pause();
  if(player.ended)player.currentTime=0;
  try{await player.play();}catch{if(request===audioRequest)showMessage('Не удалось воспроизвести запись.');}
  if(request!==audioRequest){if(requestedPlayer!==player)player.pause();return;}
  renderControls();
}
if(ACTIVE_WORDS.length){
el('word-play').addEventListener('click',()=>toggleAudio(wordAudio,hintAudio));
el('hint-play').addEventListener('click',()=>toggleAudio(hintAudio,wordAudio));
el('toggle-word-translation').addEventListener('click',()=>{wordTranslated=!wordTranslated;renderControls();});
el('toggle-hint').addEventListener('click',()=>{hintOpen=!hintOpen;if(!hintOpen){if(requestedPlayer===hintAudio){audioRequest++;requestedPlayer=null;}hintAudio.pause();hintAudio.currentTime=0;hintTranslated=false;}renderControls();});
el('toggle-hint-translation').addEventListener('click',()=>{hintTranslated=!hintTranslated;renderControls();});
el('word-tempo').addEventListener('click',()=>{rateIndex=(rateIndex+1)%rates.length;wordAudio.playbackRate=rates[rateIndex];el('word-tempo-value').textContent=rates[rateIndex].toLocaleString('ru-RU',{minimumFractionDigits:1})+'×';});
for(const player of [wordAudio,hintAudio]){
  player.addEventListener('play',()=>{if(requestedPlayer!==player){player.pause();return;}(player===wordAudio?hintAudio:wordAudio).pause();renderControls();});
  for(const event of ['pause','ended'])player.addEventListener(event,renderControls);
}
speechBody.addEventListener('pointerdown',event=>{
  if(!event.isPrimary||event.button!==0||event.target.closest('button,a,input'))return;
  speechGesture={x:event.clientX,y:event.clientY,id:event.pointerId};speechBody.setPointerCapture(event.pointerId);
});
speechBody.addEventListener('pointerup',event=>{
  if(!speechGesture||speechGesture.id!==event.pointerId)return;
  const dx=event.clientX-speechGesture.x,dy=event.clientY-speechGesture.y;speechGesture=null;
  if(Math.abs(dy)>65&&Math.abs(dy)>Math.abs(dx)*1.5)navigateSpeechWord(dy<0?1:-1);
});
speechBody.addEventListener('pointercancel',()=>speechGesture=null);
document.addEventListener('keydown',event=>{
  if(event.target.closest('button,a,summary,input'))return;
  if(event.key==='ArrowUp'){event.preventDefault();navigateSpeechWord(1);}
  if(event.key==='ArrowDown'){event.preventDefault();navigateSpeechWord(-1);}
});
el('demo-prev').addEventListener('click',()=>navigateSpeechWord(-1));el('demo-next').addEventListener('click',()=>navigateSpeechWord(1));
document.addEventListener('visibilitychange',()=>{if(document.hidden){audioRequest++;requestedPlayer=null;wordAudio.pause();hintAudio.pause();}});
window.addEventListener('pagehide',()=>{audioRequest++;requestedPlayer=null;wordAudio.pause();hintAudio.pause();});
renderSpeechWord();

}else{window.WordRecallData?.emptyExercise();}
