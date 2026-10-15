import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {WebSocket} from 'ws';
test('authoritative solo suspension survives a real server restart without settling or resetting the run',{timeout:15000},async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'lastpack-resume-')),file=path.join(dir,'profiles.json');let proc;const clients=[];
 async function boot(){proc=spawn(process.execPath,['server.mjs','--port=18890'],{cwd:new URL('..',import.meta.url),env:{...process.env,PROFILE_FILE:file},stdio:['ignore','pipe','pipe'],windowsHide:true});await new Promise((resolve,reject)=>{proc.stdout.once('data',resolve);proc.once('error',reject);proc.once('exit',c=>reject(Error('Server exited '+c)));});}
 async function stop(){const ended=once(proc,'exit');proc.kill();await ended;proc=null;}
 async function client(){const ws=new WebSocket('ws://127.0.0.1:18890/socket'),messages=[];clients.push(ws);ws.on('message',raw=>messages.push(JSON.parse(raw)));ws.on('error',()=>{});await once(ws,'open');return {send:m=>ws.send(JSON.stringify(m)),clear:()=>messages.splice(0),async wait(fn){for(let n=0;n<200;n++){const m=messages.find(fn);if(m)return m;await new Promise(r=>setTimeout(r,20));}throw Error('Timeout');}};}
 try{await boot();for(const route of ['/achievements.mjs','/experience-ui.mjs','/challenges.mjs'])assert.equal((await fetch('http://127.0.0.1:18890'+route)).status,200);const a=await client();a.send({type:'profile'});const profile=await a.wait(m=>m.type==='profile');assert.deepEqual(profile.profile.collection,{weapons:['pistol'],items:[]});a.send({type:'create',solo:true});const welcome=await a.wait(m=>m.type==='welcome');a.clear();a.send({type:'selectChallenge',key:'bare'});await a.wait(m=>m.type==='error'&&m.message.includes('解锁'));a.clear();a.send({type:'ready'});const started=await a.wait(m=>m.type==='state'&&m.state.phase==='battle');a.clear();a.send({type:'suspend'});await a.wait(m=>m.type==='suspended');await stop();await boot();const b=await client();b.send({type:'profile',profileToken:profile.profileToken});const restoredProfile=await b.wait(m=>m.type==='profile');assert.equal(restoredProfile.profile.records.runs,0);b.send({type:'resume',token:welcome.token});const restored=await b.wait(m=>m.type==='state');assert.equal(restored.state.runId,started.state.runId);assert.equal(restored.state.wave,started.state.wave);assert.deepEqual(restored.state.players[0].weapons,started.state.players[0].weapons);assert.ok(restored.state.players[0].connected);assert.ok(!JSON.stringify(restored.state).includes(profile.profileToken));}
 finally{for(const c of clients)c.terminate();if(proc)await stop();await rm(dir,{recursive:true,force:true});}
});
