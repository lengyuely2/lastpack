import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {translateText as t,setLanguage,getLanguage,initialLanguage} from '../public/i18n.mjs';
import {EN} from '../public/locale-en.mjs';
import {WEAPONS,ITEMS,FUSIONS,weaponStats,weaponFlavor,weaponEffectText} from '../shared/game.mjs';
const han=/[\u3400-\u9fff]/u;
test('first visits default to English; explicit links and saved choices remain available',()=>{
 assert.equal(initialLanguage(null,null),'en');assert.equal(initialLanguage('invalid','fr'),'en');assert.equal(initialLanguage(null,'zh'),'zh');assert.equal(initialLanguage(null,'en'),'en');assert.equal(initialLanguage('zh','en'),'zh');assert.equal(initialLanguage('en','zh'),'en');
});
test('English covers all existing source phrases, and Chinese is returned exactly',async()=>{
 const phrases=JSON.parse(await readFile(new URL('../docs/i18n-phrases.json',import.meta.url),'utf8'));
 for(const zh of phrases){assert.ok(EN[zh],zh);assert.equal(han.test(t(zh,'en')),false,zh);assert.equal(t(zh,'zh'),zh);}
});
test('all weapon rarities, fusion flavor, item descriptions and names have English copy',()=>{
 for(const kind of Object.keys(WEAPONS))for(let tier=1;tier<=4;tier++){const w=weaponStats(kind,tier);for(const s of [w.name,w.tierName,weaponFlavor(kind,tier),weaponEffectText(w)])assert.equal(han.test(t(s,'en')),false,s);}
 for(const item of Object.values(ITEMS))for(const s of [item.name,item.text])assert.equal(han.test(t(s,'en')),false,s);
 for(const w of Object.values(FUSIONS))for(const s of [w.name,w.desc,w.flavor])assert.equal(han.test(t(s,'en')),false,s);
});
test('localized jokes, numbers, rarity and reversible language are stable',()=>{
 assert.equal(t('吸血鬼的保温杯','en'),"Count Sipula's Thermos");assert.equal(t('脾气爆炸的樱桃','en'),'Cherry Issues');
 assert.match(t('每秒恢复 1.5 HP，最大生命 +10','en'),/1\.5 HP, Max HP \+10/);
 assert.match(t(weaponFlavor('pistol',3),'en'),/Assistant.*Regional Pistol/);
 assert.equal(t('？？','en'),'？？');assert.equal(t('AB12CD','en'),'AB12CD');
 setLanguage('en');assert.equal(getLanguage(),'en');assert.equal(t('再来一局'),'One more run');setLanguage('zh');assert.equal(t('再来一局'),'再来一局');assert.throws(()=>setLanguage('fr'));
});
