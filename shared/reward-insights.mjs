import {stats,fits,COLS,ROWS,ITEMS,weaponDefinition} from './game.mjs';
import {possibleCombos} from './expedition.mjs';
export function directFirepower(w){if(!w)return 0;return w.damage*(w.double?1.5:1)/Math.max(.05,w.interval+(w.endless||w.melee?0:(w.reload||0)/Math.max(1,w.clip)));}
const total=s=>s.weapons.reduce((n,w)=>n+directFirepower(w),0);
function fireDelta(before,after){const a=total(before),b=total(after);return a>0?Math.round((b/a-1)*100):null;}
function trialWeapon(p,reward,slot){return {...p,weapons:p.weapons.map((k,n)=>n===slot?reward.kind:k),weaponTiers:p.weaponTiers.map((t,n)=>n===slot?reward.tier:t)};}
export function weaponComparison(p,reward,slot){const change=fireDelta(stats(p),stats(trialWeapon(p,reward,slot)));return `替换 0${slot+1} · 直击火力 ${change>=0?'↑':'↓'}${Math.abs(change||0)}% · 旧武器进入备用区`;}
export function rewardInsights(p,reward){
 if(!p)return [];const before=stats(p),notes=[];let after=null;
 if(typeof reward==='string'){
  if(!ITEMS[reward])return [];
  if(p.noHealing&&ITEMS[reward].effects.some(e=>['regen','healPower','heal','dodgeHeal'].includes(e.stat)))notes.push('停业挑战：治疗部分不生效');
  const magic=['spellbook','rune'].includes(reward),target=Math.max(0,p.weapons.findIndex(k=>magic?weaponDefinition(k)?.arcane:!!k)),candidate={id:'reward-preview',kind:reward,x:null,y:null,target,rotated:false};
  outer:for(const rotated of [false,true])for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(fits(p,{...candidate,x,y,rotated})){Object.assign(candidate,{x,y,rotated});break outer;}
  if(candidate.x===null){notes.push('背包放不下，先存储物区');return notes;}
  after=stats({...p,items:[...p.items,candidate]});const delta=fireDelta(before,after);if(delta)notes.push(`放入背包后 · 直击火力 ${delta>0?'↑':'↓'}${Math.abs(delta)}%`);
  for(const [key,label,multiplier,suffix]of [['maxHp','生命',1,''],['regen','每秒回复',1,''],['move','移速',1,''],['dodge','闪避',100,'%'],['xpBonus','经验加成',100,'%'],['damageReduction','减伤',100,'%']]){const d=Math.round((after[key]-before[key])*multiplier*100)/100;if(d)notes.push(`${label} ${d>0?'+':''}${d}${suffix}`);}
 }else if(reward?.type==='weapon'){
  const match=p.weapons.findIndex((k,n)=>k===reward.kind&&p.weaponTiers[n]===reward.tier&&reward.tier<4);if(match>=0)notes.push('可合成 · 需选择领取并合成');
  const empty=p.weapons.indexOf(null);if(empty>=0){after=stats(trialWeapon(p,reward,empty));const d=fireDelta(before,after);notes.push(`装备后 · 直击火力 ↑${Math.max(0,d||0)}%`);const combos=possibleCombos({players:[{...trialWeapon(p,reward,empty),connected:true}]},{stats});if(combos.length)notes.push('装备可触发：'+combos.map(c=>c.name).join('、'));}
  else {notes.push('领取先存备用区，当前火力不变');for(const slot of [0,1]){notes.push(weaponComparison(p,reward,slot));const trial=trialWeapon(p,reward,slot),s=stats(trial),combos=possibleCombos({players:[{...trial,connected:true}]},{stats});if(combos.length)notes.push(`替换 0${slot+1} 可触发 ${combos.map(c=>c.name).join('、')}`);const lost=before.factions.filter(f=>f.stage>s.factions.find(v=>v.id===f.id).stage);if(lost.length)notes.push(`替换 0${slot+1} 会失去 ${lost.map(f=>f.name+'阶段效果').join('、')}`);}}
 }
 if(after)for(const f of after.factions){const b=before.factions.find(v=>v.id===f.id);if(f.count>b.count)notes.push(`${f.name} ${b.count}→${f.count}${f.stage>b.stage?' · '+(f.ultimate?'最终效果觉醒':'阶段效果激活'):''}`);}
 return notes;
}
