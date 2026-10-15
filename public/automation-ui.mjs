import {DEFAULT_AUTO_REWARDS,validateAutoRewards} from '/auto-rewards.mjs';
export function createAutomationUI({$,send,getPlayer,getPhase}){
  let config={...DEFAULT_AUTO_REWARDS},strategy='balanced';
  try{config=validateAutoRewards(JSON.parse(localStorage.getItem('lastpack-auto-rewards')||'{}'));const saved=localStorage.getItem('lastpack-auto-strategy');if(['balanced','aggressive','conservative'].includes(saved))strategy=saved;}catch{}
  const fields=['enabled','delay','build','category','preferOwned','allowMerge','allowFusion','equipBetter','fullInventory'];
  function save(){localStorage.setItem('lastpack-auto-rewards',JSON.stringify(config));localStorage.setItem('lastpack-auto-strategy',strategy);if(getPlayer()){send({type:'autoRewards',settings:config});}render();}
  function fill(){for(const key of fields){const el=$('auto-'+key);if(el.type==='checkbox')el.checked=config[key];else el.value=config[key];}$('auto-strategy').value=strategy;}
  function render(){const p=getPlayer(),c=p?.autoRewards||config;const label=c.enabled?'自动选奖励':'手动选奖励';$('auto-reward-toggle').textContent=label;$('auto-reward-toggle').setAttribute('aria-pressed',String(c.enabled));const status=p?.rewardPending&&c.enabled?p.autoRewardStatus||'等待奖励揭晓…':p?.lastAutoReward||'每人独立设置 · 可随时手动选择';$('auto-reward-status').textContent=status;$('machine-auto-status').textContent=p?.rewardPending&&c.enabled?status:'手动选择 · 可在自动设置中启用自动领取';$('machine-auto-pause').classList.toggle('hidden',!c.enabled);$('auto-reward-toggle').disabled=['victory','defeat'].includes(getPhase());}
  $('automation-button').onclick=()=>{const p=getPlayer();if(p){config={...p.autoRewards};strategy=p.autoStrategy||'balanced';}fill();$('automation-settings').showModal();};
  $('close-automation').onclick=()=>$('automation-settings').close();
  for(const key of fields)$('auto-'+key).onchange=e=>{config=validateAutoRewards({...config,[key]:e.target.type==='checkbox'?e.target.checked:key==='delay'?Number(e.target.value):e.target.value});save();};
  $('auto-strategy').onchange=e=>{strategy=e.target.value;localStorage.setItem('lastpack-auto-strategy',strategy);if(getPlayer())send({type:'autoStrategy',strategy});};
  const toggle=()=>{config={...(getPlayer()?.autoRewards||config),enabled:!(getPlayer()?.autoRewards||config).enabled};save();};
  $('auto-reward-toggle').onclick=toggle;$('machine-auto-pause').onclick=()=>{config={...(getPlayer()?.autoRewards||config),enabled:false};save();};
  return {render,onWelcome(resuming){if(!resuming){send({type:'autoRewards',settings:config});send({type:'autoStrategy',strategy});}},reset:render};
}
