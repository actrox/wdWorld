import { ENTRY_TYPES, TOOLKIT_VIEWS } from "./constants.js";
import {
  getActiveView,
  getCanvasColumns,
  getEntryTypeConfig,
  getEntryTypeLabel,
  getGraphDetailsModel,
  getGraphModel,
  getGroupedEntries,
  getIncomingRelationItems,
  getMapAnchors,
  getMapEntries,
  getMapRegions,
  getProjectStats,
  getRegionSuggestions,
  getSelectedEntry,
  getSelectedEntryAnchorOptions,
  getSelectedRegionContext,
  getSelectedRegionEntries,
  getSelectedRelationItems,
  getWikiNavigationGroups,
  getWikiPageModel,
} from "./selectors.js";
import { formatDateTime } from "./utils.js";
import { MAP_LAYER_FILTERS } from "./constants.js";

/**
 * 渲染器只负责把状态翻译成界面。
 * 它不修改状态，也不处理持久化。
 */
export function createRenderer(domRefs) {
  /**
   * 静态下拉项只初始化一次。
   */
  function renderTypeOptions() {
    domRefs.typeInput.innerHTML = ENTRY_TYPES.map(
      (type) => `<option value="${type.value}">${type.label}</option>`,
    ).join("");

    domRefs.newEntryTypeSelect.innerHTML = ENTRY_TYPES.map(
      (type) => `<option value="${type.value}">新建${type.label}</option>`,
    ).join("");
  }

  /**
   * 工具区标签对应多个核心工作面。
   */
  function renderToolkitTabs(state) {
    const activeView = getActiveView(state);

    domRefs.toolkitTabs.innerHTML = TOOLKIT_VIEWS.map(
      (view) => `
        <button
          class="toolkit-tab ${view.id === activeView ? "active" : ""}"
          data-view-id="${view.id}"
          type="button"
        >
          <strong>${escapeHtml(view.label)}</strong>
          <span>${escapeHtml(view.description)}</span>
        </button>
      `,
    ).join("");
  }

  /**
   * 顶部只显示项目级信息。
   */
  function renderHeader(state) {
    domRefs.projectNameInput.value = state.project.name;
    domRefs.searchInput.value = state.searchText;
    domRefs.saveStatus.textContent = state.lastSavedAt
      ? `已自动保存 · ${formatDateTime(state.lastSavedAt)}`
      : "尚未保存";
  }

  /**
   * 顶部概览用于快速感知当前项目规模。
   */
  function renderStats(state) {
    const stats = getProjectStats(state);

    domRefs.projectStats.innerHTML = `
      <article class="stat-card">
        <span>总条目数</span>
        <strong>${stats.totalEntries}</strong>
      </article>
      <article class="stat-card">
        <span>当前可见</span>
        <strong>${stats.visibleEntries}</strong>
      </article>
      <article class="stat-card">
        <span>最近更新</span>
        <strong>${escapeHtml(stats.latestEntryTitle)}</strong>
      </article>
      <article class="stat-card">
        <span>关系总数</span>
        <strong>${stats.relationCount}</strong>
      </article>
      <article class="stat-card">
        <span>时间节点</span>
        <strong>${stats.timelineEventCount}</strong>
      </article>
      <article class="stat-card">
        <span>世界时间</span>
        <strong>${stats.worldTimelineEventCount}</strong>
      </article>
      <article class="stat-card">
        <span>区域条目</span>
        <strong>${stats.regionCount}</strong>
      </article>
    `;
  }

  /**
   * 焦点卡片告诉用户当前整个工作台围绕谁在工作。
   */
  function renderFocusCard(state) {
    const selectedEntry = getSelectedEntry(state);

    if (!selectedEntry) {
      domRefs.focusCard.innerHTML = `
        <p class="empty-tip">当前没有选中条目，请先在左侧选择或创建内容。</p>
      `;
      return;
    }

    const entryTypeConfig = getEntryTypeConfig(selectedEntry.type);
    const metaChips = [
      selectedEntry.region ? `区域 · ${selectedEntry.region}` : "",
      selectedEntry.condition ? `状态 · ${selectedEntry.condition}` : "",
      selectedEntry.occupants ? `占据者 · ${selectedEntry.occupants}` : "",
      selectedEntry.aliases?.length ? `别名 · ${selectedEntry.aliases.join(" / ")}` : "",
      selectedEntry.anchorId ? "已挂靠锚点" : "",
    ].filter(Boolean);

    domRefs.focusCard.innerHTML = `
      ${renderOptionalEntryImage(selectedEntry, "focus-card-image")}
      <h3>${escapeHtml(selectedEntry.title)}</h3>
      <p class="focus-meta">${escapeHtml(entryTypeConfig.groupLabel)} · ${escapeHtml(
        getEntryTypeLabel(selectedEntry.type),
      )}</p>
      <p>${escapeHtml(selectedEntry.summary || "这个条目还没有摘要，可以在编辑视图继续补充。")}</p>
      <div class="meta-chip-row">
        ${metaChips.map((chip) => `<span class="meta-chip">${escapeHtml(chip)}</span>`).join("")}
      </div>
    `;
  }

  /**
   * 左侧条目列表按分组显示。
   */
  function renderEntryList(state) {
    const groupedEntries = getGroupedEntries(state);
    const visibleCount = groupedEntries.reduce(
      (count, group) => count + group.entries.length,
      0,
    );

    domRefs.entryCounter.textContent = String(visibleCount);
    renderTypeFilterBar(state);

    if (visibleCount === 0) {
      domRefs.entryList.innerHTML = `
        <p class="empty-tip">
          当前没有符合条件的条目。你可以点击“新建条目”，或使用“填充示例”恢复一个完整世界。
        </p>
      `;
      return;
    }

    domRefs.entryList.innerHTML = groupedEntries
      .map(
        (group) => `
          <section class="entry-group">
            <h3 class="entry-group-title">${escapeHtml(group.groupLabel)}</h3>
            ${group.entries.map((entry) => renderEntryCard(entry, state.selectedEntryId)).join("")}
          </section>
        `,
      )
      .join("");
  }

  /**
   * 类型过滤用于快速收窄结果集。
   */
  function renderTypeFilterBar(state) {
    const filterButtons = [
      `<button class="filter-chip ${state.typeFilter === "all" ? "active" : ""}" type="button" data-type-filter="all">全部</button>`,
      ...ENTRY_TYPES.map(
        (entryType) => `
          <button
            class="filter-chip ${state.typeFilter === entryType.value ? "active" : ""}"
            type="button"
            data-type-filter="${entryType.value}"
          >
            ${escapeHtml(entryType.label)}
          </button>
        `,
      ),
    ];

    domRefs.typeFilterBar.innerHTML = filterButtons.join("");
  }

  /**
   * 地图自己的图层过滤条不影响左侧条目检索。
   */
  function renderMapLayerFilterBar(state) {
    domRefs.mapLayerFilterBar.innerHTML = MAP_LAYER_FILTERS.map(
      (filter) => `
        <button
          class="filter-chip ${state.mapLayerFilter === filter.value ? "active" : ""}"
          type="button"
          data-map-layer-filter="${filter.value}"
        >
          ${escapeHtml(filter.label)}
        </button>
      `,
    ).join("");
  }

  /**
   * 编辑视图同步填充当前焦点条目的全部字段。
   */
  function renderEditor(state) {
    const selectedEntry = getSelectedEntry(state);
    const hasEntry = Boolean(selectedEntry);
    const isRegionEntry = selectedEntry?.type === "region";
    const anchorOptions = getSelectedEntryAnchorOptions(state);

    setEditorDisabledState(domRefs, !hasEntry);

    domRefs.titleInput.value = selectedEntry?.title ?? "";
    domRefs.typeInput.value = selectedEntry?.type ?? ENTRY_TYPES[0].value;
    domRefs.aliasesInput.value = selectedEntry?.aliases?.join(", ") ?? "";
    domRefs.regionInput.value = selectedEntry?.region ?? "";
    domRefs.conditionInput.value = selectedEntry?.condition ?? "";
    domRefs.occupantsInput.value = selectedEntry?.occupants ?? "";
    domRefs.tagsInput.value = selectedEntry?.tags?.join(", ") ?? "";
    domRefs.summaryInput.value = selectedEntry?.summary ?? "";
    domRefs.imageUrlInput.value = selectedEntry?.imageUrl ?? "";
    domRefs.contentInput.value = selectedEntry?.content ?? "";
    domRefs.notesInput.value = selectedEntry?.notes ?? "";
    domRefs.mapXInput.value = String(selectedEntry?.mapPosition?.x ?? 50);
    domRefs.mapYInput.value = String(selectedEntry?.mapPosition?.y ?? 50);
    domRefs.regionTopInput.value = String(selectedEntry?.regionShape?.top ?? 32);
    domRefs.regionLeftInput.value = String(selectedEntry?.regionShape?.left ?? 38);
    domRefs.regionWidthInput.value = String(selectedEntry?.regionShape?.width ?? 24);
    domRefs.regionHeightInput.value = String(selectedEntry?.regionShape?.height ?? 18);
    domRefs.regionRotationInput.value = String(selectedEntry?.regionShape?.rotation ?? 0);
    domRefs.anchorLabelInput.value = "";
    domRefs.anchorXInput.value = "50";
    domRefs.anchorYInput.value = "50";
    domRefs.anchorNotesInput.value = "";
    domRefs.timelinePointInput.value = "";
    domRefs.timelineSortInput.value = "";
    domRefs.timelineTitleInput.value = "";
    domRefs.timelineDescriptionInput.value = "";

    domRefs.regionShapeSection.classList.toggle("hidden-panel", !isRegionEntry);
    domRefs.regionAnchorSection.classList.toggle("hidden-panel", !isRegionEntry);
    domRefs.regionInputField?.classList.toggle("hidden-panel", isRegionEntry);
    domRefs.entryAnchorSection.classList.toggle(
      "hidden-panel",
      !hasEntry || isRegionEntry || anchorOptions.length === 0,
    );

    domRefs.mapXInput.closest(".field")?.classList.toggle("field-disabled", isRegionEntry);
    domRefs.mapYInput.closest(".field")?.classList.toggle("field-disabled", isRegionEntry);
    domRefs.regionInput.closest(".field")?.classList.toggle("field-disabled", isRegionEntry);
    domRefs.regionInput.disabled = !hasEntry || isRegionEntry;
    domRefs.mapXInput.disabled = !hasEntry || isRegionEntry;
    domRefs.mapYInput.disabled = !hasEntry || isRegionEntry;

    [
      domRefs.regionTopInput,
      domRefs.regionLeftInput,
      domRefs.regionWidthInput,
      domRefs.regionHeightInput,
      domRefs.regionRotationInput,
      domRefs.anchorLabelInput,
      domRefs.anchorXInput,
      domRefs.anchorYInput,
      domRefs.anchorNotesInput,
      domRefs.addAnchorButton,
    ].forEach((element) => {
      if (element) {
        element.disabled = !hasEntry || !isRegionEntry;
      }
    });

    domRefs.entryAnchorSelect.disabled = !hasEntry || isRegionEntry || anchorOptions.length === 0;
    domRefs.entryAnchorSelect.innerHTML = [
      `<option value="">不挂靠锚点</option>`,
      ...anchorOptions.map(
        (anchor) =>
          `<option value="${anchor.id}">${escapeHtml(anchor.label)} · ${escapeHtml(
            anchor.regionLabel,
          )}</option>`,
      ),
    ].join("");
    domRefs.entryAnchorSelect.value = selectedEntry?.anchorId ?? "";

    renderRegionSuggestions(state);
    renderRegionAnchorList(state);
    renderRelationTargetOptions(state);
    renderTimelineList(state);
    renderRelationList(state);
  }

  /**
   * 区域建议列表让 Region 字段开始具备轻量一致性。
   */
  function renderRegionSuggestions(state) {
    domRefs.regionSuggestions.innerHTML = getRegionSuggestions(state)
      .map((regionLabel) => `<option value="${escapeHtml(regionLabel)}"></option>`)
      .join("");
  }

  /**
   * 区域锚点列表会作为“区域内二级地理节点”的可视入口。
   */
  function renderRegionAnchorList(state) {
    const selectedEntry = getSelectedEntry(state);

    if (!selectedEntry || selectedEntry.type !== "region") {
      domRefs.regionAnchorList.innerHTML = `
        <p class="empty-tip compact-tip">当前只有区域条目可以维护锚点。</p>
      `;
      return;
    }

    const anchors = selectedEntry.anchors || [];

    if (anchors.length === 0) {
      domRefs.regionAnchorList.innerHTML = `
        <p class="empty-tip compact-tip">这个区域还没有锚点。可以先添加一个港口、山口、聚落、据点或遗迹节点。</p>
      `;
      return;
    }

    domRefs.regionAnchorList.innerHTML = anchors
      .map(
        (anchor) => `
          <article class="anchor-card">
            <div class="anchor-card-header">
              <div>
                <h4>${escapeHtml(anchor.label)}</h4>
                <p>区域内坐标 · ${escapeHtml(String(anchor.x))}% / ${escapeHtml(
                  String(anchor.y),
                )}%</p>
              </div>
              <button type="button" data-anchor-id="${anchor.id}">移除</button>
            </div>
            <p class="anchor-card-notes">${escapeHtml(anchor.notes || "当前还没有补充说明。")}</p>
          </article>
        `,
      )
      .join("");
  }

  /**
   * 时间轴列表提供一个清晰的可编辑纵向结构。
   */
  function renderTimelineList(state) {
    const selectedEntry = getSelectedEntry(state);
    const timelineEvents = selectedEntry?.timelineEvents || [];

    if (!selectedEntry) {
      domRefs.timelineList.innerHTML = `
        <p class="empty-tip">请先选择一个条目，再为它补充时间轴设定。</p>
      `;
      return;
    }

    if (timelineEvents.length === 0) {
      domRefs.timelineList.innerHTML = `
        <p class="empty-tip">当前条目还没有时间节点。你可以先添加一个起源、转折或结局事件。</p>
      `;
      return;
    }

    domRefs.timelineList.innerHTML = timelineEvents
      .map((timelineEvent) => renderTimelineEditorItem(timelineEvent))
      .join("");
  }

  /**
   * 关系目标下拉里排除自己，避免自指向关系误用。
   */
  /**
   * 世界时间轴是项目层级的公共历史，不依赖当前焦点条目。
   */
  function renderProjectTimelineList(state) {
    const timelineEvents = state.project.timelineEvents || [];

    if (timelineEvents.length === 0) {
      domRefs.projectTimelineList.innerHTML = `
        <p class="empty-tip">当前还没有整个世界的公共时间轴。你可以先补一个时代起点或关键事件。</p>
      `;
      return;
    }

    domRefs.projectTimelineList.innerHTML = timelineEvents
      .map((timelineEvent) => renderProjectTimelineEditorItem(timelineEvent))
      .join("");
  }

  function renderRelationTargetOptions(state) {
    const selectedEntry = getSelectedEntry(state);
    const selectableEntries = state.entries.filter((entry) => entry.id !== selectedEntry?.id);

    domRefs.relationTargetSelect.innerHTML = [
      `<option value="">选择目标条目</option>`,
      ...selectableEntries.map(
        (entry) =>
          `<option value="${entry.id}">${escapeHtml(entry.title)} · ${escapeHtml(
            getEntryTypeLabel(entry.type),
          )}</option>`,
      ),
    ].join("");
  }

  /**
   * 编辑器里同时显示当前条目的出边和入边。
   */
  function renderRelationList(state) {
    const outgoingRelations = getSelectedRelationItems(state);
    const incomingRelations = getIncomingRelationItems(state);

    if (outgoingRelations.length === 0 && incomingRelations.length === 0) {
      domRefs.relationList.innerHTML = `
        <p class="empty-tip">当前还没有关系。你可以先添加一条连接，关系图就会立刻出现内容。</p>
      `;
      return;
    }

    const outgoingMarkup = outgoingRelations.map(
      (relation) => `
        <article class="relation-pill" style="border-left: 4px solid ${relation.visual.stroke};">
          <div>
            <strong>出向 · ${escapeHtml(relation.type)}</strong>
            <span>${escapeHtml(relation.targetEntry.title)}</span>
          </div>
          <button type="button" data-relation-id="${relation.id}">移除</button>
        </article>
      `,
    );

    const incomingMarkup = incomingRelations.map(
      (relation) => `
        <article class="relation-pill" style="border-left: 4px solid ${relation.visual.stroke};">
          <div>
            <strong>入向 · ${escapeHtml(relation.type)}</strong>
            <span>${escapeHtml(relation.sourceEntry.title)}</span>
          </div>
          <button type="button" disabled>只读</button>
        </article>
      `,
    );

    domRefs.relationList.innerHTML = [...outgoingMarkup, ...incomingMarkup].join("");
  }

  /**
   * 地图视图除了条目点位，还会显示区域和区域锚点。
   */
  function renderMapView(state) {
    const rawMapEntries = getMapEntries(state);
    const rawMapAnchors = getMapAnchors(state);
    const rawMapRegions = getMapRegions(state);
    const selectedEntry = getSelectedEntry(state);
    const selectedRegionContext = getSelectedRegionContext(state);
    const selectedRegionEntries = getSelectedRegionEntries(state);
    const mapEditLabel = state.mapEditMode ? "放置模式：开启" : "放置模式：关闭";
    const mapViewport = getMapViewport(state);
    const visibleWindow = (100 / mapViewport.zoom).toFixed(1);
    const mapLayerFilter = state.mapLayerFilter || "all";
    const mapEntries = filterMapEntriesByLayer(rawMapEntries, mapLayerFilter);
    const mapRegions = filterMapRegionsByLayer(rawMapRegions, mapLayerFilter);
    const mapAnchors = filterMapAnchorsByLayer(rawMapAnchors, mapEntries, mapLayerFilter);

    domRefs.mapEditToggleButton.textContent = mapEditLabel;
    domRefs.mapEditToggleButton.classList.toggle("active-toggle", state.mapEditMode);
    domRefs.mapZoomIndicator.textContent = `${Math.round(mapViewport.zoom * 100)}%`;
    renderMapLayerFilterBar(state);

    domRefs.mapHint.textContent = selectedEntry
      ? state.mapEditMode
        ? selectedEntry.type === "region"
          ? "当前正在放置区域。点击地图空白区会移动区域中心，滚轮可缩放，拖拽空白区可平移视角。"
          : "当前正在放置子地点。点击地图空白区会更新条目坐标，滚轮可缩放，拖拽空白区可平移视角。"
        : selectedEntry.type === "region"
          ? "当前正在查看区域条目。地图默认只显示世界中部的一块区域，可以滚轮缩放并拖拽查看更远区域。"
          : "你可以先查看区域分布和锚点布局，再决定是否进入放置模式调整条目位置。"
      : "请先选中一个条目。地图已默认聚焦在世界中部，可滚轮缩放并拖拽平移。";

    domRefs.mapSurface.innerHTML = `
      <div
        class="map-world ${state.mapEditMode ? "map-world-editing" : ""}"
        style="${buildMapWorldBackgroundStyle(mapViewport)}"
      >
        <div class="map-grid-label" style="${buildMapPointStyle(18, 16, mapViewport)}">北方高地</div>
        <div class="map-grid-label" style="${buildMapPointStyle(72, 84, mapViewport)}">盐沼海岸</div>
        <div class="map-grid-label" style="${buildMapPointStyle(88, 48, mapViewport)}">深层鬼域</div>
        <div class="map-grid-label" style="${buildMapPointStyle(10, 56, mapViewport)}">海外战区</div>
        <div class="map-region-layer">
          ${mapRegions.map((region) => renderMapRegion(region, mapViewport)).join("")}
        </div>
        <div class="map-anchor-layer">
          ${mapAnchors.map((anchor) => renderMapAnchor(anchor, selectedEntry, mapViewport)).join("")}
        </div>
        ${
          mapEntries.length > 0
            ? mapEntries
                .map((entry) => renderMapMarker(entry, selectedEntry, mapViewport))
                .join("")
            : `<p class="map-empty-callout">当前没有可显示的地图标记。</p>`
        }
      </div>
      ${renderMapMiniMap(mapRegions, mapEntries, selectedEntry, mapViewport)}
      <div class="map-camera-badge">当前视窗约为世界的 ${visibleWindow}% × ${visibleWindow}%</div>
    `;

    if (!selectedEntry) {
      domRefs.mapFocus.innerHTML = `
        <p class="empty-tip">选中一个条目后，这里会显示它的地图焦点信息、所属区域和锚点上下文。</p>
      `;
      return;
    }

    domRefs.mapFocus.innerHTML = `
      <div class="map-focus-header">
        ${renderOptionalEntryImage(selectedEntry, "map-focus-image")}
        <div>
          <h3>${escapeHtml(selectedEntry.title)}</h3>
          <p>${escapeHtml(selectedEntry.summary || "这个条目还没有地图摘要。")}</p>
        </div>
        <span class="map-focus-badge">${escapeHtml(getEntryTypeLabel(selectedEntry.type))}</span>
      </div>

      <div class="meta-chip-row">
        ${
          selectedEntry.type !== "region"
            ? `
              <span class="meta-chip">X · ${selectedEntry.mapPosition.x}</span>
              <span class="meta-chip">Y · ${selectedEntry.mapPosition.y}</span>
            `
            : ""
        }
        ${
          selectedRegionContext?.region?.label
            ? `<span class="meta-chip">${escapeHtml(`区域 · ${selectedRegionContext.region.label}`)}</span>`
            : ""
        }
        ${
          selectedEntry.condition
            ? `<span class="meta-chip">${escapeHtml(`状态 · ${selectedEntry.condition}`)}</span>`
            : ""
        }
        ${
          selectedRegionContext?.region
            ? `<span class="meta-chip">${escapeHtml(`区域内条目 · ${selectedRegionContext.region.entryCount}`)}</span>`
            : ""
        }
        ${
          selectedEntry.type === "region"
            ? `<span class="meta-chip">${escapeHtml(
                `几何 · ${selectedEntry.regionShape.width}×${selectedEntry.regionShape.height}`,
              )}</span>`
            : ""
        }
        ${
          selectedEntry.anchorId && selectedEntry.type !== "region"
            ? `<span class="meta-chip">锚点挂靠中</span>`
            : ""
        }
      </div>

      <section class="map-context-section">
        <h4>区域分布</h4>
        <div class="map-region-list">
          ${
            mapRegions.length > 0
              ? mapRegions.map((region) => renderMapRegionLegendCard(region)).join("")
              : `<p class="empty-tip compact-tip">当前没有可识别的区域。</p>`
          }
        </div>
      </section>

      ${
        selectedRegionContext
          ? `
            <section class="map-context-section">
              <h4>区域档案</h4>
              ${renderMapRegionProfileCard(selectedRegionContext)}
            </section>
          `
          : ""
      }

      <section class="map-context-section">
        <h4>${selectedEntry.type === "region" ? "区域内条目" : "同区域条目"}</h4>
        <div class="map-region-list">
          ${
            selectedRegionEntries.length > 0
              ? selectedRegionEntries.map((entry) => renderMapContextEntry(entry)).join("")
              : `<p class="empty-tip compact-tip">当前区域还没有更多可见条目。</p>`
          }
        </div>
      </section>
    `;
  }

  /**
   * 画布视图继续保留三段式创作路径。
   */
  function renderCanvasView(state) {
    const columns = getCanvasColumns(state);

    domRefs.canvasColumns.innerHTML = columns
      .map(
        (column) => `
          <section class="canvas-column">
            <h3>${escapeHtml(column.title)}</h3>
            <p>${escapeHtml(column.description)}</p>
            <div class="canvas-card-list">
              ${
                column.entries.length > 0
                  ? column.entries
                      .map(
                        (entry) => `
                          <button class="canvas-card" type="button" data-entry-id="${entry.id}">
                            ${renderOptionalEntryImage(entry, "canvas-card-image")}
                            <h3>${escapeHtml(entry.title)}</h3>
                            <p class="canvas-meta">${escapeHtml(getEntryTypeLabel(entry.type))}</p>
                            <p class="entry-summary">${escapeHtml(
                              entry.summary || "这个条目还没有摘要。",
                            )}</p>
                          </button>
                        `,
                      )
                      .join("")
                  : `<p class="empty-tip">这个阶段暂时还没有条目。</p>`
              }
            </div>
          </section>
        `,
      )
      .join("");
  }

  /**
   * 关系图使用“图形 + 明细面板”组合。
   */
  function renderGraphView(state) {
    const graphModel = getGraphModel(state);
    const graphDetails = getGraphDetailsModel(state);

    if (!graphDetails || graphModel.nodes.length === 0) {
      domRefs.graphSurface.innerHTML = `
        <p class="empty-tip">当前没有可展示的关系图节点。请先创建或选择一个条目。</p>
      `;
      return;
    }

    const edgeMarkup = graphModel.edges
      .map((edge) => {
        const labelWidth = Math.max(54, edge.label.length * 14 + 22);
        const labelHeight = 28;
        const isSelected = graphDetails.selectedRelation?.relationKey === edge.relationKey;

        return `
          <g class="graph-edge-group ${isSelected ? "selected" : ""}">
            <path
              d="${edge.path}"
              class="graph-edge-hit"
              data-graph-relation-key="${edge.relationKey}"
            />
            <path
              d="${edge.path}"
              class="graph-edge-line ${isSelected ? "selected" : ""}"
              stroke="${edge.stroke}"
            />
            <g
              class="graph-edge-label-group ${isSelected ? "selected" : ""}"
              data-graph-relation-key="${edge.relationKey}"
            >
              <rect
                class="graph-edge-label-bg"
                x="${edge.labelX - labelWidth / 2}"
                y="${edge.labelY - labelHeight + 6}"
                width="${labelWidth}"
                height="${labelHeight}"
                rx="14"
                style="fill:${edge.soft};stroke:${edge.stroke};"
              />
              <text
                class="graph-edge-label"
                x="${edge.labelX}"
                y="${edge.labelY + 4}"
                text-anchor="middle"
                style="fill:${edge.textColor};"
              >
                ${escapeHtml(edge.label)}
              </text>
            </g>
          </g>
        `;
      })
      .join("");

    const nodeMarkup = graphModel.nodes
      .map(
        (node) => `
          <g class="graph-node-group" data-entry-id="${node.id}">
            <circle
              class="graph-node-circle ${node.isCenter ? "center" : ""}"
              cx="${node.x}"
              cy="${node.y}"
              r="${node.isCenter ? 42 : 30}"
              fill="${node.accent}"
              fill-opacity="${node.isCenter ? "0.96" : "0.84"}"
            />
            <text
              class="graph-node-label"
              x="${node.x}"
              y="${node.y + (node.isCenter ? 58 : 46)}"
              text-anchor="middle"
            >
              ${escapeHtml(node.title)}
            </text>
          </g>
        `,
      )
      .join("");

    domRefs.graphSurface.innerHTML = `
      <div class="graph-layout">
        <section class="graph-canvas-panel">
          <div class="graph-canvas-header">
            <div>
              <h3>${escapeHtml(graphDetails.selectedEntry.title)}</h3>
              <p>中心节点 · ${escapeHtml(getEntryTypeLabel(graphDetails.selectedEntry.type))}</p>
            </div>
            <span class="graph-count-badge">邻接 ${graphDetails.neighborCount}</span>
          </div>

          <svg class="graph-svg" viewBox="0 0 640 430" role="img" aria-label="关系图谱">
            ${edgeMarkup}
            ${nodeMarkup}
          </svg>
        </section>

        <aside class="graph-detail-panel">
          ${
            graphDetails.selectedRelation
              ? renderGraphRelationDetail(graphDetails.selectedRelation)
              : `
                <section class="graph-detail-section">
                  <h4>关系详情</h4>
                  <p class="empty-tip compact-tip">点击图中的彩色关系线，即可查看这条关系的方向、双方节点和详情。</p>
                </section>
              `
          }

          <section class="graph-detail-section">
            <h4>出向关系</h4>
            ${
              graphDetails.outgoingRelations.length > 0
                ? graphDetails.outgoingRelations
                    .map((relation) => renderGraphRelationCard("出向", relation, relation.targetEntry))
                    .join("")
                : `<p class="empty-tip compact-tip">当前没有出向关系。</p>`
            }
          </section>

          <section class="graph-detail-section">
            <h4>入向关系</h4>
            ${
              graphDetails.incomingRelations.length > 0
                ? graphDetails.incomingRelations
                    .map((relation) => renderGraphRelationCard("入向", relation, relation.sourceEntry))
                    .join("")
                : `<p class="empty-tip compact-tip">当前没有入向关系。</p>`
            }
          </section>
        </aside>
      </div>
    `;
  }

  /**
   * 百科视图升级为“导航 + 页面目录 + 正文 + 上下文”结构。
   */
  function renderWikiView(state) {
    const navigationGroups = getWikiNavigationGroups(state);
    const pageModel = getWikiPageModel(state);

    renderWikiNavigation(navigationGroups, state.selectedEntryId);

    if (!pageModel) {
      domRefs.wikiArticle.innerHTML = `
        <p class="empty-tip">当前没有条目可供阅读，请先选择一个世界元素。</p>
      `;
      return;
    }

    const {
      selectedEntry,
      outgoingRelations,
      incomingRelations,
      sameRegionEntries,
      sameTypeEntries,
      timelineEvents,
      sections,
    } = pageModel;

    domRefs.wikiArticle.innerHTML = `
      <header class="wiki-header">
        ${renderOptionalEntryImage(selectedEntry, "wiki-header-image")}
        <p>${escapeHtml(getEntryTypeConfig(selectedEntry.type).groupLabel)}</p>
        <h3>${escapeHtml(selectedEntry.title)}</h3>
        <p>${escapeHtml(selectedEntry.summary || "这个条目还没有摘要。")}</p>
      </header>

      <section class="wiki-outline-card">
        <h4>页面目录</h4>
        <div class="wiki-outline-list">
          ${sections
            .map(
              (section) => `
                <a class="wiki-outline-link" href="#${section.id}">
                  ${escapeHtml(section.label)}
                </a>
              `,
            )
            .join("")}
        </div>
      </section>

      <section id="wiki-summary" class="wiki-section">
        <h4>摘要</h4>
        <p class="wiki-body">${escapeHtml(selectedEntry.summary || "当前还没有摘要内容。")}</p>
      </section>

      <section id="wiki-facts" class="wiki-section">
        <h4>基础信息</h4>
        <div class="wiki-meta-grid">
          ${renderWikiMetaCard("别名", selectedEntry.aliases.join(" / ") || "无")}
          ${renderWikiMetaCard(
            "区域",
            selectedEntry.type === "region" ? "区域本体" : selectedEntry.region || "未填写",
          )}
          ${renderWikiMetaCard("状态", selectedEntry.condition || "未填写")}
          ${renderWikiMetaCard("占据者", selectedEntry.occupants || "未填写")}
        </div>
      </section>

      <section id="wiki-content" class="wiki-section">
        <h4>正文</h4>
        <p class="wiki-body">${escapeHtml(selectedEntry.content || "这个条目还没有正文内容。")}</p>
      </section>

      <section id="wiki-notes" class="wiki-section">
        <h4>备注</h4>
        <p class="wiki-notes">${escapeHtml(selectedEntry.notes || "当前还没有额外备注。")}</p>
      </section>

      ${
        timelineEvents.length > 0
          ? `
            <section id="wiki-timeline" class="wiki-section">
              <h4>时间轴</h4>
              <div class="wiki-timeline">
                ${timelineEvents.map((timelineEvent) => renderWikiTimelineItem(timelineEvent)).join("")}
              </div>
            </section>
          `
          : ""
      }

      ${
        outgoingRelations.length > 0 || incomingRelations.length > 0
          ? `
            <section id="wiki-relations" class="wiki-section">
              <h4>关联关系</h4>
              <div class="wiki-link-list">
                ${[
                  ...outgoingRelations.map((relation) =>
                    renderWikiLinkItem("出向", relation.type, relation.targetEntry),
                  ),
                  ...incomingRelations.map((relation) =>
                    renderWikiLinkItem("入向", relation.type, relation.sourceEntry),
                  ),
                ].join("")}
              </div>
            </section>
          `
          : ""
      }

      ${
        sameRegionEntries.length > 0
          ? `
            <section id="wiki-region-context" class="wiki-section">
              <h4>${selectedEntry.type === "region" ? "区域内条目" : "同区域条目"}</h4>
              <div class="wiki-context-grid">
                ${sameRegionEntries
                  .map((entry) =>
                    renderWikiContextCard(
                      entry,
                      selectedEntry.type === "region" ? "区域内" : "同区域",
                    ),
                  )
                  .join("")}
              </div>
            </section>
          `
          : ""
      }

      ${
        sameTypeEntries.length > 0
          ? `
            <section id="wiki-type-context" class="wiki-section">
              <h4>同类型条目</h4>
              <div class="wiki-context-grid">
                ${sameTypeEntries.map((entry) => renderWikiContextCard(entry, "同类型")).join("")}
              </div>
            </section>
          `
          : ""
      }

      <section id="wiki-history" class="wiki-section">
        <h4>维护记录</h4>
        <div class="wiki-history-grid">
          ${renderWikiMetaCard("创建时间", formatDateTime(selectedEntry.createdAt))}
          ${renderWikiMetaCard("更新时间", formatDateTime(selectedEntry.updatedAt))}
          ${renderWikiMetaCard("当前类型", getEntryTypeLabel(selectedEntry.type))}
          ${renderWikiMetaCard("关系数量", String((selectedEntry.relations || []).length))}
        </div>
      </section>
    `;
  }

  /**
   * 百科导航单独渲染，避免正文模板过长。
   */
  function renderWikiNavigation(navigationGroups, selectedEntryId) {
    const totalEntries = navigationGroups.reduce(
      (count, group) => count + group.entries.length,
      0,
    );

    if (totalEntries === 0) {
      domRefs.wikiNavigation.innerHTML = `
        <p class="empty-tip">当前没有可浏览的百科条目。</p>
      `;
      return;
    }

    domRefs.wikiNavigation.innerHTML = navigationGroups
      .map(
        (group) => `
          <section class="wiki-nav-group">
            <h4>${escapeHtml(group.groupLabel)}</h4>
            <div class="wiki-nav-list">
              ${group.entries
                .map(
                  (entry) => `
                    <button
                      class="wiki-nav-item ${entry.id === selectedEntryId ? "active" : ""}"
                      type="button"
                      data-entry-id="${entry.id}"
                    >
                      <strong>${escapeHtml(entry.title)}</strong>
                      <span>${escapeHtml(getEntryTypeLabel(entry.type))}</span>
                    </button>
                  `,
                )
                .join("")}
            </div>
          </section>
        `,
      )
      .join("");
  }

  /**
   * 多视图通过显隐切换控制。
   */
  function renderViewPanels(state) {
    const activeView = getActiveView(state);

    domRefs.editorView.classList.toggle("hidden-panel", activeView !== "editor");
    domRefs.timelineView.classList.toggle("hidden-panel", activeView !== "timeline");
    domRefs.mapView.classList.toggle("hidden-panel", activeView !== "map");
    domRefs.canvasView.classList.toggle("hidden-panel", activeView !== "canvas");
    domRefs.graphView.classList.toggle("hidden-panel", activeView !== "graph");
    domRefs.wikiView.classList.toggle("hidden-panel", activeView !== "wiki");
  }

  /**
   * 单次 render 统一刷新整个工作台，保证状态与界面一致。
   */
  function render(state) {
    renderHeader(state);
    renderToolkitTabs(state);
    renderStats(state);
    renderFocusCard(state);
    renderEntryList(state);
    renderEditor(state);
    renderProjectTimelineList(state);
    renderMapView(state);
    renderCanvasView(state);
    renderGraphView(state);
    renderWikiView(state);
    renderViewPanels(state);
  }

  renderTypeOptions();

  return {
    render,
  };
}

