// Keep authoritative gameplay untouched; only interpolate visible positions.
export function createPresentation(delay=110){
  let frames=[];
  function push(state,time){
    const last=frames.at(-1)?.state;
    if(!last||last.code!==state.code||last.wave!==state.wave||last.phase!==state.phase)frames=[];
    frames.push({state,time});if(frames.length>6)frames.shift();
  }
  function sample(now){
    const latest=frames.at(-1);if(!latest)return null;
    const state=latest.state,age=Math.max(0,(now-latest.time)/1000);
    const hazards=(state.hazards||[]).map(h=>({...h,remaining:Math.max(0,h.remaining-(state.phase==='battle'?age:0))}));
    const effects=(state.effects||[]).map(e=>({...e,life:e.life-age})).filter(e=>e.life>0);
    if(state.phase!=='battle'||frames.length<2)return {...state,effects,hazards};
    const target=now-delay;
    let before=frames[0],after=latest;
    for(const frame of frames){if(frame.time<=target)before=frame;else{after=frame;break;}}
    const t=Math.max(0,Math.min(1,(target-before.time)/Math.max(1,after.time-before.time)));
    const interpolate=key=>{
      const old=new Map((before.state[key]||[]).map(e=>[e.id,e]));
      const next=new Map((after.state[key]||[]).map(e=>[e.id,e]));
      return (state[key]||[]).map(entity=>{
        const a=old.get(entity.id),b=next.get(entity.id);
        if(!a||!b||(key==='players'&&(a.hp<=0||b.hp<=0||entity.hp<=0)))return entity;
        const angle=Number.isFinite(a.angle)&&Number.isFinite(b.angle)?a.angle+Math.atan2(Math.sin(b.angle-a.angle),Math.cos(b.angle-a.angle))*t:entity.angle;
        return {...entity,x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,angle};
      });
    };
    return {...state,effects,hazards,hostileShots:interpolate('hostileShots'),players:interpolate('players'),enemies:interpolate('enemies'),gems:interpolate('gems'),turrets:interpolate('turrets')};
  }
  return {push,sample,clear(){frames=[];}};
}
