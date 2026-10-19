import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,addPlayer,action,tick} from '../shared/game.mjs';
test('elite warning fires once, named elite drops real XP and a collectible power supply',()=>{
 const r=createRoom('ELITE',17,true,true,true),p=addPlayer(r,'p','Test');action(r,p,{type:'ready'});p.controlMode='manual';p.weapons=[null,null];r.nextSpawn=1e9;r.survivalTime=174.9;tick(r,.1);assert.equal(r.effects.filter(e=>e.type==='eliteWarning').length,1);tick(r,.1);assert.equal(r.effects.filter(e=>e.type==='eliteWarning').length,1);r.survivalTime=179.9;tick(r,.1);const e=r.enemies.find(e=>e.encounterElite);assert.ok(e);assert.equal(r.bossCount,0);e.hp=.01;e.burn=1;e.burnDps=100;e.burnOwner=p.id;tick(r,.1);assert.ok(r.gems.some(g=>g.name==='精英经验'&&g.value===40));const supply=r.supplies.find(f=>f.vacuum);assert.ok(supply);p.x=supply.x;p.y=supply.y;const xp=p.totalXp;tick(r,.1);assert.ok(p.totalXp>xp);assert.equal(r.supplies.filter(f=>f.vacuum).length,0);assert.ok(p.powerTimer>0);assert.equal(r.nextBossAt,600);
});
