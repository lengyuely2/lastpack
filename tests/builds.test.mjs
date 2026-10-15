import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoom,addPlayer,action,stats,tick,hurtPlayer,weaponStats,ITEMS,WEAPONS,itemRarity,isWeaponItem,weaponFlavor,weaponCategory,fits,eligibleFusions} from '../shared/game.mjs';
import {chooseAutoReward,validateAutoRewards} from '../shared/auto-rewards.mjs';
function fixture(kind='pistol',tier=1){const r=createRoom('BUILDS',17,true),p=addPlayer(r,'p','测试');p.weapons=[kind,null];p.weaponTiers=[tier,1];action(r,p,{type:'ready'});p.controlMode='manual';r.nextSpawn=1000;r.total=100;r.random=()=>.99;return {r,p};}
function equip(p,kind,x=0,y=0,target=0){p.items.push({id:'i'+p.items.length,kind,x,y,target,rotated:false});}
function enemy(r,p,id,dx,dy=0){const e={id,kind:'walker',x:p.x+dx,y:p.y+dy,hp:1000,maxHp:1000,speed:0,damage:10,radius:10,slow:0,burn:0,burnDps:0,attack:100,angle:0};r.enemies.push(e);return e;}
test('44 real item rewards and 27 weapons have valid rarity and unique introductions',()=>{
 assert.equal(Object.keys(ITEMS).length,44);assert.equal(Object.keys(WEAPONS).length,27);
 for(const k of Object.keys(ITEMS))assert.ok(itemRarity(k)>=1&&itemRarity(k)<=4);
 for(const k of ['stormorb','meteorbook','snowstaff'])assert.equal(new Set([1,2,3,4].map(t=>weaponFlavor(k,t))).size,4);
});
test('new regeneration and kill healing affect actual HP; storage stays inactive',()=>{
 const {r,p}=fixture();equip(p,'bloodbag');equip(p,'bandage',1);p.hp=50;p.shots[0].cooldown=100;enemy(r,p,'idle',400);tick(r,1);assert.ok(Math.abs(p.hp-51.875)<1e-8);
 p.shots[0].cooldown=0;const e=enemy(r,p,'weak',80);e.hp=1;tick(r,.1);assert.equal(p.kills,1);assert.ok(p.hp>54);
 const baseline=stats({...p,items:[]});p.items.forEach(i=>i.x=null);assert.deepEqual(stats(p),baseline);
});
test('dodge fully cancels damage and heals, failed rolls still mitigate; no dead revival',()=>{
 const {r,p}=fixture();equip(p,'rabbitfoot');equip(p,'ducttape',2);p.hp=50;r.dodgeRandom=()=>0;
 assert.equal(hurtPlayer(r,p,100),0);assert.equal(p.hp,54);assert.ok(r.effects.some(e=>e.type==='dodge'));
 r.dodgeRandom=()=>.99;assert.equal(hurtPlayer(r,p,10),8.8);assert.ok(Math.abs(p.hp-45.2)<1e-8);
 p.hp=0;assert.equal(hurtPlayer(r,p,100),0);assert.equal(p.hp,0);
});
test('dodge chance, dodge-healing caps and attack RNG independence are enforced',()=>{
 const {r,p}=fixture();for(let n=0;n<6;n++)equip(p,'rabbitfoot');assert.ok(Math.abs(stats(p).dodge-.42)<1e-8);assert.equal(stats(p).dodgeHeal,12);
 equip(p,'umbrella');assert.equal(stats(p).dodge,.45);let draws=0;r.random=()=>{draws++;return .5;};r.dodgeRandom=()=>.99;hurtPlayer(r,p,1);assert.equal(draws,0);
});
test('bomb accessory adds real splash to a pistol and global explosive boosts affect its victims',()=>{
 const {r,p}=fixture();equip(p,'cherrybomb');equip(p,'powder',2);equip(p,'blastheart',4);
 const w=stats(p).weapons[0];assert.ok(Math.abs(w.splash-45*1.1*1.3)<1e-8);assert.equal(w.blastPower,.25);
 const a=enemy(r,p,'a',80),b=enemy(r,p,'b',110);tick(r,.2);
 assert.equal(a.hp,985);assert.ok(Math.abs(b.hp-(1000-15*.55*1.25))<1e-8);assert.ok(r.effects.some(e=>e.type==='blast'));
});
test('magic attachments buff only the bound magic weapon, while soda buffs all magic slots',()=>{
 const {p}=fixture('stormorb');p.weapons[1]='rifle';equip(p,'spellbook');equip(p,'rune',2);equip(p,'manabottle',4);
 const s=stats(p);assert.ok(Math.abs(s.weapons[0].damage-19*1.2*1.12)<1e-8);assert.ok(Math.abs(s.weapons[0].interval-.95/1.18)<1e-8);
 assert.equal(s.weapons[1].damage,weaponStats('rifle').damage);assert.equal(s.weapons[1].interval,weaponStats('rifle').interval);
 p.items[0].target=1;p.items[1].target=1;assert.equal(stats(p).weapons[1].damage,weaponStats('rifle').damage);assert.equal(stats(p).weapons[0].damage,19);assert.ok(!stats(p).combos.some(c=>c.key==='spellbook'));
 assert.equal(isWeaponItem('spellbook'),true);assert.equal(isWeaponItem('manabottle'),false);
});
test('new auto build preferences validate and arcane accessories bind to an actual magic slot',()=>{
 for(const build of ['arcane','explosion','dodge'])assert.equal(validateAutoRewards({build}).build,build);
 const {p}=fixture('rifle',4);p.weapons[1]='stormorb';p.rewardPending=true;p.rewards=['spellbook'];p.autoRewards={...p.autoRewards,enabled:true,build:'arcane'};
 const choice=chooseAutoReward(p,{weaponStats,weaponCategory,ITEMS,itemRarity,fits,eligibleFusions});assert.equal(choice.target,1);
});
test('magic range modifiers apply regardless of item order with added explosive rounds',()=>{
 const {p}=fixture('wand');equip(p,'rune');equip(p,'cherrybomb',3);const a=stats(p).weapons[0];p.items.reverse();const b=stats(p).weapons[0];assert.equal(a.splash,b.splash);assert.equal(a.splash,45*1.25);assert.equal(a.statusDuration,1.2);
});
test('new spell attacks produce distinct real chain, explosion and frost effects with no reload',()=>{
 for(const kind of ['stormorb','meteorbook','snowstaff']){const {r,p}=fixture(kind,4);const a=enemy(r,p,'a',80),b=enemy(r,p,'b',105);tick(r,.2);assert.ok(a.hp<1000);assert.equal(p.shots[0].reloading,0);
 if(kind==='stormorb'){assert.ok(b.hp<1000);assert.ok(r.effects.some(e=>e.type==='link'));}
 if(kind==='meteorbook'){assert.ok(b.hp<1000);assert.ok(a.burn>0);assert.ok(r.effects.some(e=>e.type==='blast'));}
 if(kind==='snowstaff'){assert.ok(a.slow>0);assert.ok(b.slow>0);}
 }
});
