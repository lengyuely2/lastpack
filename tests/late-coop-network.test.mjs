import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {WebSocket} from 'ws';
import {RoomStore} from '../room-store.mjs';
import {ProfileStore} from '../profile-store.mjs';
import {createRoom,addPlayer,action,grantExperience} from '../shared/game.mjs';
test('late-session four-client rewards stay private, shared time resumes after a chooser disconnects, and reconnect restores pending choices',{timeout:15000},async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'lastpack-late-coop-')),file=path.join(dir,'profiles.json'),room=createRoom('LATE',17,false,true,true),sessions=new Map(),profiles=await new ProfileStore(file).load(),tokens=[],clients=[];let proc;
 async function connect(n){const ws=new WebSocket('ws://127.0.0.1:18897/socket'),messages=[];clients.push(ws);ws.on('message',v=>messages.push(JSON.parse(v)));ws.on('error',()=>{});await once(ws,'open');const c={ws,send:m=>ws.send(JSON.stringify(m)),async wait(fn){for(let n=0;n<300;n++){const m=messages.find(fn);if(m)return m;await new Promise(r=>setTimeout(r,10));}throw Error('Late coop timeout');}};c.send({type:'profile',profileToken:tokens[n].profile});await c.wait(m=>m.type==='profile');c.send({type:'resume',token:tokens[n].session});await c.wait(m=>m.type==='welcome');return c;}
 try{
  for(let n=0;n<4;n++){const opened=await profiles.open(),p=addPlayer(room,'p'+n,'QA '+n),token=String(n+1).repeat(48);tokens.push({profile:opened.token,session:token});room.profileTokens[p.id]=opened.token;sessions.set(token,{token,room,player:p,ws:null});}
  for(const p of room.players)action(room,p,{type:'ready'});room.survivalTime=1200;room.time=1200;room.nextBossAt=1500;room.bossCount=3;room.nextEliteAt=1e9;room.nextEventAt=1e9;room.nextSpawn=1e9;grantExperience(room,5);await new RoomStore(file+'.rooms').save(new Map([[room.code,room]]),sessions);
  proc=spawn(process.execPath,['server.mjs','--port=18897'],{cwd:new URL('..',import.meta.url),env:{...process.env,PROFILE_FILE:file},stdio:['ignore','pipe','pipe'],windowsHide:true});await new Promise((r,j)=>{proc.stdout.once('data',r);proc.once('error',j);});const peers=[];for(let n=0;n<4;n++)peers.push(await connect(n));
  for(let n=0;n<4;n++){const m=await peers[n].wait(m=>m.type==='state'&&m.state.phase==='upgrade'&&m.state.players.every(p=>p.connected));assert.ok(m.state.survivalTime>=1200);for(const p of m.state.players)assert.equal(p.rewards.length,p.id==='p'+n?3:0);assert.ok(!JSON.stringify(m.state).includes(tokens[n].profile));}
  for(let n=0;n<3;n++)peers[n].send({type:'reward',index:0});peers[3].ws.close();const resumed=await peers[0].wait(m=>m.type==='state'&&m.state.phase==='battle'&&!m.state.players[3].connected);const fourth=await connect(3);const paused=await fourth.wait(m=>m.type==='state'&&m.state.phase==='upgrade');assert.ok(paused.state.players[3].rewardPending);assert.ok(paused.state.survivalTime>=resumed.state.survivalTime);fourth.send({type:'reward',index:0});await fourth.wait(m=>m.type==='state'&&m.state.phase==='battle'&&m.state.players.every(p=>!p.rewardPending));
 }finally{for(const ws of clients)ws.terminate();if(proc){const ended=once(proc,'exit');proc.kill();await ended;}await rm(dir,{recursive:true,force:true});}
});
