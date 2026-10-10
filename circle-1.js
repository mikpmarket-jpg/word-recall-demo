'use strict';
const get = id => document.getElementById(id);
const audio = get('narration');
const definitions = {
  could: ['could', 'могли бы; может…', 'Здесь помогает вежливо предложить действие или спросить о возможности.'],
  we: ['we', 'мы', 'Говорящий и ещё один или несколько человек.'],
  just: ['just', 'просто', 'В этой фразе делает предложение проще: просто подождать.'],
  wait: ['wait', 'ждать, подождать', 'Оставаться на месте до события или до тех пор, пока что-то станет доступно.'],
  waited: ['wait', 'ждали', 'То же значение «ждать», использованное в прошедшем времени.'],
  at: ['at', 'у; возле', 'Здесь обозначает место ожидания — у барной стойки.'],
  the: ['the', 'определённый артикль', 'Указывает на конкретный предмет или место, понятное из ситуации. Отдельного русского перевода обычно нет.'],
  bar: ['bar', 'барная стойка', 'Стойка, у которой заказывают и подают напитки.'],
  for: ['for', 'предлог после wait', 'В сочетании wait for указывает, кого или чего ждут: здесь — поезд.'],
  next: ['next', 'следующий', 'Тот, который идёт после предыдущего: здесь — следующий поезд.'],
  train: ['train', 'поезд', 'Железнодорожный состав для перевозки пассажиров или грузов.'],
  there: ['there', 'есть, имеется — в конструкции there is', 'Здесь не означает «там». Конструкция there is сообщает о наличии предмета.'],
  is: ['be', 'есть — в конструкции there is', 'Форма глагола be для единственного числа. Здесь входит в конструкцию со значением наличия.'],
  a: ['a', 'неопределённый артикль', 'Вводит один предмет: здесь — небольшой стол. Отдельного русского перевода обычно нет.'],
  small: ['small', 'небольшой', 'Маленький по размеру.'],
  table: ['table', 'стол', 'Предмет мебели с плоской поверхностью на ножках.'],
  by: ['by', 'у; рядом с', 'Здесь обозначает расположение стола рядом с окном.'],
  window: ['window', 'окно', 'Проём в стене, обычно со стеклом, через который проходит свет.']
};
let index = window.CycleContext?.position(CIRCLE_PHRASES.length) || 0;
let loop = false;
let translated = false;
let rateIndex = 2;
let previewOnly = false;
let toastTimer;
const rates = [.75, .85, 1, 1.15, 1.3];
const boundaries = CIRCLE_PHRASES.map(p => ({ start:p.start, end:p.end }));
const current = () => CIRCLE_PHRASES[index];
const edges = () => boundaries[index];
const clean = token => token.replace(/[^a-z]/gi, '').toLowerCase();
const seconds = number => number.toFixed(1).replace('.', ',') + ' с';
const clock = number => { const n=Math.max(0,Math.floor(number)); return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`; };
function toast(message) { clearTimeout(toastTimer); get('circle-toast').textContent=message; get('circle-toast').hidden=false; toastTimer=setTimeout(()=>get('circle-toast').hidden=true,3500); }
function playingUI() {
  const playing=!audio.paused;
  get('main-play').setAttribute('aria-label', playing ? 'Пауза' : 'Слушать диктора');
  get('play-icon').setAttribute('d',playing ? 'M7 5h4v14H7zM14 5h4v14h-4z' : 'm8 5 11 7-11 7z');
}
function stop() { audio.pause(); previewOnly=false; playingUI(); }
async function play(restart=false, preview=false) {
  previewOnly=preview;
  if(restart || audio.currentTime<edges().start || audio.currentTime>=edges().end-.03) audio.currentTime=edges().start;
  audio.playbackRate=rates[rateIndex];
  try { await audio.play(); }
  catch { get('playback-status').textContent='Не удалось включить звук'; toast('Браузер не смог воспроизвести локальную запись.'); }
}
function renderEdges() {
  const p=current(), b=edges();
  get('start-range').max=p.duration; get('end-range').max=p.duration;
  get('start-range').value=b.start; get('end-range').value=b.end;
  get('start-value').textContent=seconds(b.start); get('end-value').textContent=seconds(b.end);
  get('start-range').setAttribute('aria-valuetext',seconds(b.start)); get('end-range').setAttribute('aria-valuetext',seconds(b.end));
  get('clip-selection').style.left=(b.start/p.duration*100)+'%';
  get('clip-selection').style.width=((b.end-b.start)/p.duration*100)+'%';
  document.querySelectorAll('[data-edge]').forEach(button=>{
    const edge=button.dataset.edge, value=b[edge]+Number(button.dataset.delta);
    button.disabled=edge==='start' ? value<0 || value>b.end-.2 : value>Math.floor(p.duration*10)/10 || value<b.start+.2;
  });
}
function changeEdge(edge,value) {
  stop();
  const b=edges(), p=current();
  b[edge]=edge==='start' ? Math.max(0,Math.min(value,b.end-.2)) : Math.min(Math.floor(p.duration*10)/10,Math.max(value,b.start+.2));
  b[edge]=Math.round(b[edge]*10)/10;
  audio.currentTime=b.start;
  get('playback-status').textContent='Границы изменены'; renderEdges();
}
function openDictionary(token) {
  stop(); get('playback-status').textContent='Проясните значение слова';
  const key=clean(token), entry=definitionFor(key);
  if(!entry) return;
  get('dictionary-word').textContent=entry[0];
  get('definition-title').textContent=entry[1]; get('definition-description').textContent=entry[2];
  get('word-form').hidden=key===entry[0]; get('word-form').textContent='В этой фразе: '+key;
  get('definition-example').textContent=current().text;
  get('definition-translation').textContent=current().translation;
  get('dictionary').showModal();
}
function definitionFor(token){return window.CycleContext?.definition(token,current().id)||(window.CYCLE_CORPUS?.context[current().id]?.[token]?[token,...window.CYCLE_CORPUS.context[current().id][token]]:null)||window.CYCLE_CORPUS?.definitions[token]||definitions[token]||[token,'Значение пока не подготовлено.',''];}
function renderDefinitions(){
  const studied=new Set([...(current().new||[]).map(clean),...(window.CycleContext?.words||[]).map(w=>w.id)]),seen=new Set(),list=get('inline-definitions');list.replaceChildren();
  for(const token of current().tokens){
    const key=clean(token),entry=definitionFor(key),lemma=entry[0];
    if(seen.has(key)||!studied.has(key)&&!studied.has(lemma))continue;seen.add(key);
    const row=document.createElement('div');row.className='inline-definition';
    const word=document.createElement('button');word.type='button';word.className='inline-word';word.lang='en';word.textContent=key;word.setAttribute('aria-haspopup','dialog');word.addEventListener('click',()=>openDictionary(token));
    if(key!==lemma){const form=document.createElement('small');form.className='inline-form';form.textContent='форма '+lemma;word.append(form);}
    const copy=document.createElement('div');copy.className='inline-definition-copy';const meaning=document.createElement('strong');meaning.textContent=entry[1];copy.append(meaning);
    if(entry[2]){const description=document.createElement('p');description.textContent=entry[2];copy.append(description);}
    row.append(word,copy);list.append(row);
  }
}
function renderHint(){const hint=get('clarification-hint'),hidden=window.WordRecallPreferences.read().hiddenHints.includes('clarification');hint.classList.toggle('is-hidden',hidden);hint.inert=hidden;if(hidden)hint.setAttribute('aria-hidden','true');else hint.removeAttribute('aria-hidden');}
get('hide-clarification-hint').addEventListener('click',()=>{const prefs=window.WordRecallPreferences;if(!prefs.save({hiddenHints:[...new Set([...prefs.read().hiddenHints,'clarification'])]}))toast('Не удалось сохранить закрытие подсказки.');renderHint();});
window.addEventListener('word-recall-preferences-change',renderHint);renderHint();
function renderTranslation(){const text=get('phrase-translation');text.classList.toggle('is-hidden',!translated);text.setAttribute('aria-hidden',String(!translated));}
function updateScrollMode() { requestAnimationFrame(()=>{window.fitCircleLayout?.();get('circle-body').classList.toggle('can-scroll',get('circle-body').scrollHeight>get('circle-body').clientHeight+2);}); }
function renderPhrase() {
  window.CycleContext?.remember(index);
  stop();
  get('phrase-text').replaceChildren();
  current().tokens.forEach(token=>{
    const button=document.createElement('button'); button.className='phrase-word';
    if(current().new.map(clean).some(word=>word===clean(token)||word===definitionFor(clean(token))[0])) button.classList.add('is-new');
    button.textContent=token; button.setAttribute('aria-label',`Значение слова ${token.replace(/[?.!]/g,'')}`);
    button.setAttribute('aria-haspopup','dialog'); button.addEventListener('click',()=>openDictionary(token));
    get('phrase-text').append(button,document.createTextNode(' '));
  });
  get('phrase-translation').textContent=current().translation;
  renderTranslation();renderDefinitions();
  audio.src=current().audio; audio.load();
  get('playback-status').textContent='';
  get('wave-bars').replaceChildren();
  current().peaks.forEach((peak,i)=>{
    const line=document.createElementNS('http://www.w3.org/2000/svg','line');
    const height=4+peak*35;
    line.setAttribute('x1',i*5+2); line.setAttribute('x2',i*5+2); line.setAttribute('y1',24-height/2); line.setAttribute('y2',24+height/2);
    line.setAttribute('stroke','#b6b0a4'); line.setAttribute('stroke-width','2'); line.setAttribute('stroke-linecap','round');
    get('wave-bars').append(line);
  });
  renderEdges(); get('circle-body').scrollTop=0; updateScrollMode();
}
function navigate(delta) {
  const next=index+delta;
  if(next<0 || next>=CIRCLE_PHRASES.length) { toast(next<0 ? 'Это первая фраза.' : 'Это последняя фраза.'); return; }
  index=next; renderPhrase();
}
if(CIRCLE_PHRASES.length){
get('main-play').addEventListener('click',()=>{ if(audio.paused) play(); else { stop(); get('playback-status').textContent='Пауза'; } });
get('toggle-translation').addEventListener('click',()=>{ translated=!translated; renderTranslation(); get('toggle-translation').setAttribute('aria-pressed',translated); updateScrollMode(); });
get('change-tempo').addEventListener('click',()=>{ rateIndex=(rateIndex+1)%rates.length; audio.playbackRate=rates[rateIndex]; get('tempo-value').textContent=rates[rateIndex].toLocaleString('ru-RU',{minimumFractionDigits:1})+'×'; });
get('loop-phrase').addEventListener('click',()=>{ loop=!loop; get('loop-phrase').setAttribute('aria-pressed',loop); });
get('close-dictionary').addEventListener('click',()=>get('dictionary').close());
get('dictionary').addEventListener('click',event=>{if(event.target===get('dictionary')){const r=event.target.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)get('dictionary').close();}});
get('dictionary').addEventListener('close',()=>get('playback-status').textContent='');
get('start-range').addEventListener('input',event=>changeEdge('start',Number(event.target.value)));
get('end-range').addEventListener('input',event=>changeEdge('end',Number(event.target.value)));
document.querySelectorAll('[data-edge]').forEach(button=>button.addEventListener('click',()=>changeEdge(button.dataset.edge,edges()[button.dataset.edge]+Number(button.dataset.delta))));
get('preview-clip').addEventListener('click',()=>play(true,true));
get('reset-clip').addEventListener('click',()=>{ stop(); boundaries[index]={start:current().start,end:current().end}; audio.currentTime=edges().start; renderEdges(); get('playback-status').textContent='Исходные границы восстановлены'; });
get('demo-prev').addEventListener('click',()=>navigate(-1)); get('demo-next').addEventListener('click',()=>navigate(1));
['first','many','all'].forEach((id,i)=>get('demo-'+id).addEventListener('click',()=>{index=i;renderPhrase();}));
audio.addEventListener('play',()=>{playingUI();get('playback-status').textContent=previewOnly?'Проверка фрагмента':'Слушайте диктора';});
audio.addEventListener('pause',playingUI);
audio.addEventListener('loadedmetadata',()=>{audio.currentTime=edges().start;});
function finishClip() {
  if(audio.paused) return;
  if(loop && !previewOnly) { audio.currentTime=edges().start; return; }
  audio.pause(); audio.currentTime=edges().end; previewOnly=false;
  get('playback-status').textContent='Теперь произнесите фразу вслух';
}
audio.addEventListener('timeupdate',()=>{if(audio.currentTime>=edges().end-.03)finishClip();});
audio.addEventListener('ended',()=>{if(loop && !previewOnly)play(true);else{previewOnly=false;get('playback-status').textContent='Теперь произнесите фразу вслух';}});
audio.addEventListener('error',()=>{get('playback-status').textContent='Запись недоступна';});
let gesture=null, suppressClick=false;
get('circle-body').addEventListener('pointerdown',event=>{
  if(!event.isPrimary || event.button!==0 || event.target.closest('.sync-panel') || (get('circle-body').scrollHeight>get('circle-body').clientHeight+2 && !event.target.closest('.scene-placeholder')))return;
  gesture={x:event.clientX,y:event.clientY,pointer:event.pointerId};
  if(event.target.closest('.scene-placeholder'))get('circle-body').setPointerCapture(event.pointerId);
});
get('circle-body').addEventListener('pointerup',event=>{
  if(!gesture || gesture.pointer!==event.pointerId)return;
  const dy=event.clientY-gesture.y,dx=event.clientX-gesture.x;gesture=null;
  if(Math.abs(dy)>65 && Math.abs(dy)>Math.abs(dx)*1.5){suppressClick=true;navigate(dy<0?1:-1);setTimeout(()=>suppressClick=false,0);}
});
get('circle-body').addEventListener('pointercancel',()=>gesture=null);
get('circle-body').addEventListener('click',event=>{if(suppressClick){event.preventDefault();event.stopImmediatePropagation();}},true);
document.addEventListener('keydown',event=>{
  if(get('dictionary').open || event.target.closest('input,button,a,summary'))return;
  if(event.key==='ArrowUp'){event.preventDefault();navigate(1);} if(event.key==='ArrowDown'){event.preventDefault();navigate(-1);}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();get('playback-status').textContent='Пауза';}});
get('sync-panel').addEventListener('toggle',updateScrollMode);
window.addEventListener('resize',updateScrollMode);
window.addEventListener('pagehide',stop);
renderPhrase();

}else{window.WordRecallData?.emptyExercise();}
