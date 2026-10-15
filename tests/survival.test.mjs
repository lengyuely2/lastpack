import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,addPlayer,startWave,tick,stats,grantExperience,action,bagCombos,weaponStats} from '../shared/game.mjs';
import {difficulty,tickSurvival,pointSegment} from '../shared/survival.mjs';
import {createGraphics} from '../public/graphics.mjs';
function fixture(){const r=createRoom('TEST',17,true,true),p=addPlayer(r,'p','测试');startWave(r);p.weapons=[null,null];p.controlMode='manual';r.nextSpawn=1e6;r.total=1;r.spawned=0;return {r,p};}
const api={effect(r,e){r.effects.push({id:++r.serial,...e});},stats};
test('bosses appear at 600, 900 and 1200 combat seconds; upgrades freeze the schedule',()=>{
  const {r,p}=fixture();r.survivalTime=599.8;tick(r,.1);assert.equal(r.bossCount,0);tick(r,.1);assert.equal(r.bossCount,1);assert.equal(r.nextBossAt,900);
  grantExperience(r,5);tick(r,.1);assert.equal(r.phase,'upgrade');const time=r.survivalTime;tick(r,20);assert.equal(r.survivalTime,time);action(r,p,{type:'reward',index:0});assert.equal(r.phase,'battle');
  r.survivalTime=899.9;tick(r,.1);assert.equal(r.bossCount,2);r.survivalTime=1199.9;tick(r,.1);assert.equal(r.bossCount,3);assert.deepEqual(r.enemies.filter(e=>e.kind==='boss').map(e=>e.name),['墓园钟主','铁棺暴君','红月审判官']);assert.equal(r.nextBossAt,1500);
});
test('continuous waves preserve time, wounded HP, weapon ammo and next boss deadline',()=>{
  const {r,p}=fixture();p.weapons=['pistol',null];p.hp=62;p.shots[0].ammo=7;r.survivalTime=500;r.spawned=r.total;
  tick(r,.1);assert.equal(r.wave,2);assert.equal(r.phase,'battle');assert.equal(r.survivalTime,500.1);assert.equal(p.hp,62);assert.equal(p.shots[0].ammo,7);assert.equal(r.nextBossAt,600);
  r.wave=6;r.spawned=r.total;tick(r,.1);assert.equal(r.wave,7);assert.equal(r.phase,'battle');
});
test('boss thresholds create stage effects, summons and real delayed skills',()=>{
  const {r,p}=fixture();r.survivalTime=599.9;tick(r,.1);const b=r.enemies[0];b.hp=b.maxHp*.55;tick(r,.1);assert.equal(b.stage,2);assert.ok(r.effects.some(e=>e.type==='bossStage'));assert.ok(r.enemies.length>1);
  b.hp=b.maxHp*.25;b.skillTimer=0;tick(r,.1);assert.equal(b.stage,3);for(let i=0;i<8;i++)tick(r,.1);assert.ok(r.hazards.length);assert.ok(r.hazards.every(h=>h.remaining>0));assert.equal(p.hp,100);
});
test('telegraphs hit only on resolution, respect shape, mitigation and dead owners',()=>{
  const {r,p}=fixture();const e={id:'owner',kind:'walker',hp:100,x:0,y:0};r.enemies=[e];p.x=300;p.y=300;
  r.hazards=[{owner:e.id,shape:'circle',x:300,y:300,radius:50,damage:20,remaining:1,duration:1}];tickSurvival(r,.5,api);assert.equal(p.hp,100);tickSurvival(r,.5,api);assert.equal(p.hp,80);
  r.hazards=[{owner:e.id,shape:'ring',x:300,y:300,radius:100,damage:20,remaining:.1,duration:1}];tickSurvival(r,.1,api);assert.equal(p.hp,80,'ring centre is safe');
  p.x=400;r.hazards=[{owner:e.id,shape:'ring',x:300,y:300,radius:100,damage:20,remaining:.1,duration:1}];tickSurvival(r,.1,api);assert.equal(p.hp,60);
  e.hp=0;r.hazards=[{owner:e.id,shape:'circle',x:400,y:300,radius:100,damage:20,remaining:.1,duration:1}];tickSurvival(r,.1,api);assert.equal(p.hp,60);
  assert.equal(pointSegment(5,2,{x:0,y:0},{x:10,y:0}),2);
});
test('runner, brute and caster have separate telegraphed attacks; projectiles use swept collisions',()=>{
  const {r,p}=fixture();p.x=400;p.y=300;
  r.enemies=['runner','brute','caster'].map((kind,n)=>({id:'e'+n,kind,hp:100,x:300,y:300,skillTimer:0,windup:0}));tickSurvival(r,.1,api);
  assert.deepEqual(new Set(r.hazards.map(h=>h.shape)),new Set(['line','circle','burst']));assert.equal(r.hostileShots.length,0);p.x=800;for(let n=0;n<15;n++)tickSurvival(r,.1,api);assert.ok(r.hostileShots.length>0);assert.equal(r.enemies[0].x,460);
  r.hazards=[];r.enemies=[];p.x=400;p.y=300;r.hostileShots=[{x:350,y:300,vx:1000,vy:0,life:3,damage:10}];const hp=p.hp;tickSurvival(r,.1,api);assert.equal(p.hp,hp-10);assert.equal(r.hostileShots.length,0);
});
test('boss kills award XP and recovery without ending the run',()=>{
  const {r,p}=fixture();r.survivalTime=599.9;tick(r,.1);const b=r.enemies[0];p.hp=40;b.hp=.05;b.burn=2;b.burnDps=1;b.burnOwner=p.id;tick(r,.1);assert.equal(r.bossKills,1);assert.equal(p.hp,70);assert.ok(r.gems.some(g=>g.value===100));assert.equal(r.phase,'battle');assert.ok(r.effects.some(e=>e.type==='bossDown'));
});
test('adjacent combinations change real stats and exclude diagonals, stash and mismatched targets',()=>{
  const {p}=fixture();p.weapons=['pistol','pistol'];p.items=[{id:'a',kind:'battery',x:0,y:0,target:0},{id:'b',kind:'trigger',x:4,y:0,target:0}];const normal=stats(p).weapons[0].interval;p.items[1].x=1;assert.ok(bagCombos(p).length);assert.ok(Math.abs(stats(p).weapons[0].interval-normal/1.12)<1e-8);p.items[1].target=1;assert.equal(bagCombos(p).length,0);p.items[1].target=0;p.items[1].x=null;assert.equal(bagCombos(p).length,0);p.items[1].x=1;p.items[1].y=3;assert.equal(bagCombos(p).length,0);
  p.items=[{id:'c',kind:'armor',x:0,y:0,target:0},{id:'d',kind:'ducttape',x:2,y:0,target:0}];assert.equal(stats(p).maxHp,150);assert.ok(Math.abs(stats(p).damageReduction-.17)<1e-8);
});
test('difficulty unlocks threats gradually; graphics preferences validate and persist',()=>{
  assert.equal(difficulty(119).runner,false);assert.equal(difficulty(120).runner,true);assert.equal(difficulty(240).brute,true);assert.equal(difficulty(360).caster,true);assert.ok(difficulty(1200).health>difficulty(600).health);assert.ok(difficulty(1e9,4).cap<=220);
  const data=new Map(),g=createGraphics({getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)});g.update({quality:'low',fps:30,numbers:false});assert.equal(g.due(20,0),false);assert.equal(g.due(34,0),true);g.update({quality:'invalid',fps:999});assert.equal(g.settings.quality,'low');assert.equal(g.settings.fps,30);assert.equal(JSON.parse(data.get('lastpack-graphics')).numbers,false);
});
test('full inventories can decline a reward and automatically resume without extra loot',()=>{
  const {r,p}=fixture();grantExperience(r,5);tick(r,.1);const before=p.items.length;action(r,p,{type:'skipReward'});assert.equal(r.phase,'battle');assert.equal(p.items.length,before);assert.equal(p.pendingUpgrades,0);assert.throws(()=>action(r,p,{type:'skipReward'}));
});
test('boss health scales with connected teammates and replay resets the schedule',()=>{
  const r=createRoom('TEAM',17,false,true),p=addPlayer(r,'p','队长'),q=addPlayer(r,'q','队友');startWave(r);p.weapons=q.weapons=[null,null];r.nextSpawn=1e6;r.survivalTime=599.9;tick(r,.1);assert.equal(r.enemies[0].maxHp,3000);
  r.phase='defeat';action(r,p,{type:'restart'});assert.equal(r.survival,true);assert.equal(r.survivalTime,0);assert.equal(r.nextBossAt,600);assert.equal(r.bossCount,0);assert.equal(r.hazards.length,0);
});
test('three fresh pistol builds reach the timed boss using only earned rewards',()=>{
  for(const seed of [17,42,99]){
    const r=createRoom('RUN',seed,true,true),p=addPlayer(r,'p','玩家');assert.equal(p.items.length,0);assert.deepEqual(p.weapons,['pistol',null]);action(r,p,{type:'ready'});let steps=0;
    while(r.phase!=='defeat'&&r.survivalTime<620&&steps++<20000){
      if(r.phase==='upgrade'){
        const merge=p.rewards.findIndex(w=>typeof w==='object'&&w.tier<4&&p.weapons.some((k,n)=>k===w.kind&&p.weaponTiers[n]===w.tier));let idx=merge;
        if(idx<0)idx=p.rewards.findIndex(w=>typeof w==='string'&&['tomato','mushroom','weirdfood','tentacle','ducttape','armor','medkit'].includes(w));if(idx<0)idx=p.weapons.includes(null)?1:2;
        try{action(r,p,{type:'reward',index:idx,merge:idx===merge&&merge>=0});}catch{action(r,p,{type:'skipReward'});}
        for(const w of [...p.weaponStash]){const current=stats(p).weapons[1],next=weaponStats(w.kind,w.tier);if(!current||(next.range>=180&&next.damage/next.interval>current.damage/current.interval))action(r,p,{type:'equipWeapon',id:w.id,slot:1});}
        for(const w of [...p.weaponStash])action(r,p,{type:'discardWeapon',id:w.id});
      }else tick(r,.1);
    }
    assert.ok(r.survivalTime>=620,`seed ${seed} reaches 10 minutes`);assert.equal(r.bossCount,1);assert.ok(p.hp>0);assert.ok(p.level>10);
  }
});

