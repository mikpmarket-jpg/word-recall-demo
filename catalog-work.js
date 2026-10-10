/* Catalog sessions are independent of learning-cycle and vocabulary storage.
   A playback adapter must report an actual start, then report its real position.
   No video playback adapter is currently connected to this prototype. */
(() => {
  'use strict';
  const key='word-recall-video-work-v1', modes=new Map();
  const allowed=['video','cards','audio'];
  function read(){
    try{
      const value=JSON.parse((window.WordRecallData?.local || localStorage).getItem(key));
      return Array.isArray(value)?value.filter(x=>x&&typeof x.materialId==='string'&&typeof x.collectionId==='string'&&allowed.includes(x.mode)&&Number.isFinite(x.lastUsed)).sort((a,b)=>b.lastUsed-a.lastUsed):[];
    }catch{return [];}
  }
  function write(entry){
    try{
      // Retain all other sessions, including ones unavailable in the catalog.
      const value=JSON.parse((window.WordRecallData?.local || localStorage).getItem(key));
      const all=Array.isArray(value)?value:[];
      (window.WordRecallData?.local || localStorage).setItem(key,JSON.stringify([entry,...all.filter(x=>x?.materialId!==entry.materialId||x?.collectionId!==entry.collectionId)]));
    }catch{}
  }
  function available(mode,material){
    const adapter=modes.get(mode);
    return Boolean(adapter&&material.available!==false&&(!adapter.supports||adapter.supports(material)));
  }
  async function start(collection,material,mode,session){
    if(!available(mode,material))return false;
    let started=false,position=session?.position??null;
    const save=()=>write({collectionId:collection.id,materialId:material.id,mode,position,lastUsed:Date.now()});
    await modes.get(mode).start({collection,material,position,
      onStarted(){if(started)return;started=true;save();},
      onPosition(value){position=value;if(started)save();}
    });
    return started;
  }
  window.WordRecallVideoWork={key,read,available,start,
    rememberSelection(collectionId,materialId,mode,position){
      const entry=read().find(x=>x.collectionId===collectionId&&x.materialId===materialId);
      if(entry)write({...entry,mode,position:{...(typeof entry.position==='object'?entry.position:{}),...position},lastUsed:Date.now()});
    },
    register(mode,adapter){if(!allowed.includes(mode)||typeof adapter?.start!=='function')throw new TypeError('Invalid playback adapter');modes.set(mode,adapter);}
  };
})();
