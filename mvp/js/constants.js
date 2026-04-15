/**
 * 常量模块只存放静态配置。
 * 这样产品结构、视觉预设和运行逻辑就能保持清晰边界。
 */

/**
 * 存储版本号随着状态结构演进提升。
 * 这一轮新增了地图区域与百科页面模型，因此继续升级版本。
 */
export const STORAGE_KEY = "vvd-world-local-mvp-state-v5";

/**
 * 项目首次打开时的默认名称。
 */
export const DEFAULT_PROJECT_NAME = "未命名世界观项目";

/**
 * 工作台的默认落点仍然是编辑视图。
 */
export const DEFAULT_VIEW = "editor";

/**
 * 工具区结构继续对齐公开可见的核心模块。
 */
export const TOOLKIT_VIEWS = [
  { id: "editor", label: "编辑", description: "编辑条目与世界设定字段" },
  { id: "timeline", label: "时间轴", description: "查看并维护世界与条目的时间线" },
  { id: "map", label: "地图", description: "在地图上组织地点、人物与势力" },
  { id: "canvas", label: "画布", description: "按创作阶段整理世界素材" },
  { id: "graph", label: "关系图", description: "查看条目之间的连接网络" },
  { id: "wiki", label: "百科", description: "以阅读视角浏览当前世界" },
];

/**
 * 地图图层过滤独立于左侧列表筛选，避免地图浏览和条目搜索互相干扰。
 */
export const MAP_LAYER_FILTERS = [
  { value: "all", label: "全部" },
  { value: "region", label: "区域" },
  { value: "location", label: "地点" },
  { value: "character", label: "人物" },
  { value: "faction", label: "组织" },
  { value: "event", label: "事件" },
  { value: "setting", label: "设定" },
];

/**
 * 条目类型同时决定分组语义、标签文案和图谱配色。
 */
export const ENTRY_TYPES = [
  {
    value: "region",
    label: "区域",
    groupLabel: "地理与疆域",
    accent: "#2f7d68",
  },
  {
    value: "location",
    label: "地点",
    groupLabel: "地点与场景",
    accent: "#0f6b61",
  },
  {
    value: "character",
    label: "人物",
    groupLabel: "人物与角色",
    accent: "#b44d31",
  },
  {
    value: "faction",
    label: "组织",
    groupLabel: "组织与派系",
    accent: "#6f5bd4",
  },
  {
    value: "item",
    label: "物品",
    groupLabel: "器物与设定",
    accent: "#b98f3e",
  },
  {
    value: "lore",
    label: "设定",
    groupLabel: "器物与设定",
    accent: "#7d5f45",
  },
  {
    value: "event",
    label: "事件",
    groupLabel: "事件与线索",
    accent: "#3b6aa0",
  },
  {
    value: "note",
    label: "笔记",
    groupLabel: "器物与设定",
    accent: "#55616f",
  },
];

/**
 * 地图区域预设让当前原型不只是“散点标记”，而是开始具备世界地理分区。
 * 这里先用轻量的椭圆区块来表示区域范围，后续再演进成真正区域编辑器。
 */
export const MAP_REGION_PRESETS = [
  {
    id: "dachang-city",
    label: "大昌市",
    top: 44,
    left: 54,
    width: 28,
    height: 22,
    rotation: -6,
    accent: "rgba(15, 107, 97, 0.18)",
  },
  {
    id: "dajing-city",
    label: "大京市",
    top: 18,
    left: 18,
    width: 34,
    height: 24,
    rotation: 5,
    accent: "rgba(180, 77, 49, 0.14)",
  },
  {
    id: "ghost-post-route",
    label: "鬼邮局线路",
    top: 18,
    left: 58,
    width: 28,
    height: 22,
    rotation: 7,
    accent: "rgba(111, 91, 212, 0.14)",
  },
  {
    id: "safe-city-belt",
    label: "安全城市带",
    top: 60,
    left: 12,
    width: 34,
    height: 20,
    rotation: -3,
    accent: "rgba(59, 106, 160, 0.12)",
  },
];

/**
 * 关系类型允许自由输入，但空值时仍然给一个可读默认值。
 */
export const DEFAULT_RELATION_TYPE = "关联";
