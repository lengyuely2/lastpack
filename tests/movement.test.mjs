import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,addPlayer,action,tick,stats,grantExperience,clearMovement} from '../shared/game.mjs';
import {directionFromKeys} from '../public/controls.mjs';
function fixture(){const r=createRoom('MOVE',9,true),p=addPlayer(r,'p','玩家');action(r,p,{type:'controlMode',mode:'manual'});action(r,p,{type:'ready'});r.nextSpawn=1000;return {r,p};}
test('manual mode stands still without input, moves exactly in requested direction and clamps at borders',()=>{
  const {r,p}=fixture(),x=p.x,y=p.y;tick(r,.1);assert.equal(p.x,x);assert.equal(p.y,y);action(r,p,{type:'move',x:1,y:0});tick(r,.1);assert.equal(p.x,x+stats(p).move*.1);assert.equal(p.y,y);
  p.x=914;action(r,p,{type:'move',x:1,y:0});tick(r,.1);assert.equal(p.x,915);p.y=46;action(r,p,{type:'move',x:0,y:-1});tick(r,.1);assert.equal(p.y,45);
});
test('diagonal movement cannot be faster; analog inputs may move more slowly',()=>{
  const {r,p}=fixture(),x=p.x,y=p.y;action(r,p,{type:'move',x:1,y:1});tick(r,.1);assert.ok(Math.abs(Math.hypot(p.x-x,p.y-y)-stats(p).move*.1)<1e-8);
  const a=p.x,b=p.y;action(r,p,{type:'move',x:.5,y:0});tick(r,.1);assert.ok(Math.abs(p.x-a-stats(p).move*.05)<1e-8);assert.equal(p.y,b);
});
test('release, expired input leases and disconnect stop manual movement',()=>{
  for(const mode of ['release','expire','disconnect']){const {r,p}=fixture();action(r,p,{type:'move',x:1,y:0});tick(r,.1);
    if(mode==='release')action(r,p,{type:'move',x:0,y:0});else if(mode==='disconnect')p.connected=false;else {for(let n=0;n<4;n++)tick(r,.1);}
    const x=p.x;tick(r,.1);assert.equal(p.x,x);assert.equal(p.moveInput.x,0);
  }
});
test('manual mode still aims, fires, reloads and collects nearby XP automatically',()=>{
  const {r,p}=fixture();const x=p.x,y=p.y;r.random=()=>1;r.enemies=[{id:'e',kind:'walker',x:x+200,y:y+25,hp:10000,maxHp:10000,speed:0,damage:0,radius:10,slow:0,burn:0,attack:0,angle:0}];
  tick(r,.2);assert.equal(p.x,x);assert.equal(p.y,y);assert.ok(p.damage>0);assert.ok(p.angle>0);p.shots[0].ammo=0;tick(r,.1);assert.ok(p.shots[0].reloading>0);for(let n=0;n<16;n++)tick(r,.1);assert.ok(p.shots[0].ammo>0);
  r.gems=[{id:'g',x:p.x,y:p.y,value:1,tier:'blue',color:'#81b9ff'}];tick(r,.1);assert.equal(p.totalXp,1);assert.equal(p.x,x);assert.equal(p.y,y);
});
test('each teammate selects independently; switching modes preserves readiness and resets movement',()=>{
  const r=createRoom('TEAM',9),p=addPlayer(r,'p','手动'),q=addPlayer(r,'q','自动');p.ready=true;action(r,p,{type:'controlMode',mode:'manual'});assert.equal(p.ready,true);assert.equal(q.controlMode,'auto');action(r,q,{type:'ready'});assert.equal(r.phase,'battle');r.nextSpawn=1000;
  const px=p.x,qx=q.x;tick(r,.1);assert.equal(p.x,px);assert.notEqual(q.x,qx);action(r,p,{type:'move',x:1,y:0});action(r,p,{type:'controlMode',mode:'auto'});assert.deepEqual(p.moveInput,{x:0,y:0});action(r,p,{type:'controlMode',mode:'manual'});const now=p.x;tick(r,.1);assert.equal(p.x,now);
});
test('upgrade pauses clear directions; input during pause cannot carry into resumed combat',()=>{
  const {r,p}=fixture();action(r,p,{type:'move',x:1,y:0});grantExperience(r,5);tick(r,.1);assert.equal(r.phase,'upgrade');assert.deepEqual(p.moveInput,{x:0,y:0});const x=p.x;action(r,p,{type:'move',x:1,y:0});tick(r,1);assert.equal(p.x,x);
  action(r,p,{type:'reward',index:0});assert.equal(r.phase,'battle');tick(r,.1);assert.equal(p.x,x);assert.equal(p.controlMode,'manual');
});
test('movement rejects invalid vectors and modes; movement cannot create weapons or manually fire',()=>{
  const {r,p}=fixture();for(const vector of [{x:2,y:0},{x:NaN,y:0},{x:0,y:Infinity},{x:'1',y:0},{x:null,y:0}])assert.throws(()=>action(r,p,{type:'move',...vector}),/方向无效/);
  assert.throws(()=>action(r,p,{type:'controlMode',mode:'aim'}),/模式无效/);assert.throws(()=>action(r,p,{type:'fire'}),/锁定/);assert.throws(()=>action(r,p,{type:'equipWeapon',id:'x',slot:1}),/不存在/);
  clearMovement(p);assert.equal(p.moveLease,0);r.phase='defeat';action(r,p,{type:'restart'});assert.equal(r.players[0].controlMode,'manual');assert.equal(r.players[0].moveLease,0);
});
test('WASD and arrows combine, cancel opposite directions and normalize diagonal keys',()=>{
  assert.deepEqual(directionFromKeys(new Set(['KeyW','ArrowDown'])),{x:0,y:0});assert.deepEqual(directionFromKeys(new Set(['KeyD','ArrowRight'])),{x:1,y:0});assert.deepEqual(directionFromKeys(new Set()),{x:0,y:0});const d=directionFromKeys(new Set(['KeyW','ArrowRight']));assert.ok(d.x>0&&d.y<0);assert.ok(Math.abs(Math.hypot(d.x,d.y)-1)<1e-10);
});
