export const CAMPAIGN_DURATION=1200;
export function warnElite(room,effect){const at=room.nextEliteAt??180;if(room.survivalTime>=at-5&&room.survivalTime<at&&room.eliteWarnedAt!==at){room.eliteWarnedAt=at;effect(room,{type:'eliteWarning',x:480,y:120,life:5,value:'精英将至 · 击败后掉落聚能补给',color:'#efc086'});}}
export function campaignPacing(seconds){
  const minute=Math.max(0,seconds/60),cycle=seconds%90;
  const harvest=seconds>=180&&cycle>=80;const surge=seconds>=75&&cycle>=65,breather=seconds>=90&&cycle<10;
  return {surge,breather,harvest,label:harvest?"收割尸潮 · 低血量密集敌人":breather?'喘息 · 收集战利品':surge?'尸潮爆发':'清扫墓园',health:(1+minute*.055)*(harvest?.65:1),interval:(harvest?.32:surge?.44:.76)-Math.min(.36,minute*.018),damage:1+Math.min(.8,minute*.035),cap:160};
}
export function campaignMilestone(room){return room.endless?'无尽生存':room.finalBossDefeated?'领取最终宝箱后撤离':room.survivalTime>=1200?'最终首领 · 红月审判':room.survivalTime>=900?'最后五分钟 · 构筑成型':room.survivalTime>=600?'首领来袭 · 火力检验':room.survivalTime>=360?'远程威胁 · 留意预警':room.survivalTime>=240?'重装尸卫 · 准备控制':room.survivalTime>=120?'疾行骷髅 · 留出退路':'积累经验 · 找到第二把武器';}
export function spawnElite(room,effect){
  const n=room.eliteCount=(room.eliteCount||0)+1,crew=Math.max(1,room.players.filter(p=>p.connected).length),kind=['runner','brute','caster'][(n-1)%3],minute=room.survivalTime/60;
  for(let i=0;i<crew;i++){const p=room.players.filter(p=>p.hp>0)[i%room.players.filter(p=>p.hp>0).length];if(!p)continue;const a=(n*1.7+i*2.4),hp=(kind==='brute'?240:kind==='caster'?150:120)*(1+minute*.065);const e={id:`z${++room.serial}`,kind,elite:true,encounterElite:true,name:{runner:'夺命外卖员',brute:'违章拆墙队长',caster:'欠费雷电法师'}[kind],rank:3,level:Math.floor(minute),x:Math.max(30,Math.min(930,p.x+Math.cos(a)*270)),y:Math.max(30,Math.min(590,p.y+Math.sin(a)*270)),hp,maxHp:hp,speed:kind==='runner'?76:kind==='caster'?32:28,damage:kind==='brute'?22:14,radius:kind==='brute'?20:12,slow:0,burn:0,attack:0,angle:0,skillTimer:2,windup:1.2};room.enemies.push(e);room.spawned++;room.total++;effect(room,{type:'eliteArrival',x:e.x,y:e.y,life:2.4,value:e.name,color:'#efad79'});}
  room.nextEliteAt+=120;
}
