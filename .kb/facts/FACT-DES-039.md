---
id: FACT-DES-039
title: VS Code activity bar icon uses media/kibi-activitybar.svg
status: active
tags: [design, vscode, iconography, assets]
source: packages/vscode/package.json
created_at: 2026-03-19T00:00:00Z
updated_at: 2026-03-19T00:00:00Z
links:
  - REQ-vscode-traceability
fact_kind: meta
---

The VS Code extension sidebar/activity icon is configured via `packages/vscode/package.json` `contributes.viewsContainers.activitybar[0].icon` and currently points to `packages/vscode/media/kibi-activitybar.svg`. Fixes to the sidebar icon must update that SVG and then repackage the VSIX.
