import {unlockedChallenges} from './shared/challenges.mjs';
import {RoomStore} from './room-store.mjs';
import {ownedCollection} from './shared/achievements.mjs';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { createRoom, addPlayer, action, tick, snapshot, stats, pauseForUpgrades, resumeWhenReady, clearMovement } from './shared/game.mjs';
import {ProfileStore} from './profile-store.mjs';
import {BACKUP_LIMIT} from './profile-backup.mjs';
import {profileBonus,publicProfile,runSummary,expeditionUnlocks} from './shared/progression.mjs';
const root=fileURLToPath(new URL('.',import.meta.url));
const roomStore=new RoomStore((process.env.PROFILE_FILE||path.join(root,'data','profiles.json'))+'.rooms');
const {rooms,sessions}=await roomStore.load();
const profiles=await new ProfileStore(process.env.PROFILE_FILE||path.join(root,'data','profiles.json')).load();
const files=new Map([['/','public/index.html'],['/app.mjs','public/app.mjs'],['/controls.mjs','public/controls.mjs'],['/presentation.mjs','public/presentation.mjs'],['/style.css','public/style.css'],['/art.mjs','public/art.mjs'],['/game.mjs','shared/game.mjs'],['/favicon.svg','public/favicon.svg']]);
files.set('/fusions.mjs','shared/fusions.mjs');
files.set('/progression.mjs','shared/progression.mjs');files.set('/campaign.mjs','shared/campaign.mjs');
files.set('/profile-backup-ui.mjs','public/profile-backup-ui.mjs');files.set('/career.mjs','public/career.mjs');
files.set('/forge-reel.mjs','public/forge-reel.mjs');
files.set('/expedition.mjs','shared/expedition.mjs');files.set('/expedition-ui.mjs','public/expedition-ui.mjs');
files.set('/character-art.mjs','shared/character-art.mjs');files.set('/i18n.mjs','public/i18n.mjs');files.set('/locale-en.mjs','public/locale-en.mjs');files.set('/camp-panels.mjs','public/camp-panels.mjs');files.set('/shell.mjs','public/shell.mjs');files.set('/shell.css','public/shell.css');files.set('/challenges.mjs','shared/challenges.mjs');files.set('/achievements.mjs','shared/achievements.mjs');files.set('/experience-ui.mjs','public/experience-ui.mjs');
files.set('/reward-insights.mjs','shared/reward-insights.mjs');files.set('/recycling.mjs','shared/recycling.mjs');files.set('/recycling-ui.mjs','public/recycling-ui.mjs');
files.set('/bag-links.mjs','shared/bag-links.mjs');
files.set('/bag-lab.mjs','public/bag-lab.mjs');
files.set('/survival.mjs','shared/survival.mjs');
files.set('/graphics.mjs','public/graphics.mjs');
files.set('/audio.mjs','public/audio.mjs');
files.set('/music.mjs','public/music.mjs');files.set('/automation-ui.mjs','public/automation-ui.mjs');files.set('/auto-rewards.mjs','shared/auto-rewards.mjs');files.set('/auto-movement.mjs','shared/auto-movement.mjs');
files.set('/combat-fx.mjs','public/combat-fx.mjs');
files.set('/monsters.mjs','public/monsters.mjs');
for(const name of ['zombie','skeleton','witch'])files.set(`/assets/monsters/${name}.png`,`public/assets/monsters/source/${name}.png`);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer(async(req,res)=>{
  let url;try{url=new URL(req.url,'http://localhost');}catch{res.writeHead(400).end();return;}
  if(url.pathname==='/api/legacy-backup'){
    const reply=(status,data)=>res.writeHead(status,{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff'}).end(JSON.stringify(data));
    try{
      if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host){reply(403,{error:'Origin denied'});return;}
      if(req.method==='GET'){const token=(req.headers.authorization||'').replace(/^Bearer /,'');if(!profiles.get(token)){reply(404,{error:'成长档案尚未连接'});return;}reply(200,profiles.backup(token));return;}
      if(req.method!=='POST'){reply(405,{error:'Method not allowed'});return;}
      let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>BACKUP_LIMIT){reply(413,{error:'存档文件过大'});return;}chunks.push(chunk);}
      const value=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if([...sessions.values()].some(s=>s.player.connected&&s.room.profileTokens?.[s.player.id]===value.token)){reply(409,{error:'请先离开出征再恢复存档'});return;}
      reply(200,await profiles.restore(value));
    }catch{reply(400,{error:'存档文件无效或已损坏'});}return;
  }
  if(url.pathname==='/health'){res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({ok:true,ephemeralStorage:process.env.EPHEMERAL_STORAGE==='1',rooms:rooms.size,activeRooms:[...rooms.values()].filter(r=>r.players.some(p=>p.connected)).length,activePlayers:[...rooms.values()].reduce((n,r)=>n+r.players.filter(p=>p.connected).length,0)}));return;}
  const file=files.get(url.pathname);if(!file){res.writeHead(404).end('Not found');return;}
  try{const data=await readFile(path.join(root,file));res.writeHead(200,{'content-type':types[path.extname(file)],'x-content-type-options':'nosniff','cache-control':'no-cache','content-security-policy':"default-src 'self'; connect-src 'self' ws: wss:; style-src 'self' 'unsafe-inline'; img-src 'self' data:; script-src 'self'; frame-ancestors 'none'; base-uri 'self'"}).end(data);}catch{res.writeHead(500).end('Unable to read file');}
});
const wss=new WebSocketServer({server,path:'/socket',maxPayload:8192});
const send=(ws,data)=>{if(ws?.readyState===WebSocket.OPEN)ws.send(JSON.stringify(data));};
function broadcast(room){for(const s of sessions.values())if(s.room===room)send(s.ws,{type:'state',state:snapshot(room,s.player.id)});}
function applyProfile(room,p,token){const profile=profiles.get(token);if(!profile)return;room.profileTokens??={};room.profileTokens[p.id]=token;p.character=profile.character;if(room.phase==='prepare'&&!room.wave)p.knownAtStart={weapons:[...profile.collection.weapons],items:[...profile.collection.items]};if(room.phase==='prepare'&&!room.wave){p.unlockedChallenges=unlockedChallenges(profile);p.unlockedMaps=expeditionUnlocks(profile).maps;p.startKit=profile.expedition.starter;p.relic=profile.expedition.relic;p.weapons=[p.startKit,null];p.weaponTiers=[1,1];p.rewardRerolls=p.relic==='compass'?4:3;p.shots[0].ammo=stats(p).weapons[0]?.clip||0;}p.baseMetaBonus=profileBonus(profile);p.metaBonus=room.challengeMode==='bare'?{}:{...p.baseMetaBonus};p.noHealing=room.challengeMode==='noheal';p.maxHp=stats(p).maxHp;p.hp=p.maxHp;}
function notifyProfile(token,extra={}){for(const ws of wss.clients)if(ws.profileToken===token)send(ws,{type:'profile',profileToken:token,profile:publicProfile(profiles.get(token)),...extra});}
async function settleRoom(room,outcome=room.phase,onlyId=null){if(!room.campaign)return;for(const p of room.players){if(p.retired)continue;if(onlyId&&p.id!==onlyId)continue;const token=room.profileTokens?.[p.id];if(!token)continue;const result=await profiles.settle(token,runSummary(room,p,outcome));if(!result)continue;p.settlement=result.result;notifyProfile(token,{settlement:result.result});}broadcast(room);}
function syncDiscovery(room){for(const p of room.players){const token=room.profileTokens?.[p.id],profile=profiles.get(token);if(!profile)continue;const owned=ownedCollection(p),key=JSON.stringify(owned);if(p.discoveryKey===key)continue;p.discoveryKey=key;if(['weapons','items'].every(group=>owned[group].every(k=>profile.collection[group].includes(k))))continue;profiles.discover(token,owned).then(()=>notifyProfile(token)).catch(()=>{p.discoveryKey=null;});}}
function settleEnded(room){if(!['victory','defeat'].includes(room.phase)||room.settledPhase===room.phase)return;room.settledPhase=room.phase;room.settlementTask=settleRoom(room).catch(error=>{room.settledPhase=null;for(const s of sessions.values())if(s.room===room)send(s.ws,{type:'error',message:'成长存档暂时未写入，请稍后再试'});console.error('Profile save failed:',error.message);});}
wss.on('connection',(ws,req)=>{
  const origin=req.headers.origin;if(origin){try{if(new URL(origin).host!==req.headers.host){ws.close(1008,'Origin denied');return;}}catch{ws.close(1008);return;}}
  let session=null,budget=0,windowStart=Date.now(),messageQueue=Promise.resolve();ws.alive=true;
  ws.on('pong',()=>{ws.alive=true;});
  ws.on('message',raw=>{messageQueue=messageQueue.then(async()=>{
    if(ws.readyState!==WebSocket.OPEN)return;
    if(Date.now()-windowStart>1000){budget=0;windowStart=Date.now();}if(++budget>35){send(ws,{type:'error',message:'操作太快，请稍等'});return;}
    try{
      const msg=JSON.parse(raw.toString());
      if(msg.type==='profile'){const opened=await profiles.open(msg.profileToken);if(session&&ws.profileToken!==opened.token)throw Error('请先离开房间再切换成长档案');ws.profileToken=opened.token;send(ws,{type:'profile',profileToken:opened.token,profile:opened.profile});return;}
      if(['metaUpgrade','selectCharacter','forgeTraining','selectStarter','selectRelic'].includes(msg.type)){
        if(!ws.profileToken)throw Error('成长档案尚未连接');const prepare=session?.room.phase==='prepare'&&session.room.wave===0;
        if(prepare&&session.room.players.some(p=>p.ready))throw Error('请先取消准备再训练或换角色');
        let forgeResult;
        if(msg.type==='forgeTraining'){const forged=await profiles.forge(ws.profileToken,msg.key,msg.requestId);forgeResult=forged.result;}
        else if(msg.type==='metaUpgrade')await profiles.upgrade(ws.profileToken,msg.key);
        else if(msg.type==='selectCharacter')await profiles.character(ws.profileToken,msg.key);else await profiles.expedition(ws.profileToken,msg.type==='selectStarter'?'starter':'relic',msg.key);
        if(prepare){applyProfile(session.room,session.player,ws.profileToken);broadcast(session.room);}notifyProfile(ws.profileToken,forgeResult?{forgeResult}:{});return;
      }
      if(!session){
        if(msg.type==='resume'){
          const previous=sessions.get(msg.token);if(!previous || !rooms.has(previous.room.code))throw Error('上次房间已过期，请重新创建');
          const oldWs=previous.ws;session=previous;session.ws=ws;session.player.connected=true;session.room.suspended=false;session.room.inspectionPaused=false;clearMovement(session.player);pauseForUpgrades(session.room);if(oldWs&&oldWs!==ws)oldWs.close(4001,'Session resumed');
          ws.profileToken=session.room.profileTokens?.[session.player.id]||ws.profileToken;
        }else if(msg.type==='create' || msg.type==='join'){
          if(sessions.size>=500)throw Error('服务器房间繁忙，请稍后再试');
          const name=String(msg.name||'幸存者').trim().slice(0,16)||'幸存者';let room;
          if(msg.type==='create'){let code;do{code=randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));room=createRoom(code,Date.now(),!!msg.solo,true,true);rooms.set(code,room);}
          else{const code=String(msg.code||'').toUpperCase();room=rooms.get(code);if(!room || room.solo)throw Error('找不到组队房间，请检查房间码');}
          if(!ws.profileToken){const opened=await profiles.open();ws.profileToken=opened.token;}
          if(room.players.some(p=>room.profileTokens?.[p.id]===ws.profileToken))throw Error('同一成长档案不能在同一房间控制两个角色');
          const token=randomBytes(24).toString('hex'),player=addPlayer(room,randomBytes(6).toString('hex'),name);applyProfile(room,player,ws.profileToken);session={token,room,player,ws};sessions.set(token,session);
        }else throw Error('请先加入房间');
        if(ws.readyState!==WebSocket.OPEN){session.player.connected=false;clearMovement(session.player);}
        send(ws,{type:'welcome',token:session.token,playerId:session.player.id});notifyProfile(ws.profileToken);broadcast(session.room);return;
      }
      if(msg.type==='suspend'){if(!session.room.solo||session.room.phase==='prepare'||['victory','defeat'].includes(session.room.phase))throw Error('只有进行中的单人出征可以保存离开');session.player.connected=false;session.room.suspended=true;clearMovement(session.player);session.room.lastActive=Date.now();await roomStore.save(rooms,sessions);send(ws,{type:'suspended',token:session.token});session=null;return;}
      if(msg.type==='leave'){const room=session.room;await room.settlementTask;if(room.wave>0&&!['victory','defeat'].includes(room.phase))await settleRoom(room,'retired',session.player.id);session.player.connected=false;session.player.retired=true;session.player.hp=0;clearMovement(session.player);if(room.phase==='prepare' && room.wave===0)room.players=room.players.filter(p=>p!==session.player);sessions.delete(session.token);session=null;resumeWhenReady(room);send(ws,{type:'left'});broadcast(room);return;}
      if(['restart','continueEndless'].includes(msg.type))await session.room.settlementTask;
      const oldProfiles=session.room.profileTokens;
      action(session.room,session.player,msg);
      if(msg.type==='restart'){session.room.profileTokens=oldProfiles;for(const s of sessions.values())if(s.room===session.room){s.player=s.room.players.find(p=>p.id===s.player.id);applyProfile(s.room,s.player,oldProfiles?.[s.player.id]);}}
      syncDiscovery(session.room);settleEnded(session.room);if(msg.type!=='move')broadcast(session.room);
    }catch(error){send(ws,{type:'error',message:error.message||'操作无效'});}
  });});
  ws.on('close',()=>{if(session && session.ws===ws){session.player.connected=false;session.player.ready=false;if(session.room.solo)session.room.inspectionPaused=false;clearMovement(session.player);session.room.lastActive=Date.now();resumeWhenReady(session.room);broadcast(session.room);}});
  ws.on('error',()=>{});
});
let previous=performance.now();let frame=0;
const timer=setInterval(()=>{const now=performance.now(),dt=Math.min(.15,(now-previous)/1000);previous=now;frame++;for(const room of rooms.values()){if(!room.players.some(p=>p.connected))continue;tick(room,dt);syncDiscovery(room);settleEnded(room);if(room.phase==='battle'||room.phase==='upgrade'&&room.players.some(p=>p.autoRewards?.enabled&&p.rewardPending)||frame%10===0)broadcast(room);}},100);
const checkpoints=setInterval(()=>roomStore.save(rooms,sessions).catch(e=>console.error('Checkpoint save failed:',e.message)),10000);
const cleanup=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue;}ws.alive=false;ws.ping();}for(const [code,room] of rooms){if(!room.players.some(p=>p.connected) && Date.now()-room.lastActive>(room.suspended?24*60*60*1000:30*60*1000)){rooms.delete(code);for(const [token,s] of sessions)if(s.room===room)sessions.delete(token);}}},30000);
const port=Number(process.argv.find(arg=>/^--port=\d+$/.test(arg))?.slice(7)||process.env.PORT||8787);if(!Number.isInteger(port)||port<1||port>65535)throw Error('Invalid game port');server.listen(port,'0.0.0.0',()=>console.log(`LASTPACK ready: http://localhost:${port}`));
async function shutdown(){clearInterval(timer);clearInterval(cleanup);clearInterval(checkpoints);await roomStore.save(rooms,sessions).catch(e=>console.error(e.message));for(const ws of wss.clients)ws.terminate();await profiles.queue.catch(()=>{});server.close(()=>process.exit(0));}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
