import { DEFAULT_VIEW, ENTRY_TYPES, MAP_REGION_PRESETS } from "./constants.js";
import { filterEntries, sortEntriesByUpdatedAt } from "./utils.js";

/**
 * 选择器层负责把原始状态整理成“视图真正需要的结构”，
 * 这样渲染层就可以专注于展示，而不是在模板里拼装数据。
 */
const ENTRY_TYPE_CONFIG_MAP = Object.fromEntries(
  ENTRY_TYPES.map((entryType) => [entryType.value, entryType]),
);

/**
 * 关系颜色通过固定调色板分配，既能区分关系，又能保持整体风格统一。
 */
const RELATION_COLOR_PALETTE = [
  { stroke: "#9f4a32", soft: "rgba(159, 74, 50, 0.16)", text: "#7b3724" },
  { stroke: "#0f6b61", soft: "rgba(15, 107, 97, 0.16)", text: "#0b534b" },
  { stroke: "#8f6a1f", soft: "rgba(143, 106, 31, 0.16)", text: "#6d4f12" },
  { stroke: "#6a4fb5", soft: "rgba(106, 79, 181, 0.16)", text: "#533d8f" },
  { stroke: "#336aa3", soft: "rgba(51, 106, 163, 0.16)", text: "#284f78" },
  { stroke: "#9b3131", soft: "rgba(155, 49, 49, 0.16)", text: "#7d2727" },
];

/**
 * 按类型读取展示配置，未知类型也给一个可读兜底。
 */
export function getEntryTypeConfig(type) {
  return (
    ENTRY_TYPE_CONFIG_MAP[type] || {
      value: type,
      label: type,
      groupLabel: "未分类",
      accent: "#55616f",
    }
  );
}

/**
 * 上层只需要文案时优先走这个轻量入口。
 */
export function getEntryTypeLabel(type) {
  return getEntryTypeConfig(type).label;
}

/**
 * 当前选中条目是整个工作台共享的中心上下文。
 */
export function getSelectedEntry(state) {
  return state.entries.find((entry) => entry.id === state.selectedEntryId) || null;
}

/**
 * 定义“当前可见结果集”，让侧栏、地图、画布、百科共享同一过滤规则。
 */
export function getVisibleEntries(state) {
  const searchedEntries = filterEntries(state.entries, state.searchText);

  const filteredEntries =
    state.typeFilter && state.typeFilter !== "all"
      ? searchedEntries.filter((entry) => entry.type === state.typeFilter)
      : searchedEntries;

  return sortEntriesByUpdatedAt(filteredEntries);
}

/**
 * 左侧条目列表和百科导航都复用这套分组。
 */
export function getGroupedEntries(state) {
  const groupsMap = new Map();

  getVisibleEntries(state).forEach((entry) => {
    const groupLabel = getEntryTypeConfig(entry.type).groupLabel;

    if (!groupsMap.has(groupLabel)) {
      groupsMap.set(groupLabel, []);
    }

    groupsMap.get(groupLabel).push(entry);
  });

  return Array.from(groupsMap.entries()).map(([groupLabel, entries]) => ({
    groupLabel,
    entries,
  }));
}

/**
 * 顶部概览统一从这里取数，避免多个视图各自统计。
 */
export function getProjectStats(state) {
  const visibleEntries = getVisibleEntries(state);
  const relationCount = state.entries.reduce(
    (count, entry) => count + (entry.relations?.length || 0),
    0,
  );
  const timelineEventCount = state.entries.reduce(
    (count, entry) => count + (entry.timelineEvents?.length || 0),
    0,
  );
  const worldTimelineEventCount = state.project.timelineEvents?.length || 0;
  const regionCount = state.entries.filter((entry) => entry.type === "region").length;

  return {
    totalEntries: state.entries.length,
    visibleEntries: visibleEntries.length,
    latestEntryTitle: visibleEntries[0]?.title || "暂无",
    relationCount,
    timelineEventCount: timelineEventCount + worldTimelineEventCount,
    entryTimelineEventCount: timelineEventCount,
    worldTimelineEventCount,
    regionCount,
  };
}

/**
 * 建立查表结构后，跨条目拼装关系会干净很多。
 */
