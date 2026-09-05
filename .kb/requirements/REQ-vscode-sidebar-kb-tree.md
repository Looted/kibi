---
id: REQ-vscode-sidebar-kb-tree
title: 'VS Code: Structural TreeView implementation'
status: open
created_at: 2026-05-13T00:00:00.000Z
updated_at: 2026-08-18T00:00:00.000Z
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
semantic_text: The VS Code extension must provide a structural View of the KB:\n\nImplement a `TreeView` in the VS Code sidebar to browse Kibi entities.\nOrganize entities by type (REQ, SCEN, TEST, etc.).\nSupport hierarchical exploration of linked entities (e.g., REQ -> SCEN -> TEST).\nRefresh the tree view when the underlying KB snapshot changes.
logic_claims:
  - CLAIM-CF04B0A29E65B7DA
semantic_clauses:
  - The VS Code extension must provide a structural View of the KB:\n\nImplement a `TreeView` in the VS Code sidebar to browse Kibi entities.\nOrganize entities by type (REQ, SCEN, TEST, etc.).\nSupport hierarchical exploration of linked entities (e.g., REQ -> SCEN -> TEST).\nRefresh the tree view when the underlying KB snapshot changes
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: 076f6802ba8fa8087e8c72118c8617a89334161f5c013ceef48e4f629dacc105
semantic_inventory:
  - claim_key: CLAIM-CF04B0A29E65B7DA
    claim_text: The VS Code extension must provide a structural View of the KB:\n\nImplement a `TreeView` in the VS Code sidebar to browse Kibi entities.\nOrganize entities by type (REQ, SCEN, TEST, etc.).\nSupport hierarchical exploration of linked entities (e.g., REQ -> SCEN -> TEST).\nRefresh the tree view when the underlying KB snapshot changes
    role: normative
    status: modeled
    span:
      start: 0
      end: 334
type: req
---

The VS Code extension must provide a structural View of the KB:

1. Implement a `TreeView` in the VS Code sidebar to browse Kibi entities.
2. Organize entities by type (REQ, SCEN, TEST, etc.).
3. Support hierarchical exploration of linked entities (e.g., REQ -> SCEN -> TEST).
4. Refresh the tree view when the underlying KB snapshot changes.
