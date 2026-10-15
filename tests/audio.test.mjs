import test from 'node:test';
import assert from 'node:assert/strict';
import {createSoundEvents,createAudio,GUNS} from '../public/audio.mjs';
import {WEAPONS,weaponStats,weaponVisual} from '../shared/game.mjs';
const state=(extra={})=>({code:'ABC',wave:1,time:0,phase:'battle',enemies:[],effects:[],players:[{id:'me',level:1,hp:100,pendingUpgrades:0,shots:[{reloading:0}]}],...extra});
test('snapshots trigger each effect once, including shared XP and local level up',()=>{
  const t=createSoundEvents();assert.deepEqual(t.push(state(),'me'),[]);
  const s=state({effects:[{id:1,type:'xp',value:20},{id:2,type:'shot',weapon:'pistol',owner:'me'}]});
  assert.equal(t.push(s,'me').length,2);assert.deepEqual(t.push(s,'me'),[]);
  const upgraded=state({phase:'upgrade',players:[{id:'me',level:2,hp:100,pendingUpgrades:1,shots:[]}],effects:s.effects});
  assert.deepEqual(t.push(upgraded,'me'),[{type:'level'}]);assert.deepEqual(t.push(upgraded,'me'),[]);
  assert.deepEqual(t.push({...upgraded,players:[{...upgraded.players[0],pendingUpgrades:0}]},'me'),[{type:'reward'}]);
});
test('ranked entrances, ambient cries, reload and revive reflect actual transitions',()=>{
  const t=createSoundEvents();t.push(state(),'me');const e={id:'z1',kind:'boss',rank:4,x:10};
  assert.equal(t.push(state({enemies:[e]}),'me')[0].kind,'boss');assert.deepEqual(t.push(state({enemies:[e]}),'me'),[]);
  assert.equal(t.push(state({time:4,enemies:[e]}),'me')[0].type,'cry');
  assert.equal(t.push(state({time:4,players:[{id:'me',level:1,hp:0,pendingUpgrades:0,shots:[{reloading:1}]}]}),'me')[0].type,'down');
  assert.equal(t.push(state({time:4}),'me')[0].type,'revive');
  assert.equal(t.push(state({wave:2}),'me')[0].type,'wave');
  assert.equal(t.push(state({wave:2,phase:'victory'}),'me')[0].type,'victory');
});
test('joining or resetting never replays historical combat',()=>{
  const t=createSoundEvents(),s=state({enemies:[{id:'z',kind:'boss'}],effects:[{id:1,type:'xp'}]});
  assert.deepEqual(t.push(s,'me'),[]);t.reset();assert.deepEqual(t.push(s,'me'),[]);assert.deepEqual(t.push({...s,code:'NEW'},'me'),[]);
});
function harness(){
  const sources=[],saved=new Map();const param=()=>({value:0,setValueAtTime(){},exponentialRampToValueAtTime(v,t){assert.ok(v>0&&Number.isFinite(t));},setTargetAtTime(){}});
  const node=()=>({connect(){},disconnect(){},gain:param(),frequency:param(),pan:param(),threshold:param(),ratio:param()});
  class Context{constructor(){this.state='running';this.currentTime=0;this.sampleRate=100;this.destination={};Context.last=this;}
    createGain(){return node();}createDynamicsCompressor(){return node();}createBiquadFilter(){return node();}createStereoPanner(){return node();}
    createBuffer(){return {getChannelData(){return new Float32Array(100);}};}
    createOscillator(){const s={...node(),start(){},stop(){},frequency:param()};sources.push(s);return s;}createBufferSource(){return this.createOscillator();}}
  return {Context,sources,saved,audio:createAudio({Context,storage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,String(v))}}),finish(){for(const s of sources.splice(0))s.onended?.();}};
}
test('all 24 weapon profiles synthesize bounded voices; mute, volume and rate controls work',async()=>{
  const h=harness(),a=h.audio;assert.equal(a.play({type:'xp'}),false);assert.equal(await a.unlock(),true);
  for(const kind of Object.keys(WEAPONS)){h.Context.last.currentTime+=1;assert.equal(a.play({type:'shot',weapon:kind,visual:weaponVisual(weaponStats(kind,1)),local:true}),true);assert.ok(h.sources.length>=2&&h.sources.length<=3);h.finish();}
  assert.equal(new Set(Object.values(GUNS).map(JSON.stringify)).size,9);
  assert.equal(a.play({type:'xp'}),true);assert.equal(a.play({type:'xp'}),false);h.finish();a.setMuted(true);assert.equal(a.play({type:'level'}),false);assert.equal(h.saved.get('lastpack-muted'),'true');a.setMuted(false);a.setVolume(0);assert.equal(a.play({type:'level'}),false);a.setVolume(2);assert.equal(a.volume,1);
  for(let i=0;i<100;i++){h.Context.last.currentTime+=.1;a.play({type:'shot',weapon:'pistol',local:true});}assert.ok(h.sources.length<=12);h.finish();
});
