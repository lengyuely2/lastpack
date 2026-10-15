export const BOSS_NAMES=['墓园钟主','铁棺暴君','红月审判官'];
export function difficulty(seconds,crew=1){const minute=Math.max(0,seconds/60);return {rank:Math.min(3,1+Math.floor(minute/4)),health:1+minute*.075,damage:1+Math.min(1,minute*.045),interval:Math.max(.28,.9-minute*.025)/Math.sqrt(crew),cap:Math.min(220,100+crew*25),runner:minute>=2,brute:minute>=4,caster:minute>=6};}
export function pointSegment(x,y,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);}
export function dangerDistance(p,h){return h.shape==='line'?pointSegment(p.x,p.y,h,{x:h.tx,y:h.ty}):Math.abs(Math.hypot(p.x-h.x,p.y-h.y)-(h.shape==='ring'?h.radius:0));}
export function spawnTimedBoss(room,effect){
  const n=++room.bossCount,crew=Math.max(1,room.players.filter(p=>p.connected).length),hp=(room.campaign?5200+(n-1)*2600:1500+(n-1)*600)*crew;
  const boss={id:`z${++room.serial}`,kind:'boss',name:BOSS_NAMES[(n-1)%3],variant:(n-1)%3,encounter:n,level:n,rank:4,x:480,y:120,hp,maxHp:hp,speed:room.campaign?25:20,damage:room.campaign?28:22,radius:35,slow:0,burn:0,burnDps:0,attack:0,angle:0,stage:1,skillTimer:room.campaign?1.6:2};
  room.enemies.push(boss);room.total++;room.spawned++;room.nextBossAt+=300;
  effect(room,{type:'bossArrival',x:boss.x,y:boss.y,life:3,value:boss.name,color:'#ef94bd'});room.log.unshift(`${boss.name}降临 · 第 ${n} 次首领战`);room.log=room.log.slice(0,6);return boss;
}
export function tickSurvival(room,dt,{effect,stats,hurt}){
  room.survivalTime+=dt;room.hazards??=[];room.hostileShots??=[];
  if(room.survivalTime+1e-8>=room.nextBossAt&&(!room.campaign||room.endless||room.bossCount<3))spawnTimedBoss(room,effect);
  const living=room.players.filter(p=>p.hp>0),nearest=e=>living.reduce((a,p)=>!a||Math.hypot(p.x-e.x,p.y-e.y)<Math.hypot(a.x-e.x,a.y-e.y)?p:a,null);
  const add=h=>{if(room.hazards.length<32)room.hazards.push({id:++room.serial,remaining:1.2,duration:1.2,color:'#ed906d',...h});};
  const damage=(p,amount,cause)=>{if(hurt){hurt(room,p,amount,undefined,cause);return;}p.hp=Math.max(0,p.hp-amount*(1-stats(p).damageReduction));effect(room,{type:'hurt',x:p.x,y:p.y,life:.4,color:'#ed7969'});};
  // Resolve server-owned telegraphs, not browser animation frames.
  const keep=[];
  for(const h of room.hazards){h.remaining-=dt;if(h.remaining>0){keep.push(h);continue;}if(!room.enemies.some(e=>e.id===h.owner&&e.hp>0))continue;
    if(h.pellets){for(let n=0;n<h.pellets&&room.hostileShots.length<96;n++){const a=h.aim!==undefined?h.aim+(n-(h.pellets-1)/2)*(h.spread||0):(h.rotation||0)+n*Math.PI*2/h.pellets;room.hostileShots.push({id:++room.serial,x:h.x,y:h.y,vx:Math.cos(a)*h.speed,vy:Math.sin(a)*h.speed,life:6,damage:h.damage,color:h.color});}effect(room,{type:'bossCast',x:h.x,y:h.y,life:.4,color:h.color});continue;}
    for(const p of living){const d=dangerDistance(p,h),inside=h.shape==='ring'?d<22:d<(h.shape==='line'?h.radius:h.radius+10);if(p.hp>0&&inside)damage(p,h.damage,h.rush?'怪物冲锋':h.shape==='ring'?'震荡环':'范围攻击');}
    effect(room,{type:'enemyBlast',x:h.x,y:h.y,tx:h.tx,ty:h.ty,radius:h.radius,shape:h.shape,life:.45,color:h.color});
    if(h.rush){const e=room.enemies.find(e=>e.id===h.owner);if(e){e.x=h.tx;e.y=h.ty;}}
  }room.hazards=keep;
  room.hostileShots=room.hostileShots.filter(s=>{s.life-=dt;const from={x:s.x,y:s.y};s.x+=s.vx*dt;s.y+=s.vy*dt;if(s.life<=0||s.x<0||s.x>960||s.y<0||s.y>620)return false;const p=living.find(p=>p.hp>0&&pointSegment(p.x,p.y,from,s)<16);if(p){damage(p,s.damage,'敌方弹丸');return false;}return true;});
  for(const e of room.enemies){if(e.hp<=0)continue;const p=nearest(e);if(!p)continue;
    if(e.kind==='boss'){
      const stage=e.hp/e.maxHp<.3?3:e.hp/e.maxHp<.65?2:1;
      if(stage>e.stage){e.stage=stage;e.skillTimer=.6;effect(room,{type:'bossStage',x:e.x,y:e.y,life:2,value:stage===3?'狂暴 · 红月审判':'觉醒 · 尸潮召唤',color:'#ef94bd'});for(let n=0;n<Math.min(4,room.bossCount+1);n++)if(room.enemies.length<180){room.spawned++;room.total++;room.enemies.push({id:`z${++room.serial}`,kind:'walker',rank:2,level:2,x:Math.max(25,Math.min(935,e.x+Math.cos(n*2)*80)),y:Math.max(25,Math.min(595,e.y+Math.sin(n*2)*80)),hp:65,maxHp:65,speed:27,damage:8,radius:13,slow:0,burn:0,attack:0,angle:0});}}
      e.skillTimer-=dt;if(e.skillTimer>0)continue;e.skillTimer=room.campaign?(stage===3?2.5:stage===2?3.6:4.8):(stage===3?3.2:stage===2?4.5:6);
      const attack=e.casts||0;e.casts=attack+1;
      if(room.campaign){
        const duration=stage===3?1.2:1.5,scale=1+(e.encounter-1)*.12;
        if(stage>=2&&attack%3===2)add({owner:e.id,x:e.x,y:e.y,tx:p.x,ty:p.y,shape:'line',radius:18,damage:22*scale,remaining:1.8,duration:1.8,color:'#ff766f'});
        if(e.variant===0){
          // Clock master: staggered strikes catch stale movement without blanketing the arena.
          for(let i=0;i<stage+1;i++){const a=i*Math.PI*2/(stage+1)+attack*.8;add({owner:e.id,x:Math.max(65,Math.min(895,p.x+(i?Math.cos(a)*85:0))),y:Math.max(65,Math.min(555,p.y+(i?Math.sin(a)*85:0))),radius:stage===3?76:66,shape:'circle',damage:(22+stage*4)*scale,remaining:duration+i*.22,duration:duration+i*.22,color:'#d99eea'});}
          if(stage>=2)add({owner:e.id,x:e.x,y:e.y,shape:'burst',radius:36,damage:13*scale,pellets:8+stage*2,speed:110,rotation:attack*.35,remaining:1.25,duration:1.25,color:'#d797eb'});
        }else if(e.variant===1){
          // Coffin tyrant: a telegraphed charge, followed by a delayed shock ring.
          const aim=Math.atan2(p.y-e.y,p.x-e.x),length=Math.min(330,Math.hypot(p.x-e.x,p.y-e.y)+70),tx=Math.max(50,Math.min(910,e.x+Math.cos(aim)*length)),ty=Math.max(50,Math.min(570,e.y+Math.sin(aim)*length));
          add({owner:e.id,x:e.x,y:e.y,tx,ty,shape:'line',radius:26+stage*4,damage:(25+stage*4)*scale,rush:true,remaining:duration,duration,color:'#eeab68'});e.windup=duration;
          add({owner:e.id,x:tx,y:ty,radius:110+stage*20,shape:'ring',damage:25*scale,remaining:duration+1.2,duration:duration+1.2,color:'#f3ae70'});
        }else{
          // Red moon judge: a rotating radial burst and a separate aimed fan.
          add({owner:e.id,x:e.x,y:e.y,shape:'burst',radius:42,damage:(12+stage*2)*scale,pellets:10+stage*2,speed:100+stage*12,rotation:attack*.28,remaining:1.15,duration:1.15,color:'#f28f9a'});
          add({owner:e.id,x:e.x,y:e.y,shape:'burst',radius:30,damage:18*scale,pellets:stage+1,aim:Math.atan2(p.y-e.y,p.x-e.x),spread:.22,speed:135,remaining:1.9,duration:1.9,color:'#f6c58c'});
          if(stage===3)add({owner:e.id,x:p.x,y:p.y,radius:70,shape:'circle',damage:30*scale,remaining:1.6,duration:1.6,color:'#e493b1'});
        }
        continue;
      }
      if((attack+e.variant)%3===0){for(let i=0;i<stage+1;i++){const angle=i*Math.PI*2/(stage+1);add({owner:e.id,x:Math.max(50,Math.min(910,p.x+Math.cos(angle)*i*38)),y:Math.max(50,Math.min(570,p.y+Math.sin(angle)*i*38)),radius:58,shape:'circle',damage:18+stage*3,remaining:1.6,duration:1.6,color:'#d99eea'});}}
      else if((attack+e.variant)%3===1){add({owner:e.id,x:e.x,y:e.y,radius:110+stage*20,shape:'ring',damage:20+stage*3,remaining:1.8,duration:1.8,color:'#eeab68'});}
      else if(room.hostileShots.length<80){add({owner:e.id,x:e.x,y:e.y,shape:'burst',radius:36,damage:10+stage*2,pellets:6+stage*2,speed:80,remaining:1,duration:1,color:'#d797eb'});}
    }else if(['runner','brute','caster'].includes(e.kind)){
      e.skillTimer=(e.skillTimer??(e.kind==='runner'?4:5))-dt;if(e.skillTimer>0)continue;e.skillTimer=e.kind==='caster'?4:7;const d=Math.hypot(p.x-e.x,p.y-e.y);
      if(e.kind==='runner'&&d<250){const a=Math.atan2(p.y-e.y,p.x-e.x);add({owner:e.id,x:e.x,y:e.y,tx:Math.max(30,Math.min(930,e.x+Math.cos(a)*160)),ty:Math.max(30,Math.min(590,e.y+Math.sin(a)*160)),shape:'line',radius:20,damage:12,rush:true,remaining:.9,duration:.9});e.windup=.9;}
      if(e.kind==='brute'&&d<150){add({owner:e.id,x:e.x,y:e.y,shape:'circle',radius:82,damage:22,remaining:1.3,duration:1.3});e.windup=1.3;}
      if(e.kind==='caster'&&room.hostileShots.length<90){const a=Math.atan2(p.y-e.y,p.x-e.x);add({owner:e.id,x:e.x,y:e.y,shape:'burst',radius:20,damage:e.elite?18:12,pellets:1,aim:a,speed:e.elite?140:95,remaining:.8,duration:.8,color:'#9ac9df'});e.windup=.8;}
    }
  }
}
