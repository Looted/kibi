---
id: REQ-vscode-kb-to-source
title: 'VS Code: Navigation from Tree to Code'
status: open
created_at: 2026-05-13T00:00:00.000Z
source: packages/vscode/src/treeProvider.ts
priority: must
owner: vscode-team
tags:
  - vscode
  - kibi
  - navigation
links:
  - type: specified_by
    target: SCEN-vscode-kb-to-source
  - type: verified_by
    target: TEST-vscode-traceability
semantic_text: The VS Code extension must support navigation from the KB tree to source code.\n\nClicking a symbol entity in the Kibi tree sidebar must open its real source file and line.\nNavigation coordinates must be resolved from `.kb/symbols.yaml`.\nThe tree node must still be expandable to show linked KB entities (requirements, tests, etc.) while allowing navigation.
logic_claims:
  - CLAIM-C1E2C732F49744FB
semantic_clauses:
  - The VS Code extension must support navigation from the KB tree to source code.\n\nClicking a symbol entity in the Kibi tree sidebar must open its real source file and line.\nNavigation coordinates must be resolved from `.kb/symbols.yaml`.\nThe tree node must still be expandable to show linked KB entities (requirements, tests, etc.) while allowing navigation
semantic_inventory_version: kibi.semantic-inventory.v1
semantic_source_field: semantic_text
semantic_source_hash: fda64659b54ebe024b2210ad7a8dc8a8737b77ece2886651c07376a0dceefa11
semantic_inventory:
  - claim_key: CLAIM-C1E2C732F49744FB
    claim_text: The VS Code extension must support navigation from the KB tree to source code.\n\nClicking a symbol entity in the Kibi tree sidebar must open its real source file and line.\nNavigation coordinates must be resolved from `.kb/symbols.yaml`.\nThe tree node must still be expandable to show linked KB entities (requirements, tests, etc.) while allowing navigation
    role: normative
    status: modeled
    span:
      start: 0
      end: 359
type: req
---

The VS Code extension must support navigation from the KB tree to source code:

1. Clicking a symbol entity in the Kibi tree sidebar must open its real source file and line.
2. Navigation coordinates must be resolved from `documentation/symbols.yaml`.
3. The tree node must still be expandable to show linked KB entities (requirements, tests, etc.) while allowing navigation.
