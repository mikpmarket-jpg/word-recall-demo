(() => {
  'use strict';
  const levels=['A1','A2','B1','B2','C1','C2'];
  const fields={
    lex:{label:'Лексика',options:[['','Любой'],...levels.map(x=>[x,'До '+x])]},
    gram:{label:'Грамматика',options:[['','Любой'],...levels.map(x=>[x,'До '+x])]},
    maxSec:{label:'Длительность',options:[['','Любая'],['60','До 1 мин'],['180','До 3 мин'],['300','До 5 мин'],['600','До 10 мин'],['1200','До 20 мин']]},
    category:{label:'Тип материала',options:[['all','Все'],['series','Сериалы'],['learning','Учебные видео']]},
    type:{label:'Тип материала',options:[['','Все'],['video','Видео'],['audio','Аудио'],['text','Текст']]}
  };
  function read(params,names=['lex','gram','maxSec']){
    const values={};for(const name of names){const value=params.get(name)||'';values[name]=fields[name].options.some(([id])=>id===value)?value:fields[name].options[0][0];}return values;
  }
  function query(values){return Object.fromEntries(Object.entries(values).filter(([key,value])=>fields[key]&&value&&value!=='all'));}
  function match(item,values){
    for(const [key,field] of [['lex','lexicalLevel'],['gram','grammarLevel']])if(values[key]){
      const index=levels.indexOf(item[field]);if(index<0||index>levels.indexOf(values[key]))return false;
    }
    if(values.maxSec&&(!Number.isFinite(item.sec)||item.sec<0||item.sec>Number(values.maxSec)))return false;
    if(values.type&&(item.type||'text')!==values.type)return false;
    return true;
  }
  let serial=0;
  function attach(trigger,{values,names,onApply}){
    const id='filter-sheet-'+(++serial),dialog=document.createElement('dialog');dialog.className='catalog-filter-sheet';dialog.id=id;dialog.setAttribute('aria-labelledby',id+'-title');
    const form=document.createElement('form');form.method='dialog';
    const header=document.createElement('header');header.className='filter-sheet-header';
    const title=document.createElement('h2');title.id=id+'-title';title.textContent='Фильтр';
    const close=document.createElement('button');close.type='button';close.className='filter-sheet-close';close.textContent='×';close.setAttribute('aria-label','Закрыть');header.append(title,close);form.append(header);
    const body=document.createElement('div');body.className='filter-sheet-body';
    for(const name of names){
      const field=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=fields[name].label;field.append(legend);
      const options=document.createElement('div');options.className='filter-options';
      for(const [value,text] of fields[name].options){const label=document.createElement('label'),input=document.createElement('input'),caption=document.createElement('span');input.type='radio';input.name=name;input.value=value;caption.textContent=text;label.append(input,caption);options.append(label);}
      field.append(options);body.append(field);
    }form.append(body);
    const footer=document.createElement('footer');footer.className='filter-sheet-footer';
    const reset=document.createElement('button');reset.type='button';reset.className='filter-reset';reset.textContent='Сбросить';
    const apply=document.createElement('button');apply.type='submit';apply.className='filter-apply';apply.textContent='Показать';footer.append(reset,apply);form.append(footer);dialog.append(form);document.body.append(dialog);
    function set(values){for(const input of form.querySelectorAll('input'))input.checked=input.value===(values[input.name]??fields[input.name].options[0][0]);}
    trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls',id);trigger.setAttribute('aria-expanded','false');
    trigger.dataset.active=String(Object.keys(query(values)).length>0);
    trigger.addEventListener('click',()=>{set(values);dialog.showModal();trigger.setAttribute('aria-expanded','true');});
    close.onclick=()=>dialog.close();dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
    dialog.addEventListener('close',()=>trigger.setAttribute('aria-expanded','false'));
    reset.onclick=()=>set({});
    form.onsubmit=e=>{e.preventDefault();const selected={};for(const input of form.querySelectorAll('input:checked'))selected[input.name]=input.value;dialog.close();onApply(selected);};
    return dialog;
  }
  window.WordRecallFilter={read,query,match,attach};
})();
