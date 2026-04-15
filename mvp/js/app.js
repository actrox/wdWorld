import { createRenderer } from "./renderer.js";
import { createStateManager } from "./state.js";

/**
 * app.js 是最外层编排模块。
 * 它负责收集 DOM、连接状态层和渲染层，再把用户交互接进来。
 */
const domRefs = {
  addAnchorButton: document.querySelector("#add-anchor-button"),
  addProjectTimelineButton: document.querySelector("#add-project-timeline-button"),
  addRelationButton: document.querySelector("#add-relation-button"),
  addTimelineButton: document.querySelector("#add-timeline-button"),
  aliasesInput: document.querySelector("#aliases-input"),
  anchorLabelInput: document.querySelector("#anchor-label-input"),
  anchorNotesInput: document.querySelector("#anchor-notes-input"),
  anchorXInput: document.querySelector("#anchor-x-input"),
  anchorYInput: document.querySelector("#anchor-y-input"),
  canvasColumns: document.querySelector("#canvas-columns"),
  canvasView: document.querySelector("#canvas-view"),
  conditionInput: document.querySelector("#condition-input"),
  contentInput: document.querySelector("#content-input"),
  createEntryButton: document.querySelector("#create-entry-button"),
  deleteEntryButton: document.querySelector("#delete-entry-button"),
  editorView: document.querySelector("#editor-view"),
  entryAnchorSection: document.querySelector("#entry-anchor-section"),
  entryAnchorSelect: document.querySelector("#entry-anchor-select"),
  entryCounter: document.querySelector("#entry-counter"),
  entryList: document.querySelector("#entry-list"),
  exportButton: document.querySelector("#export-button"),
  focusCard: document.querySelector("#focus-card"),
  graphSurface: document.querySelector("#graph-surface"),
  graphView: document.querySelector("#graph-view"),
  imageUrlInput: document.querySelector("#image-url-input"),
  importFileInput: document.querySelector("#import-file-input"),
  mapEditToggleButton: document.querySelector("#map-edit-toggle-button"),
  mapFocus: document.querySelector("#map-focus"),
  mapHint: document.querySelector("#map-edit-hint"),
  mapLayerFilterBar: document.querySelector("#map-layer-filter-bar"),
  mapResetViewButton: document.querySelector("#map-reset-view-button"),
  mapSurface: document.querySelector("#map-surface"),
  mapView: document.querySelector("#map-view"),
  mapXInput: document.querySelector("#map-x-input"),
  mapYInput: document.querySelector("#map-y-input"),
  mapZoomInButton: document.querySelector("#map-zoom-in-button"),
  mapZoomIndicator: document.querySelector("#map-zoom-indicator"),
  mapZoomOutButton: document.querySelector("#map-zoom-out-button"),
  newEntryTypeSelect: document.querySelector("#new-entry-type-select"),
  notesInput: document.querySelector("#notes-input"),
  occupantsInput: document.querySelector("#occupants-input"),
  projectNameInput: document.querySelector("#project-name-input"),
  projectStats: document.querySelector("#project-stats"),
  projectTimelineDescriptionInput: document.querySelector("#project-timeline-description-input"),
  projectTimelineList: document.querySelector("#project-timeline-list"),
  projectTimelinePointInput: document.querySelector("#project-timeline-point-input"),
  projectTimelineSortInput: document.querySelector("#project-timeline-sort-input"),
  projectTimelineTitleInput: document.querySelector("#project-timeline-title-input"),
  regionAnchorList: document.querySelector("#region-anchor-list"),
  regionAnchorSection: document.querySelector("#region-anchor-section"),
  regionHeightInput: document.querySelector("#region-height-input"),
  regionInput: document.querySelector("#region-input"),
  regionInputField: document.querySelector("#region-input")?.closest(".field"),
  regionLeftInput: document.querySelector("#region-left-input"),
  regionRotationInput: document.querySelector("#region-rotation-input"),
  regionShapeSection: document.querySelector("#region-shape-section"),
  regionSuggestions: document.querySelector("#region-suggestions"),
  regionTopInput: document.querySelector("#region-top-input"),
  regionWidthInput: document.querySelector("#region-width-input"),
  relationList: document.querySelector("#relation-list"),
  relationTargetSelect: document.querySelector("#relation-target-select"),
  relationTypeInput: document.querySelector("#relation-type-input"),
  saveStatus: document.querySelector("#save-status"),
  searchInput: document.querySelector("#search-input"),
  seedDemoButton: document.querySelector("#seed-demo-button"),
  summaryInput: document.querySelector("#summary-input"),
  tagsInput: document.querySelector("#tags-input"),
  timelineDescriptionInput: document.querySelector("#timeline-description-input"),
  timelineList: document.querySelector("#timeline-list"),
  timelinePointInput: document.querySelector("#timeline-point-input"),
  timelineSortInput: document.querySelector("#timeline-sort-input"),
  timelineTitleInput: document.querySelector("#timeline-title-input"),
  timelineView: document.querySelector("#timeline-view"),
  titleInput: document.querySelector("#title-input"),
  toolkitTabs: document.querySelector("#toolkit-tabs"),
  typeFilterBar: document.querySelector("#type-filter-bar"),
  typeInput: document.querySelector("#type-input"),
  wikiArticle: document.querySelector("#wiki-article"),
  wikiNavigation: document.querySelector("#wiki-navigation"),
  wikiView: document.querySelector("#wiki-view"),
};

