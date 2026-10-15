// Real UI on an isolated service/profile; never changes the production save.
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE);
const dir=await mkdtemp(path.join(os.tmpdir(),'lastpack-language-')),proc=spawn(process.execPath,['server.mjs','--port=18892'],{cwd:new URL('..',import.meta.url),env:{...process.env,PROFILE_FILE:path.join(dir,'profiles.json'),EPHEMERAL_STORAGE:'1'},stdio:['ignore','pipe','pipe'],windowsHide:true});let browser;
try{
 await new Promise((resolve,reject)=>{proc.stdout.once('data',resolve);proc.once('error',reject);proc.once('exit',c=>reject(Error('Server exited '+c)));});
 browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:18892/');await page.locator('#career-status').filter({hasText:'夜班保安'}).waitFor();
 await page.locator('#language-select').selectOption('en');await page.locator('#menu-title').filter({hasText:'Survive till dawn.'}).waitFor();await page.screenshot({path:'docs/menu-english.png'});
 async function noChinese(){const text=await page.evaluate(()=>{const copy=document.body.cloneNode(true);for(const el of copy.querySelectorAll('[data-i18n-ignore],script,style,input,textarea'))el.remove();document.body.append(copy);const text=copy.innerText;copy.remove();return text;});assert.equal(/[\u3400-\u9fff]/u.test(text),false,text.match(/.{0,20}[\u3400-\u9fff].{0,50}/u)?.[0]);}
 async function tool(id){await page.locator('body').press('Escape');if(!await page.locator('#'+id).isVisible())await page.locator('body.in-run').count()?await page.locator('#shell-menu-button').click():await page.locator('#shell-camp-menu').click();await page.locator('#'+id).click();await page.waitForTimeout(80);}
 await noChinese();await tool('catalog-button');assert.equal(await page.locator('#catalog-category option').nth(1).getAttribute('value'),'奇巧远程');await page.locator('#catalog-category').selectOption('常规枪械');await page.locator('#catalog-list h3').filter({hasText:'Pocket Pistol'}).waitFor();await page.locator('#catalog-tier').selectOption('3');await page.locator('#catalog-list').filter({hasText:'Assistant to the Regional Pistol'}).waitFor();await noChinese();await page.screenshot({path:'docs/weapon-english.png'});
 for(const id of ['items-button','fusion-button','help-button','experience-button','career-button','graphics-button','sound-button','automation-button','monsters-button']){await tool(id);await noChinese();}
 await page.locator('body').press('Escape');await page.locator('#language-select').selectOption('zh');await page.locator('#menu-title').filter({hasText:'活到天亮。'}).waitFor();await tool('catalog-button');assert.equal(await page.locator('#catalog-category option').nth(1).innerText(),'奇巧远程');await page.locator('body').press('Escape');
 await page.locator('#language-select').selectOption('en');await page.reload();await page.locator('#menu-title').filter({hasText:'Survive till dawn.'}).waitFor();assert.equal(await page.locator('#language-select').inputValue(),'en');
 await page.locator('#menu-deploy').click();await page.locator('#nickname').fill('夜班小明');await page.locator('#solo-button').click();await page.locator('#shell-hud').waitFor({state:'visible'});await page.keyboard.press('c');await page.locator('#shell-attributes').waitFor({state:'visible'});await page.locator('#team [data-i18n-ignore]').filter({hasText:'夜班小明'}).waitFor();await noChinese();await page.keyboard.press('Escape');await page.keyboard.press('Escape');await page.locator('#menu-language-select').selectOption('zh');await page.locator('#shell-menu h2').filter({hasText:'歇一会'}).waitFor();await page.locator('#menu-language-select').selectOption('en');await noChinese();await page.keyboard.press('Escape');await page.screenshot({path:'docs/game-english.png'});
 const mobile=await browser.newPage({viewport:{width:390,height:844}});mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto('http://127.0.0.1:18892/');await mobile.locator('#language-select').selectOption('en');await mobile.locator('#menu-title').filter({hasText:'Survive till dawn.'}).waitFor();assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mobile.screenshot({path:'docs/menu-english-mobile.png'});
 assert.deepEqual(errors,[]);console.log('Language UI passed: all menus, filters, rarity flavor, persistence, Chinese restoration, protected callsigns, in-run switching and mobile layout.');
}finally{if(browser)await browser.close();const ended=once(proc,'exit');proc.kill();await ended;await rm(dir,{recursive:true,force:true});}


