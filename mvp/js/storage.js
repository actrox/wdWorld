import { DEFAULT_PROJECT_NAME, DEFAULT_VIEW, STORAGE_KEY } from "./constants.js";
import { createEmptyEntry, createId, sortTimelineEvents } from "./utils.js";

/**
 * 这批规则只用于修复我们自己早期原型里出现过的历史乱码字段，
 * 不尝试“翻译”用户的自由文本，尽量把风险控制在已知范围内。
 */
const LEGACY_MOJIBAKE_REPLACEMENTS = new Map([
  ["鏈懡鍚嶄簨浠?", "未命名事件"],
  ["鏈懡鍚嶆椂闂寸偣", "未命名时间点"],
  ["鍏宠仈", "关联"],
  ["鏈懡鍚嶄笘鐣岃椤圭洰", "未命名世界观项目"],
  ["澶ф槍甯?", "大昌市"],
  ["澶т含甯?", "大京市"],
  ["楝奸偖灞€绾胯矾", "鬼邮局线路"],
  ["澶ф槍甯傜涓冧腑瀛?", "大昌市第七中学"],
  ["瑙傛睙灏忓尯", "观江小区"],
  ["鏉ㄩ棿", "杨间"],
  ["鎬婚儴", "总部"],
  ["楝奸偖灞€淇′娇", "鬼邮局信使"],
  ["鏁查棬楝间簨浠舵。妗?", "敲门鬼事件档案"],
]);

function repairKnownMojibake(value) {
  const text = String(value || "");
  let repaired = text;

  LEGACY_MOJIBAKE_REPLACEMENTS.forEach((target, source) => {
    repaired = repaired.replaceAll(source, target);
  });

  return repaired;
}

/**
 * 存储层负责两件事：
 * 1. 提供稳定的默认状态
 * 2. 把旧缓存和导入数据整形成当前界面能消费的结构
 */
export function createDefaultState() {
  return {
    project: {
      id: createId("project"),
      name: DEFAULT_PROJECT_NAME,
      timelineEvents: [],
      updatedAt: "",
    },
    entries: [],
    selectedEntryId: "",
    searchText: "",
    typeFilter: "all",
    lastSavedAt: "",
    activeView: DEFAULT_VIEW,
    mapEditMode: false,
    mapLayerFilter: "all",
    mapViewport: {
      centerX: 50,
      centerY: 50,
      zoom: 1.8,
    },
    selectedGraphRelationKey: "",
  };
}

/**
 * 读取失败时直接回退默认状态，保证工作台总能打开。
 */
export function loadState() {
  const rawValue = localStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return createDefaultState();
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    return normalizeState(parsedValue);
  } catch {
    return createDefaultState();
  }
}

/**
 * 写入入口保持单一，后续迁移到文件或数据库时更顺手。
 */
export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/**
 * 整形逻辑优先保证旧数据仍然可读。
 */
export function normalizeState(rawState) {
  const defaultState = createDefaultState();

  return {
    project: {
      id: rawState?.project?.id || defaultState.project.id,
      name: repairKnownMojibake(rawState?.project?.name || defaultState.project.name),
      timelineEvents: Array.isArray(rawState?.project?.timelineEvents)
        ? sortTimelineEvents(
            rawState.project.timelineEvents.map((event, index) => ({
              id: event?.id || createId("timeline"),
              pointLabel: repairKnownMojibake(event?.pointLabel || ""),
              title: repairKnownMojibake(event?.title || "未命名事件"),
              description: repairKnownMojibake(event?.description || ""),
              sortValue: Number.isFinite(event?.sortValue) ? event.sortValue : index,
              createdAt: event?.createdAt || defaultState.project.updatedAt,
            })),
          )
        : [],
      updatedAt: rawState?.project?.updatedAt || "",
    },
    entries: Array.isArray(rawState?.entries)
      ? rawState.entries.map((entry) => normalizeEntry(entry))
      : [],
    selectedEntryId: rawState?.selectedEntryId || "",
    searchText: rawState?.searchText || "",
    typeFilter: rawState?.typeFilter || "all",
    lastSavedAt: rawState?.lastSavedAt || "",
    activeView: rawState?.activeView || DEFAULT_VIEW,
    mapEditMode: Boolean(rawState?.mapEditMode),
    mapLayerFilter: rawState?.mapLayerFilter || "all",
    mapViewport: {
      centerX: Number.isFinite(rawState?.mapViewport?.centerX)
        ? rawState.mapViewport.centerX
        : defaultState.mapViewport.centerX,
      centerY: Number.isFinite(rawState?.mapViewport?.centerY)
        ? rawState.mapViewport.centerY
        : defaultState.mapViewport.centerY,
      zoom: Number.isFinite(rawState?.mapViewport?.zoom)
        ? rawState.mapViewport.zoom
        : defaultState.mapViewport.zoom,
    },
    selectedGraphRelationKey: rawState?.selectedGraphRelationKey || "",
  };
}

