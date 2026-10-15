import test from 'node:test';
import assert from 'node:assert/strict';
import {createPresentation} from '../public/presentation.mjs';
function state(x,extra={}){return {code:'ROOM',phase:'battle',wave:1,players:[{id:'p',x,y:50,angle:0,hp:100}],enemies:[],gems:[],turrets:[],effects:[],...extra};}
test('positions move between server snapshots without changing gameplay state',()=>{
  const view=createPresentation(100),a=state(0),b=state(10);view.push(a,100);view.push(b,200);
  assert.equal(view.sample(200).players[0].x,0);assert.equal(view.sample(250).players[0].x,5);assert.equal(view.sample(300).players[0].x,10);assert.equal(view.sample(500).players[0].x,10);
  assert.equal(a.players[0].x,0);assert.equal(b.players[0].x,10);
});
test('pause, wave and room changes snap immediately; removed enemies are not resurrected',()=>{
  const view=createPresentation(100);view.push(state(0,{enemies:[{id:'e',x:0,y:0}]}),100);view.push(state(10),200);assert.equal(view.sample(250).enemies.length,0);
  for(const extra of [{phase:'upgrade'},{wave:2},{code:'OTHER'}]){view.push(state(80,extra),300);assert.equal(view.sample(300).players[0].x,80);}
  view.clear();assert.equal(view.sample(400),null);
});
test('angle interpolation takes the short path; effects age smoothly and fallen players snap',()=>{
  const view=createPresentation(100),a=state(0),b=state(10,{effects:[{type:'number',life:.7}]});a.players[0].angle=3.1;b.players[0].angle=-3.1;
  view.push(a,100);view.push(b,200);const middle=view.sample(250);assert.ok(Math.abs(middle.players[0].angle-Math.PI)<.01);assert.ok(Math.abs(middle.effects[0].life-.65)<1e-8);assert.equal(view.sample(1000).effects.length,0);assert.equal(b.effects[0].life,.7);
  const dead=state(20);dead.players[0].hp=0;view.push(dead,300);assert.equal(view.sample(350).players[0].x,20);
});
