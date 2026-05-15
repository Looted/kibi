---
id: SCEN-vscode-source-to-kb
title: "VS Code: Source to KB Discovery"
type: scenario
status: active
created_at: 2026-05-13T00:00:00Z
source: documentation/scenarios/SCEN-vscode-source-to-kb.md
priority: must
tags:
  - vscode
  - discovery
links:
  - type: verified_by
    target: TEST-vscode-traceability
---

## Scenario: Quick Pick Discovery from Editor

**Given** a TypeScript file is open in VS Code
**When** the user places the cursor on a symbol and opens the Code Actions menu
**Then** a `Kibi: Browse linked entities` action must be visible
**And** selecting it must show all linked KB entities in a Quick Pick list.
