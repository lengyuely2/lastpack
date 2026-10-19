import {MAPS} from './expedition.mjs';
import {dangerDistance} from './survival.mjs';
export const AUTO_STRATEGIES=['balanced','aggressive','conservative'];
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function weaponPositioning(s){
  const weapons=s.weapons.filter(Boolean);if(!weapons.length)return {range:100,style:'游走'};
  // Weight the equipped firepower, so a weak short-range sidearm does not pull a sniper into contact.
  const weight=w=>Math.max(1,w.damage/(w.interval+(w.reload||0)/Math.max(1,w.clip||1)));
  const scatter=w=>w.cone||w.kind==='shotgun'||w.visual==='pellets';
  const total=weapons.reduce((n,w)=>n+weight(w),0);
  const range=weapons.reduce((n,w)=>n+w.range*(w.melee?.82:scatter(w)?.48:w.splash?.88:w.slow?.8:w.arcane?.82:.72)*weight(w),0)/total;
  const main=weapons.reduce((a,b)=>weight(a)>=weight(b)?a:b);
  return {range:Math.max(35,range),style:main.melee?'近身切入':scatter(main)?'贴近散射':main.splash?'拉距轰炸':main.slow?'控场绕行':main.arcane?'法术游走':'远程游走',melee:weapons.every(w=>w.melee)};
}
export function hazardClearance(point,h){return dangerDistance(point,h)-(h.shape==='ring'?22:h.radius+10);}
function escapeDirection(room,p,s,nearby){
  const hazards=[...(room.hazards||[]),...(room.mapZones||[]).filter(z=>z.warning||z.active).map(z=>({...z,shape:'circle',remaining:1})),...(room.deathTraps||[]).map(z=>({...z,shape:'circle'}))].filter(h=>hazardClearance(p,h)<45),shots=(room.hostileShots||[]).filter(b=>distance(p,b)<75);
  if(!hazards.length&&!shots.length)return null;
  let best=null;
  for(let n=0;n<16;n++){
    const angle=n*Math.PI/8,x=Math.cos(angle),y=Math.sin(angle);
    const project=t=>({x:Math.max(45,Math.min(915,p.x+x*s.move*t)),y:Math.max(45,Math.min(575,p.y+y*s.move*t))});
    let score=Infinity;
    for(const h of hazards){const horizon=Math.min(1.4,Math.max(.25,h.remaining??1)),point=project(horizon);score=Math.min(score,hazardClearance(point,h));}
    for(const b of shots){const point=project(.45),projected={x:b.x+b.vx*.45,y:b.y+b.vy*.45};score=Math.min(score,distance(point,projected)-20);}
    const future={x:p.x+x*s.move,y:p.y+y*s.move};
    for(const enemy of nearby)score=Math.min(score,distance(future,enemy)-(enemy.radius||10)-20);
    if(future.x<45||future.x>915||future.y<45||future.y>575)score-=150;
    if(!best||score>best.score)best={x,y,score};
  }
  return best;
}
export function automaticDirection(room,p,s,nearby,nearest,living){
  const strategy=p.autoStrategy||'balanced',conservative=strategy==='conservative',aggressive=strategy==='aggressive';
  p.guardAnchor??={x:p.x,y:p.y};
  let vx=0,vy=0;
  const toward=(point,weight)=>{const d=distance(p,point);if(d>8){vx+=(point.x-p.x)/Math.max(1,d)*weight;vy+=(point.y-p.y)/Math.max(1,d)*weight;}};
  // Search escape routes rather than summing forces that cancel between overlapping telegraphs.
  const escape=escapeDirection(room,p,s,nearby);if(escape)return escape;
  const close=nearest?distance(p,nearest):Infinity;
  if(nearest){
    const posture=weaponPositioning(s),angle=Math.atan2(nearest.y-p.y,nearest.x-p.x),desired=posture.range*(conservative?1.12:1);
    const direction=close<desired?-1:!conservative&&close>desired+12?1:0;
    vx=Math.cos(angle)*direction;vy=Math.sin(angle)*direction;
    if(close<desired+25){vx+=-Math.sin(angle)*.35;vy+=Math.cos(angle)*.35;}
    for(const e of nearby){const d=distance(p,e),radius=posture.melee&&nearby.length<3?Math.max(25,(e.radius||10)+18):80;if(d<radius){vx+=(p.x-e.x)/Math.max(1,d)*2.2;vy+=(p.y-e.y)/Math.max(1,d)*2.2;}}
  }
  const safe=point=>!nearby.some(e=>distance(e,point)<(e.radius||10)+45)&&!(room.hazards||[]).some(h=>hazardClearance(point,h)<15);
  let destination=null;
  if(close>(aggressive?85:conservative?155:120)){
    const allowed=point=>safe(point)&&(!conservative||distance(point,p.guardAnchor)<=140);
    const closest=list=>list?.filter(allowed).reduce((best,a)=>!best||distance(p,a)<distance(p,best)?a:best,null);
    destination=closest((room.supplies||[]).filter(f=>f.vacuum||p.hp<p.maxHp*.7));
    destination??=closest(room.chests);
    destination??=closest(room.events);
    destination??=closest(room.gems);
    if(destination)toward(destination,aggressive?5:conservative?1.6:2.5);
  }
  if(conservative&&!destination&&close>155){
    // Hold the chosen ground; do not keep orbiting a distant enemy or drift across the map.
    vx=0;vy=0;toward(p.guardAnchor,Math.min(1,distance(p,p.guardAnchor)/50));
  }else if(!destination&&!nearest)toward({x:480,y:310},.7);
  if(!conservative){vx+=(480-p.x)/850;vy+=(310-p.y)/650;}
  for(const ally of living){if(ally===p)continue;const d=distance(p,ally);if(d<45){vx+=(p.x-ally.x)/Math.max(1,d);vy+=(p.y-ally.y)/Math.max(1,d);}}
  // When a wall blocks the desired direction, steer toward its nearer end.
  const norm=Math.max(1,Math.hypot(vx,vy)),next={x:p.x+vx/norm*s.move*.4,y:p.y+vy/norm*s.move*.4};
  for(const wall of MAPS[room.map||'cemetery'].walls)if(next.x+13>wall.x&&next.x-13<wall.x+wall.w&&next.y+13>wall.y&&next.y-13<wall.y+wall.h){const top=wall.y-22,bottom=wall.y+wall.h+22;vx=0;vy=(Math.abs(p.y-top)<Math.abs(p.y-bottom)?top:bottom)-p.y;break;}
  return {x:vx,y:vy};
}