export function getEntryLookup(entries) {
  return new Map(entries.map((entry) => [entry.id, entry]));
}

/**
 * 规范化关系 key，方便关系图、右侧面板和点击高亮共用同一个标识。
 */
function buildRelationKey(direction, ownerEntryId, relationId) {
  return `${direction}:${ownerEntryId}:${relationId}`;
}

/**
 * 颜色映射做成纯函数，关系图、关系卡片、详情高亮都能复用。
 */
function getRelationVisual(type) {
  const relationType = String(type || "关联").trim() || "关联";
  let hash = 0;

  for (const char of relationType) {
    hash = (hash * 31 + char.charCodeAt(0)) % 2147483647;
  }

  return RELATION_COLOR_PALETTE[hash % RELATION_COLOR_PALETTE.length];
}

/**
 * 出边会被编辑器、关系图和百科同时消费。
 */
export function getSelectedRelationItems(state) {
  const selectedEntry = getSelectedEntry(state);

  if (!selectedEntry) {
    return [];
  }

  const entryLookup = getEntryLookup(state.entries);

  return (selectedEntry.relations || [])
    .map((relation) => {
      const targetEntry = entryLookup.get(relation.targetId) || null;
      const visual = getRelationVisual(relation.type);

      return {
        ...relation,
        direction: "outgoing",
        relationKey: buildRelationKey("outgoing", selectedEntry.id, relation.id),
        sourceEntry: selectedEntry,
        targetEntry,
        peerEntry: targetEntry,
        visual,
      };
    })
    .filter((relation) => relation.targetEntry);
}

/**
 * 入边同样重要，否则用户只能看到“我指向谁”，看不到“谁在指向我”。
 */
export function getIncomingRelationItems(state) {
  const selectedEntry = getSelectedEntry(state);

  if (!selectedEntry) {
    return [];
  }

  return state.entries.flatMap((entry) =>
    (entry.relations || [])
      .filter((relation) => relation.targetId === selectedEntry.id)
      .map((relation) => {
        const visual = getRelationVisual(relation.type);

        return {
          ...relation,
          direction: "incoming",
          relationKey: buildRelationKey("incoming", entry.id, relation.id),
          sourceEntry: entry,
          targetEntry: selectedEntry,
          peerEntry: entry,
          visual,
        };
      }),
  );
}

/**
 * 区域名的规范化键值用于匹配不同书写形式。
 */
function normalizeRegionKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replaceAll(/-+/g, "-")
    .replaceAll(/^-|-$/g, "");
}

/**
 * 可见区域条目会优先作为区域本体参与地图和百科建模。
 */
function getVisibleRegionEntries(state) {
  return getVisibleEntries(state).filter((entry) => entry.type === "region");
}

/**
 * 根据当前焦点推导“正在查看哪一个区域”。
 */
function getSelectedRegionKeyFromEntry(selectedEntry) {
  if (!selectedEntry) {
    return "";
  }

  if (selectedEntry.type === "region") {
    return normalizeRegionKey(selectedEntry.title);
  }

  return normalizeRegionKey(selectedEntry.region);
}

/**
 * 统一夹紧地图上的百分比坐标，避免锚点和子地点飞出可视区。
 */
function clampPercent(value, fallback = 50) {
  const normalizedValue = Number.isFinite(value) ? value : fallback;
  return Math.min(96, Math.max(4, normalizedValue));
}

/**
 * 把预设区域、区域条目和普通条目三方合并成可消费的地图区域模型。
 */