/**
 * 侧栏条目卡片。
 */
/**
 * 可选图片只在用户填写 URL 时才渲染，没有图片时保持原有文本型布局。
 */
function renderOptionalEntryImage(entry, className) {
  if (!entry?.imageUrl) {
    return "";
  }

  return `
    <figure class="${className}">
      <img src="${escapeHtml(entry.imageUrl)}" alt="${escapeHtml(entry.title)}" loading="lazy" />
    </figure>
  `;
}

/**
 * 项目层级时间轴和条目时间轴共用同一套阅读结构，但删除按钮换成独立的 data 入口。
 */
function renderProjectTimelineEditorItem(timelineEvent) {
  return `
    <article class="timeline-item">
      <div class="timeline-point-badge">${escapeHtml(timelineEvent.pointLabel || "未命名时间点")}</div>
      <div class="timeline-item-body">
        <div class="timeline-item-header">
          <div>
            <h4>${escapeHtml(timelineEvent.title)}</h4>
            <p class="timeline-sort-hint">排序值 ${escapeHtml(String(timelineEvent.sortValue))}</p>
          </div>
          <button
            type="button"
            class="timeline-remove-button"
            data-project-timeline-event-id="${timelineEvent.id}"
          >
            删除
          </button>
        </div>
        <p class="timeline-description">${escapeHtml(timelineEvent.description || "当前没有补充说明。")}</p>
      </div>
    </article>
  `;
}

