/**
 * utils 只放纯函数和通用小工具。
 * 这层不依赖 DOM，也不直接读写状态，便于后续迁移和复用。
 */

/**
 * 本地 ID 使用“时间片段 + 随机片段”，对当前单机项目已经足够。
 */
export function createId(prefix = "entry") {
  const timePart = Date.now().toString(36);
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${timePart}_${randomPart}`;
}

/**
 * 所有时间统一生成 ISO 字符串，便于存储、排序和迁移。
 */
export function nowIso() {
  return new Date().toISOString();
}

/**
 * 显示层使用中文时间格式，和内部存储格式明确分离。
 */
export function formatDateTime(value) {
  if (!value) {
    return "尚未记录";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "时间无效";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * 逗号分隔输入统一在这里清洗。
 */
export function parseDelimitedList(rawValue) {
  return Array.from(
    new Set(
      String(rawValue)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

/**
 * 标签与别名目前复用同一套清洗规则。
 */
export function parseTags(rawValue) {
  return parseDelimitedList(rawValue);
}

/**
 * 别名字段同样使用逗号分隔输入。
 */
export function parseAliases(rawValue) {
  return parseDelimitedList(rawValue);
}

/**
 * 坐标值限制在合理区间，防止标记飞出地图。
 */
export function clampToRange(rawValue, min, max, fallbackValue) {
  const numberValue = Number(rawValue);

  if (Number.isNaN(numberValue)) {
    return fallbackValue;
  }

  return Math.min(max, Math.max(min, numberValue));
}

/**
 * 列表默认按更新时间倒序。
 */
export function sortEntriesByUpdatedAt(entries) {
  return [...entries].sort((left, right) => {
    const leftTime = new Date(left.updatedAt).getTime();
    const rightTime = new Date(right.updatedAt).getTime();
    return rightTime - leftTime;
  });
}

/**
 * 从时间点文案里推断排序值。
 * 如果用户手动填写排序值，就优先使用手动值。
 * 如果没填，则尝试从时间点里提取数字，例如“1324 年”“第 2 纪元”。
 * 如果仍然无法提取，就使用回退值，保证事件仍然能进入序列。
 */
export function resolveTimelineSortValue(pointLabel, rawSortValue, fallbackValue) {
  const directNumber = Number(rawSortValue);

  if (!Number.isNaN(directNumber) && String(rawSortValue).trim() !== "") {
    return directNumber;
  }

  const normalizedPoint = String(pointLabel || "");
  const matchedNumber = normalizedPoint.match(/-?\d+(?:\.\d+)?/);

  if (matchedNumber) {
    return Number(matchedNumber[0]);
  }

  return fallbackValue;
}

/**
 * 时间轴事件按排序值升序排列，同排序值时按创建时间和标题兜底。
 */
export function sortTimelineEvents(events) {
  return [...events].sort((left, right) => {
    if (left.sortValue !== right.sortValue) {
      return left.sortValue - right.sortValue;
    }

    const leftTime = new Date(left.createdAt || 0).getTime();
    const rightTime = new Date(right.createdAt || 0).getTime();

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return String(left.title).localeCompare(String(right.title), "zh-CN");
  });
}

/**
 * 当前原型先使用轻量全文包含匹配，够快也够直接。
 * 时间轴内容也会被纳入检索，这样年代与事件说明也能被搜到。
 */
export function filterEntries(entries, searchText) {
  const normalizedSearchText = String(searchText).trim().toLowerCase();

  if (!normalizedSearchText) {
    return entries;
  }

  return entries.filter((entry) => {
    const timelineText = (entry.timelineEvents || [])
      .flatMap((event) => [event.pointLabel, event.title, event.description])
      .join("\n");

    const mergedText = [
      entry.title,
      entry.summary,
      entry.content,
      entry.notes,
      entry.region,
      entry.condition,
      entry.occupants,
      timelineText,
      ...(entry.tags ?? []),
      ...(entry.aliases ?? []),
    ]
      .join("\n")
      .toLowerCase();

    return mergedText.includes(normalizedSearchText);
  });
}

/**
 * 导出直接使用浏览器 Blob 下载，保持零依赖。
 */
export function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * 导入 JSON 时把 FileReader 封装成 Promise，方便状态层使用 async/await。
 */
export function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)));
      } catch {
        reject(new Error("JSON 解析失败，请检查文件格式。"));
      }
    };

    reader.onerror = () => {
      reject(new Error("文件读取失败，请稍后重试。"));
    };

    reader.readAsText(file, "utf-8");
  });
}

/**
 * 条目工厂统一提供稳定默认结构。
 */
export function createEmptyEntry(type = "location") {
  const now = nowIso();

  return {
    id: createId(type),
    type,
    title: "未命名条目",
    aliases: [],
    tags: [],
    region: "",
    condition: "",
    occupants: "",
    summary: "",
    imageUrl: "",
    content: "",
    notes: "",
    mapPosition: {
      x: 50,
      y: 50,
    },
    regionShape: {
      top: 32,
      left: 38,
      width: 24,
      height: 18,
      rotation: 0,
    },
    anchors: [],
    anchorId: "",
    relations: [],
    timelineEvents: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 世界级时间轴用于承载“超出单条目范围的大事件”，
 * 这样单个条目时间轴和整个世界的历史脉络就能同时存在。
 */
export function createMysteryRevivalDemoProjectTimeline() {
  const now = nowIso();

  return sortTimelineEvents([
    {
      id: createId("timeline"),
      pointLabel: "灵异复苏早期",
      title: "各地灵异事件开始频发",
      description:
        "世界各地的灵异事件逐渐增加，传统科学体系无法完整解释，社会秩序开始出现裂缝。",
      sortValue: 0,
      createdAt: now,
    },
    {
      id: createId("timeline"),
      pointLabel: "总部成立期",
      title: "国家级灵异处置体系确立",
      description:
        "各类灵异档案、驭鬼者调度与国防级事件应对机制逐步整合成型，总部成为世界级设定的核心节点。",
      sortValue: 30,
      createdAt: now,
    },
    {
      id: createId("timeline"),
      pointLabel: "大昌市事件后",
      title: "杨间登场后，地方与总部的关系开始重组",
      description:
        "以大昌市为代表的地方灵异事件，推动了整个世界观里人物、力量与规则体系的重新组织。",
      sortValue: 60,
      createdAt: now,
    },
    {
      id: createId("timeline"),
      pointLabel: "鬼邮局线开启",
      title: "更深层的灵异规则网络被逐步揭开",
      description:
        "随着鬼邮局线、信使体系和多地工作点被连接，世界观开始具备更强的全局性和层级感。",
      sortValue: 90,
      createdAt: now,
    },
  ]);
}

/**
 * 示例数据继续沿用接近公开演示的命名风格，
 * 同时给核心条目补上一小段时间轴，便于验证新能力。
 */
export function createDemoEntries() {
  const now = nowIso();

  const regionVelthorn = {
    ...createEmptyEntry("region"),
    id: createId("region"),
    title: "Velthorn Basin",
    aliases: ["The Basin"],
    tags: ["region", "basin", "watch"],
    condition: "争夺加剧",
    occupants: "灰塔守望与多方拾荒队",
    summary: "一个被旧通信塔、山谷风道与断裂贸易路共同定义的盆地区域，也是多个势力试图重新控制的高地枢纽。",
    content:
      "Velthorn Basin 连接北方高地与旧贸易塔链，地形破碎但视野开阔。任何掌握这里的人，都能更早发现沿线移动与风暴变化。",
    notes: "适合作为第一批区域条目，用来承接地点、角色与组织的共同上位语境。",
    anchors: [
      {
        id: createId("anchor"),
        label: "灰塔山口",
        x: 64,
        y: 28,
        notes: "北侧视野最好，适合布设观测哨。",
        createdAt: now,
      },
      {
        id: createId("anchor"),
        label: "断裂商路",
        x: 42,
        y: 62,
        notes: "旧贸易线残段，常成为拾荒队与商队的交汇点。",
        createdAt: now,
      },
    ],
    timelineEvents: [
      {
        id: createId("timeline"),
        pointLabel: "1170 年",
        title: "盆地观测线建立",
        description: "北侧高地开始布设最早一批观测与警戒装置。",
        sortValue: 1170,
        createdAt: now,
      },
      {
        id: createId("timeline"),
        pointLabel: "1211 年",
        title: "洪灾后的势力真空",
        description: "旧维护链条断裂，盆地变成多个组织争夺的交通制高点。",
        sortValue: 1211,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const regionSaltbound = {
    ...createEmptyEntry("region"),
    id: createId("region"),
    title: "Saltbound Coast",
    aliases: ["The Saltbound"],
    tags: ["region", "coast", "trade"],
    condition: "航运繁忙",
    occupants: "商人、走私者与沿岸驻军",
    summary: "一条被盐雾、港口税则与沿岸协定共同塑造的海岸带，也是公开交易与灰色流通同时存在的缓冲地带。",
    content:
      "Saltbound Coast 的价值不只来自港口，更来自它连接内陆废墟、沿岸市场与旧法条体系的能力。",
    notes: "适合作为后续港口经济、海岸法则和物流线路的总区域节点。",
    anchors: [
      {
        id: createId("anchor"),
        label: "赤潮码头",
        x: 36,
        y: 72,
        notes: "适合停泊与交易，也是情报最密集的地带。",
        createdAt: now,
      },
      {
        id: createId("anchor"),
        label: "盐雾哨站",
        x: 68,
        y: 34,
        notes: "沿岸法令与巡逻的象征性节点。",
        createdAt: now,
      },
    ],
    timelineEvents: [
      {
        id: createId("timeline"),
        pointLabel: "1191 年",
        title: "沿岸协定成形",
        description: "区域性的税则与遗迹归属规则开始成文。",
        sortValue: 1191,
        createdAt: now,
      },
      {
        id: createId("timeline"),
        pointLabel: "1204 年",
        title: "港务扩张潮",
        description: "多个港口与中转站被重新整修，海岸带影响力显著上升。",
        sortValue: 1204,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const regionLowerBasin = {
    ...createEmptyEntry("region"),
    id: createId("region"),
    title: "Lower Basin",
    aliases: ["South Sink"],
    tags: ["region", "basin", "expedition"],
    condition: "持续扩张",
    occupants: "远征队、工坊与临时营地",
    summary: "Lower Basin 是更适合驻扎和扩张的低地盆区，也是许多重启计划和回收队伍的落脚点。",
    content:
      "与高地盆区相比，这里更适合中长期驻扎，因此天然会吸引具备制造与组织能力的派系。",
    notes: "后续如果加入资源系统或据点系统，这里会非常关键。",
    anchors: [
      {
        id: createId("anchor"),
        label: "黄铜工坊带",
        x: 58,
        y: 52,
        notes: "Brass Collective 的整备与扩张中心。",
        createdAt: now,
      },
    ],
    timelineEvents: [
      {
        id: createId("timeline"),
        pointLabel: "1208 年",
        title: "远征工坊成带",
        description: "多个临时工坊和整备点沿低地盆区分布成线。",
        sortValue: 1208,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const locKethvari = {
    ...createEmptyEntry("location"),
    id: createId("location"),
    title: "Kethvari Outlook",
    aliases: ["The Spire"],
    tags: ["tower", "trade-route", "ruin"],
    region: "Velthorn Basin",
    condition: "Partial collapse",
    occupants: "Disputed",
    summary: "一座曾用于远程通讯的信号塔，如今成为争夺遗物与地理视野的焦点。",
    content:
      "这座信号塔原本服务于 Kethvari 贸易航线，盆地洪灾后被遗弃。上层仍保留可运转的黄铜通讯装置，因此依旧具有战略价值。",
    notes:
      "三方势力都在争夺这里的残余资产。下层已被改造成临时补给点，上层仪器仍可作为世界观关键线索使用。",
    mapPosition: { x: 67, y: 34 },
    timelineEvents: [
      {
        id: createId("timeline"),
        pointLabel: "1182 年",
        title: "信号塔启用",
        description: "Kethvari 航线的远程通讯节点正式投入使用。",
        sortValue: 1182,
        createdAt: now,
      },
      {
        id: createId("timeline"),
        pointLabel: "1211 年",
        title: "盆地洪灾后废弃",
        description: "主要维护队伍撤离，塔体进入半废墟状态。",
        sortValue: 1211,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const locRedwake = {
    ...createEmptyEntry("location"),
    id: createId("location"),
    title: "Redwake Harbor",
    aliases: ["The Redwake"],
    tags: ["port", "market", "coast"],
    region: "Saltbound Coast",
    condition: "Crowded",
    occupants: "Merchants & smugglers",
    summary: "盐雾海岸最繁忙的港口之一，也是多派系交易和情报流通的交点。",
    content:
      "表面上它是一座通商港，实际上它同时承载灰色航运、临时驻军集结和地方法规执行。",
    notes: "如果以后要做地图热区和经济线，这里会是很好的起点之一。",
    mapPosition: { x: 24, y: 73 },
    timelineEvents: [
      {
        id: createId("timeline"),
        pointLabel: "1204 年",
        title: "港务扩建",
        description: "Redwake 成为沿岸贸易新的中转中心。",
        sortValue: 1204,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const charEdda = {
    ...createEmptyEntry("character"),
    id: createId("character"),
    title: "Edda Voss",
    aliases: ["Grey Warden"],
    tags: ["watch", "north", "signal"],
    region: "Velthorn Basin",
    condition: "Vigilant",
    occupants: "Grey Tower Watch",
    summary: "驻守于灰塔一带的守望者，对海雾、边境与旧信号线极其熟悉。",
    content:
      "她被派来维护仍然可用的观测设备，并监视围绕 Kethvari Outlook 聚集的各方势力。",
    notes: "她很适合作为关系图和 Wiki 视图里的角色中心点。",
    mapPosition: { x: 61, y: 42 },
    timelineEvents: [
      {
        id: createId("timeline"),
        pointLabel: "1215 年",
        title: "接管灰塔守望",
        description: "Edda 被正式派往盆地北侧负责观测与警戒。",
        sortValue: 1215,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const facMirewalkers = {
    ...createEmptyEntry("faction"),
    id: createId("faction"),
    title: "Mirewalkers",
    aliases: ["The Mirewalkers"],
    tags: ["salvage", "marsh", "route"],
    region: "Saltbound Coast",
    condition: "Fragmented",
    occupants: "Waystation crews",
    summary: "熟悉泥沼与废墟线路的拾荒派系，经常先于官方力量抵达遗迹现场。",
    content:
      "他们依靠对古旧路网和水位变化的认知行动，在废墟探索和短程补给方面具备天然优势。",
    notes: "和 Brass Collective 的冲突适合拿来测试关系图视图。",
    mapPosition: { x: 56, y: 57 },
    timelineEvents: [
      {
        id: createId("timeline"),
        pointLabel: "1198 年",
        title: "泥沼路线同盟形成",
        description: "多个临时拾荒队伍开始共享水位与路网信息。",
        sortValue: 1198,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const facBrassCollective = {
    ...createEmptyEntry("faction"),
    id: createId("faction"),
    title: "Brass Collective",
    aliases: ["The Brass"],
    tags: ["instruments", "salvage", "guild"],
    region: "Lower Basin",
    condition: "Expanding",
    occupants: "Expedition teams",
    summary: "以回收和重启旧时代黄铜仪器为目标的组织，对通讯遗物极其执着。",
    content:
      "他们拥有更稳定的资金和制造能力，但对遗址的占有方式也更激进，常与地方势力产生摩擦。",
    notes: "后续如果加入资源系统，它会是一个很好的长期对手阵营。",
    mapPosition: { x: 78, y: 49 },
    timelineEvents: [
      {
        id: createId("timeline"),
        pointLabel: "1208 年",
        title: "黄铜再启计划",
        description: "组织公开宣布重启旧仪器网络的长期目标。",
        sortValue: 1208,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const loreBlairAccords = {
    ...createEmptyEntry("lore"),
    id: createId("lore"),
    title: "The Blair Accords",
    aliases: ["Blair Compact"],
    tags: ["treaty", "law", "coast"],
    region: "Saltbound Coast",
    condition: "Contested",
    occupants: "Regional signatories",
    summary: "一份本该稳定沿海贸易和遗迹开采秩序的旧协定，如今反而成为争议来源。",
    content:
      "这项协定规定了部分遗物与港口关税的归属，但随着地理与势力格局变化，它越来越像一个被各方选择性引用的工具。",
    notes: "非常适合作为世界观条目和派系、地点、事件的连接枢纽。",
    mapPosition: { x: 35, y: 60 },
    timelineEvents: [
      {
        id: createId("timeline"),
        pointLabel: "1191 年",
        title: "协定签署",
        description: "沿海贸易与遗迹归属第一次被写入统一文本。",
        sortValue: 1191,
        createdAt: now,
      },
      {
        id: createId("timeline"),
        pointLabel: "1219 年",
        title: "协定争议升级",
        description: "多方开始选择性引用条款，协定本身变成冲突来源。",
        sortValue: 1219,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  locKethvari.anchorId = regionVelthorn.anchors[0].id;
  charEdda.anchorId = regionVelthorn.anchors[1].id;
  locRedwake.anchorId = regionSaltbound.anchors[0].id;
  facMirewalkers.anchorId = regionSaltbound.anchors[1].id;
  facBrassCollective.anchorId = regionLowerBasin.anchors[0].id;

  locKethvari.relations = [
    { id: createId("relation"), targetId: regionVelthorn.id, type: "位于" },
    { id: createId("relation"), targetId: facMirewalkers.id, type: "被占据" },
    { id: createId("relation"), targetId: facBrassCollective.id, type: "被宣称拥有" },
    { id: createId("relation"), targetId: charEdda.id, type: "由其守望" },
  ];

  locRedwake.relations = [
    { id: createId("relation"), targetId: regionSaltbound.id, type: "位于" },
    { id: createId("relation"), targetId: loreBlairAccords.id, type: "受其约束" },
  ];

  charEdda.relations = [
    { id: createId("relation"), targetId: regionVelthorn.id, type: "驻守于" },
    { id: createId("relation"), targetId: locKethvari.id, type: "守护" },
    { id: createId("relation"), targetId: facMirewalkers.id, type: "谈判" },
  ];

  facMirewalkers.relations = [
    { id: createId("relation"), targetId: regionSaltbound.id, type: "活动于" },
    { id: createId("relation"), targetId: locKethvari.id, type: "占据" },
    { id: createId("relation"), targetId: facBrassCollective.id, type: "竞争" },
  ];

  facBrassCollective.relations = [
    { id: createId("relation"), targetId: regionLowerBasin.id, type: "扎根于" },
    { id: createId("relation"), targetId: locKethvari.id, type: "宣称拥有" },
    { id: createId("relation"), targetId: facMirewalkers.id, type: "竞争" },
  ];

  loreBlairAccords.relations = [
    { id: createId("relation"), targetId: regionSaltbound.id, type: "规范" },
    { id: createId("relation"), targetId: locRedwake.id, type: "塑造" },
  ];

  regionVelthorn.relations = [
    { id: createId("relation"), targetId: locKethvari.id, type: "包含" },
    { id: createId("relation"), targetId: charEdda.id, type: "容纳" },
  ];

  regionSaltbound.relations = [
    { id: createId("relation"), targetId: locRedwake.id, type: "包含" },
    { id: createId("relation"), targetId: facMirewalkers.id, type: "活跃其间" },
    { id: createId("relation"), targetId: loreBlairAccords.id, type: "受其影响" },
  ];

  regionLowerBasin.relations = [
    { id: createId("relation"), targetId: facBrassCollective.id, type: "支撑扩张" },
  ];

  return [
    regionVelthorn,
    regionSaltbound,
    regionLowerBasin,
    locKethvari,
    locRedwake,
    charEdda,
    facMirewalkers,
    facBrassCollective,
    loreBlairAccords,
  ];
}

/**
 * 《神秘复苏》示例数据。
 * 这套数据用于把当前原型直接切换到更贴近中文都市灵异小说的创作语境。
 */
export function createMysteryRevivalDemoEntries() {
  const now = nowIso();

  const regionDachang = {
    ...createEmptyEntry("region"),
    id: createId("region"),
    title: "大昌市",
    aliases: ["大昌", "鬼眼刑警辖区"],
    tags: ["城市", "灵异事件", "鬼眼"],
    condition: "高风险封控",
    occupants: "杨间与当地驭鬼者",
    summary: "大昌市是《神秘复苏》里最早全面失控的城市之一，也是杨间正式踏入灵异世界后的核心辖区。",
    content:
      "这座城市汇聚了校园灵异事件、老城区失控鬼域与后续驭鬼者接管等多条主线。许多重要人物、档案和灵异源头都能从这里往外发散。",
    notes: "适合作为示例工程的主区域，用来承接主角、据点、事件档案和总部协作关系。",
    anchors: [
      {
        id: createId("anchor"),
        label: "观江小区",
        x: 58,
        y: 62,
        notes: "杨间在大昌市的重要据点，适合挂靠核心人物与行动线。",
        createdAt: now,
      },
      {
        id: createId("anchor"),
        label: "第七中学旧址",
        x: 42,
        y: 34,
        notes: "敲门鬼事件的关键起点，适合放置早期事件和档案线索。",
        createdAt: now,
      },
    ],
    timelineEvents: [
      {
        id: createId("timeline"),
        pointLabel: "早期篇章",
        title: "七中灵异事件爆发",
        description: "大昌市第七中学的灵异事件成为世界观的重要引线，也让杨间正式卷入驭鬼者体系。",
        sortValue: 10,
        createdAt: now,
      },
      {
        id: createId("timeline"),
        pointLabel: "后续接管期",
        title: "鬼眼刑警开始驻守",
        description: "随着城市失控程度提高，大昌市逐渐被纳入主角主导的高压处理状态。",
        sortValue: 20,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const regionDajing = {
    ...createEmptyEntry("region"),
    id: createId("region"),
    title: "大京市",
    aliases: ["总部辖区"],
    tags: ["总部", "研究", "中枢"],
    condition: "重度戒备",
    occupants: "总部与研究人员",
    summary: "大京市是总部和研究体系的核心区域，许多决策、档案与实验都围绕这里展开。",
    content:
      "与大昌市的前线处置不同，大京市承担了资料归档、灵异研究、协同调度和高层博弈等功能，是整个世界观的中枢地带。",
    notes: "这个区域更适合挂靠组织条目、研究节点和高层协作关系。",
    anchors: [
      {
        id: createId("anchor"),
        label: "总部实验区",
        x: 46,
        y: 44,
        notes: "用于放置总部、研究档案和实验性事件。",
        createdAt: now,
      },
      {
        id: createId("anchor"),
        label: "联络指挥中心",
        x: 68,
        y: 56,
        notes: "适合表现总部的调度、联络和应急支援网络。",
        createdAt: now,
      },
    ],
    timelineEvents: [
      {
        id: createId("timeline"),
        pointLabel: "体系建立期",
        title: "总部应急体系成形",
        description: "随着灵异事件频发，总部逐渐形成面向全国的压制、联络与研究体系。",
        sortValue: 10,
        createdAt: now,
      },
      {
        id: createId("timeline"),
        pointLabel: "冲突升级期",
        title: "总部与前线关系紧张",
        description: "在实际压制与资源调度中，总部与一线驭鬼者之间出现明显张力。",
        sortValue: 20,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const regionGhostPost = {
    ...createEmptyEntry("region"),
    id: createId("region"),
    title: "鬼邮局线路",
    aliases: ["鬼邮局", "邮局任务线"],
    tags: ["鬼邮局", "信使", "任务"],
    condition: "封闭循环",
    occupants: "历代信使与涉入者",
    summary: "鬼邮局线路承载了一整套独立又危险的灵异任务体系，是小说里极具代表性的中后期设定。",
    content:
      "这条线路不依附于单一城市，而是以邮局楼层、信件任务和信使秩序为核心，形成了另一条高度封闭的灵异规则链。",
    notes: "适合承接任务制结构、层级晋升和多人物交错关系。",
    anchors: [
      {
        id: createId("anchor"),
        label: "邮局大厅",
        x: 38,
        y: 58,
        notes: "信使聚集与任务开始的节点。",
        createdAt: now,
      },
      {
        id: createId("anchor"),
        label: "四楼走廊",
        x: 66,
        y: 30,
        notes: "高层信件任务与旧信使秩序冲突最集中的区域。",
        createdAt: now,
      },
    ],
    timelineEvents: [
      {
        id: createId("timeline"),
        pointLabel: "中期篇章",
        title: "邮局任务线浮出水面",
        description: "鬼邮局不再只是传闻，而是以具体任务和楼层规则进入主线叙事。",
        sortValue: 10,
        createdAt: now,
      },
      {
        id: createId("timeline"),
        pointLabel: "后期冲突",
        title: "旧信使秩序崩塌",
        description: "随着更深层任务推进，鬼邮局内部长期维持的规则开始失效并走向全面冲突。",
        sortValue: 20,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const locSeventhMiddleSchool = {
    ...createEmptyEntry("location"),
    id: createId("location"),
    title: "大昌市第七中学",
    aliases: ["七中旧址"],
    tags: ["校园", "敲门鬼", "起点"],
    region: "大昌市",
    condition: "封锁废弃",
    occupants: "灵异残留",
    summary: "大昌市第七中学是许多读者记住《神秘复苏》的第一现场，也是主角故事真正开始的地方。",
    content:
      "校园事件让日常秩序第一次被灵异规则打断，也在示例工程里承担“起始事件地点”的角色，非常适合作为地图与百科的早期中心。",
    notes: "适合挂靠事件档案、早期人物命运转折与敲门鬼相关线索。",
    mapPosition: { x: 46, y: 32 },
    timelineEvents: [
      {
        id: createId("timeline"),
        pointLabel: "故事开端",
        title: "敲门鬼事件在校园爆发",
        description: "七中事件让普通校园环境瞬间失控，也直接推动杨间完成最初的生死转折。",
        sortValue: 10,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const locGuangjiang = {
    ...createEmptyEntry("location"),
    id: createId("location"),
    title: "观江小区",
    aliases: ["观江住处"],
    tags: ["据点", "驻守", "大昌市"],
    region: "大昌市",
    condition: "高度警戒",
    occupants: "杨间及协作人员",
    summary: "观江小区是杨间在大昌市的重要活动据点，也很适合在示例里承担“主角中心基地”的作用。",
    content:
      "它同时具备生活空间、事件处理节点和角色关系汇聚点三种功能，用来串起人物、组织和区域十分自然。",
    notes: "适合作为地图上最稳定的锚点之一，让多条人物关系落在同一位置。",
    mapPosition: { x: 61, y: 58 },
    timelineEvents: [
      {
        id: createId("timeline"),
        pointLabel: "驻守阶段",
        title: "观江小区成为稳定据点",
        description: "随着大昌市局势变化，这里逐渐承担起主角活动与事件应对的核心落点。",
        sortValue: 20,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const charYangJian = {
    ...createEmptyEntry("character"),
    id: createId("character"),
    title: "杨间",
    aliases: ["鬼眼杨间"],
    tags: ["主角", "鬼眼", "刑警"],
    region: "大昌市",
    condition: "高压维持平衡",
    occupants: "鬼眼体系",
    summary: "杨间是《神秘复苏》的核心人物，几乎所有重要区域、事件和组织关系都可以通过他串联起来。",
    content:
      "他兼具主角、处理者、对抗者和秩序建立者多重身份，非常适合作为示例工程中关系图的中心节点。",
    notes: "如果后续继续扩展示例，优先围绕杨间补充人物、城市和事件会最稳定。",
    mapPosition: { x: 58, y: 62 },
    timelineEvents: [
      {
        id: createId("timeline"),
        pointLabel: "故事开端",
        title: "获得鬼眼并活下来",
        description: "杨间在最早的灵异事件中完成生死蜕变，正式成为这套世界观里最关键的人物之一。",
        sortValue: 10,
        createdAt: now,
      },
      {
        id: createId("timeline"),
        pointLabel: "中期阶段",
        title: "接管大昌市秩序",
        description: "从求生者变成处理者后，杨间开始主动接管城市与灵异事件的平衡。",
        sortValue: 20,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const facHeadquarters = {
    ...createEmptyEntry("faction"),
    id: createId("faction"),
    title: "总部",
    aliases: ["灵异应对总部"],
    tags: ["组织", "调度", "研究"],
    region: "大京市",
    condition: "高压运转",
    occupants: "研究人员与接线体系",
    summary: "总部是应对灵异事件的中枢组织，承担调度、归档、研究与统筹等职责。",
    content:
      "它既是前线驭鬼者的重要支撑，也是冲突和博弈最密集的制度中心，在示例中很适合作为组织主轴。",
    notes: "适合持续扩充为多部门、多角色的复杂组织模型。",
    mapPosition: { x: 34, y: 28 },
    timelineEvents: [
      {
        id: createId("timeline"),
        pointLabel: "体系建立期",
        title: "总部完成全国性接管框架",
        description: "从被动应对转向建立联络、归档与研究系统后，总部成为世界观最强组织节点之一。",
        sortValue: 10,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const facMessengers = {
    ...createEmptyEntry("faction"),
    id: createId("faction"),
    title: "鬼邮局信使",
    aliases: ["信使群体"],
    tags: ["鬼邮局", "任务", "楼层"],
    region: "鬼邮局线路",
    condition: "秩序瓦解",
    occupants: "历代信使",
    summary: "鬼邮局信使构成了另一套独立运行的灵异行动体系，他们的规则与总部体系并不相同。",
    content:
      "信使之间既合作又彼此提防，任务与楼层规则使他们形成一种极不稳定但非常鲜明的群体关系。",
    notes: "适合继续扩展成人物群像和楼层任务结构。",
    mapPosition: { x: 72, y: 26 },
    timelineEvents: [
      {
        id: createId("timeline"),
        pointLabel: "任务深入期",
        title: "信使秩序开始崩坏",
        description: "随着更深层任务暴露，邮局内部长期维持的等级和平衡逐步失效。",
        sortValue: 10,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  const loreKnockingGhost = {
    ...createEmptyEntry("lore"),
    id: createId("lore"),
    title: "敲门鬼事件档案",
    aliases: ["七中档案"],
    tags: ["档案", "敲门鬼", "早期事件"],
    region: "大昌市",
    condition: "一级关注",
    occupants: "总部档案系统",
    summary: "敲门鬼事件档案记录了最具代表性的早期灵异事件之一，也是串联杨间、大昌市和总部的核心设定条目。",
    content:
      "它既是情报节点，也是世界观规则节点。通过这份档案可以把地点、角色、组织与事件发展很自然地连接起来。",
    notes: "很适合作为设定条目，测试百科、关系图与时间轴之间的联动。",
    mapPosition: { x: 41, y: 36 },
    timelineEvents: [
      {
        id: createId("timeline"),
        pointLabel: "事件归档期",
        title: "总部完成初步归档",
        description: "随着事件信息被逐步收集，敲门鬼相关记录成为多个后续事件的参照基础。",
        sortValue: 10,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  locSeventhMiddleSchool.anchorId = regionDachang.anchors[1].id;
  locGuangjiang.anchorId = regionDachang.anchors[0].id;
  charYangJian.anchorId = regionDachang.anchors[0].id;
  facHeadquarters.anchorId = regionDajing.anchors[0].id;
  facMessengers.anchorId = regionGhostPost.anchors[0].id;
  loreKnockingGhost.anchorId = regionDachang.anchors[1].id;

  locSeventhMiddleSchool.relations = [
    { id: createId("relation"), targetId: regionDachang.id, type: "位于" },
    { id: createId("relation"), targetId: loreKnockingGhost.id, type: "被其记录" },
    { id: createId("relation"), targetId: charYangJian.id, type: "改变其命运" },
  ];

  locGuangjiang.relations = [
    { id: createId("relation"), targetId: regionDachang.id, type: "位于" },
    { id: createId("relation"), targetId: charYangJian.id, type: "由其驻守" },
    { id: createId("relation"), targetId: facHeadquarters.id, type: "与其联动" },
  ];

  charYangJian.relations = [
    { id: createId("relation"), targetId: regionDachang.id, type: "驻守" },
    { id: createId("relation"), targetId: locGuangjiang.id, type: "掌控据点" },
    { id: createId("relation"), targetId: facHeadquarters.id, type: "合作又对立" },
    { id: createId("relation"), targetId: facMessengers.id, type: "介入其任务线" },
  ];

  facHeadquarters.relations = [
    { id: createId("relation"), targetId: regionDajing.id, type: "设于" },
    { id: createId("relation"), targetId: loreKnockingGhost.id, type: "归档" },
    { id: createId("relation"), targetId: charYangJian.id, type: "调度" },
  ];

  facMessengers.relations = [
    { id: createId("relation"), targetId: regionGhostPost.id, type: "活跃于" },
    { id: createId("relation"), targetId: charYangJian.id, type: "与其交汇" },
  ];

  loreKnockingGhost.relations = [
    { id: createId("relation"), targetId: locSeventhMiddleSchool.id, type: "源于" },
    { id: createId("relation"), targetId: facHeadquarters.id, type: "由其归档" },
    { id: createId("relation"), targetId: charYangJian.id, type: "推动其觉醒" },
  ];

  regionDachang.relations = [
    { id: createId("relation"), targetId: locSeventhMiddleSchool.id, type: "包含" },
    { id: createId("relation"), targetId: locGuangjiang.id, type: "容纳" },
    { id: createId("relation"), targetId: charYangJian.id, type: "由其镇守" },
  ];

  regionDajing.relations = [
    { id: createId("relation"), targetId: facHeadquarters.id, type: "承载" },
  ];

  regionGhostPost.relations = [
    { id: createId("relation"), targetId: facMessengers.id, type: "容纳" },
    { id: createId("relation"), targetId: charYangJian.id, type: "被其介入" },
  ];

  return [
    regionDachang,
    regionDajing,
    regionGhostPost,
    locSeventhMiddleSchool,
    locGuangjiang,
    charYangJian,
    facHeadquarters,
    facMessengers,
    loreKnockingGhost,
  ];
}
