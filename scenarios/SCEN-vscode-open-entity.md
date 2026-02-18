---
id: SCEN-vscode-open-entity
title: Clicking a KB entity in the tree opens its source file in the editor
status: active
created_at: 2026-02-18T00:00:00Z
updated_at: 2026-02-18T00:00:00Z
priority: must
owner: dev
tags:
  - vscode
  - traceability
links:
  - REQ-vscode-traceability
  - REQ-010
---

Steps:
1. Developer opens the Kibi sidebar in VS Code
2. Tree shows entity groups (Requirements, Scenarios, etc.)
3. Developer clicks on an entity whose `source` field is a local file path
4. VS Code opens the file in the editor and scrolls to it
5. Entities without a local `source` are not clickable (no command attached)
