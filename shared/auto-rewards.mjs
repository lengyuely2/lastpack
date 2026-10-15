export const DEFAULT_AUTO_REWARDS=Object.freeze({enabled:false,delay:4,build:'balanced',category:'any',preferOwned:true,allowMerge:false,allowFusion:false,equipBetter:true,fullInventory:'pause'});
export function validateAutoRewards(value={}){
  if(!value||typeof value!=='object'||Array.isArray(value))throw Error('自动奖励设置无效');
  const out={...DEFAULT_AUTO_REWARDS};
  for(const key of ['enabled','preferOwned','allowMerge','allowFusion','equipBetter'])if(key in value){if(typeof value[key]!=='boolean')throw Error('自动奖励开关无效');out[key]=value[key];}
  if('delay' in value){if(!Number.isInteger(value.delay)||value.delay<2||value.delay>10)throw Error('等待时间应为 2–10 秒');out.delay=value.delay;}
  for(const [key,allowed] of Object.entries({build:['balanced','firepower','sustain','growth','explosion','dodge','arcane'],category:['any','常规枪械','基础近战','奇巧远程','元素控制','奇异近战','生存成长','工程爆破','魔法法器'],fullInventory:['pause','skip']}))if(key in value){if(!allowed.includes(value[key]))throw Error('自动奖励偏好无效');out[key]=value[key];}
  return out;
}
export function weaponValue(w){
  if(!w)return 0;
  const cycle=w.interval+(w.endless||w.melee?0:(w.reload||0)/Math.max(1,w.clip));
  return (w.damage*(1+(w.crit||0))+(w.burn||0)*1.5)/Math.max(.05,cycle)*(w.splash?1.3:1)*(w.pierce?1.2:1)*(1+(w.chain||w.bounce||0)*.12)*(w.melee?.8:1)*(w.lifesteal?1.1:1);
}
export function chooseAutoReward(p,api){
  const c=validateAutoRewards(p.autoRewards),{weaponStats,weaponCategory,ITEMS,itemRarity,fits,eligibleFusions}=api;
  if(!c.enabled||!p.rewardPending)return null;
  const guns=p.weapons.map((kind,n)=>weaponStats(kind,p.weaponTiers[n])),values=guns.map(weaponValue),empty=p.weapons.indexOf(null);
  const target=values[1]>values[0]?1:0,weak=values[0]<=values[1]?0:1;
  const canPlace=kind=>{for(const rotated of [false,true])for(let y=0;y<5;y++)for(let x=0;x<6;x++)if(fits(p,{id:'auto-candidate',kind,x,y,rotated}))return true;return false;};
  const candidates=[];
  p.rewards.forEach((reward,index)=>{
    let score=0,merge=false,replaceSlot=null;
    if(typeof reward==='string'){
      const d=ITEMS[reward];if(!d)return;
      const placed=canPlace(reward);if(!placed&&p.items.filter(i=>i.x===null).length>=16)return;
      const weights={dodge:180,dodgeHeal:4,blastRounds:.5,blastArea:80,blastPower:80,magicDamage:110,magicArea:70,magicDuration:40,magicSpeed:130,health:.45,regen:18,heal:.8,healPower:45,pickupHeal:10,damageReduction:100,lifesteal:110,killHeal:12,move:45,damage:100,globalDamage:140,scope:110,speed:100,globalSpeed:140,overload:110,crit:90,globalCrit:120,burn:1.6,globalBurn:2,reload:30,globalReload:45,clip:1,pickupRadius:.25,xpBonus:100,auraSlow:100,slow:12,knockback:.6,thorns:1,cooler:25,globalRange:.15};
      score=8+itemRarity(reward)*3;
      for(const mod of d.effects||[{stat:d.stat,value:d.value}]){
        const survival=['health','regen','heal','healPower','pickupHeal','damageReduction','lifesteal','killHeal','dodge','dodgeHeal'].includes(mod.stat),growth=['xpBonus','pickupRadius','move'].includes(mod.stat);
        let multiplier=c.build==='sustain'&&survival||c.build==='growth'&&growth?2.5:c.build==='firepower'&&!survival&&!growth?1.8:1;
        if(survival&&p.hp>0&&p.hp<p.maxHp*.45)multiplier*=1.8;
        if(c.build==='explosion'&&mod.stat.startsWith('blast')||c.build==='dodge'&&['dodge','dodgeHeal','move'].includes(mod.stat)||c.build==='arcane'&&mod.stat.startsWith('magic'))multiplier*=2.5;
        if(mod.stat.startsWith('magic')&&!guns.some(w=>w?.arcane))multiplier*=.1;
        score+=(weights[mod.stat]||0)*mod.value*multiplier;
      }
      if(!placed)score*=.12;
      const magicSlot=values[1]>values[0]&&guns[1]?.arcane?1:guns[0]?.arcane?0:guns[1]?.arcane?1:target;
      const magicItem=(d.effects||[{stat:d.stat}]).some(m=>m.stat.startsWith('magic'));
      candidates.push({index,score,target:magicItem?magicSlot:target});return;
    }
    if(reward.type==='fusion'){
      if(!c.allowFusion||p.rewardSource!=='boss'||!eligibleFusions(p).some(f=>f.kind===reward.kind))return;
      score=130; // Explicitly enabled: consume the two eligible red recipe ingredients.
    }else{
      const w=weaponStats(reward.kind,reward.tier);if(!w)return;
      const match=p.weapons.findIndex((kind,n)=>kind===reward.kind&&p.weaponTiers[n]===reward.tier&&reward.tier<4);
      merge=c.allowMerge&&match>=0;
      if(!merge&&empty<0&&p.weaponStash.length>=12)return;
      const value=weaponValue(w),improvement=value/Math.max(1,values[weak]);
      // With no explicit melee preference, retain one ranged weapon rather than
      // replacing the last ranged slot based solely on close-range paper DPS.
      const keepRanged=c.category==='any'&&w.melee&&empty<0&&!guns[weak]?.melee&&guns[1-weak]?.melee;
      score=8+reward.tier*4;
      if(empty>=0)score+=45+Math.min(30,value*.25);
      else if(merge)score+=40;
      else if(c.equipBetter&&improvement>1.1&&!keepRanged){score+=Math.min(70,(improvement-1)*30);replaceSlot=weak;}
      else score*=.35;
      if(c.preferOwned&&p.weapons.includes(reward.kind))score+=12;
      if(c.category!=='any'&&weaponCategory(reward.kind)===c.category)score+=35;
      if(c.build==='firepower')score*=1.3;if(c.build==='arcane'&&w.arcane||c.build==='explosion'&&w.splash)score*=1.6;
    }
    candidates.push({index,score,merge,replaceSlot,target});
  });
  candidates.sort((a,b)=>b.score-a.score||a.index-b.index);
  return candidates[0]||{skip:c.fullInventory==='skip',blocked:true};
}
