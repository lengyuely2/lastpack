import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {ProfileStore} from '../profile-store.mjs';
import {freshProfile,settleProfile,buyTraining,selectCharacter,profileBonus,runSummary,TRAINING} from '../shared/progression.mjs';
import {createRoom,addPlayer,startWave,tick,action,stats,hurtPlayer,grantExperience} from '../shared/game.mjs';
import {campaignPacing} from '../shared/campaign.mjs';
import {simulate} from '../docs/balance-simulation.mjs';
const summary=(extra={})=>({id:'run-1',outcome:'defeat',time:600,kills:300,teamKills:300,bosses:1,level:18,damage:40000,healing:10,revives:0,fusions:0,weapons:[{kind:'pistol',tier:4}],items:[],...extra});
test('earned scrap, unlocks and repeated/endless settlements pay only the delta',()=>{
  const p=freshProfile();const first=settleProfile(p,summary());assert.equal(first.awarded,50);assert.deepEqual(first.unlocks,['gunner','courier','medic']);assert.equal(p.records.runs,1);
  assert.equal(settleProfile(p,summary()).awarded,0);assert.equal(p.records.kills,300);assert.equal(p.scrap,50);
  const won=settleProfile(p,summary({outcome:'victory',time:1200,kills:600,bosses:3}));assert.equal(won.awarded,105);assert.equal(p.scrap,155);assert.equal(p.records.wins,1);
  const endless=settleProfile(p,summary({outcome:'defeat',time:1500,kills:800,bosses:4}));assert.equal(endless.awarded,35);assert.equal(p.records.wins,1);assert.equal(p.records.runs,1);assert.equal(p.records.kills,800);assert.equal(p.history.length,1);
  assert.equal(settleProfile(freshProfile(),summary({time:0,kills:0,bosses:0})).awarded,0,'restarting immediately never gives free currency');
});
test('training is purchased, capped, bounded and applied to actual combat stats without free gear',()=>{
  const profile=freshProfile();assert.throws(()=>buyTraining(profile,'damage'),/零件不足/);assert.throws(()=>selectCharacter(profile,'medic'),/未解锁/);profile.scrap=10000;
  for(const key of Object.keys(TRAINING)){for(let n=0;n<5;n++)buyTraining(profile,key);assert.throws(()=>buyTraining(profile,key));}
  assert.deepEqual(profileBonus(profile),{health:20,damage:.15,speed:.1,pickup:25,regen:.2,xp:.1,armor:.1,move:.1,area:.15,duration:.2,luck:.1,greed:.2});
  const r=createRoom('META',1,true,true,true),p=addPlayer(r,'p','玩家');p.metaBonus=profileBonus(profile);const s=stats(p);assert.equal(s.maxHp,120);assert.equal(s.pickupRadius,120);assert.equal(s.regen,.2);assert.equal(s.xpBonus,.1);assert.equal(p.items.length,0);assert.deepEqual(p.weapons,['pistol',null]);assert.ok(s.weapons[0].damage>weaponBase(r));
  function weaponBase(){const q=addPlayer(createRoom('BASE',1,true,true,true),'q','玩家');return stats(q).weapons[0].damage;}
});
test('durable profile storage keeps purchases and records after reloading; secrets stay out of public profiles',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'lastpack-meta-'));try{const file=path.join(dir,'profiles.json'),store=await new ProfileStore(file).load(),opened=await store.open();await store.settle(opened.token,summary());await store.upgrade(opened.token,'health');await store.character(opened.token,'medic');const recovered=await new ProfileStore(file).load(),p=(await recovered.open(opened.token)).profile;assert.equal(p.scrap,25);assert.equal(p.training.health,1);assert.equal(p.character,'medic');assert.equal(p.records.kills,300);assert.equal('ledger'in p,false);assert.equal(p.history.length,1);assert.equal(JSON.parse(await readFile(file,'utf8')).profiles.length,1);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('failed writes preserve currency/levels and concurrent purchases cannot overspend',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'lastpack-atomic-'));try{const store=await new ProfileStore(path.join(dir,'p.json')).load(),{token}=await store.open();await store.settle(token,summary());const write=store.write.bind(store);store.write=async()=>{throw Error('disk failure');};await assert.rejects(store.upgrade(token,'health'));assert.equal(store.get(token).scrap,50);assert.equal(store.get(token).training.health,0);store.write=write;
    const results=await Promise.allSettled([store.upgrade(token,'health'),store.upgrade(token,'health')]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(store.get(token).scrap,25);assert.equal(store.get(token).training.health,1);
  }finally{await rm(dir,{recursive:true,force:true});}
});
test('campaign has timed pressure/breathers, short upgrade power and real invulnerability',()=>{
  assert.equal(campaignPacing(70).surge,false);assert.equal(campaignPacing(80).surge,true);assert.equal(campaignPacing(92).breather,true);assert.ok(campaignPacing(1190).health>campaignPacing(0).health);
  const r=createRoom('CAMPAIGN',2,true,true,true),p=addPlayer(r,'p','玩家');startWave(r);r.nextSpawn=1e9;r.total=1;const normal=stats(p).weapons[0].damage;grantExperience(r,5);tick(r,.1);action(r,p,{type:'skipReward'});assert.equal(p.powerTimer,3);assert.ok(stats(p).weapons[0].damage>normal*1.6);assert.equal(hurtPlayer(r,p,20),0);tick(r,1.1);assert.equal(hurtPlayer(r,p,20),20);assert.equal(hurtPlayer(r,p,20),0);for(let n=0;n<30;n++)tick(r,.1);assert.equal(p.powerTimer,0);assert.equal(stats(p).weapons[0].damage,normal);
});
test('final boss requires victory plus chest/rewards, then unanimous endless continuation',()=>{
  const r=createRoom('FINAL',3,false,true,true),p=addPlayer(r,'p','队长'),q=addPlayer(r,'q','队友');startWave(r);r.survivalTime=1199.9;r.bossCount=2;r.nextBossAt=1200;r.nextSpawn=1e9;p.weapons=q.weapons=[null,null];tick(r,.1);const b=r.enemies.find(e=>e.kind==='boss');assert.equal(b.encounter,3);b.hp=.01;b.burn=1;b.burnDps=1;b.burnOwner=p.id;p.x=b.x;p.y=b.y;q.x=b.x;q.y=b.y;tick(r,.1);assert.equal(r.finalBossDefeated,true);assert.equal(r.phase,'upgrade');while(p.pendingUpgrades)action(r,p,{type:'skipReward'});assert.equal(r.phase,'upgrade');while(q.pendingUpgrades)action(r,q,{type:'skipReward'});tick(r,.1);assert.equal(r.phase,'victory');assert.equal(runSummary(r,p).outcome,'victory');action(r,p,{type:'continueEndless'});assert.equal(r.phase,'victory');action(r,q,{type:'continueEndless'});assert.equal(r.phase,'battle');assert.equal(r.endless,true);r.survivalTime=1499.9;tick(r,.1);assert.equal(r.bossCount,4);assert.equal(r.nextBossAt,1800);
  r.phase='defeat';r.settledPhase='defeat';r.nextEliteAt=1500;q.retired=true;p.character='medic';p.metaBonus={regen:.25};action(r,p,{type:'restart'});assert.equal(r.campaign,true);assert.equal(r.endless,false);assert.equal(r.players[0].character,'medic');assert.equal(stats(r.players[0]).regen,.25);assert.equal(r.bossCount,0);assert.equal(r.settledPhase,null);assert.equal(r.nextEliteAt,180);assert.equal(r.players.length,1);
});
test('campaign supplies require approach and heal a wounded player, flash/kill streaks have real lifetimes',()=>{
  const r=createRoom('FOOD',4,true,true,true),p=addPlayer(r,'p','玩家');startWave(r);r.nextSpawn=1e9;r.total=1;p.controlMode='manual';p.hp=50;r.supplies=[{id:'food',x:p.x,y:p.y,heal:8}];tick(r,.1);assert.equal(p.hp,58);assert.equal(p.healing,8);assert.equal(r.supplies.length,0);r.streak=25;r.streakTimer=.1;tick(r,.2);assert.equal(r.streak,0);
});
test('offline pending rewards cannot strand final victory or reopen an unclaimable reward after reconnect',()=>{
  const r=createRoom('OFFLINE-FINAL',1,false,true,true),p=addPlayer(r,'p','队长'),q=addPlayer(r,'q','队友');startWave(r);p.weapons=q.weapons=[null,null];q.connected=false;r.finalBossDefeated=true;r.survivalTime=1220;r.bossCount=3;r.chests=[];r.nextSpawn=1e9;r.total=1;grantExperience(r,5);tick(r,.1);assert.equal(r.phase,'upgrade');while(p.pendingUpgrades)action(r,p,{type:'skipReward'});assert.ok(q.pendingUpgrades);tick(r,.1);assert.equal(r.phase,'victory');assert.equal(q.pendingUpgrades,0);assert.equal(q.rewardPending,false);assert.deepEqual(q.rewards,[]);
});
test('zero-meta earned builds can finish all three bosses; declining every reward cannot coast to victory',()=>{
  // A changed opening changes reward RNG and build composition. Measure a fixed cohort,
  // rather than requiring every random build to win regardless of its weapons.
  const builds=[1,2,3,4,5,6,7,8,17,42,99].map(seed=>simulate(seed));
  assert.ok(builds.filter(b=>b.outcome==='victory').length>=4,'several zero-meta builds must still clear the campaign');
  for(const build of builds){assert.ok(build.firstUpgrade<=20);if(build.outcome==='victory'){assert.equal(build.bosses,3);assert.ok(build.time<1300);assert.ok(build.level>=25);}}
  for(const seed of [17,42,99]){const skipped=simulate(seed,1,'skip');assert.equal(skipped.outcome,'defeat');assert.equal(skipped.bosses,0);assert.ok(skipped.time<900);assert.ok(builds.reduce((n,b)=>n+b.time,0)/builds.length>skipped.time);}
  for(const crew of [2,4]){const run=simulate(42,crew);assert.equal(run.outcome,'victory');assert.equal(run.bosses,3);assert.ok(run.hp.some(h=>h>0));}
});
test('auto-placement rotates into available space and rejects a full bag without losing the item',()=>{
  const r=createRoom('BAG',1,true),p=addPlayer(r,'p','玩家');p.items=[{id:'i',kind:'battery',x:null,y:null,rotated:false,target:0}];action(r,p,{type:'autoPlace',id:'i'});assert.equal(p.items[0].x,0);assert.equal(p.items[0].y,0);
  p.items=Array.from({length:30},(_,n)=>({id:'fill'+n,kind:'battery',x:n%6,y:Math.floor(n/6),rotated:false,target:0}));p.items.push({id:'outside',kind:'battery',x:null,y:null,rotated:false,target:0});assert.throws(()=>action(r,p,{type:'autoPlace',id:'outside'}));assert.equal(p.items.at(-1).x,null);
});
