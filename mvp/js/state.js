import { DEFAULT_RELATION_TYPE, DEFAULT_VIEW } from "./constants.js";
import { loadState, normalizeState, saveState } from "./storage.js";
import {
  createMysteryRevivalDemoEntries,
  createMysteryRevivalDemoProjectTimeline,
} from "./demo-mystery.js";
import {
  clampToRange,
  createEmptyEntry,
  createId,
  downloadJson,
  nowIso,
  parseAliases,
  parseTags,
  readJsonFile,
  resolveTimelineSortValue,
  sortTimelineEvents,
} from "./utils.js";

/**
 * 状态管理器承接所有可变状态。
 * 它把数据写入边界收在一起，方便我们持续演进工作台。
 */
export function createStateManager() {
  const state = loadState();
  const listeners = new Set();
  const MIN_MAP_ZOOM = 1;
  const MAX_MAP_ZOOM = 3.2;

  /**
   * 所有界面刷新都通过统一出口触发。
   */
  function emit() {
    listeners.forEach((listener) => listener(getState()));
  }

  /**
   * 返回状态副本，避免外部代码绕过状态层直接改内部对象。
   */
  function getState() {
    return structuredClone(state);
  }

  /**
   * 统一读取当前选中条目，减少重复查找并让后续扩展更集中。
   */
  function getSelectedEntryRecord() {
    return state.entries.find((entry) => entry.id === state.selectedEntryId) || null;
  }

  /**
   * 数据类变更统一走 persist。
   */
  function persist() {
    const now = nowIso();
    state.project.updatedAt = now;
    state.lastSavedAt = now;
    saveState(state);
    emit();
  }

  /**
   * 浏览态变更只保存工作台状态，不污染最近修改时间。
   */
  function persistViewState() {
    saveState(state);
    emit();
  }

  /**
   * 视口缩放后，中心点的可移动范围也要同步收紧。
   */
  function normalizeMapViewport(nextViewport = {}) {
    const nextZoom = clampToRange(
      nextViewport.zoom ?? state.mapViewport?.zoom ?? 1.8,
      MIN_MAP_ZOOM,
      MAX_MAP_ZOOM,
      1.8,
    );
    const halfWindow = 50 / nextZoom;

    return {
      centerX: clampToRange(
        nextViewport.centerX ?? state.mapViewport?.centerX ?? 50,
        halfWindow,
        100 - halfWindow,
        50,
      ),
      centerY: clampToRange(
        nextViewport.centerY ?? state.mapViewport?.centerY ?? 50,
        halfWindow,
        100 - halfWindow,
        50,
      ),
      zoom: nextZoom,
    };
  }

  /**
   * 选中条目后，地图应尽量把它放回视窗中心附近。
   */
  function getEntryMapFocusPoint(entry) {
    if (!entry) {
      return null;
    }

    if (entry.type === "region") {
      const shape = entry.regionShape || createEmptyEntry("region").regionShape;

      return {
        x: shape.left + shape.width / 2,
        y: shape.top + shape.height / 2,
      };
    }

    if (entry.anchorId) {
      const regionEntry = state.entries.find(
        (candidate) =>
          candidate.type === "region" &&
          (candidate.anchors || []).some((anchor) => anchor.id === entry.anchorId),
      );
      const matchedAnchor = regionEntry?.anchors?.find((anchor) => anchor.id === entry.anchorId);

      if (matchedAnchor) {
        return {
          x: matchedAnchor.x,
          y: matchedAnchor.y,
        };
      }
    }

    if (
      Number.isFinite(entry.mapPosition?.x) &&
      Number.isFinite(entry.mapPosition?.y)
    ) {
      return {
        x: entry.mapPosition.x,
        y: entry.mapPosition.y,
      };
    }

    return null;
  }

  /**
   * 订阅接口保持轻量。
   */
  function subscribe(listener) {
    listeners.add(listener);
    listener(getState());
    return () => listeners.delete(listener);
  }

  /**
   * 新建条目默认从地点开始，最容易同时验证多个视图。
   */
  function createEntry(type = "location") {
    const entry = createEmptyEntry(type);

    state.entries.unshift(entry);
    state.selectedEntryId = entry.id;
    state.activeView = DEFAULT_VIEW;
    state.mapEditMode = false;
    state.selectedGraphRelationKey = "";
    persist();
  }

  /**
   * 删除条目时也清理其他条目里指向它的关系。
   */
  function deleteSelectedEntry() {
    if (!state.selectedEntryId) {
      return;
    }

    const deletedEntryId = state.selectedEntryId;

    state.entries = state.entries
      .filter((entry) => entry.id !== deletedEntryId)
      .map((entry) => ({
        ...entry,
        relations: (entry.relations || []).filter(
          (relation) => relation.targetId !== deletedEntryId,
        ),
      }));

    state.selectedEntryId = state.entries[0]?.id ?? "";
    state.mapEditMode = false;
    state.selectedGraphRelationKey = "";
    persist();
  }

  /**
   * 普通字段统一走同一入口。
   */
  function updateSelectedEntry(fieldName, value) {
    const selectedEntry = getSelectedEntryRecord();

    if (!selectedEntry) {
      return;
    }

    selectedEntry[fieldName] = value;
    selectedEntry.updatedAt = nowIso();
    persist();
  }

  /**
   * 别名字段在状态层统一清洗。
   */
  function updateSelectedAliases(rawValue) {
    updateSelectedEntry("aliases", parseAliases(rawValue));
  }

  /**
   * 标签字段同样统一清洗。
   */
  function updateSelectedTags(rawValue) {
    updateSelectedEntry("tags", parseTags(rawValue));
  }

  /**
   * 坐标更新要限制在合理区间。
   */
  function updateSelectedMapPosition(axis, rawValue) {
    const selectedEntry = getSelectedEntryRecord();

    if (!selectedEntry) {
      return;
    }

    const currentValue = selectedEntry.mapPosition?.[axis] ?? 50;

    selectedEntry.mapPosition = {
      ...selectedEntry.mapPosition,
      [axis]: clampToRange(rawValue, 5, 95, currentValue),
    };
    selectedEntry.updatedAt = nowIso();
    persist();
  }

  /**
   * 区域几何信息单独收口，避免渲染层直接理解边界约束规则。
   */
  function updateSelectedRegionShape(fieldName, rawValue) {
    const selectedEntry = getSelectedEntryRecord();

    if (!selectedEntry || selectedEntry.type !== "region") {
      return;
    }

    const currentShape = selectedEntry.regionShape || createEmptyEntry("region").regionShape;
    const nextShape = { ...currentShape };

    if (fieldName === "width") {
      nextShape.width = clampToRange(rawValue, 10, 60, currentShape.width);
      nextShape.left = clampToRange(nextShape.left, 2, 98 - nextShape.width, currentShape.left);
    } else if (fieldName === "height") {
      nextShape.height = clampToRange(rawValue, 10, 48, currentShape.height);
      nextShape.top = clampToRange(nextShape.top, 2, 98 - nextShape.height, currentShape.top);
    } else if (fieldName === "rotation") {
      nextShape.rotation = clampToRange(rawValue, -25, 25, currentShape.rotation);
    } else if (fieldName === "left") {
      nextShape.left = clampToRange(rawValue, 2, 98 - currentShape.width, currentShape.left);
    } else if (fieldName === "top") {
      nextShape.top = clampToRange(rawValue, 2, 98 - currentShape.height, currentShape.top);
    }

    selectedEntry.regionShape = nextShape;
    selectedEntry.updatedAt = nowIso();
    persist();
  }

  /**
   * 地图点击放置会同时更新两轴坐标。
   */
  function placeSelectedEntryOnMap(rawX, rawY) {
    const selectedEntry = getSelectedEntryRecord();

    if (!selectedEntry) {
      return;
    }

    selectedEntry.mapPosition = {
      x: clampToRange(rawX, 5, 95, selectedEntry.mapPosition?.x ?? 50),
      y: clampToRange(rawY, 5, 95, selectedEntry.mapPosition?.y ?? 50),
    };
    selectedEntry.updatedAt = nowIso();
    persist();
  }

  /**
   * 区域放置模式按“区域中心点”移动，保留当前宽高与旋转。
   */
  function placeSelectedRegionOnMap(rawX, rawY) {
    const selectedEntry = getSelectedEntryRecord();

    if (!selectedEntry || selectedEntry.type !== "region") {
      return;
    }

    const currentShape = selectedEntry.regionShape || createEmptyEntry("region").regionShape;
    const normalizedWidth = clampToRange(currentShape.width, 10, 60, 24);
    const normalizedHeight = clampToRange(currentShape.height, 10, 48, 18);
    const nextLeft = clampToRange(rawX - normalizedWidth / 2, 2, 98 - normalizedWidth, currentShape.left);
    const nextTop = clampToRange(rawY - normalizedHeight / 2, 2, 98 - normalizedHeight, currentShape.top);

    selectedEntry.regionShape = {
      ...currentShape,
      width: normalizedWidth,
      height: normalizedHeight,
      left: nextLeft,
      top: nextTop,
    };
    selectedEntry.updatedAt = nowIso();
    persist();
  }

  /**
   * 区域锚点是区域内部的二级地理节点，用于承载子地点与局部叙事。
   */
  function addRegionAnchor(label, rawX, rawY, notes) {
    const selectedEntry = getSelectedEntryRecord();

    if (!selectedEntry || selectedEntry.type !== "region") {
      return false;
    }

    const normalizedLabel = String(label || "").trim();

    if (!normalizedLabel) {
      return false;
    }

    const currentAnchors = Array.isArray(selectedEntry.anchors) ? selectedEntry.anchors : [];

    selectedEntry.anchors = [
      ...currentAnchors,
      {
        id: createId("anchor"),
        label: normalizedLabel,
        x: clampToRange(rawX, 0, 100, 50),
        y: clampToRange(rawY, 0, 100, 50),
        notes: String(notes || "").trim(),
        createdAt: nowIso(),
      },
    ];
    selectedEntry.updatedAt = nowIso();
    persist();
    return true;
  }

  /**
   * 删除锚点时需要同步清理子地点上的引用，避免出现悬空 anchorId。
   */
  function removeRegionAnchor(anchorId) {
    const selectedEntry = getSelectedEntryRecord();

    if (!selectedEntry || selectedEntry.type !== "region" || !anchorId) {
      return;
    }

    selectedEntry.anchors = (selectedEntry.anchors || []).filter((anchor) => anchor.id !== anchorId);

    state.entries.forEach((entry) => {
      const belongsToRegion = entry.type !== "region" && entry.region === selectedEntry.title;

      if (belongsToRegion && entry.anchorId === anchorId) {
        entry.anchorId = "";
        entry.updatedAt = nowIso();
      }
    });

    selectedEntry.updatedAt = nowIso();
    persist();
  }

  /**
   * 普通条目只允许绑定到自己所属区域的锚点；空值表示解除挂靠。
   */
  function updateSelectedEntryAnchor(anchorId) {
    const selectedEntry = getSelectedEntryRecord();

    if (!selectedEntry || selectedEntry.type === "region") {
      return;
    }

    if (!anchorId) {
      selectedEntry.anchorId = "";
      selectedEntry.updatedAt = nowIso();
      persist();
      return;
    }

    const regionEntry = state.entries.find(
      (entry) => entry.type === "region" && entry.title === selectedEntry.region,
    );
    const matchedAnchor = regionEntry?.anchors?.find((anchor) => anchor.id === anchorId);

    if (!matchedAnchor) {
      return;
    }

    selectedEntry.anchorId = anchorId;
    selectedEntry.updatedAt = nowIso();
    persist();
  }

  /**
   * 选中条目属于浏览行为，不应污染更新时间。
   */
  function selectEntry(entryId) {
    state.selectedEntryId = entryId;
    state.selectedGraphRelationKey = "";
    const selectedEntry = getSelectedEntryRecord();
    const focusPoint = getEntryMapFocusPoint(selectedEntry);

    if (focusPoint) {
      state.mapViewport = normalizeMapViewport({
        ...state.mapViewport,
        centerX: focusPoint.x,
        centerY: focusPoint.y,
      });
    }

    persistViewState();
  }

  /**
   * 搜索只影响当前结果集。
   */
  function setSearchText(searchText) {
    state.searchText = searchText;
    emit();
  }

  /**
   * 类型过滤属于工作台状态。
   */
  function setTypeFilter(typeFilter) {
    state.typeFilter = typeFilter || "all";
    persistViewState();
  }

  /**
   * 视图切换保留，但不算内容修改。
   */
  function setActiveView(viewId) {
    state.activeView = viewId || DEFAULT_VIEW;
    persistViewState();
  }

  /**
   * 地图编辑模式属于浏览态。
   */
  function setMapEditMode(enabled) {
    state.mapEditMode = Boolean(enabled);
    persistViewState();
  }

  /**
   * 地图图层过滤只影响地图视图本身。
   */
  function setMapLayerFilter(layerFilter) {
    state.mapLayerFilter = layerFilter || "all";
    persistViewState();
  }

  /**
   * 缩放和平移共享同一份地图相机状态。
   */
  function setMapViewport(partialViewport) {
    state.mapViewport = normalizeMapViewport({
      ...state.mapViewport,
      ...partialViewport,
    });
    persistViewState();
  }

  /**
   * 拖拽地图时，只根据相对位移平移中心点。
   */
  function panMapViewportBy(deltaX, deltaY) {
    const currentViewport = normalizeMapViewport(state.mapViewport);

    state.mapViewport = normalizeMapViewport({
      centerX: currentViewport.centerX + deltaX,
      centerY: currentViewport.centerY + deltaY,
      zoom: currentViewport.zoom,
    });
    persistViewState();
  }

  /**
   * 默认回到“放大后的中部观察窗”。
   */
  function resetMapViewport() {
    state.mapViewport = normalizeMapViewport({
      centerX: 50,
      centerY: 50,
      zoom: 1.8,
    });
    persistViewState();
  }

  /**
   * 关系图的选中边属于浏览状态，不应污染内容更新时间。
   */
  function setSelectedGraphRelation(relationKey) {
    state.selectedGraphRelationKey = relationKey || "";
    persistViewState();
  }

  /**
   * 项目名称属于核心数据。
   */
  function updateProjectName(projectName) {
    state.project.name = projectName.trim() || "未命名世界观项目";
    persist();
  }

  /**
   * 示例数据用于验证多视图是否联动成立。
   */
  function loadDemoEntries() {
    state.entries = createMysteryRevivalDemoEntries();
    state.project.timelineEvents = createMysteryRevivalDemoProjectTimeline();
    state.selectedEntryId = state.entries[0]?.id ?? "";
    state.activeView = DEFAULT_VIEW;
    state.mapEditMode = false;
    state.mapLayerFilter = "all";
    state.mapViewport = normalizeMapViewport({
      centerX: 50,
      centerY: 50,
      zoom: 1.8,
    });
    state.selectedGraphRelationKey = "";
    persist();
  }

  /**
   * 关系新增会做最小去重。
   */
  function addRelation(targetId, relationType) {
    const selectedEntry = getSelectedEntryRecord();

    if (!selectedEntry || !targetId || targetId === selectedEntry.id) {
      return false;
    }

    const normalizedRelationType = relationType.trim() || DEFAULT_RELATION_TYPE;
    const relationExists = (selectedEntry.relations || []).some(
      (relation) =>
        relation.targetId === targetId && relation.type === normalizedRelationType,
    );

    if (relationExists) {
      return false;
    }

    selectedEntry.relations.push({
      id: createId("relation"),
      targetId,
      type: normalizedRelationType,
    });
    selectedEntry.updatedAt = nowIso();
    persist();
    return true;
  }

  /**
   * 关系删除只允许删除当前条目拥有的出边。
   */
  function removeRelation(relationId) {
    const selectedEntry = getSelectedEntryRecord();

    if (!selectedEntry) {
      return;
    }

    selectedEntry.relations = (selectedEntry.relations || []).filter(
      (relation) => relation.id !== relationId,
    );
    selectedEntry.updatedAt = nowIso();
    persist();
  }

  /**
   * 时间轴事件属于条目内部结构，因此在状态层统一创建和排序。
   */
  function addTimelineEvent(pointLabel, rawSortValue, title, description) {
    const selectedEntry = getSelectedEntryRecord();

    if (!selectedEntry) {
      return false;
    }

    const normalizedTitle = String(title || "").trim();
    const normalizedPointLabel = String(pointLabel || "").trim();
    const normalizedDescription = String(description || "").trim();

    if (!normalizedTitle) {
      return false;
    }

    const fallbackSortValue =
      (selectedEntry.timelineEvents?.[selectedEntry.timelineEvents.length - 1]?.sortValue ?? 0) + 10;

    const timelineEvent = {
      id: createId("timeline"),
      pointLabel: normalizedPointLabel,
      title: normalizedTitle,
      description: normalizedDescription,
      sortValue: resolveTimelineSortValue(
        normalizedPointLabel,
        rawSortValue,
        fallbackSortValue,
      ),
      createdAt: nowIso(),
    };

    selectedEntry.timelineEvents = sortTimelineEvents([
      ...(selectedEntry.timelineEvents || []),
      timelineEvent,
    ]);
    selectedEntry.updatedAt = nowIso();
    persist();
    return true;
  }

  /**
   * 世界时间轴和条目时间轴体验一致，但数据挂在项目层级。
   */
  function addProjectTimelineEvent(pointLabel, rawSortValue, title, description) {
    const normalizedTitle = String(title || "").trim();
    const normalizedPointLabel = String(pointLabel || "").trim();
    const normalizedDescription = String(description || "").trim();

    if (!normalizedTitle) {
      return false;
    }

    const currentTimeline = Array.isArray(state.project.timelineEvents)
      ? state.project.timelineEvents
      : [];
    const fallbackSortValue = (currentTimeline[currentTimeline.length - 1]?.sortValue ?? 0) + 10;

    const timelineEvent = {
      id: createId("timeline"),
      pointLabel: normalizedPointLabel,
      title: normalizedTitle,
      description: normalizedDescription,
      sortValue: resolveTimelineSortValue(
        normalizedPointLabel,
        rawSortValue,
        fallbackSortValue,
      ),
      createdAt: nowIso(),
    };

    state.project.timelineEvents = sortTimelineEvents([...currentTimeline, timelineEvent]);
    persist();
    return true;
  }

  function removeTimelineEvent(timelineEventId) {
    const selectedEntry = getSelectedEntryRecord();

    if (!selectedEntry) {
      return;
    }

    selectedEntry.timelineEvents = (selectedEntry.timelineEvents || []).filter(
      (event) => event.id !== timelineEventId,
    );
    selectedEntry.updatedAt = nowIso();
    persist();
  }

  /**
   * 世界时间轴删除只影响项目层级，不影响单条目。
   */
  function removeProjectTimelineEvent(timelineEventId) {
    state.project.timelineEvents = (state.project.timelineEvents || []).filter(
      (event) => event.id !== timelineEventId,
    );
    persist();
  }

  /**
   * 导出直接复用当前状态快照。
   */
  function exportProject() {
    downloadJson("vvd-world-local-alpha.json", getState());
  }

  /**
   * 导入时先整形，再整体替换。
   */
  async function importProject(file) {
    const importedValue = await readJsonFile(file);
    const normalizedState = normalizeState(importedValue);

    state.project = normalizedState.project;
    state.entries = normalizedState.entries;
    state.selectedEntryId =
      normalizedState.selectedEntryId || normalizedState.entries[0]?.id || "";
    state.searchText = normalizedState.searchText || "";
    state.typeFilter = normalizedState.typeFilter || "all";
    state.lastSavedAt = normalizedState.lastSavedAt || "";
    state.activeView = normalizedState.activeView || DEFAULT_VIEW;
    state.mapEditMode = normalizedState.mapEditMode || false;
    state.mapLayerFilter = normalizedState.mapLayerFilter || "all";
    state.mapViewport = normalizedState.mapViewport || normalizeMapViewport();
    state.selectedGraphRelationKey = normalizedState.selectedGraphRelationKey || "";
    persist();
  }

  return {
    addProjectTimelineEvent,
    addRegionAnchor,
    addRelation,
    addTimelineEvent,
    createEntry,
    deleteSelectedEntry,
    exportProject,
    getState,
    importProject,
    loadDemoEntries,
    placeSelectedEntryOnMap,
    placeSelectedRegionOnMap,
    panMapViewportBy,
    removeProjectTimelineEvent,
    removeRegionAnchor,
    removeRelation,
    removeTimelineEvent,
    resetMapViewport,
    selectEntry,
    setActiveView,
    setMapLayerFilter,
    setMapEditMode,
    setMapViewport,
    setSelectedGraphRelation,
    setSearchText,
    setTypeFilter,
    subscribe,
    updateProjectName,
    updateSelectedAliases,
    updateSelectedEntryAnchor,
    updateSelectedEntry,
    updateSelectedMapPosition,
    updateSelectedRegionShape,
    updateSelectedTags,
  };
}
