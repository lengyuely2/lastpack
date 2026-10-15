export function directionFromKeys(keys) {
  const x=Number(keys.has('ArrowRight')||keys.has('KeyD'))-Number(keys.has('ArrowLeft')||keys.has('KeyA'));
  const y=Number(keys.has('ArrowDown')||keys.has('KeyS'))-Number(keys.has('ArrowUp')||keys.has('KeyW'));
  const length=Math.max(1,Math.hypot(x,y));return {x:x/length,y:y/length};
}
export function setupMovement({getPlayer,getPhase,send}) {
  const $=id=>document.getElementById(id),keys=new Set(),directionKeys=new Set(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD']);
  let stick={x:0,y:0},pointer=null,last={x:0,y:0},previousMode=null,previousPhase=null,sentAt=0;
  const canMove=()=>getPlayer()?.controlMode==='manual'&&getPlayer()?.hp>0&&getPhase()==='battle'&&!document.hidden&&!document.querySelector('dialog[open]');
  function publish(force=false){const vector=canMove()?(pointer!==null?stick:directionFromKeys(keys)):{x:0,y:0};const now=performance.now();if(!force&&(vector.x||vector.y)&&now-sentAt<75)return;if(force||vector.x!==last.x||vector.y!==last.y){send({type:'move',...vector});last=vector;sentAt=now;}}
  function reset(){const moving=last.x||last.y;keys.clear();stick={x:0,y:0};const captured=pointer;pointer=null;$('movement-knob').style.transform='translate(0,0)';if(captured!==null&&$('movement-pad').hasPointerCapture(captured))$('movement-pad').releasePointerCapture(captured);if(moving){send({type:'move',x:0,y:0});last={x:0,y:0};}}
  for(const mode of ['auto','manual'])$('mode-'+mode).onclick=()=>{reset();localStorage.setItem('lastpack-control',mode);send({type:'controlMode',mode});};
  document.addEventListener('keydown',e=>{if(!directionKeys.has(e.code)||!canMove()||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.target.isContentEditable)return;e.preventDefault();if(e.repeat)return;keys.add(e.code);publish();});
  document.addEventListener('keyup',e=>{if(!keys.has(e.code))return;e.preventDefault();keys.delete(e.code);publish();});
  window.addEventListener('blur',reset);document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});
  function moveStick(e){const rect=$('movement-pad').getBoundingClientRect(),x=e.clientX-rect.left-rect.width/2,y=e.clientY-rect.top-rect.height/2,d=Math.hypot(x,y),radius=rect.width*.3,scale=Math.max(radius,d);stick=d<6?{x:0,y:0}:{x:x/scale,y:y/scale};$('movement-knob').style.transform=`translate(${stick.x*radius}px,${stick.y*radius}px)`;publish();}
  $('movement-pad').addEventListener('pointerdown',e=>{if(!canMove()||pointer!==null||e.button!==0)return;e.preventDefault();pointer=e.pointerId;$('movement-pad').setPointerCapture(pointer);moveStick(e);});
  $('movement-pad').addEventListener('pointermove',e=>{if(e.pointerId!==pointer)return;e.preventDefault();moveStick(e);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])$('movement-pad').addEventListener(event,e=>{if(e.pointerId===pointer)reset();});
  // Send a short lease while a direction is held; a lost release cannot leave a character walking forever.
  setInterval(()=>{if(canMove()){const requested=pointer!==null?stick:directionFromKeys(keys);if(requested.x||requested.y||last.x||last.y)publish(true);}else if(keys.size||pointer!==null||last.x||last.y)reset();},100);
  return {
    reset,
    onWelcome(resuming){reset();if(!resuming)send({type:'controlMode',mode:localStorage.getItem('lastpack-control')==='manual'?'manual':'auto'});},
    render(){const p=getPlayer();if(!p)return;const phase=getPhase(),mode=p.controlMode;if(mode!==previousMode||phase!==previousPhase)reset();previousMode=mode;previousPhase=phase;const done=['victory','defeat'].includes(phase);
      for(const kind of ['auto','manual']){$('mode-'+kind).setAttribute('aria-pressed',String(mode===kind));$('mode-'+kind).disabled=done;}
      $('movement-hint').textContent=mode==='auto'?({balanced:'均衡走位 · 瞄准、攻击和拾取自动进行。',aggressive:'激进拾取 · 积极追经验和宝箱，遇到近身危险先躲避。',conservative:'保守固守 · 守住所在区域，附近拾取，危险时撤开。'}[p.autoStrategy]||'自动走位、瞄准、攻击和拾取。'):phase==='battle'?(p.hp>0?'WASD / 方向键 / 摇杆移动；攻击和拾取自动进行。':'角色已倒地，等待队友救起。'):'手动移动已选择；开战后使用 WASD / 方向键 / 摇杆。';
      $('movement-pad').classList.toggle('hidden',mode!=='manual'||phase!=='battle'||p.hp<=0);
    }
  };
}
