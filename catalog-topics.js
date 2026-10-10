(() => {
  'use strict';
  window.WordRecallTopics = function () {
    const screen=document.getElementById('catalog-screen');
    const layout=window.WordRecallPreferences?.prototype().content===false?{...window.TOPIC_LAYOUT,themes:[],archivedThemes:[]}:window.TOPIC_LAYOUT;
    const nav=window.WordRecallNavigation,params=new URLSearchParams(location.search),view=params.get('view')==='work'?'work':'all';
    let query=params.get('q')||'';
    const filters=window.WordRecallFilter,criteria=filters.read(params);
    const allThemes=[...layout.themes,...(layout.archivedThemes||[])];
    const theme=allThemes.find(t=>(t.id===params.get('theme')||t.legacyTheme===params.get('theme'))&&(!params.get('topic')||t.topics.some(x=>x.id===params.get('topic'))));
    const topic=theme?.topics.find(t=>t.id===params.get('topic'));
    const legacy=topic?.legacy?window.APP_CATALOG.topics.find(t=>t.id===topic.id):null;
    const storage=()=>window.WordRecallData?.local||localStorage;
    const el=(tag,cls='',text)=>{const n=document.createElement(tag);n.className=cls;if(text!=null)n.textContent=text;return n;};
    const url=(extra={})=>'catalog.html?'+new URLSearchParams({section:'topics',...nav.context(),...filters.query(criteria),...(view==='work'?{view}:{}),...(query?{q:query}:{}),...extra});
    const link=(text,href,cls='')=>{const a=el('a',cls,text);a.href=href;return a;};
    const preview=t=>t.preview||'app-media/topics/previews/'+({dlg_aeroport_1:'airport',dom:'home'}[t.id]||t.id)+'.jpg';
    const available=t=>t.versions||(t.legacy?[{id:'original',title:window.APP_CATALOG.topics.find(x=>x.id===t.id)?.level||'Текст'}]:layout.styles);
    const topicMatches=t=>t.lines?filters.match(t,criteria):t.legacy?filters.match(window.APP_CATALOG.topics.find(x=>x.id===t.id)||{},criteria):available(t).some(s=>filters.match({lexicalLevel:s.lexical,grammarLevel:s.grammar,sec:s.sec},criteria));
    const shapes={filter:'<path d="M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6"/>',search:'<circle cx="10" cy="10" r="6.5"/><path d="m15 15 5 5"/>',read:'<path d="M12 5C8 2 4 3 2 4v15c4-2 7-1 10 1 3-2 6-3 10-1V4c-2-1-6-2-10 1Zm0 0v15"/>',cards:'<rect x="5" y="3" width="16" height="17" rx="2"/><path d="M2 7v14a2 2 0 0 0 2 2h13"/>',audio:'<path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="12" width="4" height="8" rx="2"/><rect x="17" y="12" width="4" height="8" rx="2"/>'};
    function icon(name){const n=document.createElementNS('http://www.w3.org/2000/svg','svg');n.setAttribute('viewBox','0 0 24 24');n.setAttribute('aria-hidden','true');n.innerHTML=shapes[name];return n;}
    function header(title,back){const h=el('header','app-page-header catalog-header');const row=window.WordRecallHeader.create(title,nav.back(back||'index.html'));if(!back&&!nav.hasReturn())row.querySelector('.header-back').replaceWith(el('span','header-back'));h.append(row);screen.append(h);}
    function img(t){const n=el('img','topic-preview');n.src=preview(t);n.alt='';n.loading='lazy';return n;}
    function attachFilter(button){filters.attach(button,{values:criteria,names:['lex','gram','maxSec'],onApply:values=>{const next=new URLSearchParams(location.search);for(const name of ['lex','gram','maxSec']){next.delete(name);if(values[name])next.set(name,values[name]);}location.href='catalog.html?'+next;}});}
    const workKey='word-recall-topic-work-v1';
    function workRead(strict=false){try{const rows=JSON.parse(storage().getItem(workKey)||'[]');if(strict&&!Array.isArray(rows))throw new Error('Invalid topic history');return Array.isArray(rows)?rows.filter(x=>x&&typeof x.topic==='string').sort((a,b)=>b.lastUsed-a.lastUsed):[];}catch(error){if(strict)throw error;return [];}}
    function workSave(mode,position=0,playback={}){
      try{
        // A failed read must not turn an existing history into an empty one.
        const rows=workRead(true).filter(x=>x.topic!==topic.id);
        rows.unshift({theme:theme.id,topic:topic.id,mode,position,...playback,lastUsed:Date.now()});
        storage().setItem(workKey,JSON.stringify(rows));return true;
      }catch{return false;}
    }
    function inlineValue(){try{const raw=storage().getItem('word-recall-playback-v1:topic:'+topic.id);return raw?JSON.parse(raw).inline!==false:true;}catch{return true;}}
    function saveInline(value){const state=window.PlaybackSettings.read('topic:'+topic.id);state.inline=value;window.PlaybackSettings.save('topic:'+topic.id,state);}
    function root(){
      header('Каталог');
      const tabs=el('nav','catalog-tabs');tabs.setAttribute('aria-label','Каталог');
      for(const [title,href] of [['Видео','catalog.html'],['Топики',url()],['Мои загрузки','uploads.html']]){const a=link(title,href);if(title==='Топики')a.setAttribute('aria-current','page');tabs.append(a);}screen.append(tabs);
      const toolbar=el('div','catalog-toolbar'),views=el('nav','catalog-views');views.setAttribute('aria-label','Топики');
      for(const [id,title] of [['all','Все'],['work','В работе']]){const a=link(title,url({view:id}));if(view===id)a.setAttribute('aria-current','page');views.append(a);}toolbar.append(views);
      const search=el('button','catalog-icon');search.type='button';search.setAttribute('aria-label','Поиск');search.append(icon('search'));toolbar.append(search);
      const filter=el('button','catalog-icon');filter.type='button';filter.setAttribute('aria-label','Фильтр');filter.append(icon('filter'));toolbar.append(filter);attachFilter(filter);screen.append(toolbar);
      const input=el('input','app-search catalog-search');input.type='search';input.id='topic-search';input.value=query;input.hidden=!query;input.setAttribute('aria-label','Поиск');search.setAttribute('aria-controls',input.id);search.setAttribute('aria-expanded',String(!input.hidden));screen.append(input);
      search.onclick=()=>{input.hidden=!input.hidden;search.setAttribute('aria-expanded',String(!input.hidden));if(!input.hidden)input.focus();};
      const list=el('div','topic-sections');screen.append(list);
      function card(th,t,session){
        const a=link('',nav.enter(url({theme:th.id,topic:t.id,...(session?{mode:session.mode,version:session.version||'all'}: {})})),'topic-preview-card'+(session?' material-card':''));
        a.append(img(t),el('strong','topic-preview-title',t.title));
        const n=available(t).length;if(session||n>1)a.append(el('span','topic-preview-meta',session?(({audio:'Аудирование',cards:'Карточки фраз',read:'Чтение'}[session.mode]||'Чтение')):`${n} версии`));return a;
      }
      function paint(){
        list.replaceChildren();const q=query.trim().toLocaleLowerCase();
        if(view==='work'){
          const shelf=el('div','topic-shelf');list.append(shelf);
          for(const session of workRead()){
            const th=allThemes.find(t=>t.id===session.theme&&t.topics.some(x=>x.id===session.topic)),t=th?.topics.find(t=>t.id===session.topic);
            if(t&&topicMatches(t)&&`${th.title} ${t.title}`.toLocaleLowerCase().includes(q))shelf.append(card(th,t,session));
          }
        }else for(const th of layout.themes){
          const matching=th.topics.filter(t=>topicMatches(t)&&`${th.title} ${t.title}`.toLocaleLowerCase().includes(q));if(!matching.length)continue;
          const section=el('section','topic-section');section.id='topic-section-'+th.id;
          const heading=el('h2','topic-section-title',th.title);heading.id=section.id+'-title';section.setAttribute('aria-labelledby',heading.id);
          const shelf=el('div','topic-shelf');shelf.setAttribute('aria-label',th.title);matching.forEach(t=>shelf.append(card(th,t)));
          const key='topics-shelf:'+th.id+':'+query;shelf.addEventListener('scroll',()=>nav.remember(key,shelf));
          section.append(heading,shelf);list.append(section);
          (window.requestAnimationFrame||window.setTimeout)(()=>nav.restore(key,shelf));
        }
      }
      input.oninput=()=>{query=input.value;history.replaceState(null,'',url());views.querySelectorAll('a').forEach((a,i)=>a.href=url({view:i?'work':'all'}));tabs.children[1].href=url();paint();};paint();
      if(theme)(window.requestAnimationFrame||window.setTimeout)(()=>{const section=document.getElementById('topic-section-'+theme.id);if(section)screen.scrollTop=Math.max(0,section.offsetTop-screen.offsetTop);});
    }
    function detail(){
      screen.classList.add('topic-detail-screen');header('',url());
      const hero=el('div','topic-hero'),text=el('div','topic-hero-text');text.append(el('h1','topic-title',topic.title),el('p','topic-source',theme.title));hero.append(img(topic),text);
      if(topic.description)hero.append(el('p','topic-description',topic.description));
      const versions=available(topic);if(versions.length>1)hero.append(el('p','topic-version-count',`${versions.length} версии`));screen.append(hero);
      if(!topic.lines&&!versions.some(v=>v.lines))screen.append(el('div','topic-levels',legacy?legacy.level:'Слова A2–B1 · Грамматика A2–B1'));
      const actions=el('div','topic-actions');
      for(const [mode,title] of [['read','Читать'],['audio','Аудио'],['cards','Карточки фраз']]){const a=link('',nav.enter(url({theme:theme.id,topic:topic.id,mode})),'video-action '+(mode==='read'?'main':''));a.append(icon(mode),el('span','',title));actions.append(a);}screen.append(actions);
      const row=el('label','topic-inline-toggle','Построчный перевод'),toggle=el('input','switch');toggle.type='checkbox';toggle.checked=inlineValue();toggle.onchange=()=>saveInline(toggle.checked);row.append(toggle);screen.append(row);
      if(versions.length<2)return;
      screen.append(el('h2','topic-versions-title','Версии'));
      const comments=el('div','topic-versions');
      versions.forEach((style,i)=>{const item=el('div','topic-version-comment'),body=el('div');item.append(el('span','topic-version-number',String(i+1)));body.append(el('strong','',style.title));if(style.description)body.append(el('p','',style.description));if(style.lexical)body.append(el('small','',`Слова ${style.lexical} · Грамматика ${style.grammar}`));item.append(body);comments.append(item);});screen.append(comments);
    }
    function reader(){
      const mode=['audio','cards'].includes(params.get('mode'))?params.get('mode'):'read',versions=available(topic);
      const selected=versions.some(s=>s.id===params.get('version'))?params.get('version'):'all';
      screen.classList.add('topic-reader-screen','topic-mode-'+mode);
      const h=el('header','playback-header'),back=link('‹',nav.back(url({theme:theme.id,topic:topic.id})));back.id='playback-close';back.setAttribute('aria-label','Назад');
      const title=el('h1','',topic.title);title.id='playback-title';const count=el('span');count.id='playback-count';h.append(back,title,count);screen.append(h);
      const tabs=el('nav','topic-version-tabs');tabs.setAttribute('aria-label','Версии текста');
      for(const [id,label] of [['all','Все'],...versions.map((s,i)=>[s.id,String(i+1)])]){const a=link(label,url({theme:theme.id,topic:topic.id,mode,version:id}));a.setAttribute('aria-label',id==='all'?'Все версии':versions.find(s=>s.id===id).title);if(id===selected)a.setAttribute('aria-current','page');tabs.append(a);}if(versions.length>1)screen.append(tabs);
      const video=el('div');video.id='playback-video';video.hidden=mode!=='cards';if(mode==='cards'){video.className='topic-card-preview';video.append(img(topic));}screen.append(video);
      const body=el('div','playback-content');body.id='playback-content';screen.append(body);
      const footer=el('footer','playback-footer'),rates=el('div','playback-rates'),pill=el('div','playback-pill');rates.id='playback-rates';rates.hidden=true;pill.id='playback-pill';footer.append(rates,pill);if(mode!=='read')screen.append(footer);
      const phrases=[];
      versions.forEach((style,versionIndex)=>{
        if(selected!=='all'&&selected!==style.id)return;
        const lines=style.lines||topic.lines||legacy?.lines||window.TOPIC_DEMO_DATA?.[topic.id]?.[style.id]||[];
        let paragraph=0;
        lines.forEach((line,i)=>{
          if(!i||!line.speaker||line.speaker!==lines[i-1].speaker)paragraph++;
          (line.phrases||[line]).forEach((part,j)=>phrases.push({id:(style.lines||topic.lines)?part.id:style.id+'-'+i+'-'+j,turn:(style.lines||topic.lines)?line.id:style.id+'-'+i,paragraphNumber:`${versionIndex+1}.${paragraph}`,start:0,end:86400,text:part.en,translation:part.ru,speaker:line.speaker,audio:part.audio||line.audio,versionTitle:versions.length>1?`${versionIndex+1} · ${style.title}`:''}));
        });
      });
      const saved=workRead().find(x=>x.topic===topic.id&&x.mode===mode),stateKey='topic:'+topic.id,state=window.PlaybackSettings.read(stateKey);
      const sameVersion=saved&&(saved.version||'all')===selected;
      const turns=[...new Set(phrases.map(p=>p.turn))];
      const restoredIndex=sameVersion?(saved.phraseId?phrases.findIndex(p=>p.id===saved.phraseId):phrases.findIndex(p=>p.turn===turns[saved.index||0])):0;
      state.inline=inlineValue();state.index=Math.max(0,restoredIndex);window.PlaybackSettings.save(stateKey,state);
      let started=mode==='read'||!!saved;
      let player,saveWarning,scrollTimer;
      function remember(position){
        if(!started)return;
        const saved=workSave(mode,body.scrollTop,{version:selected,...position,phraseId:phrases[position.index]?.id});
        if(saved){
          if(saveWarning?.contains(document.activeElement))back.focus({preventScroll:true});
          saveWarning?.remove();saveWarning=null;return;
        }
        if(saveWarning)return;
        saveWarning=el('div','topic-save-error');saveWarning.id='topic-save-error';
        const message=el('p','playback-error','Не удалось сохранить прогресс. После выхода новые изменения могут потеряться.');message.setAttribute('role','status');
        const retry=el('button','app-button secondary','Повторить сохранение');retry.type='button';retry.onclick=()=>remember(player.position());
        saveWarning.append(message,retry);body.before(saveWarning);
      }
      if(mode==='read'){
        let currentTurn=null,row,text,translation;
        phrases.forEach((phrase,i)=>{
          if(phrase.versionTitle&&(!i||phrases[i-1].versionTitle!==phrase.versionTitle))body.append(el('h2','topic-reading-version',phrase.versionTitle));
          if(currentTurn!==phrase.paragraphNumber){currentTurn=phrase.paragraphNumber;row=el('article','playback-line');if(phrase.speaker)row.append(el('h3','topic-speaker',phrase.speaker));text=el('p','playback-text');translation=el('p','playback-translation');translation.hidden=!state.inline;row.append(text,translation);const divider=el('div','topic-paragraph-divider'),number=el('span','phrase-divider-number topic-paragraph-number',phrase.paragraphNumber);number.setAttribute('aria-label','Абзац '+phrase.paragraphNumber);divider.append(number);row.append(divider);body.append(row);}else{text.append(document.createTextNode(' '));translation.append(document.createTextNode(' '));}
          text.append(window.WordRecallTopicWords.text(phrase,()=>{}));translation.append(document.createTextNode(phrase.translation||''));
        });
        player={position:()=>({index:0,seconds:0})};
      }else player=window.WordRecallPlayer({id:stateKey,data:{phrases},mode,topic:true,title:topic.title,back:back.href,resumeAudio:sameVersion?{...saved,index:state.index}:null,onStarted:()=>{started=true;},onPosition:remember});
      if(sameVersion&&saved.position)body.scrollTop=saved.position;
      if(mode==='read')remember(player.position());
      if(sameVersion&&saved.position)(window.requestAnimationFrame||window.setTimeout)(()=>body.scrollTop=saved.position);
      // Save while the reader is still visible so a failed write can be retried.
      const flush=()=>{clearTimeout(scrollTimer);remember(player.position());};
      body.addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(flush,150);});
      document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush();});
      window.addEventListener('pagehide',flush);
    }
    screen.classList.add('topics-screen');
    if(topic){if(['read','audio','cards'].includes(params.get('mode')))reader();else detail();}else root();
    if(!params.get('mode')){
      const scrollKey=()=>`word-recall-topic-scroll:${location.search}`;
      try{screen.scrollTop=Number((window.WordRecallData?.session||sessionStorage).getItem(scrollKey()))||0;}catch{}
      screen.addEventListener('click',e=>{if(e.target.closest('a'))try{(window.WordRecallData?.session||sessionStorage).setItem(scrollKey(),screen.scrollTop);}catch{}});
    }
    window.addEventListener('pageshow',event=>{if(event.persisted)location.reload();});
  };
})();
