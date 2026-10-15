export const STAR_RULES={
  cooler:{name:'冷库接线员',text:'边缘星位的武器配件效果 +30%，同一配件不重复增幅',accept:'武器配件'},
  scope:{name:'准星流水线',text:'前方两格内同武器的配件，每件额外暴击 +3%；每把武器最多 +6%',accept:'同武器配件'},
  medkit:{name:'午餐急救站',text:'上方两格内食物，每件治疗效果 +5%；总计最多 +10%',accept:'食物'},
  magnet:{name:'经验串串签',text:'四周星位的成长道具，每件经验 +1.5%；总计最多 +3%',accept:'成长道具'}
};
export function starCells(item,definitions,cols=6,rows=5){
  if(item.x===null||!STAR_RULES[item.kind])return [];
  const {w,h}=definitions[item.kind];let points=[];
  if(item.kind==='cooler'){for(let x=0;x<w;x++)points.push([x,-1],[x,h]);for(let y=0;y<h;y++)points.push([-1,y],[w,y]);}
  if(item.kind==='scope')points=[[w,0],[w+1,0]];
  if(item.kind==='medkit')points=[[0,-1],[1,-1]];
  if(item.kind==='magnet')points=[[0,-1],[1,0],[0,1],[-1,0]];
  return points.map(([x,y])=>item.rotated?{x:item.x+h-1-y,y:item.y+x}:{x:item.x+x,y:item.y+y}).filter(p=>p.x>=0&&p.y>=0&&p.x<cols&&p.y<rows);
}
export function bagLinks(player,definitions,isWeapon){
  const bag=player.items.filter(i=>i.x!==null),links=[];
  for(const source of bag){if(!STAR_RULES[source.kind])continue;const cells=starCells(source,definitions),targets=[];
    for(const target of bag){if(source.id===target.id)continue;const d=definitions[target.kind],w=target.rotated?d.h:d.w,h=target.rotated?d.w:d.h;
      if(!cells.some(c=>c.x>=target.x&&c.x<target.x+w&&c.y>=target.y&&c.y<target.y+h))continue;
      const valid=source.kind==='cooler'?isWeapon(target.kind)&&!!player.weapons[target.target]:source.kind==='scope'?isWeapon(target.kind)&&source.target===target.target&&!!player.weapons[source.target]:source.kind==='medkit'?['coffee','weirdfood','lemonade','tomato','cake','mushroom','soup'].includes(target.kind):['propellerhat','snail','ritual'].includes(target.kind);
      if(valid)targets.push(target);
    }
    if(targets.length)links.push({source:source.id,kind:source.kind,target:source.kind==='scope'?source.target:null,ids:[source.id,...targets.map(t=>t.id)],name:STAR_RULES[source.kind].name,text:STAR_RULES[source.kind].text,count:targets.length});
  }
  return links;
}
