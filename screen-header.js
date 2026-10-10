/* The same header structure for dynamically generated catalog screens. */
(() => {
  'use strict';
  window.WordRecallHeader={create(title,back,level='h1'){
    const header=document.createElement('div');header.className='screen-header';
    const link=document.createElement('a');link.className='header-back';link.href=back;link.textContent='‹';link.setAttribute('aria-label','Назад');
    const heading=document.createElement(level);heading.className='header-title';heading.textContent=title;heading.title=title;
    const actions=document.createElement('span');actions.className='header-actions';actions.setAttribute('aria-hidden','true');
    header.append(link,heading,actions);return header;
  }};
})();
