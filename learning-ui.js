/* Common controls used by the cycle, vocabulary and listening screens. */
(() => {
  'use strict';
  const showVocabulary=document.body.dataset.nav==='cycle';
  const settingsIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h7m5 0h4M4 17h3m5 0h8"/><circle cx="13.5" cy="7" r="2.5"/><circle cx="9.5" cy="17" r="2.5"/></svg>';
  for(const host of document.querySelectorAll('[data-word-add-panel]'))host.innerHTML=`
    <section class="add-panel${showVocabulary?' with-vocabulary-link':''}" aria-labelledby="add-title">
      ${showVocabulary?'<h3 class="vocabulary-title">Словарный запас</h3>':''}
      <div class="add-heading"><h3 id="add-title">Добавить слова</h3>${showVocabulary?'':`<button class="settings-link" id="open-settings" aria-haspopup="dialog" aria-label="Настройки цикла обучения">${settingsIcon}Настройки</button>`}</div>
      <div class="add-controls" aria-describedby="add-availability"><div class="quantity"><button id="batch-minus" aria-label="Уменьшить партию">−</button><input id="batch" aria-label="Количество слов в партии" type="number" step="1" min="1" max="1000" value="10"><button id="batch-plus" aria-label="Увеличить партию">+</button></div><button class="primary add-button" id="add-words">Добавить <span id="batch-label">10</span><span aria-hidden="true">↗</span></button></div>
      <p class="add-availability" id="add-availability" role="status"></p>
      ${showVocabulary?`<button class="cycle-settings-link" id="open-cycle-settings" aria-haspopup="dialog"><span>Настроить цикл обучения</span>${settingsIcon}</button>`:''}
      ${showVocabulary?`<dl class="vocabulary-counts" aria-label="Состав словарного запаса"><div><dt>Изучаю</dt><dd data-vocabulary-count="learn"></dd></div><div><dt>Текущий цикл</dt><dd data-vocabulary-count="cycle"></dd></div><div><dt>Знаю</dt><dd data-vocabulary-count="known"></dd></div></dl><a class="vocabulary-link" id="open-cycle-words" href="words.html">Все слова словарного запаса <span aria-hidden="true">→</span></a>`:''}
    </section>`;
  if(document.querySelector('[data-word-add-panel]')&&!document.getElementById('toast')){
    const toast=document.createElement('div');toast.id='toast';toast.className='toast';toast.hidden=true;toast.setAttribute('role','status');
    toast.innerHTML='<span id="toast-text"></span><button id="undo" hidden>Отменить</button><button id="dismiss-toast" aria-label="Закрыть уведомление">×</button>';
    document.querySelector('.phone').append(toast);
  }
  const dialog=document.createElement('dialog');dialog.id='cycle-settings';dialog.className='learning-settings';dialog.setAttribute('aria-labelledby','cycle-settings-title');
  dialog.innerHTML=`<form id="cycle-settings-form">
    <div class="sheet-header"><span class="grab" aria-hidden="true"></span><div class="sheet-heading"><h2 id="cycle-settings-title">Настройки цикла обучения</h2><button type="button" class="close" id="close-cycle-settings" aria-label="Закрыть настройки">×</button></div></div>
    <div class="sheet-scroll">
      <fieldset class="settings-view" data-settings-view="cycle">
        <section class="settings-section" aria-labelledby="new-words-title">
          <h3 class="settings-section-title" id="new-words-title">Новые слова</h3>
          <label class="setting-row"><span><strong>Добавлять новых слов в день</strong><small>Сколько новых слов вы получаете для изучения каждый день</small></span><input id="daily-limit" type="number" min="1" max="1000" required></label>
          <label class="switch-row"><span><strong>Добавлять автоматически</strong><small>Система сама добавляет новые слова для изучения</small></span><input id="auto-enabled" class="switch" type="checkbox"></label>
          <label class="setting-row"><span><strong>Максимальное количество слов в «Изучаю»</strong><small>Сколько новых слов можно накопить, ещё не изучив</small></span><input id="capacity" type="number" min="1" max="1000" required></label>
        </section>
        <section class="settings-section grammar-section" aria-labelledby="grammar-title">
          <h3 class="settings-section-title" id="grammar-title">Грамматика</h3>
          <p class="grammar-label">Подбирать фразы с грамматикой до уровня</p>
          <div class="grammar" role="group" aria-label="Уровень грамматики">${['A1','A2','B1','B2','Не знаю'].map(level=>`<button type="button" data-grammar="${level}">${level}</button>`).join('')}</div>
        </section>
        <details class="experiment-settings" id="experiment-settings"><summary>Параметры для тестирования</summary>
          <section class="experiment-group" aria-labelledby="rounds-title"><h3 id="rounds-title">Круги обучения</h3><div id="round-settings"></div></section>
          <section class="experiment-group" aria-labelledby="interleave-title">
            <h3 id="interleave-title">Чередование кругов</h3>
            <label class="switch-row"><span>Чередовать круги</span><input id="interleave-enabled" class="switch" type="checkbox"></label>
            <div id="interleave-counts">
              <label class="setting-row"><span>Слышать и понимать — фраз подряд</span><input id="interleave-listening" type="number" min="1" max="100" required></label>
              <label class="setting-row"><span>Активная речь — заданий подряд</span><input id="interleave-speaking" type="number" min="1" max="100" required></label>
              <output class="interleave-preview" id="interleave-preview" aria-live="polite"></output>
            </div>
          </section>
          <section class="experiment-group" aria-labelledby="phrases-title">
            <h3 id="phrases-title">Фразы и значения</h3>
            <label class="setting-row"><span>Фраз на слово</span><input id="cycle-phrases" type="number" min="1" max="3" required></label>
            <label class="switch-row"><span>Разные значения слова</span><input id="cycle-meanings" class="switch" type="checkbox"></label>
          </section>
        </details>
      </fieldset>
      <fieldset class="settings-view" data-settings-view="audio" hidden disabled><div class="audio-settings-fields">

        <label>Порядок озвучки<select id="demo-sequence"><option value="ru-en">Перевод → английский</option><option value="en">Только английский</option><option value="en-ru">Английский → перевод</option></select></label>
        <label>Повторов фразы<input id="demo-repeats" type="number" min="1" max="20" step="1" required></label>
        <label>Перевод<select id="demo-translation"><option value="both">Текст и звук</option><option value="sound">Звук</option><option value="text">Текст</option></select></label>
        <label>Пауза между повторами, с<input id="demo-repeat-pause" type="number" min="0" max="10" step="0.5" required></label>
        <label>Пауза между фразами, с<input id="demo-phrase-pause" type="number" min="0" max="10" step="0.5" required></label>
        <label>Автоскролл<input id="demo-autoscroll" class="switch" type="checkbox"></label>
        <label>После активной карточки<select id="demo-continuation"><option value="next">Продолжать список</option><option value="single">Остановиться</option></select></label>
        <label>Повторять список<input id="block-loop" class="switch" type="checkbox"></label>
      </div></fieldset>
      <p id="settings-error" class="settings-error" role="alert" hidden></p>
    </div>
    <div class="sheet-footer"><button class="primary" type="submit" id="save-cycle-settings">Сохранить настройки</button></div>
  </form>`;
  document.body.append(dialog);
})();
