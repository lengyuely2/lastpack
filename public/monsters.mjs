// Animated Monsters by stealthix, CC0. See assets/monsters/CREDITS.txt.
const sheets=new Map(),frames=new Map();
const info={zombie:{count:40},skeleton:{count:39},witch:{count:40}};
for(const name of Object.keys(info)){const image=new Image();image.src=`/assets/monsters/${name}.png`;sheets.set(name,image);}
export function monsterArt(kind,rank=1,time=0,{walking=true,attack=0,slow=false,fall=false}={}){
  const name=['boss','caster'].includes(kind)?'witch':kind==='runner'?'skeleton':'zombie',image=sheets.get(name);
  if(!image.complete||!image.naturalWidth)return null;
  const phase=fall?2+Math.min(3,Math.floor(time*7)):attack>.65?18+Math.min(7,Math.floor((.9-attack)*28)):walking?6+Math.floor(time*8)%6:Math.floor(time*2)%2;
  const index=Math.min(info[name].count-1,phase),key=[name,index,rank,slow].join(':');
  if(!frames.has(key)){
    const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(image,index*32,0,32,32,0,0,32,32);
    if(rank>1||slow){const data=c.getImageData(0,0,32,32),tint=slow?[110,200,240]:rank===4?[200,120,170]:rank===3?[200,100,110]:[140,110,205],amount=slow?.45:rank===2?.2:.27;for(let n=0;n<data.data.length;n+=4){if(!data.data[n+3])continue;for(let ch=0;ch<3;ch++)data.data[n+ch]=Math.round(data.data[n+ch]*(1-amount)+tint[ch]*amount);}c.putImageData(data,0,0);}
    if(!fall&&rank>=3&&name==='zombie'){c.fillStyle='#3b314e';c.fillRect(10,14,4,3);c.fillRect(20,14,4,3);c.fillStyle='#c3a08a';c.fillRect(11,14,3,1);c.fillRect(20,14,3,1);}
    frames.set(key,canvas);
  }
  return {image:frames.get(key),foot:23,width:32,height:32};
}
