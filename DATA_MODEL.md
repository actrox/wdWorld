# VVD World Local Data Model

## 1. 设计目标

数据模型需要满足：

- 支持人物、地点、组织、事件等多类条目
- 支持正文、标签、别名、关系、附件
- 支持全文检索
- 支持 schema 升级
- 支持导出与跨设备迁移

推荐存储方式：

- 结构化数据：`SQLite`
- 资源文件：项目目录文件系统
- 项目元数据：`project.json`

## 2. 核心建模思路

MVP 阶段采用“统一条目表 + 扩展属性表 + 关系表”的方案。

优点：

- 上手快
- 可扩展性强
- 前期不需要为每种实体建立完全独立的数据表

## 3. 主要实体

### 3.1 Project

表示一个世界观项目。

核心字段：

- `id`
- `name`
- `slug`
- `description`
- `schemaVersion`
- `createdAt`
- `updatedAt`

### 3.2 Entry

表示任何世界观条目，例如人物、地点、组织、物品、事件、设定。

核心字段：

- `id`
- `type`
- `title`
- `slug`
- `summary`
- `content`
- `status`
- `visibility`
- `coverAssetId`
- `createdAt`
- `updatedAt`
- `archivedAt`

### 3.3 Tag

标签实体。

核心字段：

- `id`
- `name`
- `color`
- `createdAt`

### 3.4 Alias

条目别名。

核心字段：

- `id`
- `entryId`
- `value`
- `normalizedValue`

### 3.5 Relation

条目之间的显式关系。

核心字段：

- `id`
- `sourceEntryId`
- `targetEntryId`
- `type`
- `direction`
- `note`
- `createdAt`
- `updatedAt`

### 3.6 Asset

本地资源文件。

核心字段：

- `id`
- `kind`
- `filename`
- `relativePath`
- `mimeType`
- `size`
- `checksum`
- `createdAt`

### 3.7 Backlink

由正文引用解析出的隐式链接索引。

核心字段：

- `id`
- `sourceEntryId`
- `targetEntryId`
- `linkText`
- `createdAt`

## 4. 推荐枚举值

### Entry.type

- `character`
- `location`
- `faction`
- `item`
- `event`
- `lore`
- `map`
- `note`

### Entry.status

- `draft`
- `active`
- `complete`
- `archived`

### Entry.visibility

- `private`
- `internal`
- `public_exportable`

### Asset.kind

- `cover`
- `image`
- `attachment`
- `map_image`

## 5. SQLite 表设计

### 5.1 projects

```sql
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  schema_version INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 5.2 entries

```sql
CREATE TABLE entries (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  summary TEXT DEFAULT '',
  content TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft',
  visibility TEXT NOT NULL DEFAULT 'private',
  cover_asset_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (cover_asset_id) REFERENCES assets(id)
);
```

建议索引：

```sql
CREATE UNIQUE INDEX idx_entries_project_slug ON entries(project_id, slug);
CREATE INDEX idx_entries_project_type ON entries(project_id, type);
CREATE INDEX idx_entries_project_updated ON entries(project_id, updated_at DESC);
```

### 5.3 entry_aliases

```sql
CREATE TABLE entry_aliases (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  value TEXT NOT NULL,
  normalized_value TEXT NOT NULL,
  FOREIGN KEY (entry_id) REFERENCES entries(id)
);
```

### 5.4 tags

```sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

### 5.5 entry_tags

```sql
CREATE TABLE entry_tags (
  entry_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (entry_id, tag_id),
  FOREIGN KEY (entry_id) REFERENCES entries(id),
  FOREIGN KEY (tag_id) REFERENCES tags(id)
);
```

### 5.6 relations

```sql
CREATE TABLE relations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  source_entry_id TEXT NOT NULL,
  target_entry_id TEXT NOT NULL,
  type TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'directed',
  note TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (source_entry_id) REFERENCES entries(id),
  FOREIGN KEY (target_entry_id) REFERENCES entries(id)
);
```

建议索引：

```sql
CREATE INDEX idx_relations_source ON relations(source_entry_id);
CREATE INDEX idx_relations_target ON relations(target_entry_id);
CREATE INDEX idx_relations_type ON relations(type);
```

### 5.7 assets

