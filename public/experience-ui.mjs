import {rewardInsights} from '/reward-insights.mjs';
import {ACHIEVEMENTS,achievementProgress} from '/achievements.mjs';
import {ITEMS} from '/game.mjs';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function rewardHint(p,reward){const notes=rewardInsights(p,reward);return notes.length?'<span class="reward-outcome build-hint" title="直击火力估算包含射速与装填，不计范围、灼烧和连携">'+notes.map(n=>'<span>'+esc(n)+'</span>').join('')+'</span>':' ';}
export function createExperienceUI({$,getProfile,toast}){
 let settings={};try{settings=JSON.parse(localStorage.getItem('lastpack-experience')||'{}');}catch{}
 settings={quick:settings.quick===true,stash:settings.stash===true};
 const button=document.createElement('button');button.className='text-button';button.textContent='荣誉簿';button.id='experience-button';$('help-button').before(button);
 const dialog=document.createElement('dialog');dialog.className='weapon-catalog';dialog.id='experience-dialog';dialog.innerHTML='<div class="modal-heading"><span class="eyebrow">荣誉簿</span><button id="close-experience" class="text-button" aria-label="关闭成就">✕</button></div><h2>下一局，再多完成一件事。</h2><div class="automation-fields"><label><input id="quick-rewards" type="checkbox">快速揭晓奖励（跳过转轮等待）</label><label><input id="stash-rewards" type="checkbox">新配件先存储物区，选完直接继续战斗</label></div><p>配件在储物区不生效，升级时可整理；自动领取仍沿用自己的构筑设置。成就只记录正式对局，不额外叠加永久伤害。</p><p id="collection-progress"></p><div id="achievement-list" class="catalog-list"></div>';document.body.append(dialog);
 function render(){const p=getProfile();$('quick-rewards').checked=settings.quick;$('stash-rewards').checked=settings.stash;if(!p){$('collection-progress').textContent='等待成长档案连接…';return;}$('collection-progress').textContent=`已发现武器 ${p.collection.weapons.length} 种 · 配件 ${p.collection.items.length}/${Object.keys(ITEMS).length} · 成就 ${Object.keys(p.achievements).length}/${Object.keys(ACHIEVEMENTS).length}`;$('achievement-list').innerHTML=Object.entries(ACHIEVEMENTS).sort(([a],[b])=>Number(['bare','noheal'].includes(a))-Number(['bare','noheal'].includes(b))).map(([k,d])=>{const a=achievementProgress(p,k),done=!!p.achievements[k];return `<article class="catalog-card ${done?'achievement-done':''}"><h3>${done?'★':'◇'} ${esc(d.name)}</h3><p>${esc(d.text)}</p><progress max="${a.goal}" value="${Math.min(a.goal,a.value)}"></progress><small>${done?'已达成':`${Math.min(a.goal,a.value)} / ${a.goal}`}</small></article>`;}).join('');}
 for(const [id,key]of [['quick-rewards','quick'],['stash-rewards','stash']])$(id).onchange=e=>{settings[key]=e.target.checked;localStorage.setItem('lastpack-experience',JSON.stringify(settings));};
 button.onclick=()=>{render();dialog.showModal();};$('close-experience').onclick=()=>dialog.close();
 let previous=null;function update(){const p=getProfile();if(!p)return;const keys=Object.keys(p.achievements);if(previous){const fresh=keys.filter(k=>!previous.has(k));if(fresh.length)toast('成就达成：'+fresh.map(k=>ACHIEVEMENTS[k].name).join('、'));}previous=new Set(keys);if(dialog.open)render();}
 return {settings,update,known(group,kind){return !!getProfile()?.collection?.[group]?.includes(kind);}};
}
export const unknownCard=()=>'<article class="catalog-card undiscovered"><div class="unknown-icon">？</div><h3>？？</h3><p>正式出征中获得后解锁</p></article>';