function renderEntryCard(entry, selectedEntryId) {
  const typeConfig = getEntryTypeConfig(entry.type);
  const isActive = entry.id === selectedEntryId;
  const tagsText = entry.tags?.length ? entry.tags.join(" / ") : "暂无标签";

  return `
    <article class="entry-card ${isActive ? "active" : ""}" data-entry-id="${entry.id}">
      ${renderOptionalEntryImage(entry, "entry-card-image")}
      <h3>${escapeHtml(entry.title || "未命名条目")}</h3>
      <p class="entry-meta">${escapeHtml(typeConfig.label)} · ${escapeHtml(tagsText)}</p>
      <p class="entry-summary">${escapeHtml(entry.summary || "这个条目还没有摘要。")}</p>
    </article>
  `;
}

/**
 * 没有选中条目时，编辑区域要明确禁用。
 */
function setEditorDisabledState(domRefs, isDisabled) {
  [
    domRefs.titleInput,
    domRefs.typeInput,
    domRefs.aliasesInput,
    domRefs.regionInput,
    domRefs.conditionInput,
    domRefs.occupantsInput,
    domRefs.tagsInput,
    domRefs.summaryInput,
    domRefs.imageUrlInput,
    domRefs.contentInput,
    domRefs.notesInput,
    domRefs.timelinePointInput,
    domRefs.timelineSortInput,
    domRefs.timelineTitleInput,
    domRefs.timelineDescriptionInput,
    domRefs.addTimelineButton,
    domRefs.relationTargetSelect,
    domRefs.relationTypeInput,
    domRefs.addRelationButton,
    domRefs.deleteEntryButton,
    domRefs.entryAnchorSelect,
  ].forEach((element) => {
    if (element) {
      element.disabled = isDisabled;
    }
  });
}