export function getMapRegions(state) {
  const selectedEntry = getSelectedEntry(state);
  const selectedRegionKey = getSelectedRegionKeyFromEntry(selectedEntry);
  const regionEntries = getVisibleRegionEntries(state);
  const nonRegionEntries = getVisibleEntries(state).filter((entry) => entry.type !== "region");
  const regionMap = new Map();

  MAP_REGION_PRESETS.forEach((preset, index) => {
    const key = normalizeRegionKey(preset.label || preset.id);

    regionMap.set(key, {
      id: preset.id,
      key,
      label: preset.label,
      top: preset.top,
      left: preset.left,
      width: preset.width,
      height: preset.height,
      rotation: preset.rotation,
      accent: preset.accent,
      entries: [],
      regionEntry: null,
      fallbackIndex: index,
    });
  });

  regionEntries.forEach((entry) => {
    const regionKey = normalizeRegionKey(entry.title);

    if (!regionKey) {
      return;
    }

    if (!regionMap.has(regionKey)) {
      const dynamicIndex = regionMap.size;

      regionMap.set(regionKey, {
        id: `dynamic-region-${dynamicIndex}`,
        key: regionKey,
        label: entry.title,
        top: 12 + (dynamicIndex % 4) * 18,
        left: 12 + (dynamicIndex % 3) * 26,
        width: 24,
        height: 18,
        rotation: dynamicIndex % 2 === 0 ? -6 : 6,
        accent: "rgba(47, 125, 104, 0.16)",
        entries: [],
        regionEntry: null,
        fallbackIndex: dynamicIndex,
      });
    }

    const region = regionMap.get(regionKey);
    region.regionEntry = entry;
    region.label = entry.title || region.label;
    region.top = entry.regionShape?.top ?? region.top;
    region.left = entry.regionShape?.left ?? region.left;
    region.width = entry.regionShape?.width ?? region.width;
    region.height = entry.regionShape?.height ?? region.height;
    region.rotation = entry.regionShape?.rotation ?? region.rotation;
  });

  nonRegionEntries.forEach((entry) => {
    const regionKey = normalizeRegionKey(entry.region);

    if (!regionKey) {
      return;
    }

    if (!regionMap.has(regionKey)) {
      const dynamicIndex = regionMap.size;

      regionMap.set(regionKey, {
        id: `dynamic-region-${dynamicIndex}`,
        key: regionKey,
        label: entry.region,
        top: 12 + (dynamicIndex % 4) * 18,
        left: 12 + (dynamicIndex % 3) * 26,
        width: 24,
        height: 18,
        rotation: dynamicIndex % 2 === 0 ? -6 : 6,
        accent: "rgba(125, 95, 69, 0.12)",
        entries: [],
        regionEntry: null,
        fallbackIndex: dynamicIndex,
      });
    }

    regionMap.get(regionKey).entries.push(entry);
  });

  return Array.from(regionMap.values())
    .filter((region) => region.entries.length > 0 || region.regionEntry)
    .sort((left, right) => {
      if (left.key === selectedRegionKey) {
        return -1;
      }

      if (right.key === selectedRegionKey) {
        return 1;
      }

      if ((right.entries?.length || 0) !== (left.entries?.length || 0)) {
        return (right.entries?.length || 0) - (left.entries?.length || 0);
      }

      return String(left.label).localeCompare(String(right.label), "zh-CN");
    })
    .map((region) => ({
      ...region,
      isSelected: region.key === selectedRegionKey,
      entryCount: region.entries.length,
      timelineCount: region.regionEntry?.timelineEvents?.length || 0,
      aliases: region.regionEntry?.aliases || [],
      condition: region.regionEntry?.condition || "",
      anchors: region.regionEntry?.anchors || [],
      anchorCount: region.regionEntry?.anchors?.length || 0,
      summary:
        region.regionEntry?.summary ||
        (region.entries.length > 0
          ? `当前区域已连接 ${region.entries.length} 个条目，可以继续补充区域概览。`
          : "当前区域还没有摘要，可以创建一个区域条目补充说明。"),
      primaryEntryId: region.regionEntry?.id || region.entries[0]?.id || "",
      regionEntryId: region.regionEntry?.id || "",
    }));
}

/**
 * 编辑器里的区域输入建议来自区域条目和地图区域模型，减少手写不一致。
 */
export function getRegionSuggestions(state) {
  return Array.from(
    new Set(
      getMapRegions(state)
        .map((region) => region.label)
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right, "zh-CN"));
}

/**
 * 选中条目所属区域对应的锚点列表，普通条目可以绑定到这里。
 */
export function getSelectedEntryAnchorOptions(state) {
  const selectedEntry = getSelectedEntry(state);

  if (!selectedEntry || selectedEntry.type === "region") {
    return [];
  }

  const regionKey = getSelectedRegionKeyFromEntry(selectedEntry);
  const region = getMapRegions(state).find((item) => item.key === regionKey);

  return (region?.regionEntry?.anchors || []).map((anchor) => ({
    ...anchor,
    regionLabel: region.label,
  }));
}

