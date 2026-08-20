---
id: REQ-vscode-sidebar-kb-tree
title: "VS Code: Structural TreeView implementation"
status: open
created_at: 2026-05-13T00:00:00Z
updated_at: 2026-08-18T00:00:00Z
source: packages/vscode/src/treeProvider.ts
priority: must
owner: vscode-team
tags:
  - vscode
  - kibi
  - treeview
links:
  - type: specified_by
    target: SCEN-vscode-sidebar-kb-tree
  - type: verified_by
    target: TEST-vscode-traceability
  - type: supersedes
    target: REQ-010
---

The VS Code extension must provide a structural View of the KB:

1. Implement a `TreeView` in the VS Code sidebar to browse Kibi entities.
2. Organize entities by type (REQ, SCEN, TEST, etc.).
3. Support hierarchical exploration of linked entities (e.g., REQ -> SCEN -> TEST).
4. Refresh the tree view when the underlying KB snapshot changes.
