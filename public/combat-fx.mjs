// Pixel primitives stay bounded: no per-frame images, gradients or random allocations.
const clamp=n=>Math.max(0,Math.min(1,n));
function dot(c,x,y,size,color){c.fillStyle=color;c.fillRect(Math.round(x-size/2),Math.round(y-size/2),size,size);}
function line(c,x,y,tx,ty,color,width=1){const count=Math.max(1,Math.min(220,Math.ceil(Math.hypot(tx-x,ty-y))));for(let n=0;n<=count;n+=2)dot(c,x+(tx-x)*n/count,y+(ty-y)*n/count,width,color);}
function sparks(c,x,y,age,color,count=6){for(let n=0;n<count;n++){const a=n/count*Math.PI*2,d=2+age*35;line(c,x+Math.cos(a)*d,y+Math.sin(a)*d,x+Math.cos(a)*(d+3),y+Math.sin(a)*(d+3),color,1);}}
function shockRing(c,x,y,r,color,count=32,size=2){for(let n=0;n<count;n++){const a=n/count*Math.PI*2;dot(c,x+Math.cos(a)*r,y+Math.sin(a)*r,size,color);}}
function sector(c,x,y,r,start,sweep,width,color,segments=16){
  c.fillStyle=color;c.beginPath();
  for(let n=0;n<=segments;n++){const a=start+sweep*n/segments,px=Math.round(x+Math.cos(a)*r),py=Math.round(y+Math.sin(a)*r);if(n)c.lineTo(px,py);else c.moveTo(px,py);}
  for(let n=segments;n>=0;n--){const a=start+sweep*n/segments,inner=Math.max(0,r-width);c.lineTo(Math.round(x+Math.cos(a)*inner),Math.round(y+Math.sin(a)*inner));}c.closePath();c.fill();
}
function ribbon(c,x,y,tx,ty,width,color){const d=Math.hypot(tx-x,ty-y)||1,nx=-(ty-y)/d*width/2,ny=(tx-x)/d*width/2;c.fillStyle=color;c.beginPath();c.moveTo(Math.round(x+nx),Math.round(y+ny));c.lineTo(Math.round(tx+nx),Math.round(ty+ny));c.lineTo(Math.round(tx-nx),Math.round(ty-ny));c.lineTo(Math.round(x-nx),Math.round(y-ny));c.closePath();c.fill();}
function star(c,x,y,r,angle,color){for(let n=0;n<4;n++){const a=angle+n*Math.PI/2;ribbon(c,x,y,x+Math.cos(a)*r,y+Math.sin(a)*r,Math.max(2,r*.32),color);}}
// Large, recognizable silhouettes and overlapping afterimages, inspired by survivors-style bullet hell.
// All positions come from a real attack; decoration never creates targets or changes hit geometry.
function spectacle(c,e,{x,y,tx,ty,px,py,dx,dy,d,ux,uy,visual,age,flight,t,tier,accent},quality){
  const angle=Math.atan2(dy,dx),strength=.7+tier*.2,ghosts=quality==='high'?4:3,seed=Number(String(e.id||0).replace(/\D/g,''))||0;
  if(['bullet','pellets','arrow','spike','explosive'].includes(visual)&&t<1){
    const length=Math.min(d*t,14+tier*8);
    if(visual==='pellets'){
      for(let n=-3;n<=3;n++){const off=n*(2+tier)*t,ax=px-uy*off,ay=py+ux*off;ribbon(c,ax-ux*length,ay-uy*length,ax,ay,2+tier*.6,accent+'88');star(c,ax,ay,2+tier*.3,angle,'#fff0b3');}
    }else{
      ribbon(c,px-ux*length,py-uy*length,px,py,7+tier,accent+'40');ribbon(c,px-ux*length*.7,py-uy*length*.7,px,py,3+tier*.5,accent);ribbon(c,px-ux*8,py-uy*8,px+ux*4,py+uy*4,2,'#fff9dd');
      if(visual==='arrow'||visual==='spike')star(c,px,py,6+tier,angle,visual==='spike'?'#cff7a4':'#fff2d1');
    }
  }else if(visual==='laser'){
    const reach=e.pierce?Math.max(d,Math.min((e.range||d*2)/2,240)):d,ex=x+ux*reach,ey=y+uy*reach,pulse=1-clamp(age/.5);
    ribbon(c,x,y,ex,ey,(16+tier*3)*pulse,'#44e2e533');ribbon(c,x,y,ex,ey,(8+tier*2)*pulse,'#7dfaff77');ribbon(c,x,y,ex,ey,3+tier*.5,'#efffff');
    for(let n=0;n<ghosts;n++){const u=(age*2+n/ghosts)%1,cx=x+ux*reach*u,cy=y+uy*reach*u;star(c,cx,cy,5+tier,angle+Math.PI/4,'#a8ffff');}
    sector(c,x,y,10+tier*3,age*3,Math.PI*1.4,3,'#9afcfa99');
  }else if(visual==='electric'){
    let ax=x,ay=y;
    for(let n=1;n<=9;n++){const u=n/9,j=n===9?0:Math.sin(n*9+seed+age*12)*(5+tier*2),bx=x+dx*u-uy*j,by=y+dy*u+ux*j;ribbon(c,ax,ay,bx,by,8+tier,'#397fdc55');ribbon(c,ax,ay,bx,by,3+tier*.4,'#aef8ff');
      if(n%3===0){const side=n%2?1:-1;ribbon(c,bx,by,bx-uy*(9+tier*3)*side,by+ux*(9+tier*3)*side,2,'#e8ffff');}ax=bx;ay=by;}
    for(let n=0;n<3;n++)sector(c,tx,ty,8+tier*3+age*22,age*4+n*Math.PI*2/3,Math.PI*.42,3,'#8cd8ff99');
    if(tier>=3){ribbon(c,tx+7,ty-28,tx-5,ty-12,4,'#d5ffff');ribbon(c,tx-5,ty-12,tx,ty,3,'#d5ffff');}
  }else if(visual==='flame'){
    const reach=Math.min((e.range||180)/2,145),spread=e.cone||.5;
    sector(c,x,y,reach,angle-spread,spread*2,reach,'#ea4f3038');sector(c,x,y,reach*.8,angle-spread*.75,spread*1.5,reach,'#f9924266');sector(c,x,y,reach*.55,angle-spread*.5,spread,reach,'#ffdc8877');
    for(let n=0;n<9;n++){const u=(age*2+n*.137)%1,a=angle+Math.sin(n*7+seed)*spread*.8,dist=reach*u,cx=x+Math.cos(a)*dist,cy=y+Math.sin(a)*dist;sector(c,cx,cy,(6+tier*2)*(1-u*.5),0,Math.PI*2,18,n%2?'#ffb451aa':'#f36c39aa',10);}
  }else if(['slash','scissors','thrust'].includes(visual)){
    const reach=Math.min((e.range||95)/2,100),progress=clamp(age/.32);
    if(visual==='thrust'){
      for(let n=ghosts;n>=0;n--){const length=reach*Math.max(0,1-Math.abs(progress-.45)*1.8)-n*3;ribbon(c,x+ux*6,y+uy*6,x+ux*length,y+uy*length,5+n*2,n?'#d8d4af44':'#fff6c6');}star(c,x+ux*reach*.8,y+uy*reach*.8,6+tier,angle,'#fff3c6');
    }else{
      const sweep=e.weapon==='ghostaxe'||e.weapon==='barber'?2.5:2,start=angle-1.25+progress*.5;
      for(let n=ghosts;n>=0;n--){const r=reach-n*3;sector(c,x,y,r,start-n*.13,sweep*(.5+progress*.5),6+tier*2,n?accent+'40':accent+'bb');}
      sector(c,x,y,reach,start,sweep*(.5+progress*.5),3,'#fff2e9');
      if(visual==='scissors')sector(c,x,y,reach,angle+.8-progress*.5,-sweep,4+tier,'#ffc4e799');
    }
  }else if(['fireball','ice','shuriken','stone','rocket'].includes(visual)&&t<1){
    for(let n=ghosts;n>=0;n--){const behind=n*(7+tier*2),cx=px-ux*behind,cy=py-uy*behind,size=(visual==='stone'?5:visual==='rocket'?7:8)*strength*(1-n/(ghosts+2));
      if(visual==='shuriken'){star(c,cx,cy,size,age*18-n*.3,n?'#cfc8ff55':'#eee4ff');sector(c,cx,cy,size+3,age*8,Math.PI*1.4,2,'#b49cff77',12);}
      else if(visual==='ice'){star(c,cx,cy,size,Math.PI/4,n?'#70d8fc55':'#dafcff');star(c,cx,cy,size*.7,0,n?'#70d8fc44':'#a5efff');}
      else if(visual==='stone'){sector(c,cx,cy,size,0,Math.PI*2,size*2,n?'#aac88d44':'#a9bf88',8);}
      else{sector(c,cx,cy,size+3,0,Math.PI*2,size*2+6,n?'#ec582f55':'#fa743abb',12);sector(c,cx,cy,size*.65,0,Math.PI*2,size*2,'#ffd99faa',10);}
    }
  }
  if(t>=1&&age-flight<.42){
    const progress=clamp((age-flight)/.42),r=(e.crit?18:9)+tier*3,color=['ice','electric','laser'].includes(visual)?'#b9faff':visual==='slash'||visual==='scissors'?'#f5c7ff':'#ffe9a3';
    c.save();c.globalAlpha*=1-progress;
    star(c,tx,ty,r*(.5+progress),Math.PI/4,color);sector(c,tx,ty,5+progress*r*1.5,0,Math.PI*2,2,accent+'99',quality==='high'?24:16);c.restore();
  }
}
export function drawCombatEffect(c,e,{quality='balanced',motion=true}={}){
  const age=(e.duration||.35)-e.life-(e.delay||0);if(age<0)return;
  const x=e.x/2,y=e.y/2-3,tx=e.tx/2,ty=e.ty/2-5,dx=tx-x,dy=ty-y,d=Math.hypot(dx,dy)||1,ux=dx/d,uy=dy/d;
  const visual=e.visual||(e.lightning?'electric':'bullet'),flight=e.flight||0,t=flight?clamp(age/flight):1,px=x+dx*t,py=y+dy*t;
  const tail=(len,color,width=1)=>line(c,px-ux*len,py-uy*len,px,py,color,width);
  c.save();c.globalAlpha*=clamp(e.life/.10);
  const tier=Math.max(1,Math.min(4,e.tier||1)),accent=['','#ffe3a0','#8edefe','#d7a2ff','#ff9f9a'][tier],rich=quality!=='low'&&motion;
  if(rich)spectacle(c,e,{x,y,tx,ty,px,py,dx,dy,d,ux,uy,visual,age,flight,t,tier,accent},quality);
  // Muzzle flash and a falling brass case accompany firearms, with no screen shake.
  if(e.type==='shot'&&['bullet','pellets','explosive'].includes(visual)&&age<.10){
    const mx=x+ux*9,my=y+uy*9;dot(c,mx,my,e.weapon==='revolver'||e.weapon==='sniper'?7:5,'#f4a14d');dot(c,mx+ux*2,my+uy*2,3,'#fff3c2');
    line(c,mx-uy*4,my+ux*4,mx+uy*4,my-ux*4,'#ffce6b');
  }
  if(e.type==='shot'&&['bullet','pellets','explosive'].includes(visual)&&age<.25)dot(c,x-uy*(4+age*17),y+ux*(4+age*17)+age*9,2,'#cda667');
  if(visual==='laser'){
    const reach=e.pierce?Math.max(d,Math.min((e.range||d*2)/2,220)):d,ex=x+ux*reach,ey=y+uy*reach;
    line(c,x,y,ex,ey,'#287b9180',rich?10+tier:7);line(c,x,y,ex,ey,'#69e2e8',rich?4:3);line(c,x,y,ex,ey,'#e6ffff',2);dot(c,x+ux*8,y+uy*8,5,'#b2ffff');
  }else if(visual==='electric'){
    let ax=x,ay=y;for(let n=1;n<=7;n++){const u=n/7,j=n===7?0:Math.sin(n*11+Math.floor(age*25)+Number(e.id||0))*5,bx=x+dx*u-uy*j,by=y+dy*u+ux*j;line(c,ax,ay,bx,by,'#4b8fd8',3);line(c,ax,ay,bx,by,'#d9ffff');ax=bx;ay=by;}sparks(c,tx,ty,age,'#b7f4ff',5);
  }else if(visual==='flame'){
    const reach=Math.min((e.range||180)/2,110),angle=Math.atan2(dy,dx),spread=e.cone||.5;
    for(let n=0;n<25;n++){const u=((n*.137+age*2)%1),a=angle+Math.sin(n*12)*spread*u,r=8+reach*u;dot(c,x+Math.cos(a)*r,y+Math.sin(a)*r,Math.max(2,Math.round(7-4*u)),u>.7?'#bb4c3d99':u>.3?'#f59242':'#ffdb79');}
  }else if(['slash','thrust','scissors'].includes(visual)){
    const angle=Math.atan2(dy,dx),r=Math.min((e.range||95)/2,75),progress=clamp(age/.20);
    if(visual==='thrust'){const extent=r*Math.sin(progress*Math.PI);line(c,x+ux*7,y+uy*7,x+ux*extent,y+uy*extent,'#c4ad82',3);line(c,x+ux*(extent-5),y+uy*(extent-5),x+ux*(extent+5),y+uy*(extent+5),'#eff5e3',2);}
    else for(let n=0;n<16;n++){const a=angle-1+2*(n/15*.45+progress*.55),radius=r-n%3;dot(c,x+Math.cos(a)*radius,y+Math.sin(a)*radius,2,e.weapon==='ghostaxe'?'#ceb4f2':'#e4e7ec');if(visual==='scissors')dot(c,x+Math.cos(2*angle-a)*radius,y+Math.sin(2*angle-a)*radius,2,'#f2b8cb');}
  }else if(t<1){
    if(visual==='pellets')for(let n=-3;n<=3;n++){const offset=n*3*t;line(c,px-ux*4-uy*offset,py-uy*4+ux*offset,px-uy*offset,py+ux*offset,'#ffd991',1);}
    else if(visual==='rocket'){
      for(let n=1;n<=6;n++)dot(c,px-ux*n*5,py-uy*n*5+Math.sin(n)*2,Math.max(2,6-n/2|0),'#77718080');
      tail(12,'#ef8a46',4);tail(6,'#ffe1a0',2);line(c,px-ux*3,py-uy*3,px+ux*5,py+uy*5,'#9ca7ad',4);dot(c,px+ux*6,py+uy*6,3,'#ef716b');
    }else if(visual==='fireball'){tail(12,'#ee7443',5);dot(c,px,py,7,'#f4a04c');dot(c,px+ux*2,py+uy*2,3,'#ffe0a0');}
    else if(visual==='ice'){tail(12,'#70b5dd80',3);c.fillStyle='#b9f4fa';c.beginPath();c.moveTo(px+ux*5,py+uy*5);c.lineTo(px-uy*3,py+ux*3);c.lineTo(px-ux*5,py-uy*5);c.lineTo(px+uy*3,py-ux*3);c.closePath();c.fill();}
    else if(visual==='shuriken'){const a=age*35;for(let n=0;n<4;n++){const b=a+n*Math.PI/2;line(c,px,py,px+Math.cos(b)*5,py+Math.sin(b)*5,'#d5e3ef',2);}dot(c,px,py,2,'#687f96');}
    else if(visual==='stone'){dot(c,px,py,5,'#65757c');dot(c,px-1,py-1,2,'#c3cabd');}
    else if(visual==='arrow'||visual==='spike'){tail(12,visual==='spike'?'#9ad28e':'#af976d',2);line(c,px-ux*4-uy*3,py-uy*4+ux*3,px,py,'#e5e7ca');line(c,px-ux*4+uy*3,py-uy*4-ux*3,px,py,'#e5e7ca');}
    else{tail(e.weapon==='sniper'?18:e.weapon==='revolver'?9:6,'#f7c66a',e.weapon==='revolver'?3:2);dot(c,px,py,2,'#fff0c1');if(visual==='explosive')dot(c,px,py,4,'#f3b47a');}
  }
  if(t>=1&&age-flight<.18){
    const color=visual==='ice'?'#9dedff':visual==='fireball'||visual==='rocket'||visual==='explosive'?'#ffc677':visual==='stone'?'#acae9f':'#fff1bf';sparks(c,tx,ty,age-flight,color,e.crit?9:6);
    if(visual==='ice'){line(c,tx-6,ty,tx+6,ty,color);line(c,tx,ty-6,tx,ty+6,color);}
  }
  c.restore();
}
export function drawBlast(c,e,{quality='balanced',motion=true}={}){
  const age=(e.duration||.3)-e.life-(e.delay||0);if(age<0)return;
  const p=clamp(age/Math.max(.3,(e.duration||.3)-(e.delay||0))),x=e.x/2,y=e.y/2,r=e.radius/2,rich=quality!=='low'&&motion;
  c.save();c.globalAlpha*=1-p;
  if(rich){
    // Fire clouds expand inside the real explosion radius; a dark rim makes the blast read on bright ground.
    const tier=Math.max(1,Math.min(4,e.tier||1));
    if(e.weapon!=='shotgun'&&e.weapon!=='chatter'){
      sector(c,x,y,r*(.35+p*.65),0,Math.PI*2,5,'#532637cc',24);
      sector(c,x,y,r*(.3+p*.6),0,Math.PI*2,r,'#f26a3644',20);
      for(let n=0;n<7;n++){const a=n*Math.PI*2/7+p*.5,d=r*p*.58,cx=x+Math.cos(a)*d,cy=y+Math.sin(a)*d,size=Math.min(r*.35,(9+tier*2)*(1-p*.4));sector(c,cx,cy,size,0,Math.PI*2,size*2,n%2?'#ffac5599':'#f26e4099',10);sector(c,cx,cy,size*.5,0,Math.PI*2,size,'#ffefae',8);}
    }else sector(c,x,y,Math.min(r,12+p*25),-.8+p,Math.PI*1.6,5,'#fff0b599',18);
    const count=quality==='high'?40:28;
    shockRing(c,x,y,r*(.3+p*.85),'#ffc379',count,3);
    shockRing(c,x,y,r*(.12+p*.7),'#fff3bf',count,2);
    if(e.weapon!=='shotgun'&&e.weapon!=='chatter')for(let n=0;n<12;n++){const a=n*Math.PI/6,d=r*p;dot(c,x+Math.cos(a)*d,y+Math.sin(a)*d,Math.max(3,Math.round(14*(1-p))),n%2?'#ee773d':'#ffd174');dot(c,x+Math.cos(a)*d*.8,y+Math.sin(a)*d*.8-8*p,Math.max(2,Math.round(8*(1-p))),'#9a665d88');}
    dot(c,x,y,Math.max(2,Math.round(24*(1-p))),'#ffe8a9');
  }
  if(e.weapon==='shotgun'||e.weapon==='chatter'){sparks(c,x,y,age,'#e9bc8b',12);}
  else{for(let n=0;n<12;n++){const a=n/12*Math.PI*2,d=r*p*(.6+(n%3)*.15);dot(c,x+Math.cos(a)*d,y+Math.sin(a)*d,Math.max(2,Math.round(8*(1-p))),n%3?'#ed8c4c':'#f9d486');}dot(c,x,y,Math.max(2,Math.round(14*(1-p))),'#fff0b8');}
  c.restore();
}