/**
 * 单条目整形独立出来，方便条目模型继续扩展。
 */
function normalizeEntry(rawEntry) {
  const baseEntry = createEmptyEntry(rawEntry?.type || "note");

  return {
    ...baseEntry,
    id: rawEntry?.id || baseEntry.id,
    type: rawEntry?.type || baseEntry.type,
    title: repairKnownMojibake(rawEntry?.title || baseEntry.title),
    aliases: Array.isArray(rawEntry?.aliases) ? rawEntry.aliases.map(repairKnownMojibake) : [],
    tags: Array.isArray(rawEntry?.tags) ? rawEntry.tags.map(repairKnownMojibake) : [],
    region: repairKnownMojibake(rawEntry?.region || ""),
    condition: repairKnownMojibake(rawEntry?.condition || ""),
    occupants: repairKnownMojibake(rawEntry?.occupants || ""),
    summary: repairKnownMojibake(rawEntry?.summary || ""),
    imageUrl: rawEntry?.imageUrl || "",
    content: repairKnownMojibake(rawEntry?.content || ""),
    notes: repairKnownMojibake(rawEntry?.notes || ""),
    mapPosition: {
      x: Number.isFinite(rawEntry?.mapPosition?.x)
        ? rawEntry.mapPosition.x
        : baseEntry.mapPosition.x,
      y: Number.isFinite(rawEntry?.mapPosition?.y)
        ? rawEntry.mapPosition.y
        : baseEntry.mapPosition.y,
    },
    regionShape: {
      top: Number.isFinite(rawEntry?.regionShape?.top)
        ? rawEntry.regionShape.top
        : baseEntry.regionShape.top,
      left: Number.isFinite(rawEntry?.regionShape?.left)
        ? rawEntry.regionShape.left
        : baseEntry.regionShape.left,
      width: Number.isFinite(rawEntry?.regionShape?.width)
        ? rawEntry.regionShape.width
        : baseEntry.regionShape.width,
      height: Number.isFinite(rawEntry?.regionShape?.height)
        ? rawEntry.regionShape.height
        : baseEntry.regionShape.height,
      rotation: Number.isFinite(rawEntry?.regionShape?.rotation)
        ? rawEntry.regionShape.rotation
        : baseEntry.regionShape.rotation,
    },
    anchors: Array.isArray(rawEntry?.anchors)
      ? rawEntry.anchors.map((anchor, index) => ({
          id: anchor?.id || createId("anchor"),
          label: repairKnownMojibake(anchor?.label || `未命名锚点 ${index + 1}`),
          x: Number.isFinite(anchor?.x) ? anchor.x : 50,
          y: Number.isFinite(anchor?.y) ? anchor.y : 50,
          notes: repairKnownMojibake(anchor?.notes || ""),
          createdAt: anchor?.createdAt || baseEntry.createdAt,
        }))
      : [],
    anchorId: rawEntry?.anchorId || "",
    relations: Array.isArray(rawEntry?.relations)
      ? rawEntry.relations.map((relation) => ({
          id: relation?.id || createId("relation"),
          targetId: relation?.targetId || "",
          type: repairKnownMojibake(relation?.type || "关联"),
        }))
      : [],
    timelineEvents: Array.isArray(rawEntry?.timelineEvents)
      ? sortTimelineEvents(
          rawEntry.timelineEvents.map((event, index) => ({
            id: event?.id || createId("timeline"),
            pointLabel: repairKnownMojibake(event?.pointLabel || ""),
            title: repairKnownMojibake(event?.title || "未命名事件"),
            description: repairKnownMojibake(event?.description || ""),
            sortValue: Number.isFinite(event?.sortValue) ? event.sortValue : index,
            createdAt: event?.createdAt || baseEntry.createdAt,
          })),
        )
      : [],
    createdAt: rawEntry?.createdAt || baseEntry.createdAt,
    updatedAt: rawEntry?.updatedAt || baseEntry.updatedAt,
  };
}
