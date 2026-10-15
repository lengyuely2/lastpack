import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {WebSocket} from 'ws';
test('two real clients persist independent automation settings and resume after auto + manual rewards',{timeout:50000},async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'lastpack-auto-')),port=18885,clients=[];
  const proc=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),PROFILE_FILE:path.join(dir,'profiles.json')},stdio:['ignore','pipe','pipe'],windowsHide:true});
  const connect=async()=>{
    const ws=new WebSocket(`ws://127.0.0.1:${port}/socket`),messages=[],waiters=[];clients.push(ws);ws.on('message',raw=>{const m=JSON.parse(raw);messages.push(m);for(const w of [...waiters])if(w.match(m)){clearTimeout(w.timer);waiters.splice(waiters.indexOf(w),1);w.resolve(m);}});ws.on('error',()=>{});await once(ws,'open');
    return {send:m=>ws.send(JSON.stringify(m)),clear:()=>{messages.length=0;},wait(match,ms=25000){const found=messages.find(match);if(found)return Promise.resolve(found);return new Promise((resolve,reject)=>{const w={match,resolve,timer:setTimeout(()=>reject(Error('Automation network timeout')),ms)};waiters.push(w);});}};
  };
  try{
    await new Promise((resolve,reject)=>{proc.stdout.once('data',resolve);proc.once('error',reject);proc.once('exit',code=>reject(Error('Server exit '+code)));});
    for(const file of ['auto-rewards.mjs','auto-movement.mjs','automation-ui.mjs','music.mjs'])assert.equal((await fetch(`http://127.0.0.1:${port}/${file}`)).status,200);
    const a=await connect();a.send({type:'create',solo:false,name:'自动队长'});const wa=await a.wait(m=>m.type==='welcome'),first=await a.wait(m=>m.type==='state'),b=await connect();b.send({type:'join',code:first.state.code,name:'手动队友'});const wb=await b.wait(m=>m.type==='welcome');
    a.send({type:'autoRewards',settings:{enabled:true,delay:2,build:'firepower'}});a.send({type:'autoStrategy',strategy:'aggressive'});b.send({type:'autoStrategy',strategy:'conservative'});
    const settings=await a.wait(m=>m.type==='state'&&m.state.players.some(p=>p.id===wa.playerId&&p.autoStrategy==='aggressive'&&p.autoRewards.enabled)&&m.state.players.some(p=>p.id===wb.playerId&&p.autoStrategy==='conservative'));assert.equal(settings.state.players.find(p=>p.id===wb.playerId).autoRewards.enabled,false);
    a.clear();a.send({type:'autoRewards',settings:{enabled:'yes'}});await a.wait(m=>m.type==='error'&&m.message.includes('开关'));a.send({type:'ready'});b.send({type:'ready'});await a.wait(m=>m.type==='state'&&m.state.phase==='battle');
    const upgrade=await a.wait(m=>m.type==='state'&&m.state.phase==='upgrade');const time=upgrade.state.survivalTime,automatic=await a.wait(m=>m.type==='state'&&m.state.phase==='upgrade'&&m.state.players.find(p=>p.id===wa.playerId).pendingUpgrades===0);assert.equal(automatic.state.survivalTime,time);assert.match(automatic.state.players.find(p=>p.id===wa.playerId).lastAutoReward,/自动领取/);assert.equal(automatic.state.players.find(p=>p.id===wb.playerId).pendingUpgrades,1);
    b.clear();b.send({type:'reward',index:0});const resumed=await b.wait(m=>m.type==='state'&&m.state.phase==='battle');assert.ok(resumed.state.players.every(p=>p.pendingUpgrades===0));assert.equal(resumed.state.players.find(p=>p.id===wa.playerId).autoRewards.build,'firepower');
    clients[0].terminate();const recovered=await connect();recovered.send({type:'resume',token:wa.token});await recovered.wait(m=>m.type==='welcome');const state=await recovered.wait(m=>m.type==='state');const p=state.state.players.find(p=>p.id===wa.playerId);assert.equal(p.autoStrategy,'aggressive');assert.equal(p.autoRewards.enabled,true);assert.equal(p.autoRewards.allowFusion,false);
  }finally{for(const ws of clients)ws.terminate();proc.kill();await once(proc,'exit').catch(()=>{});const absolute=path.resolve(dir);assert.ok(absolute.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(absolute).startsWith('lastpack-auto-'));await rm(absolute,{recursive:true,force:true});}
});
