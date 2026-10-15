import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,addPlayer,action,grantExperience,tick,weaponFlavor,WEAPONS,weaponStats,stats,experienceNeeded} from '../shared/game.mjs';
function game(){const r=createRoom('CHOICE',7,true),p=addPlayer(r,'p','测试');return {r,p};}
function offer(r,p,tier=1){grantExperience(r,experienceNeeded(p.level)-p.xp);p.rewards=[{type:'weapon',kind:'pistol',tier},'coffee','boots'];}
test('duplicate rewards remain two independently firing weapons by default',()=>{
  const {r,p}=game();action(r,p,{type:'ready'});offer(r,p);tick(r,.1);action(r,p,{type:'reward',index:0});assert.equal(r.phase,'battle');assert.deepEqual(p.weapons,['pistol','pistol']);assert.deepEqual(p.weaponTiers,[1,1]);assert.equal(p.weaponStash.length,0);assert.equal(stats(p).weapons.filter(Boolean).length,2);
});
test('duplicate rewards can instead explicitly merge and immediately resume',()=>{
  const {r,p}=game();action(r,p,{type:'ready'});offer(r,p);tick(r,.1);action(r,p,{type:'reward',index:0,merge:true});assert.equal(r.phase,'battle');assert.deepEqual(p.weapons,['pistol',null]);assert.deepEqual(p.weaponTiers,[2,1]);
});
test('keeping a duplicate with occupied slots adds a reserve; invalid merge preserves the reward',()=>{
  const {r,p}=game();p.weapons[1]='rifle';offer(r,p);action(r,p,{type:'reward',index:0});assert.deepEqual(p.weaponTiers,[1,1]);assert.equal(p.weaponStash[0].kind,'pistol');offer(r,p,2);const pending=p.pendingUpgrades;assert.throws(()=>action(r,p,{type:'reward',index:0,merge:true}),/可合成/);assert.equal(p.pendingUpgrades,pending);assert.equal(p.rewardPending,true);
});
test('unloading in battle keeps kind and tier, frees a slot, and allows reequipping or discarding',()=>{
  const {r,p}=game();p.weapons[1]='rocket';p.weaponTiers[1]=3;action(r,p,{type:'ready'});const time=r.time;action(r,p,{type:'unequipWeapon',slot:1});assert.equal(r.phase,'battle');assert.equal(r.time,time);assert.equal(p.weapons[1],null);assert.equal(p.shots[1].ammo,0);assert.equal(p.weaponStash[0].kind,'rocket');assert.equal(p.weaponStash[0].tier,3);const id=p.weaponStash[0].id;action(r,p,{type:'equipWeapon',id,slot:1});assert.equal(p.weaponTiers[1],3);assert.equal(p.weaponStash.length,0);action(r,p,{type:'unequipWeapon',slot:0});action(r,p,{type:'discardWeapon',id:p.weaponStash[0].id});assert.equal(p.weaponStash.length,0);assert.throws(()=>action(r,p,{type:'place',id:'fake',x:0,y:0}),/锁定/);
});
test('reserve equip never merges implicitly and explicit merge consumes exactly one copy',()=>{
  const {r,p}=game();p.weaponStash=[{id:'copy',kind:'pistol',tier:1}];action(r,p,{type:'equipWeapon',id:'copy',slot:1});assert.deepEqual(p.weaponTiers,[1,1]);action(r,p,{type:'combineWeapons'});assert.deepEqual(p.weapons,['pistol',null]);assert.equal(p.weaponTiers[0],2);p.weaponStash=[{id:'blue',kind:'pistol',tier:2}];action(r,p,{type:'equipWeapon',id:'blue',slot:0});assert.equal(p.weaponTiers[0],2);assert.equal(p.weaponStash.length,1);action(r,p,{type:'equipWeapon',id:p.weaponStash[0].id,slot:0,merge:true});assert.equal(p.weaponTiers[0],3);assert.equal(p.weaponStash.length,0);
});
test('last weapon, invalid slots and full reserve cannot be unloaded; red cannot merge',()=>{
  const {r,p}=game();assert.throws(()=>action(r,p,{type:'unequipWeapon',slot:0}),/至少/);assert.throws(()=>action(r,p,{type:'unequipWeapon',slot:2}),/无效/);p.weapons[1]='pistol';p.weaponStash=Array.from({length:12},(_,n)=>({id:'w'+n,kind:'pistol',tier:4}));assert.throws(()=>action(r,p,{type:'unequipWeapon',slot:1}),/已满/);assert.deepEqual(p.weapons,['pistol','pistol']);p.weaponTiers[0]=4;assert.throws(()=>action(r,p,{type:'equipWeapon',id:'w0',slot:0,merge:true}),/传说/);assert.equal(p.weaponStash.length,12);
});
test('all 108 weapon-tier introductions are unique and do not affect stats',()=>{
  const flavors=Object.keys(WEAPONS).flatMap(k=>[1,2,3,4].map(tier=>weaponFlavor(k,tier)));assert.equal(new Set(flavors).size,108);assert.ok(flavors.every(s=>s.length>10));assert.equal(weaponStats('pistol',1).damage,15);assert.equal(weaponStats('pistol',1).clip,12);
});
