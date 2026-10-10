(() => {
  'use strict';
  const P=window.WordRecallPreferences,$=id=>document.getElementById(id),dialog=$('settings-dialog'),body=$('sheet-body');
  let lastTrigger=null,step=0;
  const titles={dictionaries:'Мои словари',account:'Аккаунт',subscription:'Подписка',paywall:'Подписка',restore:'Восстановить покупки',onboarding:'Цикл обучения',privacy:'Конфиденциальность',terms:'Условия использования'};
  function el(tag,text,cls){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n;}
  function action(text,fn,secondary=false){const b=el('button',text,'sheet-action'+(secondary?' secondary':''));b.type='button';b.onclick=fn;body.append(b);return b;}
  function status(text){$('service-status').textContent=text;let n=$('settings-visible-status');if(!n){n=el('p',null,'app-feedback');n.id='settings-visible-status';n.setAttribute('role','status');$('feedback-form').after(n);}n.textContent=text;if(dialog.open){let note=body.querySelector('.settings-action-status');if(!note){note=el('p',null,'settings-action-status');note.setAttribute('role','status');body.append(note);}note.textContent=text;}}
  function demo(value){if(!P.savePrototype(value)){status('Не удалось сохранить изменения.');return false;}render();return true;}
  function render(){const p=P.read(),s=P.prototype();
    for(const b of document.querySelectorAll('button[data-theme]'))b.setAttribute('aria-pressed',b.dataset.theme===p.theme);
    $('demo-plan').value=s.paid?'paid':'free';$('demo-account').value=s.signedIn?'in':'out';$('demo-content').checked=s.content;
    $('account-summary').textContent=s.signedIn?'Выполнен вход':'Войти';$('plan-summary').textContent=s.paid?'Платная':'Бесплатная';
    $('dictionary-summary').textContent=s.dictionaryEnabled?s.dictionary:'';
  }
  function fit(){const r=document.querySelector('.phone').getBoundingClientRect(),top=Math.max(8,r.top+44),bottom=Math.min(innerHeight,r.bottom);dialog.style.setProperty('--sheet-left',Math.max(0,r.left)+'px');dialog.style.setProperty('--sheet-width',r.width+'px');dialog.style.setProperty('--sheet-top',top+'px');dialog.style.setProperty('--sheet-height',Math.max(180,bottom-top)+'px');}
  function close(){dialog.close();lastTrigger?.focus();}
  function open(name){if(!dialog.open)lastTrigger=document.activeElement;body.replaceChildren();$('sheet-title').textContent=titles[name]||name;dialog.dataset.view=name;const s=P.prototype();
    if(name==='dictionaries'){
      if(s.dictionary){const card=el('div',null,'settings-card'),row=el('label',null,'general-row');row.append(el('span',s.dictionary));const toggle=document.createElement('input');toggle.type='checkbox';toggle.checked=s.dictionaryEnabled;toggle.setAttribute('role','switch');toggle.setAttribute('aria-label','Использовать '+s.dictionary);toggle.onchange=()=>{if(!demo({dictionaryEnabled:toggle.checked}))toggle.checked=!toggle.checked;};row.append(toggle);card.append(row);body.append(card);}
      action('Загрузить словарь',()=>$('dictionary-file').click());
    }else if(name==='account'){
      body.append(el('p',s.signedIn?'Выполнен вход':'Аккаунт','sheet-lead'));
      action(s.signedIn?'Выйти':'Войти',()=>{if(demo({signedIn:!s.signedIn})){open('account');}});
    }else if(name==='subscription'||name==='paywall'){
      body.append(el('p',s.paid?'Платная версия':'Бесплатная версия','sheet-lead'));
      if(!s.paid)action('Оформить подписку',()=>{if(demo({paid:true})){open('subscription');}});
      action('Восстановить покупки',()=>open('restore'),true);
    }else if(name==='restore'){
      action('Восстановить покупки',()=>{const found=$('demo-restore').value==='found';if(found&&!demo({paid:true}))return;body.replaceChildren(el('p',found?'Покупки восстановлены':'Покупки не найдены','sheet-lead'));action('Готово',close);});
    }else if(name==='onboarding'){
      const steps=[['Прояснение','Разберите смысл фраз и значения слов.'],['Аудирование','Слушайте фразы, привыкая к их звучанию.'],['Слышать и понимать','Повторяйте фразы в темпе оригинала, чтобы легче понимать быструю речь в сериалах.'],['Активная речь','Составляйте и произносите свои фразы — учитесь самостоятельно говорить по-английски.']];
      body.append(el('div',String(step+1).padStart(2,'0'),'onboarding-step'),el('p',steps[step][0],'sheet-lead'),el('p',steps[step][1]));const progress=el('div',null,'onboarding-progress');progress.setAttribute('aria-label',`Шаг ${step+1} из 4`);for(let i=0;i<4;i++)progress.append(el('span',null,i<=step?'active':''));body.append(progress);
      action(step===3?'Начать обучение':'Далее',()=>{if(step===3)location.href='cycle.html';else{step++;open('onboarding');}});if(step)action('Назад',()=>{step--;open('onboarding');},true);action('Пропустить',close,true);
    }else if(name==='privacy'||name==='terms'){
      body.append(el('p','Раздел пока недоступен.'));
    }
    if(!dialog.open)dialog.showModal();fit();body.scrollTop=0;$('close-sheet').focus();
  }
  document.addEventListener('click',e=>{const b=e.target.closest('[data-open]');if(b){if(b.dataset.open==='onboarding')step=0;open(b.dataset.open);}});
  for(const b of document.querySelectorAll('button[data-theme]'))b.onclick=()=>{if(!P.save({theme:b.dataset.theme}))status('Не удалось сохранить оформление.');render();};
  $('demo-plan').onchange=e=>demo({paid:e.target.value==='paid'});$('demo-account').onchange=e=>demo({signedIn:e.target.value==='in'});$('demo-content').onchange=e=>{if(demo({content:e.target.checked}))window.WordRecallData.checkMode();else render();};
  $('close-sheet').onclick=close;window.addEventListener('resize',()=>{if(dialog.open)fit();});
  $('dictionary-file').onchange=e=>{const file=e.target.files[0];if(file&&demo({dictionary:file.name,dictionaryEnabled:true})){open('dictionaries');}e.target.value='';};
  const feedback=$('feedback-text'),feedbackKey='word-recall-feedback-draft-v1';
  try{feedback.value=localStorage.getItem(feedbackKey)||'';}catch{}
  const updateFeedback=()=>{$('send-feedback').disabled=!feedback.value.trim();};
  feedback.addEventListener('input',()=>{updateFeedback();try{localStorage.setItem(feedbackKey,feedback.value);}catch{}});
  $('feedback-form').addEventListener('submit',e=>{e.preventDefault();if(!feedback.value.trim())return;status('Не удалось отправить сообщение. Ваш текст сохранён.');});
  updateFeedback();render();const initial=new URLSearchParams(location.search).get('view');if(titles[initial])open(initial);
})();