/**
 * 把区域锚点换算成地图绝对坐标，后续地图渲染和区域档案都能复用。
 */
export function getMapAnchors(state) {
  return getMapRegions(state).flatMap((region) =>
    (region.anchors || []).map((anchor) => ({
      ...anchor,
      regionKey: region.key,
      regionLabel: region.label,
      regionEntryId: region.regionEntryId,
      left: clampPercent(region.left + (region.width * anchor.x) / 100),
      top: clampPercent(region.top + (region.height * anchor.y) / 100),
    })),
  );
}

/**
 * 返回与当前条目处于同一区域的其他条目。
 */
export function getSelectedRegionEntries(state) {
  const selectedEntry = getSelectedEntry(state);

  if (!selectedEntry) {
    return [];
  }

  const selectedRegionKey = getSelectedRegionKeyFromEntry(selectedEntry);

  if (!selectedRegionKey) {
    return [];
  }

  return getVisibleEntries(state).filter((entry) => {
    if (entry.id === selectedEntry.id) {
      return false;
    }

    if (selectedEntry.type === "region") {
      return entry.type !== "region" && normalizeRegionKey(entry.region) === selectedRegionKey;
    }

    return normalizeRegionKey(entry.region) === selectedRegionKey;
  });
}

/**
 * 区域上下文里的锚点分组可以让“区域锚点 -> 子地点”结构清晰可读。
 */
function getRegionAnchorGroups(region, relatedEntries) {
  const membersByAnchorId = new Map();

  relatedEntries.forEach((entry) => {
    if (!entry.anchorId) {
      return;
    }

    if (!membersByAnchorId.has(entry.anchorId)) {
      membersByAnchorId.set(entry.anchorId, []);
    }

    membersByAnchorId.get(entry.anchorId).push(entry);
  });

  return (region.anchors || []).map((anchor) => ({
    ...anchor,
    members: membersByAnchorId.get(anchor.id) || [],
  }));
}

/**
 * 地图右侧需要一个更完整的区域档案模型，方便展示锚点、成员和跳转入口。
 */
export function getSelectedRegionContext(state) {
  const selectedEntry = getSelectedEntry(state);

  if (!selectedEntry) {
    return null;
  }

  const selectedRegionKey = getSelectedRegionKeyFromEntry(selectedEntry);

  if (!selectedRegionKey) {
    return null;
  }

  const region = getMapRegions(state).find((item) => item.key === selectedRegionKey);

  if (!region) {
    return null;
  }

  const relatedEntries = getSelectedRegionEntries(state);
  const anchorGroups = getRegionAnchorGroups(region, relatedEntries);
  const unassignedEntries = relatedEntries.filter((entry) => !entry.anchorId);

  return {
    region,
    relatedEntries,
    anchorGroups,
    unassignedEntries,
    isDirectRegionEntry: selectedEntry.type === "region",
  };
}

/**
 * 地图上的普通条目会优先使用锚点定位；没有锚点时再退回原始坐标。
 */
export function getMapEntries(state) {
  const visibleEntries = getVisibleEntries(state).filter((entry) => entry.type !== "region");
  const anchorLookup = new Map(getMapAnchors(state).map((anchor) => [anchor.id, anchor]));
  const membersByAnchorId = new Map();

  visibleEntries.forEach((entry) => {
    if (!entry.anchorId || !anchorLookup.has(entry.anchorId)) {
      return;
    }

    if (!membersByAnchorId.has(entry.anchorId)) {
      membersByAnchorId.set(entry.anchorId, []);
    }

    membersByAnchorId.get(entry.anchorId).push(entry.id);
  });

  return visibleEntries
    .filter(
      (entry) =>
        Number.isFinite(entry?.mapPosition?.x) && Number.isFinite(entry?.mapPosition?.y),
    )
    .map((entry) => {
      const anchor = anchorLookup.get(entry.anchorId);

      if (!anchor) {
        return {
          ...entry,
          displayPosition: {
            x: clampPercent(entry.mapPosition?.x, 50),
            y: clampPercent(entry.mapPosition?.y, 50),
          },
          isAnchored: false,
          anchorLabel: "",
        };
      }

      const group = membersByAnchorId.get(anchor.id) || [];
      const index = Math.max(0, group.indexOf(entry.id));
      const radius = group.length > 1 ? 3.5 + (index % 2) * 3 : 0;
      const angle = (Math.PI * 2 * index) / Math.max(group.length, 1);

      return {
        ...entry,
        displayPosition: {
          x: clampPercent(anchor.left + Math.cos(angle) * radius, anchor.left),
          y: clampPercent(anchor.top + Math.sin(angle) * radius, anchor.top),
        },
        isAnchored: true,
        anchorLabel: anchor.label,
      };
    });
}

