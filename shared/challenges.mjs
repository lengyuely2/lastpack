export const CHALLENGES={standard:{name:'标准出征',text:'使用自己的角色、成长和装备。'},bare:{name:'白板打工人',text:'本局关闭全部角色与局外属性加成，保留已解锁起始武器和遗物。'},noheal:{name:'医务室停业',text:'本局所有治疗、再生与升级扩容回血失效；队友救起仍可用。'}};
export function unlockedChallenges(profile){return ['standard',...(profile.records.wins>=1?['bare','noheal']:[])];}
