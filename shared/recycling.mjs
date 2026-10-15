// Recycling has its own four-tier weighted roll: level, luck and ingredient quality do
// not influence it. Normal weapon definitions only; boss fusions stay exclusive.
export function rollRecyclingReward(output,random,{weapons,items,itemRarity}){
 if(!['item','weapon'].includes(output))throw Error('熔炼目标无效');
 const roll=Math.max(0,random());const tier=roll<.65?1:roll<.89?2:roll<.98?3:4;
 const pool=Object.keys(output==='weapon'?weapons:items).filter(k=>output==='weapon'||itemRarity(k)===tier);
 const kind=pool[Math.min(pool.length-1,Math.floor(Math.max(0,random())*pool.length))];
 return {type:output,kind,tier};
}
export function recyclingMaterials(stash,ids,output){
 const count=output==='item'?3:output==='weapon'?5:0;
 if(!count||!Array.isArray(ids)||ids.length!==count||new Set(ids).size!==count||ids.some(id=>typeof id!=='string'))throw Error(output==='item'?'请选择 3 把不同的备用武器':'请选择 5 把不同的备用武器');
 const materials=ids.map(id=>stash.find(w=>w.id===id));if(materials.some(w=>!w))throw Error('材料已变化，请重新选择备用武器');return materials;
}
