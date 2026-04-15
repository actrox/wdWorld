import { createEmptyEntry, createId, nowIso, sortTimelineEvents } from "./utils.js";

/**
 * 世界级时间轴只保留整部作品最关键的阶段节点，
 * 让使用者先抓住主脉络，再深入到单条目。
 */
export function createMysteryRevivalDemoProjectTimeline() {
  const now = nowIso();
  const event = (pointLabel, title, description, sortValue) => ({
    id: createId("timeline"),
    pointLabel,
    title,
    description,
    sortValue,
    createdAt: now,
  });

  return sortTimelineEvents([
    event("灵异复苏初期", "总部体系开始成形", "各地灵异事件频发，接线员、负责人和档案体系逐步建立。", 10),
    event("大昌市前期", "杨间在第七中学卷入鬼敲门事件", "大昌市成为作品最早也是最重要的主舞台。", 20),
    event("中期升级", "饿死鬼与鬼画事件推动规则全面升级", "地方事件开始和总部研究、关押计划深度联动。", 30),
    event("规则深挖", "鬼邮局、太平古镇和鬼湖揭开民国遗留体系", "世界观从城市灾难推进到规则与历史结构层面。", 40),
    event("势力重组", "尚通大厦势力建立，朋友圈矛盾公开化", "杨间从单人行动转向建立自己的秩序网络。", 50),
    event("终局战争", "国王组织与亚洲总部爆发全面战争", "双桥镇、香港等地成为主战场，冲突升级到全球层面。", 60),
  ]);
}

/**
 * 默认示例使用“区域 + 地点 + 人物 + 组织 + 事件/设定/器物”的并行结构，
 * 这样地图、关系图、百科和时间轴能共享同一套样例数据。
 */
