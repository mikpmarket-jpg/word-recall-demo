/* Contextual empty states. */
(() => {
  'use strict';
  const phone=document.querySelector('.phone');if(!phone)return;
  const page=location.pathname.split('/').pop();
  const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
  function note(parent,id,text,href,label){
    if(parent.querySelector('#'+id))return;
    const n=el('div','guidance-empty');n.id=id;n.append(el('p','',text));
    if(href){const a=el('a','app-button secondary',label);a.href=href;n.append(a);}parent.append(n);
  }
  function refresh(){
    if(!phone.isConnected)return;
    const params=new URLSearchParams(location.search),personal=window.WordRecallData?.isTest===false;
    for(const [i,list] of [...phone.querySelectorAll('.video-list')].entries()){
      const empty=list.querySelector('.guidance-empty');if(list.querySelector('.video-card')){empty?.remove();continue;}if(empty)continue;
      const filtered=['q','lex','gram','maxSec','type'].some(k=>params.get(k))||(params.get('category')&&params.get('category')!=='all');
      const reset=new URL(location.href);for(const k of ['q','lex','gram','maxSec','type','category','page'])reset.searchParams.delete(k);
      if(filtered)note(list,'empty-list-'+i,'По этим условиям ничего не найдено. Попробуйте другой запрос или сбросьте фильтры.',reset.pathname.split('/').pop()+reset.search,'Сбросить поиск и фильтры');
      else if(params.get('view')==='work')note(list,'empty-list-'+i,'Здесь появятся материалы, которые вы начали читать, смотреть или слушать.',page+(page==='catalog.html'&&params.get('section')==='topics'?'?section=topics':''),'Выбрать материал');
      else if(page==='uploads.html')note(list,'empty-list-'+i,'У вас пока нет своих материалов. Добавьте текст, субтитры, видеофайл или ссылку.','uploads.html?add=1','Добавить материал');
      else note(list,'empty-list-'+i,personal?'В каталоге пока нет материалов. Вы можете добавить свои.':'В этом разделе пока нет материалов.',personal?'uploads.html?add=1':'catalog.html',personal?'Добавить материал':'В каталог');
    }
    const actions=phone.querySelector('.video-actions');
    if(actions&&actions.querySelector('button:disabled'))note(actions.parentElement,'unavailable-material','Этот материал пока недоступен.',page==='catalog.html'&&params.get('section')==='topics'?'catalog.html?section=topics':'catalog.html','Выбрать другой материал');
    const rounds=document.getElementById('cycle-rounds');if(rounds&&!window.WordRecallCycle?.state.phraseIds.length)note(rounds,'empty-cycle','В цикле пока нет фраз для занятия. Добавьте слова и выберите их в словарном запасе.','words.html','Открыть словарный запас');
  }
  new MutationObserver(refresh).observe(phone,{childList:true,subtree:true});refresh();
})();
