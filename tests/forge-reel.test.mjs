import test from 'node:test';
import assert from 'node:assert/strict';
import {createForgeReel} from '../public/forge-reel.mjs';
function harness(reduced=false){const queue=new Map(),frames=[],results=[],delays=[];let serial=0;const reel=createForgeReel({paint:(level,spinning)=>frames.push({level,spinning}),finish:r=>results.push(r),reducedMotion:()=>reduced,setTimer(fn,delay){delays.push(delay);queue.set(++serial,fn);return serial;},clearTimer:id=>queue.delete(id)});function advance(){const [id,fn]=queue.entries().next().value||[];if(fn){queue.delete(id);fn();}}return {reel,frames,results,delays,advance,queue};}
test('grade reel cycles, decelerates and reveals exactly the server grade after the animation',()=>{
  for(const to of [0,1,2,5]){const h=harness();assert.equal(h.reel.start('request',3),true);assert.equal(h.reel.start('duplicate',0),false);h.reel.receive({id:'request',to});for(let n=0;n<12;n++)h.advance();assert.equal(h.results.length,0);for(let n=0;n<30;n++)h.advance();assert.deepEqual(h.results,[{id:'request',to}]);assert.equal(h.frames.at(-1).level,to);assert.equal(h.frames.at(-1).spinning,false);assert.ok(new Set(h.frames.slice(0,-1).map(v=>v.level)).size>=5);assert.ok(h.delays.at(-1)>h.delays[0]);assert.equal(h.queue.size,0);assert.equal(h.reel.active,false);}
});
test('late or mismatched receipts cannot invent a reward; failure cancels pending animation',()=>{
  const h=harness();h.reel.start('right',2);assert.equal(h.reel.receive({id:'wrong',to:5}),false);for(let n=0;n<40;n++)h.advance();assert.equal(h.results.length,0);assert.equal(h.reel.active,true);h.reel.receive({id:'right',to:1});h.advance();assert.equal(h.results[0].to,1);
  h.reel.start('failed',0);h.reel.fail();for(let n=0;n<30;n++)h.advance();assert.equal(h.results.length,1);assert.equal(h.queue.size,0);
});
test('reduced motion waits for authority and reveals without the long flashing sequence',()=>{const h=harness(true);h.reel.start('r',0);h.reel.receive({id:'r',to:5});h.advance();assert.equal(h.results[0].to,5);assert.equal(h.frames.length,2);});
