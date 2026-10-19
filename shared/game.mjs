import {CHALLENGES} from './challenges.mjs';
import {rollRecyclingReward,recyclingMaterials} from './recycling.mjs';
import {DEFAULT_AUTO_REWARDS,validateAutoRewards,chooseAutoReward} from './auto-rewards.mjs';
import {AUTO_STRATEGIES,automaticDirection} from './auto-movement.mjs';
import {FUSIONS,FUSION_CHANCE,eligibleFusions,consumeFusion} from './fusions.mjs';
export {FUSIONS,FUSION_CHANCE,eligibleFusions} from './fusions.mjs';
import {MAPS,applyFactions,onFactionKill,onFactionDodge,tickFactions,weaponCombo,possibleCombos,moveOnMap,augmentEnemy,tickExpedition,chooseEvent} from './expedition.mjs';
import {difficulty,tickSurvival,dangerDistance} from './survival.mjs';
import {campaignPacing,campaignMilestone,spawnElite,warnElite} from './campaign.mjs';
import {goldDrop} from './progression.mjs';
import {bagLinks,starCells,STAR_RULES} from './bag-links.mjs';
export {bagLinks,starCells,STAR_RULES} from './bag-links.mjs';
export const WIDTH = 960, HEIGHT = 620, COLS = 6, ROWS = 5;
// Values are tuned for LASTPACK, not a copy of Vampire Survivors' numeric table.
export const EXPERIENCE = {
  walker: { tier: 'blue', name: '蓝色经验', value: 1, color: '#81b9ff' },
  caster: {tier:'green',name:'绿色经验',value:5,color:'#8bdd99'},
  runner: { tier: 'green', name: '绿色经验', value: 5, color: '#8bdd99' },
  brute: { tier: 'red', name: '红色经验', value: 20, color: '#ef8b7c' },
  boss: { tier: 'red', name: '首领经验', value: 100, color: '#ef8b7c' }
};
export function experienceNeeded(level) { const n = Math.max(0, Math.floor(level) - 1); return 5 + 5*n + Math.floor(n*n/2); }
export const WEAPONS = {
  stormorb:{name:'雷云水晶球',en:'STORM ORB',icon:'stormorb',damage:19,interval:.95,range:320,clip:1,reload:0,endless:true,arcane:true,chain:1,visual:'electric',category:'魔法法器',color:'#b6a3ff',desc:'释放连锁雷电，品质提高增加跳跃次数；无需装填'},
  meteorbook:{name:'陨石点菜单',en:'METEOR MENU',icon:'meteorbook',damage:33,interval:1.45,range:300,clip:1,reload:0,endless:true,arcane:true,splash:65,burn:3,visual:'fireball',category:'魔法法器',color:'#ffc286',desc:'发射爆炸火球，灼烧成群敌人；可同时搭配魔法与爆炸配件'},
  snowstaff:{name:'冰箱管理员法杖',en:'FROST STAFF',icon:'snowstaff',damage:13,interval:.85,range:290,clip:1,reload:0,endless:true,arcane:true,slow:true,slowRadius:65,visual:'ice',category:'魔法法器',color:'#a5eff4',desc:'发射寒霜弹，命中后减速周围敌人；品质提高扩大寒霜范围'},
  slingshot: { name:'弹弓', en:'SLINGSHOT', icon:'slingshot', damage:18, interval:.9, range:280, clip:1, reload:0, endless:true, bounce:1, category:'奇巧远程', color:'#c0d596', desc:'石子在敌人之间弹跳，品质越高弹跳次数越多' },
  shuriken: { name:'手里剑', en:'SHURIKEN', icon:'shuriken', damage:16, interval:.55, range:250, clip:1, reload:0, endless:true, crit:.25, critBounce:true, category:'奇巧远程', color:'#bfd0e0', desc:'高暴击投掷；暴击时弹跳到其他敌人' },
  crossbow: { name:'十字弩', en:'CROSSBOW', icon:'crossbow', damage:40, interval:1.1, range:365, clip:1, reload:1.1, pierce:true, crit:.25, category:'奇巧远程', color:'#d9c29b', desc:'高暴击弩箭，贯穿一条直线上的敌人' },
  taser: { name:'电击枪', en:'TASER', icon:'taser', damage:10, interval:.7, range:220, clip:10, reload:1.4, slow:true, slowRadius:50, category:'元素控制', color:'#acdbea', desc:'命中使周围僵尸减速，品质提升扩大控制范围' },
  wand: { name:'火焰魔杖', arcane:true, en:'WAND', icon:'wand', damage:5, interval:.8, range:310, clip:1, reload:0, endless:true, burn:10, category:'元素控制', color:'#efa685', desc:'发射火球，附带随品质成长的持续灼烧' },
  flamethrower: { name:'火焰喷射器', en:'FLAMETHROWER', icon:'flamethrower', damage:4, interval:.22, range:180, clip:35, reload:2, burn:7, cone:.5, category:'元素控制', color:'#f0ad76', desc:'扇形喷火，同时灼烧前方尸群' },
  lightning: { name:'闪电匕首', en:'LIGHTNING SHIV', icon:'lightning', damage:16, interval:.5, range:95, clip:1, reload:0, melee:true, chain:1, category:'奇异近战', color:'#a5dce9', desc:'近战刺击后释放连锁闪电，跳向远处敌人' },
  cactus: { name:'仙人掌棒', en:'CACTI CLUB', icon:'cactus', damage:30, interval:.95, range:105, clip:1, reload:0, melee:true, spikes:3, knockback:15, category:'奇异近战', color:'#b1d693', desc:'挥击命中后向附近敌人发射尖刺' },
  scissors: { name:'剪刀', en:'SCISSORS', icon:'scissors', damage:21, interval:.55, range:90, clip:1, reload:0, melee:true, lifesteal:.12, category:'生存成长', color:'#deb8c6', desc:'近战伤害的一部分转化为自身生命，品质提高吸血比例' },
  ghostaxe: { name:'幽灵斧', en:'GHOST AXE', icon:'ghostaxe', damage:32, interval:.95, range:120, clip:1, reload:0, melee:true, sweep:true, ghost:true, category:'生存成长', color:'#c9b8ea', desc:'击杀积累灵魂，永久增加本局所有武器伤害；最多 +60%' },
  wrench: { name:'扳手', en:'WRENCH', icon:'wrench', damage:20, interval:1.1, range:110, clip:1, reload:0, melee:true, sweep:true, knockback:20, turret:true, category:'工程爆破', color:'#b9c9d6', desc:'每波部署一座炮台：白弹丸、蓝燃烧、紫激光、红爆炸' },
  shredder: { name:'粉碎枪', en:'SHREDDER', icon:'shredder', damage:14, interval:.4, range:255, clip:18, reload:1.8, splash:55, category:'工程爆破', color:'#d5bb91', desc:'快速发射爆裂弹，命中后炸伤周围敌人' },
  pistol: { name: '小手枪', en: 'PISTOL', icon: 'pistol', damage: 15, interval: .65, range: 260, clip: 12, reload: 1.4, color: '#d7dce0', desc: '基础远程武器，稳定单发' },
  revolver: { name: '左轮手枪', en: 'REVOLVER', icon: 'revolver', damage: 38, interval: .9, range: 290, clip: 6, reload: 1.9, color: '#d8b895', desc: '六发高伤害，重击单个目标' },
  laser: { name: '激光枪', en: 'LASER GUN', icon: 'laser', damage: 32, interval: .85, range: 350, clip: 8, reload: 1.8, pierce: true, color: '#9ce3e0', desc: '光束贯穿直线上的目标' },
  rocket: { name: '火箭发射器', en: 'ROCKET LAUNCHER', icon: 'rocket', damage: 65, interval: 1.8, range: 300, clip: 3, reload: 2.5, splash: 90, color: '#efb086', desc: '大范围爆炸，适合密集尸群' },
  knife: { name: '匕首', en: 'KNIFE', icon: 'knife', damage: 22, interval: .32, range: 85, clip: 1, reload: 0, melee: true, color: '#c2d0dc', desc: '近战快速刺击，基础暴击率 20%' },
  spear: { name: '长矛', en: 'SPEAR', icon: 'spear', damage: 28, interval: .8, range: 150, clip: 1, reload: 0, melee: true, pierce: true, color: '#d8c397', desc: '中距离近战刺击，贯穿前方敌人' },
  rifle: { name: '突击步枪', en: 'ASSAULT RIFLE', icon: 'rifle', damage: 17, interval: .42, range: 285, clip: 14, reload: 1.8, color: '#a8d8aa', desc: '可靠的中距离持续火力' },
  shotgun: { name: '泵动霰弹枪', en: 'SHOTGUN', icon: 'shotgun', damage: 35, interval: 1.1, range: 155, clip: 5, reload: 2.2, splash: 48, color: '#f6b36b', desc: '近距离范围伤害，挡住尸群' },
  smg: { name: '冲锋枪', en: 'SMG', icon: 'smg', damage: 9, interval: .20, range: 210, clip: 24, reload: 1.6, color: '#e8df91', desc: '高射速，适合叠加燃烧效果' },
  sniper: { name: '狙击步枪', en: 'SNIPER', icon: 'sniper', damage: 68, interval: 1.65, range: 430, clip: 4, reload: 2.5, color: '#c5b6e8', desc: '超远距离，优先攻击强壮目标' },
  frost: { name: '冰冻发射器', en: 'FROST CASTER', icon: 'frost', damage: 12, interval: .75, range: 245, clip: 10, reload: 1.8, slow: true, color: '#8fdcde', desc: '减速僵尸，为全队争取距离' },
  lmg: { name: '加特林', en: 'MINIGUN', icon: 'lmg', damage: 13, interval: .16, range: 270, clip: 40, reload: 3.2, color: '#e29b94', desc: '高速弹幕，对减速目标伤害 +35%' }
};
export const TIERS = [null,{name:'淬火',color:'#d7dce0',damage:1,speed:1},{name:'精炼',color:'#81b9ff',damage:1.5,speed:1.08},{name:'辉耀',color:'#bf9af2',damage:2.15,speed:1.16},{name:'传说',color:'#f18480',damage:3,speed:1.25}];
const WEAPON_FLAVORS={
 stormorb:['阴天玻璃球：里面住着一朵坏脾气。','雷云出租屋：邻居开始投诉。','暴风加班室：电费由僵尸承担。','天劫物业办：整片墓园统一停电。'],
 meteorbook:['小火球点菜单：先来一份微辣。','熔岩外卖单：送到即爆。','天火流水席：一桌僵尸都熟了。','末日满汉全席：陨石不限量续杯。'],
 snowstaff:['冷藏室实习生：给尸潮降降温。','冰柜小主管：谁也别想解冻。','极地值班长：整条街停止加热。','永冬管理员：太阳今天请假。'],
 pistol:['没睡醒的小手枪：起床气全给僵尸。','喝了两杯的小手枪：现在谁都劝不住。','升职的小手枪：从今天起叫我经理。','退休返聘的小手枪：整片墓园都归我管。'],
 revolver:['六发脾气：每一发都想辞职。','六个祖宗：弹巢转一圈，怨气翻一倍。','西部人事部：六发子弹，六封辞退信。','阎王点名册：转到谁，谁就下班。'],
 rifle:['加班突击步枪：老板不倒，弹匣不休。','转正突击步枪：开始追讨加班费了。','部门主管步枪：今天尸潮全员留堂。','公司倒闭庆典：终于可以对老板开火了。'],
 shotgun:['社交距离劝退器：离我远点，谢谢。','聚会终结者：不熟的人请站远点。','群聊解散器：一句话让全场安静。','社恐毕业证：附近没有人，就不会社恐。'],
 smg:['碎嘴冲锋枪：一句话说二十四遍。','楼下装修队：从早八响到晚八。','亲戚催婚机：你连插嘴的机会都没有。','宇宙广播站：整个墓园都得听我唠。'],
 sniper:['隔壁楼的意见：专治远处的大块头。','望远镜的脾气：看得越清，越不顺眼。','跨区投诉热线：远处的胖子已经接通。','天边的差评：人在地平线，差评已送达。'],
 laser:['烤串激光枪：僵尸请排成一列。','自动排队器：插队的和队伍一起串。','墓园烧烤摊：一束光，一排熟客。','银河穿签师：这条街都是我的串。'],
 rocket:['快递拒收器：签收后原地爆炸。','加急退货单：连包装带收件人一起退。','差评售后部：客服回电，方圆一起震。','包邮到阴间：终点签收，无需好评。'],
 lmg:['暴躁订书机：把尸潮钉在原地。','教导主任版：谁动谁就再订一遍。','装订全家桶：附近僵尸统一胶装。','墓园出版社：所有尸体都是精装版。'],
 frost:['前任的眼神：一眼就让你冷静。','分手冷静期：僵尸走路也要想一想。','冷库值班长：进来的都先冻着。','冰河纪元通知：整片墓园停止供暖。'],
 knife:['水果刀的叛逆期：今天不削苹果。','厨房离家出走：看谁都像没削的皮。','水果摊恶霸：大块头也得切小块。','阴间米其林：今晚的刺身有点绿。'],
 spear:['超长牙签：僵尸串串，谢绝打包。','加长竹签：一根能串好几个熟客。','墓园晾衣杆：僵尸挂上去会很安静。','通天牙签：牙缝里卡的是整支尸潮。'],
 slingshot:['童年欠的弹弓：石子替你讨回来。','班主任没收版：没收的石子全还给你。','操场报仇名单：一颗石子串门讨债。','童年债务总局：弹到哪，账就结到哪。'],
 shuriken:['会飞的瓶盖：开瓶之前先开怪。','忍者下班证：瓶盖转得比老板快。','旋转开颅器：拧开僵尸，看看过期没。','阴间飞盘赛：冠军总能回头补一刀。'],
 crossbow:['丘比特失业版：箭到了，爱没到。','相亲失败版：这一箭叫互相伤害。','月老黑名单：线没牵成，尸潮牵成串。','爱情终结证：爱过的都在同一根箭上。'],
 taser:['电蚊拍毕业了：现在拍大号的。','高压驱蚊器：今晚蚊子长了两条腿。','欠费催缴员：尸潮交电费，速度打折。','雷公实习结束：这片墓园由我送电。'],
 wand:['火锅漏勺：蘸一下，烧三秒。','麻辣升级版：没蘸到的也开始冒汗。','锅底负责人：碰谁谁就持续沸腾。','地狱主厨证：僵尸自带料，我负责点火。'],
 flamethrower:['食堂大厨上岗：尸潮统一七分熟。','烧烤摊转正：一锅装不下就开两锅。','后厨火气旺：前面那群，都给我熟。','阴间满汉全席：前方尸潮统一上桌。'],
 lightning:['静电袜子的复仇：一刀电到隔壁。','毛衣暴怒版：脱一次，全场头发立起。','雷雨天请假条：连锁加班，谁也别走。','雷神忘带锤子：今天先借匕首用用。'],
 cactus:['拒绝拥抱棒：扎完还送几根刺。','刺猬社交证：认识你很扎心。','沙漠投诉办：投诉一次，群发几根刺。','仙人掌祖宗：亲戚很多，个个扎人。'],
 scissors:['理发师的加班：剪僵尸，补自己。','洗剪吹套餐：剪掉的生命算小费。','办卡续命版：客人越惨，店长越精神。','阴间首席造型师：剪完一圈，我还满血。'],
 ghostaxe:['阴间绩效考核：砍得越多，奖金越高。','鬼差转正斧：每份业绩都记在刃上。','地府部门经理：尸潮就是季度报表。','阎王年终奖：业绩越好，斧头越不讲理。'],
 wrench:['修不好就开炮：扳手的职业转型。','维修工带徒弟：徒弟喜欢喷火。','工程师不耐烦：维修流程改成激光。','拆迁总负责人：维修成功，街区没了。'],
 shredder:['碎纸机成精：今天碎点别的。','办公室离职礼：撕完合同再撕僵尸。','档案室暴走：所有尸潮就地销毁。','宇宙机密销毁器：碎到连阎王都拼不回去。']
};
export function weaponDefinition(kind){return WEAPONS[kind]||FUSIONS[kind];}
export function weaponFlavor(kind,tier=1){if(FUSIONS[kind])return FUSIONS[kind].flavor;return WEAPON_FLAVORS[kind]?.[Math.max(0,Math.min(3,Math.floor(Number(tier)||1)-1))]||'这玩意儿看着不太合法。';}
export function weaponStats(kind,tier=1) { const w=weaponDefinition(kind),t=TIERS[tier]; if(!w||!t||(FUSIONS[kind]&&tier!==4))return null; return {...w,fusion:!!FUSIONS[kind],kind,tier,tierName:FUSIONS[kind]?'神铸 · 首领融合':t.name,color:t.color,damage:w.damage*t.damage,interval:w.interval/t.speed,range:w.range+(tier-1)*12,crit:w.crit??(kind==='knife'?.20:.04),burn:(w.burn||0)*t.damage,bounce:w.bounce?tier:0,chain:w.chain?tier:0,spikes:w.spikes?2+tier:0,slowRadius:w.slowRadius?w.slowRadius+(tier-1)*12:0,lifesteal:w.lifesteal?w.lifesteal+(tier-1)*.04:0,ghostGoal:w.ghost?9-tier:0}; }
export function weaponCategory(kind) {if(FUSIONS[kind])return '首领融合';return WEAPONS[kind].category||(['knife','spear'].includes(kind)?'基础近战':['frost','laser'].includes(kind)?'元素控制':kind==='rocket'?'工程爆破':'常规枪械');}
export function weaponEffectText(w) {
  if(w.fusion)return w.desc;
  if(w.arcane){const effects=['自动施法 · 无需装填'];if(w.chain)effects.push(`连锁闪电 ${w.chain} 次`);if(w.splash)effects.push(`爆炸半径 ${Math.round(w.splash)} · 溅射 ${Math.round(55*(1+(w.blastPower||0)))}%`);if(w.slowRadius)effects.push(`范围减速 ${Math.round(w.slowRadius)}`);if(w.burn)effects.push(`灼烧 ${Math.round(w.burn)}/秒 · ${(3*(w.statusDuration||1)).toFixed(1)} 秒`);return effects.join(' · ');}
  if(w.kind==='slingshot')return `弹跳 ${w.bounce} 次 · 无需装填`;
  if(w.critBounce)return `暴击率 ${Math.round(w.crit*100)}% · 暴击弹跳 ${w.tier} 次`;
  if(w.chain)return `连锁闪电 ${w.chain} 次 · 跳跃距离 180`;
  if(w.spikes)return `命中发射 ${w.spikes} 根尖刺 · 击退`;
  if(w.lifesteal)return `伤害吸血 ${Math.round(w.lifesteal*100)}%`;
  if(w.ghost)return `每 ${w.ghostGoal} 次击杀永久 +2% 伤害 · 上限 60%`;
  if(w.turret)return `${['','弹丸','燃烧','激光','爆炸'][w.tier]}炮台 · 每武器槽 1 座`;
  if(w.slowRadius)return `范围减速 · 半径 ${w.slowRadius}`;
  if(w.burn)return `灼烧 ${Math.round(w.burn)}/秒，持续 3 秒${w.cone?' · 扇形攻击':''}`;
  return w.desc;
}
export const ITEMS = {
  bloodbag:{name:'吸血鬼的保温杯',icon:'bloodbag',w:1,h:2,color:'#ec9ba9',text:'每秒恢复 1.5 HP，最大生命 +10',effects:[{stat:'regen',value:1.5},{stat:'health',value:10}],weaponBound:false,build:'回血流'},
  bandage:{name:'章鱼牌创可贴',icon:'bandage',w:2,h:1,color:'#ecbcd2',text:'本人每击杀一只怪物恢复 2 HP',stat:'killHeal',value:2,weaponBound:false,build:'回血流'},
  soup:{name:'奶奶的复活浓汤',icon:'soup',w:2,h:2,color:'#d3df9f',text:'治疗量 +20%，每秒恢复 1 HP，移动速度 -3%',effects:[{stat:'healPower',value:.2},{stat:'regen',value:1},{stat:'move',value:-.03}],weaponBound:false,build:'回血流'},
  cherrybomb:{name:'脾气爆炸的樱桃',icon:'cherrybomb',w:2,h:2,color:'#f7a08b',text:'对应武器获得至少 45 半径的爆炸；溅射造成主伤害的 55%',stat:'blastRounds',value:45,build:'爆炸流'},
  powder:{name:'过期烟花调料包',icon:'powder',w:1,h:2,color:'#edce8c',text:'所有武器爆炸半径 +20%（最多 +80%）；需要武器本身或樱桃提供爆炸',stat:'blastArea',value:.2,weaponBound:false,build:'爆炸流'},
  blastheart:{name:'煤气罐的遗书',icon:'blastheart',w:2,h:2,color:'#efb082',text:'所有武器溅射伤害 +25%；需要爆炸武器，溅射增幅最多 +100%',stat:'blastPower',value:.25,weaponBound:false,build:'爆炸流'},
  ghostshoe:{name:'左脚踩右脚拖鞋',icon:'ghostshoe',w:2,h:1,color:'#a8ded6',text:'闪避率 +8%，移动速度 +6%；总闪避率最多 45%',effects:[{stat:'dodge',value:.08},{stat:'move',value:.06}],weaponBound:false,build:'闪避流'},
  umbrella:{name:'漏雨的概率伞',icon:'umbrella',w:2,h:2,color:'#b9bbef',text:'闪避率 +10%，所有武器伤害 -5%；成功闪避完全免伤',effects:[{stat:'dodge',value:.10},{stat:'globalDamage',value:-.05}],weaponBound:false,build:'闪避流'},
  rabbitfoot:{name:'兔子借给你的脚',icon:'rabbitfoot',w:1,h:2,color:'#ead8bd',text:'闪避率 +7%，成功闪避恢复 4 HP；闪避回血基础值最多 12',effects:[{stat:'dodge',value:.07},{stat:'dodgeHeal',value:4}],weaponBound:false,build:'闪避流'},
  spellbook:{name:'补考用魔法小抄',icon:'spellbook',w:2,h:1,color:'#cbb2f2',text:'绑定的魔法武器直接伤害和灼烧 +20%；普通武器不生效',stat:'magicDamage',value:.2,build:'魔法流'},
  rune:{name:'会发光的锅垫',icon:'rune',w:1,h:2,color:'#9fe1e4',text:'绑定的魔法武器爆炸与减速范围 +25%（最多 +75%），状态持续时间 +20%',effects:[{stat:'magicArea',value:.25},{stat:'magicDuration',value:.2}],build:'魔法流'},
  manabottle:{name:'蓝莓味魔力汽水',icon:'manabottle',w:1,h:1,color:'#a8baf3',text:'所有魔法武器施法速度 +12%（最多 +60%）；无需手动施法或消耗魔力',stat:'magicSpeed',value:.12,weaponBound:false,build:'魔法流'},
  coffee:{name:'失眠咖啡',icon:'coffee',w:1,h:1,color:'#d1ad84',text:'所有武器攻击速度 +10%',stat:'globalSpeed',value:.10,weaponBound:false},
  uglytooth:{name:'丑到发光的牙',icon:'tooth',w:1,h:1,color:'#ded49c',text:'对应武器命中使目标减速 2.5 秒',stat:'slow',value:1},
  alienworm:{name:'外星蚯蚓罐头',icon:'worm',w:1,h:2,color:'#c7accf',text:'最大生命 +20，移动速度 -5%',effects:[{stat:'health',value:20},{stat:'move',value:-.05}],weaponBound:false},
  weirdfood:{name:'昨晚还在动的沙拉',icon:'salad',w:2,h:1,color:'#b7cd86',text:'小队每拾取一颗经验，自己恢复 2 HP',stat:'pickupHeal',value:2,weaponBound:false},
  lemonade:{name:'牙齿融化柠檬水',icon:'lemonade',w:1,h:2,color:'#e4d186',text:'获得的治疗量 +25%（治疗、吸血、再生均生效）',stat:'healPower',value:.25,weaponBound:false},
  tomato:{name:'悲伤番茄',icon:'tomato',w:1,h:1,color:'#e8a197',text:'每秒恢复 2 HP，最大生命 -10',effects:[{stat:'regen',value:2},{stat:'health',value:-10}],weaponBound:false},
  snail:{name:'迷路蜗牛',icon:'snail',w:2,h:1,color:'#c6bc95',text:'240 范围内僵尸移动速度 -8%，最多 -35%，队友光环不叠加',stat:'auraSlow',value:.08,weaponBound:false},
  brokenmouth:{name:'破嘴假牙',icon:'jaw',w:2,h:1,color:'#d5b0b3',text:'对应武器伤害吸血 +6%，最多 60%',stat:'lifesteal',value:.06},
  boxingglove:{name:'发霉拳击手套',icon:'glove',w:2,h:2,color:'#c89b90',text:'对应武器击退距离 +15，首领仅受到 20% 效果',stat:'knockback',value:15},
  ducttape:{name:'万能胶带炖汤',icon:'tape',w:1,h:2,color:'#b5bdc7',text:'受到的伤害 -12%，最多减少 60%',stat:'damageReduction',value:.12,weaponBound:false},
  propellerhat:{name:'螺旋桨秃头帽',icon:'hat',w:2,h:1,color:'#a9c9de',text:'小队经验 +15%，最多 +100%，取队内最高加成',stat:'xpBonus',value:.15,weaponBound:false},
  magnet:{name:'装反了的冰箱贴',icon:'magnet',w:1,h:1,color:'#dea7b0',text:'经验吸附范围 +50',stat:'pickupRadius',value:50,weaponBound:false},
  bunny:{name:'危险兔子的午睡枕',icon:'bunny',w:2,h:2,color:'#dbc5dc',text:'所有武器伤害 +15%，装填时间 +10%',effects:[{stat:'globalDamage',value:.15},{stat:'globalReload',value:.10}],weaponBound:false},
  cake:{name:'会打嗝的蛋糕',icon:'cake',w:2,h:2,color:'#d6b4a1',text:'最大生命 +15，所有武器攻击速度 -5%',effects:[{stat:'health',value:15},{stat:'globalSpeed',value:-.05}],weaponBound:false},
  mushroom:{name:'头顶长蘑菇',icon:'mushroom',w:1,h:2,color:'#c1adce',text:'每秒恢复 1 HP，移动速度 -4%',effects:[{stat:'regen',value:1},{stat:'move',value:-.04}],weaponBound:false},
  hedgehog:{name:'愤怒刺猬的睡衣',icon:'hedgehog',w:2,h:2,color:'#c0b194',text:'受到近战攻击时，对攻击者反伤 8',stat:'thorns',value:8,weaponBound:false},
  tentacle:{name:'退休章鱼的触手',icon:'tentacle',w:1,h:3,color:'#caa4cd',text:'自己每击杀一只僵尸，恢复 1.5 HP',stat:'killHeal',value:1.5,weaponBound:false},
  cyclops:{name:'独眼虫的遗嘱',icon:'eye',w:1,h:2,color:'#c6a4d8',text:'所有武器伤害 +20%，射程 -35（最低 50）',effects:[{stat:'globalDamage',value:.20},{stat:'globalRange',value:-35}],weaponBound:false},
  snake:{name:'香肠偷渡蛇',icon:'snake',w:1,h:3,color:'#a9c391',text:'所有武器命中附加每秒 4 点灼烧，持续 3 秒',stat:'globalBurn',value:4,weaponBound:false},
  ritual:{name:'招魂鸭子的账本',icon:'ritual',w:2,h:1,color:'#dfcba0',text:'所有武器暴击率 +6%，最大生命 -10',effects:[{stat:'globalCrit',value:.06},{stat:'health',value:-10}],weaponBound:false},
  magazine: { name: '无底饼干罐', icon: 'magazine', w: 1, h: 2, color: '#a6c18f', text: '对应武器弹量 +6', stat: 'clip', value: 6 },
  scope: { name: '独眼虫的眼镜', icon: 'scope', w: 2, h: 1, color: '#98c8db', text: '对应武器射程 +55、伤害 +12%', stat: 'scope', value: .12 },
  trigger: { name: '过期浓缩咖啡', icon: 'trigger', w: 1, h: 1, color: '#efc079', text: '对应武器攻击速度 +15%', stat: 'speed', value: .15 },
  incendiary: { name: '会冒烟的香肠', icon: 'fire', w: 2, h: 2, color: '#ee906e', text: '命中后灼烧：每秒 8 伤害，持续 3 秒', stat: 'burn', value: 8 },
  piercing: { name: '牙医的秘密弹盒', icon: 'pierce', w: 2, h: 1, color: '#b8a5da', text: '对应武器伤害 +22%', stat: 'damage', value: .22 },
  loader: { name: '长了手的弹匣', icon: 'loader', w: 1, h: 2, color: '#d8c691', text: '对应武器装填速度 +30%', stat: 'reload', value: .30 },
  cooler: { name: '冰箱里的小蜗牛', icon: 'cooler', w: 2, h: 1, color: '#85c3c1', text: '与它相邻的武器配件效果 +30%（最多一次）', stat: 'cooler', value: .30 },
  medkit: { name: '奇怪的午餐盒', icon: 'medkit', w: 2, h: 2, color: '#cb9ba2', text: '每 5 秒治疗附近受伤最重的队友 14 HP', stat: 'heal', value: 14 },
  armor: { name: '外星宝宝的尿布', icon: 'armor', w: 2, h: 2, color: '#a8b6c4', text: '角色最大生命 +35', stat: 'health', value: 35 },
  boots: { name: '逃跑的拖鞋', icon: 'boots', w: 2, h: 1, color: '#cab592', text: '角色移动速度 +18%', stat: 'move', value: .18 },
  charm: { name: '迷路的橡皮鸭', icon: 'charm', w: 1, h: 1, color: '#e7cf8b', text: '对应武器暴击率 +12%（暴击造成双倍伤害）', stat: 'crit', value: .12 },
  battery: { name: '愤怒的充电土豆', icon: 'battery', w: 1, h: 3, color: '#9cb4df', text: '对应武器攻击速度 +25%、伤害 +10%', stat: 'overload', value: .25 }
};
export function isWeaponItem(kind){const d=ITEMS[kind];return d.weaponBound??!['health','move','heal','cooler'].includes(d.stat);}
const ITEM_RARITIES={bloodbag:1,bandage:2,soup:3,cherrybomb:2,powder:1,blastheart:3,ghostshoe:1,umbrella:2,rabbitfoot:3,spellbook:1,rune:2,manabottle:2,coffee:1,uglytooth:1,alienworm:1,tomato:1,mushroom:1,magazine:1,trigger:1,boots:1,weirdfood:2,lemonade:2,snail:2,brokenmouth:2,boxingglove:2,magnet:2,bunny:2,cake:2,ritual:2,scope:2,loader:2,armor:2,charm:2,ducttape:3,hedgehog:3,tentacle:3,cyclops:3,piercing:3,cooler:3,incendiary:3,propellerhat:4,medkit:4,snake:4,battery:4};
export function itemRarity(kind){return ITEM_RARITIES[kind]||1;}
export const BUILD_GUIDES={
 '回血流':'保温杯提供再生，章鱼创可贴提供击杀回血，复活浓汤放大治疗。保温杯与创可贴相邻：医务室夜宵，再 +15% 治疗。搭配剪刀或破嘴假牙吸血。',
 '爆炸流':'脾气爆炸的樱桃让普通武器获得爆炸，烟花调料包扩大范围，煤气罐遗书提高溅射伤害。樱桃与调料包相邻，再 +10% 爆炸半径；可搭配陨石点菜单或火箭发射器。',
 '闪避流':'拖鞋、概率伞和兔子脚提高闪避，兔子脚在成功闪避时回血。拖鞋与伞相邻再 +4% 闪避。总闪避上限 45%，仍需移动避开危险。',
 '魔法流':'魔法小抄与发光锅垫绑定同一把法器，相邻再 +12% 法术伤害和灼烧。魔力汽水提高施法速度；雷云连锁、陨石爆炸、寒霜控制可混搭。'
};
export function itemBuild(kind){return ITEMS[kind].build||(['weirdfood','lemonade','tomato','mushroom','brokenmouth','tentacle','medkit'].includes(kind)?'回血流':'通用');}
export function rewardTierWeights(level){
  const points=[[1,87,10,2,1],[4,67,25,6,2],[8,40,36,18,6],[12,20,32,33,15],[20,2,14,29,55]];
  const n=Math.max(1,Math.min(20,Math.floor(Number(level)||1))),b=points.find(p=>p[0]>=n),a=points[Math.max(0,points.indexOf(b)-1)],t=a===b?0:(n-a[0])/(b[0]-a[0]);
  const cumulative=start=>Math.round(a.slice(start).reduce((s,v)=>s+v,0)*(1-t)+b.slice(start).reduce((s,v)=>s+v,0)*t);
  const bluePlus=cumulative(2),purplePlus=cumulative(3),red=cumulative(4);
  return [100-bluePlus,bluePlus-purplePlus,purplePlus-red,red];
}
export function monsterRank(kind,wave=1){return kind==='boss'?4:kind==='brute'?3:kind==='runner'?Math.min(3,2+Math.floor(Math.max(0,wave-2)/3)):Math.min(3,1+Math.floor(Math.max(0,wave-1)/2));}
export function rollRewardTier(level,random,luck=0){const weights=rewardTierWeights(level),roll=Math.min(.999999,Math.max(0,random()+Math.max(0,Math.min(.1,luck))))*100;let sum=0;for(let n=0;n<4;n++){sum+=weights[n];if(roll<sum)return n+1;}return 4;}
const colors = ['#a7d9a5','#e8b57f','#9dbfe4','#d6a5d6'];
export function rng(seed = 1) { let n = seed >>> 0; const random=() => { n += 0x6D2B79F5; let t = Math.imul(n ^ n >>> 15, 1 | n); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };random.getState=()=>n>>>0;return random; }
export function createRoom(code, seed = Date.now(), solo = false, survival = false, campaign = false) {
  return { challengeMode:"standard",map:"cemetery",events:[],eventChoice:null,challenge:null,mapZones:[],deathTraps:[],endlessMods:[],endlessLevel:0,nextEventAt:240,nextEndlessChoiceAt:1500, code, solo, survival, campaign,nextEliteAt:180,eliteCount:0,settledPhase:null,settlementTask:null,profileTokens:{},endless:false,finalBossDefeated:false,runId:`${code}:${seed}`,supplies:[],streak:0,streakTimer:0,bestStreak:0, survivalTime:0,nextBossAt:600,bossCount:0,bossKills:0,chests:[],hazards:[],hostileShots:[],phase: 'prepare', wave: 0, players: [], enemies: [], gems: [], turrets: [], effects: [], time: 0, spawned: 0, total: 0, kills: 0, nextSpawn: 0, random: rng(seed), dodgeRandom:rng(seed^0x39c183ab), serial: 0, xpRemainder:0, log: ['补给站安全。整理背包，然后出发。'], lastActive: Date.now() };
}
function item(room, kind, x = null, y = null, target = 0) { return { id: `i${++room.serial}`, kind, x, y, rotated: false, target }; }
export function addPlayer(room, id, name) {
  if (room.players.length >= (room.solo ? 1 : 4)) throw Error('房间已满');
  if (room.phase !== 'prepare' || room.wave !== 0) throw Error('游戏已经开始，请加入新的房间');
  const p = { id, name, color: colors[room.players.length], connected: true, ready: false, weapons: ['pistol',null], weaponTiers: [1,1], weaponStash: [], items: [], level: 1, xp: 0, totalXp: 0, pendingUpgrades: 0,rewardQueue:[],rewardSource:'level', rewards: [], rewardPending: false, hp: 100, maxHp: 100, x: 480, y: 310, angle: 0, shots: [{cooldown:0,ammo:12,reloading:0},{cooldown:0,ammo:0,reloading:0}], damage: 0, kills: 0, healTimer: 0, revive: 0 };
  p.ghostDamage=0;p.ghostProgress=0;p.controlMode='auto';p.autoStrategy='balanced';p.guardAnchor=null;p.autoRewards={...DEFAULT_AUTO_REWARDS};p.autoRewardElapsed=0;p.autoRewardStatus='';p.lastAutoReward='';p.moveInput={x:0,y:0};p.moveLease=0;p.character='scout';p.metaBonus={};p.campaign=room.campaign;p.healing=0;p.revives=0;p.fusions=0;p.powerTimer=0;p.invulnerable=0;
  p.rewardRerolls=3;p.rewardBans=2;p.rewardSkips=2;p.bannedRewards=[];p.eventTokens=0;p.damageSources={};p.dodges=0;p.comboTriggers=0;p.factionProcs={};p.healCharge=0;p.relic='none';p.startKit='pistol';p.unlockedMaps=['cemetery'];p.runGold=0;room.goldRandom??=rng((Number(room.runId.split(':').at(-1))||1)^0x51ed270b);
  room.players.push(p); return p;
}
export function dimensions(i) { const d = ITEMS[i.kind]; return i.rotated ? {w:d.h,h:d.w} : {w:d.w,h:d.h}; }
export function fits(p, candidate) {
  const {w,h} = dimensions(candidate);
  if (!Number.isInteger(candidate.x) || !Number.isInteger(candidate.y) || candidate.x < 0 || candidate.y < 0 || candidate.x+w > COLS || candidate.y+h > ROWS) return false;
  return p.items.every(i => { if (i.id === candidate.id || i.x === null) return true; const d = dimensions(i); return candidate.x+w <= i.x || i.x+d.w <= candidate.x || candidate.y+h <= i.y || i.y+d.h <= candidate.y; });
}
function adjacent(a,b) { const x = dimensions(a), y = dimensions(b); return ((a.x+x.w===b.x || b.x+y.w===a.x) && a.y < b.y+y.h && b.y < a.y+x.h) || ((a.y+x.h===b.y || b.y+y.h===a.y) && a.x < b.x+y.w && b.x < a.x+x.w); }
export const COMBOS=[['battery','trigger','违章电咖啡','对应武器攻速再 +12%'],['incendiary','snake','香肠火锅','对应武器灼烧再 +4/秒'],['medkit','lemonade','酸到复活','治疗效果再 +15%'],['magnet','propellerhat','经验收税局','吸附范围再 +25，经验再 +5%'],['armor','ducttape','尿布防爆工事','最大生命再 +15，减伤再 +5%'],['scope','piercing','牙医瞄准镜','对应武器暴击再 +4%，射程再 +25'],['magazine','loader','饼干自动投喂机','对应武器装填时间再 -12%'],['boots','snail','蜗牛超车证','角色移速再 +5%，减速光环再 +4%'],['bloodbag','bandage','医务室夜宵','治疗量再 +15%'],['cherrybomb','powder','樱桃烟花宴','对应武器爆炸半径再 +10%'],['ghostshoe','umbrella','雨天蛇皮走位','闪避率再 +4%'],['spellbook','rune','补考满分咒','同一魔法武器伤害和灼烧再 +12%']];
export function bagCombos(p){const bag=p.items.filter(i=>i.x!==null),out=[];for(const [a,b,name,text] of COMBOS){const targets=new Set();for(const i of bag.filter(i=>i.kind===a))for(const j of bag.filter(j=>j.kind===b)){if(!adjacent(i,j))continue;const target=isWeaponItem(a)?i.target:null;if(isWeaponItem(b)&&i.target!==j.target)continue;if(targets.has(target)||target!==null&&!p.weapons[target])continue;if(a==='spellbook'&&!weaponDefinition(p.weapons[target])?.arcane)continue;targets.add(target);out.push({name,text,key:a,ids:[i.id,j.id],target});}}return out;}
let tickStats=null;
export function stats(p) {
  if(tickStats?.has(p))return tickStats.get(p);
  const s = { maxHp:100, move:58, heal:0, regen:0, healMultiplier:1, pickupHeal:0,pickupRadius:95,xpBonus:0,auraSlow:0,damageReduction:0,thorns:0,killHeal:0,dodge:0,dodgeHeal:0,blastArea:0,blastPower:0,magicSpeed:0,weapons:p.weapons.map((k,n) => {const w=weaponStats(k,p.weaponTiers[n]);if(w)w.damage*=1+(p.ghostDamage||0);return w;}) };
  const meta=p.metaBonus||{};s.maxHp+=meta.health||0;s.move*=1+(meta.move||0);s.pickupRadius+=meta.pickup||0;s.regen+=meta.regen||0;s.healMultiplier+=meta.healing||0;s.xpBonus=meta.xp||0;
  s.damageReduction=Math.min(.6,meta.armor||0);
  for(const w of s.weapons.filter(Boolean)){const scale=1+(meta.area||0);if(w.splash)w.splash*=scale;if(w.slowRadius)w.slowRadius*=scale;if(w.melee)w.range*=scale;w.statusDuration=1+(meta.duration||0);}
  for(const w of s.weapons.filter(Boolean)){w.damage*=1+(meta.damage||0);w.interval/=1+(meta.speed||0);if(p.campaign){w.damage*=1.1;if(p.powerTimer>0){w.damage*=1.7;w.interval/=1.25;}}}if(p.campaign)s.move+=8;
  const equipped = p.items.filter(i => i.x !== null);
  for (const i of equipped) {
    const d = ITEMS[i.kind], boosted = isWeaponItem(i.kind)&&equipped.some(j=>j.kind==='cooler' && adjacent(i,j)), w = s.weapons[i.target];
    if (!w && isWeaponItem(i.kind)) continue;
    for(const mod of d.effects||[{stat:d.stat,value:d.value}]){const v=mod.value*(boosted?1.3:1);switch (mod.stat) {
      case 'clip': w.clip += Math.round(v); break;
      case 'scope': w.damage *= 1+v; w.range += 55*(boosted?1.3:1); break;
      case 'damage': w.damage *= 1+v; break;
      case 'speed': w.interval /= 1+v; break;
      case 'overload': w.interval /= 1+v; w.damage *= 1+.1*(boosted?1.3:1); break;
      case 'reload': w.reload /= 1+v; break;
      case 'burn': w.burn += v; break;
      case 'crit': w.crit = Math.min(.8,w.crit+v); break;
      case 'health': s.maxHp += v; break;
      case 'move': s.move *= 1+v; break;
      case 'heal': s.heal += v; break;
      case 'globalSpeed': for(const gun of s.weapons.filter(Boolean))gun.interval/=1+v;break;
      case 'globalDamage': for(const gun of s.weapons.filter(Boolean))gun.damage*=1+v;break;
      case 'globalReload': for(const gun of s.weapons.filter(Boolean))gun.reload*=1+v;break;
      case 'globalRange': for(const gun of s.weapons.filter(Boolean))gun.range+=v;break;
      case 'globalBurn': for(const gun of s.weapons.filter(Boolean))gun.burn+=v;break;
      case 'globalCrit': for(const gun of s.weapons.filter(Boolean))gun.crit=Math.min(.8,gun.crit+v);break;
      case 'regen':s.regen+=v;break;
      case 'healPower':s.healMultiplier+=v;break;
      case 'pickupHeal':s.pickupHeal+=v;break;
      case 'pickupRadius':s.pickupRadius+=v;break;
      case 'xpBonus':s.xpBonus=Math.min(1,s.xpBonus+v);break;
      case 'auraSlow':s.auraSlow=Math.min(.35,s.auraSlow+v);break;
      case 'damageReduction':s.damageReduction=Math.min(.6,s.damageReduction+v);break;
      case 'thorns':s.thorns+=v;break;
      case 'killHeal':s.killHeal+=v;break;
      case 'lifesteal':w.lifesteal=Math.min(.6,(w.lifesteal||0)+v);break;
      case 'knockback':w.knockback=(w.knockback||0)+v;break;
      case 'slow':w.slow=true;break;
      case 'dodge':s.dodge+=v;break;
      case 'dodgeHeal':s.dodgeHeal+=v;break;
      case 'blastRounds':w.splash=Math.max(w.splash||0,v);break;
      case 'blastArea':s.blastArea+=v;break;
      case 'blastPower':s.blastPower+=v;break;
      case 'magicDamage':if(w.arcane){w.damage*=1+v;w.burn*=1+v;}break;
      case 'magicArea':if(w.arcane)w.magicArea=(w.magicArea||0)+v;break;
      case 'magicDuration':if(w.arcane)w.statusDuration+=v;break;
      case 'magicSpeed':s.magicSpeed+=v;break;
    }
    }
  }
  s.combos=bagCombos(p);for(const combo of s.combos){const w=s.weapons[combo.target];if(combo.key==='battery'&&w)w.interval/=1.12;if(combo.key==='incendiary'&&w)w.burn+=4;if(combo.key==='medkit')s.healMultiplier+=.15;if(combo.key==='magnet'){s.pickupRadius+=25;s.xpBonus=Math.min(1,s.xpBonus+.05);}if(combo.key==='armor'){s.maxHp+=15;s.damageReduction=Math.min(.6,s.damageReduction+.05);}}
  for(const combo of s.combos){const w=s.weapons[combo.target];if(combo.key==='scope'&&w){w.crit=Math.min(.8,w.crit+.04);w.range+=25;}if(combo.key==='magazine'&&w)w.reload*=.88;if(combo.key==='boots'){s.move*=1.05;s.auraSlow=Math.min(.35,s.auraSlow+.04);}if(combo.key==='bloodbag')s.healMultiplier+=.15;if(combo.key==='cherrybomb'&&w?.splash)w.splash*=1.1;if(combo.key==='ghostshoe')s.dodge+=.04;if(combo.key==='spellbook'&&w?.arcane){w.damage*=1.12;w.burn*=1.12;}}
  s.links=bagLinks(p,ITEMS,isWeaponItem);
  const scopeTargets=[new Set(),new Set()],foods=new Set(),growth=new Set();for(const link of s.links){for(const id of link.ids.slice(1)){if(link.kind==='scope')scopeTargets[link.target].add(id);if(link.kind==='medkit')foods.add(id);if(link.kind==='magnet')growth.add(id);}}
  for(let n=0;n<2;n++)if(s.weapons[n])s.weapons[n].crit=Math.min(.8,s.weapons[n].crit+Math.min(2,scopeTargets[n].size)*.03);
  s.healMultiplier+=Math.min(2,foods.size)*.05;s.xpBonus=Math.min(1,s.xpBonus+Math.min(2,growth.size)*.015);
  applyFactions(p,s,{isWeaponItem,weaponDefinition});
  s.dodge=Math.min(.45,s.dodge);s.dodgeHeal=Math.min(12,s.dodgeHeal);s.blastArea=Math.min(.8,s.blastArea);s.blastPower=Math.min(1,s.blastPower);s.magicSpeed=Math.min(.6,s.magicSpeed);
  for(const w of s.weapons.filter(Boolean)){if(w.splash){w.splash*=1+s.blastArea;w.blastPower=s.blastPower;}if(w.arcane){w.interval/=1+s.magicSpeed;if(w.splash)w.splash*=1+Math.min(.75,w.magicArea||0);if(w.slowRadius)w.slowRadius*=1+Math.min(.75,w.magicArea||0);}}
  s.maxHp=Math.max(30,s.maxHp);s.move=Math.max(20,s.move);for(const w of s.weapons.filter(Boolean))w.range=Math.max(50,w.range);
  tickStats?.set(p,s);
  return s;
}
// Affinity only biases items inside the already rolled rarity. A second matching
// weapon does not multiply the bonus, and off-build items retain positive weight.
export function itemRewardWeight(p,kind){
  const d=ITEMS[kind];if(!d)return 0;
  const weapons=stats(p).weapons.filter(Boolean);let affinity=0;
  for(const mod of d.effects||[{stat:d.stat,value:d.value}])for(const w of weapons){
    const finiteAmmo=!w.melee&&!w.endless&&w.clip>1;
    const specific=mod.stat.startsWith('magic')&&w.arcane
      ||['blastArea','blastPower'].includes(mod.stat)&&w.splash
      ||mod.stat==='blastRounds'&&!w.splash
      ||['clip','reload'].includes(mod.stat)&&finiteAmmo
      ||['lifesteal','regen','killHeal','healPower','health','heal'].includes(mod.stat)&&(w.melee||w.lifesteal)
      ||['burn','globalBurn'].includes(mod.stat)&&(w.burn||w.interval<=.35)
      ||['dodge','dodgeHeal','move'].includes(mod.stat)&&(w.melee||w.interval<=.3)
      ||['slow','auraSlow'].includes(mod.stat)&&(w.slow||w.slowRadius)
      ||['crit','globalCrit'].includes(mod.stat)&&(w.crit>=.2||w.critBounce)
      ||mod.stat==='xpBonus'&&w.ghost;
    const general=['damage','globalDamage','speed','globalSpeed','overload','cooler'].includes(mod.stat)
      ||mod.stat==='scope'&&!w.melee;
    // Penalties must not produce a second reason to prefer an item.
    if(mod.value>0)affinity=Math.max(affinity,specific?3:general?1:0);
  }
  return 1+affinity;
}
export function rollItemReward(p,tier,random){
  const pool=Object.keys(ITEMS).filter(k=>itemRarity(k)===tier&&!(p.bannedRewards||[]).includes("item:"+k)),weights=pool.map(k=>itemRewardWeight(p,k));
  const total=weights.reduce((a,b)=>a+b,0);let roll=Math.min(.999999999,Math.max(0,random()))*total;
  for(let n=0;n<pool.length;n++){roll-=weights[n];if(roll<0)return pool[n];}
  return pool.at(-1);
}
function offerUpgrade(room, p) {
  if (!p.pendingUpgrades || p.rewardPending) return;
  const equipped=p.weapons.map((kind,n)=>({kind,tier:p.weaponTiers[n]})).filter(w=>w.kind&&WEAPONS[w.kind]&&!(p.bannedRewards||[]).includes("weapon:"+w.kind)),mergeable=equipped.filter(w=>w.tier<4),owned=mergeable.length?mergeable:equipped;
  const matching=owned.length?owned[Math.floor(room.random()*owned.length)]:{kind:Object.keys(WEAPONS).find(k=>!(p.bannedRewards||[]).includes('weapon:'+k)),tier:1};
  const kinds=Object.keys(WEAPONS).filter(k=>!(p.bannedRewards||[]).includes("weapon:"+k)&&k!==matching.kind&&(!room.campaign||p.level>3||!WEAPONS[k].melee)),kind=kinds[Math.floor(room.random()*kinds.length)];
  const luck=p.metaBonus?.luck||0,matchingTier=Math.max(matching.tier,rollRewardTier(p.level,room.random,luck)),tier=rollRewardTier(p.level,room.random,luck),itemTier=rollRewardTier(p.level,room.random,luck);
  p.rewardSource=p.rewardQueue?.[0]?.source||'level';p.rewardBoss=p.rewardQueue?.[0]?.boss||null;
  p.rewards=[{type:'weapon',kind:matching.kind,tier:matchingTier},{type:'weapon',kind,tier},rollItemReward(p,itemTier,room.random)];
  if(p.rewardSource==='boss'){const eligible=eligibleFusions(p);if(eligible.length&&room.random()<FUSION_CHANCE){const chosen=eligible[Math.floor(room.random()*eligible.length)];p.rewards[1]={type:'fusion',kind:chosen.kind,tier:4};}}
  p.rewardPending = true;p.autoRewardElapsed=0;p.autoRewardStatus='';
}
export function grantBossReward(room,boss){for(const p of room.players){if(p.retired)continue;p.pendingUpgrades++;(p.rewardQueue??=[]).push({source:'boss',boss});p.ready=false;offerUpgrade(room,p);}}
export function grantExperience(room, value) {
  if (!Number.isSafeInteger(value) || value <= 0) throw Error('经验值无效');
  for (const p of room.players) {
    if(p.retired)continue;
    p.xp += value; p.totalXp += value;
    while (p.xp >= experienceNeeded(p.level)) {
      p.xp -= experienceNeeded(p.level); p.level++; p.pendingUpgrades++;(p.rewardQueue??=[]).push({source:'level'}); p.ready = false;
    }
    offerUpgrade(room, p);
  }
}
export function pauseForUpgrades(room) {
  if (room.phase !== 'battle' || !room.players.some(p=>p.connected && p.pendingUpgrades)) return;
  room.phase = 'upgrade'; for (const p of room.players) {p.ready = false;clearMovement(p);}
  room.log.unshift(room.players.some(p=>p.rewardPending&&p.rewardSource==='boss')?'宝箱已开启！选择首领奖励，符合配方可融合两把传说武器。':'经验已满！选择武器或配件，同类同品质武器可合成。'); room.log = room.log.slice(0,6);
}
export function resumeWhenReady(room) {
  if (room.phase !== 'upgrade') return;
  const online = room.players.filter(p=>p.connected);
  if (!online.length || !online.every(p=>!p.pendingUpgrades && !p.rewardPending)) return;
  room.phase = 'battle';
  for (const p of room.players) {
    const s = stats(p), extraHealth = Math.max(0, s.maxHp - p.maxHp);
    if (p.hp > 0&&!p.noHealing) p.hp = Math.min(s.maxHp, p.hp + extraHealth);
    p.maxHp = s.maxHp; p.ready = false;clearMovement(p);
    if(room.campaign&&p.hp>0){p.powerTimer=3;p.invulnerable=Math.max(p.invulnerable||0,1);effect(room,{type:'powerUp',x:p.x,y:p.y,life:1,value:'火力全开 · 3秒',color:'#efcd85'});}
    p.shots.forEach((shot,n)=>{ shot.ammo = Math.min(shot.ammo,s.weapons[n]?.clip||0); });
  }
  room.log.unshift('升级完成，继续抵抗尸潮。'); room.log = room.log.slice(0,6);
}
export function action(room, p, msg) {
  room.lastActive = Date.now();
  if(msg.type==='inspectPause'){if(typeof msg.paused!=='boolean'||!room.solo||!p.connected||p.retired)throw Error('只有单人出征可暂停查看');room.inspectionPaused=msg.paused;clearMovement(p);return;}
  if(msg.type==='eventChoice'){chooseEvent(room,p,msg,expeditionAPI);return;}
  if(msg.type==='selectChallenge'){if(room.phase!=='prepare'||room.wave||room.players.some(a=>a.ready))throw Error('出发前取消准备后选择挑战');if(room.players.find(a=>a.connected)?.id!==p.id)throw Error('由房主选择挑战');if(!CHALLENGES[msg.key]||!(p.unlockedChallenges||['standard']).includes(msg.key))throw Error('成功撤离一次后解锁挑战');room.challengeMode=msg.key;for(const a of room.players){a.baseMetaBonus??={...a.metaBonus};a.metaBonus=msg.key==='bare'?{}:{...a.baseMetaBonus};a.noHealing=msg.key==='noheal';a.maxHp=stats(a).maxHp;a.hp=a.maxHp;}return;}
  if(msg.type==='selectMap'){if(room.phase!=='prepare'||room.wave||room.players.some(a=>a.ready))throw Error('出发前取消准备后选择地图');if(room.players.find(a=>a.connected)?.id!==p.id)throw Error('由房主选择地图');if(!MAPS[msg.key]||!p.unlockedMaps.includes(msg.key))throw Error('地图尚未解锁');room.map=msg.key;return;}
  if(['rerollReward','banReward','skipUpgrade'].includes(msg.type)){
    if(room.phase!=='upgrade'||!p.rewardPending)throw Error('当前没有可调整的奖励');
    if(msg.type==='skipUpgrade'){if(p.rewardSkips<=0)throw Error('跳过次数已用完');p.rewardSkips--;p.rewardRerolls=Math.min(6,p.rewardRerolls+1);action(room,p,{type:'skipReward'});return;}
    if(msg.type==='rerollReward'){if(p.rewardRerolls<=0)throw Error('重抽次数已用完');p.rewardRerolls--;}
    else{const reward=p.rewards[msg.index];if(!Number.isInteger(msg.index)||!reward||reward.type==='fusion'||p.rewardBans<=0)throw Error('封禁无效');const key=typeof reward==='string'?'item:'+reward:'weapon:'+reward.kind;if(p.bannedRewards.includes(key))throw Error('已经封禁');p.bannedRewards.push(key);p.rewardBans--;}
    p.rewardPending=false;offerUpgrade(room,p);return;
  }
  if(msg.type==='autoRewards'){p.autoRewards=validateAutoRewards(msg.settings);p.autoRewardElapsed=0;p.autoRewardStatus='';return;}
  if(msg.type==='autoStrategy'){if(!AUTO_STRATEGIES.includes(msg.strategy))throw Error('自动走位策略无效');p.autoStrategy=msg.strategy;p.guardAnchor={x:p.x,y:p.y};return;}
  if(msg.type==='controlMode'){
    if(!['auto','manual'].includes(msg.mode))throw Error('移动模式无效');
    if(!['prepare','upgrade','battle'].includes(room.phase))throw Error('本局已结束');
    if(msg.mode==='auto'&&p.controlMode!=='auto')p.guardAnchor={x:p.x,y:p.y};p.controlMode=msg.mode;clearMovement(p);return;
  }
  if(msg.type==='move'){
    if(!Number.isFinite(msg.x)||!Number.isFinite(msg.y)||Math.abs(msg.x)>1||Math.abs(msg.y)>1)throw Error('移动方向无效');
    if(room.phase!=='battle'||p.controlMode!=='manual'||!p.connected||p.hp<=0){clearMovement(p);return;}
    const length=Math.max(1,Math.hypot(msg.x,msg.y));p.moveInput={x:msg.x/length,y:msg.y/length};p.moveLease=.35;return;
  }
  if(msg.type==='continueEndless'){
    if(room.phase!=='victory'||!room.campaign||room.endless)throw Error('请先完成墓园撤离');p.continueReady=!p.continueReady;
    if(room.players.filter(v=>v.connected).every(v=>v.continueReady)){room.phase='battle';room.endless=true;room.settledPhase=null;room.finalBossDefeated=false;room.log.unshift('无尽模式开启 · 装备与生命保留');for(const v of room.players)v.continueReady=false;if(!room.enemies.length)startWave(room,true);}return;
  }
  if (msg.type === 'restart') {
    if (!['victory','defeat'].includes(room.phase)) throw Error('本局尚未结束');
    const fresh = createRoom(room.code,Date.now(),room.solo,room.survival,room.campaign); const players=room.players.filter(v=>!v.retired).map(v=>({id:v.id,name:v.name,connected:v.connected,controlMode:v.controlMode,autoStrategy:v.autoStrategy,autoRewards:{...v.autoRewards},character:v.character,metaBonus:v.metaBonus}));
    Object.assign(room,fresh); for (const v of players) { const added=addPlayer(room,v.id,v.name); Object.assign(added,{connected:v.connected,controlMode:v.controlMode,autoStrategy:v.autoStrategy,autoRewards:{...v.autoRewards},character:v.character,metaBonus:{...v.metaBonus}}); } return;
  }
  const weaponAction=['equipWeapon','combineWeapons','unequipWeapon','discardWeapon','recycleWeapons'].includes(msg.type);
  if (!['prepare','upgrade'].includes(room.phase)&&!(room.phase==='battle'&&weaponAction)) throw Error('战斗中背包已锁定，请等升级或本波结束');
  if (msg.type === 'ready') {
    if (p.pendingUpgrades || p.rewardPending) throw Error('先选择所有升级奖励');
    p.ready = !p.ready;
    const online = room.players.filter(v=>v.connected);
    if (room.phase === 'upgrade') resumeWhenReady(room);
    else if (online.length && online.every(v=>v.ready)) startWave(room);
    return;
  }
  p.ready = false;
  if (msg.type === 'weapon') throw Error('武器只能通过升级奖励获得');
  if (msg.type === 'equipWeapon') {
    if (![0,1].includes(msg.slot)) throw Error('武器栏无效');
    const found=p.weaponStash.find(w=>w.id===msg.id);if(!found)throw Error('武器不存在');
    const old=p.weapons[msg.slot],tier=p.weaponTiers[msg.slot];
    if(msg.merge===true){if(old!==found.kind||tier!==found.tier||tier>=4)throw Error('需要同类同品质武器，传说不能合成');p.weaponTiers[msg.slot]++;}
    else {p.weapons[msg.slot]=found.kind;p.weaponTiers[msg.slot]=found.tier;if(old)p.weaponStash.push({id:`w${++room.serial}`,kind:old,tier});}
    p.weaponStash=p.weaponStash.filter(w=>w.id!==found.id);resetShot(p,msg.slot);return;
  }
  if (msg.type === 'combineWeapons') {
    if(!p.weapons[0] || p.weapons[0]!==p.weapons[1] || p.weaponTiers[0]!==p.weaponTiers[1] || p.weaponTiers[0]>=4)throw Error('需要两把同类同品质武器，传说已是最高品质');
    p.weaponTiers[0]++;p.weapons[1]=null;p.weaponTiers[1]=1;resetShot(p,0);resetShot(p,1);return;
  }
  if(msg.type==='unequipWeapon'){
    if(![0,1].includes(msg.slot)||!p.weapons[msg.slot])throw Error('武器栏无效');
    if(p.weapons.filter(Boolean).length<=1)throw Error('至少保留一把武器');
    if(p.weaponStash.length>=12)throw Error('备用武器已满，请先丢弃备用武器');
    p.weaponStash.push({id:`w${++room.serial}`,kind:p.weapons[msg.slot],tier:p.weaponTiers[msg.slot]});
    p.weapons[msg.slot]=null;p.weaponTiers[msg.slot]=1;resetShot(p,msg.slot);return;
  }
  if(msg.type==='recycleWeapons'){
    if(!p.connected||p.retired||room.phase==='battle'&&p.hp<=0)throw Error('倒地或离线时不能熔炼');
    const materials=recyclingMaterials(p.weaponStash,msg.ids,msg.output);
    if(msg.output==='item'&&p.items.filter(i=>i.x===null).length>=16)throw Error('储物区已满，请先腾出一个位置再熔炼');
    const reward=rollRecyclingReward(msg.output,room.random,{weapons:WEAPONS,items:ITEMS,itemRarity});
    if(reward.type==='item'){
      const target=isWeaponItem(reward.kind)&&['spellbook','rune'].includes(reward.kind)?Math.max(0,p.weapons.findIndex(k=>weaponDefinition(k)?.arcane)):Math.max(0,p.weapons.findIndex(Boolean));
      const earned=item(room,reward.kind,null,null,target);
      if(room.phase!=='battle'){placement:for(const rotated of [false,true])for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){const candidate={...earned,x,y,rotated};if(fits(p,candidate)){Object.assign(earned,candidate);break placement;}}}
      p.items.push(earned);p.obtainedItems=[...new Set([...(p.obtainedItems||[]),earned.kind])];
    }
    const consumed=new Set(materials.map(w=>w.id));p.weaponStash=p.weaponStash.filter(w=>!consumed.has(w.id));
    if(reward.type==='weapon')p.weaponStash.push({id:'w'+ ++room.serial,kind:reward.kind,tier:reward.tier});
    if(reward.type==='weapon')p.obtainedWeapons=[...new Set([...(p.obtainedWeapons||[]),reward.kind])];p.recycles=(p.recycles||0)+1;p.lastRecycle={id:++room.serial,...reward};
    const name=reward.type==='weapon'?WEAPONS[reward.kind].name:ITEMS[reward.kind].name;
    room.log.unshift(p.name+'熔炼 '+materials.length+' 把旧武器 → '+TIERS[reward.tier].name+' '+name);room.log=room.log.slice(0,6);
    effect(room,{type:'recycle',x:p.x,y:p.y,life:1.2,color:TIERS[reward.tier].color,value:TIERS[reward.tier].name+' · '+name});return;
  }
  if (msg.type === 'discardWeapon') {const found=p.weaponStash.find(w=>w.id===msg.id);if(!found)throw Error('武器不存在');p.weaponStash=p.weaponStash.filter(w=>w.id!==msg.id);return;}
  if(msg.type==='skipReward'){if(!p.pendingUpgrades||!p.rewardPending)throw Error('奖励无效');p.pendingUpgrades--;p.rewardQueue?.shift();p.rewardPending=false;p.rewards=[];offerUpgrade(room,p);resumeWhenReady(room);return;}
  if (msg.type === 'reward') {
    if (!p.pendingUpgrades || !p.rewardPending || !Number.isInteger(msg.index) || !p.rewards[msg.index]) throw Error('奖励无效');
    const reward=p.rewards[msg.index];
    if(reward.type==='fusion'){if(p.rewardSource!=='boss')throw Error('融合只能从首领宝箱获得');const result=consumeFusion(p,reward.kind);p.fusions++;for(const slot of result.slots)resetShot(p,slot);effect(room,{type:'fusion',x:p.x,y:p.y,life:1.5,value:weaponDefinition(reward.kind).name,color:'#f3cb85'});}
    else if(typeof reward==='string') {
      if(msg.target!==undefined&&![0,1].includes(msg.target))throw Error('武器栏无效');
      const earned=item(room,reward,null,null,msg.target??Math.max(0,['spellbook','rune'].includes(reward)?p.weapons.findIndex(k=>weaponDefinition(k)?.arcane):p.weapons.findIndex(Boolean)));
      if(room.phase==='upgrade'&&msg.stash!==true){
        placement: for(const rotated of [false,true])for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
          const candidate={...earned,x,y,rotated};if(fits(p,candidate)){Object.assign(earned,candidate);break placement;}
        }
      }
      if(earned.x===null&&p.items.filter(i=>i.x===null).length>=16)throw Error('储物区已满，请整理或丢弃物品');
      p.items.push(earned);p.obtainedItems=[...new Set([...(p.obtainedItems||[]),earned.kind])];
    }
    else {
      const merge=p.weapons.findIndex((k,n)=>k===reward.kind&&p.weaponTiers[n]===reward.tier&&reward.tier<4),empty=p.weapons.indexOf(null);
      if(msg.merge===true){if(merge<0)throw Error('没有可合成的同类同品质武器');p.weaponTiers[merge]++;resetShot(p,merge);}
      else if(empty>=0){p.weapons[empty]=reward.kind;p.weaponTiers[empty]=reward.tier;resetShot(p,empty);}
      else {if(p.weaponStash.length>=12)throw Error('备用武器已满，请装备或丢弃');p.weaponStash.push({id:`w${++room.serial}`,kind:reward.kind,tier:reward.tier});}
    }
    p.obtainedWeapons=[...new Set([...(p.obtainedWeapons||[]),...(typeof reward==='object'?[reward.kind]:[])])];p.pendingUpgrades--;p.rewardQueue?.shift(); p.rewardPending=false; p.rewards=[]; offerUpgrade(room,p); resumeWhenReady(room); return;
  }
  const i = p.items.find(v=>v.id===msg.id); if (!i) throw Error('物品不存在');
  if(msg.type==='autoPlace'){for(const rotated of [i.rotated,!i.rotated])for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){const candidate={...i,x,y,rotated};if(fits(p,candidate)){Object.assign(i,candidate);return;}}throw Error('没有连续空间，请先取出其他道具或调整摆放');}
  else if (msg.type === 'place') { const candidate={...i,x:msg.x,y:msg.y,rotated:!!msg.rotated}; if (!fits(p,candidate)) throw Error('这里放不下：检查边界和重叠'); Object.assign(i,candidate); }
  else if (msg.type === 'stash') { if (p.items.filter(v=>v.x===null).length>=16) throw Error('储物区已满'); i.x=i.y=null; }
  else if (msg.type === 'target') { if (![0,1].includes(msg.target)) throw Error('武器栏无效'); i.target=msg.target; }
  else if (msg.type === 'discard') p.items=p.items.filter(v=>v.id!==i.id);
  else if (msg.type === 'gift') { const target=room.players.find(v=>v.id===msg.playerId && v.id!==p.id && v.connected); if (!target) throw Error('队友不在线'); if (target.items.filter(v=>v.x===null).length>=16) throw Error('队友储物区已满'); p.items=p.items.filter(v=>v.id!==i.id); target.items.push({...i,x:null,y:null}); target.ready=false; room.log.unshift(`${p.name} 把${ITEMS[i.kind].name}交给了 ${target.name}`); room.log=room.log.slice(0,6); }
  else throw Error('未知操作');
}
export function processAutomaticRewards(room,dt){
  if(room.phase!=='upgrade')return;
  for(const p of room.players){
    if(!p.connected||p.retired||!p.rewardPending||!p.autoRewards?.enabled)continue;
    p.autoRewardElapsed=Math.min(p.autoRewards.delay,(p.autoRewardElapsed||0)+Math.max(0,dt));
    const choice=chooseAutoReward(p,{weaponStats,weaponCategory,ITEMS,itemRarity,fits,eligibleFusions});
    if(choice?.blocked&&!choice.skip){p.autoRewardStatus='库存已满或没有符合条件的奖励 · 请手动整理或选择';continue;}
    p.autoRewardStatus=`${Math.max(0,p.autoRewards.delay-p.autoRewardElapsed).toFixed(1)} 秒后自动${choice?.skip?'放弃本次奖励':'领取第 '+(choice.index+1)+' 件奖励'}`;
    if(p.autoRewardElapsed+1e-8<p.autoRewards.delay)continue;
    try{
      if(choice.skip){action(room,p,{type:'skipReward'});p.lastAutoReward='库存已满 · 按设置跳过奖励';continue;}
      const reward=p.rewards[choice.index],previousIds=new Set(p.weaponStash.map(w=>w.id));
      action(room,p,{type:'reward',index:choice.index,merge:choice.merge,target:choice.target});
      if(choice.replaceSlot!==null&&choice.replaceSlot!==undefined){const earned=p.weaponStash.find(w=>!previousIds.has(w.id));if(earned)action(room,p,{type:'equipWeapon',id:earned.id,slot:choice.replaceSlot});}
      p.lastAutoReward='自动领取：'+(typeof reward==='string'?ITEMS[reward].name:weaponDefinition(reward.kind).name)+(choice.merge?' · 同品质合成':choice.replaceSlot!==null&&choice.replaceSlot!==undefined?' · 已装备，原武器进入备用区':'');
    }catch(error){p.autoRewardStatus=error.message+' · 请手动处理';}
  }
}
export function clearMovement(p){p.moveInput={x:0,y:0};p.moveLease=0;}
function resetShot(p,n) {const w=stats(p).weapons[n];p.shots[n]={ammo:w?.clip||0,cooldown:.15,reloading:0};}
export function startWave(room, continuing=false) {
  room.phase='battle'; room.wave++; room.time=0; room.spawned=0; room.enemies=[]; room.gems=[]; room.turrets=[]; if(!continuing)room.effects=[];room.hazards=[];room.hostileShots=[]; room.nextSpawn=.6;
  const crew=room.players.filter(p=>p.connected); room.total=(room.survival?Math.min(42,17+Math.floor(room.survivalTime/90)*3):(12+room.wave*5))*crew.length;
  for (const [n,p] of room.players.entries()) { const s=stats(p); p.maxHp=s.maxHp;if(continuing){p.ready=false;continue;} p.hp=s.maxHp; p.x=420+n*45; p.y=310+(n%2)*40;p.guardAnchor={x:p.x,y:p.y}; p.ready=false; p.healTimer=0; p.revive=0;clearMovement(p); p.shots=s.weapons.map(w=>({ammo:w?.clip||0,cooldown:.15,reloading:0})); }
  room.log.unshift(`第 ${room.wave} 波：${room.survival?'持续抵抗尸潮':room.wave===6?'尸王正在靠近':'守住补给街区'}`); room.log=room.log.slice(0,6);
  pauseForUpgrades(room);
}
function spawn(room) {
  const r=room.random, edge=Math.floor(r()*4); let x,y;
  if(edge===0){x=20;y=30+r()*(HEIGHT-60);} else if(edge===1){x=WIDTH-20;y=30+r()*(HEIGHT-60);} else if(edge===2){x=30+r()*(WIDTH-60);y=20;} else {x=30+r()*(WIDTH-60);y=HEIGHT-20;}
  if(room.campaign&&room.survivalTime<45){const crew=room.players.filter(p=>p.connected&&p.hp>0),p=crew[room.spawned%crew.length];if(p){const a=r()*Math.PI*2,nx=Math.max(25,Math.min(WIDTH-25,p.x+Math.cos(a)*230)),ny=Math.max(25,Math.min(HEIGHT-25,p.y+Math.sin(a)*230));if(Math.hypot(nx-p.x,ny-p.y)>=150&&!MAPS[room.map||'cemetery'].walls.some(w=>nx+15>w.x&&nx-15<w.x+w.w&&ny+15>w.y&&ny-15<w.y+w.h)){x=nx;y=ny;}}}
  const boss=!room.survival&&room.wave===6 && room.spawned===room.total-1;const d=difficulty(room.survivalTime||0,room.players.filter(p=>p.connected).length),progress=room.survival?1+Math.floor(room.survivalTime/120):room.wave;
  const kind=boss?'boss':room.survival&&d.caster&&r()<.12?'caster':progress>=2 && r()<.20?'runner':progress>=3 && r()<.23?'brute':'walker';
  const base={caster:{hp:75,speed:20,damage:7,radius:12},walker:{hp:31+room.wave*8,speed:23+room.wave,damage:7,radius:13},runner:{hp:23+room.wave*6,speed:48+room.wave,damage:6,radius:10},brute:{hp:115+room.wave*16,speed:18,damage:16,radius:20},boss:{hp:750*room.players.filter(p=>p.connected).length,speed:23,damage:22,radius:35}}[kind];
  if(room.survival){const pacing=room.campaign?campaignPacing(room.survivalTime):d;base.hp=(kind==='brute'?100:kind==='caster'?75:kind==='runner'?28:room.campaign?(18+6*Math.min(1,room.survivalTime/90)):32)*pacing.health;base.speed=Math.min(base.speed,kind==='runner'?56:35);base.damage*=pacing.damage;}
  const enemy={id:`z${++room.serial}`,kind,level:progress,rank:room.survival?(kind==='caster'?2:kind==='brute'?3:kind==='runner'?2:d.rank):monsterRank(kind,room.wave),x,y,...base,maxHp:base.hp,slow:0,burn:0,burnDps:0,burnOwner:null,attack:0,angle:0};if(room.challenge){enemy.damage*=1.2;enemy.speed*=1.1;}augmentEnemy(room,enemy);room.enemies.push(enemy); room.spawned++;
}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function effect(room,data) { if(room.effects.length>=320){const n=room.effects.findIndex(e=>e.type==='number'||e.type==='xp');room.effects.splice(n<0?0:n,1);}room.effects.push({id:++room.serial,life:.35,...data}); }
function defeated(room, enemy, owner, color, weapon = null) {
  if (enemy.defeated) return;
  enemy.defeated = true; room.kills++; if (owner){owner.kills++;if(owner.kills%20===0)owner.eventTokens++;}if(enemy.volatile&&room.deathTraps.length<24)room.deathTraps.push({x:enemy.x,y:enemy.y,radius:65,remaining:1});
  if(room.campaign){const gold=goldDrop(enemy,room.survivalTime,room.goldRandom);if(gold){for(const p of room.players)if(!p.retired){p.goldBase=(p.goldBase||0)+gold;p.runGold=Math.floor(p.goldBase*(1+(p.metaBonus?.greed||0))+1e-8);}effect(room,{type:'gold',x:enemy.x,y:enemy.y,life:.9,value:gold,color:'#ffd568'});}}
  if(room.campaign){room.streak++;room.streakTimer=3;room.bestStreak=Math.max(room.bestStreak,room.streak);if(room.streak%25===0)effect(room,{type:'streak',x:enemy.x,y:enemy.y,life:1.5,value:`${room.streak} 连杀！`,color:'#f3cb85'});if(room.kills%25===0&&room.supplies.length<20)room.supplies.push({id:`s${++room.serial}`,x:clamp(enemy.x,45,915),y:clamp(enemy.y,45,575),heal:8});}
  if(owner)healPlayer(room,owner,stats(owner).killHeal,'#caa4cd');
  if(owner && weapon?.ghostGoal && owner.ghostDamage<.6){owner.ghostProgress++;if(owner.ghostProgress>=weapon.ghostGoal){owner.ghostProgress=0;owner.ghostDamage=Math.min(.6,Math.round((owner.ghostDamage+.02)*100)/100);effect(room,{type:'growth',x:owner.x,y:owner.y-25,value:'+2% DMG',color:'#c9b8ea',life:1});}}
  effect(room,{type:'death',x:enemy.x,y:enemy.y,color,life:.6,kind:enemy.kind,rank:enemy.rank||monsterRank(enemy.kind,room.wave),angle:enemy.angle});
  if(enemy.kind==='boss'&&room.survival){room.bossKills++;room.chests.push({id:`ch${++room.serial}`,x:clamp(enemy.x,45,WIDTH-45),y:clamp(enemy.y,45,HEIGHT-45),boss:enemy.name||'首领'});effect(room,{type:'bossDown',x:enemy.x,y:enemy.y,life:2,value:'首领已击败',color:'#efcd85'});for(const p of room.players)healPlayer(room,p,30,'#efcd85');}
  if(room.campaign&&!room.endless&&enemy.kind==='boss'&&enemy.encounter>=3){room.finalBossDefeated=true;room.spawned=room.total;room.hazards=[];room.hostileShots=[];room.log.unshift('红月审判结束 · 领取最终宝箱后撤离');}
  onFactionKill(room,owner,enemy,weapon,expeditionAPI);
  if(room.campaign&&enemy.encounterElite){if(room.supplies.length<20)room.supplies.push({id:`s${++room.serial}`,x:clamp(enemy.x,45,915),y:clamp(enemy.y,45,575),heal:12,vacuum:true});effect(room,{type:'eliteDown',x:enemy.x,y:enemy.y,life:2,value:'精英击败 · 经验与聚能补给',color:'#efcd85'});}
  const xp = enemy.elite?{...EXPERIENCE.runner,value:enemy.encounterElite?(enemy.kind==='brute'?60:40):enemy.kind==='brute'?30:10,name:'精英经验'}:EXPERIENCE[enemy.kind]||EXPERIENCE.runner;
  const pile=room.survival&&room.gems.length>=500?room.gems.find(g=>g.name===xp.name):null;if(pile){pile.value+=xp.value;pile.stack=(pile.stack||1)+1;}else room.gems.push({id:`g${++room.serial}`,x:enemy.x,y:enemy.y,...xp});
}
function collectGems(room, dt, sweep = false) {
  const living = room.players.filter(p=>p.hp>0);
  const remaining = [];
  for (const gem of room.gems) {
    const nearest = living.reduce((best,p)=>!best || distance(p,gem)<distance(best,gem)?p:best,null);
    if (!nearest) { remaining.push(gem); continue; }
    const d = distance(nearest,gem);
    if (sweep || d<18) { const bonus=Math.max(0,...room.players.filter(p=>!p.retired).map(p=>stats(p).xpBonus)),amount=gem.value*(1+bonus)+room.xpRemainder,value=Math.floor(amount+1e-9);room.xpRemainder=amount-value;grantExperience(room,value);for(const p of room.players)healPlayer(room,p,stats(p).pickupHeal*(gem.stack||1),'#b7cd86');effect(room,{type:'xp',x:nearest.x,y:nearest.y-22,value,color:gem.color,life:.8}); }
    else { if (d<stats(nearest).pickupRadius) { const step = Math.min(d,240*dt); gem.x += (nearest.x-gem.x)/d*step; gem.y += (nearest.y-gem.y)/d*step; } remaining.push(gem); }
  }
  room.gems = remaining;
}
function healPlayer(room,p,amount,color='#a7d9a5',visual=true){if(p.hp<=0||amount<=0||p.noHealing)return;const healed=Math.min(p.maxHp-p.hp,amount*stats(p).healMultiplier);if(healed<=0)return;p.hp+=healed;p.healing=(p.healing||0)+healed;if(stats(p).factions.find(f=>f.id==='blood').ultimate)p.healCharge=Math.min(100,(p.healCharge||0)+healed);if(visual)effect(room,{type:'heal',x:p.x,y:p.y,value:Math.round(healed*10)/10,color,life:.5});}
export function hurtPlayer(room,p,amount,color='#ed7969',cause='怪物接触'){
  if(p.hp<=0||amount<=0||room.campaign&&p.invulnerable>0)return 0;
  const s=stats(p);room.dodgeRandom??=rng((Number(room.runId.split(':').at(-1))||1)^0x39c183ab);
  if(s.dodge>0&&room.dodgeRandom()<s.dodge){if(room.campaign)p.invulnerable=.35;effect(room,{type:'dodge',x:p.x,y:p.y,owner:p.id,value:'闪避',color:'#a8e7df',life:.6});p.dodges++;healPlayer(room,p,s.dodgeHeal,'#a8e7df');onFactionDodge(room,p,expeditionAPI);return 0;}
  const damage=Math.min(p.hp,amount*(1-s.damageReduction));p.hp-=damage;if(room.campaign)p.invulnerable=.35;p.lastHit={cause,damage:Math.round(damage),time:room.survivalTime||room.time||0};effect(room,{type:'hurt',x:p.x,y:p.y,owner:p.id,value:Math.round(damage),cause,color,life:.4});return damage;
}
function hit(room,p,e,damage,w,crit=false) {
  if(e.hp<=0)return;
  damage*=1-(e.armor||0);if(!w.proc&&(e.weakenUntil||0)>(room.survival?room.survivalTime:room.time))damage*=1.12;const actual=Math.min(e.hp,damage); e.hp-=damage; p.damage+=actual;p.damageSources??={};const source=w.kind||'thorns';p.damageSources[source]=(p.damageSources[source]||0)+actual;
  e.hitFlash=.12;
  if(w.slow)e.slow=2.5*(w.statusDuration||1);
  if(w.burn){e.burn=3*(w.statusDuration||1);if(w.burn>=(e.burnDps||0)){e.burnDps=w.burn;e.burnOwner=p.id;e.burnGhostGoal=w.ghostGoal||0;}}
  if(w.lifesteal)healPlayer(room,p,actual*w.lifesteal,'#dea7bc');
  if(w.knockback && e.hp>0){const d=distance(e,p)||1,step=w.knockback*(e.kind==='boss'?.2:1);e.x=clamp(e.x+(e.x-p.x)/d*step,20,WIDTH-20);e.y=clamp(e.y+(e.y-p.y)/d*step,20,HEIGHT-20);}
  effect(room,{type:'number',x:e.x,y:e.y-15,value:Math.round(damage),crit,color:crit?'#ffe8a0':w.color,life:.7});
  if(e.hp<=0) defeated(room,e,p,'#a7b077',w);
  weaponCombo(room,p,e,w,actual,expeditionAPI);
}
export function weaponVisual(w){
  if(w.visual)return w.visual;
  if(w.kind==='turret')return ['bullet','fireball','laser','rocket'][w.tier-1]||'bullet';
  if(w.melee)return w.kind==='spear'?'thrust':w.kind==='scissors'?'scissors':'slash';
  return ({shotgun:'pellets',laser:'laser',rocket:'rocket',shredder:'explosive',frost:'ice',wand:'fireball',flamethrower:'flame',taser:'electric',crossbow:'arrow',shuriken:'shuriken',slingshot:'stone'})[w.kind]||'bullet';
}
function attack(room,p,target,damage,w,crit=false,origin=p) {
  const visual=weaponVisual(w),flight=['laser','electric','flame','slash','thrust','scissors'].includes(visual)?0:Math.min(.38,Math.max(.18,distance(origin,target)/(visual==='rocket'?800:1500))),duration=flight+.32+(w.tier-1)*.055;
  effect(room,{type:'shot',x:origin.x,y:origin.y,tx:target.x,ty:target.y,color:w.color,life:duration,duration,flight,visual,tier:w.tier,owner:p.id,weapon:w.kind,melee:w.melee,cone:w.cone,range:w.range,pierce:w.pierce,crit});
  // Capture the impact point before knockback changes the target position.
  const impact={x:target.x,y:target.y},ax=impact.x-origin.x,ay=impact.y-origin.y,len=Math.hypot(ax,ay)||1;
  hit(room,p,target,damage,w,crit);if(w.double){effect(room,{type:'shot',x:origin.x+4,y:origin.y+4,tx:target.x,ty:target.y,color:w.color,life:duration,duration,flight,visual,tier:w.tier,owner:p.id,weapon:w.kind,delay:.04});hit(room,p,target,damage*.5,w,crit);}
  if(p.relic==='echo'){p.echoShots=(p.echoShots||0)+1;if(p.echoShots%10===0){const extra=target.hp>0?target:room.enemies.find(e=>e.hp>0&&distance(e,impact)<120);if(extra){hit(room,p,extra,damage*.25,{kind:'relic_echo',proc:true,color:'#efcd85'});effect(room,{type:'weaponCombo',x:extra.x,y:extra.y,radius:40,life:.6,color:'#efcd85',value:'回音追加'});}}}
  if(w.pierce)for(const e of room.enemies){if(e===target||e.hp<=0)continue;const ex=e.x-origin.x,ey=e.y-origin.y,along=(ex*ax+ey*ay)/len,across=Math.abs(ex*ay-ey*ax)/len;if(along>0&&along<=w.range&&across<e.radius+12)hit(room,p,e,damage*.7,w);}
  if(w.splash){effect(room,{type:'blast',x:impact.x,y:impact.y,radius:w.splash,color:'#efb086',life:flight+.5,duration:flight+.5,delay:flight,weapon:w.kind,tier:w.tier,crit});for(const e of room.enemies)if(e!==target&&e.hp>0&&distance(e,impact)<w.splash)hit(room,p,e,damage*.55*(1+(w.blastPower||0)),w);}
  if(w.slowRadius){effect(room,{type:'pulse',x:impact.x,y:impact.y,radius:w.slowRadius,color:'#a5dce9',life:.35});for(const e of room.enemies)if(e.hp>0&&distance(e,impact)<=w.slowRadius){e.slow=2.5*(w.statusDuration||1);e.primers??={};e.primers.frost={kind:w.kind,owner:p.id,at:room.survival?room.survivalTime:room.time};}}
  if(w.cone||w.sweep){const angle=Math.atan2(ay,ax),width=w.cone||1.2;for(const e of room.enemies){if(e===target||e.hp<=0||distance(e,origin)>w.range)continue;const diff=Math.atan2(Math.sin(Math.atan2(e.y-origin.y,e.x-origin.x)-angle),Math.cos(Math.atan2(e.y-origin.y,e.x-origin.x)-angle));if(Math.abs(diff)<=width)hit(room,p,e,damage,w);}}
  const bounces=w.chain||w.bounce||(w.critBounce&&crit?w.tier:0);
  if(bounces){const seen=new Set([target.id]);let from=impact,amount=damage*(w.chain?.6:.75);for(let n=0;n<bounces;n++){const next=room.enemies.filter(e=>e.hp>0&&!seen.has(e.id)&&distance(e,from)<=180).sort((a,b)=>distance(a,from)-distance(b,from))[0];if(!next)break;seen.add(next.id);const delay=flight+n*.06;effect(room,{type:'link',x:from.x,y:from.y,tx:next.x,ty:next.y,color:w.chain?'#a5dce9':w.color,visual:w.chain?'electric':visual,weapon:w.kind,lightning:!!w.chain,life:delay+.28,duration:delay+.28,delay,flight:w.chain?0:.10,tier:w.tier});hit(room,p,next,amount,w);from={x:next.x,y:next.y};amount*=.8;}}
  if(w.spikes){for(const e of room.enemies.filter(e=>e!==target&&e.hp>0&&distance(e,impact)<=220).sort((a,b)=>distance(a,impact)-distance(b,impact)).slice(0,w.spikes)){effect(room,{type:'link',x:impact.x,y:impact.y,tx:e.x,ty:e.y,color:'#b1d693',visual:'spike',flight:.12,duration:.36,life:.36});hit(room,p,e,damage*.45,{...w,knockback:0});}}
}
function tickTurrets(room,dt) {
  room.turrets=room.turrets.filter(t=>room.players.some(p=>p.id===t.owner&&weaponDefinition(p.weapons[t.slot])?.turret));
  for(const p of room.players){if(p.hp<=0)continue;const s=stats(p);for(const [slot,w]of s.weapons.entries()){if(!w?.turret)continue;let t=room.turrets.find(t=>t.owner===p.id&&t.slot===slot);if(!t){t={id:`t${++room.serial}`,owner:p.id,slot,x:clamp(p.x+(slot?35:-35),45,WIDTH-45),y:p.y+20,cooldown:.15,angle:0,tier:w.tier};room.turrets.push(t);}t.tier=w.tier;t.cooldown-=dt;if(t.cooldown>0)continue;
    const target=room.enemies.filter(e=>e.hp>0&&distance(t,e)<300+(w.tier-1)*15).sort((a,b)=>distance(t,a)-distance(t,b))[0];if(!target)continue;t.angle=Math.atan2(target.y-t.y,target.x-t.x);t.cooldown=.8/(1+(w.tier-1)*.1);
    const tw={...w,visual:undefined,kind:'turret',melee:false,sweep:false,knockback:0,turret:false,range:300+(w.tier-1)*15,burn:w.tier===2?12+w.burn:w.burn,pierce:w.tier===3,splash:w.tier===4?75:0};attack(room,p,target,w.damage*.7,tw,false,t);
  }}
}
export function tick(room,dt){if(room.solo&&room.inspectionPaused&&room.phase==='battle')return;const paused=room.phase==='upgrade';processAutomaticRewards(room,dt);if(paused)return;tickStats=new Map();try{return stepTick(room,dt);}finally{tickStats=null;}}
function stepTick(room,dt) {
  if(room.phase!=='battle')return;
  pauseForUpgrades(room); if(room.phase!=='battle')return;
  room.time+=dt;
  for(const e of room.enemies)e.hitFlash=Math.max(0,(e.hitFlash||0)-dt);
  if(room.campaign){room.streakTimer=Math.max(0,room.streakTimer-dt);if(!room.streakTimer)room.streak=0;for(const p of room.players){p.powerTimer=Math.max(0,p.powerTimer-dt);p.invulnerable=Math.max(0,p.invulnerable-dt);}}
  if(room.survival)tickSurvival(room,dt,{effect,stats,hurt:hurtPlayer});
  tickExpedition(room,dt,expeditionAPI);if(room.phase!=="battle")return;
  if(room.campaign&&(!room.finalBossDefeated||room.endless)&&!(room.bossCount>=3&&!room.endless))warnElite(room,effect);
  if(room.campaign&&(!room.finalBossDefeated||room.endless)&&!(room.bossCount>=3&&!room.endless)&&room.survivalTime>=(room.nextEliteAt??180)){room.nextEliteAt??=180;spawnElite(room,effect);}
  room.effects=room.effects.map(e=>({...e,life:e.life-dt})).filter(e=>e.life>0);
  room.nextSpawn-=dt;
  const pacing=room.campaign?campaignPacing(room.survivalTime):null,finalFight=room.campaign&&!room.endless&&room.bossCount>=3;
  if(room.spawned<room.total && room.nextSpawn<=0 && !finalFight && !pacing?.breather && (!room.survival||room.enemies.length<(pacing?.cap||difficulty(room.survivalTime,room.players.length).cap))){spawn(room);room.nextSpawn=room.survival?(room.challenge?.55:1)*(pacing?.interval||difficulty(room.survivalTime,room.players.filter(p=>p.connected).length).interval)/Math.pow(room.campaign?room.players.filter(p=>p.connected).length||1:1,.25):Math.max(.22,.85-room.wave*.065)/Math.sqrt(room.players.filter(p=>p.connected).length||1);}
  const living=room.players.filter(p=>p.hp>0);
  if(!living.length){room.phase='defeat';room.log.unshift('小队失守。重新搭配装备，再试一次。');return;}
  for(const p of living){
    tickFactions(room,p,dt,expeditionAPI);tickStats?.delete(p);const s=stats(p); const nearby=room.enemies.filter(e=>e.hp>0); const nearest=nearby.reduce((best,e)=>!best||distance(p,e)<distance(p,best)?e:best,null);
    if(nearest)p.angle=Math.atan2(nearest.y-p.y,nearest.x-p.x);
    let vx=0,vy=0;
    if(p.controlMode==='manual'){
      p.moveLease=Math.max(0,p.moveLease-dt);if(!p.connected||!p.moveLease)clearMovement(p);
      vx=p.moveInput.x;vy=p.moveInput.y;
    }else{
    const direction=automaticDirection(room,p,s,nearby,nearest,living);vx=direction.x;vy=direction.y;
    }
    const speed=Math.max(1,Math.hypot(vx,vy));moveOnMap(room,p,clamp(p.x+vx/speed*s.move*dt,45,WIDTH-45),clamp(p.y+vy/speed*s.move*dt,45,HEIGHT-45));
    p.healTimer+=dt;
    healPlayer(room,p,s.regen*dt,'#e8a197',false);
    if(s.heal && p.healTimer>=5){p.healTimer=0;const ally=living.filter(a=>distance(a,p)<240 && a.hp<a.maxHp).sort((a,b)=>a.hp/a.maxHp-b.hp/b.maxHp)[0];if(ally)healPlayer(room,ally,s.heal);}
    for(const [n,w] of s.weapons.entries()){
      if(!w)continue;
      const sh=p.shots[n];sh.cooldown-=dt;
      if(sh.reloading>0){sh.reloading-=dt;if(sh.reloading<=0)sh.ammo=w.clip;continue;}
      if(!w.melee && !w.endless && sh.ammo<=0){sh.reloading=w.reload;continue;}
      let targets=nearby.filter(e=>e.hp>0 && distance(p,e)<=w.range);
      const target=targets.reduce((best,e)=>!best||(w.kind==='sniper'||w.priority==='strongest'?e.maxHp>best.maxHp:distance(p,e)<distance(p,best))?e:best,null);if(!target || sh.cooldown>0)continue;
      sh.cooldown=w.interval;if(!w.melee&&!w.endless)sh.ammo--;const crit=room.random()<w.crit;
      const damage=w.damage*(crit?2:1)*(w.kind==='lmg' && target.slow>0?1.35:1);
      attack(room,p,target,damage,w,crit);
    }
  }
  tickTurrets(room,dt);
  const auras=living.map(p=>({p,slow:stats(p).auraSlow}));
  for(const e of room.enemies){
    if(e.hp<=0)continue;
    if(e.burn>0){e.burn-=dt;const amount=e.burnDps*dt; const owner=room.players.find(p=>p.id===e.burnOwner); if(owner){const actual=Math.min(e.hp,amount);owner.damage+=actual;owner.damageSources.burn=(owner.damageSources.burn||0)+actual;} e.hp-=amount;if(e.hp<=0){defeated(room,e,owner,'#ee906e',{ghostGoal:e.burnGhostGoal});continue;}}
    moveOnMap(room,e,e.x,e.y,e.radius);e.slow=Math.max(0,e.slow-dt);e.attack-=dt;
    const target=living.filter(p=>p.hp>0).sort((a,b)=>distance(e,a)-distance(e,b))[0];if(!target)continue;
    const d=distance(e,target);e.angle=Math.atan2(target.y-e.y,target.x-e.x);
    const auraSlow=Math.max(0,...auras.filter(a=>a.p.hp>0&&distance(a.p,e)<=240).map(a=>a.slow)),enemySpeed=e.speed*(e.slow>0?.45:1)*(1-auraSlow);
    if(e.windup>0){e.windup=Math.max(0,e.windup-dt);continue;}
    if(e.kind==='caster'&&d<220){moveOnMap(room,e,e.x-(target.x-e.x)/Math.max(1,d)*enemySpeed*dt,e.y-(target.y-e.y)/Math.max(1,d)*enemySpeed*dt,e.radius);e.x=clamp(e.x,20,940);e.y=clamp(e.y,20,600);continue;}
    if(d>e.radius+13){moveOnMap(room,e,e.x+Math.cos(e.angle)*enemySpeed*dt,e.y+Math.sin(e.angle)*enemySpeed*dt,e.radius);}
    else if(e.attack<=0){e.attack=.9;const defence=stats(target);const taken=hurtPlayer(room,target,e.damage,undefined,e.kind==='boss'?'首领接触':'怪物接触');if(taken&&defence.thorns)hit(room,target,e,defence.thorns,{color:'#c0b194',burn:0});}
  }
  for(const p of room.players.filter(p=>p.hp<=0&&!p.retired)){clearMovement(p);const helper=room.players.find(a=>a.hp>0 && distance(a,p)<110);if(helper){p.revive+=dt;if(p.revive>=4){p.hp=p.maxHp*.35;p.revive=0;helper.revives++;p.invulnerable=1;effect(room,{type:'heal',x:p.x,y:p.y,value:'救起',color:p.color,life:1});}}else p.revive=0;}
  room.enemies=room.enemies.filter(e=>e.hp>0);
  if(room.players.every(p=>p.hp<=0)){room.phase='defeat';return;}
  if(room.campaign){let vacuum=false;room.supplies=room.supplies.filter(f=>{const p=room.players.find(p=>p.connected&&p.hp>0&&(f.vacuum||p.hp<p.maxHp)&&distance(p,f)<28);if(!p)return true;healPlayer(room,p,f.heal,'#b7cd86');if(f.vacuum){vacuum=true;for(const ally of room.players)if(ally.connected&&ally.hp>0)ally.powerTimer=Math.max(ally.powerTimer||0,4);effect(room,{type:'powerUp',x:p.x,y:p.y,life:1.8,value:'聚能补给 · 经验回收 / 火力全开',color:'#efcd85'});}return false;});if(vacuum)collectGems(room,0,true);}
  if(room.survival){room.chests=room.chests.filter(ch=>{const opener=room.players.find(p=>p.hp>0&&p.connected&&distance(p,ch)<28);if(!opener)return true;grantBossReward(room,ch.boss);effect(room,{type:'chestOpen',x:ch.x,y:ch.y,life:1.2,color:'#f3cb85'});room.log.unshift(`${opener.name}打开${ch.boss}的宝箱 · 小队各获得一次奖励`);room.log=room.log.slice(0,6);return false;});}
  const cleared = room.spawned===room.total && !room.enemies.length;
  collectGems(room,dt,cleared);
  pauseForUpgrades(room); if(room.phase==='upgrade')return;
  if(room.campaign&&!room.endless&&room.finalBossDefeated&&!room.chests.length&&!room.enemies.some(e=>e.kind==='boss')){room.phase='victory';room.hazards=[];room.hostileShots=[];for(const p of room.players){p.pendingUpgrades=0;p.rewardPending=false;p.rewards=[];p.rewardQueue=[];}room.log.unshift('天亮了！墓园撤离成功 · 零件已结算');return;}
  if(finalFight)return;
  if(cleared){
    if(room.survival){startWave(room,true);return;}
    if(room.wave>=6){room.phase='victory';room.log.unshift('尸王倒下。小队成功撤离！');}
    else{room.phase='prepare';for(const p of room.players)p.ready=false;room.log.unshift(`第 ${room.wave} 波已清除。地上经验已收集，准备下一波。`);}
    room.log=room.log.slice(0,6);
  }
}
export function snapshot(room,ownId){return {inspectionPaused:!!room.inspectionPaused,challengeMode:room.challengeMode,map:room.map,events:room.events,eventChoice:room.eventChoice,challenge:room.challenge,mapZones:room.mapZones,deathTraps:room.deathTraps,endlessMods:room.endlessMods,endlessLevel:room.endlessLevel,weaponCombos:possibleCombos(room,{stats}),code:room.code,solo:room.solo,survival:room.survival,campaign:room.campaign,endless:room.endless,finalBossDefeated:room.finalBossDefeated,runId:room.runId,streak:room.streak,bestStreak:room.bestStreak,supplies:room.supplies,milestone:room.campaign?campaignMilestone(room):null,pacing:room.campaign?campaignPacing(room.survivalTime).label:null,survivalTime:room.survivalTime,nextBossAt:room.nextBossAt,bossCount:room.bossCount,bossKills:room.bossKills,chests:room.chests,hazards:room.hazards,hostileShots:room.hostileShots,phase:room.phase,wave:room.wave,time:room.time,spawned:room.spawned,total:room.total,kills:room.kills,enemies:room.enemies,gems:room.gems,turrets:room.turrets,effects:room.effects,log:room.log,players:room.players.map(p=>{const s=stats(p);return {...p,settlement:p.id===ownId?p.settlement:undefined,hp:room.phase==='prepare'?s.maxHp:p.hp,maxHp:s.maxHp,xpNeeded:experienceNeeded(p.level),stats:s,rewards:p.id===ownId?p.rewards:[]};})};}

const expeditionAPI={effect,stats,hit,heal:healPlayer,hurt:hurtPlayer,pause:pauseForUpgrades,reward(room,label){for(const p of room.players){if(p.retired)continue;p.pendingUpgrades++;p.rewardQueue.push({source:'event',boss:label});offerUpgrade(room,p);}}};
