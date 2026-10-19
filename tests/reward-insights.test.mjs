import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,addPlayer,stats} from '../shared/game.mjs';
import {rewardInsights,weaponComparison,directFirepower} from '../shared/reward-insights.mjs';
import {translateText} from '../public/i18n.mjs';
function player(){return addPlayer(createRoom('PREVIEW',17,true,true,true),'p','Test');}
test('reward preview includes actual equipment bonuses and never mutates the player',()=>{const p=player(),before=structuredClone(p),notes=rewardInsights(p,'armor');assert.ok(notes.some(n=>n.includes('生命 +')));assert.deepEqual(p,before);const gun={type:'weapon',kind:'pistol',tier:1};assert.ok(rewardInsights(p,gun).some(n=>n.includes('可合成')));assert.ok(rewardInsights(p,gun).some(n=>n.includes('装备后')));});
test('full slots show both replacement estimates without claiming an immediate buff',()=>{const p=player();p.weapons[1]='rifle';const notes=rewardInsights(p,{type:'weapon',kind:'pistol',tier:4});assert.ok(notes.some(n=>n.includes('当前火力不变')));assert.equal(notes.filter(n=>n.startsWith('替换')).length,2);assert.match(weaponComparison(p,{kind:'pistol',tier:4},0),/旧武器进入备用区/);});
test('direct-hit metric includes reload and double shots, not invented AOE damage',()=>{const w=stats(player()).weapons[0];assert.equal(directFirepower(w),w.damage/(w.interval+w.reload/w.clip));assert.equal(directFirepower({...w,splash:400}),directFirepower(w));assert.equal(directFirepower({...w,double:true}),directFirepower(w)*1.5);});
test('unplaceable accessories report storage, never a phantom active faction bonus',()=>{const p=player();p.items=Array.from({length:30},(_,n)=>({id:'i'+n,kind:'battery',x:n%6,y:Math.floor(n/6),rotated:false,target:0}));const notes=rewardInsights(p,'armor');assert.deepEqual(notes,['背包放不下，先存储物区']);});
test('dynamic comparisons and new encounter messages translate without Chinese fragments',()=>{const p=player();p.weapons=['snowstaff','rocket'];p.weaponTiers=[4,4];for(const note of [...rewardInsights(p,{type:'weapon',kind:'pistol',tier:4}),...rewardInsights(p,'armor'),'精英将至 · 击败后掉落聚能补给','聚能补给 · 经验回收 / 火力全开'])assert.equal(/[\u3400-\u9fff]/u.test(translateText(note,'en')),false,note);});
