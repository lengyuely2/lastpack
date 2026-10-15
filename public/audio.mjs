// Original procedural sound design: no downloads, sample licences or network delay.
export const GUNS={pistol:[170,.09,1800],revolver:[95,.16,1200],rifle:[145,.07,2400],shotgun:[65,.23,750],smg:[220,.055,3000],sniper:[75,.24,1500],lmg:[110,.075,2000],rocket:[48,.42,450],shredder:[85,.19,1100]};
export function createSoundEvents(){
  let previous=null,seen=new Set();
  return {reset(){previous=null;seen.clear();},push(state,ownId){
    const fresh=!previous||previous.code!==state.code||state.wave<previous.wave;
    if(fresh){seen=new Set((state.effects||[]).map(e=>e.id));previous=state;return [];}
    const out=[],old=previous.players.find(p=>p.id===ownId),p=state.players.find(p=>p.id===ownId);
    if(p&&old&&p.level>old.level)out.push({type:'level'});
    if(p&&old&&p.pendingUpgrades<old.pendingUpgrades)out.push({type:'reward'});
    if(p&&old&&p.weaponTiers?.some((tier,n)=>p.weapons[n]===old.weapons?.[n]&&tier>(old.weaponTiers?.[n]||1)))out.push({type:'merge'});
    else if(p&&old&&JSON.stringify(p.weapons)!==JSON.stringify(old.weapons))out.push({type:'equip'});
    if(p&&old){if(p.hp<=0&&old.hp>0)out.push({type:'down'});if(p.hp>0&&old.hp<=0)out.push({type:'revive'});for(let n=0;n<(p.shots||[]).length;n++)if(p.shots[n].reloading>0&&!(old.shots?.[n]?.reloading>0))out.push({type:'reload'});}
    if(state.wave>previous.wave)out.push({type:'wave'});
    if(state.phase!==previous.phase&&['victory','defeat'].includes(state.phase))out.push({type:state.phase});
    if(state.campaign&&state.pacing==='尸潮爆发'&&previous.pacing!==state.pacing)out.push({type:'surge'});
    const ids=new Set(previous.enemies.map(e=>e.id));
    if(state.phase==='battle')for(const e of state.enemies)if(!ids.has(e.id))out.push({type:'enter',kind:e.kind,rank:e.rank,x:e.x});
    if(state.phase==='battle'&&Math.floor(state.time/4)>Math.floor(previous.time/4)&&state.enemies.length){const e=state.enemies[Math.floor(state.time/4)%state.enemies.length];out.push({type:'cry',kind:e.kind,rank:e.rank,x:e.x});}
    for(const e of state.effects||[])if(!seen.has(e.id)){seen.add(e.id);if(['shot','xp','gold','death','hurt','dodge','blast','heal','growth','bossStage','bossDown','bossCast','enemyBlast','chestOpen','fusion','powerUp','streak','eliteArrival','factionBurst','weaponCombo','factionAwake','eventWin','recycle'].includes(e.type))out.push({...e,local:e.owner===ownId});}
    // Only retain active IDs. Authoritative effect IDs never repeat within a room.
    seen=new Set((state.effects||[]).map(e=>e.id));previous=state;return out;
  }};
}
export function createAudio({Context=globalThis.AudioContext||globalThis.webkitAudioContext,storage=globalThis.localStorage}={}){
  let ctx,master,noise,voices=0,muted=storage?.getItem('lastpack-muted')==='true';
  let volume=Number(storage?.getItem('lastpack-volume')??.45);if(!Number.isFinite(volume))volume=.45;volume=Math.max(0,Math.min(1,volume));
  const gates=new Map(),tracker=createSoundEvents(),active=new Set();let currentType='',xpStreak=0,lastXp=-100;
  function cancel(type){for(const voice of active)if(!type||voice.type===type)try{voice.source.stop();}catch{}}
  function gain(){if(master)master.gain.setTargetAtTime(muted?0:volume*.35,ctx.currentTime,.02);}
  async function unlock(){try{if(!Context)return false;if(!ctx){ctx=new Context();master=ctx.createGain();const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-18;compressor.ratio.value=8;master.connect(compressor);compressor.connect(ctx.destination);noise=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate);const data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;gain();}if(ctx.state==='suspended')await ctx.resume();return ctx.state==='running';}catch{return false;}}
  function layer({f=200,to=40,d=.15,delay=0,amp=.3,wave='sine',hiss=false,pan=0}){
    if(voices>=24)return;voices++;const t=ctx.currentTime+delay,source=hiss?ctx.createBufferSource():ctx.createOscillator(),envelope=ctx.createGain(),filter=ctx.createBiquadFilter();filter.type=hiss?'lowpass':'allpass';
    if(hiss){source.buffer=noise;filter.frequency.setValueAtTime(f,t);filter.frequency.exponentialRampToValueAtTime(Math.max(30,to),t+d);}else{source.type=wave;source.frequency.setValueAtTime(f,t);source.frequency.exponentialRampToValueAtTime(Math.max(20,to),t+d);}
    envelope.gain.setValueAtTime(.0001,t);envelope.gain.exponentialRampToValueAtTime(Math.max(.001,amp),t+.006);envelope.gain.exponentialRampToValueAtTime(.0001,t+d);
    const stereo=ctx.createStereoPanner(),voice={source,type:currentType};active.add(voice);stereo.pan.value=pan;source.connect(filter);filter.connect(envelope);envelope.connect(stereo);stereo.connect(master);source.onended=()=>{voices--;active.delete(voice);source.disconnect();filter.disconnect();envelope.disconnect();stereo.disconnect();};source.start(t);source.stop(t+d+.02);
  }
  function play(e){
    if(!ctx||ctx.state!=='running'||muted||volume===0||globalThis.document?.hidden)return false;
    const key=e.type==='shot'?`shot:${e.weapon}`:e.type==='enter'?`enter:${e.kind}:${e.rank}`:e.type;
    const gap={shot:.065,xp:.09,enter:e.kind==='boss'?0:1.6,cry:3,death:.35,hurt:.4,heal:1,blast:.18}[e.type]??.15;
    const now=ctx.currentTime;if(now-(gates.get(key)??-100)<gap||voices>=(['level','enter','victory','defeat','reveal'].includes(e.type)?18:12))return false;gates.set(key,now);currentType=e.type;
    const pan=Math.max(-.75,Math.min(.75,((e.x??480)-480)/640)),quiet=e.type==='shot'&&!e.local ? .55 : 1;
    const tone=(f,to,d,amp=.3,wave='sine',delay=0)=>layer({f,to,d,amp:amp*quiet,wave,delay,pan});
    const hiss=(f,to,d,amp=.3)=>layer({f,to,d,amp:amp*quiet,hiss:true,pan});
    if(e.type==='shot'){
      const accent=1+[...(e.weapon||'')].reduce((n,c)=>n+c.charCodeAt(0),0)%7/20;
      const gun=GUNS[e.weapon]||({doublepistol:GUNS.pistol,chatter:GUNS.shotgun,bulldozer:GUNS.shredder})[e.weapon];if(gun){tone(gun[0],35,gun[1],.5);hiss(gun[2],100,gun[1],.65);if(e.weapon==='doublepistol')tone(170,35,.09,.35,'sine',.06);if(e.weapon==='rocket')hiss(500,80,.55,.4);}
      else if(e.visual==='laser'){tone(1700,130,.16,.22,'sawtooth');tone(850,60,.12,.15);}
      else if(e.visual==='electric'){tone(700,2300,.13,.2,'square');hiss(4500,1200,.12,.22);}
      else if(e.visual==='ice'){tone(2400,1200,.19,.25,'triangle');tone(3200,2100,.12,.12,'sine',.035);}
      else if(['fireball','flame'].includes(e.visual)){hiss(1400,180,e.visual==='flame'?.3:.22,.45);tone(130,45,.2,.18);}
      else if(['slash','thrust','scissors'].includes(e.visual)){hiss((e.visual==='scissors'?3800:2100)*accent,300,.13,.3);tone((e.visual==='thrust'?330:180)*accent,65,.09,.2,'triangle');}
      else {tone(e.visual==='stone'?420:e.visual==='shuriken'?1600:900,150,.13,.2,'triangle');hiss(1800,350,.08,.2);}
      if(e.crit)tone(2100,950,.08,.12,'triangle');
    }else if(e.type==='xp'){xpStreak=now-lastXp<.65?(xpStreak+1)%8:0;lastXp=now;const f=(e.value>=100?1800:e.value>=20?1300:e.value>=5?1000:780)*2**(xpStreak/24);tone(f,f*1.5,.11,.2,'sine');}
    else if(['level','reveal','victory'].includes(e.type)){const notes=e.type==='reveal'?[880,1175,1568]:[523,659,784,1047,1568];notes.forEach((f,i)=>tone(f,f*1.01,.24,.25,'triangle',i*.09));}
    else if(['enter','cry'].includes(e.type)){const f={walker:95,runner:380,brute:55,boss:38}[e.kind]||95,rank=e.rank||1;tone(f,f*.55,e.kind==='boss'?1.3:.45,e.type==='cry'?.18:.38,'sawtooth');hiss(e.kind==='runner'?3200:600,80,.4,.22);if(rank>1)tone(f*1.5,f*.65,.6,.16,'triangle',.1);if(e.kind==='boss'&&e.type==='enter')tone(70,28,1.5,.5,'sine',.2);}
    else if(e.type==='death'){tone({walker:120,runner:340,brute:70,boss:42}[e.kind]||110,30,.25,.22,'sawtooth');hiss(700,80,.15,.17);}
    else if(e.type==='dodge'){tone(700,1500,.12,.2,'sine');hiss(1800,700,.08,.1);}
    else if(e.type==='hurt'){tone(130,45,.17,.45,'triangle');hiss(900,80,.12,.3);}
    else if(e.type==='chestOpen'){[392,523,659,784].forEach((f,i)=>tone(f,f*1.1,.25,.2,'triangle',i*.12));}
    else if(e.type==='recycle'){[330,440,660].forEach((f,i)=>tone(f,f*1.08,.25,.15,'triangle',i*.1));}
    else if(e.type==='fusion'){[523,784,1047,1568].forEach((f,i)=>tone(f,f*1.01,.35,.25,'triangle',i*.1));}
    else if(e.type==='factionAwake'||e.type==='eventWin'){tone(330,990,.5,.18,'triangle');tone(660,1320,.4,.12,'sine',.12);}
    else if(e.type==='weaponCombo'){tone(440,1320,.18,.12,'square');hiss(1500,400,.2,.08);}
    else if(e.type==='factionBurst'){tone(90,50,.25,.14,'triangle');hiss(700,100,.2,.1);}
    else if(e.type==='powerUp'){tone(220,880,.35,.2,'triangle');tone(440,1320,.25,.15,'sine',.08);}
    else if(e.type==='streak'){[784,1047,1568].forEach((f,i)=>tone(f,f,.14,.16,'triangle',i*.06));}
    else if(e.type==='surge'||e.type==='eliteArrival'){tone(80,40,.65,.2,'sawtooth');tone(120,60,.5,.12,'triangle',.12);}
    else if(e.type==='bossStage'){tone(110,220,.4,.2,'sawtooth');tone(65,40,.5,.3);}
    else if(e.type==='bossDown'){[523,784,1047].forEach((f,i)=>tone(f,f,.4,.25,'triangle',i*.1));}
    else if(e.type==='bossCast'){tone(360,90,.25,.18,'sawtooth');}
    else if(e.type==='enemyBlast'){hiss(650,60,.25,.3);tone(75,30,.23,.2);}
    else if(e.type==='blast'){hiss(1300,40,.4,.55);tone(65,25,.35,.5);}
    else if(e.type==='defeat'){[330,260,196,130].forEach((f,i)=>tone(f,f*.8,.35,.25,'triangle',i*.17));}
    else if(e.type==='reward'){tone(660,1320,.16,.25,'triangle');}
    else if(e.type==='merge'){[660,990,1320].forEach((f,i)=>tone(f,f*1.2,.22,.23,'triangle',i*.08));}
    else if(e.type==='equip'){hiss(2400,800,.08,.14);tone(440,660,.09,.12,'triangle');}
    else if(e.type==='ui'){tone(680,900,.05,.1,'sine');}
    else if(e.type==='gold'){tone(1200,1800,.09,.12,'sine');tone(1800,2100,.1,.1,'sine',.07);}
    else if(e.type==='forgeStrike'){hiss(1700,350,.14,.25);tone(160,70,.18,.3,'triangle');}
    else if(e.type==='forgeTick'){tone(520,680,.035,.07,'triangle');}
    else if(e.type==='forgeJackpot'){[440,660,880,1320,1760].forEach((f,i)=>tone(f,f*1.05,.35,.2,'triangle',i*.1));}
    else if(e.type==='forgeUp'){[660,880,1320].forEach((f,i)=>tone(f,f,.22,.2,'triangle',i*.09));}
    else if(e.type==='forgeDown'){tone(260,75,.45,.2,'triangle');}
    else if(e.type==='forgeStay'){tone(220,180,.18,.15,'triangle');}
    else if(e.type==='spin'){[0,.16,.32,.48,.64,.8,.96,1.12,1.3,1.5].forEach((delay,i)=>tone(420+i*45,200,.045,.1,'square',delay));}
    else if(e.type==='reload'){hiss(4000,1200,.07,.15);tone(300,180,.08,.17,'square',.15);}
    else if(['heal','growth','revive'].includes(e.type)){[440,660,880].forEach((f,i)=>tone(f,f*1.1,.2,.18,'sine',i*.1));}
    else if(e.type==='wave'){[196,294,392].forEach((f,i)=>tone(f,f,.25,.22,'triangle',i*.14));}
    else if(e.type==='down'){tone(260,45,.6,.3,'sawtooth');}
    return true;
  }
  return {unlock,play,cancel,push(state,id){for(const e of tracker.push(state,id))play(e);},reset(){cancel();tracker.reset();gates.clear();},setVolume(v){volume=Math.max(0,Math.min(1,Number(v)||0));storage?.setItem('lastpack-volume',volume);gain();},setMuted(v){muted=!!v;if(muted)cancel();storage?.setItem('lastpack-muted',muted);gain();},get muted(){return muted;},get volume(){return volume;}};
}
