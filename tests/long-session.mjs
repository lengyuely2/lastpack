// Accelerated full-session audit. Diagnostic fixtures never touch live saves.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createRoom,addPlayer,action,tick,snapshot,stats,fits} from '../shared/game.mjs';
const results=[],renderFixtures=[];
for(const config of [{seed:17,crew:1,build:'balanced'},{seed:42,crew:1,build:'sustain'},{seed:99,crew:1,build:'arcane'},{seed:77,crew:4,build:'balanced'},{seed:123,crew:4,build:'arcane',diagnostic:true}]){
 const r=createRoom('AUDIT'+config.seed,config.seed,config.crew===1,true,true),players=Array.from({length:config.crew},(_,n)=>addPlayer(r,'p'+n,'QA '+n)),times=[],peak={enemies:0,gems:0,effects:0,bytes:0};
 for(const [n,p]of players.entries()){p.autoRewards={...p.autoRewards,enabled:true,delay:2,build:config.build,allowMerge:true,allowFusion:true,fullInventory:'skip'};if(config.diagnostic){p.metaBonus={health:1000,regen:20};p.weapons=[['stormorb','meteorbook','snowstaff','rocket'][n],'shredder'];p.weaponTiers=[4,4];for(const kind of ['spellbook','rune','manabottle','cherrybomb','powder']){outer:for(const rotated of [false,true])for(let y=0;y<5;y++)for(let x=0;x<6;x++){const item={id:'fixture'+p.items.length,kind,x,y,rotated,target:0};if(fits(p,item)){p.items.push(item);break outer;}}}}action(r,p,{type:'ready'});}
 let steps=0;const start=performance.now();
 while(!['defeat','victory'].includes(r.phase)&&r.survivalTime<1800&&steps++<60000){
  if(r.phase==='event'){const p=players.find(p=>p.id===r.eventChoice.owner)||players[0];action(r,p,{type:'eventChoice',id:r.eventChoice.id,choice:'decline'});}
  const at=performance.now();tick(r,.1);times.push(performance.now()-at);
  if(steps%50===0){const s=snapshot(r,'p0'),bytes=Buffer.byteLength(JSON.stringify(s));peak.bytes=Math.max(peak.bytes,bytes);for(const k of ['enemies','gems','effects'])peak[k]=Math.max(peak[k],s[k].length);assert.ok(s.players.every(p=>Number.isFinite(p.hp)&&p.hp>=0&&p.items.length<=46&&p.weaponStash.length<=12));assert.ok(s.enemies.length<=170&&s.gems.length<=510&&s.effects.length<=320);if(config.diagnostic&&r.survivalTime>=1200&&renderFixtures.length<1)renderFixtures.push(s);}
 }
 assert.ok(steps<60000,'Run stalled');if(config.diagnostic)assert.ok(r.survivalTime>=1200||r.phase==='victory','Diagnostic must exercise the complete session');times.sort((a,b)=>a-b);
 results.push({...config,seconds:Math.round(r.survivalTime),outcome:r.phase,bosses:r.bossCount,bossKills:r.bossKills,kills:r.kills,levels:players.map(p=>p.level),peak,tickP95ms:+times[Math.floor(times.length*.95)].toFixed(3),elapsedMs:Math.round(performance.now()-start)});
}
await writeFile('docs/long-session-audit.json',JSON.stringify(results,null,2));await writeFile('docs/long-session-render.json',JSON.stringify(renderFixtures[0]));console.log(JSON.stringify(results,null,2));
