import {createRoom,addPlayer,ITEMS,dimensions,fits,stats,isWeaponItem,bagLinks,starCells,STAR_RULES} from '/game.mjs';
import {icon} from '/art.mjs';
export function createBagLab({$,toast,known=()=>true}){
  const room=createRoom('BAG-LAB',81,true),p=addPlayer(room,'lab','背包演练');p.weapons=['pistol',null];let selected='lab0',drag=null;
  function reset(){p.items=[['scope',0,0],['piercing',2,0],['magnet',4,0],['propellerhat',4,1],['medkit',0,2],['tomato',0,1],['coffee',1,1],['cooler',3,3],['trigger',3,2]].filter(([kind])=>known('items',kind)).map(([kind,x,y],n)=>({id:'lab'+n,kind,x,y,rotated:false,target:0}));selected=p.items[0]?.id||null;p.weapons=[known('weapons','rifle')?'rifle':'pistol',known('weapons','frost')?'frost':null];render();}
  function render(){const s=stats(p),source=p.items.find(i=>i.id===selected),linked=s.links.find(l=>l.source===selected),ids=linked?.ids||[];
    $('bag-lab-grid').innerHTML=Array.from({length:30},(_,n)=>`<button class="lab-cell" data-cell="${n}" aria-label="演练第 ${n%6+1} 列第 ${Math.floor(n/6)+1} 行"></button>`).join('')+p.items.map(i=>{const d=dimensions(i);return `<button class="lab-item ${i.id===selected?'selected':''} ${s.links.some(l=>l.ids.includes(i.id))?'linked':''}" data-lab-item="${i.id}" style="left:${i.x*100/6}%;top:${i.y*100/5}%;width:${d.w*100/6}%;height:${d.h*100/5}%;--item-color:${ITEMS[i.kind].color}" aria-label="演练${ITEMS[i.kind].name}">${icon(ITEMS[i.kind].icon,ITEMS[i.kind].color)}<small>${ITEMS[i.kind].name}</small></button>`;}).join('')+(source?starCells(source,ITEMS):[]).map(c=>`<span class="lab-star ${p.items.some(i=>ids.includes(i.id)&&i.id!==selected&&c.x>=i.x&&c.x<i.x+dimensions(i).w&&c.y>=i.y&&c.y<i.y+dimensions(i).h)?'matched':''}" style="left:${c.x*100/6}%;top:${c.y*100/5}%">★</span>`).join('');
    if(!source){$('bag-lab-detail').textContent='正式出征获得配件后，可在这里演练排列。';$('bag-lab-links').textContent='？？';$('bag-lab-stats').textContent='';$('bag-lab-bind').disabled=true;return;}
    $('bag-lab-detail').textContent=`${ITEMS[source.kind].name} · ${STAR_RULES[source.kind]?.text||ITEMS[source.kind].text}`;
    $('bag-lab-links').innerHTML=[...s.combos,...s.links].map(l=>`<div class="combo-chip">${l.source?'★':'✦'} ${l.name}<small>${l.text}</small></div>`).join('')||'<p>联动断开了，试试移动或旋转配件。</p>';
    $('bag-lab-stats').textContent=`步枪暴击 ${(s.weapons[0].crit*100).toFixed(0)}% · 治疗倍率 ${s.healMultiplier.toFixed(2)} · 经验加成 ${(s.xpBonus*100).toFixed(1)}%`;
    $('bag-lab-bind').disabled=!isWeaponItem(source.kind);$('bag-lab-bind').value=String(source.target);
  }
  function move(n){if(!selected)return;const i=p.items.find(i=>i.id===selected),candidate={...i,x:n%6,y:Math.floor(n/6)};if(!fits(p,candidate)){toast('这个位置会重叠或超出背包');return;}Object.assign(i,candidate);render();}
  $('bag-lab-grid').onclick=e=>{const item=e.target.closest('[data-lab-item]'),cell=e.target.closest('[data-cell]');if(item){selected=item.dataset.labItem;render();}else if(cell)move(Number(cell.dataset.cell));};
  $('bag-lab-grid').onpointerdown=e=>{const item=e.target.closest('[data-lab-item]');if(!item)return;selected=item.dataset.labItem;drag={x:e.clientX,y:e.clientY};};
  $('bag-lab-grid').onpointerup=e=>{if(!drag)return;const moved=Math.hypot(e.clientX-drag.x,e.clientY-drag.y)>6;drag=null;if(!moved)return;const r=$('bag-lab-grid').getBoundingClientRect();if(e.clientX<r.left||e.clientX>=r.right||e.clientY<r.top||e.clientY>=r.bottom)return;move(Math.floor((e.clientY-r.top)/r.height*5)*6+Math.floor((e.clientX-r.left)/r.width*6));};
  $('bag-lab-rotate').onclick=()=>{if(!selected)return;const i=p.items.find(i=>i.id===selected),candidate={...i,rotated:!i.rotated};if(!fits(p,candidate)){toast('旋转后会重叠，请先移动到空处');return;}Object.assign(i,candidate);render();};
  $('bag-lab-bind').onchange=e=>{p.items.find(i=>i.id===selected).target=Number(e.target.value);render();};
  $('bag-lab-reset').onclick=reset;
  return {reset};
}
