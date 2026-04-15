# VVD World Local

一个参考 `vvd.world` 公开介绍与公开演示结构、面向本地运行与长期归档的世界观构建软件原型。

项目目标不是复制线上服务本身，而是在本地环境里逐步做出一套接近其核心创作体验的工作台：你可以整理条目、摆放地图、梳理关系、阅读 Wiki，并把数据完整带走。

## 参考范围

参考页面：

- `https://www.vvd.world/`
- `https://app.vvd.world/`

基于我在 `2026-04-14` 对公开页面的核对，`vvd.world` 首页仍然重点强调这些方向：

- 组织世界设定与条目
- 创建交互式地图
- 可视化人物与事件关系
- 生成可阅读的自定义 Wiki
- 支持实时协作

公开演示里还能看到它围绕以下工作区组织体验：

- `Editor`
- `Maps`
- `Canvas`
- `Graphs`
- `Wiki`

演示条目也不只是标题和正文，还包含类似这些字段：

- `Aliases`
- `Region`
- `Condition`
- `Occupants`
- `Overview`
- `Notes`

本项目会继续沿着这些公开可见结构去对齐体验，但不会涉及其私有源码、私有服务逻辑或未公开资产。

## 当前定位

当前仓库是一个本地优先、零依赖、浏览器即可运行的 MVP，用来快速验证这几件事：

- 世界观条目模型是否合理
- 多视图工作台是否成立
- 地图、关系图、百科三种阅读方式能否共用同一套数据
- 数据是否能导入、导出、备份和迁移

等原型稳定后，再迁移到正式桌面栈：

- `Tauri + React + TypeScript + SQLite`

## 当前已实现

当前原型入口：

- [run-mvp.bat](</c:/Users/Liar/Desktop/proj/vvdworld/run-mvp.bat:1>)
- [run-mvp.ps1](</c:/Users/Liar/Desktop/proj/vvdworld/run-mvp.ps1:1>)
- [mvp/index.html](</c:/Users/Liar/Desktop/proj/vvdworld/mvp/index.html:1>)
- [scripts/check-encoding.ps1](</c:/Users/Liar/Desktop/proj/vvdworld/scripts/check-encoding.ps1:1>)

当前版本已经具备：

- 中文化的多视图工作台
- 条目创建、编辑、删除
- 搜索与类型过滤
- 本地自动保存
- JSON 导入导出
- 地图点位浏览与放置模式
- 画布式分栏浏览
- 关系图可视化
- 百科阅读视图
- 条目级时间轴编辑与展示
- 项目级世界时间轴
- 区域条目、区域概览与区域上下文联动
- 条目图片 URL 展示
- 《神秘复苏》增强版默认示例数据

## 编码约定

- 项目文本文件统一使用 `UTF-8`
- 如果怀疑出现乱码或重复 BOM，可运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-encoding.ps1
```

## 当前设计重点

这一阶段我在优先补齐三类最影响整体体验的能力：

1. `Maps`
   让地图不只是显示坐标，而是逐步具备区域、上下文和条目落位能力。
2. `Wiki`
   让百科不只是单页正文，而是具备目录、上下文、时间轴和区域阅读能力。
3. `Data Model`
   让地点、人物、组织、区域、事件等元素共用一套稳定的数据结构，方便后续迁移到桌面版。

## 这轮新增

这一轮开始，原型从“条目 + 点位”继续往“区域化世界工作台”推进：

- 新增条目级时间轴
- 时间轴支持排序值、标题、说明、百科页阅读
- 新增“区域”条目类型
- 地图区域现在会优先绑定对应的区域条目
- 区域可以承载摘要、状态、别名、时间轴和关联条目
- 编辑器里的 `Region` 字段开始具备区域建议能力

这意味着“区域”不再只是一个普通字符串，而开始成为真正可编辑、可阅读、可关联的世界对象。

## 产品原则

- 本地优先：断网也能完整使用
- 数据可带走：项目目录可以复制、压缩、备份、迁移
- 开放格式：优先使用 JSON / SQLite 等可控格式
- 结构先于皮肤：先把信息架构做稳，再继续做复杂界面
- 多视图共用同一数据源：编辑、地图、图谱、百科必须互相对得上

## 长期形态

长期希望演进为真正可交付的桌面软件，并具备下面这些能力：

- 项目目录化管理
- SQLite 持久化
- 静态资源目录
- 更成熟的地图编辑与区域系统
- 更成熟的关系图谱
- 更完整的 Wiki 组织
- 可选的协作替代方案

推荐的长期目录结构：

```text
MyWorld/
  project.json
  database.sqlite
  assets/
  exports/
  backups/
```

## 当前运行方式

如果你的 PowerShell 被执行策略拦住，优先使用：

- [run-mvp.bat](</c:/Users/Liar/Desktop/proj/vvdworld/run-mvp.bat:1>)

它会自动以更稳妥的方式启动本地静态服务并打开页面。

## 文档

- [PRD.md](</c:/Users/Liar/Desktop/proj/vvdworld/PRD.md:1>)
- [ARCHITECTURE.md](</c:/Users/Liar/Desktop/proj/vvdworld/ARCHITECTURE.md:1>)
- [DATA_MODEL.md](</c:/Users/Liar/Desktop/proj/vvdworld/DATA_MODEL.md:1>)
- [ROADMAP.md](</c:/Users/Liar/Desktop/proj/vvdworld/ROADMAP.md:1>)

## 说明

这个仓库参考的是 `vvd.world` 公开页面里可观察到的产品介绍与演示结构，用于本地化产品规划和原型实现。
## 2026-04-15 更新

- 新增“区域锚点”建模：区域条目现在可以维护多个锚点，并在地图中显示为区域内关键节点
- 新增“子地点挂靠锚点”：普通条目可绑定到所属区域的锚点，形成“区域 -> 锚点 -> 子地点”结构
- 地图右侧“区域档案”现在会展示锚点分组、锚点下的子地点，以及未挂靠锚点的条目
- 关系图增强为彩色关系线，不同关系类型会使用不同颜色
- 关系线改为曲线标签布局，减少文字和线条重叠
- 单击关系线可在右侧面板查看这条关系的方向、两端条目与详情
> 当前内置示例世界观已切换为《神秘复苏》风格样例，用于演示都市灵异题材下的区域、锚点、人物、组织、档案与关系图联动。