/**
 * 地图视口决定当前看见世界的哪一部分。
 */
function getMapViewport(state) {
  const fallbackViewport = {
    centerX: 50,
    centerY: 50,
    zoom: 1.8,
  };

  if (!state?.mapViewport) {
    return fallbackViewport;
  }

  return {
    centerX: Number.isFinite(state.mapViewport.centerX)
      ? state.mapViewport.centerX
      : fallbackViewport.centerX,
    centerY: Number.isFinite(state.mapViewport.centerY)
      ? state.mapViewport.centerY
      : fallbackViewport.centerY,
    zoom: Number.isFinite(state.mapViewport.zoom)
      ? state.mapViewport.zoom
      : fallbackViewport.zoom,
  };
}

/**
 * 地图图层过滤把“世界可见条目”再裁成当前地图想看的层。
 */
function filterMapEntriesByLayer(entries, mapLayerFilter) {
  if (mapLayerFilter === "all") {
    return entries;
  }

  if (mapLayerFilter === "setting") {
    return entries.filter((entry) => ["item", "lore", "note"].includes(entry.type));
  }

  return entries.filter((entry) => entry.type === mapLayerFilter);
}

/**
 * 区域层通常单独看，因此只有“全部”或“区域”时才显示。
 */
function filterMapRegionsByLayer(regions, mapLayerFilter) {
  if (mapLayerFilter === "all" || mapLayerFilter === "region") {
    return regions;
  }

  return [];
}

