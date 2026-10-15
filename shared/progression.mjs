import {migrateCollection,awardAchievements,discover} from './achievements.mjs';
// Shared definitions; balances and purchases are validated by the server.
export const CHARACTERS={
  scout:{name:'夜班保安',icon:'survivor',text:'均衡起步，无额外代价。',unlock:'初始可用',bonus:{}},
  gunner:{name:'暴躁临时工',icon:'rifle',text:'伤害 +12%，最大生命 -10。',unlock:'累计击殺 300 只怪物',bonus:{damage:.12,health:-10}},
  courier:{name:'墓园快递员',icon:'magnet',text:'移动 +10%，吸附 +25；伤害 -8%。',unlock:'一局坚持 5 分钟',bonus:{move:.10,pickup:25,damage:-.08}},
  medic:{name:'过期急救员',icon:'medkit',text:'每秒回复 0.25 生命，治疗 +15%；射速 -8%。',unlock:'击败一名首领',bonus:{regen:.25,healing:.15,speed:-.08}}
};
export const TRAINING={
  health:{name:'加厚工作服',icon:'armor',max:5,base:25,text:'每级最大生命 +4，最多 +20',bonus:{health:4}},
  damage:{name:'弹头再教育',icon:'pistol',max:5,base:30,text:'每级伤害 +3%，最多 +15%',bonus:{damage:.03}},
  speed:{name:'扳机手指操',icon:'trigger',max:5,base:35,text:'每级射速 +2%，最多 +10%',bonus:{speed:.02}},
  pickup:{name:'磁铁职业证',icon:'magnet',max:5,base:20,text:'每级吸附范围 +5，最多 +25',bonus:{pickup:5}},
  recovery:{name:'没过期的药',icon:'medkit',max:5,base:30,text:'每级每秒回复 +0.04，最多 +0.2',bonus:{regen:.04}},
  experience:{name:'实习生速成班',icon:'propellerhat',max:5,base:40,text:'每级经验 +2%，最多 +10%',bonus:{xp:.02}},
  armor:{name:'铁皮饭盒护体',icon:'armor',max:5,base:35,text:'每级受到伤害 -2%，最多 -10%；与背包减伤合计上限 60%',bonus:{armor:.02}},
  movement:{name:'跑路带薪假',icon:'boots',max:5,base:30,text:'每级基础移速 +2%，最多 +10%',bonus:{move:.02}},
  area:{name:'邻居也遭殃',icon:'rocket',max:5,base:45,text:'每级爆炸、减速圈和近战攻击范围 +3%，最多 +15%',bonus:{area:.03}},
  duration:{name:'加班不打卡',icon:'hourglass',max:5,base:35,text:'每级灼烧与减速持续时间 +4%，最多 +20%',bonus:{duration:.04}},
  luck:{name:'祖坟冒彩烟',icon:'clover',max:5,base:45,text:'每级更容易获得高品质升级奖励；最高 5 级，不保证稀有奖励',bonus:{luck:.02}},
  greed:{name:'工资自动加倍机',icon:'piggybank',max:5,base:40,text:'每级金币收入 +4%，最多 +20%；按本局总收入计算',bonus:{greed:.04}}
};
export function freshProfile(){return migrateProfile({version:1,scrap:0,lifetimeScrap:0,training:Object.fromEntries(Object.keys(TRAINING).map(k=>[k,0])),character:'scout',unlocked:['scout'],records:{runs:0,wins:0,kills:0,bosses:0,bestTime:0,bestLevel:1},ledger:{},history:[]});}
// Old saves gain a second wallet without resetting their earned training.
export function migrateProfile(p){p.expedition??={starter:'pistol',relic:'none'};p.gold??=0;p.lifetimeGold??=0;p.forgeLedger??={};for(const key of Object.keys(TRAINING))p.training[key]??=0;migrateCollection(p);awardAchievements(p);return p;}
export const FORGE_ODDS=[
  {up:70,jackpot:1,down:0,stay:29},
  {up:60,jackpot:1.5,down:8,stay:30.5},
  {up:50,jackpot:2,down:14,stay:34},
  {up:40,jackpot:2.5,down:22,stay:35.5},
  {up:30,jackpot:3,down:30,stay:37}
];
export function forgeQuote(key,level){const d=TRAINING[key];if(!d||!Number.isInteger(level)||level<0||level>=d.max)return null;return {cost:Math.ceil(40*(level+1)**1.6),...FORGE_ODDS[level]};}
export function goldDrop(enemy,time,random){
  const chance=enemy.kind==='boss'?1:enemy.elite?.45:.12;
  if(random()>=chance)return 0;
  const scale=1+Math.min(1800,Math.max(0,time||0))/300;
  const weight=enemy.kind==='boss'?8:enemy.elite?3:enemy.kind==='brute'?2:1;
  return Math.round(2*scale**1.35)*weight;
}
export function forgeTraining(profile,key,requestId,random){
  migrateProfile(profile);
  if(typeof requestId!=='string'||! /^[a-f0-9-]{36}$/.test(requestId))throw Error('锻造请求无效');
  if(profile.forgeLedger[requestId])return profile.forgeLedger[requestId];
  const from=profile.training[key],quote=forgeQuote(key,from);
  if(!quote)throw Error('锻造项目无效或已满级');
  if(profile.gold<quote.cost)throw Error('金币不足，杀怪掉落金币，结算后可锻造');
  const roll=random()*100;if(!Number.isFinite(roll)||roll<0||roll>=100)throw Error('锻造结果无效');
  const outcome=roll<quote.jackpot?'jackpot':roll<quote.jackpot+quote.up?'up':roll<quote.jackpot+quote.up+quote.down?'down':'stay';
  const to=outcome==='jackpot'?TRAINING[key].max:outcome==='up'?from+1:outcome==='down'?Math.max(0,from-1):from;
  profile.gold-=quote.cost;profile.training[key]=to;
  const result={id:requestId,key,from,to,cost:quote.cost,outcome};profile.lastForge=result;profile.forgeLedger[requestId]=result;
  return result;
}
export function trainingCost(key,level){const d=TRAINING[key];return d&&Number.isInteger(level)&&level>=0&&level<d.max?d.base*(level+1):null;}
export function buyTraining(profile,key){const d=TRAINING[key],level=profile.training[key],cost=trainingCost(key,level);if(!d||cost===null)throw Error('训练已满级或项目无效');if(profile.scrap<cost)throw Error('零件不足，完成一局可获得零件');profile.scrap-=cost;profile.training[key]++;}
export function selectCharacter(profile,key){if(!CHARACTERS[key]||!profile.unlocked.includes(key))throw Error('角色尚未解锁');profile.character=key;}
export function profileBonus(profile){const result={...(CHARACTERS[profile.character]||CHARACTERS.scout).bonus};for(const [key,d]of Object.entries(TRAINING)){const level=Math.max(0,Math.min(d.max,profile.training[key]||0));for(const [stat,value]of Object.entries(d.bonus))result[stat]=(result[stat]||0)+value*level;}return result;}
export function publicProfile(p){const {ledger,forgeLedger,...visible}=p;return {...visible,gold:p.gold||0,lifetimeGold:p.lifetimeGold||0,training:{...p.training},records:{...p.records},unlocked:[...p.unlocked],history:p.history.map(h=>({...h})),bonus:profileBonus(p),expedition:{...p.expedition},expeditionUnlocks:expeditionUnlocks(p)};}
export function runSummary(room,p,outcome=room.phase){return {lastHit:p.lastHit,newDiscoveries:{weapons:(p.obtainedWeapons||[]).filter(k=>p.knownAtStart&&!p.knownAtStart.weapons.includes(k)),items:(p.obtainedItems||[]).filter(k=>p.knownAtStart&&!p.knownAtStart.items.includes(k))},id:room.runId,outcome,challengeMode:room.challengeMode,map:room.map,endlessLevel:room.endlessLevel||0,dodges:p.dodges||0,comboTriggers:p.comboTriggers||0,factionProcs:{...p.factionProcs},factionAwakened:[...(p.factionAwakened||[])],damageSources:Object.fromEntries(Object.entries(p.damageSources||{}).map(([k,v])=>[k,Math.round(v)])),time:Math.floor(room.survivalTime||room.time||0),gold:p.runGold||0,kills:p.kills,teamKills:room.kills,bosses:room.bossKills||0,damage:Math.round(p.damage),healing:Math.round(p.healing||0),revives:p.revives||0,level:p.level,character:p.character||'scout',weapons:p.weapons.map((kind,n)=>kind?{kind,tier:p.weaponTiers[n]}:null).filter(Boolean),items:p.items.filter(i=>i.x!==null).map(i=>i.kind),recycles:p.recycles||0,collection:{weapons:[...new Set([...p.weapons.filter(Boolean),...p.weaponStash.map(w=>w.kind),...(p.obtainedWeapons||[])])],items:[...new Set([...p.items.map(i=>i.kind),...(p.obtainedItems||[])])]},fusions:p.fusions||0};}
export function settleProfile(profile,summary){
  migrateProfile(profile);
  if(!summary.id)throw Error('本局记录无效');
  const old=profile.ledger[summary.id]||{paid:0,kills:0,bosses:0,time:0,won:false};
  const won=old.won||summary.outcome==='victory';
  const earned=Math.min(1200,Math.floor(summary.time/30)+Math.floor(summary.kills/20)+summary.bosses*15+(won?40:0));
  const awarded=Math.max(0,earned-old.paid);profile.scrap+=awarded;profile.lifetimeScrap+=awarded;
  const gold=Math.max(old.gold||0,Number.isSafeInteger(summary.gold)&&summary.gold>=0?summary.gold:0),goldAwarded=gold-(old.gold||0);
  profile.gold+=goldAwarded;profile.lifetimeGold+=goldAwarded;
  const r=profile.records;if(!profile.ledger[summary.id])r.runs++;if(won&&!old.won)r.wins++;
  if(won&&!old.won&&['bare','noheal'].includes(summary.challengeMode))r[summary.challengeMode+'Wins']=(r[summary.challengeMode+'Wins']||0)+1;
  r.kills+=Math.max(0,summary.kills-old.kills);r.bosses+=Math.max(0,summary.bosses-old.bosses);r.bestTime=Math.max(r.bestTime,summary.time);r.bestLevel=Math.max(r.bestLevel,summary.level);
  for(const key of ['recycles','fusions','dodges','comboTriggers','revives'])r[key]=(r[key]||0)+Math.max(0,(summary[key]||0)-(old[key]||0));r.endlessLevel=Math.max(r.endlessLevel||0,summary.endlessLevel||0);r.factionAwakened=[...new Set([...r.factionAwakened,...(summary.factionAwakened||[])])];const discoveredAchievements=discover(profile,summary.collection||{weapons:(summary.weapons||[]).map(w=>w.kind),items:summary.items||[]});
  const unlocks=[];for(const [key,ok]of [['gunner',r.kills>=300],['courier',r.bestTime>=300],['medic',r.bosses>=1]])if(ok&&!profile.unlocked.includes(key)){profile.unlocked.push(key);unlocks.push(key);}
  const achievementUnlocks=[...discoveredAchievements,...awardAchievements(profile)];
  profile.ledger[summary.id]={...Object.fromEntries(['recycles','fusions','dodges','comboTriggers','revives'].map(k=>[k,Math.max(old[k]||0,summary[k]||0)])),paid:Math.max(old.paid,earned),gold,kills:Math.max(old.kills,summary.kills),bosses:Math.max(old.bosses,summary.bosses),time:Math.max(old.time,summary.time),won};
  profile.history=[{...summary,gold,earned:Math.max(old.paid,earned)},...profile.history.filter(h=>h.id!==summary.id)].slice(0,12);
  return {...summary,gold,goldAwarded,earned,awarded,unlocks,achievementUnlocks};
}

