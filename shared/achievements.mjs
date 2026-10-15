export const ACHIEVEMENTS={
 bare:{name:'不靠关系也能下班',text:'白板打工人挑战成功撤离',metric:'bareWins',goal:1},
 noheal:{name:'医务室真的关了',text:'医务室停业挑战成功撤离',metric:'nohealWins',goal:1},
 first:{name:'今晚不加班',text:'完成第一次出征',metric:'runs',goal:1},
 survivor:{name:'熬过试用期',text:'一局生存 5 分钟',metric:'bestTime',goal:300},
 veteran:{name:'墓园常驻嘉宾',text:'一局生存 20 分钟',metric:'bestTime',goal:1200},
 win:{name:'打卡下班',text:'成功撤离一次',metric:'wins',goal:1},
 wins:{name:'优秀夜班员工',text:'成功撤离 5 次',metric:'wins',goal:5},
 kills:{name:'尸潮清洁工',text:'累计击杀 1000 只怪物',metric:'kills',goal:1000},
 bosses:{name:'领导也照打',text:'累计击败 3 名首领',metric:'bosses',goal:3},
 level:{name:'实习生毕业了',text:'一局达到 25 级',metric:'bestLevel',goal:25},
 recycle:{name:'废品艺术家',text:'累计熔炼 5 次',metric:'recycles',goal:5},
 fusion:{name:'两把变一把',text:'完成一次首领武器融合',metric:'fusions',goal:1},
 dodge:{name:'左脚踩右脚大师',text:'累计成功闪避 100 次',metric:'dodges',goal:100},
 combo:{name:'化学老师很欣慰',text:'累计触发 50 次武器连携',metric:'comboTriggers',goal:50},
 rescue:{name:'同事不能白躺',text:'累计救起队友 3 次',metric:'revives',goal:3},
 endless:{name:'自愿加班',text:'通过一轮无尽词缀选择',metric:'endlessLevel',goal:1},
 blood:{name:'夜宵吃出超能力',text:'激活夜宵医务室最终效果',faction:'blood'},
 blast:{name:'烟花不归城管管',text:'激活违章烟花社最终效果',faction:'blast'},
 shadow:{name:'跑路跑出幻影',text:'激活跑路俱乐部最终效果',faction:'shadow'},
 arcane:{name:'补考考成大法师',text:'激活补考魔法学院最终效果',faction:'arcane'},
 collector:{name:'军火柜管理员',text:'发现 15 种武器',collection:'weapons',goal:15},
 pantry:{name:'背包像个杂货铺',text:'发现 25 种配件',collection:'items',goal:25}
};
export function migrateCollection(p){
 p.collection??={weapons:['pistol'],items:[]};p.collection.weapons??=['pistol'];p.collection.items??=[];
 p.achievements??={};p.records.factionAwakened??=[];
 for(const h of p.history||[])for(const [group,kinds] of [['weapons',(h.weapons||[]).map(w=>w.kind)],['items',h.items||[]]])p.collection[group]=[...new Set([...p.collection[group],...kinds])];
 return p;
}
export function achievementProgress(p,key){const d=ACHIEVEMENTS[key];if(!d)return null;const value=d.faction?(p.records.factionAwakened||[]).includes(d.faction)?1:0:d.collection?p.collection[d.collection].length:p.records[d.metric]||0;return {value,goal:d.goal||1,done:value>=(d.goal||1)};}
export function awardAchievements(p){migrateCollection(p);const unlocked=[];for(const key of Object.keys(ACHIEVEMENTS))if(!p.achievements[key]&&achievementProgress(p,key).done){p.achievements[key]={at:new Date().toISOString()};unlocked.push(key);}return unlocked;}
export function discover(p,owned){migrateCollection(p);for(const group of ['weapons','items'])p.collection[group]=[...new Set([...p.collection[group],...(owned[group]||[])])];return awardAchievements(p);}
export function ownedCollection(p){return {weapons:[...new Set([...p.weapons.filter(Boolean),...p.weaponStash.map(w=>w.kind),...(p.obtainedWeapons||[])])],items:[...new Set([...p.items.map(i=>i.kind),...(p.obtainedItems||[])])]};}
