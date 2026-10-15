import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,addPlayer,startWave,grantExperience,action,tick,stats,WEAPONS,ITEMS,weaponStats,weaponCategory,itemRarity,fits,eligibleFusions} from '../shared/game.mjs';
import {chooseAutoReward,validateAutoRewards} from '../shared/auto-rewards.mjs';
import {automaticDirection,hazardClearance} from '../shared/auto-movement.mjs';
import {spawnTimedBoss,tickSurvival} from '../shared/survival.mjs';
const api={weaponStats,weaponCategory,ITEMS,itemRarity,fits,eligibleFusions};
function fixture(team=false){const r=createRoom('AUTO',17,!team,true,true),p=addPlayer(r,'p','玩家'),q=team?addPlayer(r,'q','队友'):null;startWave(r);r.nextSpawn=1e9;r.total=100;return {r,p,q};}
function enable(r,p,patch={}){action(r,p,{type:'autoRewards',settings:{enabled:true,delay:2,...patch}});}
function reward(r,p,choices){grantExperience(r,5);tick(r,.1);p.rewards=choices;}
test('manual remains default; countdown honors manual override and turning automation off',()=>{
  const {r,p}=fixture();reward(r,p,[{type:'weapon',kind:'rifle',tier:2},'armor','coffee']);tick(r,9);assert.equal(p.pendingUpgrades,1);assert.deepEqual(p.weapons,['pistol',null]);enable(r,p);tick(r,1);assert.equal(p.pendingUpgrades,1);action(r,p,{type:'reward',index:1});tick(r,3);assert.equal(p.pendingUpgrades,0);assert.equal(p.items[0].kind,'armor');assert.deepEqual(p.weapons,['pistol',null]);
  grantExperience(r,10);tick(r,.1);enable(r,p);tick(r,1);action(r,p,{type:'autoRewards',settings:{enabled:false}});tick(r,3);assert.equal(p.pendingUpgrades,1);
});
test('server automatically claims queued rewards once each, resumes without ready and remembers settings on replay',()=>{
  const {r,p}=fixture();enable(r,p,{allowMerge:true});action(r,p,{type:'autoStrategy',strategy:'aggressive'});grantExperience(r,15);tick(r,.1);const time=r.survivalTime;assert.equal(p.pendingUpgrades,2);tick(r,2);assert.equal(p.pendingUpgrades,1);assert.equal(r.phase,'upgrade');tick(r,2);assert.equal(p.pendingUpgrades,0);assert.equal(r.phase,'battle');assert.equal(r.survivalTime,time,'time spent choosing never advances the boss deadline');tick(r,.1);assert.ok(r.survivalTime>time);assert.ok(p.lastAutoReward);r.phase='defeat';action(r,p,{type:'restart'});const fresh=r.players[0];assert.equal(fresh.autoRewards.enabled,true);assert.equal(fresh.autoRewards.allowMerge,true);assert.equal(fresh.autoStrategy,'aggressive');assert.deepEqual(fresh.weapons,['pistol',null]);assert.equal(fresh.autoRewardElapsed,0);
});
test('auto and manual teammates are independent and an offline player is not auto-awarded',()=>{
  const {r,p,q}=fixture(true);enable(r,p);grantExperience(r,5);tick(r,.1);const time=r.survivalTime;tick(r,2);assert.equal(p.pendingUpgrades,0);assert.equal(q.pendingUpgrades,1);assert.equal(r.phase,'upgrade');assert.equal(r.survivalTime,time);enable(r,q);q.connected=false;tick(r,5);assert.equal(q.pendingUpgrades,1);q.connected=true;tick(r,2);assert.equal(r.phase,'battle');
});
test('duplicate guns remain separate by default; merge and boss fusion require explicit opt-in and valid ingredients',()=>{
  const {r,p}=fixture();enable(r,p);reward(r,p,[{type:'weapon',kind:'pistol',tier:1}]);tick(r,2);assert.deepEqual(p.weapons,['pistol','pistol']);assert.deepEqual(p.weaponTiers,[1,1]);enable(r,p,{allowMerge:true});grantExperience(r,10);tick(r,.1);p.rewards=[{type:'weapon',kind:'pistol',tier:1}];tick(r,2);assert.equal(p.weaponTiers[0],2);
  p.weapons=['laser','rocket'];p.weaponTiers=[4,4];p.rewardPending=true;p.pendingUpgrades=1;p.rewardSource='boss';p.rewards=[{type:'fusion',kind:'orbital',tier:4}];p.autoRewardElapsed=0;r.phase='upgrade';assert.equal(chooseAutoReward(p,api).blocked,true);tick(r,2);assert.deepEqual(p.weapons,['laser','rocket']);enable(r,p,{allowFusion:true});tick(r,2);assert.ok(p.weapons.includes('orbital'));assert.equal(p.fusions,1);assert.equal(p.weapons.filter(Boolean).length,1);
  p.rewards=[{type:'fusion',kind:'orbital',tier:4}];p.rewardPending=true;p.rewardSource='boss';assert.equal(chooseAutoReward(p,api).blocked,true);
});
test('weapon upgrade equips the actual stronger award and preserves old weapon; item attaches to a nonempty slot',()=>{
  const {r,p}=fixture();p.weapons=['pistol','pistol'];enable(r,p,{preferOwned:false});reward(r,p,[{type:'weapon',kind:'rifle',tier:4}]);tick(r,2);assert.ok(p.weapons.includes('rifle'));assert.equal(p.weaponStash.length,1);assert.equal(p.weaponStash[0].kind,'pistol');
  p.weapons=[null,'rifle'];p.weaponTiers=[1,4];p.pendingUpgrades=1;p.rewardPending=true;p.rewards=['trigger'];p.autoRewardElapsed=0;r.phase='upgrade';tick(r,2);assert.equal(p.items[0].target,1);assert.notEqual(p.items[0].x,null);assert.ok(stats(p).weapons[1].interval<weaponStats('rifle',4).interval);
});
test('build and category preferences change actual choices, finite validated settings reject malformed input',()=>{
  const {p}=fixture();p.weapons=['rifle','rifle'];p.weaponTiers=[4,4];p.rewardPending=true;p.rewards=['armor','coffee','propellerhat'];
  p.autoRewards=validateAutoRewards({enabled:true,build:'sustain'});assert.equal(chooseAutoReward(p,api).index,0);p.autoRewards.build='firepower';assert.equal(chooseAutoReward(p,api).index,1);p.autoRewards.build='growth';assert.equal(chooseAutoReward(p,api).index,2);
  p.weapons=['pistol',null];p.weaponTiers=[1,1];p.rewards=[{type:'weapon',kind:'rifle',tier:2},{type:'weapon',kind:'wand',tier:2}];p.autoRewards.category='元素控制';assert.equal(chooseAutoReward(p,api).index,1);
  for(const settings of [{enabled:1},{delay:0},{delay:NaN},{delay:3.1},{build:'cheat'},{fullInventory:'discard'},null,[]])assert.throws(()=>validateAutoRewards(settings));
});
test('full bag/reserve pauses safely by default; optional skip neither deletes inventory nor grants loot',()=>{
  const {r,p}=fixture();enable(r,p);p.weapons=['pistol','pistol'];p.weaponStash=Array.from({length:12},(_,n)=>({id:'w'+n,kind:'pistol',tier:1}));p.items=Array.from({length:30},(_,n)=>({id:'i'+n,kind:'coffee',x:n%6,y:Math.floor(n/6),target:0}));p.items.push(...Array.from({length:16},(_,n)=>({id:'s'+n,kind:'coffee',x:null,y:null,target:0})));reward(r,p,[{type:'weapon',kind:'pistol',tier:1},'armor','coffee']);const inventory=JSON.stringify([p.items,p.weaponStash,p.weapons]);tick(r,3);assert.equal(p.pendingUpgrades,1);assert.match(p.autoRewardStatus,/库存/);assert.equal(JSON.stringify([p.items,p.weaponStash,p.weapons]),inventory);enable(r,p,{fullInventory:'skip'});tick(r,2);assert.equal(p.pendingUpgrades,0);assert.equal(r.phase,'battle');assert.equal(JSON.stringify([p.items,p.weaponStash,p.weapons]),inventory);
});
test('aggressive walks to distant treasure; conservative holds and returns to its chosen ground',()=>{
  const {r,p}=fixture();p.x=400;p.y=300;p.guardAnchor={x:400,y:300};r.chests=[{x:800,y:300}];p.autoStrategy='aggressive';assert.ok(automaticDirection(r,p,stats(p),[],null,[p]).x>0);p.autoStrategy='conservative';assert.deepEqual(automaticDirection(r,p,stats(p),[],null,[p]),{x:0,y:0});p.x=500;assert.ok(automaticDirection(r,p,stats(p),[],null,[p]).x<0);r.chests=[{x:450,y:300}];p.x=400;assert.ok(automaticDirection(r,p,stats(p),[],null,[p]).x>0);
});
test('automatic strategy settings leave manual direction intact; reentering auto captures current ground',()=>{
  const {r,p}=fixture();action(r,p,{type:'controlMode',mode:'manual'});action(r,p,{type:'move',x:1,y:0});action(r,p,{type:'autoStrategy',strategy:'conservative'});const x=p.x;tick(r,.1);assert.ok(p.x>x);action(r,p,{type:'controlMode',mode:'auto'});assert.deepEqual(p.guardAnchor,{x:p.x,y:p.y});const strategy=p.autoStrategy;assert.throws(()=>action(r,p,{type:'autoStrategy',strategy:'cheat'}));assert.equal(p.autoStrategy,strategy);
});
test('overlapping boss hazards cannot cancel an escape; safe ring centre is correctly recognized',()=>{
  const {r,p}=fixture();p.x=400;p.y=300;r.chests=[{x:400,y:300}];r.hazards=[{shape:'circle',x:375,y:300,radius:65,remaining:1.5},{shape:'circle',x:425,y:300,radius:65,remaining:1.5}];for(const strategy of ['aggressive','conservative']){p.autoStrategy=strategy;const d=automaticDirection(r,p,stats(p),[],null,[p]);assert.ok(Math.hypot(d.x,d.y)>.9);assert.ok(Math.abs(d.y)>.8);const future={x:p.x+d.x*stats(p).move*1.4,y:p.y+d.y*stats(p).move*1.4};assert.ok(r.hazards.every(h=>hazardClearance(future,h)>0));}
  const ring={shape:'ring',x:400,y:300,radius:150,remaining:1.5};assert.equal(hazardClearance(p,ring),128);r.hazards=[ring];r.chests=[];p.autoStrategy='conservative';p.guardAnchor={x:p.x,y:p.y};assert.deepEqual(automaticDirection(r,p,stats(p),[],null,[p]),{x:0,y:0});
});
test('three strengthened campaign bosses retain timed entries and distinct telegraphed signature attacks',()=>{
  const patterns=[];
  for(let variant=0;variant<3;variant++){const {r,p}=fixture();r.bossCount=variant;const b=spawnTimedBoss(r,(r,e)=>r.effects.push(e));assert.equal(b.maxHp,5200+variant*2600);assert.ok(b.maxHp>(1500+variant*600)*3);b.skillTimer=0;b.hp=b.maxHp*.25;tickSurvival(r,.7,{effect(r,e){r.effects.push(e);},stats});assert.equal(b.stage,3);assert.ok(r.hazards.length>=2);assert.ok(r.hazards.every(h=>h.duration>=1.1&&h.remaining>0));patterns.push(r.hazards.map(h=>[h.shape,h.rush||false,h.aim!==undefined]));assert.equal(p.hp,100);}
  assert.notDeepEqual(patterns[0],patterns[1]);assert.notDeepEqual(patterns[1],patterns[2]);
});
