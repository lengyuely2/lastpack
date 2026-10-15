// Original pixel models. Portraits and battlefield sprites share these exact pixels.
export const CHARACTER_ART={
 scout:{coat:'#52677e',shade:'#344657',hair:'#40332c',skin:'#dfb693',trousers:'#293644',rows:[
 '.....oooooo.....','....oCCCCCCo....','....oCCYYCCo....','...ooCCCCCCoo...','....osssssso....','....osEssEso....','.....osssso.....','.....oooooo.....',
 '....oCCCCCCo....','...oCCCCcCCCo...','..osCCAAcCCCso..','..osCCAAcCCCso..','...oCCCCcCCCo...','....oYYYYYYo....','....oCCbbCCo....','....oCddddCo....','....oddooddo....','....oddooddo....','....obb..bbo....']},
 gunner:{coat:'#a75348',shade:'#663c3c',hair:'#594236',skin:'#c99676',trousers:'#343a43',rows:[
 '.....oooooo.....','....ohhhhhho....','....oRRRRRRo....','....osssssso....','....osEssEso....','.....osssso.....','.....oooooo.....','...ooCCCCCCoo...',
 '..oCCCCCCCCCCo..','..osCYCCcYCsso..','..osCCYCYCCsso..','..osCCAAcCCsso..','...oCCCCcCCCo...','....oYYYYYYo....','....oCCddCCo....','....oddooddo....','....oddooddo....','...obbb..bbbo...']},
 courier:{coat:'#4f8779',shade:'#30564e',hair:'#5d3d2b',skin:'#e2b78c',trousers:'#314b52',rows:[
 '......oooo......','.....oOOOOo.....','....oOOOOOOo....','....osssssso....','....osEssEso....','.....osssso.....','..ooo.oooooo....','..oOooCCCCCCo...',
 '..oOOoCCcCCCCo..','..oOOoCCcAAACso.','..oOOoCCcAAACso.','..oOOoCCcCCCCo..','..ooooCCCCCCo...','.....oYYYYYYo...','.....oCddddCo...','.....oddooddo...','.....oddooddo...','....obbb..bbbo..']},
 medic:{coat:'#d9dfd3',shade:'#9dafad',hair:'#4f4541',skin:'#c99b80',trousers:'#36545a',rows:[
 '.....oooooo.....','....owwwwwwo....','....owwRRwwo....','....owRRRRwo....','....osssssso....','....osEssEso....','.....osssso.....','.....oooooo.....',
 '....oCCCCCCo....','...oCCRCcCCCo...','..osCCAAcCCCso..','..osCCAAcCCCso..','...oCCCccCCCooo.','....oCCddCCowwo.','....oCCddCCoRRo.','....oCCddCCowwo.','....oddooddoooo.','....oddooddo....','....obb..bbo....']}
};
export function characterPalette(key,teamColor='#dfc278'){
 const d=CHARACTER_ART[key]||CHARACTER_ART.scout;
 return {o:'#111a25',h:d.hair,H:'#88715a',s:d.skin,E:'#20202c',C:d.coat,c:d.shade,b:'#19232c',d:d.trousers,Y:'#e6c66f',R:'#cc5e58',O:'#dd974c',w:'#f0e9d5',A:teamColor};
}
export function characterPixels(key,teamColor){const d=CHARACTER_ART[key]||CHARACTER_ART.scout,palette=characterPalette(key,teamColor);return d.rows.flatMap((row,y)=>[...row].flatMap((ch,x)=>palette[ch]?[{x,y,color:palette[ch]}]:[]));}
export function characterPortrait(key){const pixels=characterPixels(key),paths=new Map();for(const {x,y,color} of pixels)paths.set(color,(paths.get(color)||'')+`M${x+8} ${y+5}h1v1h-1z`);return `<svg viewBox="0 0 32 32" shape-rendering="crispEdges" aria-hidden="true" data-character-model="${Object.hasOwn(CHARACTER_ART,key)?key:'scout'}"><ellipse cx="16" cy="25" rx="8" ry="2" fill="#0b131b"/>${[...paths].map(([color,d])=>`<path fill="${color}" d="${d}"/>`).join('')}</svg>`;}