/**
 * 锚点是区域内部基础设施。
 * 当只看某些实体层时，只保留确实挂了可见条目的锚点。
 */
function filterMapAnchorsByLayer(anchors, mapEntries, mapLayerFilter) {
  if (mapLayerFilter === "all" || mapLayerFilter === "region") {
    return anchors;
  }

  const visibleAnchorIds = new Set(
    mapEntries.filter((entry) => entry.anchorId).map((entry) => entry.anchorId),
  );

  return anchors.filter((anchor) => visibleAnchorIds.has(anchor.id));
}

/**
 * 把世界坐标换算成当前视口里的显示坐标。
 */
function projectMapPoint(worldX, worldY, mapViewport) {
  const left = mapViewport.centerX - 50 / mapViewport.zoom;
  const top = mapViewport.centerY - 50 / mapViewport.zoom;

  return {
    left: (worldX - left) * mapViewport.zoom,
    top: (worldY - top) * mapViewport.zoom,
  };
}

/**
 * 点位样式由投影函数统一生成，避免地图元素各算各的。
 */
function buildMapPointStyle(worldX, worldY, mapViewport) {
  const projectedPoint = projectMapPoint(worldX, worldY, mapViewport);
  return `left: ${projectedPoint.left}%; top: ${projectedPoint.top}%;`;
}