export function createMysteryRevivalDemoEntries() {
  const now = nowIso();
  const timeline = (pointLabel, title, description, sortValue) => ({
    id: createId("timeline"),
    pointLabel,
    title,
    description,
    sortValue,
    createdAt: now,
  });
  const anchor = (label, x, y, notes) => ({ id: createId("anchor"), label, x, y, notes, createdAt: now });
  const regionShape = (top, left, width, height, rotation) => ({ top, left, width, height, rotation });
  const entry = (type, fields) => ({ ...createEmptyEntry(type), id: createId(type), createdAt: now, updatedAt: now, ...fields });
  const region = (fields) => entry("region", fields);
  const location = (fields) => entry("location", fields);
  const character = (fields) => entry("character", fields);
  const faction = (fields) => entry("faction", fields);
  const lore = (fields) => entry("lore", fields);
  const eventEntry = (fields) => entry("event", fields);
  const item = (fields) => entry("item", fields);

  const entries = {
    // 区域骨架
    dachang: region({
      title: "大昌市",
      aliases: ["主角起点", "前中期主舞台"],
      tags: ["城市", "主线", "灵异高发"],
      condition: "高危封控",
      occupants: "杨间阵营、本地负责人、多起关键灵异事件",
      summary: "杨间成长的起点，也是鬼敲门、鬼镜、黄岗村鬼差、饿死鬼等事件的集中舞台。",
      content: "大昌市奠定了整部作品最初的规则、人物关系和危机密度。",
      regionShape: regionShape(42, 52, 28, 22, -6),
      anchors: [
        anchor("大昌市第七中学", 38, 30, "鬼敲门事件起点。"),
        anchor("观江小区", 60, 62, "杨间长期据点。"),
        anchor("尚通大厦", 78, 42, "杨间后期势力象征。"),
      ],
      timelineEvents: [
        timeline("前期", "鬼敲门与鬼镜事件接连出现", "杨间由普通学生被拖入灵异世界。", 10),
        timeline("中期", "饿死鬼事件导致全市封锁", "大昌市成为 S 级事件中心。", 20),
        timeline("后期", "尚通大厦势力建立", "杨间完成从幸存者到统筹者的转变。", 30),
      ],
    }),
    dajing: region({
      title: "大京市",
      aliases: ["总部核心"],
      tags: ["总部", "会议", "培训"],
      condition: "重度戒备",
      occupants: "总部高层、研究人员、队长计划成员",
      summary: "负责人培训、鬼画关押、总部会议和后期战争都在这里集中爆发。",
      content: "大京市是制度与战争的双重中枢。",
      regionShape: regionShape(18, 18, 30, 24, 5),
      anchors: [
        anchor("负责人培训基地", 34, 44, "培训与鬼差事件。"),
        anchor("总部会议厅", 66, 36, "总部会议和冲突。"),
        anchor("王小明实验区", 52, 64, "鬼画与关押计划核心。"),
      ],
    }),
    caesar: region({
      title: "凯撒大酒店",
      tags: ["灵异建筑", "探索", "多层鬼域"],
      condition: "多层鬼域重叠",
      occupants: "鬼影、鬼报纸、被困驭鬼者",
      summary: "内部空间层层递进，与鬼邮局线有很强呼应。",
      content: "凯撒大酒店代表了探索型灵异场景的复杂层级。",
      regionShape: regionShape(12, 50, 22, 18, 8),
      anchors: [anchor("酒店前厅", 34, 58, "表层入口。"), anchor("深层客房", 68, 34, "危险探索区。")],
    }),
    ghostPost: region({
      title: "鬼邮局",
      aliases: ["鬼邮局线路"],
      tags: ["民国", "送信", "规则"],
      condition: "封闭规则体系",
      occupants: "历代信使、旧秩序、送信诅咒",
      summary: "鬼邮局是中后期规则线核心，也是民国遗留体系的重要入口。",
      content: "杨间一路打上五楼并完成接管，邮局由此成为他最关键的规则战场之一。",
      regionShape: regionShape(18, 62, 22, 18, 7),
      anchors: [anchor("一楼大厅", 36, 62, "任务起点。"), anchor("五楼走廊", 68, 24, "顶层隐秘。")] ,
    }),
    taiping: region({
      title: "太平古镇",
      aliases: ["民国古镇"],
      tags: ["民国", "鬼湖", "遗存"],
      condition: "旧秩序半显现",
      occupants: "守旧派、招魂人、古镇遗留规则",
      summary: "鬼湖事件和民国线在这里正式接轨。",
      content: "寄存铺、棺材铺和守旧派人物让现代剧情真正碰到民国时代的深层结构。",
      regionShape: regionShape(58, 56, 24, 18, -5),
      anchors: [anchor("寄存铺", 38, 56, "灵异物品寄存点。"), anchor("棺材铺", 68, 40, "古镇规则重地。")],
    }),
    dahai: region({
      title: "大海市",
      aliases: ["福寿园区域"],
      tags: ["墓园", "罗千", "民国"],
      condition: "坟场高危",
      occupants: "坟场规则、罗千遗留、资源争夺者",
      summary: "福寿园和罗千坟场让大海市成为民国遗留在现代落地的重要区域。",
      content: "这里代表后期更高层级的争夺和复苏威胁。",
      regionShape: regionShape(62, 20, 24, 18, -4),
      anchors: [anchor("福寿园入口", 36, 62, "墓园入口。"), anchor("坟场深处", 66, 34, "高危遗留区。")],
    }),
    overseas: region({
      title: "国外战场",
      aliases: ["国王组织战区"],
      tags: ["战争", "国王组织", "后期"],
      condition: "全面战争",
      occupants: "国王组织与亚洲总部前线成员",
      summary: "国王组织试图掌控全球灵异，双桥镇、香港等地成为高烈度战场。",
      content: "这里承载终局战争线。",
      regionShape: regionShape(46, 10, 28, 18, -3),
      anchors: [anchor("双桥镇战场", 36, 56, "关键反攻地点。"), anchor("香港战场", 70, 42, "高强度交锋区。")],
    }),
    deepDomain: region({
      title: "深层鬼域",
      aliases: ["灵异之地"],
      tags: ["规则", "鬼域", "深层空间"],
      condition: "规则重叠",
      occupants: "鬼寺、鬼街、白水镇等深层场景",
      summary: "深层鬼域用于承载鬼寺、鬼街、白水镇等超现实空间。",
      content: "时间循环、灵异交易和梦魇结构都在这里集中体现。",
      regionShape: regionShape(8, 78, 16, 26, 6),
      anchors: [anchor("鬼寺", 26, 24, "摆钟与时间循环。"), anchor("鬼街", 56, 54, "灵异交易场所。"), anchor("白水镇", 78, 76, "梦魇入口。")],
    }),

    // 地点与人物
    seventhSchool: location({ title: "大昌市第七中学", tags: ["校园", "鬼敲门", "起点"], region: "大昌市", summary: "杨间故事真正开始的地方。", content: "周正遗留的影响与鬼敲门事件都从这里爆发。", mapPosition: { x: 44, y: 32 } }),
    guangjiang: location({ title: "观江小区", tags: ["据点", "大昌市"], region: "大昌市", summary: "杨间长期据点。", content: "主角团关系最稳定的现实落点。", mapPosition: { x: 60, y: 60 } }),
    shangtongTower: location({ title: "尚通大厦", tags: ["势力", "据点", "后期"], region: "大昌市", summary: "杨间后期势力的象征。", content: "标志他开始建立自己的秩序网络。", mapPosition: { x: 74, y: 44 } }),
    trainingBase: location({ title: "负责人培训基地", tags: ["总部", "培训", "鬼差"], region: "大京市", summary: "培训与鬼差事件发生地。", content: "杨间在这里正式进入总部视角。", mapPosition: { x: 38, y: 46 } }),
    headquartersHall: location({ title: "总部会议厅", tags: ["总部", "会议"], region: "大京市", summary: "总部高层冲突集中发生地。", content: "杨间和方世明的矛盾在这里多次升级。", mapPosition: { x: 66, y: 38 } }),
    wangLab: location({ title: "王小明实验区", tags: ["研究", "鬼画"], region: "大京市", summary: "鬼画研究和关押计划核心地点。", content: "这里是总部理论能力的象征。", mapPosition: { x: 54, y: 62 } }),
    fortuneGarden: location({ title: "福寿园", tags: ["墓园", "罗千", "坟场"], region: "大海市", summary: "罗千坟场所在。", content: "杨间在此争夺灵异物品并接触更深民国遗留。", mapPosition: { x: 36, y: 62 } }),
    ghostTemple: location({ title: "鬼寺", tags: ["摆钟", "时间循环"], region: "深层鬼域", summary: "涉及时间循环机制的深层地点。", content: "鬼寺象征时间规则被污染后的极端场景。", mapPosition: { x: 26, y: 24 } }),
    ghostStreet: location({ title: "鬼街", tags: ["交易", "深层鬼域"], region: "深层鬼域", summary: "灵异交易场所。", content: "代价与交换才是这里的真正通行逻辑。", mapPosition: { x: 56, y: 54 } }),
    baishuiTown: location({ title: "白水镇", tags: ["梦魇", "意识"], region: "深层鬼域", summary: "活人意识可能被困的梦魇世界。", content: "白水镇代表意识层面的灵异困锁。", mapPosition: { x: 78, y: 76 } }),
    doubleBridgeTown: location({ title: "双桥镇", tags: ["战争", "国王组织"], region: "国外战场", summary: "后期关键战役地点。", content: "杨间一方在这里展开重要反攻。", mapPosition: { x: 36, y: 56 } }),

    yangjian: character({ title: "杨间", aliases: ["鬼眼杨间"], tags: ["主角", "负责人", "队长级"], region: "大昌市", summary: "从学生成长为终结灵异时代关键人物的绝对核心。", content: "核心能力包括鬼眼、鬼影、鬼手、鬼湖和重启，贯穿大昌市、总部、鬼邮局、民国线和终局战争。", timelineEvents: [timeline("早期", "在第七中学卷入鬼敲门事件", "成长线起点。", 10), timeline("中期", "成为大昌市负责人", "从幸存者转向主动掌控。", 20), timeline("后期", "建立尚通大厦势力并参加终局战争", "成为多条主线共享枢纽。", 30)] }),
    zhangwei: character({ title: "张伟", tags: ["死党", "幸运"], region: "大昌市", summary: "杨间死党，普通人视角的重要代表。", content: "后期获得灵异物品“黄金手指”，让他不再只是陪衬。"}),
    wangshanshan: character({ title: "王珊珊", tags: ["同学", "异类"], region: "大昌市", summary: "被鬼婴视作“妈妈”，后成为异类。", content: "她与杨间之间有长期而特殊的灵异联系。"}),
    tongqian: character({ title: "童倩", tags: ["负责人", "笑脸鬼", "哭脸鬼"], region: "大昌市", summary: "原大昌市负责人之一，后被杨间复活。", content: "是队友线和负责人线的重要节点。"}),
    fengquan: character({ title: "冯全", tags: ["负责人", "坟土", "鬼雾"], region: "大昌市", summary: "多次与杨间合作的重要负责人。", content: "能力偏场域和规则控制。"}),
    liyang: character({ title: "李阳", tags: ["鬼水", "干将"], region: "大昌市", summary: "鬼湖事件后加入杨间阵营。", content: "是杨间后期势力最稳定的执行者之一。"}),
    zhangxianguang: character({ title: "张羡光", tags: ["复杂立场", "桃源计划"], region: "鬼邮局", summary: "张洞之子，亦敌亦友。", content: "他试图借鬼画推进桃源计划，是后期最具张力的人物之一。"}),
    wangxiaoming: character({ title: "王小明", aliases: ["王教授"], tags: ["总部", "研究"], region: "大京市", summary: "总部灵魂人物，灵异研究先驱。", content: "鬼画关押计划和大量关键决策都离不开他。"}),
    caoyanhua: character({ title: "曹延华", tags: ["总部高层", "副部长"], region: "大京市", summary: "总部副部长，负责统筹协调。", content: "代表总部的制度执行面。"}),
    lijun: character({ title: "李军", tags: ["队长", "鬼火", "鬼骨"], region: "大京市", summary: "队长计划中的强硬战力。", content: "原则性极强，是总部战斗派代表。"}),
    weijing: character({ title: "卫景", tags: ["队长", "异类", "鬼差"], region: "大京市", summary: "从鬼差中诞生的异类。", content: "让鬼差线和总部顶层战力真正接轨。"}),
    liusan: character({ title: "柳三", tags: ["队长", "纸人", "情报"], region: "大京市", summary: "擅长情报和布局的顶级驭鬼者。", content: "非常适合作为关系图中的情报枢纽。"}),
    heyiner: character({ title: "何银儿", tags: ["队长", "招魂人", "太平古镇"], region: "太平古镇", summary: "太平古镇招魂人，可招魂已故强者。", content: "是民国传承与现代体系连接得最明显的人物之一。"}),
    fangshiming: character({ title: "方世明", tags: ["朋友圈", "鬼剪刀"], region: "大京市", summary: "朋友圈首领，杨间的重要敌手。", content: "他把总部内部斗争真正推向公开化。"}),
    zhangdong: character({ title: "张洞", tags: ["民国七老", "抹除"], region: "太平古镇", summary: "最强的民国七老之一。", content: "也是张羡光的父亲。"}),
    luoqian: character({ title: "罗千", tags: ["民国七老", "坟场", "坟土"], region: "大海市", summary: "坟场主，福寿园的重要源头人物。", content: "让坟场规则在现代世界落地。"}),
    sunrui: character({ title: "孙瑞", tags: ["鬼邮局", "管理者"], region: "鬼邮局", summary: "后成为鬼邮局新管理者。", content: "帮助鬼邮局线从闯关转向接管。"}),
    zhouzheng: character({ title: "周正", tags: ["负责人", "大昌市"], region: "大昌市", summary: "大昌市首任负责人，早期灾难的重要前因。", content: "其失控与遗留深刻影响了大昌市。"}),
    zhaokaiming: character({ title: "赵开明", tags: ["愿望鬼", "早期反派"], region: "大昌市", summary: "愿望鬼的载体，早期关键反派。", content: "代表与厉鬼交易的危险路线。"}),

    // 势力与档案
    headquarters: faction({ title: "总部", tags: ["亚洲总部", "制度中枢"], region: "大京市", summary: "国家级灵异处置与调度核心。", content: "王小明、曹延华、曹洋、沈良、赵建国，以及郭凡、钟山、陈义、徐放、张雷、苏凡、张一鸣等都可挂在这一体系下。"}),
    captainsPlan: faction({ title: "队长计划", tags: ["十二队长", "顶级战力"], region: "大京市", summary: "中后期最重要的战力框架。", content: "李军、卫景、柳三、李乐平、曹洋、何银儿、陆志文、何月莲、阿红等都属于这条线，杨间和叶真则是相关但更独立的顶级战力。"}),
    moments: faction({ title: "朋友圈", tags: ["内部敌对势力"], region: "大京市", summary: "总部内部最危险的敌对势力之一。", content: "方世明是首领，姜尚白、贺天雄、费总等人共同构成了持续性威胁。"}),
    kings: faction({ title: "国王组织", tags: ["西方势力", "战争"], region: "国外战场", summary: "后期试图掌控全球灵异的敌对组织。", content: "首领与幽灵船相关，传教士、屠夫、小丑、庄园主、挖墓人、银行家等都是其代表成员。"}),
    rescueClub: faction({ title: "救生会", tags: ["早期反派"], region: "大昌市", summary: "早期活跃的敌对团体。", content: "许峰、廖凡等人代表了灵异之外的人祸侧。"}),
    shangtongFaction: faction({ title: "尚通大厦势力", tags: ["杨间", "后期势力"], region: "大昌市", summary: "杨间后期建立的现实力量网络。", content: "标志他不再只是单点行动，而是开始经营自己的秩序。"}),
    messengers: faction({ title: "鬼邮局信使", tags: ["鬼邮局", "送信"], region: "鬼邮局", summary: "鬼邮局内部执行送信任务的群体。", content: "孙瑞、王善、杨小花、柳青青、老鹰等人物共同构成鬼邮局的人物生态。"}),
    taipingGuard: faction({ title: "太平古镇守旧派", tags: ["太平古镇", "民国"], region: "太平古镇", summary: "维持古镇旧秩序的群体。", content: "聂英平、张先、刘老板等人代表着古镇对外来者的保守立场。"}),

    knockEvent: eventEntry({ title: "鬼敲门事件", tags: ["前期", "大昌市"], region: "大昌市", summary: "杨间第一次真正接触灵异的起点事件。", content: "第七中学因此成为全书最具辨识度的开场舞台。"}),
    hungryEvent: eventEntry({ title: "饿死鬼事件", tags: ["中期", "S级"], region: "大昌市", summary: "导致大昌市全面封锁的 S 级事件。", content: "标志大昌市主线完成第一次真正的大规模升级。"}),
    paintingEvent: eventEntry({ title: "鬼画事件", tags: ["中期", "S级"], region: "大京市", summary: "鬼画与鬼差碰撞，王小明主导关押计划。", content: "它把总部研究线和高级别灾难完全绑在一起。"}),
    lakeEvent: eventEntry({ title: "鬼湖事件", tags: ["中后期", "S级"], region: "太平古镇", summary: "与古镇和民国体系强关联的 S 级事件。", content: "李阳等人物线也由此进一步展开。"}),
    kingWar: eventEntry({ title: "国王组织战争", tags: ["后期", "战争"], region: "国外战场", summary: "与国王组织爆发的顶级驭鬼者战争。", content: "双桥镇和香港等地成为关键战场。"}),
    postalRules: lore({ title: "鬼邮局规则档案", tags: ["规则", "鬼邮局"], region: "鬼邮局", summary: "概括鬼邮局五层结构和送信逻辑的档案。", content: "顶层涉及更深的民国隐秘和旧秩序。"}),
    republicSeven: lore({ title: "民国七老档案", tags: ["民国", "核心伏笔"], region: "太平古镇", summary: "后期世界观最关键的历史基底。", content: "张洞、孟小董、罗千、张伯华、李庆之、红姐等名字都可从这里继续展开。"}),
    peachGardenPlan: lore({ title: "桃源计划", tags: ["张羡光", "鬼画"], region: "鬼邮局", summary: "张羡光主导的高风险计划。", content: "它试图借鬼画制造灵异世界，动机和立场都非常复杂。"}),
    extraCast: lore({ title: "补充人物档案", tags: ["人物补充", "检索"], region: "大京市", summary: "把次级人物也纳入默认示例，方便后续继续拆分为独立节点。", content: "黄子雅、王斌、刘奇、孟小董、张伯华、李庆之、红姐、熊文文、刘小雨、张雅、郑飞、王欣、高志强、严力、叶枫、陈桥羊都已作为当前设定的一部分纳入样例语义。"}),
    importantGhosts: lore({ title: "重要厉鬼档案", tags: ["厉鬼", "规则"], region: "深层鬼域", summary: "将重要厉鬼集中成一份可检索档案。", content: "饿死鬼、鬼差、鬼画、鬼湖、鬼梦、鬼报纸、鬼橱、鬼镜、鬼绳、鬼公交、静悄悄、愿望鬼、找人鬼、哭坟鬼、回头鬼都可从这里继续拆分。"}),
    ghostMirror: item({ title: "鬼镜", tags: ["灵异物品", "复活"], region: "大昌市", summary: "带有复活性质的高风险灵异物品。", content: "它体现了灵异物品的双刃剑属性。"}),
    ghostScissors: item({ title: "鬼剪刀", tags: ["灵异物品", "方世明"], region: "大京市", summary: "方世明持有的重要灵异物品。", content: "是朋友圈威胁感的象征之一。"}),
    ghostNewspaper: item({ title: "鬼报纸", tags: ["灵异物品", "记忆"], region: "凯撒大酒店", summary: "可改写记忆的重要灵异物品。", content: "与凯撒大酒店探索线强相关。"}),
    goldenFinger: item({ title: "黄金手指", tags: ["灵异物品", "张伟"], region: "大昌市", summary: "张伟后期获得的灵异物品。", content: "它让张伟从普通人朋友进化为更有存在感的节点。"}),
  };

  function setAnchor(entryKey, regionKey, anchorIndex) {
    const currentEntry = entries[entryKey];
    const currentRegion = entries[regionKey];
    const currentAnchor = currentRegion?.anchors?.[anchorIndex];
    if (!currentEntry || !currentAnchor) return;
    currentEntry.region = currentRegion.title;
    currentEntry.anchorId = currentAnchor.id;
  }

  setAnchor("seventhSchool", "dachang", 0);
  setAnchor("guangjiang", "dachang", 1);
  setAnchor("shangtongTower", "dachang", 2);
  setAnchor("trainingBase", "dajing", 0);
  setAnchor("headquartersHall", "dajing", 1);
  setAnchor("wangLab", "dajing", 2);
  setAnchor("fortuneGarden", "dahai", 0);
  setAnchor("ghostTemple", "deepDomain", 0);
  setAnchor("ghostStreet", "deepDomain", 1);
  setAnchor("baishuiTown", "deepDomain", 2);
  setAnchor("doubleBridgeTown", "overseas", 0);
  setAnchor("yangjian", "dachang", 2);
  setAnchor("zhangwei", "dachang", 1);
  setAnchor("wangshanshan", "dachang", 1);
  setAnchor("tongqian", "dachang", 1);
  setAnchor("fengquan", "dachang", 1);
  setAnchor("liyang", "dachang", 2);
  setAnchor("wangxiaoming", "dajing", 2);
  setAnchor("caoyanhua", "dajing", 1);
  setAnchor("lijun", "dajing", 0);
  setAnchor("weijing", "dajing", 0);
  setAnchor("liusan", "dajing", 1);
  setAnchor("heyiner", "taiping", 0);
  setAnchor("fangshiming", "dajing", 1);
  setAnchor("zhangdong", "taiping", 1);
  setAnchor("luoqian", "dahai", 1);
  setAnchor("sunrui", "ghostPost", 0);
  setAnchor("zhangxianguang", "ghostPost", 1);
  setAnchor("zhouzheng", "dachang", 0);
  setAnchor("zhaokaiming", "dachang", 1);

  function connect(sourceKey, targetKey, type) {
    const sourceEntry = entries[sourceKey];
    const targetEntry = entries[targetKey];
    if (!sourceEntry || !targetEntry) return;
    sourceEntry.relations.push({ id: createId("relation"), targetId: targetEntry.id, type });
  }

  connect("yangjian", "seventhSchool", "起于");
  connect("yangjian", "guangjiang", "驻守于");
  connect("yangjian", "shangtongTower", "建立势力于");
  connect("yangjian", "ghostPost", "接管");
  connect("yangjian", "taiping", "探索");
  connect("yangjian", "kings", "对抗");
  connect("zhangwei", "yangjian", "死党");
  connect("zhangwei", "goldenFinger", "获得");
  connect("wangshanshan", "yangjian", "特殊联系");
  connect("tongqian", "yangjian", "队友");
  connect("fengquan", "yangjian", "合作");
  connect("liyang", "yangjian", "得力干将");
  connect("zhangxianguang", "peachGardenPlan", "主导");
  connect("zhangxianguang", "zhangdong", "父子");
  connect("wangxiaoming", "headquarters", "核心智囊");
  connect("caoyanhua", "headquarters", "统筹");
  connect("lijun", "captainsPlan", "队长成员");
  connect("weijing", "captainsPlan", "队长成员");
  connect("liusan", "captainsPlan", "队长成员");
  connect("heyiner", "captainsPlan", "队长成员");
  connect("yangjian", "captainsPlan", "顶级战力");
  connect("fangshiming", "moments", "首领");
  connect("moments", "headquarters", "内部对抗");
  connect("kings", "doubleBridgeTown", "主战场之一");
  connect("kings", "kingWar", "发动");
  connect("sunrui", "messengers", "管理");
  connect("postalRules", "ghostPost", "定义规则");
  connect("republicSeven", "zhangdong", "收录");
  connect("republicSeven", "luoqian", "收录");
  connect("taipingGuard", "taiping", "维护旧秩序于");
  connect("knockEvent", "seventhSchool", "发生于");
  connect("knockEvent", "yangjian", "改变命运");
  connect("hungryEvent", "dachang", "封锁于");
  connect("paintingEvent", "wangxiaoming", "主导关押");
  connect("lakeEvent", "liyang", "促成加入");
  connect("kingWar", "kings", "对抗对象");
  connect("kingWar", "yangjian", "主导反攻");
  connect("ghostMirror", "knockEvent", "前期呼应");
  connect("ghostScissors", "fangshiming", "持有于");
  connect("ghostNewspaper", "caesar", "出没于");

  return Object.values(entries);
}
