---
id: SCEN-vscode-kb-to-source
title: "VS Code: KB to Source Navigation"
type: scenario
status: active
created_at: 2026-05-13T00:00:00Z
source: documentation/scenarios/SCEN-vscode-kb-to-source.md
priority: must
tags:
  - vscode
  - navigation
links:
  - type: verified_by
    target: TEST-vscode-traceability
---

## Scenario: Navigation from Sidebar to Code

**Given** the Kibi sidebar is open in VS Code
**When** the user clicks on a symbol entity in the tree
**Then** VS Code must open the corresponding source file at the correct line number
**And** the navigation must use coordinates from the symbols manifest.