/**
 * 区域既要平移，也要随缩放同步放大。
 */
function buildMapRegionFrame(region, mapViewport) {
  const projectedCorner = projectMapPoint(region.left, region.top, mapViewport);

  return {
    left: projectedCorner.left,
    top: projectedCorner.top,
    width: region.width * mapViewport.zoom,
    height: region.height * mapViewport.zoom,
    rotation: region.rotation,
    style: `
      top: ${projectedCorner.top}%;
      left: ${projectedCorner.left}%;
      width: ${region.width * mapViewport.zoom}%;
      height: ${region.height * mapViewport.zoom}%;
      --rotation: ${region.rotation}deg;
      transform: rotate(${region.rotation}deg);
    `,
  };
}

/**
 * 背景也根据当前视口移动与放大，形成真正“只看中部一块”的体验。
 */
function buildMapWorldBackgroundStyle(mapViewport) {
  const backgroundSize = `${mapViewport.zoom * 100}% ${mapViewport.zoom * 100}%`;
  const offsetX = 50 - mapViewport.centerX * mapViewport.zoom;
  const offsetY = 50 - mapViewport.centerY * mapViewport.zoom;

  return `background-size: ${backgroundSize}; background-position: ${offsetX}% ${offsetY}%;`;
}

/**
 * 鹰眼小地图用于展示整个世界和当前视窗范围。
 */
