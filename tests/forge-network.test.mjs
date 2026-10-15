import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {WebSocket} from 'ws';
import {ProfileStore} from '../profile-store.mjs';
const port=18887;
test('authoritative forge endpoint persists, deduplicates and defers battle changes to the next run',{timeout:20000},async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'lastpack-forge-ws-')),file=path.join(dir,'p.json');let proc,ws;
  async function boot(){proc=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),PROFILE_FILE:file},stdio:['ignore','pipe','pipe'],windowsHide:true});await once(proc.stdout,'data');}
  async function stop(){const ended=once(proc,'exit');proc.kill();await ended;proc=null;}
  let messages=[];
  async function connect(token){ws=new WebSocket(`ws://127.0.0.1:${port}/socket`);ws.on('message',raw=>messages.push(JSON.parse(raw)));ws.on('error',()=>{});await once(ws,'open');ws.send(JSON.stringify({type:'profile',profileToken:token}));}
  async function wait(fn){for(let n=0;n<200;n++){const found=messages.find(fn);if(found)return found;await new Promise(r=>setTimeout(r,25));}throw Error('No matching server response');}
  const send=m=>{messages=[];ws.send(JSON.stringify(m));};
  try{
    const fixture=await new ProfileStore(file).load(),{token}=await fixture.open();await fixture.settle(token,{id:'test-only-earned-coins',time:600,kills:300,bosses:1,level:20,gold:100,weapons:[],items:[],outcome:'defeat'});
    await boot();await connect(token);assert.equal((await wait(m=>m.type==='profile')).profile.gold,100);
    const request={type:'forgeTraining',key:'health',requestId:'00000001-0000-0000-0000-000000000000',outcome:'jackpot',gold:999999};send(request);const forged=await wait(m=>m.forgeResult);assert.equal(forged.profile.gold,60);assert.equal(forged.forgeResult.cost,40);const level=forged.profile.training.health;assert.ok([0,1,5].includes(level));assert.equal('forgeLedger'in forged.profile,false);
    send(request);const repeat=await wait(m=>m.forgeResult);assert.equal(repeat.profile.gold,60);assert.deepEqual(repeat.forgeResult,forged.forgeResult);
    send({type:'create',solo:true});const ready=await wait(m=>m.type==='state');assert.equal(ready.state.players[0].maxHp,100+level*4);
    send({type:'ready'});await wait(m=>m.type==='state'&&m.state.phase==='battle');
    send({type:'forgeTraining',key:'damage',requestId:'00000002-0000-0000-0000-000000000000'});const during=await wait(m=>m.forgeResult);assert.equal(during.profile.gold,20);const locked=await wait(m=>m.type==='state'&&m.state.phase==='battle');assert.equal(locked.state.players[0].metaBonus.damage,0);
    send({type:'forgeTraining',key:'pickup',requestId:'00000003-0000-0000-0000-000000000000'});await wait(m=>m.type==='error'&&m.message.includes('金币不足'));
    send({type:'leave'});await wait(m=>m.type==='left');ws.terminate();await stop();await boot();messages=[];await connect(token);const restored=await wait(m=>m.type==='profile');assert.equal(restored.profile.gold,20);assert.equal(restored.profile.training.damage,during.profile.training.damage);assert.equal(restored.profile.lastForge.id,during.forgeResult.id);
    send({type:'create',solo:true});const next=await wait(m=>m.type==='state');assert.equal(next.state.players[0].metaBonus.damage,during.profile.training.damage*.03);assert.equal(next.state.players[0].runGold,0);
  }finally{ws?.terminate();if(proc)await stop();await rm(dir,{recursive:true,force:true});}
});
