import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,addPlayer,startWave,tick,action,grantExperience,grantBossReward,FUSIONS,eligibleFusions,weaponStats,stats} from '../shared/game.mjs';
function fixture(){const r=createRoom('FUSION',17,true,true),p=addPlayer(r,'p','玩家');startWave(r);r.nextSpawn=1e6;r.total=1;r.spawned=0;p.controlMode='manual';return {r,p};}
function ready(kind){const {r,p}=fixture();p.weapons=[...FUSIONS[kind].needs];p.weaponTiers=[4,4];p.shots=p.weapons.map(k=>({ammo:weaponStats(k,4).clip,cooldown:0,reloading:0}));r.random=()=>0;grantBossReward(r,'首领');tick(r,.1);return {r,p};}
test('each boss drops a persistent chest; walking near it opens one extra reward without granting a level',()=>{
  const {r,p}=fixture();p.weapons=[null,null];r.survivalTime=599.9;tick(r,.1);const b=r.enemies[0];b.hp=.05;b.burn=2;b.burnDps=1;b.burnOwner=p.id;tick(r,.1);assert.equal(r.chests.length,1);assert.equal(p.pendingUpgrades,0);assert.equal(p.level,1);const ch=r.chests[0];r.gems=[];r.spawned=r.total;tick(r,.1);assert.equal(r.chests.length,1,'wave transition keeps unopened loot');r.nextSpawn=1e6;p.x=ch.x;p.y=ch.y;tick(r,.1);assert.equal(r.chests.length,0);assert.equal(p.level,1);assert.equal(p.pendingUpgrades,1);assert.equal(p.rewardSource,'boss');assert.equal(r.phase,'upgrade');action(r,p,{type:'reward',index:2});assert.equal(r.phase,'battle');assert.equal(p.pendingUpgrades,0);tick(r,.1);assert.equal(p.pendingUpgrades,0,'same chest cannot reward twice');
});
test('manual movement alone opens the chest; auto movement seeks it without XP gems',()=>{
  for(const mode of ['manual','auto']){const {r,p}=fixture();p.controlMode=mode;r.chests=[{id:'ch',x:650,y:310,boss:'测试'}];p.weapons=[null,null];for(let n=0;n<100&&r.phase==='battle';n++){if(mode==='manual')action(r,p,{type:'move',x:1,y:0});tick(r,.1);}assert.equal(r.phase,'upgrade');assert.equal(r.chests.length,0);}
});
test('all nine recipes consume two red weapons and equip one real red fusion weapon',()=>{
  for(const kind of Object.keys(FUSIONS)){const {r,p}=ready(kind);const idx=p.rewards.findIndex(w=>w.type==='fusion');assert.ok(idx>=0);assert.equal(p.rewards[idx].kind,kind);action(r,p,{type:'reward',index:idx});assert.deepEqual(p.weapons,[kind,null]);assert.deepEqual(p.weaponTiers,[4,1]);assert.equal(p.weaponStash.length,0);assert.equal(r.phase,'battle');assert.ok(stats(p).weapons[0].fusion);assert.ok(weaponStats(kind,4).damage>0);assert.equal(weaponStats(kind,1),null);}
});
test('one pistol is not two ingredients; non-red and teammate ownership never qualify',()=>{
  const {p}=fixture();p.weapons=['pistol',null];p.weaponTiers=[4,1];assert.equal(eligibleFusions(p).length,0);p.weapons[1]='pistol';p.weaponTiers[1]=3;assert.equal(eligibleFusions(p).length,0);p.weaponTiers[1]=4;assert.equal(eligibleFusions(p)[0].kind,'doublepistol');
  const r=createRoom('TEAM',17,false,true),a=addPlayer(r,'a','A'),b=addPlayer(r,'b','B');a.weapons=['laser',null];b.weapons=['rocket',null];a.weaponTiers=b.weaponTiers=[4,1];assert.equal(eligibleFusions(a).length,0);assert.equal(eligibleFusions(b).length,0);
});
test('a stale offer is rejected atomically if either ingredient is removed or downgraded',()=>{
  const {r,p}=ready('orbital');p.weaponTiers[1]=3;const before=JSON.stringify([p.weapons,p.weaponTiers,p.weaponStash,p.rewards,p.pendingUpgrades]);assert.throws(()=>action(r,p,{type:'reward',index:1}),/两把/);assert.equal(JSON.stringify([p.weapons,p.weaponTiers,p.weaponStash,p.rewards,p.pendingUpgrades]),before);
});
test('two reserve ingredients fuse with a full equipped loadout and full reserve',()=>{
  const {r,p}=fixture();p.weapons=['pistol','knife'];p.weaponTiers=[4,4];p.weaponStash=[{id:'a',kind:'laser',tier:4},{id:'b',kind:'rocket',tier:4},...Array.from({length:10},(_,n)=>({id:'x'+n,kind:'pistol',tier:1}))];r.random=()=>0;grantBossReward(r,'首领');tick(r,.1);action(r,p,{type:'reward',index:1});assert.deepEqual(p.weapons,['pistol','knife']);assert.equal(p.weaponStash.length,11);assert.ok(p.weaponStash.some(w=>w.kind==='orbital'&&w.tier===4));assert.ok(!p.weaponStash.some(w=>['a','b'].includes(w.id)));
});
test('fusion chance is exactly 35 percent when eligible; normal level rewards never offer fusion',()=>{
  for(const [roll,expected] of [[0,true],[.34999,true],[.35,false],[.999,false]]){const {r,p}=fixture();p.weapons=['laser','rocket'];p.weaponTiers=[4,4];r.random=()=>roll;grantBossReward(r,'首领');assert.equal(p.rewards.some(w=>w.type==='fusion'),expected);}
  const {r,p}=fixture();p.weapons=['laser','rocket'];p.weaponTiers=[4,4];r.random=()=>0;grantExperience(r,5);assert.ok(!p.rewards.some(w=>w.type==='fusion'));assert.equal(p.rewardSource,'level');
});
test('level and chest rewards keep FIFO order, preserve XP and give each teammate one bonus',()=>{
  const r=createRoom('TEAM',17,false,true),p=addPlayer(r,'a','A'),q=addPlayer(r,'b','B');startWave(r);grantExperience(r,5);grantBossReward(r,'首领');tick(r,.1);assert.equal(p.pendingUpgrades,2);assert.equal(q.pendingUpgrades,2);action(r,p,{type:'reward',index:2});assert.equal(p.rewardSource,'boss');assert.equal(p.level,2);assert.equal(p.xp,0);action(r,p,{type:'reward',index:2});assert.equal(r.phase,'upgrade');action(r,q,{type:'skipReward'});action(r,q,{type:'skipReward'});assert.equal(r.phase,'battle');assert.equal(p.pendingUpgrades,0);assert.equal(q.pendingUpgrades,0);
});
test('fusion attacks deliver real combined effects, including double fire and engineering turret',()=>{
  for(const kind of ['orbital','doublepistol','bulldozer']){const {r,p}=ready(kind);action(r,p,{type:'reward',index:1});r.enemies=[{id:'target',kind:'walker',x:p.x+100,y:p.y,hp:10000,maxHp:10000,speed:0,damage:0,radius:13,slow:0,burn:0,attack:0,angle:0}];p.shots[0].cooldown=0;tick(r,.2);assert.ok(r.enemies[0].hp<10000);if(kind==='orbital')assert.ok(r.effects.some(e=>e.type==='blast'));if(kind==='doublepistol')assert.equal(r.effects.filter(e=>e.type==='shot'&&e.weapon===kind).length,2);if(kind==='bulldozer')assert.equal(r.turrets.length,1);}
});
