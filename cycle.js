(() => {
  'use strict';
  const api=window.WordRecallCycle, $=id=>document.getElementById(id);
  let state=api.state, toastTimer;
  const rounds={1:'Прояснение',2:'Аудирование',3:'Слышать и понимать',4:'Активная речь'};
  const descriptions={1:'Разберите смысл фраз и значения слов.',2:'Слушайте фразы, привыкая к их звучанию.',3:'Повторяйте фразы в темпе оригинала, чтобы легче понимать быструю речь в сериалах.',4:'Составляйте и произносите свои фразы — учитесь самостоятельно говорить по-английски.'};
  function node(tag,className,text){const e=document.createElement(tag);e.className=className||'';if(text!=null)e.textContent=text;return e;}
  function toast(message){clearTimeout(toastTimer);$('cycle-toast').textContent=message;$('cycle-toast').hidden=false;toastTimer=setTimeout(()=>$('cycle-toast').hidden=true,4500);}
  function save(){if(!api.write(state))toast('Браузер не разрешает сохранять цикл. Разрешите хранение данных, чтобы переходить между кругами.');}
  function useFreeEntry(){
    if(state.mode!=='free'){
      state.mode='free';
      save();
    }
  }
  function render(){
    useFreeEntry();
    const list=$('cycle-rounds');list.replaceChildren();
    if(!state.phraseIds.length)return;
    for(const id of api.available(state)){
      const name=rounds[id];
      const item=node('section','cycle-round');item.dataset.round=id;
      const link=node('a','round-open');
      link.href=`circle-${id}.html?cycle=${encodeURIComponent(state.id)}`;
      link.setAttribute('aria-labelledby',`round-title-${id}`);link.setAttribute('aria-describedby',`round-description-${id}`);
      const number=node('span','round-number',String(id).padStart(2,'0'));number.setAttribute('aria-hidden','true');
      const body=node('div','round-body'),title=node('h3','round-title',name),description=node('p','round-description',descriptions[id]);
      title.id=`round-title-${id}`;description.id=`round-description-${id}`;
      const arrow=node('span','round-arrow','→');arrow.setAttribute('aria-hidden','true');
      body.append(title,description);link.append(number,body,arrow);
      link.addEventListener('click',e=>{if(!api.durable){e.preventDefault();toast('Для перехода разрешите браузеру сохранять данные цикла.');}});
      item.append(link);list.append(item);
    }
  }
  $('open-cycle-words').addEventListener('click',event=>{if(!api.durable){event.preventDefault();toast('Для перехода разрешите браузеру сохранять данные цикла.');}});
  window.addEventListener('pageshow',()=>{const saved=api.read();if(saved){state=saved;api.state=state;render();}});
  render();if(!api.durable)toast('Для перехода между кругами разрешите браузеру сохранять данные цикла.');
  window.addEventListener('learning-settings-saved',()=>{state=api.state;render();});
})();
