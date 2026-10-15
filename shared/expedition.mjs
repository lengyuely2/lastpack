export const MAPS={
 cemetery:{name:'暮色墓园',text:'开放地形，熟悉尸潮节奏。',color:'#293b35',walls:[],zones:[]},
 laboratory:{name:'失控实验室',text:'酸池每 14 秒启动：2 秒预警，随后持续 3 秒。走出酸池可避开伤害。',color:'#26343d',walls:[],zones:[{x:240,y:220,radius:65},{x:720,y:410,radius:65}]},
 ruins:{name:'废城走廊',text:'实体断墙阻挡通行，绕过墙角组织火力；中间通道保持畅通。',color:'#3a3431',walls:[{x:290,y:170,w:24,h:180},{x:646,y:300,w:24,h:160}],zones:[]}
};
export const FACTIONS={
 blood:{name:'夜宵医务室',color:'#f1a2bc',items:['bloodbag','bandage','soup','tomato','mushroom','weirdfood','lemonade','tentacle','medkit','brokenmouth'],stages:['治疗 +10%','每秒再生 +0.75','血色回响：累计实际治疗 20 HP，释放范围冲击；冷却 4 秒']},
 blast:{name:'违章烟花社',color:'#ffbd83',items:['cherrybomb','powder','blastheart','incendiary','magazine','battery','boxingglove'],stages:['爆炸范围 +10%','溅射伤害 +15%','爆炸谢幕：爆炸击杀引发至多 3 次连爆；冷却 2 秒']},
 shadow:{name:'跑路俱乐部',color:'#a5e3d8',items:['ghostshoe','umbrella','rabbitfoot','boots','uglytooth','snail','charm'],stages:['闪避 +3%','移动 +4%','幻影反击：成功闪避攻击附近至多 5 个敌人；冷却 1.5 秒']},
 arcane:{name:'补考魔法学院',color:'#c6b1ff',items:['spellbook','rune','manabottle','ritual','scope','charm','snake'],stages:['施法速度 +6%','法术范围 +15%，状态时间 +10%','魔力超载：每 20 秒爆发 4 秒，法术伤害 +40%、施法速度 +30%']}
};
export const WEAPON_COMBOS=[
 {id:'ice',name:'碎冰礼花',text:'一种武器先减速，另一种爆炸武器命中：额外范围碎冰；每目标冷却 1.5 秒。'},
 {id:'storm',name:'蒸汽超载',text:'一种武器先灼烧，另一种电击/连锁武器命中：追加雷电，最多 3 个目标；冷却 2 秒。'},
 {id:'breach',name:'破甲追击',text:'一种武器先击退，另一种贯穿武器命中：目标易伤 3 秒，受到直接攻击 +12%。'}
];
export const ENDLESS_MODS={swift:{name:'疾行尸潮',text:'新普通敌人速度提高 15%；最多叠加至 +45%。'},armored:{name:'硬壳军团',text:'新普通敌人获得 10% 护甲；最多 30%。'},volatile:{name:'不安的尸体',text:'普通敌人死亡后留下预警爆炸，1 秒后爆炸。'}};
const time=r=>r.survival?r.survivalTime:r.time;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const electric=w=>w.chain||w.visual==='electric'||w.kind==='taser';
export function factionProgress(p,api){
 const valid=p.items.filter(i=>i.x!==null&&(!api.isWeaponItem(i.kind)||p.weapons[i.target])&&(!['spellbook','rune'].includes(i.kind)||api.weaponDefinition(p.weapons[i.target])?.arcane));
 return Object.entries(FACTIONS).map(([id,d])=>{const kinds=[...new Set(valid.filter(i=>d.items.includes(i.kind)).map(i=>i.kind))],count=kinds.length,stage=count>=6?3:count>=4?2:count>=2?1:0;return {id,name:d.name,color:d.color,count,stage,next:stage===3?null:[2,4,6][stage],ultimate:stage===3,kinds,missing:d.items.filter(k=>!kinds.includes(k)),text:stage?d.stages[stage-1]:'集齐 2 种开始联动'};});
}
export function applyFactions(p,s,api){
 s.factions=factionProgress(p,api);const level=id=>s.factions.find(f=>f.id===id).stage;
 if(level('blood'))s.healMultiplier+=.1;if(level('blood')>=2)s.regen+=.75;
 if(level('blast'))s.blastArea+=.1;if(level('blast')>=2)s.blastPower+=.15;
 if(level('shadow'))s.dodge+=.03;if(level('shadow')>=2)s.move*=1.04;
 if(level('arcane'))s.magicSpeed+=.06;
 for(const w of s.weapons.filter(Boolean)){if(w.arcane&&level('arcane')>=2){w.magicArea=(w.magicArea||0)+.15;w.statusDuration+=.1;}if(w.arcane&&level('arcane')===3&&p.overloadRemaining>0){w.damage*=1.4;w.burn*=1.4;w.interval/=1.3;}}
}
export function pulse(room,p,origin,kind,damage,radius,limit,api){
 api.effect(room,{type:'factionBurst',x:origin.x,y:origin.y,radius,color:kind==='bloodPulse'?'#f1a2bc':kind==='shadowCounter'?'#a5e3d8':'#ffbd83',life:.65,value:kind==='bloodPulse'?'血色回响':kind==='shadowCounter'?'幻影反击':'爆炸谢幕'});
 p.factionProcs??={};p.factionProcs[kind]=(p.factionProcs[kind]||0)+1;
 const victims=room.enemies.filter(e=>e.hp>0&&distance(e,origin)<=radius).sort((a,b)=>distance(a,origin)-distance(b,origin)).slice(0,limit),killed=[];
 for(const e of victims){api.hit(room,p,e,damage,{kind,color:'#e6b3cf',burn:0,proc:true});if(e.hp<=0)killed.push(e);}return killed;
}
export function onFactionKill(room,p,e,w,api){
 if(!p||w?.proc||!w?.splash||!api.stats(p).factions.find(f=>f.id==='blast').ultimate)return;
 if(time(room)<(p.blastReadyAt||0))return;p.blastReadyAt=time(room)+2;
 const queue=[e];for(let n=0;n<3&&queue.length;n++){const origin=queue.shift();queue.push(...pulse(room,p,origin,'blastChain',16+p.level*1.6,90,8,api));}
}
export function onFactionDodge(room,p,api){if(!api.stats(p).factions.find(f=>f.id==='shadow').ultimate||time(room)<(p.shadowReadyAt||0))return;p.shadowReadyAt=time(room)+1.5;pulse(room,p,p,'shadowCounter',20+p.level*1.5,160,5,api);}
export function tickFactions(room,p,dt,api){
 const fs=api.stats(p).factions;p.factionAwakened??=[];
 for(const f of fs)if(f.ultimate&&!p.factionAwakened.includes(f.id)){p.factionAwakened.push(f.id);api.effect(room,{type:'factionAwake',x:p.x,y:p.y,life:2,value:f.name+' · 最终效果',color:f.color});}
 if(fs.find(f=>f.id==='blood').ultimate&&(p.healCharge||0)>=20&&time(room)>=(p.bloodReadyAt||0)){p.healCharge-=20;p.bloodReadyAt=time(room)+4;pulse(room,p,p,'bloodPulse',24+p.level*2,180,10,api);}
 p.overloadRemaining=Math.max(0,(p.overloadRemaining||0)-dt);
 if(fs.find(f=>f.id==='arcane').ultimate){p.overloadClock=(p.overloadClock||0)+dt;if(p.overloadClock>=20){p.overloadClock-=20;p.overloadRemaining=4;p.factionProcs.magicOverload=(p.factionProcs.magicOverload||0)+1;api.effect(room,{type:'factionAwake',x:p.x,y:p.y,life:1.5,value:'魔力超载 · 4秒',color:'#c6b1ff'});}}
 else{p.overloadClock=0;p.overloadRemaining=0;}
 if(p.relic==='bell'){p.relicClock=(p.relicClock||0)+dt;if(p.relicClock>=60){p.relicClock-=60;for(const ally of room.players.filter(a=>a.hp>0&&a.connected))api.heal(room,ally,5,'#d5eca5');}}
}
export function weaponCombo(room,p,e,w,damage,api){
 if(w.proc)return;e.primers??={};e.comboLocks??={};const now=time(room),old=e.primers,valid=k=>old[k]&&old[k].kind!==w.kind&&now-old[k].at<=4;
 let id=null;if(w.splash&&valid('frost'))id='ice';else if(electric(w)&&valid('fire'))id='storm';else if(w.pierce&&valid('push'))id='breach';
 if(id&&now>=(e.comboLocks[id]||0)){e.comboLocks[id]=now+(id==='ice'?1.5:2);p.comboTriggers=(p.comboTriggers||0)+1;api.effect(room,{type:'weaponCombo',x:e.x,y:e.y,life:.8,radius:id==='ice'?75:100,color:id==='ice'?'#a5eff4':'#ddbbff',value:WEAPON_COMBOS.find(c=>c.id===id).name});
  if(id==='breach')e.weakenUntil=now+3;
  else for(const v of room.enemies.filter(v=>v.hp>0&&distance(v,e)<(id==='ice'?75:180)).slice(0,id==='ice'?5:3))api.hit(room,p,v,damage*(id==='ice'?.35:.25),{kind:'combo_'+id,color:'#a5eff4',burn:0,proc:true});
 }
 if(w.slow||w.slowRadius)old.frost={kind:w.kind,owner:p.id,at:now};if(w.burn)old.fire={kind:w.kind,owner:p.id,at:now};if(w.knockback)old.push={kind:w.kind,owner:p.id,at:now};
}
export function possibleCombos(room,api){const weapons=room.players.filter(p=>p.connected&&!p.retired).flatMap(p=>api.stats(p).weapons.filter(Boolean));return WEAPON_COMBOS.filter(c=>weapons.some(a=>weapons.some(b=>a.kind!==b.kind&&(c.id==='ice'?(a.slow||a.slowRadius)&&b.splash:c.id==='storm'?a.burn&&electric(b):a.knockback&&b.pierce))));}
export function moveOnMap(room,actor,x,y,radius=13){
 const walls=MAPS[room.map||'cemetery'].walls,blocked=(x,y)=>walls.some(w=>x+radius>w.x&&x-radius<w.x+w.w&&y+radius>w.y&&y-radius<w.y+w.h);
 const from={x:actor.x,y:actor.y};if(!blocked(x,from.y))actor.x=x;if(!blocked(actor.x,y))actor.y=y;
 // A summon or rush may begin inside a wall: move it to the nearest edge.
 for(const w of walls)if(blocked(actor.x,actor.y)&&actor.x>w.x-radius&&actor.x<w.x+w.w+radius&&actor.y>w.y-radius&&actor.y<w.y+w.h+radius){const edges=[{d:Math.abs(actor.x-w.x+radius),x:w.x-radius,y:actor.y},{d:Math.abs(actor.x-w.x-w.w-radius),x:w.x+w.w+radius,y:actor.y},{d:Math.abs(actor.y-w.y+radius),x:actor.x,y:w.y-radius},{d:Math.abs(actor.y-w.y-w.h-radius),x:actor.x,y:w.y+w.h+radius}].sort((a,b)=>a.d-b.d);Object.assign(actor,{x:edges[0].x,y:edges[0].y});}
}
export function augmentEnemy(room,e){if(!room.endless||e.kind==='boss')return;const mods=room.endlessMods||[];e.speed*=1+Math.min(.45,mods.filter(m=>m==='swift').length*.15);e.armor=Math.min(.3,mods.filter(m=>m==='armored').length*.1);e.volatile=mods.includes('volatile');}
export function tickExpedition(room,dt,api){
 if(!room.campaign)return;const now=time(room);room.events??=[];room.nextEventAt??=240;
 if(now>=room.nextEventAt&&!room.events.length&&!room.finalBossDefeated){const n=room.eventCount=(room.eventCount||0)+1;room.nextEventAt+=240;const kind=['curse','merchant','cache'][(n-1)%3];room.events.push({id:'event'+n,kind,x:480+(n%2?160:-160),y:310,expires:now+75});}
 room.events=room.events.filter(e=>e.expires>=now);
 for(const event of room.events){const p=room.players.find(p=>p.connected&&p.hp>0&&distance(p,event)<30);if(p){room.eventChoice={...event,owner:p.id};room.phase='event';room.events=[];return;}}
 if(room.challenge&&now>=room.challenge.ends){room.challenge=null;api.reward(room,'事件挑战');api.effect(room,{type:'eventWin',x:480,y:310,life:2,value:'诅咒挑战完成 · 额外奖励',color:'#efcd85'});}
 const phase=now%14;room.mapZones=MAPS[room.map||'cemetery'].zones.map(z=>({...z,warning:phase<2,active:phase>=2&&phase<5}));
 room.mapDamageClock=(room.mapDamageClock||0)+dt;if(room.mapDamageClock>=1){room.mapDamageClock-=1;for(const p of room.players.filter(p=>p.hp>0))if(room.mapZones.some(z=>z.active&&distance(p,z)<z.radius))api.hurt(room,p,8,undefined,'腐蚀酸池');}
 room.deathTraps=(room.deathTraps||[]).filter(t=>{t.remaining-=dt;if(t.remaining>0)return true;for(const p of room.players.filter(p=>p.hp>0&&distance(p,t)<t.radius))api.hurt(room,p,10,undefined,'怪物遗留陷阱');api.effect(room,{type:'enemyBlast',...t,life:.4,color:'#f39485'});return false;});
 if(room.endless&&now>=(room.nextEndlessChoiceAt||1500)&&room.phase==='battle'){room.nextEndlessChoiceAt=(room.nextEndlessChoiceAt||1500)+300;room.eventChoice={id:'endless'+room.nextEndlessChoiceAt,kind:'endless',owner:room.players.find(p=>p.connected&&p.hp>0)?.id};room.phase='event';}
}
export function chooseEvent(room,p,msg,api){
 const e=room.eventChoice;if(room.phase!=='event'||!e||msg.id!==e.id)throw Error('事件已结束');const owner=room.players.find(a=>a.id===e.owner);if(owner?.connected&&owner.hp>0&&p.id!==owner.id)throw Error('由接近事件的玩家选择');
 if(!p.connected||p.hp<=0)throw Error('倒地时不能选择事件');
 if(e.kind==='endless'){if(msg.choice==='retreat'){room.phase='victory';room.settledPhase=null;room.eventChoice=null;room.events=[];return;}if(!Object.hasOwn(ENDLESS_MODS,msg.choice))throw Error('无尽词缀无效');room.endlessMods??=[];room.endlessMods.push(msg.choice);room.endlessLevel=(room.endlessLevel||0)+1;}
 else if(msg.choice==='accept'){
  if(e.kind==='curse'){room.challenge={ends:time(room)+60};}
  else if(e.kind==='merchant'){if((p.eventTokens||0)<2)throw Error('事件代币不足，击杀每 20 只获得 1 枚');p.eventTokens-=2;p.rewardRerolls=Math.min(6,p.rewardRerolls+1);api.heal(room,p,25,'#dfd49b');}
  else if(e.kind==='cache'){if(p.hp<=p.maxHp*.15)throw Error('生命不足，无法承受宝箱代价');p.hp-=p.maxHp*.15;api.reward(room,'冒险宝箱');}
 }else if(msg.choice!=='decline')throw Error('事件选择无效');
 room.eventChoice=null;room.phase='battle';api.pause(room);
}
