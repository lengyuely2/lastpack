import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,addPlayer,itemRewardWeight,rollItemReward,ITEMS,itemRarity,grantExperience,weaponStats,weaponCategory,fits,eligibleFusions} from '../shared/game.mjs';
import {chooseAutoReward} from '../shared/auto-rewards.mjs';
function player(weapons){const p=addPlayer(createRoom('AFFINITY',9),'p','玩家');p.weapons=weapons;p.weaponTiers=[1,1];return p;}
test('equipped weapons increase matching magic, explosion, reload and healing weights',()=>{
 const pistol=player(['pistol',null]),mage=player(['meteorbook',null]),healer=player(['scissors',null]);
 for(const k of ['spellbook','rune','manabottle'])assert.ok(itemRewardWeight(mage,k)>itemRewardWeight(pistol,k));
 for(const k of ['powder','blastheart'])assert.ok(itemRewardWeight(mage,k)>itemRewardWeight(pistol,k));
 assert.ok(itemRewardWeight(pistol,'loader')>itemRewardWeight(mage,'loader'));
 for(const k of ['bloodbag','bandage','soup'])assert.ok(itemRewardWeight(healer,k)>itemRewardWeight(pistol,k));
 assert.ok(itemRewardWeight(player(['knife',null]),'ghostshoe')>itemRewardWeight(pistol,'ghostshoe'));
});
test('two different weapon affinities coexist, duplicates do not multiply, reserves do not count',()=>{
 const hybrid=player(['rifle','meteorbook']),p=player(['meteorbook',null]),double=player(['meteorbook','meteorbook']);
 assert.equal(itemRewardWeight(hybrid,'spellbook'),4);assert.equal(itemRewardWeight(hybrid,'loader'),4);
 for(const k of Object.keys(ITEMS))assert.equal(itemRewardWeight(p,k),itemRewardWeight(double,k));
 const ordinary=player(['pistol',null]);ordinary.weaponStash=[{id:'reserve',kind:'meteorbook',tier:4}];assert.equal(itemRewardWeight(ordinary,'spellbook'),1);
 ordinary.weapons[0]='meteorbook';assert.equal(itemRewardWeight(ordinary,'spellbook'),4);
});
test('weighted sampling preserves rarity, exact relative frequencies and off-build possibilities',()=>{
 for(const p of [player(['pistol',null]),player(['meteorbook','scissors']),player([null,null])])for(let tier=1;tier<=4;tier++){
  const pool=Object.keys(ITEMS).filter(k=>itemRarity(k)===tier),total=pool.reduce((s,k)=>s+itemRewardWeight(p,k),0),counts={};
  for(let n=0;n<total*100;n++){const k=rollItemReward(p,tier,()=>(n+.5)/(total*100));assert.equal(itemRarity(k),tier);counts[k]=(counts[k]||0)+1;}
  for(const k of pool){assert.ok(itemRewardWeight(p,k)>=1);assert.equal(counts[k],itemRewardWeight(p,k)*100);}
 }
});
test('real upgrade draws use equipped affinities once, and gear changes do not reroll shown offers',()=>{
 const room=createRoom('REAL-AFFINITY',5,true),p=addPlayer(room,'p','玩家');p.weapons=['meteorbook',null];let draws=0;room.random=()=>{draws++;return .2;};p.pendingUpgrades=1;grantExperience(room,1);
 assert.equal(draws,6);assert.equal(p.rewards[2],rollItemReward(p,1,()=>.2));const offered=structuredClone(p.rewards);
 p.weapons=['pistol',null];grantExperience(room,1);assert.deepEqual(p.rewards,offered);assert.equal(draws,6);
});
test('automatic replacement retains ranged coverage unless a melee preference is explicit',()=>{
 const p=player(['rifle','knife']);p.weaponTiers=[1,4];p.rewards=[{type:'weapon',kind:'knife',tier:4}];p.rewardPending=true;p.autoRewards={...p.autoRewards,enabled:true,equipBetter:true};
 const api={weaponStats,weaponCategory,ITEMS,itemRarity,fits,eligibleFusions};assert.equal(chooseAutoReward(p,api).replaceSlot,null);
 p.autoRewards.category='基础近战';assert.equal(chooseAutoReward(p,api).replaceSlot,0);
});
