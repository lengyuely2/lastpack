import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {WebSocket} from 'ws';
import {freshProfile} from '../shared/progression.mjs';
test('real server persists earned loadouts, freezes battle equipment and enforces map authority',{timeout:15000},async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'lastpack-expedition-')),file=path.join(dir,'profiles.json'),token='aa'.repeat(24),profile=freshProfile();Object.assign(profile.records,{runs:3,kills:1000,bosses:3,wins:1,bestLevel:10});await writeFile(file,JSON.stringify({version:1,profiles:[[token,profile]]}));
 const proc=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'18889',PROFILE_FILE:file},stdio:['ignore','pipe','pipe'],windowsHide:true}),clients=[];
 function client(){const ws=new WebSocket('ws://127.0.0.1:18889/socket'),messages=[],waiters=[];clients.push(ws);ws.on('message',raw=>{const m=JSON.parse(raw);messages.push(m);for(const w of [...waiters])if(w.match(m)){clearTimeout(w.timer);waiters.splice(waiters.indexOf(w),1);w.resolve(m);}});ws.on('error',()=>{});return {ws,send:m=>ws.send(JSON.stringify(m)),clear:()=>messages.splice(0),wait(match){const found=messages.find(match);if(found)return Promise.resolve(found);return new Promise((resolve,reject)=>{const w={match,resolve,timer:setTimeout(()=>reject(Error('Network verification timed out')),6000)};waiters.push(w);});}};}
 try{
  await new Promise((resolve,reject)=>{proc.stdout.once('data',resolve);proc.once('error',reject);proc.once('exit',code=>reject(Error('Server exited '+code)));});
  for(const route of ['/expedition.mjs','/expedition-ui.mjs','/game.mjs','/art.mjs'])assert.equal((await fetch('http://127.0.0.1:18889'+route)).status,200);
  const a=client();await once(a.ws,'open');a.send({type:'profile',profileToken:token});await a.wait(m=>m.type==='profile');a.clear();a.send({type:'selectStarter',key:'wand'});await a.wait(m=>m.type==='profile'&&m.profile.expedition.starter==='wand');a.send({type:'selectRelic',key:'compass'});await a.wait(m=>m.type==='profile'&&m.profile.expedition.relic==='compass');a.send({type:'create',name:'Host',solo:false});const welcome=await a.wait(m=>m.type==='welcome'),first=await a.wait(m=>m.type==='state');const own=first.state.players[0];assert.deepEqual(own.weapons,['wand',null]);assert.equal(own.rewardRerolls,4);assert.deepEqual(own.items,[]);
  const b=client();await once(b.ws,'open');b.send({type:'join',name:'Guest',code:first.state.code});await b.wait(m=>m.type==='welcome');await a.wait(m=>m.type==='state'&&m.state.players.length===2);b.clear();b.send({type:'selectMap',key:'laboratory'});await b.wait(m=>m.type==='error'&&m.message.includes('房主'));a.clear();a.send({type:'selectMap',key:'laboratory'});await a.wait(m=>m.type==='state'&&m.state.map==='laboratory');
  b.clear();b.send({type:'selectStarter',key:'snowstaff'});await b.wait(m=>m.type==='error'&&m.message.includes('尚未解锁'));a.clear();a.send({type:'ready'});await a.wait(m=>m.type==='state'&&m.state.players.find(p=>p.id===welcome.playerId).ready);a.clear();a.send({type:'selectRelic',key:'echo'});await a.wait(m=>m.type==='error'&&m.message.includes('取消准备'));
  b.send({type:'ready'});await a.wait(m=>m.type==='state'&&m.state.phase==='battle');a.clear();a.send({type:'selectRelic',key:'echo'});await a.wait(m=>m.type==='profile'&&m.profile.expedition.relic==='echo');const live=await a.wait(m=>m.type==='state'&&m.state.phase==='battle');assert.equal(live.state.players.find(p=>p.id===welcome.playerId).relic,'compass');
  const saved=JSON.parse(await readFile(file,'utf8')).profiles.find(([id])=>id===token)[1];assert.equal(saved.expedition.starter,'wand');assert.equal(saved.expedition.relic,'echo');assert.equal(saved.gold,0);
 }finally{for(const ws of clients)ws.terminate();proc.kill();await once(proc,'exit').catch(()=>{});await rm(dir,{recursive:true,force:true});}
});
