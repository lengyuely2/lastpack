import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,addPlayer,action,tick,stats,hurtPlayer} from '../shared/game.mjs';
import {weaponPositioning,automaticDirection} from '../shared/auto-movement.mjs';
import {nextRunGoal,freshProfile,runSummary} from '../shared/progression.mjs';
import {tickSurvival} from '../shared/survival.mjs';
test('equipped firepower selects a usable range; shotgun closes in and melee can reach an isolated target',()=>{
 const r=createRoom('FEEL',9,true,true,true),p=addPlayer(r,'p','测试');p.x=480;p.y=310;
 p.weapons=['sniper','knife'];p.weaponTiers=[4,1];assert.ok(weaponPositioning(stats(p)).range>200);
 p.weapons=['shotgun',null];const shotgun=weaponPositioning(stats(p));p.weapons=['pistol',null];assert.ok(shotgun.range<weaponPositioning(stats(p)).range);
 p.weapons=['knife',null];p.weaponTiers=[1,1];const s=stats(p),e={x:p.x+90,y:p.y,radius:10};assert.ok(automaticDirection(r,p,s,[e],e,[p]).x>0);
});
test('campaign first kill gives XP, and the opening reaches its first reward without free items',()=>{
 const r=createRoom('FAST',17,true,true,true),p=addPlayer(r,'p','测试');assert.deepEqual(p.weapons,['pistol',null]);assert.equal(p.items.length,0);action(r,p,{type:'ready'});
 while(r.survivalTime<60&&p.level===1&&p.hp>0)tick(r,.05);
 assert.ok(p.kills>=5);assert.ok(p.level>=2);assert.ok(r.survivalTime<60);assert.equal(p.items.length,0);assert.deepEqual(p.weapons,['pistol',null]);assert.equal(p.rewardSource,'level');
});
test('damage source is recorded only on actual damage and clears on replay',()=>{
 const r=createRoom('HIT',9,true,true,true),p=addPlayer(r,'p','测试');hurtPlayer(r,p,8,undefined,'腐蚀酸池');assert.equal(p.lastHit.cause,'腐蚀酸池');assert.equal(p.lastHit.damage,8);
 const hit={...p.lastHit};hurtPlayer(r,p,30,undefined,'范围攻击');assert.deepEqual(p.lastHit,hit);r.phase='defeat';action(r,p,{type:'restart'});assert.equal(r.players[0].lastHit,undefined);
});
test('hostile projectile and resolved telegraph report their actual damage cause',()=>{
 for(const mode of ['shot','area']){const r=createRoom('SOURCE',9,true,true,true),p=addPlayer(r,'p','测试');
   if(mode==='shot')r.hostileShots=[{x:p.x-10,y:p.y,vx:100,vy:0,damage:12,life:2}];
   else {r.enemies=[{id:'e',kind:'walker',hp:100,x:20,y:20}];r.hazards=[{owner:'e',x:p.x,y:p.y,shape:'circle',radius:50,remaining:.05,damage:20}];}
   tickSurvival(r,.1,{stats,effect(){},hurt:hurtPlayer});assert.equal(p.hp,mode==='shot'?88:80);assert.equal(p.lastHit.cause,mode==='shot'?'敌方弹丸':'范围攻击');
 }
});
test('run discoveries compare real acquisitions against initial collection, including discarded gear',()=>{
 const r=createRoom('FOUND',9,true,true,true),p=addPlayer(r,'p','测试');p.knownAtStart={weapons:['pistol'],items:['coffee']};p.obtainedWeapons=['pistol','wand'];p.obtainedItems=['coffee','armor'];const d=runSummary(r,p);assert.deepEqual(d.newDiscoveries,{weapons:['wand'],items:['armor']});
});
test('next-run goal follows remaining real unlock conditions without negative progress',()=>{
 const p=freshProfile();assert.match(nextRunGoal(p),/05:00/);p.records.bestTime=300;assert.match(nextRunGoal(p),/LV 10/);p.records.bestLevel=10;p.records.kills=499;assert.match(nextRunGoal(p),/1 只/);p.records.kills=500;assert.match(nextRunGoal(p),/10:00/);p.records.bosses=1;assert.match(nextRunGoal(p),/撤离/);p.records.wins=1;p.records.kills=1000;assert.match(nextRunGoal(p),/无尽/);
});
