import {discover} from './shared/achievements.mjs';
import {readFile,mkdir,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {randomBytes,randomInt} from 'node:crypto';
import {packBackup,validateBackup} from './profile-backup.mjs';
import {freshProfile,migrateProfile,selectExpedition,forgeTraining,publicProfile,buyTraining,selectCharacter,settleProfile} from './shared/progression.mjs';
export class ProfileStore{
  constructor(file){this.file=file;this.profiles=new Map();this.queue=Promise.resolve();}
  async load(){try{const data=JSON.parse(await readFile(this.file,'utf8'));if(data.version!==1||!Array.isArray(data.profiles))throw Error('Unsupported profile store');this.profiles=new Map(data.profiles.map(([token,p])=>[token,migrateProfile(p)]));}catch(e){if(e.code!=='ENOENT')throw e;}return this;}
  get(token){return typeof token==='string'&&/^[a-f0-9]{48}$/.test(token)?this.profiles.get(token):undefined;}
  enqueue(fn){const task=this.queue.catch(()=>{}).then(fn);this.queue=task;return task;}
  async write(profiles){const data=JSON.stringify({version:1,profiles:[...profiles]});await mkdir(path.dirname(this.file),{recursive:true});const temp=this.file+'.tmp';await writeFile(temp,data,'utf8');await rename(temp,this.file);}
  open(token){return this.enqueue(async()=>{let p=this.get(token);if(!p){token=randomBytes(24).toString('hex');p=freshProfile();const next=new Map(this.profiles);next.set(token,p);await this.write(next);this.profiles=next;}return {token,profile:publicProfile(p)};});}
  save(){return this.enqueue(()=>this.write(this.profiles));}
  backup(token){const p=this.get(token);if(!p)throw Error('成长档案尚未连接');return packBackup(token,p);}
  restore(value){const restored=validateBackup(value);return this.enqueue(async()=>{const current=this.get(restored.token);if(current)return {token:restored.token,profile:publicProfile(current),restored:false};const next=new Map(this.profiles);next.set(restored.token,restored.profile);await this.write(next);this.profiles=next;return {token:restored.token,profile:publicProfile(restored.profile),restored:true};});}
  transaction(token,fn){return this.enqueue(async()=>{const current=this.get(token);if(!current)throw Error('成长档案无效');const draft=structuredClone(current),result=fn(draft),next=new Map(this.profiles);next.set(token,draft);await this.write(next);this.profiles=next;return {result,profile:publicProfile(draft)};});}
  async upgrade(token,key){return (await this.transaction(token,p=>buyTraining(p,key))).profile;}
  forge(token,key,requestId){return this.transaction(token,p=>forgeTraining(p,key,requestId,()=>randomInt(1000000)/1000000));}
  async character(token,key){return (await this.transaction(token,p=>selectCharacter(p,key))).profile;}
  expedition(token,kind,key){return this.transaction(token,p=>selectExpedition(p,kind,key));}
  discover(token,owned){return this.transaction(token,p=>discover(p,owned));}
  settle(token,summary){return this.transaction(token,p=>settleProfile(p,summary));}
}
