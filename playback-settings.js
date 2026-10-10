(() => {
  'use strict';
  const prefix='word-recall-playback-v1:';
  const clamp=(value,min,max,fallback)=>Number.isFinite(Number(value))?Math.max(min,Math.min(max,Number(value))):fallback;
  function options(value={},audio=false){
    const common={voice:['original','slow','narrator'].includes(value.voice)?value.voice:'original',repeats:Math.round(clamp(value.repeats,1,10,1)),continueAfter:value.continueAfter===true};
    return audio?{...common,pause:clamp(value.pause,0,10,2),gap:clamp(value.gap,0,10,2),voiceFirst:value.voiceFirst===true}:common;
  }
  function read(id){let value={};try{value=JSON.parse((window.WordRecallData?.local || localStorage).getItem(prefix+id))||{};}catch{}
    return {inline:value.inline===true,autoScroll:value.autoScroll!==false,
      rate:[.75,1,1.25,1.5].includes(value.rate)?value.rate:1,
      video:options(value.video||value),audio:options(value.audio||value,true),
      offset:clamp(value.offset,-120,120,0),
      edges:value.edges&&typeof value.edges==='object'?value.edges:{},videoTime:clamp(value.videoTime,0,86400,0),index:Math.floor(clamp(value.index,0,100000,0))};
  }
  function save(id,value){try{(window.WordRecallData?.local || localStorage).setItem(prefix+id,JSON.stringify(value));return true;}catch{return false;}}
  function bounds(phrase,state){const edge=state.edges[phrase.id]||{};const start=Math.max(0,phrase.start+state.offset+clamp(edge.start,-10,10,0));return {start,end:Math.max(start+.08,phrase.end+state.offset+clamp(edge.end,-10,10,0))};}
  window.PlaybackSettings={read,save,bounds};
  if(document.getElementById('catalog-screen'))for(const mode of ['video','audio','cards'])window.WordRecallVideoWork.register(mode,{
    supports:material=>!!window.PLAYBACK_DATA?.[material.id],
    start:({material,position})=>{if(position!=null){const state=read(material.id);if(Number.isFinite(position))state.videoTime=position;else{if(Number.isFinite(position.index??position.phrase))state.index=position.index??position.phrase;if(Number.isFinite(position.seconds))state.videoTime=position.seconds;}save(material.id,state);}const params=new URLSearchParams(location.search);params.set('mode',mode);params.set('clip',material.id);location.href=window.WordRecallNavigation.enter('player.html?'+params);}
  });
})();
