// Original four-bar chip music, synthesized locally. Sound effects keep their own mixer.
export const MUSIC_THEMES={
  menu:{name:'墓园夜班 · 营地',bpm:90,roots:[45,41,48,43],melody:[12,null,19,15,17,null,15,10,12,null,7,10,15,14,10,null]},
  battle:{name:'背包暴走 · 战斗',bpm:116,roots:[45,41,48,43],melody:[12,15,19,null,17,15,12,10,12,null,19,22,19,17,15,10]},
  surge:{name:'尸潮加班 · 爆发',bpm:132,roots:[45,45,41,43],melody:[12,19,12,22,19,15,17,19,12,19,22,24,22,19,17,15]},
  boss:{name:'红月钟声 · 首领',bpm:126,roots:[33,34,41,40],melody:[12,null,13,19,12,13,19,null,20,19,13,12,7,null,13,12]},
  upgrade:{name:'幸运夜宵 · 奖励',bpm:94,roots:[48,43,45,41],melody:[12,16,19,null,24,null,19,16,14,17,21,null,19,17,14,null]},
  victory:{name:'天亮回家 · 撤离',bpm:100,roots:[48,53,55,48],melody:[12,16,19,24,null,19,16,12,17,21,24,null,19,16,14,12]},
  defeat:{name:'下次再见 · 失守',bpm:76,roots:[45,41,43,40],melody:[19,null,15,null,12,null,10,null,15,null,12,null,7,null,10,null]}
};
export function musicScene(state){if(!state||state.phase==='prepare')return 'menu';if(state.phase!=='battle')return MUSIC_THEMES[state.phase]?state.phase:'menu';return state.enemies?.some(e=>e.kind==='boss')?'boss':state.pacing==='尸潮爆发'?'surge':'battle';}
export function createMusic({Context=globalThis.AudioContext||globalThis.webkitAudioContext,storage=globalThis.localStorage,interval=globalThis.setInterval,clear=globalThis.clearInterval,hidden=()=>!!globalThis.document?.hidden}={}){
  let ctx,master,noise,timer=null,scene='menu',playing='menu',step=0,next=0,unlocked=false,paused=false;
  let muted=storage?.getItem('lastpack-music-muted')==='true',volume=Number(storage?.getItem('lastpack-music-volume')??.3);
  if(!Number.isFinite(volume))volume=.3;volume=Math.max(0,Math.min(1,volume));
  const active=new Set(),freq=n=>440*2**((n-69)/12);
  const save=(key,value)=>{try{storage?.setItem(key,String(value));}catch{}};
  function gain(){if(master)master.gain.setTargetAtTime(muted?0:volume*.32,ctx.currentTime,.08);}
  function stop(){if(timer!==null){clear(timer);timer=null;}for(const source of [...active])try{source.stop();}catch{}active.clear();}
  function note(midi,t,d,amp,wave='triangle',drum=false){
    if(active.size>=24)return;
    const source=drum?ctx.createBufferSource():ctx.createOscillator(),g=ctx.createGain();
    if(drum)source.buffer=noise;else{source.type=wave;source.frequency.setValueAtTime(freq(midi),t);}
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(amp,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+d);
    source.connect(g);g.connect(master);active.add(source);source.onended=()=>{active.delete(source);source.disconnect();g.disconnect();};source.start(t);source.stop(t+d+.015);
  }
  function schedule(){
    if(!ctx||ctx.state!=='running'||hidden()||paused||muted||!volume)return;
    if(next<ctx.currentTime-.25)next=ctx.currentTime+.025;
    let count=0;
    while(next<ctx.currentTime+.18&&count++<8){
      if(step%16===0)playing=scene;
      const theme=MUSIC_THEMES[playing],beat=60/theme.bpm/4,position=step%16,bar=Math.floor(step/16)%4,root=theme.roots[bar],busy=['battle','surge','boss'].includes(playing);
      if(position%4===0)note(root,next,beat*3,.24,'triangle');
      const chord=playing==='upgrade'||playing==='victory'?[0,4,7,12]:[0,3,7,10];
      if(busy||position%2===0)note(root+12+chord[position%4],next,beat*.75,busy?.065:.045,'square');
      const melody=theme.melody[(position+bar*4)%16];if(melody!==null&&position%2===0)note(root+12+melody,next,beat*1.8,.095,'triangle');
      if(busy&&position%4===0)note(28,next,.12,.20,'sine');
      if(busy&&position%8===4)note(0,next,.08,.055,'triangle',true);
      if(playing==='surge'&&position%2===1)note(0,next,.025,.018,'triangle',true);
      step++;next+=beat;
    }
  }
  function start(){if(!unlocked||paused||hidden()||muted||!volume||timer!==null)return;next=ctx.currentTime+.025;playing=scene;step=0;schedule();timer=interval(schedule,75);}
  async function unlock(){
    try{if(!Context)return false;if(!ctx){ctx=new Context();master=ctx.createGain();const compressor=ctx.createDynamicsCompressor();compressor.threshold.value=-16;compressor.ratio.value=3;master.connect(compressor);compressor.connect(ctx.destination);noise=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.12),ctx.sampleRate);const data=noise.getChannelData(0);let seed=17;for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;data[i]=(seed/4294967296*2-1)*.5;}gain();}if(ctx.state==='suspended')await ctx.resume();unlocked=ctx.state==='running';start();return unlocked;}catch{return false;}
  }
  return {
    unlock,get isPlaying(){return !!ctx&&ctx.state==='running'&&timer!==null&&!paused&&!muted&&volume>0;},get muted(){return muted;},get volume(){return volume;},get scene(){return scene;},get title(){return MUSIC_THEMES[scene].name;},get activeVoices(){return active.size;},
    setScene(state){const value=typeof state==='string'?state:musicScene(state);if(MUSIC_THEMES[value])scene=value;},
    setMuted(value){muted=!!value;save('lastpack-music-muted',muted);gain();if(muted)stop();else start();},
    setVolume(value){if(!Number.isFinite(value))return;volume=Math.max(0,Math.min(1,value));save('lastpack-music-volume',volume);gain();if(!volume)stop();else start();},
    visibility(){if(hidden()){paused=true;stop();}else{paused=false;start();}},
    destroy(){paused=true;stop();ctx?.close?.();}
  };
}
