import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {ProfileStore} from '../profile-store.mjs';
import {freshProfile,forgeQuote,forgeTraining,goldDrop,settleProfile,publicProfile,profileBonus,runSummary} from '../shared/progression.mjs';
import {createRoom,addPlayer,startWave,tick,action} from '../shared/game.mjs';
const id=n=>`${String(n).padStart(8,'0')}-0000-0000-0000-000000000000`;
const summary=(gold,extra={})=>({id:'gold-run',outcome:'defeat',time:60,kills:10,bosses:0,level:3,weapons:[],items:[],gold,...extra});
test('forge odds exhaust 100%, costs scale and every training tier has a jackpot',()=>{
  let oldCost=0;for(let level=0;level<5;level++){const q=forgeQuote('damage',level);assert.equal(q.up+q.jackpot+q.down+q.stay,100);assert.ok(q.cost>oldCost);oldCost=q.cost;assert.ok(q.jackpot>0);}
  assert.equal(forgeQuote('damage',5),null);assert.equal(forgeQuote('bad',0),null);assert.equal(forgeQuote('damage',-1),null);
});
test('all forge outcomes charge exactly once, clamp levels and change actual permanent bonuses',()=>{
  for(const [roll,outcome,to]of [[0,'jackpot',5],[.1,'up',4],[.5,'down',2],[.99,'stay',3]]){const p=freshProfile();p.gold=10000;p.training.damage=3;const q=forgeQuote('damage',3),result=forgeTraining(p,'damage',id(1),()=>roll);assert.equal(result.outcome,outcome);assert.equal(p.training.damage,to);assert.equal(p.gold,10000-q.cost);assert.equal(profileBonus(p).damage,to*.03);assert.deepEqual(forgeTraining(p,'damage',id(1),()=>{throw Error('reroll');}),result);assert.equal(p.gold,10000-q.cost);}
  const p=freshProfile();p.gold=1000;assert.equal(forgeTraining(p,'health',id(2),()=>.99).to,0);assert.throws(()=>forgeTraining(p,'bad',id(3),()=>0));assert.throws(()=>forgeTraining(p,'health','bad',()=>0));p.gold=0;assert.throws(()=>forgeTraining(p,'health',id(4),()=>0),/金币不足/);assert.equal(p.training.health,0);
  p.gold=1000;p.training.health=5;assert.throws(()=>forgeTraining(p,'health',id(5),()=>.5),/满级/);assert.equal(p.gold,1000);
});
test('kill gold is random, scales monotonically with survival, weights monsters and caps growth',()=>{
  const e={kind:'walker'};assert.equal(goldDrop(e,0,()=>.12),0);assert.equal(goldDrop(e,0,()=>.119),2);
  assert.deepEqual([0,300,600,1200].map(t=>goldDrop(e,t,()=>0)),[2,5,9,18]);
  assert.equal(goldDrop(e,1800,()=>0),goldDrop(e,99999,()=>0));assert.equal(goldDrop({kind:'boss'},600,()=>.99),72);assert.equal(goldDrop({...e,elite:true},0,()=>.44),6);assert.equal(goldDrop({...e,elite:true},0,()=>.45),0);
});
test('campaign kills share gold with the team, retirement blocks future coins and restart clears run wallet',()=>{
  const r=createRoom('GOLD',12,false,true,true),p=addPlayer(r,'p','甲'),q=addPlayer(r,'q','乙');p.weapons=q.weapons=[null,null];p.controlMode=q.controlMode='manual';startWave(r);r.nextSpawn=1e9;r.total=1e9;r.goldRandom=()=>0;
  function kill(){r.enemies.push({id:'test'+r.kills,kind:'walker',hp:.001,maxHp:1,x:600,y:300,radius:10,speed:0,damage:0,attack:0,slow:0,burn:1,burnDps:10,burnOwner:p.id});tick(r,.1);}
  kill();assert.equal(p.runGold,2);assert.equal(q.runGold,2);assert.ok(r.effects.some(e=>e.type==='gold'));assert.equal(runSummary(r,p).gold,2);q.retired=true;kill();assert.equal(q.runGold,2);assert.equal(p.runGold,4);
  r.phase='defeat';action(r,p,{type:'restart'});assert.equal(r.players[0].runGold,0);
});
test('gold settlement survives repeat, endless deltas and stale summaries without paying twice',()=>{
  const p=freshProfile();assert.equal(settleProfile(p,summary(80)).goldAwarded,80);assert.equal(p.gold,80);assert.equal(settleProfile(p,summary(80)).goldAwarded,0);assert.equal(settleProfile(p,summary(120,{time:120})).goldAwarded,40);assert.equal(settleProfile(p,summary(80)).goldAwarded,0);assert.equal(p.gold,120);assert.equal(p.lifetimeGold,120);assert.equal(p.history[0].gold,120);assert.equal('forgeLedger'in publicProfile(p),false);
});
test('legacy saves migrate, atomic forging rolls back on failed writes and concurrent requests cannot overspend',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'lastpack-forge-'));try{
    const file=path.join(dir,'p.json'),token='a'.repeat(48),legacy=freshProfile();delete legacy.gold;delete legacy.lifetimeGold;delete legacy.forgeLedger;legacy.training.health=2;legacy.scrap=99;
    await writeFile(file,JSON.stringify({version:1,profiles:[[token,legacy]]}));const store=await new ProfileStore(file).load();assert.equal(store.get(token).gold,0);assert.equal(store.get(token).training.health,2);assert.equal(store.get(token).scrap,99);
    await store.settle(token,summary(40));const write=store.write.bind(store);store.write=async()=>{throw Error('disk failure');};await assert.rejects(store.forge(token,'damage',id(10)));assert.equal(store.get(token).gold,40);assert.equal(store.get(token).training.damage,0);store.write=write;
    const results=await Promise.allSettled([store.forge(token,'damage',id(11)),store.forge(token,'pickup',id(12))]);assert.equal(results.filter(v=>v.status==='fulfilled').length,1);assert.equal(store.get(token).gold,0);const winner=results.find(v=>v.status==='fulfilled').value.result;
    const repeated=await store.forge(token,winner.key,winner.id);assert.deepEqual(repeated.result,winner);assert.equal(store.get(token).gold,0);const reopened=await new ProfileStore(file).load();assert.deepEqual(reopened.get(token).lastForge,winner);assert.equal(reopened.get(token).gold,0);
  }finally{await rm(dir,{recursive:true,force:true});}
});
