import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,addPlayer,grantExperience,ITEMS,itemRarity,rewardTierWeights,rollRewardTier,monsterRank,action,tick} from '../shared/game.mjs';
test('quality odds sum to 100 and each high-tier cumulative chance never decreases with level',()=>{
  let previous=[0,0,0];for(let level=1;level<=40;level++){const weights=rewardTierWeights(level);assert.equal(weights.reduce((a,b)=>a+b),100);assert.ok(weights.every(w=>w>0));const higher=[weights.slice(1).reduce((a,b)=>a+b),weights[2]+weights[3],weights[3]];higher.forEach((chance,n)=>assert.ok(chance>=previous[n],`level ${level}, tier ${n+2}`));previous=higher;}
  assert.deepEqual(rewardTierWeights(1),[87,10,2,1]);assert.deepEqual(rewardTierWeights(4),[67,25,6,2]);assert.deepEqual(rewardTierWeights(8),[40,36,18,6]);assert.deepEqual(rewardTierWeights(12),[20,32,33,15]);assert.deepEqual(rewardTierWeights(20),[2,14,29,55]);
});
test('tier sampler matches the displayed probabilities and rare qualities are available at every level',()=>{
  for(let level=1;level<=20;level++){const counts=[0,0,0,0];for(let n=0;n<100;n++)counts[rollRewardTier(level,()=>(n+.5)/100)-1]++;assert.deepEqual(counts,rewardTierWeights(level));}
});
test('real reward offers use level quality for both weapons and items, while preserving existing weapon quality',()=>{
  for(const [level,tier]of [[1,4],[2,4],[4,4],[8,4],[12,4],[20,4]]){const room=createRoom('QUALITY',2,true),p=addPlayer(room,'p','测试');p.level=level;p.pendingUpgrades=1;room.random=()=>.999;grantExperience(room,1);assert.equal(p.rewards[0].tier,tier);assert.equal(p.rewards[1].tier,tier);assert.equal(itemRarity(p.rewards[2]),tier);assert.ok(ITEMS[p.rewards[2]]);}
  const room=createRoom('FLOOR',2,true),p=addPlayer(room,'p','测试');p.level=4;p.weaponTiers[0]=3;p.pendingUpgrades=1;room.random=()=>0;grantExperience(room,1);assert.equal(p.rewards[0].tier,3);assert.equal(p.rewards[1].tier,1);
});
test('all 44 items have a valid quality and every quality has a populated pool',()=>{
  const counts=[0,0,0,0];for(const kind of Object.keys(ITEMS)){const tier=itemRarity(kind);assert.ok(tier>=1&&tier<=4);counts[tier-1]++;}assert.equal(counts.reduce((a,b)=>a+b),44);assert.ok(counts.every(n=>n>0));
});
test('normal monsters progress with wave rank and spawned enemies expose level without changing XP kind',()=>{
  assert.equal(monsterRank('walker',1),1);assert.equal(monsterRank('walker',3),2);assert.equal(monsterRank('walker',5),3);assert.equal(monsterRank('runner',2),2);assert.equal(monsterRank('runner',5),3);assert.equal(monsterRank('brute',3),3);assert.equal(monsterRank('boss',6),4);
  const r=createRoom('RANK',3,true),p=addPlayer(r,'p','测试');r.wave=4;action(r,p,{type:'ready'});tick(r,.7);assert.ok(r.enemies.length);for(const e of r.enemies){assert.equal(e.level,5);assert.equal(e.rank,monsterRank(e.kind,5));assert.ok(['walker','runner','brute'].includes(e.kind));}
});
