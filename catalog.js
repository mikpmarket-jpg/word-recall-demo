(() => {
  'use strict';
  const data=window.WordRecallPreferences?.prototype().content===false?{...window.APP_CATALOG,shows:[],topics:[]}:window.APP_CATALOG,screen=document.getElementById('catalog-screen'),work=window.WordRecallVideoWork;
  const params=new URLSearchParams(location.search),pageSize=6;
  const nav=window.WordRecallNavigation;
  const section=params.get('section');
  if(section==='uploads'){location.replace('uploads.html');return;}
  if(section==='topics'){window.WordRecallTopics();return;}
  const category=['series','learning'].includes(params.get('category'))?params.get('category'):['series','learning'].includes(section)?section:'all';
  const view=params.get('view')==='work'?'work':'all';
  const filters=window.WordRecallFilter,criteria=filters.read(params);
  const matchesFilter=clip=>filters.match(clip,criteria);
  function attachFilter(button,withCategory=false){filters.attach(button,{values:{...criteria,...(withCategory?{category}:{})},names:[...(withCategory?['category']:[]),'lex','gram','maxSec'],onApply:values=>{const next=new URLSearchParams(location.search);next.set('section','video');next.delete('page');for(const name of ['lex','gram','maxSec',...(withCategory?['category']:[])]){next.delete(name);if(values[name]&&values[name]!=='all')next.set(name,values[name]);}location.href=path(Object.fromEntries(next));}});}
  let query=params.get('q')||'';
  const rootValues=()=>({section:'video',category,view,...filters.query(criteria),...(query?{q:query}:{})});
  const path=values=>'catalog.html?'+new URLSearchParams({...nav.context(),...values}).toString();
  const collection=data.shows.find(s=>s.id===params.get('collection'));
  const material=collection?.clips.find(c=>c.id===params.get('clip'));
  const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text!=null)n.textContent=text;return n;};
  const link=(href,cls,text)=>{const n=el('a',cls,text);n.href=cls.includes('video-card')?nav.enter(href):href;return n;};
  const exists=value=>Number.isFinite(value)&&value>=0;
  const percent=value=>exists(value)&&value<=100;
  const visible=material=>material.available!==false;
  const count=(n,forms)=>`${n} ${forms[n%100>=11&&n%100<=14?2:n%10===1?0:n%10>=2&&n%10<=4?1:2]}`;
  const duration=sec=>{if(!exists(sec))return null;const value=Math.round(sec);return `${Math.floor(value/60)}:${String(value%60).padStart(2,'0')}`;};
  const tempo=item=>Array.isArray(item.speechTempoRange)&&item.speechTempoRange.length===2&&item.speechTempoRange.every(exists)?`≈ ${item.speechTempoRange[0]}–${item.speechTempoRange[1]} слов/мин`:null;
  const level=item=>[item.lexicalLevel?`Лексика ${item.lexicalLevel}`:null,item.grammarLevel?`Грамматика ${item.grammarLevel}`:null].filter(Boolean).join(' · ');
  const shapes={search:'<circle cx="10" cy="10" r="6.5"/><path d="m15 15 5 5"/>',filter:'<path d="M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6"/>',add:'<path d="M12 4v16M4 12h16"/>',ai:'<path d="m12 2 2.7 7.3L22 12l-7.3 2.7L12 22l-2.7-7.3L2 12l7.3-2.7Z"/>',cards:'<rect x="7" y="7" width="13" height="14" rx="2"/><path d="M4 17H3V3h13v1M10 12h7M10 16h5"/>',audio:'<path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="12" width="4" height="8" rx="2"/><rect x="17" y="12" width="4" height="8" rx="2"/>'};
  function icon(name){const node=document.createElementNS('http://www.w3.org/2000/svg','svg');node.setAttribute('viewBox','0 0 24 24');node.setAttribute('aria-hidden','true');node.innerHTML=shapes[name];return node;}
  function iconButton(name,label){const button=el('button','catalog-icon');button.type='button';button.setAttribute('aria-label',label);button.append(icon(name));return button;}
  function header(title,back,filter=false){
    const box=el('header','app-page-header catalog-header'),h=window.WordRecallHeader.create(title,nav.back(back||'index.html'));
    if(!back&&!nav.hasReturn())h.querySelector('.header-back').replaceWith(el('span','header-back'));
    if(filter){const slot=h.querySelector('.header-actions');slot.removeAttribute('aria-hidden');const button=iconButton('filter','Фильтр');slot.append(button);attachFilter(button);}
    box.append(h);screen.append(box);
  }
  function thumbnail(src,cls='video-cover'){
    if(!src)return null;
    const img=el('img',cls);img.alt='';img.src=src;img.loading='lazy';img.addEventListener('error',()=>img.remove(),{once:true});return img;
  }
  function metadata(parent,values,cls='video-card-meta'){
    const items=values.filter(v=>v!==null&&v!==undefined&&v!=='');if(!items.length)return;
    const row=el('div',cls);items.forEach(v=>row.append(el('span','',v)));parent.append(row);
  }
  function card(title,cover,href,cls=''){
    const node=href?link(href,'video-card '+cls):el('button','video-card '+cls);if(!href)node.type='button';
    const image=thumbnail(cover);if(image)node.append(image);
    const text=el('span','video-card-content');text.append(el('strong','video-card-title',title));node.append(text);
    const chevron=el('span','video-chevron','›');chevron.setAttribute('aria-hidden','true');node.append(chevron);return {node,text};
  }
  function materialTitle(clip,show){
    const parts=clip.title.split(/\s*[|｜]\s*/);
    const normalize=value=>value.replace(/_/g,' ').trim().toLocaleLowerCase();
    if(parts.length>1&&normalize(parts[parts.length-1])===normalize(show.title))parts.pop();
    return parts.join(' | ');
  }
  function materialCard(show,clip,href,ordinal){
    const result=card(materialTitle(clip,show),null,href,'material-card');
    result.node.prepend(el('span','material-number',String(ordinal)));
    return result;
  }
  function wordCounts(parent,clip){
    if(!exists(clip.words))return;
    const fresh=exists(clip.unfamiliarWords)?clip.unfamiliarWords:clip.words;
    const row=el('div','video-card-meta material-words');
    row.append(el('span','',count(clip.words,['слово','слова','слов'])),document.createTextNode(' · '),el('strong','material-new',`${fresh} новых`));
    parent.append(row);
  }
  function materialFacts(parent,clip){
    const timing=el('div','video-card-meta material-timing');
    if(duration(clip.sec)!==null)timing.append(el('span','material-duration',duration(clip.sec)));
    if(tempo(clip)){if(timing.childNodes.length)timing.append(document.createTextNode(' · '));timing.append(el('span','material-tempo',tempo(clip)));}
    if(timing.childNodes.length)parent.append(timing);
    wordCounts(parent,clip);
    const levels=el('div','video-card-meta material-levels');
    for(const [label,value] of [['Лексика',clip.lexicalLevel],['Грамматика',clip.grammarLevel]]){
      if(!value)continue;
      if(levels.childNodes.length)levels.append(document.createTextNode(' · '));
      const mark=el('span','material-level',`${label} `);mark.append(el('strong','',value));levels.append(mark);
    }
    if(levels.childNodes.length)parent.append(levels);
  }
  function catalogRoot(){
    screen.classList.add('catalog-root');
    header('Каталог');
    const tabs=el('nav','catalog-tabs');tabs.setAttribute('aria-label','Каталог');
    for(const [title,href] of [['Видео',path(rootValues())],['Топики',path({section:'topics'})],['Мои загрузки','uploads.html']]){const a=link(href,'',title);if(title==='Видео')a.setAttribute('aria-current','page');tabs.append(a);}screen.append(tabs);
    const toolbar=el('div','catalog-toolbar'),views=el('nav','catalog-views');views.setAttribute('aria-label','Видео');
    for(const [id,title] of [['all','Все'],['work','В работе']]){const a=link(path({...rootValues(),view:id}),'',title);if(view===id)a.setAttribute('aria-current','page');views.append(a);}toolbar.append(views);
    const search=iconButton('search','Поиск'),filter=iconButton('filter','Фильтр'),add=link('uploads.html?add=1','catalog-icon add');add.setAttribute('aria-label','Добавить');add.append(icon('add'));toolbar.append(search,filter,add);screen.append(toolbar);
    const input=el('input','app-search catalog-search');input.type='search';input.value=query;input.setAttribute('aria-label','Поиск');input.id='video-search';input.hidden=!query;search.setAttribute('aria-expanded',String(!input.hidden));search.setAttribute('aria-controls',input.id);screen.append(input);
    search.addEventListener('click',()=>{input.hidden=!input.hidden;search.setAttribute('aria-expanded',String(!input.hidden));if(!input.hidden)input.focus();});
    attachFilter(filter,true);
    const list=el('div','video-list');screen.append(list);
    function paint(){
      list.replaceChildren();const matches=item=>item.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
      if(view==='work'){
        for(const session of work.read()){
          const show=data.shows.find(s=>s.id===session.collectionId),clip=show?.clips.find(c=>c.id===session.materialId);
          if(!show||show.available===false||!clip||!visible(clip)||!matchesFilter(clip)||(category!=='all'&&show.section!==category)||!matches(clip))continue;
          const ordinal=collectionState(show,clip).fullItems.indexOf(clip)+1;
          const {node,text}=materialCard(show,clip,null,ordinal);node.dataset.materialId=clip.id;
          metadata(text,[show.title]);materialFacts(text,clip);
          node.disabled=!work.available(session.mode,clip);node.addEventListener('click',()=>work.start(show,clip,session.mode,session).catch(()=>{}));list.append(node);
        }
      }else{
        for(const show of data.shows){
          const clips=show.clips.filter(c=>visible(c)&&matchesFilter(c));if(show.available===false||!clips.length||(category!=='all'&&show.section!==category)||!matches(show))continue;
          const href=show.standalone&&clips.length===1?path({...rootValues(),collection:show.id,clip:clips[0].id}):path({...rootValues(),collection:show.id});
          const {node,text}=card(show.title,show.cover,href,'collection-card');node.dataset.collectionId=show.id;
          const seasons=show.section==='series'?[...new Set(clips.map(c=>c.season).filter(exists))]:[];
          const episodes=clips.filter(c=>c.kind==='episode').length,excerpts=clips.filter(c=>c.kind==='excerpt').length;
          metadata(text,[seasons.length?count(seasons.length,['сезон','сезона','сезонов']):null,episodes?count(episodes,['эпизод','эпизода','эпизодов']):null,excerpts?count(excerpts,['отрывок','отрывка','отрывков']):null]);
          metadata(text,[show.accent,tempo(show)],'video-card-meta collection-characteristics');
          if(level(show)||show.level)metadata(text,[level(show)||show.level],'video-card-meta collection-level');list.append(node);
        }
      }
    }
    input.addEventListener('input',()=>{query=input.value;history.replaceState(null,'',path(rootValues()));views.querySelectorAll('a').forEach((a,i)=>a.href=path({...rootValues(),view:i?'work':'all'}));tabs.firstChild.href=path(rootValues());paint();});
    window.addEventListener(window.WordRecallData?'word-recall-data-change':'storage',event=>{if((event.detail?.key||event.key)===work.key)paint();});window.addEventListener('pageshow',paint);paint();
  }
  function collectionState(show,clip){
    const seasons=show.section==='series'?[...new Set(show.clips.filter(c=>visible(c)&&matchesFilter(c)).map(c=>c.season).filter(exists))].sort((a,b)=>a-b):[];
    const requested=Number(params.get('season'));const season=seasons.includes(requested)?requested:seasons.includes(clip?.season)?clip.season:seasons[0];
    const fullItems=show.clips.filter(c=>(season===undefined||c.season===season)&&visible(c));
    const items=fullItems.filter(matchesFilter);
    const pages=Math.max(1,Math.ceil(items.length/pageSize));
    const requestedPage=Number(params.get('page'));const page=Number.isInteger(requestedPage)&&requestedPage>0?Math.min(requestedPage,pages):Math.max(1,Math.ceil((items.indexOf(clip)+1)/pageSize));
    const values={...rootValues(),collection:show.id,...(season!==undefined?{season}:{}),page};
    return {seasons,season,items,fullItems,pages,page,values};
  }
  function collectionPage(show){
    const state=collectionState(show);header(show.title,path(rootValues()),true);
    if(show.accent)screen.append(el('p','collection-accent',show.accent));
    if(state.seasons.length){const bar=el('nav','catalog-seasons');bar.setAttribute('aria-label','Сезоны');bar.style.setProperty('--season-columns',Math.min(10,state.seasons.length));
      for(const season of state.seasons){const a=link(path({...state.values,season,page:1}),'',String(season));a.setAttribute('aria-label',`Сезон ${season}`);if(season===state.season)a.setAttribute('aria-current','true');bar.append(a);}screen.append(bar);
    }
    const list=el('div','video-list');
    state.items.slice((state.page-1)*pageSize,state.page*pageSize).forEach((clip,i)=>{
      const ordinal=state.fullItems.indexOf(clip)+1;
      const {node,text}=materialCard(show,clip,path({...state.values,clip:clip.id}),ordinal);node.dataset.materialId=clip.id;node.dataset.ordinal=ordinal;
      materialFacts(text,clip);metadata(text,[clip.accent&&clip.accent!==show.accent?clip.accent:null]);
      if(percent(clip.familiarUsagePercent))metadata(text,[`${clip.familiarUsagePercent}% знакомой лексики`],'video-card-meta material-known');list.append(node);
    });screen.append(list);
    if(state.pages>1){const nav=el('nav','catalog-pagination');nav.setAttribute('aria-label','Страницы');
      const arrow=(delta,label,symbol)=>{
        const target=state.page+delta,enabled=target>=1&&target<=state.pages;
        const control=enabled?link(path({...state.values,page:target}),'pagination-arrow',symbol):el('button','pagination-arrow',symbol);
        control.setAttribute('aria-label',label);
        if(enabled)control.rel=delta<0?'prev':'next';else{control.type='button';control.disabled=true;}
        nav.append(control);
      };
      arrow(-1,'Предыдущая страница','‹');
      const nearby=state.pages<=7?Array.from({length:state.pages},(_,i)=>i+1):state.page<=3?[1,2,3,4]:state.page>=state.pages-2?[state.pages-3,state.pages-2,state.pages-1,state.pages]:[state.page-1,state.page,state.page+1];
      const numbers=[...new Set([1,...nearby,state.pages])].sort((a,b)=>a-b);let previous=0;
      for(const n of numbers){if(n>previous+1)nav.append(el('span','pagination-gap','…'));const a=link(path({...state.values,page:n}),'',String(n));if(n===state.page)a.setAttribute('aria-current','page');nav.append(a);previous=n;}
      arrow(1,'Следующая страница','›');screen.append(nav);}
  }
  function analysis(title,finalLevel,distribution,basis){
    // Never reinterpret usage percentages as unique-word or grammar distributions.
    const entries=distribution?.basis===basis&&Array.isArray(distribution.values)?distribution.values.filter(x=>/^(A1|A2|B1|B2|C1|C2)$/.test(x.level)&&percent(x.percent)):[];
    if(!entries.length&&!finalLevel)return;
    const box=el('details','video-analysis'),summary=el('summary','',title);
    if(finalLevel)summary.append(el('span','analysis-level',finalLevel));
    if(!entries.length){const row=el('div','video-analysis');row.append(summary.firstChild);if(finalLevel)row.append(el('span','analysis-level',finalLevel));row.classList.add('analysis-static');screen.append(row);return;}
    const arrow=el('span','analysis-chevron','⌄');arrow.setAttribute('aria-hidden','true');summary.append(arrow);box.append(summary);
    const bars=el('div','analysis-bars');for(const entry of entries){const row=el('div','analysis-bar');const track=el('div','analysis-track'),fill=el('div','analysis-fill');fill.style.width=entry.percent+'%';track.setAttribute('aria-hidden','true');track.append(fill);row.append(el('span','',entry.level),track,el('span','',entry.percent+'%'));bars.append(row);}box.append(bars);screen.append(box);
  }
  function detailPage(show,clip){
    const state=collectionState(show,clip);header('Подробно',show.standalone?path(rootValues()):path(state.values));
    if(clip.cover){const figure=el('div','detail-cover'),image=thumbnail(clip.cover,'');image.loading='eager';image.addEventListener('error',()=>figure.remove(),{once:true});figure.append(image);screen.append(figure);}
    screen.append(el('h2','video-detail-title',materialTitle(clip,show)));
    metadata(screen,[clip.source||show.channel||show.title,show.section==='series'&&clip.season!=null?`Сезон ${clip.season}`:null,clip.episode!=null?`Эпизод ${clip.episode}`:null,duration(clip.sec)],'video-detail-source');
    const stats=el('dl','video-stats');for(const [title,value] of [['Знакомая лексика',percent(clip.familiarUsagePercent)?clip.familiarUsagePercent+'%':null],['Всего слов',exists(clip.words)?clip.words:null],['Новых слов',exists(clip.unfamiliarWords)?clip.unfamiliarWords:null]]){if(value===null)continue;const group=el('div',title==='Новых слов'?'stat-new':'');group.append(el('dt','',title),el('dd','',String(value)));stats.append(group);}if(stats.children.length)screen.append(stats);
    analysis('Лексика',clip.lexicalLevel,clip.lexicalDistribution,'uniqueWords');analysis('Грамматика',clip.grammarLevel,clip.grammarDistribution,'phrases');
    const actions=el('div','video-actions'),second=el('div','video-secondary-actions');
    for(const [mode,title,cls] of [['video','Смотреть видео','main'],['cards','Карточки фраз',''],['audio','Аудирование','']]){
      const button=el('button','video-action '+cls,title);button.type='button';button.dataset.mode=mode;
      if(mode!=='video'){const mark=icon(mode);mark.classList.add('action-icon');button.prepend(mark);}
      button.disabled=!work.available(mode,clip);button.addEventListener('click',()=>work.start(show,clip,mode).catch(()=>{}));(mode==='video'?actions:second).append(button);
    }actions.append(second);screen.append(actions);
    const extra=el('div','video-extra-actions');for(const [title,ai] of [['Оптимизировать субтитры',true]]){const button=el('button','video-action',title);button.type='button';button.disabled=true;if(ai){const mark=icon('ai');mark.classList.add('ai-icon');button.prepend(mark);}extra.append(button);}screen.append(extra);
    const label=el('label','playback-inline-toggle','Построчный перевод'),toggle=el('input');toggle.type='checkbox';toggle.checked=window.PlaybackSettings.read(clip.id).inline;toggle.addEventListener('change',()=>{const state=window.PlaybackSettings.read(clip.id);state.inline=toggle.checked;window.PlaybackSettings.save(clip.id,state);});label.append(toggle);actions.after(label);
  }
  if(collection&&collection.available!==false){if(material&&visible(material))detailPage(collection,material);else collectionPage(collection);}else catalogRoot();
  // Preserve only catalog scroll state, never training settings or word statuses.
  const scrollKey=()=>'word-recall-catalog-scroll:'+location.pathname+location.search;
  try{screen.scrollTop=Number((window.WordRecallData?.session || sessionStorage).getItem(scrollKey()))||0;}catch{}
  const remember=()=>{try{(window.WordRecallData?.session || sessionStorage).setItem(scrollKey(),String(screen.scrollTop));}catch{}};
  screen.addEventListener('click',event=>{if(event.target.closest('a'))remember();});window.addEventListener('pagehide',remember);
  window.addEventListener('pageshow',()=>{try{screen.scrollTop=Number((window.WordRecallData?.session||sessionStorage).getItem(scrollKey()))||0;}catch{}});
})();
