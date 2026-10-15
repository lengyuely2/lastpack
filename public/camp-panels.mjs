import {icon} from '/art.mjs';
// Reuse the existing controls and callbacks. Only title-screen presentation changes;
// during a run, the original dialogs retain their modal behavior and pause rules.
export function createCampPanels({$,getState,selectScene}){
 const landing=$('landing');let active=null,changing=false;
 const groups={
  1:{label:'薪火传承',items:[['career-button','career-dialog','薪火传承','survivor'],['experience-button','experience-dialog','荣誉簿','charm']]},
  2:{label:'图鉴',items:[['catalog-button','weapon-catalog','武器','pistol'],['items-button','item-catalog','配件','bag'],['fusion-button','fusion-dialog','融合','stormorb'],['monsters-button','monster-catalog','怪物','ghostaxe']]},
  3:{label:'设置',items:[['graphics-button','graphics-dialog','画面','scope'],['sound-button','sound-settings','声音','bell'],['automation-button','automation-settings','自动','loader'],['help-button','help','指南','echo']]}
 };
 const panel=document.createElement('section');panel.id='camp-panel';panel.className='camp-panel hidden';panel.setAttribute('aria-label','营地面板');panel.innerHTML='<div class="camp-panel-heading"><div><span class="camp-panel-mark" aria-hidden="true">✦</span><h2 id="camp-panel-title"></h2></div><button id="camp-panel-close" class="text-button" aria-label="返回出征">✕</button></div><nav id="camp-panel-tabs" aria-label="面板分类"></nav><div id="camp-panel-content"></div>';landing.append(panel);
 const origins=new Map();
 function close(){
  changing=true;const previous=active;active=null;if(previous){if(previous.open)previous.close();previous.classList.remove('camp-docked');const origin=origins.get(previous);origin.parent.insertBefore(previous,origin.next?.parentNode===origin.parent?origin.next:null);}
  panel.classList.add('hidden');landing.classList.remove('has-camp-panel');changing=false;
 }
 function show(group,item,dialog){
  if(active===dialog&&dialog.open)return;
  close();selectScene(group);active=dialog;dialog.classList.add('camp-docked');$('camp-panel-content').append(dialog);
  $('camp-panel-title').textContent=groups[group].label;
  $('camp-panel-tabs').innerHTML=groups[group].items.map(([button,id,label,glyph])=>`<button type="button" data-camp-target="${button}" aria-pressed="${id===dialog.id||dialog.id==='run-report'&&id==='career-dialog'}">${icon(glyph,'currentColor')}<span>${label}</span></button>`).join('');
  panel.classList.remove('hidden');landing.classList.add('has-camp-panel');dialog.show();$('camp-panel-content').scrollTop=0;
 }
 function register(group,item){
  const dialog=$(item[1]);if(!dialog)throw Error('Missing camp dialog: '+item[1]);origins.set(dialog,{parent:dialog.parentNode,next:dialog.nextSibling});const modal=dialog.showModal.bind(dialog);
  dialog.showModal=()=>{if(getState()){close();return modal();}return show(group,item,dialog);};
  dialog.addEventListener('close',()=>{if(!changing&&active===dialog&&!dialog.open){close();selectScene(0);}});
 }
 for(const [group,definition]of Object.entries(groups))for(const item of definition.items)register(Number(group),item);
 register(1,['career-button','run-report','远征纪事','echo']);
 $('camp-panel-tabs').onclick=e=>{const button=e.target.closest('[data-camp-target]');if(button)$(button.dataset.campTarget).click();};
 $('camp-panel-close').onclick=()=>{close();selectScene(0);};
 return {close,isDocked:dialog=>!!dialog&&dialog===active&&dialog.open,hasOpenPanel:()=>!!active?.open,openScene(scene){if(!groups[scene]){close();return;}$(groups[scene].items[0][0]).click();}};
}
