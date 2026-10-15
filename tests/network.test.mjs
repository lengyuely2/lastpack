import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {WebSocket} from 'ws';
const port=18879;
class Client {
  constructor(){this.ws=new WebSocket(`ws://127.0.0.1:${port}/socket`);this.messages=[];this.waiters=[];this.ws.on('message',raw=>{const m=JSON.parse(raw);this.messages.push(m);for(const w of [...this.waiters])if(w.match(m)){clearTimeout(w.timer);this.waiters.splice(this.waiters.indexOf(w),1);w.resolve(m);}});this.ws.on('error',()=>{});}
  async open(){await once(this.ws,'open');return this;}
  send(msg){this.ws.send(JSON.stringify(msg));}
  wait(match,ms=8000){const existing=this.messages.find(match);if(existing)return Promise.resolve(existing);return new Promise((resolve,reject)=>{const w={match,resolve,timer:setTimeout(()=>{this.waiters=this.waiters.filter(x=>x!==w);reject(Error('Timed out waiting for network state'));},ms)};this.waiters.push(w);});}
  clear(){this.messages=[];}
  close(){this.ws.close();}
}
test('two real clients share combat/XP, freeze on level-up, select upgrades and recover sessions', {timeout:60000}, async()=>{
  const profileDir=await mkdtemp(path.join(os.tmpdir(),'lastpack-net-'));
  const proc=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),PROFILE_FILE:path.join(profileDir,'profiles.json')},stdio:['ignore','pipe','pipe'],windowsHide:true});
  const clients=[];try{
    await new Promise((resolve,reject)=>{proc.stdout.once('data',resolve);proc.once('error',reject);proc.once('exit',code=>reject(Error(`Test server exited ${code}`)));});
    const health=await fetch(`http://127.0.0.1:${port}/health`);assert.equal(health.status,200);
    const a=await new Client().open();clients.push(a);a.send({type:'create',name:'Alpha',solo:false});const wa=await a.wait(m=>m.type==='welcome');const first=await a.wait(m=>m.type==='state');const code=first.state.code;
    const b=await new Client().open();clients.push(b);b.send({type:'join',name:'Bravo',code});const wb=await b.wait(m=>m.type==='welcome');await a.wait(m=>m.type==='state'&&m.state.players.length===2);
    assert.deepEqual(first.state.players[0].items,[]);
    assert.deepEqual(first.state.players[0].weapons,['pistol',null]);assert.deepEqual(first.state.players[0].weaponTiers,[1,1]);
    a.send({type:'weapon',slot:1,kind:'frost'});await a.wait(m=>m.type==='error'&&m.message.includes('升级奖励'));
    a.clear();b.clear();a.send({type:'ready'});const half=await a.wait(m=>m.type==='state'&&m.state.players.find(p=>p.id===wa.playerId).ready);assert.equal(half.state.phase,'prepare');b.send({type:'ready'});
    const combat=await a.wait(m=>m.type==='state'&&m.state.phase==='battle');assert.equal(combat.state.wave,1);
    a.send({type:'place',id:'not-owned',x:5,y:0});await a.wait(m=>m.type==='error'&&m.message.includes('锁定'));
    const sa=await a.wait(m=>m.type==='state'&&m.state.enemies.length>0),sb=await b.wait(m=>m.type==='state'&&m.state.time===sa.state.time);assert.deepEqual(sa.state.enemies,sb.state.enemies);
    b.close();await a.wait(m=>m.type==='state'&&!m.state.players.find(p=>p.id===wb.playerId).connected);
    const restored=await new Client().open();clients.push(restored);restored.send({type:'resume',token:wb.token});const welcome=await restored.wait(m=>m.type==='welcome');assert.equal(welcome.playerId,wb.playerId);
    await a.wait(m=>m.type==='state'&&m.state.players.find(p=>p.id===wb.playerId).connected&&m.state.time>sa.state.time);
    const reward=await a.wait(m=>m.type==='state'&&m.state.phase==='upgrade'&&m.state.wave===1,30000);const own=reward.state.players.find(p=>p.id===wa.playerId),other=reward.state.players.find(p=>p.id===wb.playerId);assert.equal(own.rewards.length,3);assert.equal(other.rewards.length,0);assert.equal(own.level,other.level);assert.equal(own.totalXp,other.totalXp);assert.ok(own.level>=2);
    const frozenTime=reward.state.time;const guestReward=await restored.wait(m=>m.type==='state'&&m.state.phase==='upgrade');assert.equal(guestReward.state.time,frozenTime);assert.equal(guestReward.state.players.find(p=>p.id===wb.playerId).rewards.length,3);
    assert.equal(own.rewards[0].kind,'pistol');assert.ok(own.rewards[0].tier>=1&&own.rewards[0].tier<=4);assert.equal(own.rewards[1].type,'weapon');assert.equal(typeof own.rewards[2],'string');
    a.clear();a.send({type:'ready'});await a.wait(m=>m.type==='error'&&m.message.includes('选择'));
    for(let i=0;i<own.pendingUpgrades;i++){a.clear();a.send({type:'reward',index:0});await a.wait(m=>m.type==='state'&&m.state.players.find(p=>p.id===wa.playerId).pendingUpgrades===own.pendingUpgrades-i-1);}
    const armed=await a.wait(m=>m.type==='state'&&m.state.players.find(p=>p.id===wa.playerId).pendingUpgrades===0);const equipped=armed.state.players.find(p=>p.id===wa.playerId);assert.equal(equipped.weapons[1],'pistol');assert.equal(equipped.weaponTiers[1],own.rewards[0].tier);assert.equal(equipped.weaponTiers[0],1);
    a.clear();a.send({type:'reward',index:1});await a.wait(m=>m.type==='error'&&m.message.includes('无效'));
    const waiting=armed;assert.equal(waiting.state.phase,'upgrade');assert.equal(waiting.state.time,frozenTime);
    // Disconnecting a teammate still choosing cannot strand the remaining player.
    a.clear();restored.close();await a.wait(m=>m.type==='state'&&m.state.phase==='battle');
    const again=await new Client().open();clients.push(again);a.clear();again.send({type:'resume',token:wb.token});await again.wait(m=>m.type==='welcome');const repaused=await a.wait(m=>m.type==='state'&&m.state.phase==='upgrade');assert.equal(repaused.state.players.find(p=>p.id===wb.playerId).pendingUpgrades,other.pendingUpgrades);
    for(let i=0;i<other.pendingUpgrades;i++){again.clear();again.send({type:'reward',index:i===0?2:0});await again.wait(m=>m.type==='state'&&m.state.players.find(p=>p.id===wb.playerId).pendingUpgrades===other.pendingUpgrades-i-1);}
    const rewardKind=guestReward.state.players.find(p=>p.id===wb.playerId).rewards[2];const award=await again.wait(m=>m.type==='state'&&m.state.players.find(p=>p.id===wb.playerId).items.some(i=>i.kind===rewardKind));const earned=award.state.players.find(p=>p.id===wb.playerId).items.find(i=>i.kind===rewardKind);
    assert.equal(award.state.phase,'battle');assert.notEqual(earned.x,null,'earned item is automatically placed');
    again.clear();again.send({type:'gift',id:earned.id,playerId:wa.playerId});await again.wait(m=>m.type==='error'&&m.message.includes('锁定'));
  }finally{for(const c of clients)c.ws.terminate();proc.kill();await once(proc,'exit').catch(()=>{});await rm(profileDir,{recursive:true,force:true});}
});