function renderMapMiniMap(mapRegions, mapEntries, selectedEntry, mapViewport) {
  const viewWidth = 100 / mapViewport.zoom;
  const viewHeight = 100 / mapViewport.zoom;
  const viewLeft = mapViewport.centerX - viewWidth / 2;
  const viewTop = mapViewport.centerY - viewHeight / 2;

  return `
    <section class="map-minimap" data-map-minimap="true" aria-label="世界鹰眼地图">
      <div class="map-minimap-header">
        <strong>鹰眼地图</strong>
        <span>点击可跳转视角</span>
      </div>
      <div class="map-minimap-world" data-map-minimap="true">
        ${mapRegions.map((region) => renderMiniMapRegion(region, selectedEntry)).join("")}
        ${mapEntries.map((entry) => renderMiniMapMarker(entry, selectedEntry)).join("")}
        <div
          class="map-minimap-viewport"
          style="left:${viewLeft}%; top:${viewTop}%; width:${viewWidth}%; height:${viewHeight}%;"
        ></div>
      </div>
    </section>
  `;
}

/**
 * 小地图里的区域只负责表达地理分布，不承载文字。
 */
function renderMiniMapRegion(region, selectedEntry) {
  return `
    <div
      class="map-minimap-region ${region.primaryEntryId === selectedEntry?.id ? "active" : ""}"
      style="
        left:${region.left}%;
        top:${region.top}%;
        width:${region.width}%;
        height:${region.height}%;
        transform: rotate(${region.rotation}deg);
        background:${region.accent};
      "
    ></div>
  `;
}

/**
 * 小地图里只显示轻量点位，避免视觉过载。
 */
function renderMiniMapMarker(entry, selectedEntry) {
  return `
    <span
      class="map-minimap-marker ${entry.id === selectedEntry?.id ? "active" : ""}"
      style="left:${entry.displayPosition.x}%; top:${entry.displayPosition.y}%;"
    ></span>
  `;
}

/**
 * 地图里的区域覆盖层。
 */
function renderMapRegion(region, mapViewport) {
  const regionFrame = buildMapRegionFrame(region, mapViewport);

  return `
    <button
      class="map-region ${region.isSelected ? "active" : ""}"
      type="button"
      data-region-entry-id="${region.primaryEntryId}"
      style="${regionFrame.style}; background: ${region.accent};"
    >
      <strong>${escapeHtml(region.label)}</strong>
      <span>${region.entryCount} 个条目 · ${region.anchorCount} 个锚点</span>
    </button>
  `;
}

/**
 * 区域锚点是区域内部的二级地理节点。
 */
function renderMapAnchor(anchor, selectedEntry, mapViewport) {
  const isActive =
    selectedEntry?.type === "region"
      ? selectedEntry.id === anchor.regionEntryId
      : selectedEntry?.anchorId === anchor.id;

  return `
    <button
      class="map-anchor ${isActive ? "active" : ""}"
      type="button"
      data-region-entry-id="${anchor.regionEntryId}"
      style="${buildMapPointStyle(anchor.left, anchor.top, mapViewport)}"
      title="${escapeHtml(anchor.regionLabel)} · ${escapeHtml(anchor.label)}"
    >
      <span></span>
      <strong>${escapeHtml(anchor.label)}</strong>
    </button>
  `;
}

/**
 * 地图里的条目标记。
 */
function renderMapMarker(entry, selectedEntry, mapViewport) {
  return `
    <button
      class="map-marker ${entry.id === selectedEntry?.id ? "active" : ""} ${entry.isAnchored ? "anchored" : ""}"
      type="button"
      data-entry-id="${entry.id}"
      style="${buildMapPointStyle(entry.displayPosition.x, entry.displayPosition.y, mapViewport)}"
    >
      <strong>${escapeHtml(entry.title)}</strong>
      <span>${escapeHtml(getEntryTypeLabel(entry.type))}</span>
      ${
        entry.isAnchored
          ? `<span class="map-marker-anchor">${escapeHtml(`锚点 · ${entry.anchorLabel}`)}</span>`
          : ""
      }
    </button>
  `;
}

/**
 * 地图右侧的区域图例卡片。
 */
function renderMapRegionLegendCard(region) {
  return `
    <button
      class="map-legend-card ${region.isSelected ? "active" : ""}"
      type="button"
      data-region-entry-id="${region.primaryEntryId}"
    >
      <strong>${escapeHtml(region.label)}</strong>
      <p class="map-region-summary">${escapeHtml(region.summary)}</p>
      <div class="map-region-meta">
        <span>${region.entryCount} 个条目</span>
        <span>${region.anchorCount} 个锚点</span>
        ${region.regionEntryId ? `<span>已建区域条目</span>` : `<span>待补区域档案</span>`}
      </div>
    </button>
  `;
}

/**
 * 地图同区域条目卡片。
 */
function renderMapContextEntry(entry) {
  return `
    <button class="map-context-card" type="button" data-entry-id="${entry.id}">
      <strong>${escapeHtml(entry.title)}</strong>
      <span>${escapeHtml(getEntryTypeLabel(entry.type))}</span>
      ${entry.anchorId ? `<span>已挂靠锚点</span>` : `<span>未挂靠锚点</span>`}
    </button>
  `;
}

/**
 * 区域档案卡片让地图右侧真正具备“区域本体”的阅读入口。
 */
