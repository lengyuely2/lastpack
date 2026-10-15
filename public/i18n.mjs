import {EN} from './locale-en.mjs';
const han=/[\u3400-\u9fff]/u;
const escapeRE=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const pattern=new RegExp(Object.keys(EN).sort((a,b)=>b.length-a.length).map(escapeRE).join('|'),'gu');
let language='zh';
try{const saved=globalThis.localStorage?.getItem('lastpack-language'),requested=globalThis.location?new URLSearchParams(location.search).get('lang'):null;language=['zh','en'].includes(saved)?saved:requested==='en'?'en':'zh';}catch{}
const englishCache=new Map();
export const getLanguage=()=>language;
export function translateText(value,locale=language){
 const text=String(value??'');if(locale!=='en'||!han.test(text))return text;
 if(englishCache.has(text))return englishCache.get(text);
 const trimmed=text.trim();if(Object.hasOwn(EN,trimmed))return text.replace(trimmed,EN[trimmed]);
 const translated=text.replace(pattern,(match,offset)=>{
   const left=offset>0&&/[\w\u3400-\u9fff]/u.test(text[offset-1])?' ':'';
   const end=offset+match.length,right=end<text.length&&/[\w\u3400-\u9fff]/u.test(text[end])?' ':'';
   return left+EN[match]+right;
 }).replace(/[，、]/g,', ').replace(/。/g,'. ').replace(/：/g,': ').replace(/；/g,'; ').replace(/！/g,'! ').replace(/？/g,'? ').replace(/（/g,' (').replace(/）/g,') ').replace(/“|”/g,'"').replace(/「|」/g,'"').replace(/\.{6}|……/g,'…').replace(/ {2,}/g,' ').replace(/ +([,.;:!?])/g,'$1').trimEnd();
 if(englishCache.size>=2048)englishCache.delete(englishCache.keys().next().value);englishCache.set(text,translated);return translated;
}
export function setLanguage(locale){
 if(!['zh','en'].includes(locale))throw Error('Unsupported language');language=locale;
 try{globalThis.localStorage?.setItem('lastpack-language',locale);}catch{}
 if(typeof document!=='undefined'){document.documentElement.lang=locale==='en'?'en':'zh-CN';document.documentElement.dataset.language=locale;document.dispatchEvent(new CustomEvent('lastpack-language',{detail:locale}));}
}
export function setupLanguage(){
 const textCache=new WeakMap(),attributeCache=new WeakMap();
 const skip=el=>el?.closest('script,style,textarea,[data-i18n-ignore]');
 function textNode(node){
   if(skip(node.parentElement))return;
   const previous=textCache.get(node),current=node.nodeValue;
   const source=previous&&current===previous.rendered?previous.source:current;
   if(!han.test(source)&&!previous)return;
   // An option without a value derives its value from its visible label. Freeze the
   // original value before translating so filters keep their canonical game keys.
   const option=node.parentElement;if(option?.tagName==='OPTION'&&!option.hasAttribute('value'))option.value=option.textContent;
   const rendered=translateText(source);textCache.set(node,{source,rendered});if(current!==rendered)node.nodeValue=rendered;
 }
 function attributes(el){
   if(skip(el))return;const saved=attributeCache.get(el)||{};
   for(const name of ['title','placeholder','aria-label']){const value=el.getAttribute(name);if(value===null)continue;const old=saved[name],source=old&&old.rendered===value?old.source:value;if(!han.test(source)&&!old)continue;const rendered=translateText(source);saved[name]={source,rendered};if(value!==rendered)el.setAttribute(name,rendered);}
   attributeCache.set(el,saved);
 }
 function walk(root){if(root.nodeType===3){textNode(root);return;}if(root.nodeType!==1)return;if(skip(root))return;attributes(root);const nodes=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);let node;while(node=nodes.nextNode()){if(node.nodeType===3)textNode(node);else attributes(node);}}
 const select=document.createElement('select');select.id='language-select';select.setAttribute('aria-label','Language / 语言');select.dataset.i18nIgnore='';select.innerHTML='<option value="zh">中文</option><option value="en">English</option>';select.value=language;
 const control=document.createElement('label');control.className='language-control';control.dataset.i18nIgnore='';control.textContent='文 / A ';control.append(select);
 // Remains reachable from inside native modal dialogs as well as the title screen.
 document.querySelector('.top-meta').append(control);
 const menuControl=control.cloneNode(true),menuSelect=menuControl.querySelector('select');menuSelect.id='menu-language-select';document.querySelector('#shell-menu .modal-heading').prepend(menuControl);
 const controls=[select,menuSelect];for(const item of controls)item.addEventListener('change',()=>setLanguage(item.value));
 document.addEventListener('lastpack-language',()=>{for(const item of controls)item.value=language;walk(document.documentElement);});
 new MutationObserver(records=>{if(language!=='en')return;const roots=new Set();for(const record of records){if(record.type==='childList')for(const node of record.addedNodes)roots.add(node);else roots.add(record.target);}for(const root of roots)if(root.isConnected)walk(root);}).observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['title','placeholder','aria-label']});
 setLanguage(language);
 fetch('/health').then(r=>r.ok?r.json():null).then(health=>{if(!health?.ephemeralStorage)return;const note=document.createElement('p');note.id='hosting-note';note.textContent='免费演示服：首次访问可能等待约一分钟，服务重启可能重置成长。';document.querySelector('#landing').append(note);walk(note);}).catch(()=>{});
 return {translate:translateText,setLanguage};
}
