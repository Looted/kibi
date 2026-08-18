---
id: SCEN-vscode-sidebar-kb-tree
title: VS Code Sidebar KB Tree Exploration
type: scenario
status: active
created_at: 2026-05-13T00:00:00Z
source: documentation/scenarios/SCEN-vscode-sidebar-kb-tree.md
priority: must
tags:
  - vscode
  - treeview
links:
  - type: verified_by
    target: TEST-vscode-traceability
---

## Scenario: Sidebar KB Tree

**Given** the Kibi extension is active in VS Code
**When** the user opens the Kibi sidebar
**Then** entities must be grouped structurally by type
**And** linked entities must remain explorable through the tree hierarchy.
