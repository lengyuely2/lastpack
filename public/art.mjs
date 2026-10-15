import {CHARACTER_ART,characterPalette} from '/character-art.mjs';
import {translateText} from '/i18n.mjs';
import {dangerDistance} from '/survival.mjs';
import {MAPS} from '/expedition.mjs';
import {drawCombatEffect,drawBlast} from '/combat-fx.mjs';
import {monsterArt} from '/monsters.mjs';
import {monsterRank} from '/game.mjs';
const paths={
 stormorb:'<circle cx="44" cy="23" r="19"/><path d="m47 7-13 18h11l-5 15 15-20H44zM26 42h36l5 7H21z"/>',
 meteorbook:'<path d="M14 12h25l5 5 5-5h25v34H49l-5 4-5-4H14zM44 17v28M56 19l5 6 8-1-8 9-9 1zM20 22h15m-15 8h15"/>',
 snowstaff:'<path d="m20 48 38-35M58 13V2m0 11 12-7m-12 7 13 5m-13-5L47 4m11 9-1 13m1-13-13 7M29 31l6 7"/>',
 bloodbag:'<path d="M26 8h34v39H26zM31 8V3h24v5M36 19l8-6 8 6v10q-8 12-16 0zM31 39h24"/>',
 bandage:'<path d="m19 8 54 26-7 14L12 22zM34 17l19 9-7 14-19-9zM23 17l1 1m-5 4 1 1m43 12 1 1m-5 4 1 1"/>',
 soup:'<path d="M15 24h59l-10 23H26zM11 24h68M31 18c-7-5 6-8 0-13m14 13c-7-5 6-8 0-13m14 13c-7-5 6-8 0-13M35 32h20m-10-6v13"/>',
 cherrybomb:'<circle cx="29" cy="35" r="13"/><circle cx="59" cy="35" r="13"/><path d="M29 22 44 4l15 18M44 4l14 1 9 9M23 32l8 5m22-5 8 5M70 9l8-5m-3 11 8 1"/>',
 powder:'<path d="M26 7h34l-5 8 9 31H22l9-31zM33 7V3h20v4M43 20l3 9 10 2-9 5 1 9-7-7-9 3 4-9-6-7 10 1z"/>',
 blastheart:'<path d="M26 15h34v32H26zM31 15V8h24v7M37 8V3h13M20 25h6m34 0h6M36 29l8-5 7 5-7 10z"/>',
 ghostshoe:'<path d="M19 13h17v17l18 6 17-3v14H17V28zM48 9h15v11l12 5M22 34h13m16 7h16M9 15h7m-9 9h8"/>',
 umbrella:'<path d="M10 28q34-43 68 0H10zM44 5v33c0 16 17 15 17 5M44 9 27 28m17-19 17 19M17 36v9m10-7v9m45-12v9"/>',
 rabbitfoot:'<path d="M31 25 22 6q5-9 11 1l8 16 6-20q5-7 10 1l-6 22q17 11 8 21H29q-11-11 2-22zM35 34h1m12 0h1M37 43h10"/>',
 spellbook:'<path d="M17 9h50v38H17zM24 9v38M46 16l3 8 9 1-7 6 2 8-7-5-8 5 2-8-6-6 10-1zM69 15h5m-5 9h5m-5 9h5"/>',
 rune:'<path d="m44 3 24 13v23L44 51 20 39V16zM44 10v34M30 19l28 15m0-15L30 34M6 20h7m62 0h7"/>',
 manabottle:'<path d="M35 4h18v9l10 9v22q-20 12-40 0V22l12-9zM34 4V1h20v3M24 29h38M36 33l8-7 5 9-8 5z"/>',
 coffee:'<path d="M23 18h35v25H23zM58 21h8c11 0 11 16 0 16h-8M17 47h48M31 12c-6-5 5-5 0-10m12 10c-6-5 5-5 0-10"/>',
 tooth:'<path d="M22 8q12-6 20 1 10-7 23-1 11 12-1 33-8 14-13-5-9-17-16 0-6 19-13 3Q9 14 22 8zM26 15l8 3m20-3 7 1"/>',
 worm:'<path d="M20 42c-18-25 18-33 19-9s28 12 24-5-18-25-8-20 26 11 18 22M19 22l8 1m4-8 5 6m7 20 7-5m12 3-1-7"/><circle cx="61" cy="11" r="1"/>',
 salad:'<path d="M15 28h60l-10 20H25zM20 28c-13-15 1-19 9-11-1-18 17-15 17-1 10-12 25-10 21 5 12-3 15 3 8 7M28 35l8 6m13-6 7 5"/>',
 lemonade:'<path d="M29 14h32l-4 34H33zM42 14 49 2h14M30 27h30"/><circle cx="26" cy="15" r="10"/><path d="m19 10 13 10m-12 0 12-10"/>',
 tomato:'<path d="M43 11c-29-13-36 28-17 35 11 4 24 5 35-1 20-11 8-38-18-34zM43 12 32 5l11 2 11-5-6 11M27 25l8-3m17 0 8 3M36 38q8-8 17 0"/><path d="m28 28-3 9m33-9 3 9"/>',
 snail:'<path d="M14 38h54q14-5 9-19M15 38l-5 8h66M73 20l-4-11m7 9 7-9"/><circle cx="40" cy="25" r="18"/><path d="M43 13c-15 0-19 22-6 22 10 0 14-15 4-14-5 0-6 7-1 7"/>',
 jaw:'<path d="M15 17q28 21 59 0v20q-30 16-59 0zM22 22v14h12V27m8 2v11h11V26M60 24v12h9V20M20 13l6-7m38 7 6-7"/>',
 glove:'<path d="M24 34c-8-12-8-28 6-28h26c16 0 17 22 9 29l-8 11H29zM25 18c-14-8-20 7-9 19h9M30 40h27M36 12v9m12-9v9"/>',
 tape:'<ellipse cx="42" cy="23" rx="25" ry="17"/><ellipse cx="42" cy="23" rx="12" ry="8"/><path d="M17 23v11q18 18 50 0V23M67 31l13 14-17 2-10-9"/>',
 hat:'<path d="M16 33q27-34 57 0zM10 33h68M43 18V6M43 6 22 4m21 2 22-3M31 34l-2 11m29-11 2 11"/>',
 magnet:'<path d="M23 8v22c0 26 40 26 40 0V8H49v22c0 8-12 8-12 0V8zM23 19h14m12 0h14"/>',
 bunny:'<path d="M30 24C5-16 42-1 38 23m13 0c-6-39 31-39 10 2M30 24c-18 26 42 30 32 3"/><circle cx="38" cy="33" r="1"/><circle cx="55" cy="33" r="1"/><path d="m43 40 4 3 4-3"/>',
 cake:'<path d="M19 22h53v26H19zM19 29q10 12 17 0 11 14 18 0 10 13 18 0M16 48h60M29 22v-9m16 9v-9m15 9v-9"/><path d="m27 9 2-5 2 5m12 0 2-5 2 5m13 0 2-5 2 5"/>',
 mushroom:'<path d="M43 4C22 4 15 20 13 30h61C71 16 64 4 43 4zM34 30l-3 18h24l-4-18"/><circle cx="31" cy="18" r="4"/><circle cx="55" cy="21" r="5"/>',
 hedgehog:'<path d="m15 38 0-15 9 3-2-14 13 7L40 4l10 14 13-10-1 16 14-1-3 12 10 7H14zM20 35l10 5m25-8 10 3"/><circle cx="69" cy="35" r="1"/>',
 tentacle:'<path d="M30 5c28 2 18 25 5 25s-20 15-6 17 46-4 33-18M38 12l7 1m-7 8 6 2M21 38l7 3m18-2 1 7m12-13 6 4"/>',
 eye:'<path d="M10 26q32-36 69 0-35 34-69 0z"/><circle cx="44" cy="26" r="13"/><circle cx="44" cy="26" r="4"/><path d="m20 13-4-6m26 4V3m23 10 6-7"/>',
 snake:'<path d="M15 40c22 12 50 5 38-12s-27-6-23 4 35 12 39-5S58 0 48 9s-2 20 12 12M59 8l5-4m-4 3 6 2"/><circle cx="51" cy="12" r="1"/>',
 ritual:'<path d="M18 7h43v39H18zM24 14h31m-31 26h29M61 14h10v28H61M31 27c-4-10 14-11 12-3l9 4-9 3c2 9-15 10-16 3l-5-4z"/>',
 slingshot:'<path d="M42 45V26L25 7l-8 5 17 20v13zM42 26 62 7l8 5-22 20M22 10q20 27 43 0"/><circle cx="44" cy="23" r="4"/>',
 shuriken:'<path d="m44 3 7 15 26-2-17 16 6 18-22-10-21 10 5-18-17-16 25 2z"/><circle cx="44" cy="28" r="5"/>',
 crossbow:'<path d="M14 12q30 30 61 0M14 12l30 30 31-30M44 5v41M40 5h8M38 33h12"/>',
 taser:'<path d="M20 13h36v16H37l-4 16H22l5-16h-7zM56 15h13v4H56M56 24h13v4H56M38 12l4-7 3 7M39 16l-4 8h8l-5 9"/>',
 wand:'<path d="m18 46 29-25M41 20l11 8M57 5l3 7 8 1-6 6 2 8-7-4-7 4 1-8-6-6 9-1zM26 11l-4-5m51 30 5 4M71 5l5-3"/>',
 flamethrower:'<path d="M12 17h38v13H12zM50 20h22v7H50M24 30l-4 15h12l4-15M13 17V7h16v10M36 17V5h10v12M74 15l11-4-5 11 6 9-12-3"/>',
 lightning:'<path d="m23 44 12-14L56 6l6 18-21 13M27 24l17 18M24 42l-6 6M72 7l-9 17h9l-8 18"/>',
 cactus:'<path d="M36 46V18c0-15 16-15 16 0v28zM36 30H22V17m30 18h16V22M41 19h6M41 30h6M41 40h6M28 23l-5-3m36 9 5-4M43 8V3"/>',
 scissors:'<circle cx="24" cy="37" r="9"/><circle cx="47" cy="39" r="9"/><path d="m30 30 31-24-15 29M41 32 31 4l-3 24"/><circle cx="37" cy="27" r="3"/>',
 ghostaxe:'<path d="m24 46 35-36M47 12l-9 5 8 18 16-12 11-1-2-15-12-3zM50 16l8 6M59 8l7 9"/>',
 wrench:'<path d="M56 5c-14-3-24 10-17 21L17 43l7 7 22-22c14 5 26-5 22-17l-10 9-8-8z"/>',
 shredder:'<path d="M9 14h47v18H9zM56 18h24v10H56M20 32l-4 13h11l5-13M39 32v12h13V32M18 14V8h17v6M67 14l3 5 5-3-1 6 6 2-6 2 1 6-5-3-3 5"/>',
 pistol:'<path d="M22 12h45v12H42l-5 20H24l6-20h-8zM43 24v9h10l4-9M59 12V8h6v4M25 13v9"/>',
 revolver:'<path d="M15 15h34v14H29l-7 16H10l9-20M49 17h29v7H49M32 15V9h13v6M32 29v6h10l4-6"/><circle cx="40" cy="22" r="6"/>',
 laser:'<path d="M12 16h42v15H12zM54 20h26v7H54M26 31l-4 14h12l4-14M22 16V8h21v8M63 15v16M72 15v16"/>',
 rocket:'<path d="M8 13h62v18H8zM70 13l15 9-15 9M23 31v13h10V31M48 13V7h11v6M10 17H3v10h7"/>',
 knife:'<path d="m24 40 11-11L65 5l-8 25-16 7M28 25l17 17M24 40l-6 6 5 5 7-7"/>',
 spear:'<path d="m12 45 52-30M56 13 84 3 72 26l-8-11zM58 12l9 15"/>',
 rifle:'<path d="M10 24h43v-9H34v-4h-8v6H8v7m35 0 5 14h9l-7-14M26 26l-3 13h10l2-13M53 18h27v5H53M79 16h5v9h-5M5 20v17h7l9-11"/>',
 shotgun:'<path d="M8 24h47v-8H29v3H8m46 0h30v5H54M35 25l-5 13h10l3-13M5 21v17h8l14-13M61 15h9v12h-9"/>',
 smg:'<path d="M16 15h40v12H16zM56 18h17v5H56M26 27l-3 12h8l3-12M42 27v16h10V27M14 20H6v14h8M23 13V8h17v5"/>',
 sniper:'<path d="M7 24h51v-8H30v4H7M57 19h31v4H57M39 11h22v5H39zM24 25l-3 12h9l3-12M50 25l9 14M5 21v17h7l13-13"/>',
 frost:'<path d="M8 18h47v13H8zM55 21h24v7H55M24 31l-3 12h11l3-12M8 22H2v14h6M37 18V9h11v9M64 17v15M70 16v17"/><path d="M43 2v9m-4-7 8 5m0-5-8 5"/>',
 lmg:'<path d="M7 18h52v13H7zM59 21h29v6H59M18 31l-3 12h10l3-12M35 31v11h20V31M8 21H2v18h6M39 18V11h17v7M65 27l9 15m-9 0 9-15"/>',
 magazine:'<rect x="30" y="6" width="25" height="40" rx="4"/><path d="M37 12v26m11-26v26M30 40h25"/>',
 scope:'<path d="M13 19h55v13H13zM7 15h11v21H7zM67 14h14v23H67zM37 32v10h10V32M24 19v13M60 19v13"/>',
 trigger:'<path d="M31 8h24v12H31zM34 20v16c0 10 19 10 19 0V20M43 24v10"/>',
 fire:'<rect x="22" y="5" width="43" height="42" rx="4"/><path d="M44 13c0 8-12 8-10 19 3 11 21 9 21-2 0-5-7-8-8-11 0 6-6 6-3-6z"/>',
 pierce:'<path d="M23 18 30 6l7 12v25H23zM44 18 51 6l7 12v25H44zM23 36h14M44 36h14"/>',
 loader:'<circle cx="43" cy="25" r="18"/><circle cx="43" cy="25" r="6"/><path d="M43 7v8m18 10h-8M43 43v-8M25 25h8"/>',
 cooler:'<rect x="18" y="8" width="51" height="36" rx="4"/><circle cx="43" cy="26" r="12"/><path d="M43 14v24M31 26h24M34 17l18 18m0-18L34 35"/>',
 medkit:'<rect x="22" y="12" width="43" height="32" rx="5"/><path d="M34 12V5h18v7M43 20v16M35 28h16"/>',
 armor:'<path d="m43 5 22 8v18c0 10-22 17-22 17S21 41 21 31V13zM43 12v28M29 19h28M29 27h28"/>',
 boots:'<path d="M23 7h20v21l18 9v8H22V29zM28 14h10m-10 8h10M22 39h39"/>',
 clover:'<path d="M43 28C16 33 17 7 34 10c10 2 9 18 9 18C37 2 68 3 61 20c-4 8-18 8-18 8C68 13 78 39 60 42c-11 2-17-14-17-14C52 53 19 52 24 35c3-11 19-7 19-7m0 0 9 23"/>',
 piggybank:'<path d="M19 18q26-15 47 2l9 4v15l-10 2-2 8h-9l-2-5H31l-2 5h-9v-9Q8 27 19 18zM48 13l10-7 5 11M28 15h17M16 20q-13-13-9 2"/><circle cx="60" cy="25" r="2"/>',
 hourglass:'<path d="M25 5h36M25 49h36M29 5v9l13 13-13 13v9m28-44v9L44 27l13 13v9M34 14h18l-9 10zM34 42l9-10 9 10z"/>',
 charm:'<path d="m43 5 7 14 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2z"/>',
 battery:'<rect x="29" y="7" width="28" height="40" rx="4"/><path d="M37 7V2h12v5M46 15l-9 13h9l-6 12"/>',
 lock:'<rect x="25" y="22" width="36" height="27"/><path d="M32 22V13a11 11 0 0 1 22 0v9M43 32v8"/>',
 compass:'<circle cx="43" cy="26" r="21"/><path d="m49 13-3 17-12 10 5-17z"/>',
 bell:'<path d="M22 37h42l-7-10V17a14 14 0 0 0-28 0v10zM36 42q7 12 14 0M43 1v4"/>',
 echo:'<path d="M23 10h29v35H23zM52 16h9v29h-9M29 18h17M29 25h17M29 32h11M64 14q15 12 0 24"/>',
 bag:'<rect x="23" y="14" width="40" height="34"/><path d="M33 14V5h20v9M23 28h40M34 28v9h18v-9"/>',
 map:'<path d="m9 10 23-6 22 7 23-6v35l-23 6-22-7-23 6zM32 4v35M54 11v35"/>',
 survivor:'<circle cx="43" cy="15" r="10"/><path d="M26 44V29c0-11 34-11 34 0v15zM34 30h18v14H34z"/>'
};
// Original art, drawn on a 480 × 310 pixel surface and enlarged without filtering.
const iconCache=new Map();
export function icon(kind,color='currentColor'){
  const key=kind+color;if(iconCache.has(key))return iconCache.get(key);
  const canvas=document.createElement('canvas');canvas.width=30;canvas.height=18;
  const c=canvas.getContext('2d',{willReadFrequently:true});c.scale(1/3,1/3);c.strokeStyle='#fff';c.lineWidth=4;c.lineCap='square';c.lineJoin='miter';
  const xml=new DOMParser().parseFromString(`<svg>${paths[kind]||paths.charm}</svg>`,'image/svg+xml');
  for(const el of xml.documentElement.children){const n=a=>Number(el.getAttribute(a)||0);c.beginPath();if(el.tagName==='path'){c.stroke(new Path2D(el.getAttribute('d')));continue;}if(el.tagName==='rect')c.rect(n('x'),n('y'),n('width'),n('height'));if(el.tagName==='circle')c.arc(n('cx'),n('cy'),n('r'),0,Math.PI*2);if(el.tagName==='ellipse')c.ellipse(n('cx'),n('cy'),n('rx'),n('ry'),0,0,Math.PI*2);c.stroke();}
  const data=c.getImageData(0,0,30,18).data;let pixels='';
  for(let y=0;y<18;y++)for(let x=0;x<30;x++)if(data[(y*30+x)*4+3]>75)pixels+=`M${x} ${y}h1v1h-1z`;
  const svg=`<svg viewBox="0 0 30 18" fill="${color}" shape-rendering="crispEdges" aria-hidden="true"><path d="${pixels}"/></svg>`;iconCache.set(key,svg);return svg;
}
function surface(w,h){const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;return canvas;}
const SPRITES={
  ...Object.fromEntries(Object.entries(CHARACTER_ART).map(([k,d])=>[k,d.rows])),
  survivor:[
    '......oooo......','.....ohhhho.....','....ohHHHHho....','....ohHHHHho....',
    '....ohsssso.....','....ohsEso......','.....osssso.....','.....obbbbo.....',
    '....oCCCCCCo....','...oCcCCCCcCo...','..osCcCCCCcCso..','..osCcCCCCcCso..',
    '...oCcCCCCcCo...','....oCCCCCCo....','....oCbbbbCo....','....oCddddCo....',
    '....oCCooCCo....','.....odoodo.....','.....odoodo.....','....obb..bbo....'
  ],
  walker:[
    '.....oooooo.....','....ohhhhHHo....','....ohhHHHHo....','....ohsEssEo....',
    '....osssssso....','.....osRsso.....','.....ooooo......','....oCCCCCCo....',
    '...osCCCCCCso...','..ossCcCCcCsso..','..os.CcCCcC.so..','.....oCCCCo.....',
    '....oCCddCCo....','....oCddddCo....','.....odo.do.....','.....odo.do.....','....obb..bbo....'
  ],
  runner:[
    '......oooo......','.....oCCCCo.....','....oCcCCcCo....','....oCssssCo....',
    '....oCsEEsCo....','.....osssso.....','.....oCCCCo.....','....oCCccCCo....',
    '...oCCCccCCCo...','..osCCCccCCCso..','..os.CCCCCCo.so.','.....oCCCCo.....',
    '....oCCddCCo....','.....odoodo.....','....odd..ddo....','...obb....bbo...'
  ],
  brute:[
    '.....oooooo.....','....oHHHHHHo....','....oHssssHo....','....osEssEso....',
    '....osRRRsso....','.....osssso.....','...ooCCCCCCoo...', '..oCCCCCCCCCCo..',
    '.osCCCCCCCCCCso.','.osCCccCCccCCso.','..oCCccCCccCCo..','...oCCCCCCCCo...',
    '....oCbbbbCo....','....oCddddCo....','....oddooddo....','....oddooddo....','...obbb..bbbo...'
  ],
  boss:[
    '...Y...YY...Y...','...YY.YYYY.YY...','...oYYYYYYYYo...', '...oHHHHHHHHo...',
    '...oHssssssHo...','...osEsssEsso...','....osRRRsso....','....osRRRsso....',
    '...ooCCCCCCoo...','..oCCcCCCCcCCo..','.oCCCcCCCCcCCCo.','.oCCCcCCCCcCCCo.',
    '.osCCcCCCCcCCso.','.osCCCCCCCCCCso.','..oCCCCCCCCCCo..','...oCCbbbbCCo...',
    '...oCCddddCCo...','...oCCddddCCo...','....oddooddo....','....oddooddo....','...obbb..bbbo...'
  ]
};
const sprites=new Map();
function sprite(kind,color,frame=0,slow=false){
  const key=[kind,color,frame,slow].join(':');if(sprites.has(key))return sprites.get(key);
  const rows=SPRITES[kind]||SPRITES.walker,canvas=surface(16,24),c=canvas.getContext('2d');
  const palette={o:'#151522',h:'#403d58',H:'#696280',s:slow?'#91d6de':kind==='survivor'?'#e0bb9e':kind==='runner'?'#b9bacb':'#95aa7c',E:kind==='survivor'?'#241e35':'#ff956b',R:'#70424d',C:slow?'#4b97bd':color,c:kind==='survivor'?'#546771':'#514d68',b:'#201c31',d:'#494053',Y:'#e5be66'};
  if(CHARACTER_ART[kind])Object.assign(palette,characterPalette(kind,color));
  for(let y=0;y<rows.length;y++)for(let x=0;x<16;x++){const ch=rows[y][x];if(!palette[ch])continue;c.fillStyle=palette[ch];const foot=y>=rows.length-3&&frame?(x<8?1:-1):0;c.fillRect(x,y+foot,1,1);}
  sprites.set(key,canvas);return canvas;
}
let background,stage;
function makeGround(){
  const canvas=surface(480,310),c=canvas.getContext('2d');c.fillStyle='#252d30';c.fillRect(0,0,480,310);
  let seed=17;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let y=0;y<310;y+=16)for(let x=0;x<480;x+=16){c.fillStyle=rand()>.5?'#283235':'#263033';c.fillRect(x,y,16,16);}
  for(let n=0;n<1900;n++){const x=Math.floor(rand()*480),y=Math.floor(rand()*310);c.fillStyle=['#33403b','#354339','#3c4a3f','#20282e'][Math.floor(rand()*4)];c.fillRect(x,y,1+Math.floor(rand()*2),1);if(n%5===0)c.fillRect(x,y-2,1,2);}
  // Worn flagstones form a crossroads, with no artificial grid over the field.
  for(let y=0;y<310;y+=15)for(let x=0;x<480;x+=19){if(Math.abs(x-240)>34&&Math.abs(y-155)>23)continue;const xx=x+(y%30?4:0);c.fillStyle='#202730';c.fillRect(xx,y,18,14);c.fillStyle=rand()>.5?'#44464d':'#3c4148';c.fillRect(xx+1,y+1,16,11);c.fillStyle='#56545a';c.fillRect(xx+2,y+1,13,1);c.fillStyle='#303540';c.fillRect(xx+3,y+11,12,1);if(rand()>.5){c.fillStyle='#30353d';c.fillRect(xx+8,y+5,1,4);c.fillRect(xx+9,y+8,3,1);}}
  function grave(x,y){c.fillStyle='#151f27';c.fillRect(x-3,y+9,21,5);c.fillStyle='#222531';c.fillRect(x-1,y+1,17,14);c.fillStyle='#696674';c.fillRect(x,y-8,14,21);c.fillRect(x+2,y-10,10,2);c.fillStyle='#8b8190';c.fillRect(x+2,y-8,10,2);c.fillStyle='#444553';c.fillRect(x+6,y-4,2,9);c.fillRect(x+3,y-1,8,2);c.fillStyle='#344b3c';c.fillRect(x-2,y+11,7,2);c.fillRect(x+12,y+8,4,3);}
  for(const [x,y]of [[55,55],[90,75],[135,43],[370,55],[411,83],[338,86],[60,245],[99,266],[143,226],[350,253],[401,265],[437,233]])grave(x,y);
  function tree(x,y){c.fillStyle='#19222c';c.fillRect(x-15,y+13,34,6);c.fillStyle='#3f3745';c.fillRect(x-3,y-10,6,27);c.fillStyle='#686054';c.fillRect(x-1,y-6,2,19);for(const [dx,dy,w,h]of [[-16,-23,32,11],[-20,-15,40,12],[-13,-31,26,11],[-8,-37,16,8]]){c.fillStyle='#192c30';c.fillRect(x+dx,y+dy,w,h);c.fillStyle='#32453d';c.fillRect(x+dx+2,y+dy+1,w-5,h-4);c.fillStyle='#425443';c.fillRect(x+dx+4,y+dy+1,w-10,2);}}
  for(const [x,y]of [[25,20],[167,23],[451,29],[306,22],[26,183],[460,176],[25,309],[195,301],[302,305],[459,304]])tree(x,y);
  for(const [x,y]of [[170,93],[317,215],[60,175],[420,140]]){c.fillStyle='#393545';c.fillRect(x,y,17,10);c.fillStyle='#695565';c.fillRect(x+1,y,15,2);c.fillStyle='#896a79';c.fillRect(x+7,y,2,9);c.fillStyle='#bc9870';c.fillRect(x+6,y+4,4,2);}
  // Small candle shrines mark the playable field's corners.
  for(const [x,y]of [[35,100],[445,100],[35,210],[445,210]]){c.fillStyle='#5d5768';c.fillRect(x-3,y,7,7);c.fillStyle='#ddd1a1';c.fillRect(x,y-5,2,6);c.fillStyle='#f2be67';c.fillRect(x,y-8,2,3);c.fillStyle='#e28c55';c.fillRect(x-1,y-7,4,1);}
  return canvas;
}
function pixelLine(c,x,y,tx,ty,color,width=1){c.fillStyle=color;const dx=tx-x,dy=ty-y,steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))));for(let i=0;i<=steps;i+=2)c.fillRect(Math.round(x+dx*i/steps),Math.round(y+dy*i/steps),width,width);}
function ring(c,x,y,r,color,progress=1){c.fillStyle=color;const count=Math.max(12,Math.ceil(r*3));for(let n=0;n<count*progress;n++){const a=n/count*Math.PI*2-Math.PI/2;c.fillRect(Math.round(x+Math.cos(a)*r),Math.round(y+Math.sin(a)*r),2,2);}}
function text(c,value,x,y,color='#faf0c9',size=7){value=translateText(value);c.font=`bold ${size}px monospace`;c.textAlign='center';c.fillStyle='#161323';c.fillText(value,Math.round(x)+1,Math.round(y)+1);c.fillStyle=color;c.fillText(value,Math.round(x),Math.round(y));}
export function drawField(canvas,state,{preview=false,now=0,quality='balanced',numbers=true,motion=true,strength=.65,density='sparse',ownId=null}={}){
  background??=makeGround();stage??=surface(480,310);const c=stage.getContext('2d');c.imageSmoothingEnabled=false;c.globalAlpha=1;c.drawImage(background,0,0);
  if(state){
    const map=MAPS[state.map||'cemetery'];
    if(state.map&&state.map!=='cemetery'){
      c.fillStyle=map.color;c.fillRect(0,0,480,310);c.fillStyle=state.map==='laboratory'?'#41505a':'#504b43';
      for(let y=8;y<310;y+=24)for(let x=8;x<480;x+=24){c.fillRect(x,y,22,1);c.fillRect(x,y,1,22);}
    }
    for(const w of map.walls){c.fillStyle='#181f25';c.fillRect(w.x/2-2,w.y/2,w.w/2+5,w.h/2+4);c.fillStyle='#827b75';c.fillRect(w.x/2,w.y/2,w.w/2,w.h/2);c.fillStyle='#aca294';c.fillRect(w.x/2,w.y/2,w.w/2,2);}
    for(const z of state.mapZones||[]){if(!z.warning&&!z.active)continue;c.save();c.globalAlpha=z.active?.45:.18;c.fillStyle='#9be373';c.beginPath();c.arc(z.x/2,z.y/2,z.radius/2,0,Math.PI*2);c.fill();c.restore();ring(c,z.x/2,z.y/2,z.radius/2,z.active?'#b8fc82':'#efd685');text(c,z.active?'酸池启动':'酸池预警',z.x/2,z.y/2,'#dbf4b1');}
    for(const e of state.events||[]){const x=e.x/2,y=e.y/2,color=e.kind==='curse'?'#c6b1ff':e.kind==='merchant'?'#a5e3d8':'#efcd85';ring(c,x,y,16,color);c.fillStyle='#222434';c.fillRect(x-9,y-9,18,18);c.fillStyle=color;c.fillRect(x-6,y-6,12,3);c.fillRect(x-1,y-4,3,12);text(c,{curse:'招魂赌约',merchant:'流动医务室',cache:'冒险宝箱'}[e.kind],x,y-16,color);}
    for(const f of state.supplies||[]){const x=Math.round(f.x/2),y=Math.round(f.y/2);c.fillStyle='#253b31';c.fillRect(x-6,y-5,12,10);c.fillStyle='#b9df9d';c.fillRect(x-1,y-4,3,8);c.fillRect(x-4,y-1,9,3);ring(c,x,y,9,'#83b890');}
    for(const h of state.hazards||[]){const x=h.x/2,y=h.y/2,r=h.radius/2;c.save();c.strokeStyle=h.color;c.fillStyle=h.color;c.globalAlpha=.16;c.beginPath();if(h.shape==='line'){c.lineWidth=h.radius;c.moveTo(x,y);c.lineTo(h.tx/2,h.ty/2);c.stroke();}else if(h.shape==='ring'){c.lineWidth=20;c.arc(x,y,r,0,Math.PI*2);c.stroke();}else{c.arc(x,y,r,0,Math.PI*2);c.fill();}c.globalAlpha=.95;c.lineWidth=1;if(h.shape!=='line'){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke();ring(c,x,y,r+3,h.color,1-h.remaining/h.duration);}else{pixelLine(c,x,y,h.tx/2,h.ty/2,h.color,2);}c.restore();}
    for(const b of state.hostileShots||[]){c.fillStyle=b.color;c.fillRect(Math.round(b.x/2)-3,Math.round(b.y/2)-3,6,6);c.fillStyle='#ffe4fa';c.fillRect(Math.round(b.x/2)-1,Math.round(b.y/2)-1,2,2);}
    const moving=state.phase==='battle',frame=moving?Math.floor(now*7)%2:0;
    for(const gem of state.gems||[]){const x=Math.round(gem.x/2),y=Math.round(gem.y/2),s=gem.value>=100?4:gem.tier==='red'?3:gem.tier==='green'?2:1;c.fillStyle='#101d32';c.fillRect(x-s-1,y-s-1,s*2+3,s*2+3);c.fillStyle=gem.color;for(let row=-s;row<=s;row++)c.fillRect(x-s+Math.abs(row),y+row,2*(s-Math.abs(row))+1,1);c.fillStyle='#e9f4ff';c.fillRect(x,y-s,1,2);if(Math.floor(now*3+gem.x)%3===0){c.fillStyle='#bdd6ff';c.fillRect(x+s+3,y-3,1,1);}}
    for(const chest of state.chests||[]){const x=Math.round(chest.x/2),y=Math.round(chest.y/2);c.save();c.globalAlpha=.18;c.fillStyle='#ffd36c';c.fillRect(x-4,y-45,8,45);c.restore();ring(c,x,y+2,12,'#c69c4f');c.fillStyle='#342538';c.fillRect(x-9,y-5,18,13);c.fillStyle='#ad7945';c.fillRect(x-8,y-5,16,11);c.fillStyle='#eac477';c.fillRect(x-8,y-6,16,3);c.fillRect(x-7,y-5,2,11);c.fillRect(x+5,y-5,2,11);c.fillRect(x-1,y-3,3,5);text(c,'宝箱',x,y-13,'#f3db96',7);}
    const entities=[...(state.enemies||[]).map(e=>({e,type:'enemy'})),...(state.players||[]).map(e=>({e,type:'player'})),...(state.turrets||[]).map(e=>({e,type:'turret'}))].sort((a,b)=>a.e.y-b.e.y);
    for(const {e,type}of entities){const x=Math.round(e.x/2),y=Math.round(e.y/2);
      const foot=type==='player'?y+2:y+3;if(e.kind==='boss'){ring(c,x,y,22+(e.stage||1)*3,['#d9a1ef','#f3ae70','#f28f9a'][e.variant||0]);for(let n=0;n<(e.stage||1)+2;n++){const a=now*1.5+n*Math.PI*2/((e.stage||1)+2);c.fillStyle=['#d9a1ef','#f3ae70','#f28f9a'][e.variant||0];c.fillRect(Math.round(x+Math.cos(a)*32)-2,Math.round(y+Math.sin(a)*15)-2,4,4);}}
      if(e.elite){ring(c,x,y,15,'#efad79');text(c,e.name,x,y-36,'#efc086',6);}
      c.fillStyle='#11152199';c.fillRect(x-7,foot-1,14,3);c.fillStyle='#10121bd9';c.fillRect(x-4,foot,8,2);
      if(type==='turret'){c.fillStyle='#262535';c.fillRect(x-7,y-4,14,11);c.fillStyle=['','#c4c1c9','#72b0e7','#b193dc','#e58483'][e.tier];c.fillRect(x-5,y-5,10,8);pixelLine(c,x,y,x+Math.cos(e.angle)*14,y+Math.sin(e.angle)*14,'#b1adb9',3);continue;}
      if(type==='player'&&e.hp<=0){c.fillStyle='#523344';c.fillRect(x-7,y-2,14,7);c.fillStyle='#f09292';c.fillRect(x-1,y-9,3,9);c.fillRect(x-4,y-6,9,3);if(e.revive)ring(c,x,y,12,'#b5d9a4',e.revive/4);continue;}
      const kind=type==='player'?(CHARACTER_ART[e.character]?e.character:'scout'):e.kind,color=type==='player'?e.color:({walker:'#665976',runner:'#797fa6',brute:'#8b6158',boss:'#974d66'}[kind]||'#665976'),scale=kind==='boss'?2:kind==='brute'?1.5:1;
      const walking=moving&&(type!=='player'||e.controlMode!=='manual'||Math.hypot(e.moveInput?.x||0,e.moveInput?.y||0)>0);
      const rank=e.rank||monsterRank(kind,state.wave),external=type==='enemy'?monsterArt(kind,rank,now+Number(String(e.id).replace(/\D/g,''))*.13,{walking,attack:e.attack,slow:e.slow>0}):null;
      const monsterScale=kind==='boss'?2:kind==='brute'?1.5:1.25;
      const art=external?.image||sprite(kind,color,walking?frame:0,e.slow>0),drawScale=external?monsterScale:scale,w=(external?32:16)*drawScale,h=(external?32:24)*drawScale;
      // Anchor the actual bottom row, not the transparent 24px sprite canvas, to the ground.
      const feetRow=external?.foot||(SPRITES[kind]?.length||17),anchor=foot-(feetRow+(!external&&walking?frame:0))*drawScale;
      c.save();c.translate(x,anchor);if(Math.cos(e.angle)<0)c.scale(-1,1);if(e.hitFlash>0)c.filter='brightness(2.6)';if(type==='player'&&e.invulnerable>0&&motion)c.globalAlpha=Math.floor(now*12)%2?.6:1;c.drawImage(art,Math.round(-w/2),0,w,h);c.restore();
      if(type==='player'&&e.powerTimer>0){ring(c,x,y,13,'#f3cb85');c.fillStyle='#f3cb85';for(let n=0;n<3;n++){const a=(motion?now*4:0)+n*Math.PI*2/3;c.fillRect(Math.round(x+Math.cos(a)*15),Math.round(y+Math.sin(a)*8),2,2);}}
      if(type==='player'){const handY=y-3,aim=e.angle||0;pixelLine(c,x+Math.cos(aim)*4,handY,x+Math.cos(aim)*12,handY+Math.sin(aim)*7,'#c6b5b7',2);c.fillStyle='#191b2c';c.fillRect(x-11,y-22,22,3);c.fillStyle=e.color;c.fillRect(x-10,y-21,Math.round(20*Math.max(0,e.hp/e.maxHp)),1);text(c,e.name+(e.connected?'':' · 离线'),x,y+14,e.color,6);}
      else{const top=external?foot-(kind==='boss'?21:16)*drawScale:y-h+3;if(rank>1){const rankColor=['','#a2b886','#bd9fee','#eb9798','#efcd85'][rank];text(c,rank===4?'尸王':`${['','','变异','精英'][rank]} ${e.level||state.wave}`,x,top-6,rankColor,6);if(rank===4){c.fillStyle='#efd185';c.fillRect(x-5,top-17,10,3);c.fillRect(x-5,top-21,2,4);c.fillRect(x-1,top-23,2,6);c.fillRect(x+3,top-21,2,4);}}if(e.hp<e.maxHp||rank>1){const bar=kind==='boss'?34:18;c.fillStyle='#191723';c.fillRect(x-bar/2,top-3,bar,3);c.fillStyle=rank>=3?'#ed8790':'#b4bc80';c.fillRect(x-bar/2+1,top-2,Math.round((bar-2)*Math.max(0,e.hp/e.maxHp)),1);}if(e.burn>0){c.fillStyle='#ed9b56';for(let n=0;n<3;n++)c.fillRect(x-5+n*4,y-12-(n+frame)%3*3,2,4);c.fillStyle='#ffe0a0';c.fillRect(x-1,y-17,1,4);}}
    }
    for(const e of (state.effects||[]).filter(e=>(numbers||!['number','xp','heal','growth'].includes(e.type))&&(e.type!=='number'||density==='all'||e.crit||density==='sparse'&&Number(e.id)%3===0)).slice(-(quality==='low'?60:quality==='high'?240:140))){const x=e.x/2,y=e.y/2,tx=e.tx/2,ty=e.ty/2;c.globalAlpha=Math.min(1,e.life*5);
      if(e.type==='shot'||e.type==='link'){c.globalAlpha*=strength;drawCombatEffect(c,e,{quality,motion});}
      else if(e.type==='blast'){c.globalAlpha*=strength;drawBlast(c,e,{quality,motion});}
      else if(e.type==='enemyBlast'){c.save();c.globalAlpha=Math.max(0,e.life)*.8;c.strokeStyle=e.color;c.lineWidth=e.shape==='ring'?20:3;if(e.shape==='line'){c.beginPath();c.moveTo(x,y);c.lineTo(e.tx/2,e.ty/2);c.stroke();}else{c.beginPath();c.arc(x,y,e.radius/2,0,Math.PI*2);c.stroke();}c.restore();}
      else if(['factionBurst','weaponCombo','factionAwake','eventWin','recycle'].includes(e.type)){ring(c,x,y,Math.min(110,(e.radius||90)/2)*(1-Math.max(0,e.life)/2),e.color);text(c,e.value||'共鸣',x,y-22,e.color,9);}
      else if(e.type==='chestOpen'){c.fillStyle='#d5a759';c.fillRect(x-8,y-3,16,10);c.fillStyle='#ffe4a3';c.fillRect(x-8,y-10-(1.2-e.life)*9,16,3);ring(c,x,y,12+(1.2-e.life)*25,'#f3cb85');}
      else if(e.type==='fusion'){ring(c,x,y,10+(1.5-e.life)*30,'#f3cb85');ring(c,x,y,16+(1.5-e.life)*20,'#ef8eae');}
      else if(e.type==='bossCast')ring(c,x,y,20*(1-e.life),e.color);
      else if(e.type==='pulse')ring(c,x,y,e.radius/2*(1-e.life*.6),e.color);
      else if(e.type==='number')text(c,e.crit?e.value+'!':e.value,x,y-(.7-e.life)*16,e.color,e.crit?10:8);
      else if(e.type==='powerUp'){ring(c,x,y,10+(1-e.life)*35,e.color);}
      else if(e.type==='streak')text(c,e.value,x,y-(1.5-e.life)*12,e.color,10);
      else if(e.type==='xp')text(c,'+'+e.value,x,y-(.8-e.life)*16,e.color,7);
      else if(e.type==='gold'){const rise=(.9-e.life)*22;c.fillStyle='#ad711e';c.fillRect(x-5,y-rise-4,10,9);c.fillStyle='#ffd568';c.fillRect(x-4,y-rise-5,8,8);c.fillStyle='#fff0b8';c.fillRect(x-2,y-rise-4,2,5);if(numbers)text(c,'+'+e.value+' G',x+13,y-rise,e.color,8);}
      else if(e.type==='growth')text(c,e.value,x,y-(1-e.life)*12,e.color,7);
      else if(e.type==='heal'){ring(c,x,y,9+(1-e.life)*12,e.color);text(c,'+'+e.value,x,y-18,e.color,7);}
      else if(e.type==='hurt'){ring(c,x,y,11,e.color);if(numbers&&e.value)text(c,'-'+e.value,x,y-22,e.color,9);}
      else if(e.type==='dodge'){ring(c,x,y,12+(1-e.life)*20,e.color);text(c,'闪避',x,y-20-(.6-e.life)*15,e.color,9);}
      else if(e.type==='death'){const fallen=e.kind?monsterArt(e.kind,e.rank,.6-e.life,{fall:true}):null;if(fallen){const scale=e.kind==='boss'?2:e.kind==='brute'?1.5:1.25;c.save();c.translate(Math.round(x),Math.round(y)+3);if(Math.cos(e.angle||0)<0)c.scale(-1,1);c.drawImage(fallen.image,-16*scale,-fallen.foot*scale,32*scale,32*scale);c.restore();}c.fillStyle=e.color;for(let n=0;n<6;n++){const a=n*Math.PI/3,d=(.6-e.life)*20;c.fillRect(Math.round(x+Math.cos(a)*d),Math.round(y+Math.sin(a)*d),2,2);}}
    }
    c.globalAlpha=1;
    // Repaint only danger boundaries above friendly fire so large blasts cannot hide escape cues.
    for(const h of state.hazards||[]){c.save();c.globalAlpha=.95;if(h.shape==='line')pixelLine(c,h.x/2,h.y/2,h.tx/2,h.ty/2,h.color,2);else ring(c,h.x/2,h.y/2,h.radius/2,h.color);c.restore();}
    for(const b of state.hostileShots||[]){c.fillStyle='#351827';c.fillRect(b.x/2-4,b.y/2-4,8,8);c.fillStyle=b.color;c.fillRect(b.x/2-3,b.y/2-3,6,6);c.fillStyle='#fff6dc';c.fillRect(b.x/2-1,b.y/2-1,2,2);}for(const p of state.players||[])if(p.hp>0){ring(c,p.x/2,p.y/2+2,9,p.color);c.fillStyle=p.color;c.fillRect(p.x/2-1,p.y/2+1,2,2);}
    // Fog at the borders leaves combat and experience easy to read in the centre.
    for(const t of state.deathTraps||[])ring(c,t.x/2,t.y/2,t.radius/2,'#ff9d7c');
    for(const z of state.mapZones||[])if(z.warning||z.active)ring(c,z.x/2,z.y/2,z.radius/2,z.active?'#b8fc82':'#efd685');
    c.fillStyle='#13152266';c.fillRect(0,0,480,7);c.fillRect(0,303,480,7);c.fillRect(0,0,7,310);c.fillRect(473,0,7,310);
  }
  const output=canvas.getContext('2d');output.imageSmoothingEnabled=false;output.clearRect(0,0,canvas.width,canvas.height);output.drawImage(stage,0,0,canvas.width,canvas.height);
  const hurt=(state?.effects||[]).find(e=>e.type==='hurt'&&e.owner===ownId&&e.life>0);if(hurt&&!preview){output.save();output.strokeStyle=`rgba(237,121,105,${Math.min(.45,hurt.life)})`;output.lineWidth=12;output.strokeRect(6,6,canvas.width-12,canvas.height-12);output.restore();}
  const own=state?.players?.find(p=>p.id===ownId);if(own&&!preview&&state.phase==='battle'){const danger=(state.hazards||[]).filter(h=>dangerDistance(own,h)<(h.shape==='ring'?30:h.radius+25)).sort((a,b)=>a.remaining-b.remaining)[0];if(danger){output.save();output.fillStyle='#341a22ef';output.fillRect(350,90,260,36);output.fillStyle='#ffe8b8';output.font='bold 17px sans-serif';output.textAlign='center';output.fillText(translateText(`离开预警区 · ${Math.max(0,danger.remaining).toFixed(1)}s`),480,114,245);output.restore();}}
  const announcement=(state?.effects||[]).find(e=>['bossArrival','bossStage','bossDown','fusion','powerUp','streak','eliteArrival','factionAwake','eventWin'].includes(e.type));if(announcement&&!preview){output.fillStyle='#211426dd';output.fillRect(230,28,500,48);output.fillStyle=announcement.color;output.font='bold 20px "Microsoft YaHei",sans-serif';output.textAlign='center';output.fillText(translateText(announcement.value),480,59,470);output.textAlign='left';}
  // Chinese guidance stays sharp at display resolution instead of shrinking to pixels.
  if(state&&['prepare','upgrade'].includes(state.phase)&&!preview){output.fillStyle='#19172dcc';output.fillRect(270,214,420,108);output.fillStyle='#b4a18a';output.fillRect(270,214,420,2);output.fillRect(270,320,420,2);output.textAlign='center';output.fillStyle=state.phase==='upgrade'?'#b9d6fb':'#f1ddaf';output.font='bold 23px "Microsoft YaHei",sans-serif';output.fillText(translateText(state.phase==='upgrade'?'LEVEL UP · 升级了':state.wave?'本波已清除':'小队集结中'),480,259,400);output.fillStyle='#c0b9c9';output.font='12px "Microsoft YaHei",sans-serif';output.fillText(translateText(state.phase==='upgrade'?'选择武器或道具 · 选完自动继续':'一把小手枪、一个空背包，从这里活到天亮'),480,291,400);output.textAlign='left';}
}
