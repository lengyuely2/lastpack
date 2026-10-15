import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,addPlayer,action,grantExperience,tick,stats} from '../shared/game.mjs';
function paused(xp=5){const r=createRoom('AUTO',7,true),p=addPlayer(r,'p','测试');action(r,p,{type:'ready'});r.nextSpawn=100;grantExperience(r,xp);tick(r,.1);assert.equal(r.phase,'upgrade');return {r,p};}
test('solo final reward automatically resumes without advancing time or resetting health',()=>{
  const {r,p}=paused();p.hp=70;const time=r.time;p.rewards=['coffee'];action(r,p,{type:'reward',index:0});assert.equal(r.phase,'battle');assert.equal(r.time,time);assert.equal(p.hp,70);assert.equal(p.pendingUpgrades,0);assert.notEqual(p.items[0].x,null);assert.ok(stats(p).weapons[0].interval<1/1.5);assert.throws(()=>action(r,p,{type:'reward',index:0}),/锁定/);
});
test('queued rewards keep combat paused until the final choice',()=>{
  const {r,p}=paused(32);assert.equal(p.pendingUpgrades,3);for(let n=3;n>0;n--){action(r,p,{type:'reward',index:0});assert.equal(p.pendingUpgrades,n-1);assert.equal(r.phase,n===1?'battle':'upgrade');}
});
test('auto placement rotates to fit and preserves existing items',()=>{
  const {r,p}=paused();p.items=Array.from({length:30},(_,n)=>({id:'old'+n,kind:'coffee',x:n%6,y:Math.floor(n/6),rotated:false,target:0})).filter(i=>i.x!==5||i.y<3);
  const before=JSON.stringify(p.items);p.rewards=['boots'];action(r,p,{type:'reward',index:0});assert.equal(JSON.stringify(p.items.slice(0,-1)),before);assert.equal(p.items.at(-1).rotated,true);assert.equal(p.items.at(-1).x,5);assert.equal(p.items.at(-1).y,3);assert.equal(r.phase,'battle');
});
test('full backpack stores rewards; invalid selection or full storage cannot resume combat',()=>{
  const {r,p}=paused();p.items=Array.from({length:30},(_,n)=>({id:'old'+n,kind:'coffee',x:n%6,y:Math.floor(n/6),rotated:false,target:0}));p.rewards=['coffee'];assert.throws(()=>action(r,p,{type:'reward',index:9}),/无效/);assert.equal(r.phase,'upgrade');action(r,p,{type:'reward',index:0});assert.equal(p.items.at(-1).x,null);assert.equal(r.phase,'battle');
  const other=paused();other.p.items=p.items.slice(0,30).concat(Array.from({length:16},(_,n)=>({id:'stash'+n,kind:'coffee',x:null,y:null,target:0})));other.p.rewards=['coffee'];assert.throws(()=>action(other.r,other.p,{type:'reward',index:0}),/储物区已满/);assert.equal(other.r.phase,'upgrade');assert.equal(other.p.pendingUpgrades,1);
});
