import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,addPlayer,action,tick,stats,weaponStats,grantExperience,snapshot} from '../shared/game.mjs';
function fixture(kind,tier=1){const r=createRoom('EXOTIC',4,true),p=addPlayer(r,'p','测试');p.weapons=[kind,null];p.weaponTiers=[tier,1];p.items=[];action(r,p,{type:'ready'});r.nextSpawn=1000;r.total=100;r.spawned=0;return {r,p};}
function enemy(r,p,id,dx,dy=0,hp=1000){const e={id,kind:'walker',x:p.x+dx,y:p.y+dy,hp,maxHp:hp,speed:0,damage:0,radius:10,slow:0,burn:0,burnDps:0,attack:0,angle:0};r.enemies.push(e);return e;}
test('slingshot bounces beyond player reach without hitting a target twice; tiers add bounces',()=>{
  for(const tier of [1,4]){const {r,p}=fixture('slingshot',tier);r.random=()=>1;const a=enemy(r,p,'a',230),b=enemy(r,p,'b',350),c=enemy(r,p,'c',460);tick(r,.2);
    assert.ok(a.hp<1000);assert.ok(b.hp<1000);assert.equal(c.hp<1000,tier===4);assert.equal(r.effects.filter(e=>e.type==='link').length,tier===4?2:1);
    assert.ok(Math.abs(1000-a.hp-weaponStats('slingshot',tier).damage)<1e-8,'main hit is credited only once');assert.equal(p.shots[0].ammo,1);
  }
});
test('shuriken only bounces on critical hits and never reloads',()=>{
  for(const crit of [false,true]){const {r,p}=fixture('shuriken');r.random=()=>crit?0:1;enemy(r,p,'a',150);const b=enemy(r,p,'b',280);tick(r,.2);assert.equal(b.hp<1000,crit);for(let n=0;n<20;n++)tick(r,.1);assert.equal(p.shots[0].ammo,1);assert.equal(p.shots[0].reloading,0);}
});
test('taser slows an impact radius but leaves distant enemies unaffected',()=>{
  const {r,p}=fixture('taser');enemy(r,p,'a',180);const b=enemy(r,p,'b',180,35),c=enemy(r,p,'c',180,100);tick(r,.2);assert.ok(b.slow>0);assert.equal(c.slow,0);assert.ok(weaponStats('taser',4).slowRadius>weaponStats('taser',1).slowRadius);
});
test('innate fire scales by tier and flamethrower only burns its forward cone',()=>{
  assert.ok(weaponStats('wand',4).burn>weaponStats('wand',1).burn);
  for(const kind of ['wand','flamethrower']){const {r,p}=fixture(kind);const a=enemy(r,p,'a',100),front=enemy(r,p,'front',125,20),behind=enemy(r,p,'behind',-150);tick(r,.2);assert.ok(a.burn>0);assert.ok(a.burnDps>0);assert.equal(front.burn>0,kind==='flamethrower');assert.equal(behind.burn,0);}
});
test('lightning shiv chains at range and cactus emits a bounded number of spikes',()=>{
  const {r,p}=fixture('lightning',2);enemy(r,p,'a',60);const distant=enemy(r,p,'b',195),third=enemy(r,p,'c',310);tick(r,.2);assert.ok(distant.hp<1000);assert.ok(third.hp<1000);assert.equal(r.effects.filter(e=>e.type==='link').length,2);
  const f=fixture('cactus');enemy(f.r,f.p,'a',60);for(let n=0;n<5;n++)enemy(f.r,f.p,'s'+n,160,n*15);tick(f.r,.2);assert.equal(f.r.effects.filter(e=>e.type==='link').length,3);assert.equal(f.r.enemies.filter(e=>e.hp<1000).length,4);
});
test('scissors heal from actual dealt damage and cannot overheal or heal a fallen owner',()=>{
  const {r,p}=fixture('scissors');r.random=()=>1;p.hp=50;enemy(r,p,'a',60,0,5);tick(r,.2);assert.ok(Math.abs(p.hp-50.6)<1e-8,'5 actual damage * 12% lifesteal');
  const f=fixture('scissors',4);f.r.random=()=>1;f.p.hp=99;enemy(f.r,f.p,'a',60);tick(f.r,.2);assert.equal(f.p.hp,100);
});
test('ghost axe grows permanent damage from its own kills, including burn, and caps growth',()=>{
  const {r,p}=fixture('ghostaxe');p.x=480;p.y=310;for(let n=0;n<8;n++)enemy(r,p,'e'+n,60+n*.5,0,1);tick(r,.2);assert.equal(p.ghostDamage,.02);assert.equal(p.ghostProgress,0);
  p.weapons[0]='pistol';assert.ok(stats(p).weapons[0].damage>weaponStats('pistol').damage,'growth survives weapon replacement');
  p.weapons[0]='ghostaxe';p.ghostDamage=.58;p.ghostProgress=7;p.shots[0].cooldown=100;const e=enemy(r,p,'burn',350,0,.1);e.burn=1;e.burnDps=8;e.burnOwner=p.id;e.burnGhostGoal=8;tick(r,.1);assert.equal(p.ghostDamage,.6);tick(r,.1);assert.equal(p.ghostDamage,.6);assert.equal(p.kills,9,'burn death awarded once');
  r.phase='defeat';action(r,p,{type:'restart'});assert.equal(r.players[0].ghostDamage,0);
});
test('wrench deploys one turret per slot, has tier-specific shots, freezes on upgrade and removes on replacement',()=>{
  for(const tier of [1,2,3,4]){const {r,p}=fixture('wrench',tier);const a=enemy(r,p,'a',220),b=enemy(r,p,'b',245,0);tick(r,.2);assert.equal(r.turrets.length,1);assert.ok(a.hp<1000);assert.equal(b.hp<1000,tier>=3);assert.equal(a.burn>0,tier===2);assert.equal(r.turrets[0].tier,tier);assert.equal(snapshot(r,p.id).turrets.length,1);
    tick(r,.1);assert.equal(r.turrets.length,1);grantExperience(r,5);tick(r,.1);assert.equal(r.phase,'upgrade');const frozen=JSON.stringify([r.turrets,r.time,r.enemies]);tick(r,3);assert.equal(JSON.stringify([r.turrets,r.time,r.enemies]),frozen);
    r.phase='battle';p.pendingUpgrades=0;p.weapons[0]='pistol';tick(r,.1);assert.equal(r.turrets.length,0);
  }
});
test('both wrench slots deploy independently; dead engineers cannot create or fire turrets',()=>{
  const {r,p}=fixture('wrench');p.weapons[1]='wrench';p.shots[1]={ammo:1,cooldown:.15,reloading:0};enemy(r,p,'a',220);tick(r,.2);assert.equal(r.turrets.length,2);const before=p.damage;p.hp=0;tick(r,.2);assert.equal(p.damage,before);
});
test('shredder explosions damage nearby enemies and unusual weapons can be earned and merged',()=>{
  const {r,p}=fixture('shredder');enemy(r,p,'a',180);const b=enemy(r,p,'b',200,20),far=enemy(r,p,'far',200,120);tick(r,.2);assert.ok(b.hp<1000);assert.equal(far.hp,1000);assert.ok(r.effects.some(e=>e.type==='blast'));
  const game=createRoom('REWARD',8,true),owner=addPlayer(game,'new','新手');grantExperience(game,5);owner.rewards=[{type:'weapon',kind:'wrench',tier:1},'armor','scope'];action(game,owner,{type:'reward',index:0});assert.equal(owner.weapons[1],'wrench');grantExperience(game,10);owner.rewards=[{type:'weapon',kind:'wrench',tier:1},'armor','scope'];action(game,owner,{type:'reward',index:0,merge:true});assert.equal(owner.weaponTiers[1],2);
});