```sql
CREATE TABLE assets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  filename TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  checksum TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

### 5.8 backlinks

```sql
CREATE TABLE backlinks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  source_entry_id TEXT NOT NULL,
  target_entry_id TEXT NOT NULL,
  link_text TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (source_entry_id) REFERENCES entries(id),
  FOREIGN KEY (target_entry_id) REFERENCES entries(id)
);
```

### 5.9 entry_fields

用于未来扩展自定义字段。

```sql
CREATE TABLE entry_fields (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL,
  field_key TEXT NOT NULL,
  field_type TEXT NOT NULL,
  value_text TEXT DEFAULT '',
  value_number REAL,
  value_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (entry_id) REFERENCES entries(id)
);
```

## 6. 全文检索设计

推荐使用 SQLite FTS5：

```sql
CREATE VIRTUAL TABLE entries_fts USING fts5(
  entry_id UNINDEXED,
  title,
  summary,
  content
);
```

同步策略：

- 创建条目时插入索引
- 更新条目时重建对应文档
- 删除条目时删除对应索引

## 7. project.json 设计

项目目录根部保留 `project.json`，用于快速识别项目和记录 schema 信息。

示例：

```json
{
  "id": "proj_9d4b9c1d",
  "name": "Ash Sea Chronicle",
  "slug": "ash-sea-chronicle",
  "schemaVersion": 1,
  "appVersion": "0.1.0",
  "createdAt": "2026-04-13T00:00:00Z",
  "updatedAt": "2026-04-13T00:00:00Z"
}
```

## 8. 内部链接语法建议

正文建议支持内部链接：

```text
[[条目标题]]
[[条目标题|显示文本]]
[[entry:char_hero_001]]
```

解析规则：

- 优先按显式 `id` 匹配
- 其次按当前项目中的 `title` 或 `alias` 匹配
- 解析后写入 `backlinks`

## 9. 关系类型建议

可先内置一批常用关系类型：

- `member_of`
- `leader_of`
- `located_in`
- `part_of`
- `allied_with`
- `enemy_of`
- `parent_of`
- `child_of`
- `owns`
- `created`
- `discovered`
- `participated_in`
- `caused`
- `mentions`

后续可开放自定义关系类型。

## 10. ID 规则建议

建议使用可读性较强的前缀 ID：

- `proj_xxx`
- `char_xxx`
- `loc_xxx`
- `fac_xxx`
- `item_xxx`
- `event_xxx`
- `lore_xxx`
- `asset_xxx`
- `rel_xxx`

生成原则：

- 全局唯一
- 不依赖标题
- 标题变化不影响 ID

## 11. 时间字段约定

所有时间统一使用 ISO 8601 UTC 字符串，例如：

```text
2026-04-13T00:00:00Z
```

原因：

- 易于序列化
- 跨平台兼容性好
- 导出和迁移简单

## 12. 删除与归档策略

MVP 不建议直接物理删除所有数据。

推荐策略：

- 条目删除优先走软删除或归档
- 资源文件先解除引用，再提供清理命令
- 备份导出保留历史副本

## 13. 示例条目 JSON 视图

虽然主存储在 SQLite 中，应用层仍建议维护统一 DTO。

```json
{
  "id": "char_warden_001",
  "type": "character",
  "title": "Edda Voss",
  "slug": "edda-voss",
  "summary": "灰塔守望者，负责北境烽火线。",
  "content": "她与 [[Kethvari Outlook]] 关系密切。",
  "status": "active",
  "visibility": "private",
  "aliases": ["The Grey Warden"],
  "tags": ["watch", "north", "signal"],
  "coverAssetId": "asset_001",
  "relations": [
    {
      "targetEntryId": "loc_kethvari_outlook",
      "type": "located_in"
    }
  ],
  "updatedAt": "2026-04-13T00:00:00Z"
}
```

## 14. DTO 建议

前后端之间建议至少定义这些对象：

- `ProjectSummary`
- `EntryListItem`
- `EntryDetail`
- `EntryEditorState`
- `RelationEdge`
- `SearchResult`
- `AssetRef`

## 15. 后续扩展点

### 地图系统

未来可新增：

- `maps`
- `map_layers`
- `map_markers`
- `map_regions`

### 时间线系统

未来可新增：

- `timelines`
- `timeline_events`

### 模板系统

未来可新增：

- `entry_templates`
- `template_fields`

## 16. 数据模型结论

MVP 阶段最合适的方案，是以统一 `entries` 为核心，围绕标签、别名、关系、附件和全文索引构建一个稳定的数据底座。这样既能快速落地，也能支撑后续地图、图谱、导出和插件扩展。
