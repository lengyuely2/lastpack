const KEY='lastpack-legacy-backup';
export function createProfileBackup({$,getToken,setToken,getState,send,toast,storage=localStorage}){
 let timer,busy=false,again=false,available=false,failure=false;
 const button=document.createElement('button');button.id='backup-button';button.className='text-button';button.textContent='存档';$('help-button').before(button);
 const dialog=document.createElement('dialog');dialog.id='backup-dialog';dialog.className='weapon-catalog';dialog.innerHTML='<div class="modal-heading"><span class="eyebrow">存档</span><button id="close-backup" class="text-button" aria-label="关闭存档">✕</button></div><h2>把这份成长留下来。</h2><div class="save-actions"><button id="backup-export" class="secondary">导出存档</button><button id="backup-import" class="secondary">恢复存档</button><input id="backup-file" type="file" accept=".json,application/json" hidden></div><p id="backup-status" role="status"></p><small>备份包含传承与收藏，不包含进行中的战斗。</small>';document.body.append(dialog);
 function render(){const running=!!getState();$('backup-import').disabled=running||busy;$('backup-export').disabled=!getToken()||busy;$('backup-status').textContent=running?'出征结束后可恢复存档':failure?'备份暂未更新，可稍后重试':available?'本机备份已保存':'连接后自动备份';}
 function read(){try{const v=JSON.parse(storage.getItem(KEY)||'null');return v?.format==='lastpack-legacy'?v:null;}catch{return null;}}
 async function request(options){const response=await fetch('/api/legacy-backup',{cache:'no-store',...options});const data=await response.json();if(!response.ok)throw Error(data.error||'存档暂时无法保存');return data;}
 function keep(value){try{storage.setItem(KEY,JSON.stringify(value));available=true;failure=false;}catch{available=false;failure=true;toast('本机空间不足，请导出存档');}render();}
 async function capture(){if(busy){again=true;return;}const token=getToken();if(!token)return;busy=true;try{const value=await request({headers:{Authorization:'Bearer '+token}});if(token===getToken())keep(value);return value;}catch{failure=true;}finally{busy=false;render();if(again){again=false;schedule();}}}
 function schedule(){clearTimeout(timer);timer=setTimeout(capture,300);}
 // Recover before requesting a profile: the server must not replace a missing
 // token with an empty profile and then overwrite the last good local backup.
 async function recover(){const value=read();available=!!value;if(!value||value.token!==getToken())return;try{const response=await fetch('/api/legacy-backup',{headers:{Authorization:'Bearer '+value.token},cache:'no-store'});if(response.status!==404)return;await request({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});toast('已从本机恢复传承');}catch{throw Error('本机存档暂未恢复，请重试连接');}finally{render();}}
 button.onclick=()=>{render();dialog.showModal();};$('close-backup').onclick=()=>dialog.close();
 $('backup-export').onclick=async()=>{const value=await capture()||read();if(!value||value.token!==getToken()){toast('存档暂时无法保存');return;}const url=URL.createObjectURL(new Blob([JSON.stringify(value)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='LASTPACK-legacy-'+value.savedAt.slice(0,10)+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 $('backup-import').onclick=()=>{if(!getState())$('backup-file').click();};
 $('backup-file').onchange=async()=>{const file=$('backup-file').files[0];$('backup-file').value='';if(!file||getState()||busy)return;busy=true;render();try{if(file.size>1024*1024)throw Error('存档文件过大');const value=JSON.parse(await file.text()),result=await request({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});setToken(result.token);send({type:'profile',profileToken:result.token});keep(await request({headers:{Authorization:'Bearer '+result.token}}));toast(result.restored?'存档已恢复':'已读取最新传承');}catch(e){toast(e instanceof SyntaxError?'存档文件无效或已损坏':e.message);}finally{busy=false;render();schedule();}};
 return {recover,schedule,render};
}
