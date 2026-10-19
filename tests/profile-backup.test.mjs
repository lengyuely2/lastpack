import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {ProfileStore} from '../profile-store.mjs';
import {freshProfile,forgeTraining,settleProfile} from '../shared/progression.mjs';
import {packBackup,validateBackup} from '../profile-backup.mjs';
const token='a'.repeat(48);
test('portable legacy preserves currency, discoveries and anti-duplicate ledgers',()=>{
 const p=freshProfile();p.gold=200;forgeTraining(p,'damage','11111111-1111-1111-1111-111111111111',()=>.1);const summary={id:'TEST:1',outcome:'retired',time:600,kills:400,bosses:1,level:20,gold:77,damage:12000,healing:0,revives:0,fusions:0,weapons:[{kind:'pistol',tier:2}],items:[],collection:{weapons:['pistol','wand'],items:['armor']}};settleProfile(p,summary);
 const restored=validateBackup(JSON.parse(JSON.stringify(packBackup(token,p))));assert.deepEqual(restored.profile,p);assert.equal(settleProfile(restored.profile,summary).goldAwarded,0);assert.equal(settleProfile(restored.profile,summary).awarded,0);
 const before=restored.profile.gold;forgeTraining(restored.profile,'damage','11111111-1111-1111-1111-111111111111',()=>.9);assert.equal(restored.profile.gold,before);
});
test('damaged, unknown and excessive data is rejected before touching the store',()=>{
 const original=packBackup(token,freshProfile());original.profile.gold=123;assert.throws(()=>validateBackup(original));
 for(const edit of [p=>p.gold=-1,p=>p.training.health=100,p=>p.character='root',p=>p.collection.items.push('fake'),p=>p.records.kills=Infinity,p=>p.history=[{}],p=>p.expedition.starter='fake',p=>p.training.constructor=1]){const p=freshProfile();edit(p);assert.throws(()=>validateBackup(packBackup(token,p)));}
 assert.throws(()=>validateBackup({...packBackup(token,freshProfile()),token:'bad'}));
});
test('restoring into a reset store is durable; an older backup never rolls back an existing profile',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'lastpack-save-'));try{const file=path.join(dir,'profiles.json'),store=await new ProfileStore(file).load(),p=freshProfile();p.scrap=100;p.gold=90;const saved=packBackup(token,p);const first=await store.restore(saved);assert.equal(first.restored,true);await store.upgrade(token,'health');await store.restore(saved);assert.equal(store.get(token).training.health,1);assert.equal(store.get(token).scrap,75);const disk=await new ProfileStore(file).load();assert.equal(disk.get(token).training.health,1);assert.equal(disk.backup(token).profile.scrap,75);}finally{await rm(dir,{recursive:true,force:true});}
});
