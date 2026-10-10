window.WordRecallPlayer = function(config) {
  'use strict';
  config=config||{};
  const params=new URLSearchParams(location.search),id=config.id||params.get('clip'),data=config.data||window.PLAYBACK_DATA?.[id];
  const mode=config.mode||(['video','audio','cards'].includes(params.get('mode'))?params.get('mode'):'video');
  const back=new URLSearchParams(params);back.delete('mode');
  const nav=window.WordRecallNavigation;
  const close=document.getElementById('playback-close');back.delete('settings');back.delete('from');back.delete('returnTo');close.href=config.back||nav.back(params.get('from')==='settings'?'settings.html':'catalog.html?'+back);
  const title=document.getElementById('playback-title'),count=document.getElementById('playback-count'),body=document.getElementById('playback-content'),pill=document.getElementById('playback-pill'),videoBox=document.getElementById('playback-video');
  title.textContent=config.title||{video:'Смотреть видео',audio:'Аудирование',cards:'Карточки фраз'}[mode];
  if(!data){videoBox.hidden=true;pill.hidden=true;count.textContent='';close.href=nav.back('catalog.html');return;}
  const S=window.PlaybackSettings,state=S.read(id),phrases=data.phrases;
  const cardsVideo=mode==='cards'&&typeof data.videoId==='string'&&!!data.videoId;
  const usesVideo=mode==='video'||cardsVideo;
  const options=()=>state[mode==='video'?'video':'audio'];
  const phraseRate=()=>options().voice==='slow'?Math.max(.25,state.rate-.25):state.rate;
  let index=Math.min(state.index,phrases.length-1),playing=false,paused=false,activeStep=null,generation=0,pendingCancel=null,runKind=null,disposed=false,yt=null,ytLoading=null,videoAttempt=null,continuous=false,started=false,videoRestored=false,cardSegmentPlaying=false;
  const audio=data.audio?new Audio(data.audio):new Audio(),speech=window.speechSynthesis;
  let resumeAudio=config.resumeAudio;
  audio.preload='metadata';
  const el=(tag,cls='',text)=>{const node=document.createElement(tag);node.className=cls;if(text!=null)node.textContent=text;return node;};
  const shapes={scroll:'<path d="M6 3H3v16h10M16 3v17m-4-4 4 4 4-4"/>',play:'<path d="m9 5 11 7-11 7Z"/>',pause:'<path d="M8 5v14M16 5v14"/>',translate:'<path d="M3 5h12M9 2v3M6 5c1 6 4 9 9 11M13 5c-1 6-4 9-10 11M14 21l4-11 4 11M16 17h5"/>',narrator:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/>',settings:'<path d="M3 5h18M3 12h18M3 19h18"/><circle cx="8" cy="5" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="10" cy="19" r="2"/>',loop:'<path d="M19 7a8 8 0 0 0-13-1L3 9m0-6v6h6M5 17a8 8 0 0 0 13 1l3-3m0 6v-6h-6"/>'};
  function icon(name){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.innerHTML=shapes[name];return svg;}
  const position=()=>({index,seconds:resumeAudio?.index===index?Number(resumeAudio.seconds)||0:audio.currentTime});
  function persist(){state.index=index;S.save(id,state);if(config.onPosition)config.onPosition(position());else window.WordRecallVideoWork.rememberSelection(data.collection,id,mode,{index,...(mode==='video'?{seconds:state.videoTime}:{})});}
  let hooks=null;
  if(!config.topic){window.WordRecallVideoWork.register(mode,{start:context=>{hooks=context;}});window.WordRecallVideoWork.start({id:data.collection},{id},mode).catch(()=>{});}
  function markStarted(){if(!started){started=true;hooks?.onStarted();config.onStarted?.();}const position={index,seconds:usesVideo?yt?.getCurrentTime?.()||0:audio.currentTime};hooks?.onPosition(position);config.onPosition?.(position);}
  function error(message){let n=document.getElementById('playback-error');if(!n){n=el('p','playback-error');n.id='playback-error';n.setAttribute('role','status');body.prepend(n);}n.textContent=message;}
  const cancelled=()=>new Error('cancelled');
  function clearError(){document.getElementById('playback-error')?.remove();}
  function stop(){generation++;cardSegmentPlaying=false;playing=false;paused=false;continuous=false;runKind=null;const cancel=pendingCancel;pendingCancel=null;cancel?.();activeStep=null;audio.pause();yt?.pauseVideo?.();speech?.cancel();paintPlay();}
  function pause(){if(!playing)return;paused=true;playing=false;activeStep?.pause?.();if(continuous)yt?.pauseVideo?.();paintPlay();}
  function resume(){if(!paused||disposed)return;paused=false;playing=true;clearError();activeStep?.resume?.();if(continuous)yt?.playVideo?.();paintPlay();}
  function waiting(token,setup){return new Promise((resolve,reject)=>{
    if(token!==generation||disposed)return reject(cancelled());
    let step=null,done=false;
    const finish=err=>{if(done)return;done=true;step?.cleanup?.();if(activeStep===step)activeStep=null;if(pendingCancel===cancel)pendingCancel=null;err?reject(err):resolve();};
    const cancel=()=>finish(cancelled());pendingCancel=cancel;
    try{step=setup(()=>finish(),err=>finish(err));if(done){step?.cleanup?.();return;}activeStep=step;if(!paused)step?.resume?.();}catch(err){finish(err);}
  });}
  const wait=(seconds,token)=>waiting(token,resolve=>{
    let remaining=seconds*1000,timer=null,since=0;
    const suspend=()=>{if(timer===null)return;clearTimeout(timer);timer=null;remaining=Math.max(0,remaining-(performance.now()-since));};
    return {resume:()=>{since=performance.now();timer=setTimeout(resolve,remaining);},pause:suspend,cleanup:suspend};
  });
  function say(text,lang,token){return waiting(token,(resolve,reject)=>{
    if(!speech||!window.SpeechSynthesisUtterance){reject(new Error('На устройстве недоступна дикторская озвучка.'));return;}
    const utterance=new SpeechSynthesisUtterance(text);utterance.lang=lang;utterance.rate=lang==='ru-RU'?1:phraseRate();
    const voice=speech.getVoices().find(v=>v.lang.toLowerCase().startsWith(lang.slice(0,2)));if(voice)utterance.voice=voice;
    let spoken=false;
    utterance.onstart=markStarted;utterance.onend=resolve;utterance.onerror=()=>reject(new Error('Не удалось включить голос. Проверьте голосовой пакет на устройстве.'));
    return {resume:()=>{speech.resume?.();if(!spoken){spoken=true;speech.speak(utterance);}},pause:()=>speech.pause?.(),cleanup:()=>{utterance.onstart=utterance.onend=utterance.onerror=null;}};
  });}
  function audioPhrase(phrase,token,rate=phraseRate()){return waiting(token,(resolve,reject)=>{
    const bounds=S.bounds(phrase,state);if(phrase.audio&&audio.getAttribute('src')!==phrase.audio)audio.src=phrase.audio;if(audio.error)audio.load();const offset=resumeAudio?.index===index?Number(resumeAudio.seconds)||0:0;resumeAudio=null;audio.currentTime=bounds.start+offset;audio.playbackRate=rate;
    let request=0;
    const progress=()=>{if(!paused&&audio.currentTime>=bounds.end){audio.pause();resolve();}};
    const fail=()=>reject(new Error('Не удалось воспроизвести запись.'));
    audio.addEventListener('timeupdate',progress);audio.addEventListener('ended',resolve);audio.addEventListener('error',fail);audio.addEventListener('playing',markStarted);
    return {resume:()=>{const current=++request;audio.play().catch(()=>{if(current===request)fail();});},pause:()=>{request++;audio.pause();},cleanup:()=>{request++;audio.removeEventListener('timeupdate',progress);audio.removeEventListener('ended',resolve);audio.removeEventListener('error',fail);audio.removeEventListener('playing',markStarted);}};
  });}
  function ensureVideo(){
    if(ytLoading)return ytLoading;
    clearError();
    const loadButton=document.getElementById('load-video');loadButton.hidden=true;
    const attempt={player:null,script:null,cancel:null};videoAttempt=attempt;
    const loading=new Promise((resolve,reject)=>{
      let ready=false,finished=false;
      const current=()=>videoAttempt===attempt&&!disposed;
      const cleanLoading=()=>{clearTimeout(timeout);if(window.onYouTubeIframeAPIReady===create)window.onYouTubeIframeAPIReady=null;attempt.script?.remove();};
      const fail=err=>{
        if(finished||videoAttempt!==attempt)return;finished=true;cleanLoading();
        if(mode==='video'&&ready&&attempt.player)state.videoTime=attempt.player.getCurrentTime?.()||state.videoTime;
        yt=null;ytLoading=null;videoAttempt=null;videoRestored=false;attempt.player?.destroy?.();
        if(!document.getElementById('youtube-player')){const host=el('div');host.id='youtube-player';videoBox.prepend(host);}loadButton.hidden=false;
        reject(err);
        if(ready&&!disposed){if(mode==='video'||cardSegmentPlaying)stop();error(err.message);}
      };
      attempt.cancel=()=>fail(cancelled());
      const timeout=setTimeout(()=>fail(new Error('Видео не загрузилось. Проверьте подключение и доступность YouTube.')),15000);
      const create=()=>{
        if(!current()||attempt.player)return;
        try{
          attempt.player=new YT.Player('youtube-player',{width:'100%',height:'100%',videoId:data.videoId,playerVars:{playsinline:1,controls:cardsVideo?0:1,...(location.protocol!=='file:'?{origin:location.origin}:{})},events:{
            onReady:()=>{if(!current())return;ready=true;cleanLoading();yt=attempt.player;resolve(yt);},
            onStateChange:event=>{
              if(!current())return;
              if(event.data===1){if((paused&&!continuous)||(cardsVideo&&!cardSegmentPlaying)){attempt.player.pauseVideo();return;}markStarted();if(runKind==='continuous'){paused=false;playing=true;paintPlay();}}
              if(event.data===0&&continuous){playing=false;paused=false;continuous=false;runKind=null;paintPlay();}
              if(event.data===2&&continuous&&!paused){paused=true;playing=false;paintPlay();}
            },
            onError:()=>fail(new Error('Не удалось открыть видео. Проверьте подключение и доступность YouTube, затем нажмите воспроизведение ещё раз.'))
          }});
        }catch(err){fail(err);}
      };
      if(window.YT?.Player)create();else{
        window.onYouTubeIframeAPIReady=create;const script=document.createElement('script');attempt.script=script;
        script.src='https://www.youtube.com/iframe_api';script.onerror=()=>fail(new Error('Не удалось подключиться к YouTube.'));document.head.append(script);
      }
    });
    // A constructor may fail synchronously; do not cache that rejected attempt.
    if(videoAttempt===attempt)ytLoading=loading;
    return loading;
  }
  async function videoPhrase(phrase,token,rate=phraseRate()){
    const player=await ensureVideo();if(token!==generation)throw cancelled();const bounds=S.bounds(phrase,state);
    return waiting(token,(resolve,reject)=>{
      player.seekTo(bounds.start,true);player.setPlaybackRate(rate);cardSegmentPlaying=cardsVideo;
      let timer=null,waitingSince=0;
      const suspend=()=>{clearInterval(timer);timer=null;player.pauseVideo();};
      return {
        resume:()=>{waitingSince=performance.now();player.playVideo();timer=setInterval(()=>{
          if(player.getCurrentTime()>=bounds.end){suspend();resolve();}
          else if(player.getPlayerState()===1)waitingSince=performance.now();
          else if(performance.now()-waitingSince>60000)reject(new Error('Видео не начало воспроизведение.'));
        },50);},
        pause:suspend,
        cleanup:()=>{cardSegmentPlaying=false;clearInterval(timer);}
      };
    });
  }
  async function phraseOnce(phrase,token){if(options().voice==='narrator'||(config.topic&&!phrase.audio&&!data.audio))return say(phrase.text,'en-US',token);return usesVideo?videoPhrase(phrase,token):audioPhrase(phrase,token);}
  async function group(token){const phrase=phrases[index];
    if(mode!=='video'&&options().voiceFirst&&phrase.translation){await say(phrase.translation,'ru-RU',token);await wait(.6,token);}
    for(let repeat=0;repeat<options().repeats;repeat++){if(token!==generation)throw cancelled();await phraseOnce(phrase,token);if(repeat+1<options().repeats)await wait(mode==='video'?0:options().pause,token);}
  }
  const holdIfPaused=token=>paused?waiting(token,resolve=>({resume:resolve})):null;
  async function run(kind){stop();clearError();const token=generation;playing=true;runKind=kind;paintPlay();if(cardsVideo&&(kind==='narrator'||(['single','sequence'].includes(kind)&&options().voice==='narrator')))syncCardFrame();
    try{
      if(kind==='continuous'){const player=await ensureVideo();if(token!==generation)throw cancelled();if(!videoRestored){player.seekTo(state.videoTime||S.bounds(phrases[index],state).start,true);videoRestored=true;}continuous=true;player.setPlaybackRate(state.rate);if(!paused)player.playVideo();return;}
      if(kind==='narrator'){await say(phrases[index].text,'en-US',token);if(paused)await holdIfPaused(token);if(token===generation){playing=false;runKind=null;paintPlay();}return;}
      if(kind==='preview'){await (cardsVideo?videoPhrase(phrases[index],token,state.rate):audioPhrase(phrases[index],token,state.rate));if(paused)await holdIfPaused(token);if(token===generation){playing=false;runKind=null;paintPlay();}return;}
      do{await group(token);if(token!==generation)throw cancelled();if(paused)await holdIfPaused(token);if(kind!=='sequence'||index===phrases.length-1)break;await wait(options().gap,token);select(index+1,false);}while(token===generation);
      if(token===generation){playing=false;runKind=null;paintPlay();}
    }catch(e){if(e.message!=='cancelled'&&token===generation){stop();error(e.message);}}
  }
  function loopAt(i){
    const shouldContinue=playing||options().continueAfter;
    stop();select(i,false);
    run('single').then(()=>{
      if(!shouldContinue||disposed||playing||runKind!==null||token!==generation)return;
      if(mode==='video'){yt?.seekTo?.(S.bounds(phrases[i],state).end,true);state.videoTime=S.bounds(phrases[i],state).end;run('continuous');}
      else if(i+1<phrases.length){select(i+1,false);run(mode==='cards'?'single':'sequence');}
    });
    const token=generation;
  }
  async function syncCardFrame(){
    if(!cardsVideo)return;
    const token=generation,selected=index;
    try{const player=await ensureVideo();if(disposed||token!==generation||index!==selected||(playing&&runKind!=='narrator'&&!(['single','sequence'].includes(runKind)&&options().voice==='narrator')))return;player.seekTo(S.bounds(phrases[index],state).start,true);player.pauseVideo();}
    catch(e){if(!disposed&&token===generation&&e.message!=='cancelled')error(e.message);}
  }
  function select(i,interrupt=true){if(interrupt)stop();if(i!==index){const tune=document.querySelector('.playback-calibration');if(tune)tune.open=false;if(config.topic){audio.currentTime=0;resumeAudio=null;}}index=Math.max(0,Math.min(phrases.length-1,i));persist();paintRows();if(cardsVideo)syncCardFrame();}
  const rows=[];
  function paintRows(){if(config.topic)rows.forEach((row,i)=>row.classList.toggle('is-speaking',i===index&&playing));count.textContent=`${index+1} / ${phrases.length}`;rows.forEach((row,i)=>{row.classList.toggle('is-active',i===index);const edge=state.edges[phrases[i].id];const adjusted=!!edge&&(Math.abs(Number(edge.start)||0)>.001||Math.abs(Number(edge.end)||0)>.001);row.classList.toggle('is-calibrated',adjusted);row.querySelector('.phrase-divider-number').setAttribute('aria-label',`Фраза ${i+1}${adjusted?', границы изменены':''}`);row.setAttribute('aria-current',i===index?'true':'false');row.hidden=mode==='cards'&&i!==index;const tr=row.querySelector('.playback-translation');if(tr)tr.hidden=!state.inline;});
    if(mode!=='cards'&&state.autoScroll&&rows[index]){const r=rows[index];if(typeof body.scrollTo==='function')body.scrollTo({top:Math.max(0,r.offsetTop-body.offsetTop-35),behavior:'smooth'});}
    fitCardGestures();
    translationButton.disabled=(state.inline&&!(config.topic&&mode==='cards'))||!phrases[index].translation;translationButton.title=translationButton.disabled?'Построчный перевод включён':'Перевод активной фразы';
    if(config.topic&&mode==='cards')rows.forEach((row,i)=>{const heading=row.previousElementSibling;if(heading?.classList.contains('topic-reading-version'))heading.hidden=i!==index;});
  }
  if(!config.topic&&(mode==='video'||mode==='cards')){
    if(usesVideo){videoBox.hidden=false;if(data.cover)videoBox.style.backgroundImage=`url("${data.cover}")`;document.getElementById('load-video').onclick=()=>run(mode==='video'?'continuous':'single');if(cardsVideo)document.querySelector('.playback-phone').classList.add('cards-with-video');}
    const tune=el('details','playback-calibration'),summary=el('summary','',mode==='cards'?'Границы фразы':'Калибровка субтитров');tune.append(summary);
    const tabs=el('div','calibration-tabs');const all=el('button','','Всё видео'),one=el('button','','Эта фраза');all.type=one.type='button';tabs.append(all,one);if(mode==='video')tune.append(tabs);const fields=el('div','calibration-fields');tune.append(fields);
    function draw(which){
      all.setAttribute('aria-pressed',String(which==='all'));one.setAttribute('aria-pressed',String(which==='one'));fields.replaceChildren();
      if(which==='all'){
        const row=el('div','calibration-offset'),earlier=el('button','offset-direction','← Раньше'),later=el('button','offset-direction','Позже →'),group=el('div','offset-stepper'),minus=el('button','','−'),plus=el('button','','+'),input=el('input');
        input.type='text';input.inputMode='decimal';input.setAttribute('aria-label','Сдвиг субтитров в секундах');input.setAttribute('aria-describedby','offset-directions');
        for(const button of [earlier,later,minus,plus])button.type='button';minus.setAttribute('aria-label','Сдвинуть раньше на 0,1 секунды');plus.setAttribute('aria-label','Сдвинуть позже на 0,1 секунды');
        const hint=el('span','offset-sr','Минус — раньше, плюс — позже.');hint.id='offset-directions';
        function refresh(){input.value=(state.offset>=0?'+':'')+state.offset.toFixed(1).replace('.',',');earlier.disabled=minus.disabled=state.offset<=-120;later.disabled=plus.disabled=state.offset>=120;}
        function set(value){stop();state.offset=Math.round(Math.max(-120,Math.min(120,value))*10)/10;persist();refresh();}
        earlier.onclick=minus.onclick=()=>set(state.offset-.1);later.onclick=plus.onclick=()=>set(state.offset+.1);
        input.onchange=()=>{const text=input.value.trim().replace('−','-').replace(',','.');if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)||!Number.isFinite(Number(text))){refresh();return;}set(Number(text));};
        input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();input.onchange();}else if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();set(state.offset+(e.key==='ArrowUp'?.1:-.1));}};
        group.append(minus,input,el('span','offset-unit','сек'),plus);row.append(earlier,group,later,hint);fields.append(row);refresh();
      }else{
        const phrase=phrases[index],wave=window.PLAYBACK_WAVES?.[id];
        const track=el('div','phrase-waveform'),svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 400 50');svg.setAttribute('preserveAspectRatio','none');svg.setAttribute('aria-hidden','true');
        const selection=el('div','phrase-wave-selection');track.append(svg,selection);fields.append(track);
        const controls=el('div','phrase-boundary-controls'),ranges={},outputs={},buttons={};
        for(const [key,label] of [['start','Начало'],['end','Конец']]){
          const range=el('input','phrase-boundary-range');range.type='range';range.step='.01';range.dataset.edge=key;range.setAttribute('aria-label',label+' фразы');track.append(range);ranges[key]=range;
          const group=el('div'),caption=el('span','',label),output=el('output');caption.append(output);outputs[key]=output;const stepper=el('div','phrase-boundary-stepper');buttons[key]=[];
          for(const [delta,symbol] of [[-.1,'−'],[.1,'+']]){const button=el('button','',symbol);button.type='button';button.dataset.edge=key;button.dataset.delta=delta;button.setAttribute('aria-label',label+(delta<0?' раньше':' позже'));button.onclick=()=>change(key,S.bounds(phrase,state)[key]+delta);stepper.append(button);buttons[key].push(button);}group.append(caption,stepper);controls.append(group);
          range.oninput=()=>change(key,Number(range.value));
        }
        fields.append(controls);
        function limits(key,bounds){const base=phrase[key]+state.offset;return key==='start'?[Math.max(0,base-10),Math.min(base+10,bounds.end-.08)]:[Math.max(0,base-10,bounds.start+.08),Math.min(wave?.duration||Infinity,base+10)];}
        function change(key,value){stop();const bounds=S.bounds(phrase,state),[min,max]=limits(key,bounds);const next=Math.max(min,Math.min(max,value));const edge={start:0,end:0,...state.edges[phrase.id]};edge[key]=Number((next-phrase[key]-state.offset).toFixed(3));if(Math.abs(edge.start)<.001&&Math.abs(edge.end)<.001)delete state.edges[phrase.id];else state.edges[phrase.id]=edge;persist();paintRows();update();if(cardsVideo)syncCardFrame();}
        function update(){
          const bounds=S.bounds(phrase,state),left=Math.max(0,Math.min(phrase.start+state.offset-2,bounds.start-.5)),right=Math.max(left+.1,Math.min(wave?.duration||Infinity,Math.max(phrase.end+state.offset+2,bounds.end+.5))),span=right-left;
          svg.replaceChildren();
          if(wave)for(let i=0;i<80;i++){const from=Math.max(0,Math.floor((left+i/80*span)/wave.step)),to=Math.max(from+1,Math.ceil((left+(i+1)/80*span)/wave.step));let peak=0;for(let j=from;j<to&&j<wave.peaks.length;j++)peak=Math.max(peak,wave.peaks[j]);const height=2+Math.sqrt(peak)*44,line=document.createElementNS(svg.namespaceURI,'line');line.setAttribute('x1',String(i*5+2));line.setAttribute('x2',String(i*5+2));line.setAttribute('y1',String(25-height/2));line.setAttribute('y2',String(25+height/2));svg.append(line);}
          selection.style.left=((bounds.start-left)/span*100)+'%';selection.style.width=((bounds.end-bounds.start)/span*100)+'%';
          for(const key of ['start','end']){const [min,max]=limits(key,bounds);ranges[key].min=left;ranges[key].max=right;ranges[key].value=bounds[key];outputs[key].textContent=bounds[key].toFixed(2).replace('.',',')+' с';ranges[key].setAttribute('aria-valuetext',outputs[key].textContent);buttons[key][0].disabled=bounds[key]<=min+.001;buttons[key][1].disabled=bounds[key]>=max-.001;}
        }
        update();
        const preview=el('button','calibration-preview','▶ Проверить фрагмент');preview.type='button';preview.onclick=()=>run('preview');fields.append(preview);
      }
      const reset=el('button','calibration-reset','Сбросить');reset.type='button';reset.onclick=()=>{stop();if(which==='all')state.offset=0;else delete state.edges[phrases[index].id];persist();paintRows();draw(which);if(cardsVideo)syncCardFrame();};fields.append(reset);
    }
    all.onclick=()=>draw('all');one.onclick=()=>draw('one');tune.ontoggle=()=>{if(!disposed&&tune.open){stop();draw(mode==='cards'?'one':'all');}};draw(mode==='cards'?'one':'all');videoBox.after(tune);
  }
  let speakerGroup=null;
  phrases.forEach((phrase,i)=>{
    if(config.topic&&phrase.versionTitle&&(mode==='cards'||!i||phrases[i-1].versionTitle!==phrase.versionTitle))body.append(el('h2','topic-reading-version',phrase.versionTitle));
    const grouped=config.topic&&mode==='audio';
    if(grouped&&(!i||phrases[i-1].paragraphNumber!==phrase.paragraphNumber)){
      speakerGroup=el('section','topic-speaker-group');const heading=el('h3','topic-speaker',phrase.speaker);heading.id='topic-speaker-'+i;speakerGroup.setAttribute('aria-labelledby',heading.id);if(phrase.speaker)speakerGroup.append(heading);else{speakerGroup.removeAttribute('aria-labelledby');speakerGroup.setAttribute('aria-label','Абзац '+phrase.paragraphNumber);}body.append(speakerGroup);
    }
    const row=el('article','playback-line');
    if(grouped){row.tabIndex=0;row.setAttribute('aria-label',`Выбрать фразу ${i+1}`);row.onkeydown=e=>{if(e.target===row&&(e.key==='Enter'||e.key===' ')){e.preventDefault();select(i);}};}
    if(config.topic&&phrase.speaker&&!grouped){const speaker=el('button','topic-speaker',phrase.speaker);speaker.type='button';speaker.setAttribute('aria-label',`Выбрать фразу ${i+1}`);speaker.onclick=()=>select(i);row.append(speaker);}
    const text=el(config.topic?'p':'button','playback-text');text.lang='en';
    if(config.topic){text.append(window.WordRecallTopicWords.text(phrase,pause));row.onclick=e=>{if(!e.target.closest('button'))select(i);};}
    else{text.type='button';text.textContent=phrase.text;text.onclick=()=>select(i);}
    row.append(text);if(phrase.translation)row.append(el('p','playback-translation',phrase.translation));
    const loop=el('button','playback-loop');loop.type='button';loop.setAttribute('aria-label',`Повторить фразу ${i+1}`);loop.append(icon('loop'));loop.onclick=e=>{e.stopPropagation();loopAt(i);};row.append(loop);
    row.append(el('span','phrase-divider-number',String(i+1)));(grouped?speakerGroup:body).append(row);rows.push(row);
    if(grouped&&(!phrases[i+1]||phrases[i+1].paragraphNumber!==phrase.paragraphNumber)){
      const divider=el('div','topic-paragraph-divider'),number=el('span','phrase-divider-number topic-paragraph-number',phrase.paragraphNumber);number.setAttribute('aria-label','Абзац '+phrase.paragraphNumber);divider.append(number);speakerGroup.append(divider);
    }
  });
  function fitCardGestures(){if(mode==='cards')body.classList.toggle('can-scroll',body.scrollHeight>body.clientHeight+2);}
  if(mode==='cards'){
    body.classList.add('playback-cards');let gesture=null,suppressClick=false;
    for(const area of [body,videoBox]){
      area.addEventListener('pointerdown',e=>{
        if(!e.isPrimary||e.button!==0||e.target.closest('.playback-loop')||(area===body&&body.scrollHeight>body.clientHeight+2))return;
        gesture={x:e.clientX,y:e.clientY,id:e.pointerId};if(!config.topic)area.setPointerCapture?.(e.pointerId);
      });
      area.addEventListener('pointerup',e=>{
        if(!gesture||gesture.id!==e.pointerId)return;
        const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;gesture=null;
        if(Math.abs(dy)>65&&Math.abs(dy)>Math.abs(dx)*1.5){suppressClick=true;select(index+(dy<0?1:-1));setTimeout(()=>suppressClick=false,0);}
      });
      area.addEventListener('pointercancel',()=>gesture=null);
      area.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();}},true);
    }
    body.tabIndex=0;body.addEventListener('keydown',e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();select(index+(e.key==='ArrowUp'?1:-1));}});
    window.addEventListener('resize',fitCardGestures);
    if(window.ResizeObserver)new ResizeObserver(fitCardGestures).observe(body);
  }
  function control(name,label,action){const b=el('button','pill-control');b.type='button';b.id='control-'+name;b.setAttribute('aria-label',label);b.append(name==='speed'?el('strong','',state.rate.toFixed(2).replace(/0$/,'')+'×'):icon(name),el('span','',label));b.onclick=action;pill.append(b);return b;}
  if(mode!=='cards'){const auto=control('scroll','Автоскролл',()=>{state.autoScroll=!state.autoScroll;persist();auto.setAttribute('aria-pressed',String(state.autoScroll));});auto.setAttribute('aria-pressed',String(state.autoScroll));}
  const rates=document.getElementById('playback-rates');
  const speed=control('speed','Скорость',()=>{rates.hidden=!rates.hidden;speed.setAttribute('aria-expanded',String(!rates.hidden));});speed.setAttribute('aria-expanded','false');speed.setAttribute('aria-controls',rates.id);
  for(const rate of [.75,1,1.25,1.5]){const button=el('button','',rate+'×');button.type='button';button.setAttribute('aria-pressed',String(state.rate===rate));button.onclick=()=>{state.rate=rate;const effective=['single','sequence'].includes(runKind)?phraseRate():rate;audio.playbackRate=effective;yt?.setPlaybackRate?.(effective);persist();speed.querySelector('strong').textContent=rate+'×';rates.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));rates.hidden=true;speed.setAttribute('aria-expanded','false');};rates.append(button);}
  if(mode==='cards'){const narrator=control('narrator','Диктор',()=>playing&&runKind==='narrator'?stop():run('narrator'));narrator.setAttribute('aria-pressed','false');}
  const play=control('play','Слушать',()=>playing?pause():paused?resume():run(mode==='video'?'continuous':mode==='cards'?'single':'sequence'));play.classList.add('pill-play');
  function paintPlay(){if(config.topic)rows.forEach((row,i)=>{row.classList.toggle('is-speaking',i===index&&playing);row.querySelector('.playback-loop').setAttribute('aria-pressed',String(i===index&&playing&&runKind==='single'));});const narrator=document.getElementById('control-narrator');if(narrator)narrator.setAttribute('aria-pressed',String(playing&&runKind==='narrator'));if(!document.getElementById('control-play'))return;play.querySelector('svg').replaceWith(icon(playing?'pause':'play'));play.setAttribute('aria-label',playing?'Пауза':'Воспроизвести');play.querySelector('span').textContent=playing?'Пауза':'Слушать';}
  function sheet(title,cls){const dialog=el('dialog','playback-sheet '+cls);const grab=el('span','sheet-grab');grab.setAttribute('aria-hidden','true');const heading=el('h2','',title),x=el('button','sheet-close','×');heading.id='sheet-heading';dialog.setAttribute('aria-labelledby',heading.id);x.type='button';x.setAttribute('aria-label','Закрыть');x.onclick=()=>dialog.close();dialog.append(grab,heading,x);document.body.append(dialog);dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientY<r.top||e.clientY>r.bottom||e.clientX<r.left||e.clientX>r.right)dialog.close();}});return dialog;}
  function modal(open){const wasPlaying=playing;pause();const token=generation,dialog=open();dialog.addEventListener('close',()=>{dialog.remove();if(wasPlaying&&!disposed&&token===generation)resume();},{once:true});dialog.showModal();}
  const translationButton=control('translate','Перевод',()=>{if((state.inline&&!(config.topic&&mode==='cards'))||!phrases[index].translation)return;modal(()=>{const dialog=sheet(`Перевод реплики · ${index+1} из ${phrases.length}`,'translation-sheet');dialog.append(el('span','ai-translation-label','ИИ-перевод'),el('p','translation-original',phrases[index].text),el('p','translation-result',phrases[index].translation));return dialog;});});
  control('settings','Настройки',()=>modal(()=>{
    const topicSettings=!!config.topic,dialog=sheet('Настройки воспроизведения','audio-settings-sheet');
    const tabs=el('div','playback-settings-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Режим');
    const panel=el('div','playback-settings-panel');panel.id='mode-settings-panel';panel.setAttribute('role','tabpanel');
    let selected=mode==='video'?'video':'audio';
    function toggle(label,key,config){const row=el('label','playback-inline-toggle',label),input=el('input');input.type='checkbox';input.checked=config[key];input.dataset.setting=key;input.onchange=()=>{config[key]=input.checked;persist();};row.append(input);panel.append(row);}
    function stepper(key,label,config,min,max,unit){
      const row=el('div','audio-setting');row.dataset.setting=key;row.append(el('span','',label));
      const controls=el('div','audio-stepper'),minus=el('button','','−'),value=el('input'),plus=el('button','','+');minus.type=plus.type='button';minus.setAttribute('aria-label','Уменьшить: '+label);plus.setAttribute('aria-label','Увеличить: '+label);value.type='number';value.min=min;value.max=max;value.step=1;value.value=config[key];value.setAttribute('aria-label',label);controls.append(minus,value,plus,el('span','stepper-unit',unit));row.append(controls);panel.append(row);
      const update=()=>{if(!value.checkValidity()||!Number.isFinite(value.valueAsNumber)){value.value=config[key];return;}config[key]=value.valueAsNumber;persist();minus.disabled=config[key]<=min;plus.disabled=config[key]>=max;const pause=panel.querySelector('[data-setting=pause]');if(pause)pause.hidden=config.repeats===1;};
      minus.onclick=()=>{value.value=Math.max(min,config[key]-1);update();};plus.onclick=()=>{value.value=Math.min(max,config[key]+1);update();};value.onchange=update;update();
    }
    function draw(){
      const config=state[selected];panel.replaceChildren();if(topicSettings)panel.setAttribute('aria-label','Настройки аудирования');else panel.setAttribute('aria-labelledby','settings-tab-'+selected);
      for(const tab of tabs.children){tab.setAttribute('aria-selected',String(tab.dataset.mode===selected));tab.tabIndex=tab.dataset.mode===selected?0:-1;}
      panel.append(el('h3','settings-section-title','Повтор по тапу ↻'),el('p','settings-loop-hint','Нажмите ↻ возле фразы, чтобы повторить её'));
      if(selected==='audio')panel.append(el('p','settings-sequence-hint','Звук и количество прослушиваний также действуют при последовательном воспроизведении.'));
      const voice=el('fieldset','voice-options');voice.append(el('legend','','Звук повтора'));
      for(const [value,label] of [['original','Оригинал'],['slow','Медленнее'],['narrator','Диктор']]){const l=el('label'),r=el('input');r.type='radio';r.name='voice';r.value=value;r.checked=config.voice===value;r.onchange=()=>{config.voice=value;persist();};l.append(r,el('span','',label));voice.append(l);}panel.append(voice);
      stepper('repeats','Фраза звучит',config,1,10,'раз');
      toggle('Продолжать после повтора','continueAfter',config);
      if(selected==='audio'){
        toggle('Сначала перевод голосом','voiceFirst',config);
        stepper('pause','Пауза между повторами',config,0,10,'сек');
        stepper('gap','Перед следующей фразой',config,0,10,'сек');
        panel.querySelector('[data-setting=pause]').hidden=config.repeats===1;
      }
    }
    for(const [value,label] of (config.topic?[['audio','Аудирование']]:[['video','Видео'],['audio','Аудирование']])){const tab=el('button','',label);tab.type='button';tab.id='settings-tab-'+value;tab.dataset.mode=value;tab.setAttribute('role','tab');tab.setAttribute('aria-controls',panel.id);tab.onclick=()=>{selected=value;draw();};tab.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const target=e.key==='Home'?tabs.firstChild:e.key==='End'?tabs.lastChild:tab===tabs.firstChild?tabs.lastChild:tabs.firstChild;target.click();target.focus();}};tabs.append(tab);}
    if(!config.topic)dialog.append(tabs);dialog.append(panel);draw();return dialog;
  }));
  pill.style.setProperty('--pill-columns',5);paintRows();paintPlay();
  if(params.get('settings')==='1')document.getElementById('control-settings').click();
  if(cardsVideo)syncCardFrame();
  const poll=setInterval(()=>{if(!continuous||!playing||!yt)return;const time=yt.getCurrentTime();state.videoTime=time;const next=phrases.findIndex(p=>{const b=S.bounds(p,state);return time>=b.start&&time<b.end;});if(next>=0&&next!==index)select(next,false);if(started)hooks?.onPosition({index,seconds:time});},300);
  close.onclick=()=>{if(mode==='video'&&yt)state.videoTime=yt.getCurrentTime();persist();stop();};
  window.addEventListener('pagehide',()=>{disposed=true;if(mode==='video'&&yt)state.videoTime=yt.getCurrentTime();persist();stop();clearInterval(poll);videoAttempt?.cancel?.();});
  window.addEventListener('pageshow',event=>{if(event.persisted&&disposed)location.reload();});
  return {stop,select,state,position};
};
if(document.getElementById('playback-pill'))window.WordRecallPlayer();
