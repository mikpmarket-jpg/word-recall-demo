/* Local return routes and viewport positions; independent of learning results. */
(() => {
  'use strict';
  const current=()=>location.pathname.split('/').pop()+location.search;
  function safe(value){
    if(!value)return null;
    try{
      const url=new URL(value,location.href),base=new URL('.',location.href);
      if(url.origin!==base.origin||url.pathname.slice(0,url.pathname.lastIndexOf('/')+1)!==base.pathname||!['index.html','catalog.html','uploads.html','settings.html'].includes(url.pathname.split('/').pop()))return null;
      return url.pathname.split('/').pop()+url.search;
    }catch{return null;}
  }
  const destination=()=>safe(new URLSearchParams(location.search).get('returnTo'));
  function enter(href){const url=new URL(href,location.href);url.searchParams.set('returnTo',current());return url.pathname.split('/').pop()+url.search;}
  const storage=()=>window.WordRecallData?.session||sessionStorage;
  function remember(key,element){try{storage().setItem('word-recall-catalog-scroll:'+key,JSON.stringify({top:element.scrollTop,left:element.scrollLeft}));}catch{}}
  function restore(key,element){try{const value=JSON.parse(storage().getItem('word-recall-catalog-scroll:'+key));if(value){element.scrollTop=value.top||0;element.scrollLeft=value.left||0;}}catch{}}
  window.WordRecallNavigation={current,enter,back:fallback=>destination()||fallback,hasReturn:()=>!!destination(),context:()=>destination()?{returnTo:destination()}:{},remember,restore};
})();
