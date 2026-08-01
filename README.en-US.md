

# VVD World Local

A prototype worldbuilding software designed for local execution and long-term archiving, referencing the public introduction and demo structure of `vvd.world`.

The project's goal is not to replicate the online service itself, but to gradually build a local workstation that closely mirrors its core creative experience: you can organize entries, place maps, map out relationships, read the Wiki, and take your data completely with you.

## Reference Scope

Reference pages:

- `https://www.vvd.world/`
- `https://app.vvd.world/`

Based on my verification of the public pages on `2026-04-14`, the `vvd.world` homepage still emphasizes these directions:

- Organize world settings and entries
- Create interactive maps
- Visualize character and event relationships
- Generate readable custom Wikis
- Support real-time collaboration

The public demo also shows the experience organized around the following workspaces:

- `Editor`
- `Maps`
- `Canvas`
- `Graphs`
- `Wiki`

Demo entries are not just titles and body text; they also include fields like:

- `Aliases`
- `Region`
- `Condition`
- `Occupants`
- `Overview`
- `Notes`

This project will continue to align the experience along these publicly visible structures, but will not involve its private source code, private service logic, or unpublished assets.

## Current Positioning

The current repository is a local-first, zero-dependency, browser-run MVP, used to quickly verify the following:

- Whether the worldbuilding entry model is sound
- Whether a multi-view workstation is viable
- Whether maps, relationship graphs, and encyclopedia reading modes can share the same dataset
- Whether data can be imported, exported, backed up, and migrated

Once the prototype is stable, it will migrate to a formal desktop stack:

- `Tauri + React + TypeScript + SQLite`

## Currently Implemented

Current prototype entry points:

- [run-mvp.bat](</c:/Users/Liar/Desktop/proj/vvdworld/run-mvp.bat:1>)
- [run-mvp.ps1](</c:/Users/Liar/Desktop/proj/vvdworld/run-mvp.ps1:1>)
- [mvp/index.html](</c:/Users/Liar/Desktop/proj/vvdworld/mvp/index.html:1>)
- [scripts/check-encoding.ps1](</c:/Users/Liar/Desktop/proj/vvdworld/scripts/check-encoding.ps1:1>)

The current version already features:

- Chinese-localized multi-view workstation
- Entry creation, editing, and deletion
- Search and type filtering
- Local auto-save
- JSON import and export
- Map point browsing and placement mode
- Canvas-style pane browsing
- Relationship graph visualization
- Encyclopedia reading view
- Entry-level timeline editing and display
- Project-level world timeline
- Region entries, region overviews, and region context linkage
- Entry image URL display
- 《神秘复苏》 enhanced default sample data

## Encoding Conventions

- All project text files uniformly use `UTF-8`
- If you suspect garbled text or duplicate BOMs, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\check-encoding.ps1
```

## Current Design Focus

At this stage, I am prioritizing the implementation of three capabilities that most significantly impact the overall experience:

1. `Maps`
   Make maps more than just coordinate displays, gradually enabling region, context, and entry placement capabilities.
2. `Wiki`
   Make the encyclopedia more than single-page body text, enabling table of contents, context, timeline, and regional reading capabilities.
3. `Data Model`
   Allow elements like locations, characters, organizations, regions, and events to share a stable data structure, facilitating future migration to the desktop version.

## Recent Additions

Starting this round, the prototype advances from "entries + points" towards a "regional world workstation":

- Added entry-level timelines
- Timelines support sort values, titles, descriptions, and encyclopedia page reading
- Added "Region" entry type
- Map regions will now prioritize binding to their corresponding region entries
- Regions can hold summaries, statuses, aliases, timelines, and related entries
- The `Region` field in the editor now supports region suggestions

This means "Regions" are no longer just plain strings, but are becoming truly editable, readable, and linkable world objects.

## Product Principles

- Local-first: Fully functional offline
- Portable data: Project directories can be copied, compressed, backed up, and migrated
- Open formats: Prioritize controllable formats like JSON / SQLite
- Structure before skin: Stabilize the information architecture first, then build complex interfaces
- Shared data source across views: Editing, maps, graphs, and encyclopedia must align with each other

## Long-term Vision

Long-term, the goal is to evolve into a fully deliverable desktop application with the following capabilities:

- Project directory-based management
- SQLite persistence
- Static asset directories
- More mature map editing and region systems
- More mature relationship graphs
- More complete Wiki organization
- Optional collaboration alternatives

Recommended long-term directory structure:

```text
MyWorld/
  project.json
  database.sqlite
  assets/
  exports/
  backups/
```

## Current Run Method

If your PowerShell is blocked by execution policy, prefer using:

- [run-mvp.bat](</c:/Users/Liar/Desktop/proj/vvdworld/run-mvp.bat:1>)

It will automatically start the local static server and open the page in a more reliable way.

## Documentation

- [PRD.md](</c:/Users/Liar/Desktop/proj/vvdworld/PRD.md:1>)
- [ARCHITECTURE.md](</c:/Users/Liar/Desktop/proj/vvdworld/ARCHITECTURE.md:1>)
- [DATA_MODEL.md](</c:/Users/Liar/Desktop/proj/vvdworld/DATA_MODEL.md:1>)
- [ROADMAP.md](</c:/Users/Liar/Desktop/proj/vvdworld/ROADMAP.md:1>)

## Note

This repository references the product introduction and demo structure observable on the public `vvd.world` pages, intended for localized product planning and prototype implementation.
## 2026-04-15 Update

- Added "Region Anchor" modeling: Region entries can now maintain multiple anchors, displayed as key nodes within regions on the map
- Added "Sub-location Anchor Attachment": Regular entries can bind to anchors of their parent region, forming a "Region -> Anchor -> Sub-location" structure
- The "Region Dossier" on the right side of the map now displays anchor groups, sub-locations under each anchor, and entries not attached to any anchor
- Relationship graphs enhanced with colored relationship lines; different relationship types use different colors
- Relationship lines changed to curved edge layouts to reduce text and line overlap
- Clicking a relationship line opens the right panel to view the relationship's direction, connected entries, and details
> The built-in sample world setting has been switched to a 《神秘复苏》-style example to demonstrate the linkage of regions, anchors, characters, organizations, dossiers, and relationship graphs within an urban supernatural theme.
