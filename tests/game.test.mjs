import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,addPlayer,action,fits,stats,tick,snapshot,ITEMS,WEAPONS,TIERS,weaponStats,EXPERIENCE,experienceNeeded,grantExperience,resumeWhenReady} from '../shared/game.mjs';
const fixture=(solo=false)=>{const r=createRoom('TEST',1,solo),p=addPlayer(r,'one','测试员');p.weapons=['rifle','shotgun'];p.items=[{id:'a',kind:'magazine',x:0,y:0,target:0,rotated:false},{id:'b',kind:'trigger',x:1,y:0,target:0,rotated:false},{id:'c',kind:'medkit',x:3,y:0,target:0,rotated:false},{id:'d',kind:'scope',x:0,y:2,target:1,rotated:false}];return {r,p};};
test('inventory rejects overlaps and off-grid positions, and allows moving the same item',()=>{
  const {r,p}=fixture(),i=p.items[0];
  assert.equal(fits(p,{...i,x:1,y:0}),false);assert.equal(fits(p,{...i,x:6,y:0}),false);
  assert.equal(fits(p,{...i,x:5,y:4}),false);assert.equal(fits(p,{...i,x:0,y:0}),true);
  action(r,p,{type:'place',id:i.id,x:4,y:4,rotated:true});assert.equal(i.rotated,true);assert.equal(i.x,4);
  assert.throws(()=>action(r,p,{type:'place',id:i.id,x:5,y:4,rotated:true}),/放不下/);
  assert.equal(i.x,4,'invalid placement does not overwrite valid inventory');
});
test('stashed items do not boost stats and target binding affects only the chosen weapon',()=>{
  const {r,p}=fixture();const trigger=p.items.find(i=>i.kind==='trigger');const before=stats(p);
  action(r,p,{type:'target',id:trigger.id,target:1});const after=stats(p);
  assert.ok(after.weapons[0].interval>before.weapons[0].interval);assert.ok(after.weapons[1].interval<before.weapons[1].interval);
  action(r,p,{type:'stash',id:trigger.id});assert.equal(stats(p).weapons[0].interval,.42);assert.equal(stats(p).weapons[1].interval,1.1);
});
test('coolers boost orthogonal neighbors once, excluding diagonal and stashed items',()=>{
  const {p}=fixture();p.items=[{id:'t',kind:'trigger',x:2,y:2,target:0,rotated:false},{id:'c',kind:'cooler',x:0,y:2,target:0,rotated:false},{id:'d',kind:'cooler',x:3,y:3,target:0,rotated:false}];
  assert.ok(Math.abs(stats(p).weapons[0].interval-.42/(1+.15*1.3))<1e-10);
  p.items.push({id:'c2',kind:'cooler',x:3,y:2,target:0,rotated:false});assert.ok(Math.abs(stats(p).weapons[0].interval-.42/(1+.15*1.3))<1e-10);
  p.items[1].x=null;p.items[3].x=null;assert.ok(Math.abs(stats(p).weapons[0].interval-.42/1.15)<1e-10);
});
test('all connected teammates must ready; combat locks every equipment action',()=>{
  const {r,p}=fixture(),q=addPlayer(r,'two','队友');action(r,p,{type:'ready'});assert.equal(r.phase,'prepare');action(r,q,{type:'ready'});assert.equal(r.phase,'battle');
  assert.throws(()=>action(r,p,{type:'stash',id:p.items[0].id}),/锁定/);assert.throws(()=>addPlayer(r,'late','迟到'),/已经开始/);
});
test('gifts transfer ownership and invalidate both readiness states',()=>{
  const {r,p}=fixture(),q=addPlayer(r,'two','队友');q.ready=true;const id=p.items[0].id;
  action(r,p,{type:'gift',id,playerId:q.id});assert.ok(!p.items.some(i=>i.id===id));assert.equal(q.items.find(i=>i.id===id).x,null);assert.equal(q.ready,false);
  assert.throws(()=>action(r,p,{type:'place',id,x:5,y:0}),/不存在/);
});
test('reward selection cannot be repeated or bypassed with readiness',()=>{
  const {r,p}=fixture();grantExperience(r,5);p.rewards=['armor','battery','trigger'];
  assert.throws(()=>action(r,p,{type:'ready'}),/选择/);action(r,p,{type:'reward',index:1});assert.equal(p.items.at(-1).kind,'battery');assert.equal(p.items.at(-1).x,null);
  assert.throws(()=>action(r,p,{type:'reward',index:0}),/无效/);
});
test('six complete waves, rewards, upgrades, boss victory and replay work end to end',()=>{
  const {r,p}=fixture(true);p.weapons=['lmg','frost'];
  const priority=['armor','incendiary','piercing','battery','trigger','charm','scope','loader','medkit','magazine','boots','cooler'];
  function chooseUpgrades(){while(p.rewardPending){const index=p.rewards.map(k=>typeof k==='string'?priority.indexOf(k):100).reduce((best,v,n,a)=>v<a[best]?n:best,0);action(r,p,{type:'reward',index});
    for(const i of p.items.filter(i=>i.x===null&&r.phase==='upgrade')){let placed=false;for(let y=0;y<5&&!placed;y++)for(let x=0;x<6&&!placed;x++)if(fits(p,{...i,x,y})){action(r,p,{type:'place',id:i.id,x,y});placed=true;}}
  }}
  for(let wave=0;wave<6;wave++){
    action(r,p,{type:'ready'});for(let t=0;t<3000&&['battle','upgrade'].includes(r.phase);t++){if(r.phase==='upgrade'){chooseUpgrades();}else tick(r,.1);}
    assert.equal(r.phase,wave===5?'victory':'prepare');assert.equal(r.spawned,r.total);
  }
  assert.equal(r.wave,6);assert.ok(p.damage>0);assert.ok(p.kills>0);assert.ok(p.level>1);assert.ok(p.totalXp>100);assert.equal(p.pendingUpgrades,0);
  action(r,p,{type:'restart'});assert.equal(r.wave,0);assert.equal(r.phase,'prepare');assert.equal(r.players[0].items.length,0);assert.equal(r.players[0].kills,0);assert.equal(r.players[0].level,1);assert.equal(r.players[0].xp,0);assert.equal(r.players[0].totalXp,0);
});
test('failure and revive are real outcomes; snapshots hide other player rewards',()=>{
  const {r,p}=fixture(),q=addPlayer(r,'two','队友');action(r,p,{type:'ready'});action(r,q,{type:'ready'});p.hp=0;q.x=p.x;q.y=p.y;
  for(let i=0;i<42;i++)tick(r,.1);assert.ok(p.hp>0,'nearby teammate revives fallen survivor');
  p.rewards=['armor'];q.rewards=['trigger'];const snap=snapshot(r,p.id);assert.deepEqual(snap.players[0].rewards,['armor']);assert.deepEqual(snap.players[1].rewards,[]);
  p.hp=q.hp=0;tick(r,.1);assert.equal(r.phase,'defeat');
});
test('capacity and invalid weapon inputs are enforced',()=>{const {r,p}=fixture();for(let i=2;i<=4;i++)addPlayer(r,String(i),'队友');assert.throws(()=>addPlayer(r,'5','第五人'),/已满/);assert.throws(()=>action(r,p,{type:'weapon',slot:0,kind:'fake'}),/升级奖励/);assert.equal(Object.keys(ITEMS).length,44);});
test('XP thresholds increase with level; exact thresholds and overflow queue each earned reward',()=>{
  assert.deepEqual([1,2,3,4,5].map(experienceNeeded),[5,10,17,24,33]);for(let lv=2;lv<100;lv++)assert.ok(experienceNeeded(lv)>experienceNeeded(lv-1));
  const {r,p}=fixture();grantExperience(r,4);assert.equal(p.level,1);assert.equal(p.xp,4);assert.equal(p.pendingUpgrades,0);
  grantExperience(r,36);assert.equal(p.level,4);assert.equal(p.xp,8);assert.equal(p.totalXp,40);assert.equal(p.pendingUpgrades,3);
  assert.throws(()=>action(r,p,{type:'ready'}),/选择/);for(let n=3;n>0;n--){assert.equal(p.rewards.length,3);assert.equal(new Set(p.rewards).size,3);action(r,p,{type:'reward',index:0});assert.equal(p.pendingUpgrades,n-1);}
  assert.equal(p.rewardPending,false);assert.throws(()=>action(r,p,{type:'reward',index:0}),/无效/);assert.throws(()=>grantExperience(r,-1),/无效/);
});
test('each enemy class drops the correct XP gem; a kill does not grant XP until pickup',()=>{
  for(const kind of Object.keys(EXPERIENCE)){
    const {r,p}=fixture(true);action(r,p,{type:'ready'});r.total=2;r.spawned=1;r.nextSpawn=100;
    r.enemies=[{id:'enemy',kind,x:p.x+200,y:p.y,hp:1,maxHp:1,speed:0,damage:0,radius:10,slow:0,burn:0,burnDps:0,attack:0,angle:0}];
    tick(r,.2);assert.equal(r.kills,1);assert.equal(r.gems.length,1);assert.equal(r.gems[0].value,EXPERIENCE[kind].value);assert.equal(r.gems[0].tier,EXPERIENCE[kind].tier);assert.equal(p.totalXp,0);
    r.gems[0].x=p.x;r.gems[0].y=p.y;tick(r,.1);assert.equal(p.totalXp,EXPERIENCE[kind].value);assert.equal(r.gems.length,0);tick(r,.1);assert.equal(p.totalXp,EXPERIENCE[kind].value,'kill/drop not credited twice');
  }
});
test('burn kills also drop XP; remaining gems are swept when a wave ends',()=>{
  const {r,p}=fixture(true);action(r,p,{type:'ready'});r.total=r.spawned=1;r.nextSpawn=100;
  r.enemies=[{id:'enemy',kind:'walker',x:20,y:20,hp:.5,maxHp:30,speed:0,damage:0,radius:10,slow:0,burn:1,burnDps:8,burnOwner:p.id,attack:0,angle:0}];
  tick(r,.1);assert.equal(r.phase,'prepare');assert.equal(r.kills,1);assert.equal(p.kills,1);assert.equal(p.totalXp,1);assert.equal(p.pendingUpgrades,0);assert.equal(p.items.length,4,'wave clear itself awards no item');assert.equal(r.gems.length,0);
});
test('squad XP is credited equally once, regardless of collector, kills or fallen teammates',()=>{
  const {r,p}=fixture(),q=addPlayer(r,'two','队友');action(r,p,{type:'ready'});action(r,q,{type:'ready'});q.hp=0;r.nextSpawn=100;r.gems=[{id:'gem',x:p.x,y:p.y,...EXPERIENCE.runner}];
  tick(r,.1);assert.equal(r.phase,'upgrade');assert.equal(p.totalXp,5);assert.equal(q.totalXp,5);assert.equal(p.level,q.level);assert.equal(p.pendingUpgrades,1);assert.equal(q.pendingUpgrades,1);
});
test('upgrade freezes the world and resumes same wave/time/HP/ammo automatically after every connected player selects',()=>{
  const {r,p}=fixture(),q=addPlayer(r,'two','队友');action(r,p,{type:'ready'});action(r,q,{type:'ready'});tick(r,.7);p.hp=71;p.shots[0].ammo=7;
  grantExperience(r,5);tick(r,.1);assert.equal(r.phase,'upgrade');const frozen=JSON.stringify([r.time,r.enemies,r.gems,p.hp,p.shots]);tick(r,5);assert.equal(JSON.stringify([r.time,r.enemies,r.gems,p.hp,p.shots]),frozen);
  p.rewards=['trigger','scope','boots'];assert.throws(()=>action(r,p,{type:'ready'}),/选择/);action(r,p,{type:'reward',index:0});const newItem=p.items.at(-1);action(r,p,{type:'place',id:newItem.id,x:4,y:3,rotated:true});
  assert.equal(r.phase,'upgrade');action(r,q,{type:'reward',index:0});assert.equal(r.phase,'battle');assert.equal(r.wave,1);assert.equal(r.time,.7);assert.equal(p.hp,71);assert.equal(p.shots[0].ammo,7);
});
test('offline teammate cannot hold upgrade pause; pending awards survive reconnect and waves',()=>{
  const {r,p}=fixture(),q=addPlayer(r,'two','队友');action(r,p,{type:'ready'});action(r,q,{type:'ready'});grantExperience(r,5);tick(r,.1);
  action(r,p,{type:'reward',index:0});q.connected=false;resumeWhenReady(r);assert.equal(r.phase,'battle');assert.equal(q.pendingUpgrades,1);
  q.connected=true;tick(r,.1);assert.equal(r.phase,'upgrade');action(r,q,{type:'reward',index:0});assert.equal(r.phase,'battle');
  r.enemies=[];r.spawned=r.total;tick(r,.1);assert.equal(r.phase,'prepare');assert.equal(p.level,2);assert.equal(p.rewardPending,false);const xp=p.totalXp;action(r,p,{type:'ready'});action(r,q,{type:'ready'});assert.equal(p.totalXp,xp);assert.equal(p.level,2);
});
const fresh=()=>{const r=createRoom('GROW',7,true),p=addPlayer(r,'new','新手');return {r,p};};
function claimWeapon(r,p,kind,tier=1){grantExperience(r,experienceNeeded(p.level)-p.xp);p.rewards=[{type:'weapon',kind,tier},'boots','armor'];action(r,p,{type:'reward',index:0,merge:p.weapons.some((k,n)=>k===kind&&p.weaponTiers[n]===tier&&tier<4)});}
test('new runs start with exactly one white pistol and cannot obtain free weapons',()=>{
  const {r,p}=fresh();assert.deepEqual(p.weapons,['pistol',null]);assert.deepEqual(p.weaponTiers,[1,1]);assert.equal(stats(p).weapons[1],null);assert.equal(p.weaponStash.length,0);
  assert.throws(()=>action(r,p,{type:'weapon',slot:0,kind:'lmg'}),/升级奖励/);
  action(r,p,{type:'ready'});for(let n=0;n<500&&r.phase==='battle';n++)tick(r,.1);assert.equal(r.phase,'upgrade');assert.ok(p.kills>=5,'starting pistol can earn its first real upgrade');
});
test('all twenty-four weapons have four improving tiers with real combat properties',()=>{
  assert.equal(Object.keys(WEAPONS).length,27);assert.equal(TIERS.length,5);
  for(const kind of Object.keys(WEAPONS))for(let tier=1;tier<4;tier++){const a=weaponStats(kind,tier),b=weaponStats(kind,tier+1);assert.ok(b.damage>a.damage);assert.ok(b.interval<a.interval);assert.ok(b.range>a.range);}
  assert.ok(WEAPONS.laser.pierce);assert.ok(WEAPONS.rocket.splash>WEAPONS.shotgun.splash);assert.ok(WEAPONS.knife.melee);assert.ok(WEAPONS.spear.pierce);
});
test('matching reward merges pairwise white to blue to purple to red, with red capped',()=>{
  const {r,p}=fresh();for(let tier=1;tier<=3;tier++){claimWeapon(r,p,'pistol',tier);assert.equal(p.weaponTiers[0],tier+1);assert.equal(p.weapons[1],null);}
  claimWeapon(r,p,'pistol',4);assert.deepEqual(p.weapons,['pistol','pistol']);assert.deepEqual(p.weaponTiers,[4,4]);assert.throws(()=>action(r,p,{type:'combineWeapons'}),/最高品质/);
});
test('different tier cannot merge; new weapons fill empty slots and preserve replaced weapons',()=>{
  const {r,p}=fresh();claimWeapon(r,p,'pistol',2);assert.deepEqual(p.weaponTiers,[1,2]);assert.throws(()=>action(r,p,{type:'combineWeapons'}),/同类同品质/);
  claimWeapon(r,p,'rocket',1);assert.equal(p.weaponStash.length,1);const id=p.weaponStash[0].id;
  action(r,p,{type:'equipWeapon',id,slot:1});assert.equal(p.weapons[1],'rocket');assert.deepEqual(p.weaponStash.map(w=>[w.kind,w.tier]),[['pistol',2]]);
  assert.throws(()=>action(r,p,{type:'equipWeapon',id,slot:0}),/不存在/);
  const reserve=p.weaponStash[0].id;action(r,p,{type:'discardWeapon',id:reserve});assert.equal(p.weaponStash.length,0);
});
test('reserve copies merge into occupied slots without replacing their weapon',()=>{
  const {r,p}=fresh();claimWeapon(r,p,'shotgun');claimWeapon(r,p,'pistol',2);const id=p.weaponStash[0].id;
  action(r,p,{type:'equipWeapon',id,slot:0});assert.equal(p.weaponTiers[0],2);assert.equal(p.weaponStash.length,1,'different tiers swap rather than combine');
  claimWeapon(r,p,'pistol',1);assert.equal(p.weaponStash.length,2);const white=p.weaponStash.find(w=>w.tier===1);action(r,p,{type:'equipWeapon',id:white.id,slot:0});assert.equal(p.weaponTiers[0],1);
  const duplicate=p.weaponStash.find(w=>w.kind==='pistol'&&w.tier===1);action(r,p,{type:'equipWeapon',id:duplicate.id,slot:0,merge:true});assert.equal(p.weaponTiers[0],2);
});
test('equipped duplicates combine, empty-slot attachments wait safely, and combat validates weapon management',()=>{
  const {r,p}=fresh();grantExperience(r,5);p.rewards=['scope','armor','boots'];action(r,p,{type:'reward',index:0});const scope=p.items[0];action(r,p,{type:'place',id:scope.id,x:0,y:0});action(r,p,{type:'target',id:scope.id,target:1});assert.ok(stats(p).weapons[0]);assert.equal(stats(p).weapons[1],null);
  p.weapons[1]='pistol';action(r,p,{type:'combineWeapons'});assert.deepEqual(p.weapons,['pistol',null]);assert.equal(p.weaponTiers[0],2);
  action(r,p,{type:'ready'});assert.throws(()=>action(r,p,{type:'combineWeapons'}),/同类同品质/);assert.throws(()=>action(r,p,{type:'equipWeapon',id:'fake',slot:1}),/不存在/);
});
test('reward pools include a matching same-tier weapon, a different weapon and an attachment',()=>{
  const {r,p}=fresh();r.random=()=>0;grantExperience(r,5);assert.deepEqual(p.rewards[0],{type:'weapon',kind:'pistol',tier:1});assert.equal(p.rewards[1].type,'weapon');assert.notEqual(p.rewards[1].kind,'pistol');assert.ok(ITEMS[p.rewards[2]]);
  assert.equal(p.rewards[1].tier,1,'a low quality roll still offers white at low levels');action(r,p,{type:'reward',index:0,merge:true});assert.equal(p.weaponTiers[0],2);grantExperience(r,10);assert.deepEqual(p.rewards[0],{type:'weapon',kind:'pistol',tier:2});
});
test('laser penetrates a line and melee weapons continue attacking without reloading',()=>{
  for(const kind of ['laser','spear','knife']){const {r,p}=fresh();p.weapons=[kind,null];p.items=[];action(r,p,{type:'ready'});r.nextSpawn=100;r.total=3;r.spawned=2;
    const d=kind==='laser'?160:50;r.enemies=[0,1].map((n)=>({id:`e${n}`,kind:'walker',x:p.x+d+n*20,y:p.y,hp:1000,maxHp:1000,speed:0,damage:0,radius:10,slow:0,burn:0,attack:0,angle:0}));
    tick(r,.2);assert.ok(r.enemies[0].hp<1000);if(kind!=='knife')assert.ok(r.enemies[1].hp<1000,'piercing damages the target behind');const firstDamage=p.damage;for(let n=0;n<15;n++)tick(r,.1);assert.ok(p.damage>firstDamage);if(WEAPONS[kind].melee)assert.equal(p.shots[0].reloading,0);
  }
});
test('a fresh pistol run can finish six waves using only earned weapon rewards',()=>{
  const {r,p}=fresh();let ticks=0;
  while(!['victory','defeat'].includes(r.phase)&&ticks<30000){
    if(r.phase==='prepare')action(r,p,{type:'ready'});
    else if(r.phase==='upgrade'){while(p.rewardPending)action(r,p,{type:'reward',index:p.weapons.includes(null)&&p.weaponTiers[0]===4?1:0,merge:p.rewards[0].tier<4&&p.weapons.some((k,n)=>k===p.rewards[0].kind&&p.weaponTiers[n]===p.rewards[0].tier)&&!(p.weapons.includes(null)&&p.weaponTiers[0]===4)});}
    else tick(r,.1);ticks++;
  }
  assert.equal(r.phase,'victory');assert.equal(r.wave,6);assert.deepEqual(p.weaponTiers,[4,4]);assert.equal(p.items.length,0,'no equipment was injected to make the run pass');
  action(r,p,{type:'restart'});assert.deepEqual(r.players[0].weapons,['pistol',null]);assert.deepEqual(r.players[0].weaponTiers,[1,1]);assert.equal(r.players[0].weaponStash.length,0);
});
