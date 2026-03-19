---
id: REQ-vscode-traceability
title: Bidirectional traceability in VS Code extension
status: open
created_at: 2026-02-18T00:00:00Z
updated_at: 2026-02-18T00:00:00Z
source: packages/vscode/src/extension.ts
priority: must
owner: dev
tags:
  - vscode
  - traceability
  - ux
links:
  - type: specified_by
    target: SCEN-vscode-open-entity
  - type: specified_by
    target: SCEN-vscode-code-action
  - type: verified_by
    target: TEST-vscode-traceability
---

Two directions of traceability from the VS Code extension:

1. **KB → source**: clicking an entity in the tree opens its source file in the
   editor. Enabled when the entity's `source` field resolves to a local file path.

2. **Source → KB**: any TypeScript or JavaScript symbol registered in `symbols.yaml`
   shows a `Kibi: Browse linked entities` code action. Selecting it opens a Quick
   Pick of all related KB entities (requirements, tests, ADRs, etc.).
