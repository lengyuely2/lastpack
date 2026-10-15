import {ACHIEVEMENTS,achievementProgress} from '/achievements.mjs';
import {loadoutMarkup} from '/expedition-ui.mjs';
import {MAPS,FACTIONS} from '/expedition.mjs';
import {CHARACTERS,TRAINING,trainingCost,forgeQuote,nextRunGoal} from '/progression.mjs';
import {weaponDefinition,weaponStats,ITEMS,TIERS} from '/game.mjs';
import {icon} from '/art.mjs';
import {createForgeReel} from '/forge-reel.mjs';
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const clock=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
export function runHighlights(summary,profile){
 if(!summary)return '';
 const sources=Object.entries(summary.damageSources||{}).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]),total=sources.reduce((n,[,v])=>n+v,0);
 const names={burn:'灼烧',bloodPulse:'血色回响',blastChain:'爆炸谢幕',shadowCounter:'幻影反击',combo_ice:'碎冰礼花',combo_storm:'蒸汽超载',combo_break:'破甲追击',thorns:'反伤',relic_echo:'回音追加'};
 const damage=sources.slice(0,3).map(([k,v])=>`<div><span>${esc(weaponDefinition(k)?.name||names[k]||'构筑效果')}</span><b>${Math.round(v/total*100)}%</b><i style="width:${v/total*100}%"></i></div>`).join('');
 const found=[...new Set(summary.newDiscoveries?.weapons||[])].map(k=>weaponDefinition(k)?.name).concat([...new Set(summary.newDiscoveries?.items||[])].map(k=>ITEMS[k]?.name)).filter(Boolean);
 const factions=(summary.factionAwakened||[]).map(k=>FACTIONS[k]?.name).filter(Boolean);
 return `<section class="run-highlights"><h3>${factions.length?esc(factions.join(' / '))+' · 觉醒构筑':summary.comboTriggers?'连携构筑 · '+summary.comboTriggers+' 次触发':'今晚的火力名片'}</h3><div class="damage-contributions">${damage||'<small>下一局，把第一套构筑拼出来。</small>'}</div>${found.length?`<p>新发现：${esc(found.slice(0,5).join('、'))}${found.length>5?'等 '+found.length+' 件':''}</p>`:''}${summary.outcome==='defeat'&&summary.lastHit?`<p>最后受伤：${esc(summary.lastHit.cause)} · ${summary.lastHit.damage} HP</p>`:''}<p class="next-run-goal">${esc(nextRunGoal(profile))}</p></section>`;
}
export function reportMarkup(summary){if(!summary)return '<p>正在结算并保存本局记录…</p>';const d=summary;return `<div class="report-stats">${[['战斗时间',clock(d.time)],['本人成长',`LV ${d.level}`],['击杀 / 小队',`${d.kills} / ${d.teamKills}`],['累计伤害',d.damage.toLocaleString()],['实际治疗',d.healing],['救援 / 融合',`${d.revives} / ${d.fusions}`]].map(([label,value])=>`<div><small>${label}</small><strong>${value}</strong></div>`).join('')}</div><p class="career-income">${d.awarded===null?'本局收入':`本次入账 +${d.awarded??0} · 本局累计`} <b>${d.earned??0} 零件</b></p><p class="career-income">本次 +${d.goldAwarded??0} 金币 · 本局累计 ${d.gold||0} 金币</p><p>${d.unlocks?.length?'新角色解锁：'+d.unlocks.map(k=>CHARACTERS[k].name).join('、'):'继续尝试新的构筑，成长训练在下一局生效。'}</p><h3>构筑表现</h3><p>${MAPS[d.map||"cemetery"]?.name||"墓园"} · 无尽词缀 ${d.endlessLevel||0} 轮 · 连携 ${d.comboTriggers||0} 次 · 闪避 ${d.dodges||0} 次</p><p>派系最终效果：${(d.factionAwakened||[]).map(k=>FACTIONS[k]?.name).join("、")||"尚未成型"}</p><p>伤害来源：${Object.entries(d.damageSources||{}).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([k,v])=>esc(weaponDefinition(k)?.name||({burn:"灼烧",bloodPulse:"血色回响",blastChain:"爆炸谢幕",shadowCounter:"幻影反击",combo_ice:"碎冰礼花",combo_storm:"蒸汽超载",relic_echo:"回音追加",thorns:"反伤"}[k]||k))+" "+v.toLocaleString()).join(" / ")||"暂无记录"}</p><h3>本局成就</h3><p>${(d.achievementUnlocks||[]).map(k=>esc(ACHIEVEMENTS[k]?.name||k)).join('、')||'继续尝试流派、熔炼和挑战目标。'}</p><h3>最终火力</h3><div class="report-loadout">${d.weapons.map(w=>`<span style="color:${TIERS[w.tier].color}">${icon(weaponDefinition(w.kind).icon,TIERS[w.tier].color)}${esc(weaponDefinition(w.kind).name)} · ${weaponStats(w.kind,w.tier).tierName}</span>`).join('')}</div><h3>背包构筑</h3><div class="report-items">${d.items.map(k=>`<span>${esc(ITEMS[k].name)}</span>`).join('')||'<span>空背包</span>'}</div>`;}
export function createCareer({$,send,getState,play=()=>{}}){
  const ranks=['凡铁','淬火','精炼','辉耀','传说','神铸'];
  let profile=null,forging=false,lastResult=null,pendingProfile=null,activeRequest=null,practice=false,previewLevel=null;
  const groups={damage:'火力',speed:'火力',area:'火力',duration:'火力',health:'生存',recovery:'生存',armor:'生存',movement:'生存',pickup:'收集',experience:'收集',luck:'收集',greed:'收集'};
  const reel=createForgeReel({reducedMotion:()=>matchMedia('(prefers-reduced-motion: reduce)').matches,paint(level,spinning){$('forge-reel').classList.toggle('spinning',spinning);$('forge-reel').setAttribute('aria-busy',String(spinning));$('forge-reel-value').textContent=ranks[level];for(const node of $('forge-levels').children)node.classList.toggle('selected',Number(node.dataset.level)===level);},tick(){play({type:'forgeTick'});},finish(result){
    forging=false;activeRequest=null;
    if(practice){practice=false;previewLevel=result.to;render();$('forge-result').innerHTML='<strong>演练结束 · 神铸降临</strong><span>仅展示转轮效果，不扣金币、不改变成长。</span>';$('forge-result').dataset.outcome='practice';}
    else {profile=pendingProfile||profile;pendingProfile=null;lastResult=result;render();const node=$('forge-result');node.classList.remove('forge-reveal');void node.offsetWidth;node.classList.add('forge-reveal');play({type:result.outcome==='jackpot'?'forgeJackpot':result.outcome==='up'?'forgeUp':result.outcome==='down'?'forgeDown':'forgeStay'});}
  }});
  function renderForge(){
    if(!profile)return;
    const key=$('forge-target').value,d=TRAINING[key],level=profile.training[key],q=forgeQuote(key,level);
    $('forge-level').textContent=`${d.name} · ${ranks[level]}`;
    $('forge-effect').textContent=d.text;
    $('forge-target').disabled=forging;$('forge-preview').disabled=forging;
    if(!forging&&!$('forge-reel').classList.contains('spinning')){const shown=previewLevel??level;$('forge-reel-value').textContent=ranks[shown];for(const node of $('forge-levels').children)node.classList.toggle('selected',Number(node.dataset.level)===shown);}
    $('forge-button').textContent=forging?'品阶转轮中…':q?`锻造一次 · ${q.cost} 金币`:'神铸已成';
    $('forge-button').disabled=forging||!q||profile.gold<q.cost;
    $('forge-funds').textContent=q&&profile.gold<q.cost?`还差 ${q.cost-profile.gold} 金币 · 杀怪收入结算后存入钱包`:'每次消耗金币；普通失败保持等级，降级只减一级。';
    if(lastResult&&!forging){const r=lastResult,names={jackpot:'一锤封神！神铸降临',up:'锻造成功',down:'锻造退阶',stay:'火候不够 · 品阶保持'},node=$('forge-result');node.dataset.outcome=r.outcome;node.innerHTML=`<strong>${names[r.outcome]}</strong><span>${TRAINING[r.key].name} · ${ranks[r.from]} → ${ranks[r.to]}</span><small>消耗 ${r.cost} 金币 · 已保存</small>`;}
  }
  function render(){
    $('career-status').textContent=profile?`${CHARACTERS[profile.character].name} · ${profile.scrap} 零件 · ${profile.gold||0} 金币 · 最长 ${clock(profile.records.bestTime)}`:'连接成长档案中…';
    $('career-balance').textContent=profile?`${profile.scrap} 零件 · ${profile.gold||0} 金币`:'等待连接';
    if(!profile)return;
    $('expedition-loadouts').innerHTML=loadoutMarkup(profile);
    $('career-records').innerHTML=[['出征',profile.records.runs],['撤离',profile.records.wins],['总击杀',profile.records.kills],['最高等级',profile.records.bestLevel]].map(([label,value])=>`<span>${label} <b>${value}</b></span>`).join('');
    $('character-list').innerHTML=Object.entries(CHARACTERS).map(([key,d])=>{const unlocked=profile.unlocked.includes(key);return `<article class="career-card ${profile.character===key?'chosen':''}">${icon(d.icon,'#ebcb86')}<h3>${d.name}</h3><p>${d.text}</p><small>${unlocked?'已解锁':d.unlock}</small><button class="secondary" data-character="${key}" ${unlocked?'':'disabled'} aria-pressed="${profile.character===key}">${profile.character===key?'已选择':unlocked?'选择此角色':'尚未解锁'}</button></article>`;}).join('');
    $('training-list').innerHTML=['火力','生存','收集'].map(group=>`<section class="powerup-group"><h3>${group}强化</h3><div class="powerup-grid">${Object.entries(TRAINING).filter(([key])=>groups[key]===group).map(([key,d])=>{const level=profile.training[key]||0,cost=trainingCost(key,level);return `<article class="career-card powerup-card ${level===d.max?'maxed':''}">${icon(d.icon,'#e3c681')}<h3>${d.name} <small>${ranks[level]}</small></h3><p>${d.text}</p><div class="training-pips">${Array.from({length:d.max},(_,n)=>`<i class="${n<level?'filled':''}"></i>`).join('')}</div><button class="secondary" data-training="${key}" ${!forging&&cost!==null&&profile.scrap>=cost?'':'disabled'}>${cost===null?'神铸已成':`强化 · ${cost} 零件`}</button><button class="text-button" data-forge-target="${key}" ${forging?'disabled':''}>品阶转轮 →</button></article>`;}).join('')}</div></section>`).join('');
    const b=profile.bonus||{};$('powerup-summary').innerHTML=[['伤害',`+${Math.round((b.damage||0)*100)}%`],['生命',`${b.health>=0?'+':''}${b.health||0}`],['射速',`${Math.round((b.speed||0)*100)}%`],['移速',`+${Math.round((b.move||0)*100)}%`],['减伤',`${Math.round((b.armor||0)*100)}%`],['金币',`+${Math.round((b.greed||0)*100)}%`]].map(([label,value])=>`<span>${label}<b>${value}</b></span>`).join('');
    $('career-history').innerHTML=profile.history.map((h,n)=>`<button class="career-history-row" data-history="${n}"><b>${h.outcome==='victory'?'成功撤离':h.outcome==='retired'?'主动撤回':'小队失守'}</b><span>${clock(h.time)} · LV ${h.level} · ${h.kills} 击杀</span><strong>累计 ${h.earned} 零件 · ${h.gold||0} 金币 ↗</strong></button>`).join('')||'<p>第一次出征从空背包开始。失败也能按实际战绩获得零件。</p>';
    const next=Object.keys(ACHIEVEMENTS).filter(k=>!profile.achievements[k]).map(k=>({k,...achievementProgress(profile,k)})).sort((a,b)=>b.value/b.goal-a.value/a.goal)[0];if(next)$('career-records').innerHTML+=`<span>下一目标 <b>${ACHIEVEMENTS[next.k].name} · ${Math.min(next.goal,next.value)}/${next.goal}</b></span>`;
    $('career-timing').textContent=getState()?.wave>0?'本局角色与训练已固定。现在购买或换角色，将在下一局生效。':'在补给站可选择角色和训练；全员准备后，本局加成固定。';
    renderForge();
  }
  function open(){render();$('career-dialog').showModal();}
  $('career-button').onclick=open;$('landing-career').onclick=open;$('close-career').onclick=()=>$('career-dialog').close();
  $('character-list').onclick=e=>{const b=e.target.closest('[data-character]');if(b&&!b.disabled)send({type:'selectCharacter',key:b.dataset.character});};
  $('training-list').onclick=e=>{if(forging)return;const shortcut=e.target.closest('[data-forge-target]');if(shortcut){$('forge-target').value=shortcut.dataset.forgeTarget;renderForge();selectTab('forge');return;}const b=e.target.closest('[data-training]');if(b&&!b.disabled){b.disabled=true;send({type:'metaUpgrade',key:b.dataset.training});}};
  $('expedition-loadouts').onclick=e=>{const b=e.target.closest('[data-expedition-kind]');if(b&&!b.disabled)send({type:b.dataset.expeditionKind==='starter'?'selectStarter':'selectRelic',key:b.dataset.expeditionKey});};
  $('career-history').onclick=e=>{const b=e.target.closest('[data-history]');if(b){$('report-title').textContent='出征记录';$('report-body').innerHTML=reportMarkup({...profile.history[Number(b.dataset.history)],awarded:null});$('run-report').showModal();}};
  function selectTab(tab){for(const key of ['training','forge','characters','expedition','history']){$('career-'+key+'-panel').classList.toggle('hidden',key!==tab);$('career-tabs').querySelector(`[data-career-tab="${key}"]`).setAttribute('aria-pressed',String(key===tab));}}
  $('career-tabs').onclick=e=>{const b=e.target.closest('[data-career-tab]');if(b)selectTab(b.dataset.careerTab);};
  $('forge-target').innerHTML=Object.entries(TRAINING).map(([key,d])=>`<option value="${key}">${d.name}</option>`).join('');
  $('forge-target').onchange=()=>{previewLevel=null;renderForge();};
  $('forge-levels').innerHTML=ranks.map((rank,n)=>`<span data-level="${n}">${rank}</span>`).join('');
  function begin(requestId,isPractice){forging=true;practice=isPractice;previewLevel=null;activeRequest=requestId;pendingProfile=null;render();$('forge-result').innerHTML=`<strong>${isPractice?'转轮演练':'品阶转轮启动'}</strong><span>品阶正在跳动，停稳后揭晓。</span>`;$('forge-result').dataset.outcome='spinning';play({type:'forgeStrike'});reel.start(requestId,profile.training[$('forge-target').value]||0,5);}
  $('forge-button').onclick=()=>{if(forging||$('forge-button').disabled)return;const bytes=crypto.getRandomValues(new Uint8Array(16)),requestId=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/,'$1-$2-$3-$4-$5');begin(requestId,false);send({type:'forgeTraining',key:$('forge-target').value,requestId});};
  $('forge-preview').onclick=()=>{if(forging||!profile)return;begin('practice',true);reel.receive({id:'practice',to:5});};
  $('close-report').onclick=()=>$('run-report').close();
  return {open,render,failed(){reel.fail();forging=false;practice=false;activeRequest=null;if(pendingProfile)profile=pendingProfile;pendingProfile=null;render();},update(p,result){if(forging&&!practice){pendingProfile=p;const receipt=result?.id===activeRequest?result:p.lastForge?.id===activeRequest?p.lastForge:null;if(receipt)reel.receive(receipt);return;}profile=p;lastResult=result||p.lastForge||lastResult;render();},get profile(){return profile;}};
}
