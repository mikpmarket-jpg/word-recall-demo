'use strict';
// Fit visible content without clipping; keep scrolling available as a fallback
// for content outside the demo set or unusually large accessibility text.
window.fitCircleLayout=function(){
  const phone=document.querySelector('.circle-phone'),body=document.getElementById('circle-body');
  if(!phone||!body)return;
  phone.classList.remove('fit-compact','fit-tight','fit-small-scene');
  phone.style.removeProperty('--circle-scene-height');
  const scene=body.querySelector('.scene-placeholder:not([hidden]),.scene-player:not([hidden])');
  if(!scene)return;
  for(let level=0;level<3;level++){
    phone.classList.toggle('fit-compact',level>0);
    phone.classList.toggle('fit-tight',level>1);
    phone.classList.remove('fit-small-scene');
    phone.style.removeProperty('--circle-scene-height');
    const natural=scene.getBoundingClientRect().height;
    const overflow=Math.max(0,body.scrollHeight-body.clientHeight);
    if(!overflow){body.classList.remove('can-scroll');return;}
    const minimum=level===2?55:level===1?105:140;
    const height=Math.max(minimum,Math.floor(natural-overflow-2));
    phone.style.setProperty('--circle-scene-height',height+'px');
    phone.classList.toggle('fit-small-scene',height<130);
    if(body.scrollHeight<=body.clientHeight+1){body.classList.remove('can-scroll');return;}
  }
  body.classList.toggle('can-scroll',body.scrollHeight>body.clientHeight+1);
};
window.addEventListener('resize',()=>requestAnimationFrame(window.fitCircleLayout));
window.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(window.fitCircleLayout));
