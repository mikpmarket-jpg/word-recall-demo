/* Demonstration word clarification, using the existing dictionary-sheet pattern. */
(() => {
  'use strict';
  const meanings={reservation:['бронирование','Предварительная договорённость о том, что номер будет за вами.'],under:['на имя / фамилию','В выражении «a reservation under Morgan» указывает, на какую фамилию сделана бронь.'],morgan:['Морган','Фамилия гостя, на которую оформлено бронирование.'],early:['рано; раньше времени','Здесь — приехать раньше установленного времени заселения.'],check:['проверить; уточнить','В «Let me check» — проверить информацию. В «check in» — зарегистрироваться и заселиться.'],in:['в; часть выражения check in','В этой ситуации «check in» означает заселиться в отель.'],ready:['готовый','Номер готов, и в него уже можно заселиться.'],before:['до; раньше','Раньше указанного времени.'],then:['тогда; к тому времени','Здесь отсылает к ранее названному времени заселения.'],certainly:['конечно; разумеется','Вежливое согласие выполнить просьбу.'],luggage:['багаж','Сумки и чемоданы путешественника.'],room:['комната; номер','В «luggage room» — комната хранения багажа.'],claim:['получение; предъявление права','В «claim ticket» — талон, по которому можно забрать оставленный багаж.'],ticket:['талон','Здесь — подтверждение, которое выдают при приёме багажа.'],cleaned:['убирают; очищают','«Being cleaned» — уборка происходит сейчас.'],afraid:['к сожалению','«I’m afraid» здесь смягчает неприятную новость.'],promise:['обещать','Гарантировать, что это произойдёт.'],possibly:['возможно','Говорящий не уверен.'],keep:['оставить у себя; хранить','Временно сохранить вещи гостя.'],leave:['оставить','Передать вещи на временное хранение.'],bags:['сумки','Вещи гостя, которые он хочет оставить.'],lunch:['обед','Дневной приём пищи.'],course:['конечно','«Of course» — согласие или понимание.'],hello:['здравствуйте','Приветствие.'],starts:['начинается','Указывает время начала заселения.'],three:['три','Здесь — три часа дня.'],two:['два','Здесь — два часа дня.'],around:['около; примерно','Приблизительное время.'],fine:['хорошо; устраивает','«That’s fine» — гостя устраивает предложенный вариант.']};
  const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls||'';if(text!=null)n.textContent=text;return n;};
  function open(token,phrase,pause,trigger){
    pause();const key=token.toLowerCase().replace(/[.,?!’']/g,''),entry=window.WordRecallData?.isTest===false?null:meanings[key];
    const dialog=el('dialog','playback-sheet topic-dictionary'),grab=el('span','sheet-grab'),close=el('button','sheet-close','×'),heading=el('h2','',token.replace(/[.,?!]$/,''));
    close.type='button';close.setAttribute('aria-label','Закрыть');heading.id='topic-dictionary-title';dialog.setAttribute('aria-labelledby',heading.id);grab.setAttribute('aria-hidden','true');
    dialog.append(grab,close,el('p','topic-dictionary-context','ЗНАЧЕНИЕ В ЭТОЙ ФРАЗЕ'),heading);
    if(entry)dialog.append(el('h3','',entry[0]),el('p','topic-definition',entry[1]));
    dialog.append(el('blockquote','',phrase.text),el('p','topic-definition',phrase.translation));
    close.onclick=()=>dialog.close();dialog.addEventListener('close',()=>{dialog.remove();trigger.focus();},{once:true});
    dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
    document.body.append(dialog);dialog.showModal();
  }
  function text(phrase,pause){
    const span=el('span');
    for(const token of phrase.text.split(/(\s+)/)){
      if(!token)continue;if(/^\s+$/.test(token)){span.append(document.createTextNode(token));continue;}
      const b=el('button','topic-word',token);b.type='button';b.setAttribute('aria-haspopup','dialog');b.onclick=e=>{e.stopPropagation();open(token,phrase,pause,b);};span.append(b);
    }
    return span;
  }
  window.WordRecallTopicWords={text};
})();
