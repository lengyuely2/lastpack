import {createRoom,addPlayer,action,tick,processAutomaticRewards} from '../shared/game.mjs';
function rewards(r,p){
  // Exercise the real configurable reward policy, including useful stat weights,
  // magic bindings, replacement and inventory handling, rather than fixed indexes.
  p.autoRewards={...p.autoRewards,enabled:true,delay:2,build:'sustain',allowMerge:true,allowFusion:true,equipBetter:true,fullInventory:'skip'};
  processAutomaticRewards(r,2);
  for(const w of [...p.weaponStash])action(r,p,{type:'discardWeapon',id:w.id});
}
export function simulate(seed,crew=1,policy='build'){const r=createRoom('BALANCE',seed,crew===1,true,true);for(let n=0;n<crew;n++)addPlayer(r,'p'+n,'玩家'+n);for(const p of r.players)action(r,p,{type:'ready'});
  let steps=0,firstUpgrade=null,markers=[];
  while(!['victory','defeat'].includes(r.phase)&&r.survivalTime<1350&&steps++<24000){if(r.phase==='upgrade'){firstUpgrade??=+r.survivalTime.toFixed(1);for(const p of r.players)if(p.rewardPending){if(policy==='skip')action(r,p,{type:'skipReward'});else rewards(r,p);};}else if(r.phase==='event'){const p=r.players.find(p=>p.id===r.eventChoice.owner&&p.hp>0)||r.players.find(p=>p.hp>0);action(r,p,{type:'eventChoice',id:r.eventChoice.id,choice:'decline'});}else tick(r,.1);if(r.survivalTime>=((markers.length+1)*120)&&markers.length<10)markers.push({minute:(markers.length+1)*2,hp:r.players.map(p=>Math.round(p.hp)),level:r.players[0].level,kills:r.kills});}
  return {seed,crew,policy,outcome:r.phase,time:+r.survivalTime.toFixed(1),firstUpgrade,bosses:r.bossKills,level:r.players[0].level,hp:r.players.map(p=>Math.round(p.hp)),kills:r.kills,weapons:r.players.map(p=>p.weapons),markers};
}
if(process.argv[1]?.endsWith('balance-simulation.mjs'))for(const [seed,crew]of [[17,1],[42,1],[99,1],[42,2],[99,4]])console.log(JSON.stringify(simulate(seed,crew)));

if(process.argv[1]?.endsWith('balance-simulation.mjs'))for(const seed of [17,42,99])console.log(JSON.stringify(simulate(seed,1,'skip')));
