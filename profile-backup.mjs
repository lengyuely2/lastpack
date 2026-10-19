import {createHash} from 'node:crypto';
import {freshProfile,migrateProfile,CHARACTERS,TRAINING,STARTERS,RELICS} from './shared/progression.mjs';
import {WEAPONS,ITEMS} from './shared/game.mjs';
import {FUSIONS} from './shared/fusions.mjs';
import {ACHIEVEMENTS} from './shared/achievements.mjs';

export const BACKUP_LIMIT=1024*1024;
const fail=()=>{throw Error('存档文件无效或已损坏');};
function boundedTree(v,depth=0,budget={n:0}){
 if(++budget.n>60000||depth>15)fail();
 if(typeof v==='number'&&(!Number.isFinite(v)||v<0||v>1e12))fail();
 if(typeof v==='string'&&v.length>1000)fail();
 if(v&&typeof v==='object')for(const [k,value]of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(k)||k.length>180)fail();boundedTree(value,depth+1,budget);}
}
function count(v,max=1e9){if(!Number.isSafeInteger(v)||v<0||v>max)fail();return v;}
function list(v,allowed,max=100){if(!Array.isArray(v)||v.length>max||v.some(k=>typeof k!=='string'||!Object.hasOwn(allowed,k)))fail();return [...new Set(v)];}
// Local progression files are portable saves, not proof of a competitive score.
// Preserve settlement/forge ledgers so restoring never pays a completed run twice.
export function validateBackup(value){
 if(!value||value.format!=='lastpack-legacy'||value.version!==1||!/^[a-f0-9]{48}$/.test(value.token||''))fail();
 const raw=JSON.stringify(value.profile);if(!raw||Buffer.byteLength(raw)>BACKUP_LIMIT)fail();
 if(createHash('sha256').update(raw).digest('hex')!==value.checksum)fail();
 boundedTree(value.profile);const p=structuredClone(value.profile),base=freshProfile();
 if(!p||typeof p!=='object'||Array.isArray(p)||p.version!==1)fail();
 for(const key of ['scrap','gold','lifetimeScrap','lifetimeGold'])count(p[key]);
 if(!p.training||!p.records||!p.ledger||!p.forgeLedger||!p.collection||!p.achievements||!Array.isArray(p.history)||p.history.length>12)fail();
 for(const [key,d]of Object.entries(TRAINING))count(p.training[key],d.max);
 if(Object.keys(p.training).some(k=>!Object.hasOwn(TRAINING,k)))fail();
 p.unlocked=list(p.unlocked,CHARACTERS,4);if(!p.unlocked.includes('scout')||!p.unlocked.includes(p.character))fail();
 const weapons={...WEAPONS,...FUSIONS};p.collection.weapons=list(p.collection.weapons,weapons);p.collection.items=list(p.collection.items,ITEMS);
 if(Array.isArray(p.achievements)||Object.keys(p.achievements).some(k=>!Object.hasOwn(ACHIEVEMENTS,k)))fail();
 for(const [k,v]of Object.entries(p.records)){if(k==='factionAwakened'){list(v,{blood:1,blast:1,shadow:1,arcane:1},4);}else count(v);}
 for(const key of ['runs','wins','kills','bosses','bestTime','bestLevel'])count(p.records[key]);
 for(const entries of [p.ledger,p.forgeLedger]){if(Array.isArray(entries)||typeof entries!=='object'||Object.keys(entries).length>20000)fail();for(const v of Object.values(entries))if(!v||typeof v!=='object'||Array.isArray(v))fail();}
 const receipt=r=>{if(!r||typeof r.id!=='string'||!Object.hasOwn(TRAINING,r.key)||!['jackpot','up','down','stay'].includes(r.outcome))fail();count(r.from,4);count(r.to,5);count(r.cost);};
 for(const [id,r]of Object.entries(p.forgeLedger)){receipt(r);if(r.id!==id)fail();}if(p.lastForge){receipt(p.lastForge);if(JSON.stringify(p.forgeLedger[p.lastForge.id])!==JSON.stringify(p.lastForge))fail();}
 for(const h of p.history){
  if(!h||typeof h.id!=='string'||!['victory','defeat','retired'].includes(h.outcome)||!Array.isArray(h.weapons)||h.weapons.length>2)fail();
  for(const key of ['time','kills','level','damage','healing'])count(h[key]);if(h.level<1)fail();
  for(const w of h.weapons){if(!Object.hasOwn(weapons,w.kind)||w.tier<1||Object.hasOwn(FUSIONS,w.kind)&&w.tier!==4)fail();count(w.tier,4);}list(h.items,ITEMS,100);
  if(h.factionAwakened)list(h.factionAwakened,{blood:1,blast:1,shadow:1,arcane:1},4);
  if(h.newDiscoveries){list(h.newDiscoveries.weapons,weapons);list(h.newDiscoveries.items,ITEMS);}
  if(h.damageSources){if(Array.isArray(h.damageSources)||typeof h.damageSources!=='object')fail();for(const v of Object.values(h.damageSources))count(v);}
 }
 if(!Object.hasOwn(STARTERS,p.expedition?.starter)||!Object.hasOwn(RELICS,p.expedition?.relic))fail();
 const allowed=new Set([...Object.keys(base),'lastForge']);if(Object.keys(p).some(k=>!allowed.has(k)))fail();
 return {token:value.token,profile:migrateProfile(p)};
}
export function packBackup(token,profile){const copy=structuredClone(profile);return {format:'lastpack-legacy',version:1,savedAt:new Date().toISOString(),token,profile:copy,checksum:createHash('sha256').update(JSON.stringify(copy)).digest('hex')};}
