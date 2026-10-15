import test from 'node:test';
import assert from 'node:assert/strict';
import {WEAPONS,weaponStats,weaponVisual,createRoom,addPlayer,startWave,tick} from '../shared/game.mjs';
import {drawCombatEffect,drawBlast} from '../public/combat-fx.mjs';
test('weapon families and four turret tiers have distinct visual profiles',()=>{
  const profiles=new Set(Object.keys(WEAPONS).map(k=>weaponVisual(weaponStats(k,1))));assert.ok(profiles.size>=13);
  assert.deepEqual([1,2,3,4].map(tier=>weaponVisual({kind:'turret',tier})),['bullet','fireball','laser','rocket']);
  for(const k of ['pistol','shotgun','laser','rocket','frost','wand','flamethrower','taser','crossbow','shuriken','slingshot'])assert.ok(weaponVisual(weaponStats(k,1)));
});
function recording(){const commands=[];const c={save(){},restore(){},fillRect(...n){commands.push(['rect',this.fillStyle,...n]);},beginPath(){},moveTo(...n){commands.push(['move',...n]);},lineTo(...n){commands.push(['line',...n]);},closePath(){},fill(){commands.push(['fill',this.fillStyle]);}};return {c,commands};}
test('animated shot rendering differentiates families and keeps all coordinates finite and bounded',()=>{
  const results=new Set();for(const kind of Object.keys(WEAPONS)){const w=weaponStats(kind,1),{c,commands}=recording();drawCombatEffect(c,{id:7,type:'shot',weapon:kind,visual:weaponVisual(w),x:40,y:80,tx:240,ty:80,range:w.range,cone:w.cone,flight:.3,duration:.54,life:.44});assert.ok(commands.length>0);assert.ok(commands.length<900);for(const command of commands)for(const n of command.slice(2))if(typeof n==='number')assert.ok(Number.isFinite(n));results.add(JSON.stringify(commands));}assert.ok(results.size>=13);
});
test('projectiles move through time and secondary effects wait for their visual arrival',()=>{
  const a=recording(),b=recording(),e={id:1,type:'shot',weapon:'rocket',visual:'rocket',x:40,y:80,tx:240,ty:80,flight:.3,duration:.54};drawCombatEffect(a.c,{...e,life:.5});drawCombatEffect(b.c,{...e,life:.35});assert.notDeepEqual(a.commands,b.commands);
  const early=recording();drawCombatEffect(early.c,{...e,type:'link',delay:.3,life:.4});assert.equal(early.commands.length,0);drawBlast(early.c,{...e,type:'blast',radius:90,delay:.3,life:.4});assert.equal(early.commands.length,0);drawBlast(early.c,{...e,type:'blast',radius:90,delay:.3,life:.1});assert.ok(early.commands.length>0);
});
test('real automatic attacks publish finite visual timing for ordinary, elemental and turret shots',()=>{
  for(const kind of ['pistol','rocket','laser','flamethrower','wrench']){const room=createRoom('FX',9,true),p=addPlayer(room,'p','玩家');p.weapons=[kind,null];p.weaponTiers[0]=1;startWave(room);p.controlMode='manual';room.nextSpawn=100;room.enemies=[{id:'e',kind:'brute',x:p.x+60,y:p.y,hp:9999,maxHp:9999,speed:0,damage:0,radius:10,slow:0,burn:0,attack:0}];tick(room,.2);const shots=room.effects.filter(e=>e.type==='shot');assert.ok(shots.length);for(const e of shots){assert.ok(e.visual);assert.equal(e.duration,e.life);assert.ok(e.duration>=e.flight+.23);assert.ok(e.flight>=0);assert.equal(e.owner,p.id);}assert.ok(p.damage>0);}
});
test('richer effects and red-tier trails add impact detail while low quality and reduced motion remain bounded',()=>{
  const event={type:'shot',weapon:'pistol',visual:'bullet',x:40,y:80,tx:240,ty:80,tier:4,flight:.3,duration:.54,life:.44};
  const low=recording(),rich=recording(),reduced=recording();drawCombatEffect(low.c,event,{quality:'low'});drawCombatEffect(rich.c,event,{quality:'high'});drawCombatEffect(reduced.c,event,{quality:'high',motion:false});assert.ok(rich.commands.length>low.commands.length);assert.deepEqual(low.commands,reduced.commands);assert.ok(rich.commands.length<900);
  const blast={type:'blast',weapon:'rocket',x:240,y:80,radius:90,duration:.3,life:.2},a=recording(),b=recording();drawBlast(a.c,blast,{quality:'low'});drawBlast(b.c,blast,{quality:'high'});assert.ok(b.commands.length>a.commands.length*2);assert.ok(b.commands.filter(command=>command[0]==='rect').length<200);assert.ok(b.commands.length<800);
});
test('survivors-style silhouettes remain finite and bounded for all weapon tiers, impacts and delayed chains',()=>{
  for(const kind of Object.keys(WEAPONS))for(const tier of [1,2,3,4])for(const age of [.08,.22,.38]){
    const w=weaponStats(kind,tier),{c,commands}=recording(),event={id:'fx37',type:'shot',weapon:kind,tier,visual:weaponVisual(w),x:500,y:320,tx:720,ty:440,range:w.range,cone:w.cone,flight:.2,duration:.7,life:.7-age,crit:true};
    drawCombatEffect(c,event,{quality:'high'});assert.ok(commands.length>0);assert.ok(commands.length<1400,kind+' has bounded primitive count');
    for(const command of commands)for(const value of command.slice(1))if(typeof value==='number'){assert.ok(Number.isFinite(value));assert.ok(Math.abs(value)<1000);}
    assert.equal(event.life,.7-age,'rendering does not mutate the authoritative attack');
  }
  const before=recording();drawCombatEffect(before.c,{type:'link',visual:'electric',tier:4,x:0,y:0,tx:100,ty:100,delay:.3,duration:.7,life:.6},{quality:'high'});assert.equal(before.commands.length,0);
});
test('higher weapon quality creates larger afterimages; lightweight rendering skips the extra geometry',()=>{
  const event={type:'shot',weapon:'ghostaxe',visual:'slash',x:300,y:300,tx:400,ty:300,range:120,flight:0,duration:.7,life:.62};
  const white=recording(),red=recording(),low=recording();drawCombatEffect(white.c,{...event,tier:1});drawCombatEffect(red.c,{...event,tier:4});drawCombatEffect(low.c,{...event,tier:4},{quality:'low'});
  assert.notDeepEqual(white.commands,red.commands);assert.ok(red.commands.filter(c=>c[0]==='fill').length>=5);assert.equal(low.commands.filter(c=>c[0]==='fill').length,0);
});
