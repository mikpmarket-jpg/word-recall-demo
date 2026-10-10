(() => {
  'use strict';
  const phone=document.querySelector('.phone');if(!phone)return;
  const current=document.body.dataset.nav;
  const items=[['home','Главная','index.html'],['catalog','Каталог','catalog.html'],['cycle','Цикл','cycle.html'],['settings','Настройки','settings.html']];
  const icons={
    home:'<path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9"/>',
    catalog:'<path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v14"/>',
    cycle:'<path d="M12 12c-2.5-3.5-4-5-6-5a5 5 0 0 0 0 10c2 0 3.5-1.5 6-5s4-5 6-5a5 5 0 0 1 0 10c-2 0-3.5-1.5-6-5Z"/>',
    settings:'<path d="m9 3-.5 2.2-1.8 1L4.5 6 2.8 9l1.5 1.6v2.8L2.8 15l1.7 3 2.2-.2 1.8 1L9 21h6l.5-2.2 1.8-1 2.2.2 1.7-3-1.5-1.6v-2.8L21.2 9l-1.7-3-2.2.2-1.8-1L15 3Z"/><circle cx="12" cy="12" r="3"/>'
  };
  const nav=document.createElement('nav');nav.className='app-bottom-nav';nav.setAttribute('aria-label','Основные разделы');
  for(const [id,label,href] of items){
    const link=document.createElement('a');link.href=href;
    link.innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${icons[id]}</svg>`;
    const caption=document.createElement('span');caption.textContent=label;link.append(caption);
    if(current===id)link.setAttribute('aria-current','page');
    nav.append(link);
  }
  phone.append(nav);
})();