const stateManager = createStateManager();
const renderer = createRenderer(domRefs);
const mapPointerState = {
  isDragging: false,
  lastClientX: 0,
  lastClientY: 0,
  movedDuringDrag: false,
};
const LEGACY_SAMPLE_TITLES = new Set([
  "Velthorn Basin",
  "Saltbound Coast",
  "Lower Basin",
  "Kethvari Outlook",
  "Redwake Harbor",
  "Edda Voss",
  "Mirewalkers",
  "Brass Collective",
  "The Blair Accords",
]);
const LEGACY_GARBLED_MYSTERY_REVIVAL_TITLES = new Set([
  "澶ф槍甯?",
  "澶т含甯?",
  "楝奸偖灞€绾胯矾",
  "澶ф槍甯傜涓冧腑瀛?",
  "瑙傛睙灏忓尯",
  "鏉ㄩ棿",
  "鎬婚儴",
  "楝奸偖灞€淇′娇",
  "鏁查棬楝间簨浠舵。妗?",
]);
const OUTDATED_MYSTERY_REVIVAL_TITLES = new Set([
  "大昌市",
  "大京市",
  "鬼邮局线路",
  "大昌市第七中学",
  "观江小区",
  "杨间",
  "总部",
  "鬼邮局信使",
  "敲门鬼事件档案",
]);

/**
 * 统一订阅状态刷新，保证渲染与状态一致。
 */
stateManager.subscribe((state) => {
  renderer.render(state);
});

bindEvents();

/**
 * 首次空项目自动加载示例数据，便于快速检查多视图联动。
 */
if (stateManager.getState().entries.length === 0) {
  stateManager.loadDemoEntries();
} else if (shouldUpgradeLegacySample(stateManager.getState())) {
  stateManager.loadDemoEntries();
} else if (shouldUpgradeGarbledMysteryRevivalSample(stateManager.getState())) {
  stateManager.loadDemoEntries();
} else if (shouldUpgradeOutdatedMysteryRevivalSample(stateManager.getState())) {
  stateManager.loadDemoEntries();
}

/**
 * 所有交互入口集中写在这里，便于排查链路。
 */
