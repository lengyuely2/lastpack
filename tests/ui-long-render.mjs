import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,rm,readFile,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE),dir=await mkdtemp(path.join(os.tmpdir(),'lastpack-render-')),proc=spawn(process.execPath,['server.mjs','--port=18896'],{cwd:new URL('..',import.meta.url),env:{...process.env,PROFILE_FILE:path.join(dir,'profiles.json')},stdio:['ignore','pipe','pipe'],windowsHide:true});let browser;
try{
 await new Promise((r,j)=>{proc.stdout.once('data',r);proc.once('error',j);});browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:18896/?lang=zh');await page.locator('#career-status').filter({hasText:'夜班保安'}).waitFor();const fixture=JSON.parse(await readFile('docs/long-session-render.json','utf8'));
 const result=await page.evaluate(async fixture=>{const {drawField}=await import('/art.mjs');const {rewardInsights}=await import('/reward-insights.mjs');const canvas=document.querySelector('#arena');canvas.width=960;canvas.height=620;document.querySelector('#landing').classList.add('hidden');document.querySelector('#game').classList.remove('hidden');document.body.classList.add('in-run');const timings=[];
  const dense=structuredClone(fixture);dense.enemies=Array.from({length:160},(_,n)=>({...fixture.enemies[n%fixture.enemies.length],id:'qa'+n,x:30+n%16*58,y:40+Math.floor(n/16)*55}));dense.gems=Array.from({length:500},(_,n)=>({id:'g'+n,x:30+n%25*36,y:30+Math.floor(n/25)*28,value:5,tier:'green',color:'#9ae8bc'}));dense.effects=Array.from({length:320},(_,n)=>({id:10000+n,type:n%3?'shot':'blast',owner:'p0',x:30+n%16*58,y:50+Math.floor(n/16)%10*55,tx:480,ty:310,radius:90,color:'#efc086',tier:4,visual:'fireball',life:.5,duration:.7}));
  for(const quality of ['low','balanced','high']){const samples=[];for(let n=0;n<90;n++){const start=performance.now();drawField(canvas,dense,{quality,ownId:'p0',now:n*.016,numbers:true,strength:1,motion:true});samples.push(performance.now()-start);if(n%15===0)await new Promise(requestAnimationFrame);}samples.sort((a,b)=>a-b);timings.push({quality,drawP95ms:+samples[Math.floor(samples.length*.95)].toFixed(2),maxMs:+samples.at(-1).toFixed(2)});}
  drawField(canvas,fixture,{quality:'balanced',ownId:'p0',now:1200,numbers:true,strength:.65,motion:false});return {timings,notes:rewardInsights(fixture.players[0],{type:'weapon',kind:'pistol',tier:4}),counts:{enemies:dense.enemies.length,gems:dense.gems.length,effects:dense.effects.length}};
 },fixture);
 await page.screenshot({path:'docs/late-session-player-clarity.png'});assert.equal(result.counts.enemies,160);assert.ok(result.timings.every(v=>Number.isFinite(v.drawP95ms)));assert.deepEqual(errors,[]);await writeFile('docs/render-audit.json',JSON.stringify(result,null,2));console.log('Late-session browser render passed: '+JSON.stringify(result));
}finally{if(browser)await browser.close();const ended=once(proc,'exit');proc.kill();await ended;await rm(dir,{recursive:true,force:true});}
