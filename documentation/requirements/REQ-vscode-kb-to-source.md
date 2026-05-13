---
id: REQ-vscode-kb-to-source
title: "VS Code: Navigation from Tree to Code"
status: open
created_at: 2026-05-13T00:00:00Z
source: packages/vscode/src/treeProvider.ts
priority: must
owner: vscode-team
tags:
  - vscode
  - kibi
  - navigation
links:
  - type: implements
    target: SYM-KibiTreeDataProvider
  - type: specified_by
    target: SCEN-vscode-kb-to-source
  - type: verified_by
    target: TEST-vscode-traceability
---

The VS Code extension must support navigation from the KB tree to source code:

1. Clicking a symbol entity in the Kibi tree sidebar must open its real source file and line.
2. Navigation coordinates must be resolved from `documentation/symbols.yaml`.
3. The tree node must still be expandable to show linked KB entities (requirements, tests, etc.) while allowing navigation.
