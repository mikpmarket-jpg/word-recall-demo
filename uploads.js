(() => {
  'use strict';
  const screen = document.getElementById('uploads-screen'),nav=window.WordRecallNavigation;
  const key = 'word-recall-local-uploads-v1', workKey = 'word-recall-upload-work-v1';
  const params = new URLSearchParams(location.search), filterApi = window.WordRecallFilter, content = window.UploadContent;
  const criteria = filterApi.read(params, ['type','lex','gram','maxSec']);
  const view = params.get('view') === 'work' ? 'work' : 'all';
  let query = params.get('q') || '', cleanup = () => {};
  const el = (tag, cls = '', text) => { const n = document.createElement(tag); n.className = cls; if (text != null) n.textContent = text; return n; };
  const link = (title, href, cls = '') => { const a = el('a', cls, title); a.href = href; return a; };
  const url = (extra = {}) => 'uploads.html?' + new URLSearchParams({view, ...nav.context(), ...filterApi.query(criteria), ...(query ? {q:query} : {}), ...extra});
  function read(storageKey) { try { const value = JSON.parse((window.WordRecallData?.local || localStorage).getItem(storageKey)); return Array.isArray(value) ? value.filter(x => x && typeof x.id === 'string') : []; } catch { return []; } }
  let items = read(key).filter(x => typeof x.text === 'string');
  function save(next) { try { (window.WordRecallData?.local || localStorage).setItem(key, JSON.stringify(next)); items = next; return true; } catch { return false; } }
  function go(extra = {}, entering=false) { const href=entering?nav.enter(url(extra)):url(extra);rememberList();cleanup(); cleanup = () => {}; history.pushState(null, '', href); render(); }
  window.addEventListener('popstate', () => { cleanup(); cleanup = () => {}; render(); });
  window.addEventListener('pagehide', () => {rememberList();cleanup();});
  window.addEventListener('pageshow',e=>{if(e.persisted)render();});
  function rememberList(){if(!new URLSearchParams(location.search).has('item')&&!new URLSearchParams(location.search).has('add'))nav.remember(nav.current(),screen);}
  screen.addEventListener('click',rememberList,{capture:true});
  function feedback(message, error = false) { const area = document.getElementById('upload-feedback'); if (!area) return; area.hidden = !message; area.textContent = message; area.classList.toggle('is-error', error); }
  function status() { const area = el('p', 'app-feedback'); area.id = 'upload-feedback'; area.setAttribute('role','status'); area.hidden = true; screen.append(area); }
  function header(title, back) { const h = el('header','app-page-header catalog-header'), row = window.WordRecallHeader.create(title, nav.back(back || 'catalog.html')); if (!back&&!nav.hasReturn()) row.querySelector('.header-back').replaceWith(el('span','header-back')); h.append(row); screen.append(h); return row; }
  const shapes = {search:'<circle cx="10" cy="10" r="6.5"/><path d="m15 15 5 5"/>',filter:'<path d="M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6"/>',add:'<path d="M12 4v16M4 12h16"/>',text:'<path d="M6 3h9l4 4v14H6V3Zm9 0v5h4M9 12h7M9 16h5"/>',video:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m10 9 5 3-5 3Z"/>',listen:'<path d="M4 14v-3a8 8 0 0 1 16 0v3M4 12h3v8H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2Zm16 0h-3v8h3a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2Z"/>'};
  function icon(name) { const svg = document.createElementNS('http://www.w3.org/2000/svg','svg'); svg.setAttribute('viewBox','0 0 24 24'); svg.setAttribute('aria-hidden','true'); svg.innerHTML = shapes[name]; return svg; }
  function button(name,label,cls = '') { const b = el('button','catalog-icon '+cls); b.type = 'button'; b.setAttribute('aria-label',label); b.append(icon(name)); return b; }
  const duration = sec => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2,'0')}`;
  function statistics(item) { let statuses = {}; try { statuses = JSON.parse((window.WordRecallData?.local || localStorage).getItem('word-recall-screen-01-v1'))?.statuses || {}; } catch {} return content.stats(item, statuses); }
  const typeName = item => item.source === 'subtitles' ? 'Субтитры' : item.type === 'video' ? 'Видео' : 'Текст';
  function remember(item, position, progress={}) { const records=read(workKey),prior=records.find(x=>x.id===item.id)||{};const next = records.filter(x => x.id !== item.id); next.unshift({...prior,id:item.id,lastUsed:Date.now(),position,...progress}); try { (window.WordRecallData?.local || localStorage).setItem(workKey,JSON.stringify(next)); } catch {} }
  function render() {
    document.querySelectorAll('.upload-dialog, .catalog-filter-sheet').forEach(d => d.remove());
    screen.replaceChildren(); screen.scrollTop = 0;
    const route = new URLSearchParams(location.search), item = items.find(x => x.id === route.get('item'));
    if (route.has('add')) return editor();
    if (item) return route.get('mode') ? reader(item, route.get('mode')) : detail(item);
    list();nav.restore(nav.current(),screen);
  }
  function list() {
    header('Каталог');
    const tabs = el('nav','catalog-tabs'); tabs.setAttribute('aria-label','Каталог');
    for (const [title,href] of [['Видео','catalog.html'],['Топики','catalog.html?section=topics'],['Мои загрузки',url()]]) { const a=link(title,href); if(title==='Мои загрузки') a.setAttribute('aria-current','page'); tabs.append(a); } screen.append(tabs);
    const toolbar=el('div','catalog-toolbar'), views=el('nav','catalog-views'); views.setAttribute('aria-label','Мои загрузки');
    for(const [id,title] of [['all','Все'],['work','В работе']]) { const a=link(title,url({view:id})); if(view===id)a.setAttribute('aria-current','page'); views.append(a); } toolbar.append(views);
    const search=button('search','Поиск'), filter=button('filter','Фильтр'), add=button('add','Добавить','add'); toolbar.append(search,filter,add); screen.append(toolbar); add.onclick=()=>go({add:1},true);
    filterApi.attach(filter,{values:criteria,names:['type','lex','gram','maxSec'],onApply:values=>{location.href='uploads.html?'+new URLSearchParams({view,...(query?{q:query}:{}),...filterApi.query(values)});}});
    const input=el('input','app-search catalog-search'); input.type='search'; input.id='upload-search'; input.value=query; input.hidden=!query; input.setAttribute('aria-label','Поиск'); screen.append(input);
    search.setAttribute('aria-expanded',String(!input.hidden)); search.setAttribute('aria-controls',input.id); search.onclick=()=>{input.hidden=!input.hidden;search.setAttribute('aria-expanded',String(!input.hidden));if(!input.hidden)input.focus();};
    status(); const cards=el('div','video-list upload-list'); screen.append(cards);
    function draw() {
      cards.replaceChildren(); const working=read(workKey).sort((a,b)=>b.lastUsed-a.lastUsed);
      const source=view==='work'?working.map(x=>items.find(y=>y.id===x.id)).filter(Boolean):items;
      for(const item of source) {
        if(!filterApi.match(item,criteria)||!item.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))continue;
        const session=working.find(x=>x.id===item.id),mode=view==='work'?resumeMode(item,session):null;
        const row=link('',nav.enter(url({item:item.id,...(mode?{mode}:{})})),'video-card upload-card'), mark=el('span','material-number'); mark.append(icon(item.type==='video'?'video':'text'));
        const body=el('span','video-card-content'); body.append(el('strong','video-card-title',item.name));
        body.append(el('span','video-card-meta',[typeName(item),Number.isFinite(item.sec)?duration(item.sec):null].filter(Boolean).join(' · ')));
        if(item.text.trim()) { const stats=statistics(item), meta=el('span','video-card-meta'); meta.append(el('span','',`${stats.unique} слов`),el('strong','upload-new',`${stats.fresh} новых`)); body.append(meta); }
        row.append(mark,body,el('span','video-chevron','›')); cards.append(row);
      }
    }
    input.oninput=()=>{query=input.value;history.replaceState(null,'',url());views.querySelectorAll('a').forEach((a,i)=>a.href=url({view:i?'work':'all'}));tabs.lastChild.href=url();draw();}; draw();
  }
  function editor() {
    header('Добавить контент',url()); status();
    const form=el('form','upload-form'); screen.append(form);
    const tabs=el('div','upload-source-tabs'); tabs.setAttribute('role','tablist'); tabs.setAttribute('aria-label','Источник'); form.append(tabs);
    const panel=el('div','upload-fields'); panel.id='upload-source-panel'; panel.setAttribute('role','tabpanel'); form.append(panel);
    const nameLabel=el('label','upload-field','Название'), name=el('input'); name.id='upload-name'; name.type='text'; name.maxLength=160; name.required=true; nameLabel.append(name); form.append(nameLabel);
    const submit=el('button','upload-primary','Добавить контент'); submit.type='submit'; form.append(submit);
    let source='link', category='films', raw='', splitMode='sentences', cues=[], media=null, sec=null, href='', busy=false, fileBusy=false, revision=0, readRevision=0, previewURL=null;
    const drafts=new Map();
    function prepared() { return source==='text'?content.split(raw,splitMode):cues.map(c=>c.text); }
    function valid() { return !!name.value.trim() && (source==='link'?!!content.safeURL(href):source==='video'?!!media:prepared().length>0); }
    function refresh() { submit.disabled=busy||fileBusy||!valid(); }
    function setName(value) { if(!name.value.trim())name.value=value.replace(/\.(txt|srt|vtt|mp4|mov|webm|m4v)$/i,''); }
    function field(label, input) { const wrapper=el('label','upload-field',label); wrapper.append(input); panel.append(wrapper); return input; }
    function preview() {
      panel.querySelector('.upload-preview')?.remove(); const lines=prepared(); if(!lines.length)return;
      const box=el('section','upload-preview'); box.append(el('h2','',`Предпросмотр · ${lines.length} фраз`)); const list=el('ol');
      lines.slice(0,4).forEach(line=>list.append(el('li','',line))); box.append(list); panel.append(box);
    }
    async function pickText(file, subtitle, expected) {
      if(!file)return;
      if(file.size>200000) { feedback('Выберите текстовый файл до 200 КБ.',true); return; }
      if(!(subtitle?/\.(srt|vtt)$/i:/\.txt$/i).test(file.name)) { feedback(subtitle?'Выберите .srt или .vtt.':'Выберите .txt.',true); return; }
      fileBusy=true; refresh(); const readId=++readRevision;
      try {
        const text=await file.text(); if(expected!==revision||readId!==readRevision)return;
        const parsed=subtitle?content.subtitles(text):[];
        if(subtitle&&!parsed.length)throw new Error('В файле не найдены реплики с таймкодами.');
        if(subtitle)cues=parsed;else raw=text;
        setName(file.name); feedback('');
        if(!subtitle)panel.querySelector('textarea').value=raw;
        const caption=panel.querySelector(subtitle?'[data-file=subtitles]':'[data-file=text]'); if(caption)caption.textContent=file.name;
        preview();
      } catch(error) { if(expected===revision&&readId===readRevision)feedback(error.message||'Не удалось прочитать файл.',true); }
      finally { if(expected===revision&&readId===readRevision){fileBusy=false;refresh();} }
    }
    function fileControl(label, accept, kind, onChange) {
      const wrapper=el('label','upload-file'), caption=el('span','',label), input=el('input'); caption.dataset.file=kind;
      input.type='file'; input.accept=accept; input.setAttribute('aria-label',label); wrapper.append(caption,input); panel.append(wrapper); input.onchange=()=>onChange(input.files?.[0]); return input;
    }
    function show() {
      revision++; fileBusy=false; panel.replaceChildren(); feedback(''); panel.setAttribute('aria-labelledby','upload-tab-'+source);
      for(const b of tabs.children){const active=b.dataset.source===source;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;}
      if(source==='link'||source==='video') {
        const fieldset=el('fieldset','upload-category');fieldset.append(el('legend','','Добавить в раздел'));
        for(const [id,title] of [['films','Фильмы'],['series','Сериалы']]){const label=el('label'),radio=el('input');radio.type='radio';radio.name='category';radio.value=id;radio.checked=id===category;radio.onchange=()=>category=id;label.append(radio,el('span','',title));fieldset.append(label);}panel.append(fieldset);
      }
      if(source==='link') { const input=el('input');input.type='url';input.placeholder='https://';input.value=href;field('Ссылка на видео',input);input.oninput=()=>{href=input.value;refresh();}; }
      if(source==='video') {
        fileControl(media?.name||'Видео с телефона','video/*','video',async file=>{
          if(!file)return; if(!file.type.startsWith('video/')&&!/\.(mp4|mov|webm|m4v)$/i.test(file.name)){feedback('Выберите видеофайл.',true);return;}
          media=file;sec=null;setName(file.name);panel.querySelector('[data-file=video]').textContent=file.name; feedback('');refresh();
          if(previewURL)URL.revokeObjectURL(previewURL);
          previewURL=URL.createObjectURL(file);const video=document.createElement('video'), expected=revision;video.preload='metadata';video.onloadedmetadata=()=>{if(expected===revision&&Number.isFinite(video.duration))sec=video.duration;video.removeAttribute('src');video.load();};video.src=previewURL;
        });
        fileControl('Субтитры .srt / .vtt','.srt,.vtt','subtitles',file=>pickText(file,true,revision));
      }
      if(source==='text') {
        const area=el('textarea');area.rows=7;area.value=raw;area.maxLength=200000;field('Текст',area);
        area.oninput=()=>{raw=area.value;preview();refresh();};
        fileControl('Выбрать .txt','.txt,text/plain','text',file=>pickText(file,false,revision));
        const group=el('fieldset','upload-split');group.append(el('legend','','Разбиение для аудирования'));
        for(const [value,title] of [['sentences','По предложениям'],['lines','Сохранить строки']]){const label=el('label'),radio=el('input');radio.type='radio';radio.name='split';radio.value=value;radio.checked=value===splitMode;radio.onchange=()=>{splitMode=value;preview();};label.append(radio,el('span','',title));group.append(label);}panel.append(group);
      }
      if(source==='subtitles')fileControl('Субтитры .srt / .vtt','.srt,.vtt','subtitles',file=>pickText(file,true,revision));
      preview();refresh();
    }
    for(const [id,title] of [['link','Ссылка'],['video','Видео'],['text','Текст'],['subtitles','Субтитры']]) {
      const b=el('button','',title);b.type='button';b.dataset.source=id;b.id='upload-tab-'+id;b.setAttribute('role','tab');b.setAttribute('aria-controls',panel.id);
      b.onclick=()=>{if(busy)return;drafts.set(source,{raw,cues,media,sec,href,name:name.value});source=id;({raw='',cues=[],media=null,sec=null,href=''}=drafts.get(id)||{});name.value=drafts.get(id)?.name||'';show();};
      b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const buttons=[...tabs.children],i=buttons.indexOf(b),next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(i+(e.key==='ArrowRight'?1:buttons.length-1))%buttons.length;buttons[next].click();buttons[next].focus();};tabs.append(b);
    }
    name.oninput=refresh;
    form.onsubmit=async event=>{
      event.preventDefault();if(busy||fileBusy||!valid())return;busy=true;refresh();
      const id='u'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),lines=prepared();
      const item={id,name:name.value.trim(),source,type:['link','video'].includes(source)?'video':'text',text:lines.join('\n'),lines,created:Date.now()};
      if(source==='text')item.splitMode=splitMode;
      if(source==='video'||source==='link')item.category=category;
      if(source==='link')item.url=content.safeURL(href);
      if(cues.length&&source!=='text'&&source!=='link')item.cues=cues;
      if(source==='video'&&Number.isFinite(sec))item.sec=sec;
      try {
        if(source==='video'){await window.UploadMedia.put(id,media);item.mediaId=id;}
        if(!save([item,...items])){if(item.mediaId)await window.UploadMedia.remove(id).catch(()=>{});throw new Error('Не удалось сохранить материал. Проверьте свободное место и доступ к хранилищу.');}
        go({item:id});
      } catch(error){feedback(error.message==='Media storage unavailable'?'Хранилище видео недоступно в этом браузере.':error.message||'Не удалось сохранить материал.',true);busy=false;refresh();}
    };
    cleanup=()=>{revision++;if(previewURL)URL.revokeObjectURL(previewURL);};show();
  }
  function detail(item) {
    const row=header('Подробно',url()),actions=row.querySelector('.header-actions');actions.removeAttribute('aria-hidden');
    const menuButton=el('button','upload-menu-button','⋯');menuButton.type='button';menuButton.setAttribute('aria-label','Действия с материалом');menuButton.setAttribute('aria-expanded','false');actions.append(menuButton);
    const menu=el('div','upload-actions-menu');menu.hidden=true;menu.id='upload-actions';menuButton.setAttribute('aria-controls',menu.id);
    const rename=el('button','','Переименовать'),remove=el('button','upload-danger','Удалить материал');rename.type=remove.type='button';menu.append(rename,remove);screen.append(menu);
    menuButton.onclick=()=>{menu.hidden=!menu.hidden;menuButton.setAttribute('aria-expanded',String(!menu.hidden));};
    screen.append(el('h2','app-detail-title',item.name));
    screen.append(el('p','app-detail-subtitle',[typeName(item),item.category==='films'?'Фильмы':item.category==='series'?'Сериалы':null,Number.isFinite(item.sec)?duration(item.sec):null].filter(Boolean).join(' · ')));
    if(item.text.trim()) {
      const stats=statistics(item),grid=el('dl','video-stats');
      for(const [label,value,cls] of [['Знакомая лексика',stats.familiar+'%',''],['Разных слов',stats.unique,''],['Новых слов',stats.fresh,'stat-new']]){const cell=el('div',cls);cell.append(el('dt','',label),el('dd','',String(value)));grid.append(cell);}screen.append(grid);
      const meta=el('dl','upload-metrics');
      for(const [label,value] of [['Всего слов',stats.total],['Фраз',stats.phrases],...(stats.wpm!==null?[['Темп по субтитрам',`${stats.wpm} слов/мин`]]:[])]){const cell=el('div');cell.append(el('dt','',label),el('dd','',String(value)));meta.append(cell);}screen.append(meta);
    }
    const modes=el('div','upload-modes');
    const action=(label,kind,mode)=>{const a=link('',nav.enter(url({item:item.id,mode})),'upload-mode');a.append(icon(kind),el('span','',label));a.onclick=e=>{e.preventDefault();go({item:item.id,mode},true);};modes.append(a);};
    if(item.mediaId)action('Смотреть видео','video','watch');
    else if(content.safeURL(item.url)){const a=link('Смотреть видео',content.safeURL(item.url),'upload-mode');a.target='_blank';a.rel='noopener noreferrer';a.onclick=()=>remember(item,0);modes.append(a);}
    if(item.text.trim()){action('Читать','text','read');if(window.speechSynthesis&&window.SpeechSynthesisUtterance)action('Аудирование','listen','listen');}
    screen.append(modes);status();
    rename.onclick=()=>{
      const dialog=el('dialog','upload-dialog'),form=el('form','upload-rename');form.method='dialog';
      const title=el('h2','','Переименовать');title.id='rename-title';dialog.setAttribute('aria-labelledby',title.id);
      const label=el('label','upload-field','Название'),input=el('input');input.value=item.name;input.maxLength=160;input.required=true;label.append(input);
      const buttons=el('div','upload-dialog-buttons'),cancel=el('button','','Отмена'),saveButton=el('button','upload-primary','Сохранить'),error=el('p','app-feedback is-error');error.setAttribute('role','alert');cancel.type='button';cancel.onclick=()=>dialog.close();saveButton.type='submit';buttons.append(cancel,saveButton);form.append(title,label,error,buttons);dialog.append(form);document.body.append(dialog);
      form.onsubmit=e=>{e.preventDefault();if(!input.value.trim())return;const updated={...item,name:input.value.trim()};if(!save(items.map(x=>x.id===item.id?updated:x))){error.textContent='Не удалось сохранить название.';return;}dialog.close();render();};dialog.addEventListener('close',()=>dialog.remove());dialog.showModal();input.focus();input.select();
    };
    remove.onclick=async()=>{
      if(!confirm(`Удалить «${item.name}» и сохранённый прогресс?`))return;
      const previous=items;
      if(!save(items.filter(x=>x.id!==item.id))){feedback('Не удалось удалить материал.',true);return;}
      if(item.mediaId){try{await window.UploadMedia.remove(item.mediaId);}catch{save(previous);feedback('Не удалось удалить видео из хранилища. Попробуйте снова.',true);return;}}
      try{(window.WordRecallData?.local || localStorage).setItem(workKey,JSON.stringify(read(workKey).filter(x=>x.id!==item.id)));}catch{}
      go();
    };
  }
  function resumeMode(item,session){const modes=[...(item.mediaId?['watch']:[]),...(item.text.trim()?['read','listen']:[])];return modes.includes(session?.mode)?session.mode:modes[0];}
  function reader(item,mode) {
    mode=resumeMode(item,{mode});if(!mode)return detail(item);
    header(item.name,url({item:item.id}));status();const lines=item.lines||content.split(item.text,'lines');
    let closed=false,video=null,objectURL=null,utterance=null,playing=false,videoReady=false;
    const prior=read(workKey).find(x=>x.id===item.id), initial=Math.max(0,Number(prior?.position)||0);
    const savePosition=()=>remember(item,screen.scrollTop,{mode,index,seconds:videoReady?video.currentTime:prior?.seconds||0});
    cleanup=()=>{closed=true;savePosition();if(video)video.pause();if(utterance)window.speechSynthesis.cancel();if(objectURL)URL.revokeObjectURL(objectURL);};
    if(mode==='watch'&&item.mediaId) {
      video=el('video','upload-player');video.controls=true;video.playsInline=true;video.preload='metadata';screen.append(video);
      video.addEventListener('loadedmetadata',()=>{video.currentTime=Math.max(0,Math.min(Number(prior?.seconds)||0,Number.isFinite(video.duration)?video.duration:Infinity));videoReady=true;});
      video.onerror=()=>feedback('Браузер не смог воспроизвести этот видеофайл.',true);
      window.UploadMedia.get(item.mediaId).then(file=>{if(closed)return;if(!file)throw new Error('Видео не найдено в локальном хранилище.');objectURL=URL.createObjectURL(file);video.src=objectURL;if(item.cues?.length){const track=video.addTextTrack('subtitles','English','en');for(const cue of item.cues)track.addCue(new VTTCue(cue.start,cue.end,cue.text));track.mode='showing';}}).catch(error=>{if(!closed)feedback(error.message||'Видео недоступно.',true);});
    }
    let playButton=null,index=Math.max(0,Math.min(lines.length-1,Number(prior?.index)||0));const rows=[];
    if(mode==='listen'&&window.speechSynthesis&&window.SpeechSynthesisUtterance) {
      const controls=el('div','upload-listen-controls');playButton=el('button','upload-primary','▶ Слушать');playButton.type='button';controls.append(playButton);screen.append(controls);
      playButton.onclick=()=>{if(playing){window.speechSynthesis.cancel();playing=false;playButton.textContent='▶ Слушать';}else speak();};
    }
    function speak() {
      if(closed||!lines[index])return;
      window.speechSynthesis.cancel();utterance=new SpeechSynthesisUtterance(lines[index]);utterance.lang='en-US';
      const voice=window.speechSynthesis.getVoices().find(v=>/^en\b/i.test(v.lang));if(voice)utterance.voice=voice;
      const current=utterance;playing=true;savePosition();playButton.textContent='■ Остановить';rows.forEach((r,i)=>r.classList.toggle('is-current',i===index));
      utterance.onend=()=>{if(closed||!playing||utterance!==current)return;if(index+1<lines.length){index++;speak();}else{playing=false;index=0;playButton.textContent='▶ Слушать';}};
      utterance.onerror=e=>{if(closed||utterance!==current||['canceled','interrupted'].includes(e.error))return;playing=false;playButton.textContent='▶ Слушать';feedback('Не удалось озвучить текст. Проверьте доступность английского голоса на устройстве.',true);};window.speechSynthesis.speak(utterance);
    }
    lines.forEach((line,i)=>{const row=el('div','app-line upload-reader-line');row.append(el('span','upload-line-number',String(i+1)),el('p','',line));if(playButton){const choose=el('button','upload-line-play','▶');choose.type='button';choose.setAttribute('aria-label',`Слушать фразу ${i+1}`);choose.onclick=()=>{index=i;speak();};row.append(choose);}screen.append(row);rows.push(row);});
    if(playButton)rows[index]?.classList.add('is-current');
    screen.scrollTop=initial;savePosition();
  }
  render();
})();
