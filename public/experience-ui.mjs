import {ACHIEVEMENTS,achievementProgress} from '/achievements.mjs';
import {FACTIONS,possibleCombos} from '/expedition.mjs';
import {WEAPONS,ITEMS,stats,fits,COLS,ROWS,weaponStats} from '/game.mjs';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function rewardHint(p,reward){
 if(!p)return '';let after={...p,items:[...p.items],weapons:[...p.weapons],weaponTiers:[...p.weaponTiers]},notes=[];
 if(typeof reward==='string'){if(p.noHealing&&ITEMS[reward].effects.some(e=>['regen','healPower','heal','dodgeHeal'].includes(e.stat)))notes.push('停业挑战：治疗部分不生效');
  const candidate={id:'hint',kind:reward,x:null,y:null,target:Math.max(0,p.weapons.findIndex(Boolean)),rotated:false};
  if(['spellbook','rune'].includes(reward)){const n=p.weapons.findIndex(k=>WEAPONS[k]?.arcane);if(n>=0)candidate.target=n;}
  outer:for(const rotated of [false,true])for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(fits(p,{...candidate,x,y,rotated})){Object.assign(candidate,{x,y,rotated});break outer;}
  after.items.push(candidate);if(candidate.x===null)notes.push('背包放不下，先存储物区');
  const before=stats(p).factions;for(const f of stats(after).factions){const b=before.find(v=>v.id===f.id);if(f.count>b.count)notes.push(f.stage>b.stage?`${f.name}：激活${f.stage===3?'最终效果':f.count+'件效果'}`:`${f.name}：${f.count}/${f.next} 种，差 ${f.next-f.count} 种`);}
 }else if(reward?.type==='weapon'){
  const slot=p.weapons.indexOf(null);if(slot>=0){after.weapons[slot]=reward.kind;after.weaponTiers[slot]=reward.tier;const combos=possibleCombos({players:[{...after,connected:true}]},{stats});if(combos.length)notes.push('装备可触发：'+combos.map(c=>c.name).join('、'));}else{
   for(const n of [0,1]){const trial={...after,weapons:[...p.weapons],weaponTiers:[...p.weaponTiers],connected:true};trial.weapons[n]=reward.kind;trial.weaponTiers[n]=reward.tier;const combos=possibleCombos({players:[trial]},{stats});if(combos.length)notes.push(`替换 0${n+1} 可触发 ${combos.map(c=>c.name).join('、')}`);const lost=stats(p).factions.filter(f=>f.stage>stats(trial).factions.find(v=>v.id===f.id).stage);if(lost.length)notes.push(`替换 0${n+1} 会失去 ${lost.map(f=>f.name+'阶段效果').join('、')}`);}
  }
 }return notes.length?`<span class="reward-outcome build-hint">${esc(notes.join(' · '))}</span>`:'';
}
export function createExperienceUI({$,getProfile,toast}){
 let settings={};try{settings=JSON.parse(localStorage.getItem('lastpack-experience')||'{}');}catch{}
 settings={quick:settings.quick===true,stash:settings.stash===true};
 const button=document.createElement('button');button.className='text-button';button.textContent='成就 / 体验';button.id='experience-button';$('help-button').before(button);
 const dialog=document.createElement('dialog');dialog.className='weapon-catalog';dialog.id='experience-dialog';dialog.innerHTML='<div class="modal-heading"><span class="eyebrow">夜班荣誉簿</span><button id="close-experience" class="text-button" aria-label="关闭成就">✕</button></div><h2>下一局，再多完成一件事。</h2><div class="automation-fields"><label><input id="quick-rewards" type="checkbox">快速揭晓奖励（跳过转轮等待）</label><label><input id="stash-rewards" type="checkbox">新配件先存储物区，选完直接继续战斗</label></div><p>配件在储物区不生效，升级时可整理；自动领取仍沿用自己的构筑设置。成就只记录正式对局，不额外叠加永久伤害。</p><p id="collection-progress"></p><div id="achievement-list" class="catalog-list"></div>';document.body.append(dialog);
 function render(){const p=getProfile();$('quick-rewards').checked=settings.quick;$('stash-rewards').checked=settings.stash;if(!p){$('collection-progress').textContent='等待成长档案连接…';return;}$('collection-progress').textContent=`已发现武器 ${p.collection.weapons.length} 种 · 配件 ${p.collection.items.length}/${Object.keys(ITEMS).length} · 成就 ${Object.keys(p.achievements).length}/${Object.keys(ACHIEVEMENTS).length}`;$('achievement-list').innerHTML=Object.entries(ACHIEVEMENTS).sort(([a],[b])=>Number(['bare','noheal'].includes(a))-Number(['bare','noheal'].includes(b))).map(([k,d])=>{const a=achievementProgress(p,k),done=!!p.achievements[k];return `<article class="catalog-card ${done?'achievement-done':''}"><h3>${done?'★':'◇'} ${esc(d.name)}</h3><p>${esc(d.text)}</p><progress max="${a.goal}" value="${Math.min(a.goal,a.value)}"></progress><small>${done?'已达成':`${Math.min(a.goal,a.value)} / ${a.goal}`}</small></article>`;}).join('');}
 for(const [id,key]of [['quick-rewards','quick'],['stash-rewards','stash']])$(id).onchange=e=>{settings[key]=e.target.checked;localStorage.setItem('lastpack-experience',JSON.stringify(settings));};
 button.onclick=()=>{render();dialog.showModal();};$('close-experience').onclick=()=>dialog.close();
 let previous=null;function update(){const p=getProfile();if(!p)return;const keys=Object.keys(p.achievements);if(previous){const fresh=keys.filter(k=>!previous.has(k));if(fresh.length)toast('成就达成：'+fresh.map(k=>ACHIEVEMENTS[k].name).join('、'));}previous=new Set(keys);if(dialog.open)render();}
 return {settings,update,known(group,kind){return !!getProfile()?.collection?.[group]?.includes(kind);}};
}
export const unknownCard=()=>'<article class="catalog-card undiscovered"><div class="unknown-icon">？</div><h3>？？</h3><p>正式出征中获得后解锁</p></article>';