function renderMapRegionProfileCard(regionContext) {
  const { region, relatedEntries, anchorGroups, unassignedEntries, isDirectRegionEntry } = regionContext;
  const tagMarkup = [
    region.condition ? `状态 · ${region.condition}` : "",
    region.aliases?.length ? `别名 · ${region.aliases.join(" / ")}` : "",
    region.timelineCount ? `时间节点 · ${region.timelineCount}` : "",
  ]
    .filter(Boolean)
    .map((text) => `<span class="meta-chip">${escapeHtml(text)}</span>`)
    .join("");

  const anchorMarkup =
    anchorGroups.length > 0
      ? anchorGroups
          .map(
            (anchor) => `
              <article class="map-anchor-profile-card">
                <div class="map-anchor-profile-header">
                  <strong>${escapeHtml(anchor.label)}</strong>
                  <span>${anchor.members.length} 个子地点</span>
                </div>
                <p>${escapeHtml(anchor.notes || "当前还没有锚点说明。")}</p>
                ${
                  anchor.members.length > 0
                    ? `
                      <div class="map-anchor-member-list">
                        ${anchor.members
                          .map(
                            (member) => `
                              <button class="map-anchor-member" type="button" data-entry-id="${member.id}">
                                ${escapeHtml(member.title)}
                              </button>
                            `,
                          )
                          .join("")}
                      </div>
                    `
                    : `<p class="map-region-summary">这个锚点下还没有挂靠的子地点。</p>`
                }
              </article>
            `,
          )
          .join("")
      : `<p class="empty-tip compact-tip">当前区域还没有锚点，可以在编辑器里先新增一个。</p>`;

  const unassignedMarkup =
    unassignedEntries.length > 0
      ? `
        <div class="map-region-unassigned">
          <h5>未挂靠锚点的条目</h5>
          <div class="map-anchor-member-list">
            ${unassignedEntries
              .map(
                (entry) => `
                  <button class="map-anchor-member" type="button" data-entry-id="${entry.id}">
                    ${escapeHtml(entry.title)}
                  </button>
                `,
              )
              .join("")}
          </div>
        </div>
      `
      : "";

  const headerActionMarkup =
    region.regionEntryId && !isDirectRegionEntry
      ? `
        <button class="map-region-profile-jump" type="button" data-entry-id="${region.regionEntryId}">
          打开区域条目
        </button>
      `
      : "";

  const contentMarkup = `
    <div class="map-region-profile">
      <div class="map-region-profile-header">
        <div>
          <h4>${escapeHtml(region.label)}</h4>
          <p class="map-region-summary">${escapeHtml(region.summary)}</p>
        </div>
        ${headerActionMarkup}
      </div>
      <div class="meta-chip-row">
        <span class="meta-chip">可见条目 · ${region.entryCount}</span>
        <span class="meta-chip">区域锚点 · ${region.anchorCount}</span>
        ${tagMarkup}
      </div>
      ${
        relatedEntries.length > 0
          ? `<p class="map-region-member-hint">当前区域已连接 ${relatedEntries.length} 个上下文条目，可以继续补充地点、人物和事件。</p>`
          : `<p class="map-region-member-hint">当前区域还没有更多上下文条目，可以继续扩充区域内容。</p>`
      }
      <div class="map-anchor-profile-grid">
        ${anchorMarkup}
      </div>
      ${unassignedMarkup}
    </div>
  `;

  return `<article class="map-region-profile-article">${contentMarkup}</article>`;
}

/**
 * 编辑器中的时间轴节点强调可读性和快速维护。
 */
function renderTimelineEditorItem(timelineEvent) {
  return `
    <article class="timeline-item">
      <div class="timeline-point-badge">${escapeHtml(timelineEvent.pointLabel || "未命名时间点")}</div>
      <div class="timeline-item-body">
        <div class="timeline-item-header">
          <div>
            <h4>${escapeHtml(timelineEvent.title)}</h4>
            <p class="timeline-sort-hint">排序值 ${escapeHtml(String(timelineEvent.sortValue))}</p>
          </div>
          <button
            type="button"
            class="timeline-remove-button"
            data-timeline-event-id="${timelineEvent.id}"
          >
            删除
          </button>
        </div>
        <p class="timeline-description">${escapeHtml(timelineEvent.description || "当前没有补充说明。")}</p>
      </div>
    </article>
  `;
}

/**
 * 图右侧的关系卡片。
 */
function renderGraphRelationCard(directionLabel, relation, entry) {
  return `
    <button
      class="graph-detail-card"
      type="button"
      data-entry-id="${entry.id}"
      style="border-left: 4px solid ${relation.visual.stroke};"
    >
      <strong style="color:${relation.visual.text};">${escapeHtml(directionLabel)} · ${escapeHtml(
        relation.type,
      )}</strong>
      <p>${escapeHtml(entry.title)}</p>
      <span>${escapeHtml(getEntryTypeLabel(entry.type))}</span>
    </button>
  `;
}

/**
 * 点击关系线后，右侧面板会显示当前关系的具体详情。
 */
function renderGraphRelationDetail(relation) {
  return `
    <section class="graph-detail-section graph-selected-relation">
      <h4>关系详情</h4>
      <article class="graph-relation-detail-card" style="border-left: 4px solid ${relation.visual.stroke};">
        <strong style="color:${relation.visual.text};">${escapeHtml(
          relation.direction === "incoming" ? "入向关系" : "出向关系",
        )} · ${escapeHtml(relation.type)}</strong>
        <p>${escapeHtml(relation.sourceEntry.title)} → ${escapeHtml(relation.targetEntry.title)}</p>
        <span>${escapeHtml(
          relation.direction === "incoming"
            ? "这条边表示外部条目如何指向当前焦点。"
            : "这条边表示当前焦点如何指向目标条目。",
        )}</span>
      </article>
    </section>
  `;
}

/**
 * Wiki 元数据卡片。
 */
function renderWikiMetaCard(title, value) {
  return `
    <article class="wiki-meta-card">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(value)}</p>
    </article>
  `;
}

/**
 * Wiki 相关条目卡片。
 */
function renderWikiLinkItem(directionLabel, relationType, entry) {
  return `
    <button class="wiki-link-item" type="button" data-entry-id="${entry.id}">
      <strong>${escapeHtml(directionLabel)} · ${escapeHtml(relationType)}</strong>
      <p>${escapeHtml(entry.title)}</p>
      <span>${escapeHtml(getEntryTypeLabel(entry.type))}</span>
    </button>
  `;
}

/**
 * Wiki 上下文卡片用于展示同区域、同类型内容。
 */
function renderWikiContextCard(entry, contextLabel) {
  return `
    <button class="wiki-context-card" type="button" data-entry-id="${entry.id}">
      <strong>${escapeHtml(contextLabel)}</strong>
      <p>${escapeHtml(entry.title)}</p>
      <span>${escapeHtml(getEntryTypeLabel(entry.type))}</span>
    </button>
  `;
}

/**
 * Wiki 里的时间轴更偏阅读视角，所以使用纵向叙事式样式。
 */
function renderWikiTimelineItem(timelineEvent) {
  return `
    <article class="wiki-timeline-item">
      <div class="wiki-timeline-point">${escapeHtml(timelineEvent.pointLabel || "未标注时间点")}</div>
      <div class="wiki-timeline-body">
        <h5>${escapeHtml(timelineEvent.title)}</h5>
        <p>${escapeHtml(timelineEvent.description || "当前没有补充说明。")}</p>
      </div>
    </article>
  `;
}

/**
 * 文本输出做基础 HTML 转义。
 */
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