/**
 * 画布当前仍然是创作流程看板，而不是自由排版画布。
 */
export function getCanvasColumns(state) {
  const visibleEntries = getVisibleEntries(state);

  return [
    {
      id: "spark",
      title: "灵感种子",
      description: "先收纳设定、物品、笔记与零散念头。",
      entries: visibleEntries.filter((entry) =>
        ["item", "lore", "note"].includes(entry.type),
      ),
    },
    {
      id: "place",
      title: "舞台与角色",
      description: "把区域、地点与人物逐步组织成可以发生故事的现场。",
      entries: visibleEntries.filter((entry) =>
        ["region", "location", "character"].includes(entry.type),
      ),
    },
    {
      id: "world",
      title: "世界结构",
      description: "把组织、事件与长期冲突连接成完整世界。",
      entries: visibleEntries.filter((entry) =>
        ["faction", "event"].includes(entry.type),
      ),
    },
  ];
}

/**
 * 为关系图建立节点表，避免后续边模型反复查找。
 */
function createGraphNode(entry, x, y, isCenter) {
  return {
    id: entry.id,
    x,
    y,
    title: entry.title,
    accent: getEntryTypeConfig(entry.type).accent,
    typeLabel: getEntryTypeLabel(entry.type),
    isCenter,
  };
}

/**
 * 关系图仍然以“当前焦点条目”为中心展开局部图，
 * 但边模型已经包含颜色、曲线、标签位置和点击详情所需的数据。
 */