function bindEvents() {
  domRefs.createEntryButton.addEventListener("click", () => {
    stateManager.createEntry(domRefs.newEntryTypeSelect.value);
  });

  domRefs.seedDemoButton.addEventListener("click", () => {
    stateManager.loadDemoEntries();
  });

  domRefs.exportButton.addEventListener("click", () => {
    stateManager.exportProject();
  });

  domRefs.deleteEntryButton.addEventListener("click", () => {
    const hasConfirmed = window.confirm(
      "确定删除当前条目吗？这会同时清理其他条目里指向它的关系。",
    );

    if (hasConfirmed) {
      stateManager.deleteSelectedEntry();
    }
  });

  domRefs.toolkitTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-view-id]");

    if (button) {
      stateManager.setActiveView(button.dataset.viewId);
    }
  });

  domRefs.entryList.addEventListener("click", (event) => {
    const card = event.target.closest("[data-entry-id]");

    if (card) {
      stateManager.selectEntry(card.dataset.entryId);
    }
  });

  domRefs.typeFilterBar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-type-filter]");

    if (button) {
      stateManager.setTypeFilter(button.dataset.typeFilter);
    }
  });

  domRefs.mapEditToggleButton.addEventListener("click", () => {
    const snapshot = stateManager.getState();
    stateManager.setMapEditMode(!snapshot.mapEditMode);
  });

  domRefs.mapLayerFilterBar.addEventListener("click", (event) => {
    const button = event.target.closest("[data-map-layer-filter]");

    if (button) {
      stateManager.setMapLayerFilter(button.dataset.mapLayerFilter);
    }
  });

  domRefs.mapZoomInButton.addEventListener("click", () => {
    const snapshot = stateManager.getState();
    const currentZoom = snapshot.mapViewport?.zoom ?? 1.8;
    stateManager.setMapViewport({ zoom: currentZoom + 0.2 });
  });

  domRefs.mapZoomOutButton.addEventListener("click", () => {
    const snapshot = stateManager.getState();
    const currentZoom = snapshot.mapViewport?.zoom ?? 1.8;
    stateManager.setMapViewport({ zoom: currentZoom - 0.2 });
  });

  domRefs.mapResetViewButton.addEventListener("click", () => {
    stateManager.resetMapViewport();
  });

  domRefs.mapSurface.addEventListener("wheel", (event) => {
    event.preventDefault();

    const snapshot = stateManager.getState();
    const currentZoom = snapshot.mapViewport?.zoom ?? 1.8;
    const nextZoom = event.deltaY < 0 ? currentZoom + 0.12 : currentZoom - 0.12;

    stateManager.setMapViewport({ zoom: nextZoom });
  });

  domRefs.mapSurface.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }

    const interactiveTarget = event.target.closest(
      "[data-entry-id], [data-region-entry-id], [data-map-minimap]",
    );

    if (interactiveTarget) {
      return;
    }

    mapPointerState.isDragging = true;
    mapPointerState.lastClientX = event.clientX;
    mapPointerState.lastClientY = event.clientY;
    mapPointerState.movedDuringDrag = false;
    domRefs.mapSurface.classList.add("is-panning");
  });

  window.addEventListener("pointermove", (event) => {
    if (!mapPointerState.isDragging) {
      return;
    }

    const rect = domRefs.mapSurface.getBoundingClientRect();

    if (!rect.width || !rect.height) {
      return;
    }

    const snapshot = stateManager.getState();
    const zoom = snapshot.mapViewport?.zoom ?? 1.8;
    const deltaClientX = event.clientX - mapPointerState.lastClientX;
    const deltaClientY = event.clientY - mapPointerState.lastClientY;
    const deltaWorldX = (-deltaClientX / rect.width) * (100 / zoom);
    const deltaWorldY = (-deltaClientY / rect.height) * (100 / zoom);

    if (Math.abs(deltaClientX) > 1 || Math.abs(deltaClientY) > 1) {
      mapPointerState.movedDuringDrag = true;
    }

    mapPointerState.lastClientX = event.clientX;
    mapPointerState.lastClientY = event.clientY;
    stateManager.panMapViewportBy(deltaWorldX, deltaWorldY);
  });

  window.addEventListener("pointerup", () => {
    mapPointerState.isDragging = false;
    domRefs.mapSurface.classList.remove("is-panning");
  });

  domRefs.mapSurface.addEventListener("click", (event) => {
    if (mapPointerState.isDragging || mapPointerState.movedDuringDrag) {
      mapPointerState.movedDuringDrag = false;
      return;
    }

    const miniMap = event.target.closest("[data-map-minimap]");

    if (miniMap) {
      const rect = miniMap.getBoundingClientRect();
      const centerX = ((event.clientX - rect.left) / rect.width) * 100;
      const centerY = ((event.clientY - rect.top) / rect.height) * 100;

      stateManager.setMapViewport({ centerX, centerY });
      return;
    }

    const marker = event.target.closest("[data-entry-id]");

    if (marker) {
      stateManager.selectEntry(marker.dataset.entryId);
      return;
    }

    const region = event.target.closest("[data-region-entry-id]");

    if (region?.dataset.regionEntryId) {
      stateManager.selectEntry(region.dataset.regionEntryId);
      return;
    }

    const snapshot = stateManager.getState();

    if (!snapshot.mapEditMode || !snapshot.selectedEntryId) {
      return;
    }

    const rect = domRefs.mapSurface.getBoundingClientRect();
    const xPercent = resolveMapWorldPercent(snapshot, event.clientX, rect.left, rect.width, "x");
    const yPercent = resolveMapWorldPercent(snapshot, event.clientY, rect.top, rect.height, "y");
    const selectedEntry = snapshot.entries.find((entry) => entry.id === snapshot.selectedEntryId);

    if (selectedEntry?.type === "region") {
      stateManager.placeSelectedRegionOnMap(xPercent, yPercent);
      return;
    }

    stateManager.placeSelectedEntryOnMap(xPercent, yPercent);
  });

  domRefs.mapFocus.addEventListener("click", (event) => {
    const entryCard = event.target.closest("[data-entry-id]");

    if (entryCard) {
      stateManager.selectEntry(entryCard.dataset.entryId);
      return;
    }

    const regionCard = event.target.closest("[data-region-entry-id]");

    if (regionCard?.dataset.regionEntryId) {
      stateManager.selectEntry(regionCard.dataset.regionEntryId);
    }
  });

  domRefs.canvasColumns.addEventListener("click", (event) => {
    const card = event.target.closest("[data-entry-id]");

    if (!card) {
      return;
    }

    stateManager.selectEntry(card.dataset.entryId);
    stateManager.setActiveView("editor");
  });

  domRefs.graphSurface.addEventListener("click", (event) => {
    const relation = event.target.closest("[data-graph-relation-key]");

    if (relation?.dataset.graphRelationKey) {
      stateManager.setSelectedGraphRelation(relation.dataset.graphRelationKey);
      return;
    }

    const node = event.target.closest("[data-entry-id]");

    if (node?.dataset.entryId) {
      stateManager.selectEntry(node.dataset.entryId);
    }
  });

  domRefs.wikiArticle.addEventListener("click", (event) => {
    const linkCard = event.target.closest("[data-entry-id]");

    if (linkCard) {
      stateManager.selectEntry(linkCard.dataset.entryId);
    }
  });

  domRefs.wikiNavigation.addEventListener("click", (event) => {
    const navItem = event.target.closest("[data-entry-id]");

    if (navItem) {
      stateManager.selectEntry(navItem.dataset.entryId);
    }
  });

  domRefs.relationList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-relation-id]");

    if (button && !button.disabled) {
      stateManager.removeRelation(button.dataset.relationId);
    }
  });

  domRefs.timelineList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-timeline-event-id]");

    if (button && !button.disabled) {
      stateManager.removeTimelineEvent(button.dataset.timelineEventId);
    }
  });

  domRefs.projectTimelineList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-project-timeline-event-id]");

    if (button && !button.disabled) {
      stateManager.removeProjectTimelineEvent(button.dataset.projectTimelineEventId);
    }
  });

  domRefs.regionAnchorList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-anchor-id]");

    if (button?.dataset.anchorId) {
      stateManager.removeRegionAnchor(button.dataset.anchorId);
    }
  });

  domRefs.addRelationButton.addEventListener("click", () => {
    const hasAdded = stateManager.addRelation(
      domRefs.relationTargetSelect.value,
      domRefs.relationTypeInput.value,
    );

    if (hasAdded) {
      domRefs.relationTypeInput.value = "";
      domRefs.relationTargetSelect.value = "";
    }
  });

  domRefs.addTimelineButton.addEventListener("click", () => {
    const hasAdded = stateManager.addTimelineEvent(
      domRefs.timelinePointInput.value,
      domRefs.timelineSortInput.value,
      domRefs.timelineTitleInput.value,
      domRefs.timelineDescriptionInput.value,
    );

    if (hasAdded) {
      domRefs.timelinePointInput.value = "";
      domRefs.timelineSortInput.value = "";
      domRefs.timelineTitleInput.value = "";
      domRefs.timelineDescriptionInput.value = "";
    }
  });

  domRefs.addProjectTimelineButton.addEventListener("click", () => {
    const hasAdded = stateManager.addProjectTimelineEvent(
      domRefs.projectTimelinePointInput.value,
      domRefs.projectTimelineSortInput.value,
      domRefs.projectTimelineTitleInput.value,
      domRefs.projectTimelineDescriptionInput.value,
    );

    if (hasAdded) {
      domRefs.projectTimelinePointInput.value = "";
      domRefs.projectTimelineSortInput.value = "";
      domRefs.projectTimelineTitleInput.value = "";
      domRefs.projectTimelineDescriptionInput.value = "";
    }
  });

  domRefs.addAnchorButton.addEventListener("click", () => {
    const hasAdded = stateManager.addRegionAnchor(
      domRefs.anchorLabelInput.value,
      domRefs.anchorXInput.value,
      domRefs.anchorYInput.value,
      domRefs.anchorNotesInput.value,
    );

    if (hasAdded) {
      domRefs.anchorLabelInput.value = "";
      domRefs.anchorXInput.value = "50";
      domRefs.anchorYInput.value = "50";
      domRefs.anchorNotesInput.value = "";
    }
  });

  domRefs.projectNameInput.addEventListener("change", (event) => {
    stateManager.updateProjectName(event.target.value);
  });

  domRefs.searchInput.addEventListener("input", (event) => {
    stateManager.setSearchText(event.target.value);
  });

  domRefs.titleInput.addEventListener("input", (event) => {
    stateManager.updateSelectedEntry("title", event.target.value);
  });

  domRefs.typeInput.addEventListener("change", (event) => {
    stateManager.updateSelectedEntry("type", event.target.value);
  });

  domRefs.aliasesInput.addEventListener("input", (event) => {
    stateManager.updateSelectedAliases(event.target.value);
  });

  domRefs.regionInput.addEventListener("input", (event) => {
    stateManager.updateSelectedEntry("region", event.target.value);
  });

  domRefs.conditionInput.addEventListener("input", (event) => {
    stateManager.updateSelectedEntry("condition", event.target.value);
  });

  domRefs.occupantsInput.addEventListener("input", (event) => {
    stateManager.updateSelectedEntry("occupants", event.target.value);
  });

  domRefs.tagsInput.addEventListener("input", (event) => {
    stateManager.updateSelectedTags(event.target.value);
  });

  domRefs.summaryInput.addEventListener("input", (event) => {
    stateManager.updateSelectedEntry("summary", event.target.value);
  });

  domRefs.imageUrlInput.addEventListener("input", (event) => {
    stateManager.updateSelectedEntry("imageUrl", event.target.value.trim());
  });

  domRefs.contentInput.addEventListener("input", (event) => {
    stateManager.updateSelectedEntry("content", event.target.value);
  });

  domRefs.notesInput.addEventListener("input", (event) => {
    stateManager.updateSelectedEntry("notes", event.target.value);
  });

  domRefs.mapXInput.addEventListener("input", (event) => {
    stateManager.updateSelectedMapPosition("x", event.target.value);
  });

  domRefs.mapYInput.addEventListener("input", (event) => {
    stateManager.updateSelectedMapPosition("y", event.target.value);
  });

  domRefs.regionTopInput.addEventListener("input", (event) => {
    stateManager.updateSelectedRegionShape("top", event.target.value);
  });

  domRefs.regionLeftInput.addEventListener("input", (event) => {
    stateManager.updateSelectedRegionShape("left", event.target.value);
  });

  domRefs.regionWidthInput.addEventListener("input", (event) => {
    stateManager.updateSelectedRegionShape("width", event.target.value);
  });

  domRefs.regionHeightInput.addEventListener("input", (event) => {
    stateManager.updateSelectedRegionShape("height", event.target.value);
  });

  domRefs.regionRotationInput.addEventListener("input", (event) => {
    stateManager.updateSelectedRegionShape("rotation", event.target.value);
  });

  domRefs.entryAnchorSelect.addEventListener("change", (event) => {
    stateManager.updateSelectedEntryAnchor(event.target.value);
  });

  domRefs.importFileInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      await stateManager.importProject(file);
      window.alert("导入成功，当前工作台已经切换到新的项目数据。");
    } catch (error) {
      window.alert(error.message || "导入失败，请检查文件。");
    } finally {
      event.target.value = "";
    }
  });
}