export const STARTERS={pistol:{name:'一把小手枪',text:'默认起步，空背包。',unlock:'默认解锁',ok:r=>true},wand:{name:'欠费魔杖',text:'一把淬火魔杖，走魔法路线。',unlock:'最高等级达到 10',ok:r=>r.bestLevel>=10},shotgun:{name:'门口喷子',text:'一把淬火霰弹枪，近距离散射。',unlock:'累计击杀 500',ok:r=>r.kills>=500},snowstaff:{name:'冷脸法杖',text:'一把淬火冰霜法杖，控制起步。',unlock:'累计击败 1 个首领',ok:r=>r.bosses>=1}};
export function nextRunGoal(profile){
  const r=profile?.records;if(!r)return '完成这一局，保存你的成长。';
  if(r.bestTime<300)return `再坚持到 05:00，解锁墓园快递员（最佳 ${Math.floor(r.bestTime/60)} 分 ${r.bestTime%60} 秒）。`;
  if(r.bestLevel<10)return `一局达到 LV 10，解锁起步魔杖（最高 LV ${r.bestLevel}）。`;
  if(r.kills<500)return `再累计击杀 ${500-r.kills} 只怪物，解锁起步霰弹枪。`;
  if(r.bosses<1)return '挑战 10:00 出现的首领，解锁冰霜法杖与实验室。';
  if(r.wins<1)return '完成 20 分钟撤离，解锁废城和挑战模式。';
  if(r.kills<1000)return `再累计击杀 ${1000-r.kills} 只怪物，解锁回音收据。`;
  return '试试另一套双武器连携，或挑战无尽生存。';
}
export const RELICS={none:{name:'轻装出门',text:'不携带遗物。',unlock:'默认解锁',ok:r=>true},compass:{name:'迷路指南针',text:'每局额外获得 1 次奖励重抽。',unlock:'完成 3 局',ok:r=>r.runs>=3},bell:{name:'医务室下班铃',text:'战斗每 60 秒治疗全队 5 HP。',unlock:'累计击败 3 个首领',ok:r=>r.bosses>=3},echo:{name:'回音收据',text:'每 10 次自动攻击追加一击，造成该次伤害的 25%。',unlock:'累计击杀 1000',ok:r=>r.kills>=1000}};
export function expeditionUnlocks(profile){const r=profile.records;return {starters:Object.keys(STARTERS).filter(k=>STARTERS[k].ok(r)),relics:Object.keys(RELICS).filter(k=>RELICS[k].ok(r)),maps:['cemetery',...(r.bosses>=1?['laboratory']:[]),...(r.wins>=1?['ruins']:[])]};}
export function selectExpedition(profile,kind,key){migrateProfile(profile);const defs=kind==='starter'?STARTERS:kind==='relic'?RELICS:null;if(!defs?.[key]||!defs[key].ok(profile.records))throw Error('远征装备尚未解锁');profile.expedition[kind]=key;}
