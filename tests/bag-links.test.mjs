import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,addPlayer,ITEMS,starCells,bagLinks,isWeaponItem,stats,weaponStats} from '../shared/game.mjs';
const item=(id,kind,x,y,target=0,rotated=false)=>({id,kind,x,y,target,rotated});
function player(items){const p=addPlayer(createRoom('LINKS',3),'a','测试');p.weapons=['rifle','frost'];p.items=items;return p;}
test('weapon rank names preserve four normal tiers and distinguish fusion',()=>{
  assert.deepEqual([1,2,3,4].map(t=>weaponStats('pistol',t).tierName),['淬火','精炼','辉耀','传说']);
});
test('direction stars rotate clockwise and clip at backpack edges',()=>{
  assert.deepEqual(starCells(item('s','scope',1,1),ITEMS),[{x:3,y:1},{x:4,y:1}]);
  assert.deepEqual(starCells(item('s','scope',1,1,0,true),ITEMS),[{x:1,y:3},{x:1,y:4}]);
  assert.deepEqual(starCells(item('s','scope',4,1),ITEMS),[]);
  assert.deepEqual(starCells(item('s','scope',null,null),ITEMS),[]);
});
test('two stars touching one receiver count it once; movement and binding remove the bonus',()=>{
  const p=player([item('s','scope',0,0),item('p','piercing',2,0)]);
  assert.equal(bagLinks(p,ITEMS,isWeaponItem)[0].count,1);
  assert.ok(Math.abs(stats(p).weapons[0].crit-.11)<1e-8);
  p.items[1].target=1;assert.equal(stats(p).links.length,0);assert.equal(stats(p).weapons[0].crit,.04);
  p.items[1].target=0;p.items[1].y=3;assert.equal(stats(p).links.length,0);assert.equal(stats(p).weapons[0].crit,.04);
  p.items[1].x=null;assert.equal(stats(p).links.length,0);
});
test('empty weapon slots do not activate directional weapon links',()=>{
  const p=player([item('s','scope',0,0,1),item('p','piercing',2,0,1)]);p.weapons[1]=null;
  assert.equal(stats(p).links.length,0);assert.equal(stats(p).combos.length,0);
});
test('overlapping food stars from multiple hubs do not multiply the same receiver',()=>{
  const food=item('f','weirdfood',1,1),p=player([food,item('m1','medkit',0,2),item('m2','medkit',2,2)]);
  const baseline=stats(player([food])).healMultiplier;
  assert.equal(stats(p).links.filter(l=>l.kind==='medkit').length,2);
  assert.ok(Math.abs(stats(p).healMultiplier-baseline-.15)<1e-8);
});
test('cooler keeps its orthogonal bonus once and excludes diagonal receivers',()=>{
  const p=player([item('c','cooler',1,1),item('t','trigger',1,0)]);
  const base=weaponStats('rifle',1).interval;
  assert.equal(stats(p).links[0].count,1);assert.ok(Math.abs(stats(p).weapons[0].interval-base/(1+.15*1.3))<1e-8);
  p.items[1].x=0;assert.equal(stats(p).links.length,0);assert.ok(Math.abs(stats(p).weapons[0].interval-base/1.15)<1e-8);
});
test('new reload and movement recipes apply only while the pair shares an edge',()=>{
  const p=player([item('m','magazine',0,0),item('l','loader',1,0),item('b','boots',0,3),item('s','snail',2,3)]);
  const linked=stats(p);assert.equal(linked.combos.length,2);
  assert.ok(Math.abs(linked.weapons[0].reload-weaponStats('rifle',1).reload/1.3*.88)<1e-8);
  assert.ok(Math.abs(linked.move-58*1.18*1.05)<1e-8);assert.ok(Math.abs(linked.auraSlow-.12)<1e-8);
  p.items[1].x=3;p.items[3].y=0;const separate=stats(p);assert.equal(separate.combos.length,0);
  assert.ok(Math.abs(separate.weapons[0].reload-weaponStats('rifle',1).reload/1.3)<1e-8);
  assert.ok(Math.abs(separate.move-58*1.18)<1e-8);assert.equal(separate.auraSlow,.08);
});