/**
 * 地图点击位置需要先从“当前视口坐标”反推回世界坐标。
 */
function resolveMapWorldPercent(snapshot, clientValue, rectStart, rectSize, axis) {
  const viewport = snapshot.mapViewport || {
    centerX: 50,
    centerY: 50,
    zoom: 1.8,
  };
  const localPercent = ((clientValue - rectStart) / rectSize) * 100;
  const centerValue = axis === "x" ? viewport.centerX : viewport.centerY;
  const worldWindowStart = centerValue - 50 / viewport.zoom;

  return worldWindowStart + localPercent / viewport.zoom;
}

/**
 * 仅当当前数据集明显还是旧示例时，才自动替换为新的《神秘复苏》样例。
 */
function shouldUpgradeLegacySample(state) {
  const titles = state.entries.map((entry) => entry.title);

  return (
    titles.length > 0 &&
    titles.length <= LEGACY_SAMPLE_TITLES.size &&
    titles.every((title) => LEGACY_SAMPLE_TITLES.has(title))
  );
}

/**
 * 只在检测到历史上那批被写坏的《神秘复苏》示例标题时，才自动重置成干净样例。
 * 这样可以最大限度避免误伤用户后来自己写的项目数据。
 */
function shouldUpgradeGarbledMysteryRevivalSample(state) {
  const titles = state.entries.map((entry) => entry.title);

  return (
    titles.length > 0 &&
    titles.length <= LEGACY_GARBLED_MYSTERY_REVIVAL_TITLES.size &&
    titles.every((title) => LEGACY_GARBLED_MYSTERY_REVIVAL_TITLES.has(title))
  );
}

/**
 * 当缓存里还是旧版的《神秘复苏》九条基础样例时，自动升级到新版丰富示例。
 * 这样用户刷新页面后就能直接看到新的区域、人物、组织与事件结构。
 */
function shouldUpgradeOutdatedMysteryRevivalSample(state) {
  const titles = state.entries.map((entry) => entry.title);

  return (
    titles.length > 0 &&
    titles.length <= OUTDATED_MYSTERY_REVIVAL_TITLES.size &&
    titles.every((title) => OUTDATED_MYSTERY_REVIVAL_TITLES.has(title))
  );
}