test('real clients sync independent movement modes, directional input, stops and reconnect safety', {timeout:15000}, async()=>{
  const profileDir=await mkdtemp(path.join(os.tmpdir(),'lastpack-net-'));
  const proc=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:String(port),PROFILE_FILE:path.join(profileDir,'profiles.json')},stdio:['ignore','pipe','pipe'],windowsHide:true});
  const clients=[];try{
    await new Promise((resolve,reject)=>{proc.stdout.once('data',resolve);proc.once('error',reject);proc.once('exit',code=>reject(Error(`Test server exited ${code}`)));});
    assert.equal((await fetch(`http://127.0.0.1:${port}/controls.mjs`)).status,200);
    const a=await new Client().open();clients.push(a);a.send({type:'create',name:'手动玩家',solo:false});const wa=await a.wait(m=>m.type==='welcome');const first=await a.wait(m=>m.type==='state');
    const b=await new Client().open();clients.push(b);b.send({type:'join',name:'自动玩家',code:first.state.code});const wb=await b.wait(m=>m.type==='welcome');await a.wait(m=>m.type==='state'&&m.state.players.length===2);
    a.clear();b.clear();a.send({type:'controlMode',mode:'manual'});const mode=await b.wait(m=>m.type==='state'&&m.state.players.find(p=>p.id===wa.playerId).controlMode==='manual');assert.equal(mode.state.players.find(p=>p.id===wb.playerId).controlMode,'auto');
    a.send({type:'ready'});await a.wait(m=>m.type==='state'&&m.state.players.find(p=>p.id===wa.playerId).ready);b.send({type:'ready'});const battle=await a.wait(m=>m.type==='state'&&m.state.phase==='battle');const initialX=battle.state.players.find(p=>p.id===wa.playerId).x;
    a.clear();b.clear();a.send({type:'move',x:1,y:0});const moved=await a.wait(m=>m.type==='state'&&m.state.players.find(p=>p.id===wa.playerId).x>initialX+2);const shared=await b.wait(m=>m.type==='state'&&m.state.time===moved.state.time);assert.equal(shared.state.players.find(p=>p.id===wa.playerId).x,moved.state.players.find(p=>p.id===wa.playerId).x);
    a.clear();const expired=await a.wait(m=>m.type==='state'&&m.state.time>=moved.state.time+.6);const stopped=expired.state.players.find(p=>p.id===wa.playerId);assert.deepEqual(stopped.moveInput,{x:0,y:0});a.clear();const still=await a.wait(m=>m.type==='state'&&m.state.time>=expired.state.time+.3);assert.equal(still.state.players.find(p=>p.id===wa.playerId).x,stopped.x);
    a.clear();a.send({type:'move',x:99,y:0});await a.wait(m=>m.type==='error'&&m.message.includes('方向无效'));
    a.send({type:'move',x:-1,y:0});b.clear();a.close();const offline=await b.wait(m=>m.type==='state'&&!m.state.players.find(p=>p.id===wa.playerId).connected);assert.deepEqual(offline.state.players.find(p=>p.id===wa.playerId).moveInput,{x:0,y:0});
    const resumed=await new Client().open();clients.push(resumed);resumed.send({type:'resume',token:wa.token});await resumed.wait(m=>m.type==='welcome');const restored=await resumed.wait(m=>m.type==='state');const player=restored.state.players.find(p=>p.id===wa.playerId);assert.equal(player.controlMode,'manual');assert.deepEqual(player.moveInput,{x:0,y:0});
    resumed.clear();resumed.send({type:'controlMode',mode:'auto'});await resumed.wait(m=>m.type==='state'&&m.state.players.find(p=>p.id===wa.playerId).controlMode==='auto');
  }finally{for(const c of clients)c.ws.terminate();proc.kill();await once(proc,'exit').catch(()=>{});await rm(profileDir,{recursive:true,force:true});}
});
