import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE);
const dir=await mkdtemp(path.join(os.tmpdir(),'lastpack-panels-')),proc=spawn(process.execPath,['server.mjs','--port=18894'],{cwd:new URL('..',import.meta.url),env:{...process.env,PROFILE_FILE:path.join(dir,'profiles.json')},stdio:['ignore','pipe','pipe'],windowsHide:true});let browser;
try{
 await new Promise((resolve,reject)=>{proc.stdout.once('data',resolve);proc.once('error',reject);});
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1850,height:873}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:18894/');await page.locator('#career-status').filter({hasText:'夜班保安'}).waitFor();
 const originalCanvas=await page.locator('#preview').elementHandle();
 for(const [scene,id] of [[1,'career-dialog'],[2,'weapon-catalog'],[3,'graphics-dialog']]){
  await page.locator(`button[data-scene="${scene}"]`).click();await page.locator(`#camp-panel #${id}`).waitFor({state:'visible'});assert.equal(await page.locator('#'+id).evaluate(d=>d.matches(':modal')),false);assert.equal(await page.locator('dialog:modal').count(),0);assert.equal(await page.locator('#menu-action').isVisible(),false);assert.ok(await originalCanvas.evaluate(c=>c===document.querySelector('#preview')));assert.equal(await page.locator('.menu-orbit').evaluate(e=>getComputedStyle(e).animationName),'camp-orbit');await page.screenshot({path:`docs/camp-panel-${scene}.png`});
 }
 await page.locator('[data-camp-target=sound-button]').click();await page.locator('#camp-panel #sound-settings').waitFor({state:'visible'});await page.locator('#sound-volume').fill('35');await page.locator('#sound-volume').dispatchEvent('input');
 await page.locator('button[data-scene="2"]').click();await page.locator('[data-camp-target=items-button]').click();assert.equal(await page.locator('#item-catalog-list .undiscovered').count(),44);
 await page.locator('#language-select').selectOption('en');await page.locator('#camp-panel-title').filter({hasText:'Codex'}).waitFor();await page.screenshot({path:'docs/camp-panel-english.png'});
 await page.locator('body').press('Escape');assert.equal(await page.locator('#camp-panel').isVisible(),false);await page.locator('body').press('ArrowRight');await page.locator('#camp-panel #career-dialog').waitFor({state:'visible'});
 await page.setViewportSize({width:390,height:844});for(const scene of [1,2,3]){await page.locator(`button[data-scene="${scene}"]`).click();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await page.locator('#camp-panel-content').evaluate(e=>e.scrollWidth<=e.clientWidth+1),'Panel overflow '+scene);await page.screenshot({path:`docs/camp-panel-mobile-${scene}.png`});}
 await page.setViewportSize({width:1440,height:1000});await page.locator('#camp-panel-close').click();await page.locator('#menu-deploy').click();await page.locator('#solo-button').click();await page.locator('#shell-hud').waitFor({state:'visible'});assert.equal(await page.locator('#camp-panel').isVisible(),false);await page.locator('#shell-start').click();await page.locator('#shell-start').waitFor({state:'hidden'});await page.locator('#shell-menu-button').click();await page.locator('#career-button').click();assert.equal(await page.locator('#career-dialog').evaluate(d=>d.matches(':modal')),true);await page.locator('#shell-status').filter({hasText:'Paused'}).waitFor();await page.locator('#close-career').click();assert.deepEqual(errors,[]);console.log('Camp panes passed: direct navigation, shared background, real controls, tabs, English, mobile overflow, Escape/arrows, modal restoration and battle pause.');
}finally{if(browser)await browser.close();const ended=once(proc,'exit');proc.kill();await ended;await rm(dir,{recursive:true,force:true});}
