(() => {
'use strict';

// Демонстрационная последовательность. Рейтинг и число дефиниций заданы
// данными, а не вычисляются по пользовательскому прогрессу.
const GROUPS = [
  { rank: 100, words: 'time way day people work life hand part place case point world house end state family school country home water room mother area money story fact month lot right study book eye job word business issue side kind head service friend father power hour game line night name help turn move live believe bring happen write provide sit stand lose pay meet include continue set learn change lead understand watch follow stop create speak read allow add spend grow open walk win offer remember love consider appear buy wait serve die send expect build stay fall cut reach remain suggest raise pass sell require report decide pull return explain hope develop carry break receive agree support hit produce eat cover catch draw choose cause listen realize close involve increase feel become leave put mean keep let begin seem talk start show hear play run need tell find give call think take see come look use want know make get go say have do be' },
  { rank: 500, words: 'actually reservation grab mind sense near coffee table hotel airport train ticket travel breakfast arrive visit borrow promise invite prefer explain forget notice answer question possible ready enough together outside inside across behind almost already perhaps instead especially usually finally suddenly' },
  { rank: 1000, words: 'confident hesitate recognize fluent pronounce conversation opportunity arrange comfortable familiar curious approach improve patient effort attention' }
];
const TEST_WORDS = GROUPS.flatMap(group => [...new Set(group.words.split(' '))].map((word, i) => ({ id: word, word, rank: group.rank, definitions: [18, 6, 12, 4, 9, 7, 15, 3, 8, 5][i % 10] }))).filter((word, i, all) => all.findIndex(other => other.id === word.id) === i);
const WORDS=window.WordRecallData?.isTest===false?[]:TEST_WORDS;
const STORAGE_KEY = 'word-recall-screen-01-v1';
const $ = id => document.getElementById(id);
const TODAY = () => { const date = new Date(); return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-'); };
const integer = (value, fallback = 1) => Number.isFinite(Number(value)) && Number(value) >= 1 ? Math.min(1000, Math.floor(Number(value))) : fallback;
const defaults = () => ({ version: 1, tab: 'learn', batch: 10, statuses: window.WORD_RECALL_TEST_FIXTURE?Object.fromEntries([...window.WORD_RECALL_TEST_FIXTURE.learningWords.map(id=>[id,'learn']),...window.WORD_RECALL_TEST_FIXTURE.knownWords.map(id=>[id,'known'])]):Object.fromEntries(WORDS.slice(0,16).map((w,i)=>[w.id,i<12?'learn':'known'])), day: TODAY(), addedToday: window.WordRecallData?.isTest===false?0:12, settings: { grammar: 'A2', capacity: 50, dailyLimit: 30, autoEnabled: false, autoCount: 5, preferOne: true, autoKnown: true } });
let state = defaults();
function restore(){
try {
  const saved = JSON.parse((window.WordRecallData?.local || localStorage).getItem(STORAGE_KEY));
  if (saved?.version === 1 && saved.statuses && saved.settings) {
    if(window.WordRecallData?.isTest===false){WORDS.splice(0,WORDS.length,...Object.keys(saved.statuses).filter(id=>['learn','known'].includes(saved.statuses[id])).map(id=>({id,word:id})));}
    state = { ...defaults(), ...saved, settings: { ...defaults().settings, ...saved.settings } };
    state.statuses = Object.fromEntries(WORDS.filter(w => ['learn', 'known'].includes(saved.statuses[w.id])).map(w => [w.id, saved.statuses[w.id]]));
    state.tab = ['learn', 'cycle', 'known'].includes(state.tab) ? state.tab : 'learn';
    state.batch = integer(state.batch, 10);
    state.settings.capacity = integer(state.settings.capacity, 50);
    state.settings.dailyLimit = integer(state.settings.dailyLimit, 30);
    state.settings.autoCount = integer(state.settings.autoCount, 5);
    state.addedToday = Math.max(0, Math.floor(Number(state.addedToday) || 0));
  }
} catch { /* Private/file mode may disallow storage; current session still works. */ }
}
restore();
let storageWarningShown = false;
let lastMove = null;
let toastTimer;

function rolloverDay() { if (state.day !== TODAY()) { state.day = TODAY(); state.addedToday = 0; } }
function persist() {
  try { (window.WordRecallData?.local || localStorage).setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { if (!storageWarningShown) { storageWarningShown = true; showToast('Браузер не разрешает сохранение. Изменения останутся только в этом сеансе.'); } }
}
function cycleIds() { return new Set(window.WordRecallCycle?.state.words.map(w => w.id) || []); }
function count(status) { const selected=cycleIds(),queued=new Set(window.WordRecallCycle?.state.queueIds||[]); return status==='cycle'?selected.size:WORDS.filter(w => !selected.has(w.id) && (state.statuses[w.id] === status || status==='learn'&&queued.has(w.id))).length; }
function freshWords(){const selected=cycleIds(),queued=new Set(window.WordRecallCycle?.state.queueIds||[]);return WORDS.filter(w=>!state.statuses[w.id]&&!selected.has(w.id)&&!queued.has(w.id));}
function remaining() { return { list: Math.max(0, state.settings.capacity - count('learn')), day: Math.max(0, state.settings.dailyLimit - state.addedToday), pool: freshWords().length }; }
function plural(n, one, few, many) { const ten = n % 10, hundred = n % 100; return hundred >= 11 && hundred <= 14 ? many : ten === 1 ? one : ten >= 2 && ten <= 4 ? few : many; }
function showToast(message, undoable = false) {
  clearTimeout(toastTimer);
  if(!$('toast'))return;
  $('toast-text').textContent = message;
  $('undo').hidden = !undoable;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; lastMove = null; }, undoable ? 9000 : 5500);
}
function clearToast() { clearTimeout(toastTimer); if($('toast'))$('toast').hidden = true; lastMove = null; }
function scrollListStart(){
  const list=$('word-list'),scroller=$('words-scroll');
  if(scroller){const tabs=document.querySelector('.list-controls');scroller.scrollTop=Math.min(scroller.scrollTop,Math.max(0,list.offsetTop-tabs.offsetHeight));}
  else if(list)list.scrollTop=0;
}
function renderStatus() {
  rolloverDay();
  if(!$('add-words'))return;
  $('batch').value=state.batch;$('batch-label').textContent=state.batch;
  $('batch-minus').disabled=state.batch<=1;$('batch-plus').disabled=state.batch>=1000;
  const r=remaining();$('add-words').disabled=state.batch>Math.min(r.list,r.day,r.pool);
  const hint=$('add-availability');if(hint){hint.replaceChildren();const allowed=Math.min(r.list,r.day,r.pool);hint.textContent=!r.pool?'Нет новых слов для добавления.':!r.list?'Список «Изучаю» заполнен. Перенесите слова в цикл или увеличьте лимит в настройках.':!r.day?'На сегодня достигнут лимит новых слов. Его можно изменить в настройках.':state.batch>allowed?`Сейчас можно добавить не больше ${allowed} слов. Уменьшите партию.`:'';hint.hidden=!hint.textContent;}
  document.querySelectorAll('[data-vocabulary-count]').forEach(counter=>{counter.textContent=count(counter.dataset.vocabularyCount);});
  if(!$('word-list'))return;
  for(const tab of ['learn','cycle','known']){
    $(tab+'-count').textContent=count(tab);
    $('tab-'+tab).setAttribute('aria-selected',state.tab===tab);
    $('tab-'+tab).tabIndex=state.tab===tab?0:-1;
  }
  $('word-list').setAttribute('aria-labelledby','tab-'+state.tab);
}
function renderList() {
  const list = $('word-list');if(!list)return;
  const selected=cycleIds(),queued=new Set(window.WordRecallCycle?.state.queueIds||[]);
  const rows = state.tab==='cycle' ? WORDS.filter(word=>selected.has(word.id)) : WORDS.filter(word => !selected.has(word.id) && (state.statuses[word.id] === state.tab || state.tab==='learn'&&queued.has(word.id)));
  list.replaceChildren();
  if (!rows.length) {

    const empty = document.createElement('div'); empty.className = 'empty';
    const title=document.createElement('h3');title.textContent='Нет слов';
    const text=document.createElement('p');text.textContent=state.tab==='known'?'Здесь будут слова, которые вы отметите как знакомые.':state.tab==='cycle'?'Добавьте слова в цикл из вкладки «Изучаю».':'Добавьте новую партию слов с помощью блока выше.';empty.append(title,text);list.append(empty);return;
  }
  rows.forEach(word => {
    const row = document.createElement('div'); row.className = 'word-row'; row.dataset.id = word.id; row.dataset.status = state.tab;
    const target = state.tab === 'learn' ? 'Знаю' : 'Изучаю';
    const underlay = document.createElement('div'); underlay.className = 'row-underlay'; underlay.setAttribute('aria-hidden', 'true');
    const destination = document.createElement('strong'); destination.textContent = `В «${target}»`;
    const definitions = document.createElement('span'); definitions.className = 'definitions';
    definitions.textContent = word.definitions + ' ' + plural(word.definitions, 'дефиниция', 'дефиниции', 'дефиниций');
    underlay.append(destination);if(Number.isFinite(word.definitions))underlay.append(definitions);
    const front = document.createElement('div'); front.className = 'row-front';
    const rank = document.createElement('span'); rank.className = 'rank'; rank.textContent = '#' + word.rank; rank.setAttribute('aria-label', 'Топ ' + word.rank);
    const name = document.createElement('span'); name.className = 'word-name'; name.textContent = word.word;
    row.tabIndex = 0;
    row.setAttribute('aria-label', `${word.word}${Number.isFinite(word.rank)?', топ '+word.rank:''}. ${state.tab === 'learn' ? 'Стрелка вправо' : 'Стрелка влево'}: перенести в «${target}».`);
    row.addEventListener('keydown', event => {
      if (event.target===row&&event.key === (state.tab === 'learn' ? 'ArrowRight' : 'ArrowLeft')) { event.preventDefault(); moveWord(word.id); }
    });
    if(Number.isFinite(word.rank))front.append(rank);front.append(name); row.append(underlay, front); list.append(row);
    if(state.tab==='learn'&&window.CYCLE_CORPUS.words.some(w=>w.id===word.id)){
      const add=document.createElement('button');add.className='add-to-cycle';add.textContent='В цикл';add.setAttribute('aria-label',`Добавить ${word.word} в текущий цикл`);
      add.addEventListener('click',()=>{const result=window.WordRecallCycle.changeWord(window.WordRecallCycle.state,word.id,true);if(!result.ok){showToast(result.message);return;}render();showToast(`${word.word} → «Текущий цикл»`);});front.append(add);
    }
    bindSwipe(row, front, word.id);
  });
}
function render() { renderStatus(); renderList(); }
function moveWord(id, automatic = false) {
  if(state.tab==='cycle'){
    const result=window.WordRecallCycle.changeWord(window.WordRecallCycle.state,id,false);
    if(!result.ok){showToast(result.message);return;}
    lastMove={id,from:'cycle',to:'learn',role:result.role};render();showToast(`${id} → «Изучаю»`,true);return;
  }
  const from = state.statuses[id] || (window.WordRecallCycle?.state.queueIds.includes(id)?'learn':null); if (!from) return;
  const to = automatic ? 'known' : from === 'learn' ? 'known' : 'learn';
  if (from === to) return;
  const hadFocus = $('word-list').contains(document.activeElement);
  const rowIndex = [...$('word-list').children].findIndex(row => row.dataset.id === id);
  lastMove = { id, from, to, fromQueue:window.WordRecallCycle?.state.queueIds.includes(id) };
  state.statuses[id] = to;
  if(to==='known'&&lastMove.fromQueue)window.WordRecallCycle.setQueue(window.WordRecallCycle.state,id,false);
  render(); persist();
  if (hadFocus) { const rows = $('word-list').querySelectorAll('.word-row'); (rows[Math.min(rowIndex, rows.length - 1)] || $('tab-' + state.tab)).focus({ preventScroll: true }); }
  showToast(`${id} → ${to === 'known' ? '«Знаю»' : '«Изучаю»'}`, true);
}
function bindSwipe(row, front, id) {
  let gesture = null;
  row.addEventListener('pointerdown', event => {
    if (event.target.closest('button') || !event.isPrimary || event.button !== 0) return;
    gesture = { x: event.clientX, y: event.clientY, dx: 0, direction: state.tab === 'learn' ? 1 : -1, pointer: event.pointerId, horizontal: false };
  });
  row.addEventListener('pointermove', event => {
    if (!gesture || event.pointerId !== gesture.pointer) return;
    const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
    if (!gesture.horizontal && Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) { gesture = null; return; }
    if (!gesture.horizontal && Math.abs(dx) > 9 && Math.abs(dx) > Math.abs(dy)) { gesture.horizontal = true; row.setPointerCapture(event.pointerId); row.classList.add('dragging'); }
    if (!gesture.horizontal) return;
    gesture.dx = dx * gesture.direction > 0 ? Math.min(Math.abs(dx), 155) * gesture.direction : 0;
    front.style.transform = `translateX(${gesture.dx}px)`;
  });
  const end = event => {
    if (!gesture || event.pointerId !== gesture.pointer) return;
    const commit = event.type === 'pointerup' && Math.abs(gesture.dx) >= 70;
    gesture = null;
    if (commit) moveWord(id);
    else { front.style.transition = 'transform 160ms ease'; front.style.transform = ''; setTimeout(() => { row.classList.remove('dragging'); front.style.transition = ''; }, 165); }
  };
  row.addEventListener('pointerup', end); row.addEventListener('pointercancel', end); row.addEventListener('lostpointercapture', end);
  row.addEventListener('pointerleave', () => { if (gesture && !gesture.horizontal) gesture = null; });
}
function addWords(amount, automatic = false) {
  restore();rolloverDay();
  if (automatic && !state.settings.autoEnabled) { showToast('Автодобавление выключено.'); return false; }
  const r = remaining();
  if (amount > Math.min(r.list, r.day, r.pool)) {
    renderStatus();showToast('Лимит добавления достигнут.');return false;
  }
  const fresh = freshWords().slice(0, amount);
  fresh.forEach(w => { state.statuses[w.id] = 'learn'; });
  state.addedToday += fresh.length; state.tab = 'learn'; lastMove = null;
  render(); persist();
  const firstNew = [...($('word-list')?.children||[])].find(row => row.dataset.id === fresh[0]?.id);
  if(firstNew){const scroller=$('words-scroll');if(scroller)scroller.scrollTop=Math.max(0,firstNew.offsetTop-document.querySelector('.list-controls').offsetHeight);else $('word-list').scrollTop=firstNew.offsetTop-$('word-list').firstElementChild.offsetTop;}
  showToast(`Добавлено ${fresh.length} ${plural(fresh.length, 'слово', 'слова', 'слов')} в «Изучаю».`); return true;
}
function sync(){restore();rolloverDay();const cycle=window.WordRecallCycle?.read();if(cycle)window.WordRecallCycle.state=cycle;render();}
window.WordRecallWords={key:STORAGE_KEY,get state(){return state;},sync,
  updateSettings(settings){restore();state.settings={...state.settings,...settings};rolloverDay();persist();render();}
};
window.addEventListener(window.WordRecallData?'word-recall-data-change':'storage',event=>{if([STORAGE_KEY,window.WordRecallCycle?.key].includes(event.detail?.key||event.key))sync();});
window.addEventListener('pageshow',sync);
if(!$('add-words'))return;
function changeBatch(value) { state.batch = integer(value, state.batch); renderStatus(); persist(); }
$('batch-minus').addEventListener('click', () => changeBatch(Math.max(1, state.batch - 5)));
$('batch-plus').addEventListener('click', () => changeBatch(state.batch + 5));
// Тап по числу увеличивает партию; поле по-прежнему допускает ручной ввод.
$('batch').addEventListener('click', event => { if (event.detail > 0) changeBatch(state.batch + 5); });
$('batch').addEventListener('input', event => { const n = Number(event.target.value); if (Number.isInteger(n) && n > 0 && n <= 1000) { state.batch = n; $('batch-label').textContent = n; const r = remaining(); $('add-words').disabled = n > Math.min(r.list, r.day, r.pool); renderStatus(); persist(); } });
$('batch').addEventListener('change', event => changeBatch(event.target.value));
$('add-words').addEventListener('click', () => addWords(state.batch));
document.querySelectorAll('[data-tab]').forEach(button => {
  button.addEventListener('click', () => { state.tab = button.dataset.tab; render(); scrollListStart(); persist(); });
  button.addEventListener('keydown', event => { if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); const tabs=['learn','cycle','known'];const next = $('tab-' + tabs[(tabs.indexOf(state.tab)+(event.key==='ArrowRight'?1:tabs.length-1))%tabs.length]); next.click(); next.focus(); } });
});
$('undo').addEventListener('click', () => { if (!lastMove) return; if(lastMove.from==='cycle'){const result=window.WordRecallCycle.changeWord(window.WordRecallCycle.state,lastMove.id,true,lastMove.role);if(!result.ok){showToast(result.message);return;}}else {state.statuses[lastMove.id] = lastMove.from;if(lastMove.fromQueue)window.WordRecallCycle.setQueue(window.WordRecallCycle.state,lastMove.id,true);} lastMove = null; render(); persist(); clearToast(); });
$('dismiss-toast').addEventListener('click', clearToast);
document.querySelectorAll('[data-demo]').forEach(button => button.addEventListener('click', () => {
  if(window.WordRecallData?.isTest===false)return;
  clearToast();
  switch (button.dataset.demo) {
    case 'list-limit': state.settings.capacity = Math.max(1, count('learn')); if (!count('learn')) state.statuses[WORDS[0].id] = 'learn'; state.tab = 'learn'; break;
    case 'day-limit': state.addedToday = state.settings.dailyLimit; state.day = TODAY(); break;
    case 'empty': state.statuses = {}; state.addedToday = 0; state.tab = 'learn'; break;
    case 'auto': addWords(state.settings.autoCount, true); return;
    case 'heard': {
      if (!state.settings.autoKnown) { showToast('Автоматический перенос выключен в настройках.'); return; }
      const word = WORDS.find(w => state.statuses[w.id] === 'learn');
      if (word) moveWord(word.id, true); else showToast('В «Изучаю» нет слов для переноса.');
      return;
    }
    case 'reset': state = defaults(); break;
  }
  render(); persist(); scrollListStart();
}));
rolloverDay(); render();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)sync();});

})();
