import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {WebSocket} from 'ws';
import {ProfileStore} from '../profile-store.mjs';
const port=18884;
class Client{
  constructor(){this.ws=new WebSocket(`ws://127.0.0.1:${port}/socket`);this.messages=[];this.ws.on('message',raw=>this.messages.push(JSON.parse(raw)));this.ws.on('error',()=>{});}
  async open(){await once(this.ws,'open');return this;}
  send(m){this.ws.send(JSON.stringify(m));}
  async wait(fn){for(let n=0;n<200;n++){const m=this.messages.find(fn);if(m)return m;await new Promise(resolve=>setTimeout(resolve,25));}throw Error('Timed out');}
  clear(){this.messages=[];}
}
async function boot(file){const p=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),PROFILE_FILE:file},stdio:['ignore','pipe','pipe'],windowsHide:true});await new Promise((resolve,reject)=>{p.stdout.once('data',resolve);p.once('error',reject);p.once('exit',code=>reject(Error('server exit '+code)));});return p;}
async function stop(p){const done=once(p,'exit');p.kill();await done;}
test('real profile handshake, purchases, character choices, run locking and server restart persistence',{timeout:20000},async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'lastpack-network-career-')),file=path.join(dir,'profiles.json');let proc;const clients=[];
  try{
    const fixture=await new ProfileStore(file).load(),seed=await fixture.open();await fixture.settle(seed.token,{id:'earned-fixture',outcome:'victory',time:1200,kills:600,teamKills:600,bosses:3,level:30,damage:70000,healing:15,revives:1,fusions:1,weapons:[],items:[]});
    proc=await boot(file);const a=await new Client().open();clients.push(a);a.send({type:'profile',profileToken:seed.token});const initial=await a.wait(m=>m.type==='profile');assert.equal(initial.profile.scrap,155);assert.equal('ledger'in initial.profile,false);
    a.clear();a.send({type:'metaUpgrade',key:'health'});await a.wait(m=>m.type==='profile'&&m.profile.training.health===1);a.clear();a.send({type:'selectCharacter',key:'medic'});await a.wait(m=>m.type==='profile'&&m.profile.character==='medic');
    a.clear();a.send({type:'create',name:'测试',solo:true});const first=await a.wait(m=>m.type==='state');assert.equal(first.state.campaign,true);const p=first.state.players[0];assert.equal(p.character,'medic');assert.equal(p.maxHp,104);assert.equal(p.stats.regen,.25);assert.deepEqual(p.weapons,['pistol',null]);assert.equal(p.items.length,0);assert.equal(JSON.stringify(first).includes(seed.token),false);
    a.clear();a.send({type:'ready'});await a.wait(m=>m.type==='state'&&m.state.phase==='battle');a.clear();a.send({type:'metaUpgrade',key:'health'});await a.wait(m=>m.type==='profile'&&m.profile.training.health===2);const locked=await a.wait(m=>m.type==='state'&&m.state.phase==='battle');assert.equal(locked.state.players[0].maxHp,104,'purchase applies next run');
    a.clear();a.send({type:'metaUpgrade',key:'not-a-real-upgrade',scrap:999999});await a.wait(m=>m.type==='error');a.clear();a.send({type:'leave'});await a.wait(m=>m.type==='left');a.clear();a.send({type:'create',name:'下一局',solo:true});const next=await a.wait(m=>m.type==='state');assert.equal(next.state.players[0].maxHp,108);
    for(const c of clients)c.ws.terminate();await stop(proc);proc=null;
    proc=await boot(file);const b=await new Client().open();clients.push(b);b.send({type:'profile',profileToken:seed.token});const restored=await b.wait(m=>m.type==='profile');assert.equal(restored.profile.training.health,2);assert.equal(restored.profile.character,'medic');assert.equal(restored.profile.scrap,80);assert.ok(restored.profile.history.some(h=>h.id==='earned-fixture'));
  }finally{for(const c of clients)c.ws.terminate();if(proc)await stop(proc);await rm(dir,{recursive:true,force:true});}
});