export function getGraphModel(state) {
  const selectedEntry = getSelectedEntry(state);

  if (!selectedEntry) {
    return {
      edges: [],
      nodes: [],
    };
  }

  const outgoingRelations = getSelectedRelationItems(state);
  const incomingRelations = getIncomingRelationItems(state);
  const relationItems = [...outgoingRelations, ...incomingRelations];
  const neighborMap = new Map();

  relationItems.forEach((relation) => {
    if (relation.peerEntry) {
      neighborMap.set(relation.peerEntry.id, relation.peerEntry);
    }
  });

  const neighbors = Array.from(neighborMap.values());
  const centerNode = createGraphNode(selectedEntry, 320, 215, true);
  const nodes = [centerNode];

  neighbors.forEach((entry, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(neighbors.length, 1);
    const radius = neighbors.length > 5 ? 175 : 160;
    const x = centerNode.x + Math.cos(angle) * radius;
    const y = centerNode.y + Math.sin(angle) * radius;

    nodes.push(createGraphNode(entry, x, y, false));
  });

  const nodeLookup = new Map(nodes.map((node) => [node.id, node]));
  const pairCounter = new Map();

  relationItems.forEach((relation) => {
    const pairKey = [relation.sourceEntry.id, relation.targetEntry.id].sort().join("::");
    pairCounter.set(pairKey, (pairCounter.get(pairKey) || 0) + 1);
  });

  const pairIndexMap = new Map();
  const edges = relationItems
    .map((relation) => {
      const from = nodeLookup.get(relation.sourceEntry.id);
      const to = nodeLookup.get(relation.targetEntry.id);

      if (!from || !to) {
        return null;
      }

      const pairKey = [relation.sourceEntry.id, relation.targetEntry.id].sort().join("::");
      const pairCount = pairCounter.get(pairKey) || 1;
      const pairIndex = pairIndexMap.get(pairKey) || 0;
      pairIndexMap.set(pairKey, pairIndex + 1);

      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2;
      const deltaX = to.x - from.x;
      const deltaY = to.y - from.y;
      const distance = Math.max(Math.hypot(deltaX, deltaY), 1);
      const normalX = -deltaY / distance;
      const normalY = deltaX / distance;
      const centeredIndex = pairIndex - (pairCount - 1) / 2;
      const curveOffset = centeredIndex * 34 + (pairCount === 1 ? 16 : 0);
      const controlX = midX + normalX * curveOffset;
      const controlY = midY + normalY * curveOffset;
      const labelOffset = curveOffset + (curveOffset >= 0 ? 18 : -18);
      const labelX = midX + normalX * labelOffset;
      const labelY = midY + normalY * labelOffset;
      const path = `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;

      return {
        relationKey: relation.relationKey,
        direction: relation.direction,
        from,
        to,
        label: relation.type,
        sourceEntry: relation.sourceEntry,
        targetEntry: relation.targetEntry,
        peerEntry: relation.peerEntry,
        stroke: relation.visual.stroke,
        soft: relation.visual.soft,
        textColor: relation.visual.text,
        path,
        labelX,
        labelY,
      };
    })
    .filter(Boolean);

  return {
    edges,
    nodes,
  };
}

/**
 * 图右侧明细面板需要更容易阅读的结构化数据。
 */
export function getGraphDetailsModel(state) {
  const selectedEntry = getSelectedEntry(state);
  const outgoingRelations = getSelectedRelationItems(state);
  const incomingRelations = getIncomingRelationItems(state);
  const allRelations = [...outgoingRelations, ...incomingRelations];

  if (!selectedEntry) {
    return null;
  }

  return {
    selectedEntry,
    outgoingRelations,
    incomingRelations,
    selectedRelation:
      allRelations.find((relation) => relation.relationKey === state.selectedGraphRelationKey) ||
      null,
    neighborCount: new Set(allRelations.map((relation) => relation.peerEntry.id)).size,
  };
}

/**
 * 百科导航直接复用按分组的可见条目集合。
 */
export function getWikiNavigationGroups(state) {
  return getGroupedEntries(state);
}

/**
 * 百科页面模型除了正文，还会补充同区域、同类型和维护记录等阅读上下文。
 */
export function getWikiPageModel(state) {
  const selectedEntry = getSelectedEntry(state);

  if (!selectedEntry) {
    return null;
  }

  const visibleEntries = getVisibleEntries(state);
  const outgoingRelations = getSelectedRelationItems(state);
  const incomingRelations = getIncomingRelationItems(state);
  const sameRegionEntries = getSelectedRegionEntries(state);
  const timelineEvents = selectedEntry.timelineEvents || [];
  const sameTypeEntries = visibleEntries.filter(
    (entry) => entry.id !== selectedEntry.id && entry.type === selectedEntry.type,
  );

  const sections = [
    { id: "wiki-summary", label: "摘要", isVisible: true },
    { id: "wiki-facts", label: "基础信息", isVisible: true },
    { id: "wiki-content", label: "正文", isVisible: true },
    { id: "wiki-notes", label: "备注", isVisible: true },
    {
      id: "wiki-timeline",
      label: "时间轴",
      isVisible: timelineEvents.length > 0,
    },
    {
      id: "wiki-relations",
      label: "关联关系",
      isVisible: outgoingRelations.length > 0 || incomingRelations.length > 0,
    },
    {
      id: "wiki-region-context",
      label: selectedEntry.type === "region" ? "区域内条目" : "同区域条目",
      isVisible: sameRegionEntries.length > 0,
    },
    {
      id: "wiki-type-context",
      label: "同类型条目",
      isVisible: sameTypeEntries.length > 0,
    },
    { id: "wiki-history", label: "维护记录", isVisible: true },
  ].filter((section) => section.isVisible);

  return {
    selectedEntry,
    outgoingRelations,
    incomingRelations,
    sameRegionEntries,
    timelineEvents,
    sameTypeEntries,
    sections,
  };
}

/**
 * activeView 缺失时，一律回退到编辑视图。
 */
export function getActiveView(state) {
  return state.activeView || DEFAULT_VIEW;
}
